import "./App.css";
import { useEffect, useState, useCallback } from "react";
import FirebaseAuthService from "./FirebaseAuthService";
import LoginForm from "./components/LoginForm";
import AddEditRecipeForm from "./components/AddEditRecipeForm";
import FirebaseFirestoreService from "./FirebaseFirestoreService";
import { lookupCategoryLabel, formatDate } from "./utils/helpers";

function App() {
  const [user, setUser] = useState(null);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [orderBy, setOrderBy] = useState("publishDateDesc");
  const [recipesPerPage, setRecipesPerPage] = useState(3);

  const fetchRecipes = useCallback(
    async (cursorId = "") => {
      let queries = [];
      let fetchedRecipes = [];
      if (categoryFilter) {
        queries.push({
          field: "category",
          condition: "==",
          value: categoryFilter,
        });
      }
      if (!user) {
        queries.push({
          field: "isPublished",
          condition: "==",
          value: true,
        });
      }
      const orderByField = "publishDate";
      let orderByDirection;
      if (orderBy) {
        switch (orderBy) {
          case "publishDateAsc":
            orderByDirection = "asc";
            break;
          case "publishDateDesc":
            orderByDirection = "desc";
            break;
          default:
            break;
        }
      }
      try {
        const response = await FirebaseFirestoreService.readDocuments({
          collection: "recipes-db",
          queries: queries,
          orderByField,
          orderByDirection,
          perPage: recipesPerPage,
          cursorId,
        });

        const newRecipes = response.docs.map(recipeDoc => {
          const id = recipeDoc.id;
          const data = recipeDoc.data();
          data.publishDate = new Date(data.publishDate.seconds * 1000);

          return {
            ...data,
            id,
          };
        });
        if (cursorId) {
          fetchedRecipes = [...recipes, ...newRecipes];
        } else {
          fetchedRecipes = [...newRecipes];
        }
      } catch (error) {
        console.error(error.message);
        throw error;
      }
      return fetchedRecipes;
    },
    [categoryFilter, orderBy, recipes, recipesPerPage, user]
  );
  const handleRecipesPerPageChange = e => {
    const recipesPerPage = e.target.value;
    setRecipes([]);
    setRecipesPerPage(recipesPerPage);
  };

  const handleLoadMoreRecipesClick = () => {
    const lastRecipe = recipes[recipes.length - 1];
    const cursorId = lastRecipe.id;
    handleFetchRecipes(cursorId);
  };

  const handleFetchRecipes = async (cursorId = "") => {
    try {
      const fetchedRecipes = await fetchRecipes(cursorId);
      setRecipes(fetchedRecipes);
    } catch (error) {
      alert(error.message);
    }
  };
  async function handleUpdateRecipe(newRecipe, recipeId) {
    try {
      await FirebaseFirestoreService.updateDocument(
        "recipes-db",
        recipeId,
        newRecipe
      );
      handleFetchRecipes();
      alert(`Successfully updated a recipe with a ID = ${recipeId}`);
      setCurrentRecipe(null);
    } catch (error) {
      alert(error.message);
      throw error;
    }
  }
  async function handleDeleteRecipe(recipeID) {
    const deleteConfirmation = window.confirm(
      "Are you sure you want to delete this recipe? OK for Yes, Cancel for No"
    );
    if (deleteConfirmation) {
      try {
        await FirebaseFirestoreService.deleteDocument("recipes-db", recipeID);
        handleFetchRecipes();
        setCurrentRecipe(null);
        window.scrollTo(0, 0);
        alert(`successfully delete a recipe with an ID = ${recipeID}`);
      } catch (error) {
        alert(error.message);
        throw error;
      }
    }
  }

  function handleEditRecipeClick(recipeId) {
    const selectedRecipe = recipes.find(recipe => {
      return recipe.id === recipeId;
    });
    if (selectedRecipe) {
      setCurrentRecipe(selectedRecipe);
      window.scrollTo(0, document.body.scrollHeight);
    }
  }

  function handleEditRecipeCancel() {
    setCurrentRecipe(null);
  }

  useEffect(() => {
    setIsLoading(true);
    fetchRecipes()
      .then(fetchedRecipes => {
        setRecipes(fetchedRecipes);
      })
      .catch(err => {
        console.log(err);
        throw err;
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user, categoryFilter, orderBy, recipesPerPage, fetchRecipes]);

  FirebaseAuthService.subscribeToAuthChanges(setUser);
  async function handleAddRecipe(newRecipe) {
    try {
      const response = await FirebaseFirestoreService.createDocument(
        "recipes-db",
        newRecipe
      );
      handleFetchRecipes();
      alert(`successfully create a recipe with an an ID =${response.id}`);
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="App">
      <div className="title-row">
        <h1 className="title">Food Recipes</h1>
        <LoginForm existingUser={user} />
      </div>
      <div className="main">
        <div className="row filters">
          {" "}
          <label className="recipe-label input-label">
            Category:
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="select"
              required
            >
              <option value=""></option>
              <option value="breadsSandwichesAndPizza">
                Breads, Sandwiches and Pizza
              </option>
              <option value="eggsAndBreakfast">Eggs and Breakfast</option>
              <option value="dessertsAndBakedGoods">
                Desserts and Baked Goods
              </option>
              <option value="fishAndSeafood">Fish and Seafood</option>
              <option value="vegetables">Vegetables</option>
            </select>
          </label>
          <label className="input-label">
            <select
              className="select"
              value={orderBy}
              onChange={e => setOrderBy(e.target.value)}
            >
              <option value={"publishDateDesc"}>
                {" "}
                Publish Date (newest - oldest){" "}
              </option>
              <option value={"publishDateAsc"}>
                {" "}
                Publish Date (oldest - newest){" "}
              </option>
            </select>
          </label>
        </div>
        <div className="center">
          <div className="recipe-list-box">
            {isLoading ? (
              <div className="fire">
                <div className="flames">
                  <div className="flame"></div>
                  <div className="flame"></div>
                  <div className="flame"></div>
                  <div className="flame"></div>
                </div>
                <div className="logs"></div>
              </div>
            ) : null}
            {!isLoading && recipes && recipes.length === 0 ? (
              <h5 className="no-recipes">No Recipes Found</h5>
            ) : null}
            {!isLoading && recipes && recipes.length > 0 ? (
              <div className="recipe-list">
                {recipes.map(recipe => {
                  return (
                    <div className="recipe-card" key={recipe.id}>
                      {recipe.isPublished === false ? (
                        <div className="unpublished">UNPUBLISHED</div>
                      ) : null}
                      <div className="recipe-name">{recipe.name}</div>
                      <div className="recipe-field">
                        Category:{lookupCategoryLabel(recipe.category)}
                      </div>
                      <div className="recipe-field">
                        Publish Date: {formatDate(recipe.publishDate)}
                      </div>
                      {user ? (
                        <button
                          type="button"
                          onClick={() => handleEditRecipeClick(recipe.id)}
                          className="primary-button edit-button"
                        >
                          EDIT
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
        {isLoading || (recipes && recipes.length > 0) ? (
          <>
            <label className="input-label">
              Recipes Per Page:
              <select
                value={recipesPerPage}
                onChange={handleRecipesPerPageChange}
                className="select"
              >
                <option value="3">3</option>
                <option value="6">6</option>
                <option value="9">7</option>
              </select>
            </label>
            <div className="pagination">
              <button
                type="button"
                className="primary-buton"
                onClick={handleLoadMoreRecipesClick}
              >
                Load More Recipes
              </button>
            </div>
          </>
        ) : null}
        {user ? (
          <AddEditRecipeForm
            existingRecipe={currentRecipe}
            handleAddRecipe={handleAddRecipe}
            handleUpdateRecipe={handleUpdateRecipe}
            handleEditRecipeCancel={handleEditRecipeCancel}
            handleDeleteRecipe={handleDeleteRecipe}
          />
        ) : null}
      </div>
    </div>
  );
}

export default App;
