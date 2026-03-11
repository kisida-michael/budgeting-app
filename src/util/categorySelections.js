export const getActiveCategories = (categories = []) =>
	categories.filter((category) => !category.archivedAt);

export const getSelectableCategories = (categories = [], currentName = null) =>
	categories.filter((category) => !category.archivedAt || category.name === currentName);
