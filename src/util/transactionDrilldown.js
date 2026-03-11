import { buildCategoryFilter, buildMonthDateFilter, buildYearDateFilter } from "../constants/Filters";

export const createTransactionDrilldownState = (filters, label) => ({
	transactionDrilldown: {
		filters,
		label,
	},
});

const toCategoryFilterPayload = (category) => ({
	name: category.name,
	color: category.color,
	colorDark: category.colorDark,
	colorLight: category.colorLight,
});

export const buildBudgetDrilldownFilters = ({ budget, month, year }) => {
	const filters = [buildMonthDateFilter(month, year)];

	if (budget.name !== "Total") {
		filters.push(buildCategoryFilter(toCategoryFilterPayload(budget)));
	}

	return filters;
};

export const buildSpendingDrilldownFilters = ({ category, year, month = null }) => {
	const filters = [month ? buildMonthDateFilter(month, year) : buildYearDateFilter(year)];

	if (category?.name && category.name !== "Total") {
		filters.push(buildCategoryFilter(toCategoryFilterPayload(category)));
	}

	return filters;
};
