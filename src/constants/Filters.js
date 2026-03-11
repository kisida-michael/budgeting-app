import { daysByMonth } from "./Dates";

const getDaysInMonth = (month, year) => {
	if (month === 2) {
		return new Date(year, 2, 0).getDate();
	}

	const days = daysByMonth[month];
	return days?.[days.length - 1] ?? 31;
};

export const buildDateFilter = ({ startMonth, startDay, startYear, endMonth, endDay, endYear }) => ({
	type: "Date",
	start: {
		month: startMonth,
		day: startDay,
		year: startYear,
	},
	end: {
		month: endMonth,
		day: endDay,
		year: endYear,
	},
});

export const buildDefaultDateFilter = () => {
	const today = new Date();
	return buildMonthDateFilter(today.getMonth() + 1, today.getFullYear());
};

export const buildSearchFilter = (query) => ({
	type: "Search",
	query,
});

export const buildCategoryFilter = (category) => ({
	type: "Category",
	category,
});

export const buildMonthDateFilter = (month, year) =>
	buildDateFilter({
		startMonth: month,
		startDay: 1,
		startYear: year,
		endMonth: month,
		endDay: getDaysInMonth(month, year),
		endYear: year,
	});

export const buildYearDateFilter = (year) =>
	buildDateFilter({
		startMonth: 1,
		startDay: 1,
		startYear: year,
		endMonth: 12,
		endDay: 31,
		endYear: year,
	});

export const defaultFilter = buildDefaultDateFilter();

export const normalizeFilters = (filters) => {
	if (!Array.isArray(filters) || filters.length === 0) {
		return [buildDefaultDateFilter()];
	}

	return filters;
};
