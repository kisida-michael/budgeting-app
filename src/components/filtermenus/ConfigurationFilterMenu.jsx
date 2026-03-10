import PropTypes from "prop-types";
import { useDataStore } from "../../util/dataStore";
import { applyDashboardFilters } from "../../util/dashboardFilters";

const ConfigurationFilterMenu = ({ setSelectedFilterOptions }) => {
	const { transactions, filters, setFilters, setDashboardStats, categories, setActiveSavedView } = useDataStore((state) => ({
		transactions: state.transactions,
		filters: state.filters,
		setFilters: state.setFilters,
		setDashboardStats: state.setDashboardStats,
		categories: state.categories,
		setActiveSavedView: state.setActiveSavedView,
	}));

	return (
		<div className="flex flex-col gap-1">
			{[...new Set(transactions.map((tx) => tx.configurationName))].map((configuration) => (
				<button
					key={configuration}
					className="add-filter-option text-sm text-start hover:bg-slate-50 px-2.5 py-0.5 "
					onClick={async () => {
						setSelectedFilterOptions(null);
						if (
							filters.some(
								(filter) => filter?.type === "Configuration" && filter?.configuration === configuration
							)
						) {
							return;
						}
						const newFilters = [...filters, { type: "Configuration", configuration: configuration }];
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
					{configuration}
				</button>
			))}
		</div>
	);
};

ConfigurationFilterMenu.propTypes = {
	selectedFilterOptions: PropTypes.object,
	setSelectedFilterOptions: PropTypes.func,
};

export default ConfigurationFilterMenu;
