import { buildSearchFilter } from "../constants/Filters";
import { buildSavedViews } from "../constants/SavedViews";
import { getDashboardStats } from "./statsUtil";

export const stripSearchFilters = (filters = []) =>
	filters.filter((filter) => filter?.type !== "Search");

export const getSearchQuery = (filters = []) =>
	filters.find((filter) => filter?.type === "Search")?.query ?? "";

export const withSearchQuery = (filters = [], query = "") => {
	const nextFilters = stripSearchFilters(filters);
	const trimmedQuery = query.trim();

	if (trimmedQuery.length === 0) {
		return nextFilters;
	}

	return [...nextFilters, buildSearchFilter(trimmedQuery)];
};

export const getMatchingSavedViewKey = (filters = [], categories = []) => {
	const comparableFilters = JSON.stringify(stripSearchFilters(filters));
	const matchedSavedView = buildSavedViews(categories).find(
		(savedView) => JSON.stringify(savedView.buildFilters()) === comparableFilters
	);

	return matchedSavedView?.key ?? "custom";
};

export const applyDashboardFilters = async ({
	transactions,
	filters,
	categories,
	setFilters,
	setDashboardStats,
	setActiveSavedView,
}) => {
	setFilters(filters);
	setActiveSavedView(getMatchingSavedViewKey(filters, categories));
	setDashboardStats(await getDashboardStats(transactions, filters));
};
