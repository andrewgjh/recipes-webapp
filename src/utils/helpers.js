const padDateWithZero = (number, digits = 2) => {
  let finalString = String(number);
  finalString = "0".repeat(digits - finalString.length) + finalString;
  return finalString;
};

export const getTodayString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${padDateWithZero(
    today.getMonth() + 1
  )}-${padDateWithZero(today.getDate())}`;
};

export const lookupCategoryLabel = categoryKey => {
  const categories = {
    breadsSandwichesAndPizza: "Breads, Sandwiches and Pizza",
    eggsAndBreakfast: "Eggs and Breakfast",
    dessertsAndBakedGoods: "Desserts and Baked Goods",
    fishAndSeafood: "Fish and Seafood",
    vegetables: "Vegetables",
  };
  return categories[categoryKey];
};

export const formatDate = date => {
  const day = padDateWithZero(date.getUTCDate());
  const month = padDateWithZero(date.getUTCMonth() + 1);
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};
