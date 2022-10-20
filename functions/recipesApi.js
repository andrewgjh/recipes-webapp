const express = require("express");

const bodyParser = require("body-parser");

const cors = require("cors");

const FirebaseConfig = require("./firebaseConfig");

const Utilities = require("./utilities.js");

const auth = FirebaseConfig.auth;
const firestore = FirebaseConfig.firestore;

const app = express();

app.use(cors({ origin: true }));
app.use(bodyParser.json());

// ~~ RESTFUL CRUD WEB API ENDPOINTS ~~

app.post("/recipes", async (req, res) => {
  const authorizationHeader = req.headers["authorization"];
  if (!authorizationHeader) {
    res.status(401).send("Missing Authorization Header");
    return;
  }
  try {
    await Utilities.authorizeUser(authorizationHeader, auth);
  } catch (error) {
    res.status(401).send(`Error Authorizing User: ${error.message}`);
    return;
  }
  const newRecipe = req.body;
  const missingFields = Utilities.validateRecipePostPut(newRecipe);
  if (missingFields) {
    res
      .status(400)
      .send(`Recipe is not valid. Missing/invalid fields: ${missingFields}`);
    return;
  }
  const recipe = Utilities.sanitizeRecipePostPut(newRecipe);
  try {
    const firestoreResponse = await firestore
      .collection("recipes-db")
      .add(recipe);
    const recipeId = firestoreResponse.id;
    res.status(201).send({ id: recipeId });
  } catch (error) {
    res.status(400).send(`Error Adding Recipe: ${error.message}`);
  }
});
app.get("/recipes", async (req, res) => {
  const authorizationHeader = req.headers["authorization"];
  const queryObject = req.query;
  const category = queryObject?.category;
  const orderByField = queryObject?.orderByField;
  const orderByDirection = queryObject?.orderByDirection || "asc";
  const pageNumber = queryObject?.pageNumber;
  const perPage = queryObject?.perPage;

  let isAuth = false;
  let collectionRef = firestore.collection("recipes-db");

  try {
    await Utilities.authorizeUser(authorizationHeader, auth);
    isAuth = true;
  } catch (error) {
    collectionRef = collectionRef.where("isPublished", "==", true);
  }
  if (category) {
    collectionRef = collectionRef.where("category", "==", category);
  }
  if (orderByField) {
    collectionRef = collectionRef.orderBy(orderByField, orderByDirection);
  }
  if (perPage) {
    collectionRef = collectionRef.limit(Number(perPage));
  }
  if (pageNumber > 0 && perPage) {
    const pageNumberMultiple = pageNumber - 1;
    const offset = pageNumberMultiple * perPage;

    collectionRef = collectionRef.offset(offset);
  }

  let recipeCount = 0;
  let countDocRef;

  if (isAuth) {
    countDocRef = firestore.collection("recipeCounts").doc("all");
  } else {
    countDocRef = firestore.collection("recipeCounts").doc("published");
  }
  const countDoc = await countDocRef.get();
  if (countDoc.exists) {
    const countDocData = countDoc.data();
    if (countDocData) {
      recipeCount = countDocData.count;
    }
  }
  try {
    const firestoreResponse = await collectionRef.get();
    const fetchedRecipes = firestoreResponse.docs.map(recipe => {
      const id = recipe.id;
      const data = recipe.data();
      data.publishDate = data.publishDate._seconds;

      return {
        ...data,
        id,
      };
    });
    const payload = {
      recipeCount,
      fetchedRecipes,
    };
    res.status(200).send(payload);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.put("/recipes/:id", async (req, res) => {
  const authorizationHeader = req.headers["authorization"];
  if (!authorizationHeader) {
    res.status(401).send("Missing Authorization Header");
    return;
  }
  try {
    await Utilities.authorizeUser(authorizationHeader, auth);
  } catch (error) {
    res.status(401).send(error.message);
    return;
  }
  const id = req.params.id;
  const newRecipe = req.body;
  const missingFields = Utilities.validateRecipePostPut(newRecipe);
  if (missingFields) {
    res
      .status(400)
      .send(`Recipe is not valid. Missing/invalid fields: ${missingFields}`);
    return;
  }
  const recipe = Utilities.sanitizeRecipePostPut(newRecipe);
  try {
    await firestore.collection("recipes-db").doc(id).set(recipe);
    res.status(200).send({ id });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.delete("/recipes/:id", async (req, res) => {
  const authorizationHeader = req.headers["authorization"];
  if (!authorizationHeader) {
    res.status(401).send("Missing Authorization Header");
    return;
  }
  try {
    await Utilities.authorizeUser(authorizationHeader, auth);
  } catch (error) {
    res.status(401).send(error.message);
  }
  const id = req.params.id;
  try {
    await firestore.collection("recipes-db").doc(id).delete();
    res.status(200).send();
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.get("/*", (req, res) => {
  res.status(200).send("No Such page");
});

// local dev
if (process.env.NODE_ENV !== "production") {
  app.listen(3005, () => {
    console.log(`api started`);
  });
}

module.exports = app;
