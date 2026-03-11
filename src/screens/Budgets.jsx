import { useState, useEffect } from "react";
import { useDataStore } from "../util/dataStore";
import { copyPreviousBudget, saveDefaultBudget, updateBudget } from "../util/supabaseQueries";
import { monthsByNumber } from "../constants/Dates";
import { nonEditableCategories, ignoredCategories } from "../constants/Categories";
import Navbar from "../components/Navbar";
import NotificationBanner from "../components/NotificationBanner";
import ButtonSpinner from "../components/ButtonSpinner";
import { getBudgetFillColor, getBudgetRailStyle, getCategoryChipStyle } from "../util/themeStyles";

const formatCurrency = (value) => {
	if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
	return Number(value).toFixed(2);
};

const Budgets = () => {
	const {
		categories,
		fetchCategories,
		budgets,
		budgetsLoading,
		budgetsMonth,
		setBudgetsMonth,
		budgetsYear,
		setBudgetsYear,
		fetchBudgets,
		setNotification,
		theme,
	} = useDataStore((state) => ({
		categories: state.categories,
		fetchCategories: state.fetchCategories,
		budgets: state.budgets,
		budgetsLoading: state.budgetsLoading,
		fetchBudgets: state.fetchBudgets,
		budgetsMonth: state.budgetsMonth,
		setBudgetsMonth: state.setBudgetsMonth,
		budgetsYear: state.budgetsYear,
		setBudgetsYear: state.setBudgetsYear,
		setNotification: state.setNotification,
		theme: state.theme,
	}));
	const [localBudgets, setLocalBudgets] = useState(budgets);
	const [preEditBudgets, setPreEditBudgets] = useState(null);
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [copyingPrevious, setCopyingPrevious] = useState(false);
	const [savingDefault, setSavingDefault] = useState(false);

	useEffect(() => {
		if (categories === null) fetchCategories();
		if (budgets === null) fetchBudgets();
	}, [budgets, categories, fetchBudgets, fetchCategories]);

	useEffect(() => {
		setLocalBudgets(budgets);
	}, [budgets]);

	useEffect(() => {
		fetchBudgets();
	}, [budgetsMonth, budgetsYear, fetchBudgets]);

	const onClickEdit = () => {
		if (saving) return;
		if (editing) {
			setLocalBudgets([...preEditBudgets]);
			setEditing(false);
		} else {
			setPreEditBudgets([...localBudgets]);
			setEditing(true);
		}
	};

	const onClickSave = async () => {
		if (editing && !saving) {
			setSaving(true);
			const budgetPayload = Object.assign([...localBudgets], {
				budgetContext: {
					month: Number(budgetsMonth),
					year: Number(budgetsYear),
				},
			});
			if (!(await updateBudget(budgetPayload)))
				setNotification({ type: "error", message: "Could not update budgets." });
			await fetchBudgets();
			setEditing(false);
			setSaving(false);
		}
	};

	const onCopyPreviousMonth = async () => {
		if (copyingPrevious || editing || savingDefault) return;

		setCopyingPrevious(true);
		try {
			const result = await copyPreviousBudget(Number(budgetsMonth), Number(budgetsYear));
			await fetchBudgets();
			setNotification({
				type: "success",
				message:
					result.copiedCount > 0
						? `Copied ${result.copiedCount} budget limits from ${monthsByNumber[result.previousMonth]} ${result.previousYear}.`
						: `No previous budget limits found for ${monthsByNumber[result.previousMonth]} ${result.previousYear}.`,
			});
		} catch {
			setNotification({ type: "error", message: "Could not copy previous month budgets." });
		} finally {
			setCopyingPrevious(false);
		}
	};

	const onSaveDefaultBudget = async () => {
		if (savingDefault || saving || copyingPrevious || !localBudgets) return;

		setSavingDefault(true);
		const sourceBudgets = localBudgets.map((budget) => ({ ...budget }));
		const success = await saveDefaultBudget(sourceBudgets);
		if (success) {
			setNotification({
				type: "success",
				message: "Saved the current budget as your default template.",
			});
		} else {
			setNotification({ type: "error", message: "Could not save the default budget." });
		}
		setSavingDefault(false);
	};

	const totalBudget = localBudgets?.find((budget) => budget.name === "Total") ?? null;
	const budgetContext = totalBudget?.budgetContext;
	const totalRemaining = totalBudget?.remaining ?? null;
	const totalForecast = totalBudget?.forecast ?? null;
	const totalSafeToSpend = totalBudget?.safeToSpend ?? null;

	return (
		<div className="w-screen h-screen flex overflow-hidden relative">
			<Navbar activePage={"Budgets"} />
			<div className="grow flex flex-col gap-3 h-full overflow-y-auto no-scrollbar bg-slate-100 p-4 md:p-8 lg:p-8 xl:p-16 2xl:p-32">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
					<div className="bg-white border border-slate-300 rounded-2xl p-5 dark:border-slate-700 dark:bg-slate-900/80">
						<div className="text-sm text-slate-500 font-medium">Remaining</div>
						<div
							className={`text-3xl font-bold ${
								totalRemaining !== null && totalRemaining < 0
									? "text-red-500 dark:text-red-400"
									: "text-cGreen-dark dark:text-cGreen-light"
							}`}
						>
							{formatCurrency(totalRemaining)}
						</div>
						<div className="text-sm text-slate-500 mt-1">
							{totalRemaining !== null && totalRemaining < 0
								? "You are over the current total budget."
								: "Budget left across tracked categories."}
						</div>
					</div>
					<div className="bg-white border border-slate-300 rounded-2xl p-5 dark:border-slate-700 dark:bg-slate-900/80">
						<div className="text-sm text-slate-500 font-medium">Safe to Spend</div>
						<div className="text-3xl font-bold text-slate-700 dark:text-slate-100">
							{formatCurrency(totalSafeToSpend)}
						</div>
						<div className="text-sm text-slate-500 mt-1">
							{budgetContext?.daysRemaining > 0
								? `Per day for the next ${budgetContext.daysRemaining} day${budgetContext.daysRemaining === 1 ? "" : "s"}.`
								: "No daily run-rate left for this month."}
						</div>
					</div>
					<div className="bg-white border border-slate-300 rounded-2xl p-5 dark:border-slate-700 dark:bg-slate-900/80">
						<div className="text-sm text-slate-500 font-medium">Forecast</div>
						<div className="text-3xl font-bold text-slate-700 dark:text-slate-100">
							{formatCurrency(totalForecast)}
						</div>
						<div className="text-sm text-slate-500 mt-1">
							Projected month-end spend at the current pace.
						</div>
					</div>
				</div>
				<div className="w-full grow flex flex-col bg-white border border-slate-300 rounded-2xl py-4 dark:border-slate-700 dark:bg-slate-950/70">
					<div className="flex justify-between px-5 mb-3">
						<div className="flex items-center">
							<span className="text-lg text-slate-600 font-semibold mr-2 dark:text-slate-100">
								Budgets
							</span>
							<select
								value={budgetsMonth}
								onChange={(e) => setBudgetsMonth(e.target.value)}
								className="add-filter-option text-sm border border-slate-200 rounded p-1 bg-white outline-none mr-1 dark:border-slate-700 dark:bg-slate-900"
							>
								{Array.from({ length: 12 }, (_, index) => (
									<option key={index + 1} value={index + 1}>
										{monthsByNumber[index + 1]}
									</option>
								))}
							</select>
							<select
								value={budgetsYear}
								onChange={(e) => setBudgetsYear(e.target.value)}
								className="add-filter-option text-sm border border-slate-200 rounded p-1 bg-white outline-none dark:border-slate-700 dark:bg-slate-900"
							>
								{Array.from({ length: new Date().getFullYear() - 2010 + 1 }, (_, index) => (
									<option
										key={new Date().getFullYear() - index}
										value={new Date().getFullYear() - index}
									>
										{new Date().getFullYear() - index}
									</option>
								))}
							</select>{" "}
						</div>
						<div className="flex gap-1.5">
							<button
								onClick={onCopyPreviousMonth}
								className={`border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-normal px-2 py-1 border-slate-300 border rounded dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900 ${
									editing ? "cursor-default opacity-55 dark:bg-slate-900/70 dark:text-slate-500" : ""
								}`}
							>
								{copyingPrevious ? "Copying..." : "Copy Previous"}
							</button>
							<button
								onClick={onSaveDefaultBudget}
								className={`border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-normal px-2 py-1 border-slate-300 border rounded dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900 ${
									saving || copyingPrevious
										? "cursor-default opacity-55 dark:bg-slate-900/70 dark:text-slate-500"
										: ""
								}`}
							>
								{savingDefault ? "Saving..." : "Save as Default"}
							</button>
							<button
								onClick={onClickEdit}
								className="border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-normal px-2 py-1 border-slate-300 border rounded dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
							>
								Edit
							</button>
							<button
								onClick={onClickSave}
								className={`${
									!editing
										? "cursor-default opacity-60 dark:bg-slate-900 dark:text-slate-500"
										: "dark:bg-cGreen dark:text-slate-950 dark:hover:bg-cGreen-light"
								} relative font-normal text-slate-600 bg-cGreen-light hover:bg-cGreen-lightHover border border-slate-300 rounded text-sm py-1 px-2 dark:border-cGreen/40`}
							>
								<span className={`${saving ? "opacity-0" : ""}`}>Save</span>
								{saving && <ButtonSpinner />}
							</button>
						</div>
					</div>
					<div className="px-5 mb-3 text-sm text-slate-500 dark:text-slate-400">
						<span className="font-medium text-slate-600 dark:text-slate-200">Save as Default</span> updates
						the reusable budget template. <span className="font-medium text-slate-600 dark:text-slate-200">Copy Previous</span>{" "}
						prefers the last month's saved budget, then falls back to this default template.
					</div>

					{budgetsLoading && (
						<div className="flex grow relative justify-center text-sm text-slate-500 items-center opacity-80">
							<ButtonSpinner />
							<div className="mt-16">Loading budgets...</div>
						</div>
					)}

					{!budgetsLoading && (
						<div className="flex flex-col items-center px-5 gap-3">
							{localBudgets?.map((budget) => (
								<div
									key={budget.name}
									className="border border-slate-200 rounded-lg p-4 w-full flex flex-col gap-2 dark:border-slate-800 dark:bg-slate-900/60"
								>
									<div className="flex justify-between">
										<div
											className="py-1 px-2 rounded text-sm font-medium"
											style={getCategoryChipStyle({
												color: budget.color,
												colorDark: budget.colorDark,
												theme,
											})}
										>
											{budget.name}
										</div>
										<div className="flex gap-2 items-center">
											<span className="text-slate-500 dark:text-slate-400">
												<span className="text-slate-600 font-semibold dark:text-slate-100">
													{formatCurrency(budget.spending)}
												</span>
												{ignoredCategories.includes(budget.name) && " total"}
												{!ignoredCategories.includes(budget.name) && (
													<>
														{" spent out of "}
														{(!editing || nonEditableCategories.includes(budget.name)) && (
															<span className="text-slate-600 font-semibold dark:text-slate-100">
																<>{formatCurrency(budget.limit)}</>
															</span>
														)}
													</>
												)}
											</span>
											{editing && !nonEditableCategories.includes(budget.name) && (
												<input
													className="border border-slate-200 w-28 text-right outline-none dark:border-slate-700 dark:bg-slate-950"
													value={budget.limit || ""}
													placeholder="--"
													onChange={(e) => {
														if (isNaN(e.target.value) || e.target.value.includes("-"))
															return;

														let newBudgets = [...localBudgets];
														newBudgets = newBudgets.map((existingBudget) => {
															if (existingBudget.name === budget.name) {
																return { ...budget, limit: e.target.value };
															} else {
																return existingBudget;
															}
														});

														setLocalBudgets(newBudgets);
													}}
												/>
											)}
										</div>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-500 dark:text-slate-400">
										<div className="border border-slate-200 rounded px-3 py-2 dark:border-slate-800 dark:bg-slate-950/75">
											<span className="font-medium text-slate-600 dark:text-slate-200">Remaining:</span>{" "}
											<span
												className={
													budget.remaining !== null && budget.remaining < 0
														? "text-red-500 dark:text-red-400"
														: "dark:text-slate-100"
												}
											>
												{formatCurrency(budget.remaining)}
											</span>
										</div>
										<div className="border border-slate-200 rounded px-3 py-2 dark:border-slate-800 dark:bg-slate-950/75">
											<span className="font-medium text-slate-600 dark:text-slate-200">Forecast:</span>{" "}
											<span className="dark:text-slate-100">{formatCurrency(budget.forecast)}</span>
										</div>
										<div className="border border-slate-200 rounded px-3 py-2 dark:border-slate-800 dark:bg-slate-950/75">
											<span className="font-medium text-slate-600 dark:text-slate-200">Safe / day:</span>{" "}
											<span className="dark:text-slate-100">{formatCurrency(budget.safeToSpend)}</span>
										</div>
									</div>
									<div
										className="h-3 w-full rounded overflow-hidden border"
										style={getBudgetRailStyle({
											colorLight: budget.colorLight,
											colorDark: budget.colorDark,
											theme,
										})}
									>
										<div
											className="h-full"
											style={{
												backgroundColor: getBudgetFillColor({
													colorDark: budget.colorDark,
													percentage: budget.percentage,
													theme,
												}),
												width: budget?.percentage
													? budget.percentage > 100
														? "100%"
														: `${budget.percentage}%`
													: "0%",
											}}
										/>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
			<NotificationBanner />
		</div>
	);
};

export default Budgets;
