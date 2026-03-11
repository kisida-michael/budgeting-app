import PropTypes from "prop-types";
import { useDataStore } from "../../util/dataStore";
import { applyDashboardFilters } from "../../util/dashboardFilters";
import { getActiveCategories } from "../../util/categorySelections";
import { getCategoryChipStyle } from "../../util/themeStyles";

const CategoryFilterMenu = ({ setSelectedFilterOptions }) => {
	const { transactions, filters, setFilters, setDashboardStats, categories, setActiveSavedView, theme } =
		useDataStore((state) => ({
			transactions: state.transactions,
			filters: state.filters,
			setFilters: state.setFilters,
			setDashboardStats: state.setDashboardStats,
			categories: state.categories,
			setActiveSavedView: state.setActiveSavedView,
			theme: state.theme,
		}));

	return (
		<div className="flex flex-col gap-1 px-2 pb-1.5">
			{getActiveCategories(categories).map((category) => (
				<button
					key={category.name}
					className="add-filter-option w-full text-xs px-1 py-0.5 rounded font-medium"
					style={getCategoryChipStyle({
						color: category.color,
						colorDark: category.colorDark,
						theme,
					})}
					onClick={async () => {
						setSelectedFilterOptions(null);
						if (
							filters.some(
								(filter) => filter?.type === "Category" && filter?.category.name === category.name
							)
						) {
							return;
						}
						const newFilters = [...filters, { type: "Category", category: category }];
						await applyDashboardFilters({
							transactions,
							filters: newFilters,
							categories,
							setFilters,
							setDashboardStats,
							setActiveSavedView,
						});
					}}
				>
					{category.name}
				</button>
			))}
		</div>
	);
};

CategoryFilterMenu.propTypes = {
	selectedFilterOptions: PropTypes.object,
	setSelectedFilterOptions: PropTypes.func,
};

export default CategoryFilterMenu;
