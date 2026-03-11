import { useState } from "react";
import { useAnimationStore } from "../util/animationStore";
import { useDataStore } from "../util/dataStore";
import { deleteTransactions, setTransactionCategories, setTransactionsIgnored } from "../util/supabaseQueries";
import { getDashboardStats } from "../util/statsUtil";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faList } from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";
import { getActiveCategories } from "../util/categorySelections";

const BulkActions = ({ localTransactions, setLocalTransactions }) => {
	const { bulkActionsMenuVisible, bulkActionsMenuAnimating, openBulkActionsMenu, closeBulkActionsMenu } =
		useAnimationStore((state) => ({
			bulkActionsMenuVisible: state.bulkActionsMenuVisible,
			bulkActionsMenuAnimating: state.bulkActionsMenuAnimating,
			openBulkActionsMenu: state.openBulkActionsMenu,
			closeBulkActionsMenu: state.closeBulkActionsMenu,
		}));
	const { filters, setDashboardStats, categories, setNotification } = useDataStore((state) => ({
		setTransactions: state.setTransactions,
		filters: state.filters,
		setDashboardStats: state.setDashboardStats,
		categories: state.categories,
		setNotification: state.setNotification,
	}));
	const [slideMenu, setSlideMenu] = useState(false);

	const onClickCategory = async (categoryName) => {
		closeBulkActionsMenu();
		const success = await setTransactionCategories(
			localTransactions.filter((t) => t.selected),
			categoryName
		);

		// If the update was successful, simply update the current set of local transactions with the new categories
		if (success) await onSuccess(localTransactions.map((t) => (t.selected ? { ...t, categoryName } : t)));
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
		setLocalTransactions(newTransactions);
		setDashboardStats(await getDashboardStats(newTransactions, filters));
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
											className=" w-full text-xs text-slate-600 px-1 py-0.5 rounded"
											style={{
												backgroundColor: category.color,
												borderWidth: "1px",
												borderColor: category.colorDark,
											}}
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
