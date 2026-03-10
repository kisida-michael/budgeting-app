import { buildDefaultDateFilter } from "./Filters";

const buildCategoryFilter = (category) =>
	category
		? {
				type: "Category",
				category,
		  }
		: null;

export const buildSavedViews = (categories = []) => {
	const findCategory = (name) => categories.find((category) => category.name === name);

	return [
		{
			key: "this-month",
			label: "This Month",
			buildFilters: () => [buildDefaultDateFilter()],
		},
		{
			key: "uncategorized",
			label: "Uncategorized",
			buildFilters: () => [buildDefaultDateFilter(), buildCategoryFilter(findCategory("Uncategorized"))].filter(Boolean),
		},
		{
			key: "bills",
			label: "Bills",
			buildFilters: () => [buildDefaultDateFilter(), buildCategoryFilter(findCategory("Bills & Utilities"))].filter(Boolean),
		},
		{
			key: "large-charges",
			label: "Large Charges",
			buildFilters: () => [
				buildDefaultDateFilter(),
				{
					type: "Amount",
					condition: "greaterThan",
					amount: "100",
				},
			],
		},
		{
			key: "recent-credits",
			label: "Recent Credits",
			buildFilters: () => [buildDefaultDateFilter(), buildCategoryFilter(findCategory("Credits/Payments"))].filter(Boolean),
		},
	];
};
