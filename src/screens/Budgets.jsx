import { useState, useEffect } from "react";
import { useDataStore } from "../util/dataStore";
import { updateBudget } from "../util/supabaseQueries";
import { monthsByNumber } from "../constants/Dates";
import { nonEditableCategories, ignoredCategories } from "../constants/Categories";
import Navbar from "../components/Navbar";
import NotificationBanner from "../components/NotificationBanner";
import ButtonSpinner from "../components/ButtonSpinner";

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
		session,
		setNotification,
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
	}));
	const [localBudgets, setLocalBudgets] = useState(budgets);
	const [preEditBudgets, setPreEditBudgets] = useState(null);
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);

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
			if (!(await updateBudget(localBudgets)))
				setNotification({ type: "error", message: "Could not update budgets." });
			await fetchBudgets();
			setEditing(false);
			setSaving(false);
		}
	};

	return (
		<div className="w-screen h-screen flex overflow-hidden relative">
			<Navbar activePage={"Budgets"} />
			<div className="grow flex flex-col gap-3 h-full overflow-y-auto no-scrollbar bg-slate-100 p-4 md:p-8 lg:p-8 xl:p-16 2xl:p-32">
				<div className="w-full grow flex flex-col bg-white border border-slate-300 rounded-2xl py-4">
					<div className="flex justify-between px-5 mb-3">
						<div className="flex items-center">
							<span className="text-lg text-slate-600 font-semibold mr-2">Budgets</span>
							<select
								value={budgetsMonth}
								onChange={(e) => setBudgetsMonth(e.target.value)}
								className="add-filter-option text-sm border border-slate-200 rounded p-1 bg-white outline-none mr-1"
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
								className="add-filter-option text-sm border border-slate-200 rounded p-1 bg-white outline-none"
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
								onClick={onClickEdit}
								className="border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-normal px-2 py-1 border-slate-300 border rounded"
							>
								Edit
							</button>
							<button
								onClick={onClickSave}
								className={`${
									!editing ? "opacity-50 cursor-default" : ""
								} relative font-normal text-slate-600 bg-cGreen-light hover:bg-cGreen-lightHover border border-slate-300 rounded text-sm py-1 px-2`}
							>
								<span className={`${saving ? "opacity-0" : ""}`}>Save</span>
								{saving && <ButtonSpinner />}
							</button>
						</div>
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
									className="border border-slate-200 rounded-lg p-4 w-full flex flex-col gap-2"
								>
									<div className="flex justify-between">
										<div
											className="text-slate-600 py-1 px-2 rounded"
											style={{
												backgroundColor: budget.color,
												borderWidth: "1px",
												borderColor: budget.colorDark,
											}}
										>
											{budget.name}
										</div>
										<div className="flex gap-2 items-center">
											<span>
												<span className="text-slate-600 font-semibold">
													{budget.spending.toFixed(2)}
												</span>
												{ignoredCategories.includes(budget.name) && " total"}
												{!ignoredCategories.includes(budget.name) && (
													<>
														{" spent out of "}
														{(!editing || nonEditableCategories.includes(budget.name)) && (
															<span className="text-slate-600 font-semibold">
																<>{budget.limit ? budget.limit.toFixed(2) : "--"}</>
															</span>
														)}
													</>
												)}
											</span>
											{editing && !nonEditableCategories.includes(budget.name) && (
												<input
													className="border border-slate-200 w-28 text-right outline-none"
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
									<div
										className="h-3 w-full rounded overflow-hidden"
										style={{
											backgroundColor: budget.colorLight,
											borderWidth: "1px",
											borderColor: budget.colorDark,
										}}
									>
										<div
											className="h-full"
											style={{
												backgroundColor: budget.colorDark,
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
