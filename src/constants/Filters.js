import { daysByMonth } from "./Dates";

export const buildDefaultDateFilter = () => {
	const today = new Date();
	const currentMonthDays = daysByMonth[today.getMonth() + 1];

	return {
		type: "Date",
		start: {
			month: today.getMonth() + 1,
			day: 1,
			year: today.getFullYear(),
		},
		end: {
			month: today.getMonth() + 1,
			day: currentMonthDays[currentMonthDays.length - 1],
			year: today.getFullYear(),
		},
	};
};

export const buildSearchFilter = (query) => ({
	type: "Search",
	query,
});

export const defaultFilter = buildDefaultDateFilter();

export const normalizeFilters = (filters) => {
	if (!Array.isArray(filters) || filters.length === 0) {
		return [buildDefaultDateFilter()];
	}

	return filters;
};
