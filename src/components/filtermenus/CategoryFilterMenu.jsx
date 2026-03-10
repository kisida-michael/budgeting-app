import PropTypes from "prop-types";
import { useDataStore } from "../../util/dataStore";
import { applyDashboardFilters } from "../../util/dashboardFilters";

const CategoryFilterMenu = ({ setSelectedFilterOptions }) => {
	const { transactions, filters, setFilters, setDashboardStats, categories, setActiveSavedView } = useDataStore((state) => ({
		transactions: state.transactions,
		filters: state.filters,
		setFilters: state.setFilters,
		setDashboardStats: state.setDashboardStats,
		categories: state.categories,
		setActiveSavedView: state.setActiveSavedView,
	}));

	return (
		<div className="flex flex-col gap-1 px-2 pb-1.5">
			{categories.map((category) => (
				<button
					key={category.name}
					className="add-filter-option w-full text-xs text-slate-600 px-1 py-0.5 rounded"
					style={{
						backgroundColor: category.color,
						borderWidth: "1px",
						borderColor: category.colorDark,
					}}
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
