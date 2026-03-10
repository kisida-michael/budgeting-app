import PropTypes from "prop-types";
import { useDataStore } from "../../util/dataStore";
import { applyDashboardFilters } from "../../util/dashboardFilters";

const MerchantFilterMenu = ({ selectedFilterOptions, setSelectedFilterOptions }) => {
	const { transactions, filters, setFilters, setNotification, setDashboardStats, categories, setActiveSavedView } = useDataStore((state) => ({
		transactions: state.transactions,
		filters: state.filters,
		setFilters: state.setFilters,
		setNotification: state.setNotification,
		setDashboardStats: state.setDashboardStats,
		categories: state.categories,
		setActiveSavedView: state.setActiveSavedView,
	}));

	return (
		<div className="flex flex-col grow px-2 pb-2 gap-1">
			<textarea
				className="add-filter-option outline-none text-xs p-1 grow resize-none border border-slate-200 rounded"
				placeholder="Enter search term"
				value={selectedFilterOptions.merchant}
				onChange={(e) => setSelectedFilterOptions({ ...selectedFilterOptions, merchant: e.target.value })}
			/>
			<button
				onClick={async () => {
					if (selectedFilterOptions.merchant === "") {
						setNotification({ message: "Merchant cannot be empty.", type: "error" });
						return;
					}

					const tempSelectedFilterOptions = { ...selectedFilterOptions };
					setSelectedFilterOptions(null);
					if (
						filters.some(
							(filter) =>
								filter?.type === "Merchant" && filter?.merchant === tempSelectedFilterOptions.merchant
						)
					) {
						return;
					}
					const newFilters = [...filters, tempSelectedFilterOptions];
					await applyDashboardFilters({
						transactions,
						filters: newFilters,
						categories,
						setFilters,
						setDashboardStats,
						setActiveSavedView,
					});
				}}
				className="add-filter-option text-xs hover:bg-slate-50 border border-slate-200 rounded w-full py-0.5"
			>
				Add
			</button>
		</div>
	);
};

MerchantFilterMenu.propTypes = {
	selectedFilterOptions: PropTypes.object,
	setSelectedFilterOptions: PropTypes.func,
};

export default MerchantFilterMenu;
