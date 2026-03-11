import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDataStore } from "../util/dataStore";
import { abbrevMonthsByNumber } from "../constants/Dates";
import { ignoredCategories } from "../constants/Categories";
import { Fragment } from "react";
import { getSpending } from "../util/supabaseQueries";
import Navbar from "../components/Navbar";
import NotificationBanner from "../components/NotificationBanner";
import ButtonSpinner from "../components/ButtonSpinner";
import SpendingTableCategoryColumn from "../components/SpendingTableCategoryColumn";
import { buildSpendingDrilldownFilters, createTransactionDrilldownState } from "../util/transactionDrilldown";

const Spending = () => {
	const {
		categories,
		fetchCategories,
		spending,
		setSpending,
		fetchSpending,
		spendingLoading,
		spendingYear,
		setSpendingYear,
	} = useDataStore((state) => ({
		categories: state.categories,
		fetchCategories: state.fetchCategories,
		spending: state.spending,
		setSpending: state.setSpending,
		fetchSpending: state.fetchSpending,
		spendingLoading: state.spendingLoading,
		spendingYear: state.spendingYear,
		setSpendingYear: state.setSpendingYear,
		session: state.session,
		setNotification: state.setNotification,
	}));
	const [localSpendingLoading, setLocalSpendingLoading] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		if (categories === null) fetchCategories();
		if (spending === null) fetchSpending();
	}, [categories, fetchCategories, spending, fetchSpending]);

	useEffect(() => {
		const updateSpending = async () => {
			setLocalSpendingLoading(true);
			const newSpending = await getSpending(spendingYear);
			await setSpending(newSpending);
			setLocalSpendingLoading(false);
		};

		updateSpending();
	}, [setSpending, spendingYear]);

	const openSpendingDrilldown = ({ category, month = null }) => {
		const year = Number(spendingYear);
		const filters = buildSpendingDrilldownFilters({ category, year, month });
		const periodLabel = month ? `${abbrevMonthsByNumber[month]} ${year}` : `Year ${year}`;
		navigate("/", {
			state: createTransactionDrilldownState(filters, `${category?.name ?? "Total"} spending for ${periodLabel}`),
		});
	};

	return (
		<div className="w-screen h-screen flex overflow-hidden relative">
			<Navbar activePage={"Spending"} />
			<div className="grow flex flex-col gap-3 h-full overflow-y-auto no-scrollbar bg-slate-100 dark:bg-neutral-900 p-4 md:p-8 lg:p-8 xl:p-16 2xl:p-32">
				<div className="w-full grow flex flex-col bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-500 rounded-2xl py-4">
					<div className="flex justify-between px-5 mb-3">
						<div className="flex items-center">
							<span className="text-lg text-slate-600 dark:text-white font-semibold mr-2">Spending</span>
							<select
								value={spendingYear}
								onChange={(e) => setSpendingYear(e.target.value)}
								className="add-filter-option text-sm border border-slate-200 rounded p-1 bg-white dark:bg-neutral-500 outline-none"
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
					</div>

					{(spendingLoading || localSpendingLoading) && (
						<div className="flex grow relative justify-center text-sm text-slate-500 items-center opacity-80">
							<ButtonSpinner />
							<div className="mt-16">Loading spending data...</div>
						</div>
					)}

					{!spendingLoading && !localSpendingLoading && (
						<div className="flex items-center grow">
							<div className="flex grow h-full px-5 overflow-x-auto pb-2">
								{/* FIRST COLUMN WITH CATEGORY NAMES */}
								<SpendingTableCategoryColumn
									categories={categories}
									isFirstColumn={true}
									onCategoryClick={(category) => openSpendingDrilldown({ category })}
									onTotalClick={() => openSpendingDrilldown({ category: { name: "Total" } })}
								/>

								{/* Table body with months and their spending (13 columns to accomodate for totals column) */}
								{Array.from({ length: 13 }, (_, index) => {
									return (
										<div key={index} className="flex flex-col grow shrink-0 min-w-32 font-semibold">
											<div
												className={`flex justify-start items-center grow px-2 min-h-11 ${
													index % 2 == 0
														? "bg-gray-100 dark:bg-neutral-700"
														: "bg-gray-50 dark:bg-neutral-600"
												}`}
											>
												<div className="inline-block py-1 px-2 rounded-md dark:text-neutral-200">
													{abbrevMonthsByNumber[index + 1]}
												</div>
											</div>

											{/* MAIN TABLE COLUMNS */}
											{categories
												.filter((category) => !ignoredCategories.includes(category.name))
												.map((category) => {
													const currentSpend = spending[index][category.name];
													return (
														<Fragment key={category.name}>
															<div className="h-[1px] bg-slate-300 dark:bg-neutral-600"></div>
															<div
																className={`flex justify-start items-center grow px-2 min-h-11 py-1 ${
																	index < categories.length - 1 && ""
																} ${
																	index % 2 == 0 && "bg-slate-50 dark:bg-neutral-700"
																}`}
																key={category.name}
															>
																{currentSpend ? (
																	<button
																		onClick={() =>
																			openSpendingDrilldown({
																				category,
																				month: index === 12 ? null : index + 1,
																			})
																		}
																		className="py-1 px-2 rounded-md text-nowrap dark:text-neutral-300 hover:text-cGreen-light"
																	>
																		{currentSpend.toFixed(2)}
																	</button>
																) : (
																	<div className="py-1 px-2 rounded-md text-nowrap dark:text-neutral-300">-</div>
																)}
															</div>
														</Fragment>
													);
												})}
											<div
												className={`flex justify-start items-center grow px-2 py-1 mb-5 min-h-11 ${
													index % 2 == 0
														? "bg-gray-100 dark:bg-neutral-700"
														: "bg-gray-50 dark:bg-neutral-600"
												}`}
											>
												<div className="inline-block py-1 px-2 rounded-md font-bold dark:text-neutral-300">
													{spending[index]["Total"].toFixed(2)}
												</div>
											</div>

											{/* IGNORED CATEGORIES THAT APPEAR BELOW THE MAIN TABLE */}
											{categories
												.filter((category) => ignoredCategories.includes(category.name))
												.map((category, rowIndex) => {
													const currentSpend = spending[index][category.name];
													return (
														<Fragment key={category.name}>
															{rowIndex !== 0 && (
																<div className="h-[1px] bg-slate-300 dark:bg-neutral-500"></div>
															)}
															<div
																className={`flex justify-start items-center grow px-2 min-h-11 py-0.5 ${
																	index < categories.length - 1 && ""
																} ${index % 2 == 0 && "bg-slate-50"}`}
																// style={{ backgroundColor: category.colorLight }}
																key={category.name}
															>
																{currentSpend ? (
																	<button
																		onClick={() =>
																			openSpendingDrilldown({
																				category,
																				month: index === 12 ? null : index + 1,
																			})
																		}
																		className="py-0.5 px-2 rounded-md text-nowrap dark:text-neutral-300 hover:text-cGreen-light"
																	>
																		{currentSpend.toFixed(2)}
																	</button>
																) : (
																	<div className="py-0.5 px-2 rounded-md text-nowrap">-</div>
																)}
															</div>
														</Fragment>
													);
												})}
										</div>
									);
								})}

								<SpendingTableCategoryColumn
									categories={categories}
									isFirstColumn={false}
									onCategoryClick={(category) => openSpendingDrilldown({ category })}
									onTotalClick={() => openSpendingDrilldown({ category: { name: "Total" } })}
								/>
							</div>
						</div>
					)}
				</div>
			</div>
			<NotificationBanner />
		</div>
	);
};

export default Spending;
