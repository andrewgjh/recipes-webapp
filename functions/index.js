// const functions = require("firebase-functions");

// // // Create and Deploy Your First Cloud Functions
// // // https://firebase.google.com/docs/functions/write-firebase-functions
// //
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", { structuredData: true });
//   response.send("Hello from Firebase!");
// });

const FirebaseConfig = require("./firebaseConfig");
const recipesApi = require("./recipesApi");
const functions = FirebaseConfig.functions;
const firestore = FirebaseConfig.firestore;
const storageBucket = FirebaseConfig.storageBucket;
const admin = FirebaseConfig.admin;

exports.api = functions.https.onRequest(recipesApi);

exports.onCreateRecipe = functions.firestore
  .document("recipes-db/{recipeId}")
  .onCreate(async snapshot => {
    const countDocRef = firestore.collection("recipeCounts").doc("all");
    const countDoc = await countDocRef.get();
    if (countDoc.exists) {
      countDocRef.update({ count: admin.firestore.FieldValue.increment(1) });
    } else {
      countDocRef.set({ count: 1 });
    }
    const recipe = snapshot.data();
    if (recipe.isPublished) {
      const countPublishedDocRef = firestore
        .collection("recipeCounts")
        .doc("published");
      const countPublishedDoc = await countPublishedDocRef.get();
      if (countPublishedDoc.exists) {
        countPublishedDocRef.update({
          count: admin.firestore.FieldValue.increment(1),
        });
      } else {
        countPublishedDocRef.set({ count: 1 });
      }
    }
  });

exports.onDeleteRecipe = functions.firestore
  .document("recipes-db/{recipeId}")
  .onDelete(async snapshot => {
    // update counts
    const recipe = snapshot.data();
    const countDocRef = firestore.collection("recipeCounts").doc("all");
    const countDoc = await countDocRef.get();
    if (countDoc.exists) {
      countDocRef.update({
        count: admin.firestore.FieldValue.increment(-1),
      });
    } else {
      countDocRef.set({ count: 0 });
    }
    if (recipe.isPublished) {
      const countPublishedDocRef = firestore
        .collection("recipeCounts")
        .doc("published");
      const countPublishedDoc = await countPublishedDocRef.get();
      if (countPublishedDoc.exists) {
        countPublishedDocRef.update({
          count: admin.firestore.FieldValue.increment(-1),
        });
      } else {
        countPublishedDocRef.set({ count: 0 });
      }
    }
    // delete image associated with recipe
    try {
      const imageUrl = recipe.imageUrl;
      const decodedUrl = decodeURIComponent(imageUrl);
      const startIndex = decodedUrl.indexOf("/o/") + 3;
      const endIndex = decodedUrl.indexOf("?");
      const fullFilePath = decodedUrl.substring(startIndex, endIndex);
      const file = storageBucket.file(fullFilePath);
      console.log(`Attempting to delete: ${fullFilePath}`);

      await file.delete();
      console.log(`Successfully deleted image for ${recipe.name}`);
    } catch (error) {
      console.log(`Failed to delete file: ${error.message}`);
    }
  });

exports.onUpdateRecipes = functions.firestore
  .document("recipes-db/{recipesId}")
  .onUpdate(async changes => {
    const oldRecipes = changes.before.data();
    const newRecipe = changes.after.data();
    let publishCount = 0;
    if (!oldRecipes.isPublished && newRecipe.isPublished) {
      publishCount += 1;
    } else if (oldRecipes.isPublished && !newRecipe.isPublished) {
      publishCount -= 1;
    }
    if (publishCount !== 0) {
      const publishedCountDocRef = firestore
        .collection("recipeCounts")
        .doc("published");
      const publishCountDoc = await publishedCountDocRef.get();
      if (publishCountDoc.exists) {
        publishedCountDocRef.update({
          count: admin.firestore.FieldValue.increment(publishCount),
        });
      } else {
        if (publishCount > 0) {
          publishedCountDocRef.set({ count: publishCount });
        } else {
          publishedCountDocRef.set({ count: 0 });
        }
      }
    }
  });

// https://crontab.guru/

const runtimeOptions = {
  timeoutSeconds: 300,
  memeory: "256MB",
};

exports.dailyCheckRecipePublishDate = functions
  .runWith(runtimeOptions)
  .pubsub.schedule("0 0 * * *")
  .onRun(async () => {
    console.log("dailyCheckRecipePublishDate() called - time to check");

    const snapshot = await firestore
      .collection("recipes-db")
      .where("isPublished", "==", false)
      .get();
    snapshot.forEach(async doc => {
      const data = doc.data();
      const now = Date.now() / 1000;
      const isPublished = data.publishDate._seconds <= now;
      if (isPublished) {
        console.log(`Recipe: ${data.name} is now published`);
        firestore
          .collection("recipes-db")
          .doc(doc.id)
          .set({ isPublished }, { merge: true });
      }
    });
  });

console.log("SERVER STARTED!");
