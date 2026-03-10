import PropTypes from "prop-types";
import { useDataStore } from "../../util/dataStore";
import { applyDashboardFilters } from "../../util/dashboardFilters";

const AmountFilterMenu = ({ selectedFilterOptions, setSelectedFilterOptions }) => {
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
		<div className="add-filter-option flex flex-col justify-between grow px-2.5 pb-2">
			<div className="add-filter-option">
				<div className="add-filter-option text-xs font-medium">Condition</div>
				<select
					value={selectedFilterOptions.condition}
					onChange={(e) => {
						setSelectedFilterOptions({ ...selectedFilterOptions, condition: e.target.value });
					}}
					className="add-filter-option w-full text-xs border border-slate-200 rounded p-1 bg-white outline-none"
				>
					<option value="lessThan">Less Than</option>
					<option value="equals">Equals</option>
					<option value="greaterThan">Greater Than</option>
				</select>
			</div>
			<div className="add-filter-option">
				<div className="add-filter-option text-xs font-medium">Amount</div>
				<input
					value={selectedFilterOptions.amount}
					onChange={(e) => {
						setSelectedFilterOptions({ ...selectedFilterOptions, amount: e.target.value });
					}}
					className="add-filter-option w-full text-xs border border-slate-200 rounded p-0.5 outline-none"
				/>
			</div>
			<button
				onClick={async () => {
					// Check if the amount is empty
					if (selectedFilterOptions.amount === "") {
						setNotification({ message: "Amount cannot be empty.", type: "error" });
						return;
					}

					// Check if the amount is a number
					if (isNaN(selectedFilterOptions.amount)) {
						setNotification({ message: "Amount must be a number.", type: "error" });
						return;
					}

					// If it is a number, clear the options to reset the menu
					const tempSelectedFilterOptions = {
						...selectedFilterOptions,
						amount: parseFloat(selectedFilterOptions.amount),
					};
					setSelectedFilterOptions(null);

					if (
						filters.some(
							(filter) =>
								filter?.type === "Amount" &&
								filter?.condition === tempSelectedFilterOptions.condition &&
								filter?.amount === tempSelectedFilterOptions.amount
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

AmountFilterMenu.propTypes = {
	selectedFilterOptions: PropTypes.object,
	setSelectedFilterOptions: PropTypes.func,
};

export default AmountFilterMenu;
