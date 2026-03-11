import { useState } from "react";
import { useAnimationStore } from "../util/animationStore";
import { useDataStore } from "../util/dataStore";
import {
	deleteTransactions,
	getMerchantSettings,
	setTransactionCategories,
	setTransactionsIgnored,
	upsertMerchantSetting,
} from "../util/supabaseQueries";
import { getDashboardStats } from "../util/statsUtil";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faList } from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";
import { getActiveCategories } from "../util/categorySelections";
import { getCategoryChipStyle } from "../util/themeStyles";

const BulkActions = ({ localTransactions, setLocalTransactions }) => {
	const { bulkActionsMenuVisible, bulkActionsMenuAnimating, openBulkActionsMenu, closeBulkActionsMenu } =
		useAnimationStore((state) => ({
			bulkActionsMenuVisible: state.bulkActionsMenuVisible,
			bulkActionsMenuAnimating: state.bulkActionsMenuAnimating,
			openBulkActionsMenu: state.openBulkActionsMenu,
			closeBulkActionsMenu: state.closeBulkActionsMenu,
		}));
	const { filters, setTransactions, setDashboardStats, categories, setNotification, fetchBudgets, merchantSettings, setMerchantSettings, theme } =
		useDataStore((state) => ({
		setTransactions: state.setTransactions,
		filters: state.filters,
		setDashboardStats: state.setDashboardStats,
		categories: state.categories,
		setNotification: state.setNotification,
		fetchBudgets: state.fetchBudgets,
		merchantSettings: state.merchantSettings,
		setMerchantSettings: state.setMerchantSettings,
		theme: state.theme,
	}));
	const [slideMenu, setSlideMenu] = useState(false);

	const maybeCreateMerchantRule = async (selectedTransactions, categoryName) => {
		const distinctMerchants = [...new Set(selectedTransactions.map((transaction) => transaction.merchant?.trim()).filter(Boolean))];
		if (distinctMerchants.length !== 1) return { prompted: false, saved: false };

		const merchantText = distinctMerchants[0];
		const existingExactRule = (merchantSettings ?? []).some(
			(rule) => rule.type === "equals" && rule.text?.toLowerCase() === merchantText.toLowerCase()
		);
		if (existingExactRule) return { prompted: false, saved: false };

		const shouldSaveRule = window.confirm(
			`Also save an exact-match merchant rule for "${merchantText}" to categorize future transactions as ${categoryName}?`
		);
		if (!shouldSaveRule) return { prompted: true, saved: false };

		const saved = await upsertMerchantSetting({
			text: merchantText,
			type: "equals",
			categoryName,
		});

		if (!saved) {
			setNotification({ type: "error", message: "Category updated, but the merchant rule could not be saved." });
			return { prompted: true, saved: false };
		}

		const refreshedMerchantSettings = await getMerchantSettings();
		setMerchantSettings(refreshedMerchantSettings);
		return { prompted: true, saved: true, merchantText };
	};

	const onClickCategory = async (categoryName) => {
		const selectedTransactions = localTransactions.filter((t) => t.selected);
		closeBulkActionsMenu();
		const success = await setTransactionCategories(selectedTransactions, categoryName);

		// If the update was successful, simply update the current set of local transactions with the new categories
		if (success) {
			const nextTransactions = localTransactions.map((t) => (t.selected ? { ...t, categoryName } : t));
			await onSuccess(nextTransactions);
			const merchantRuleResult = await maybeCreateMerchantRule(selectedTransactions, categoryName);
			if (localTransactions.filter((t) => t.selected).length > 0) {
				setNotification({
					type: "success",
					message: merchantRuleResult.saved
						? `Updated ${selectedTransactions.length} transaction${selectedTransactions.length === 1 ? "" : "s"} and saved an exact-match rule for ${merchantRuleResult.merchantText}.`
						: `Updated ${selectedTransactions.length} transaction${selectedTransactions.length === 1 ? "" : "s"}.`,
				});
			}
		}
		else setNotification({ type: "error", message: "Could not update transaction(s)." });
	};

	const onUpdateIgnored = async (ignored) => {
		closeBulkActionsMenu();
		const success = await setTransactionsIgnored(
			localTransactions.filter((t) => t.selected),
			ignored
		);

		// If the update was successful, simply update the current set of local transactions with the new ignored statuses
		if (success) await onSuccess(localTransactions.map((t) => (t.selected ? { ...t, ignored } : t)));
		else setNotification({ type: "error", message: "Could not update transaction(s)." });
	};

	const onDelete = async () => {
		closeBulkActionsMenu();
		const success = await deleteTransactions(localTransactions.filter((t) => t.selected));

		// If the update was successful, simply update the current set of local transactions with the deleted transactions removed
		if (success) await onSuccess(localTransactions.filter((t) => !t.selected));
		else setNotification({ type: "error", message: "Could not update transaction(s)." });
	};

	const onSuccess = async (newTransactions) => {
		const persistedTransactions = newTransactions.map(({ selected, ...transaction }) => transaction);
		setLocalTransactions(newTransactions);
		setTransactions(persistedTransactions);
		setDashboardStats(await getDashboardStats(persistedTransactions, filters));
		await fetchBudgets();
	};

	return (
		<div className="bulk-actions-menu w-full relative flex items-center justify-start">
			<div className=" w-full">
				<button
					onClick={bulkActionsMenuVisible ? closeBulkActionsMenu : openBulkActionsMenu}
					className=" relative font-normal text-slate-600 bg-cGreen-lighter hover:bg-cGreen-lightHover border border-slate-300 rounded text-sm py-1 px-2"
				>
					Bulk Actions
				</button>
			</div>
			{(bulkActionsMenuVisible || bulkActionsMenuAnimating) && (
				<div
					className={`${
						bulkActionsMenuAnimating ? (bulkActionsMenuVisible ? "enter" : "exit") : ""
					}  dropdown-down flex flex-col overflow-hidden w-[12rem] drop-shadow-sm absolute z-[99] left-0 top-[120%] bg-white border border-slate-200 rounded-lg`}
				>
					<div
						className="flex w-[200%] transition-[transform] duration-200"
						style={{ transform: slideMenu ? "translateX(-50%)" : "" }}
					>
						<div className="w-1/2 px-1 py-1.5">
							<button
								onClick={() => setSlideMenu(true)}
								className=" w-full text-start font-regular text-xs hover:bg-slate-50 px-2 py-1 rounded flex items-center gap-1.5"
							>
								<div className=" w-5 flex justify-center items-center">
									<FontAwesomeIcon className="" size="lg" icon={faList} />
								</div>
								Categorize Selected
							</button>
							<button
								onClick={() => onUpdateIgnored(true)}
								className=" w-full text-start font-regular text-xs hover:bg-slate-50 px-2 py-1 rounded flex items-center gap-1.5"
							>
								<img src="./ignore.svg" className=" transaction-menu-item w-5" />
								Ignore Selected
							</button>
							<button
								onClick={() => onUpdateIgnored(false)}
								className=" w-full text-start font-regular text-xs hover:bg-slate-50 px-2 py-1 rounded flex items-center gap-1.5"
							>
								<img src="./unignore.svg" className=" transaction-menu-item w-5" />
								Un-ignore Selected
							</button>
							<button
								onClick={onDelete}
								className=" w-full text-start font-regular text-xs text-red-400 hover:bg-slate-50 px-2 py-1 rounded flex items-center gap-1.5"
							>
								<img src="./trash.svg" className=" transaction-menu-item w-5" />
								Delete Selected
							</button>
						</div>
						<div className=" w-1/2">
							{slideMenu && (
								<div className=" flex flex-col gap-1 px-2 py-1.5">
									<button
										onClick={() => setSlideMenu(false)}
										className="bulk-actions-button w-4 hover:bg-slate-50 rounded"
									>
										<img src="./back.svg" className=" w-full" />
									</button>
									{getActiveCategories(categories).map((category) => (
										<button
											key={category.name}
											className=" w-full text-xs px-1 py-0.5 rounded font-medium"
											style={getCategoryChipStyle({
												color: category.color,
												colorDark: category.colorDark,
												theme,
											})}
											onClick={() => {
												onClickCategory(category.name);
											}}
										>
											{category.name}
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

BulkActions.propTypes = {
	localTransactions: PropTypes.array,
	setLocalTransactions: PropTypes.func,
};

export default BulkActions;
