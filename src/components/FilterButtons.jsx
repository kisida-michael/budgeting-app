import { useState } from "react";
import { useAnimationStore } from "../util/animationStore";
import { useDataStore } from "../util/dataStore";
import { daysByMonth } from "../constants/Dates";
import { buildDefaultDateFilter } from "../constants/Filters";
import { applyDashboardFilters } from "../util/dashboardFilters";
import DateFilterMenu from "./filtermenus/DateFilterMenu";
import AmountFilterMenu from "./filtermenus/AmountFilterMenu";
import MerchantFilterMenu from "./filtermenus/MerchantFilterMenu";
import ConfigurationFilterMenu from "./filtermenus/ConfigurationFilterMenu";
import CategoryFilterMenu from "./filtermenus/CategoryFilterMenu";

const FilterButtons = () => {
	const { filterMenuVisible, filterMenuAnimating, openFilterMenu, closeFilterMenu } = useAnimationStore((state) => ({
		filterMenuVisible: state.filterMenuVisible,
		filterMenuAnimating: state.filterMenuAnimating,
		openFilterMenu: state.openFilterMenu,
		closeFilterMenu: state.closeFilterMenu,
	}));
	const { transactions, filters, setFilters, setDashboardStats, categories, setActiveSavedView } = useDataStore((state) => ({
		transactions: state.transactions,
		filters: state.filters,
		setFilters: state.setFilters,
		setDashboardStats: state.setDashboardStats,
		categories: state.categories,
		setActiveSavedView: state.setActiveSavedView,
	}));
	const [selectedFilterOptions, setSelectedFilterOptions] = useState(null);

	const setDateSelectedFilterOption = () => {
		const today = new Date();
		const currentMonthDays = daysByMonth[today.getMonth() + 1];
		setSelectedFilterOptions({
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
		});
	};

	const setMerchantSelectedFilterOption = () => {
		setSelectedFilterOptions({
			type: "Merchant",
			merchant: "",
		});
	};

	const setCategorySelectedFilterOption = () => {
		setSelectedFilterOptions({
			type: "Category",
			category: "",
		});
	};

	const setConfigurationSelectedFilterOption = () => [
		setSelectedFilterOptions({
			type: "Configuration",
			configuration: "",
		}),
	];

	const setAmountSelectedFilterOption = () => {
		setSelectedFilterOptions({
			type: "Amount",
			condition: "lessThan",
			amount: "",
		});
	};

	const filterMenuOptions = ["Date", "Merchant", "Category", "Configuration", "Amount"];
	const filterMenuOptionsSetFunctions = {
		Date: setDateSelectedFilterOption,
		Merchant: setMerchantSelectedFilterOption,
		Category: setCategorySelectedFilterOption,
		Configuration: setConfigurationSelectedFilterOption,
		Amount: setAmountSelectedFilterOption,
	};

	const resetFilters = async () => {
		const defaultFilters = [buildDefaultDateFilter()];
		if (JSON.stringify(filters) === JSON.stringify(defaultFilters)) return;

		await applyDashboardFilters({
			transactions,
			filters: defaultFilters,
			categories,
			setFilters,
			setDashboardStats,
			setActiveSavedView,
		});
	};

	return (
		<div className="add-filter-button flex gap-1.5">
			<div className="add-filter-button relative">
				<button
					onClick={filterMenuVisible ? closeFilterMenu : openFilterMenu}
					className="add-filter-button font-normal text-slate-600 bg-cGreen-light hover:bg-cGreen-lightHover border border-slate-300 rounded text-sm py-2 px-2"
				>
					<div className="add-filter-button w-[1.25rem]" style={{ padding: "0.2rem" }}>
						<img src="./plus_dark_slate.svg" className="add-filter-button" />
					</div>
				</button>
				{(filterMenuVisible || filterMenuAnimating) && (
					<div
						className={`${
							filterMenuAnimating ? (filterMenuVisible ? "enter" : "exit") : ""
						} add-filter-menu dropdown-down overflow-hidden w-[12rem] drop-shadow-sm absolute z-[99] right-0 top-[120%] bg-white border border-slate-200 rounded-lg`}
					>
						<div
							className="add-filter-menu flex w-[200%] transition-[transform] duration-200"
							style={{ transform: selectedFilterOptions?.type ? "translateX(-50%)" : "" }}
						>
							<div className="add-filter-menu flex flex-col w-1/2 py-2">
								<div className="add-filter-header font-semibold text-slate-600 mb-0.5 px-2.5">
									Add Filter
								</div>
								{filterMenuOptions.map((option) => (
									<button
										key={option}
										onClick={() => {
											filterMenuOptionsSetFunctions[option]();
										}}
										className="add-filter-option text-sm text-start hover:bg-slate-50 px-2.5 py-0.5"
									>
										{option}
									</button>
								))}
							</div>
							<div className="add-filter-menu flex flex-col w-1/2">
								<button
									onClick={() => setSelectedFilterOptions(null)}
									className="add-filter-menu w-5 hover:bg-slate-50 rounded mt-1.5 ml-2 p-0.5 mb-0.5"
								>
									<img src="./back.svg" className="add-filter-menu w-full" />
								</button>
								{selectedFilterOptions?.type === "Category" && (
									<CategoryFilterMenu setSelectedFilterOptions={setSelectedFilterOptions} />
								)}
								{selectedFilterOptions?.type === "Configuration" && (
									<ConfigurationFilterMenu
										selectedFilterOptions={selectedFilterOptions}
										setSelectedFilterOptions={setSelectedFilterOptions}
									/>
								)}
								{selectedFilterOptions?.type === "Merchant" && (
									<MerchantFilterMenu
										selectedFilterOptions={selectedFilterOptions}
										setSelectedFilterOptions={setSelectedFilterOptions}
									/>
								)}
								{selectedFilterOptions?.type === "Amount" && (
									<AmountFilterMenu
										selectedFilterOptions={selectedFilterOptions}
										setSelectedFilterOptions={setSelectedFilterOptions}
									/>
								)}
								{selectedFilterOptions?.type === "Date" && (
									<DateFilterMenu
										selectedFilterOptions={selectedFilterOptions}
										setSelectedFilterOptions={setSelectedFilterOptions}
									/>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
			<div>
				<button
					onClick={resetFilters}
					className="font-normal hover:bg-slate-50 border border-slate-200 rounded text-sm py-2 px-2"
				>
					<div className="w-[1.25rem]" style={{ padding: "0.2rem" }}>
						<img src="./close.svg" className="w-full" />
					</div>
					{/* Clear */}
				</button>
			</div>
		</div>
	);
};

export default FilterButtons;
