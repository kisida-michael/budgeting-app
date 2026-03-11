import { useEffect, useMemo, useState } from "react";
import { useDataStore } from "../util/dataStore";
import {
	createCategory,
	getCategories,
	reorderCategories,
	updateCategory,
} from "../util/supabaseQueries";
import ButtonSpinner from "./ButtonSpinner";
import { getActiveCategories } from "../util/categorySelections";
import { getCategoryChipStyle } from "../util/themeStyles";

const protectedCategoryNames = new Set(["Income", "Credits/Payments", "Uncategorized"]);

const CategorySettings = () => {
	const {
		categories,
		fetchCategories,
		fetchTransactions,
		fetchBudgets,
		fetchDashboardStats,
		fetchMerchantSettings,
		fetchSpending,
		setCategories,
		setNotification,
		theme,
	} = useDataStore((state) => ({
		categories: state.categories,
		fetchCategories: state.fetchCategories,
		fetchTransactions: state.fetchTransactions,
		fetchBudgets: state.fetchBudgets,
		fetchDashboardStats: state.fetchDashboardStats,
		fetchMerchantSettings: state.fetchMerchantSettings,
		fetchSpending: state.fetchSpending,
		setCategories: state.setCategories,
		setNotification: state.setNotification,
		theme: state.theme,
	}));
	const [loading, setLoading] = useState({
		create: false,
		save: null,
		archive: null,
		restore: null,
		reorder: null,
	});
	const [newCategoryName, setNewCategoryName] = useState("");
	const [editingCategoryName, setEditingCategoryName] = useState(null);
	const [editingNameValue, setEditingNameValue] = useState("");

	useEffect(() => {
		if (categories === null) {
			fetchCategories();
		}
	}, [categories, fetchCategories]);

	const activeCategories = useMemo(() => getActiveCategories(categories ?? []), [categories]);
	const archivedCategories = useMemo(
		() => (categories ?? []).filter((category) => category.archivedAt),
		[categories]
	);

	const refreshCategoryDependents = async () => {
		const nextCategories = await getCategories();
		setCategories(nextCategories);
		await fetchMerchantSettings();
		await fetchTransactions();
		await fetchDashboardStats();
		await fetchBudgets();
		await fetchSpending();
	};

	const onCreateCategory = async () => {
		if (loading.create || newCategoryName.trim().length === 0) return;

		setLoading((current) => ({ ...current, create: true }));
		const result = await createCategory(newCategoryName);
		if (!result.success) {
			setNotification({ type: "error", message: result.error });
			setLoading((current) => ({ ...current, create: false }));
			return;
		}

		setNewCategoryName("");
		await refreshCategoryDependents();
		setNotification({ type: "success", message: "Category created." });
		setLoading((current) => ({ ...current, create: false }));
	};

	const onSaveRename = async (currentName) => {
		if (!editingNameValue.trim()) return;

		setLoading((current) => ({ ...current, save: currentName }));
		const result = await updateCategory(currentName, { nextName: editingNameValue });
		if (!result.success) {
			setNotification({ type: "error", message: result.error });
			setLoading((current) => ({ ...current, save: null }));
			return;
		}

		setEditingCategoryName(null);
		setEditingNameValue("");
		await refreshCategoryDependents();
		setNotification({ type: "success", message: "Category renamed." });
		setLoading((current) => ({ ...current, save: null }));
	};

	const onSetArchived = async (categoryName, archived) => {
		setLoading((current) => ({ ...current, [archived ? "archive" : "restore"]: categoryName }));
		const result = await updateCategory(categoryName, { archived });
		if (!result.success) {
			setNotification({ type: "error", message: result.error });
			setLoading((current) => ({ ...current, archive: null, restore: null }));
			return;
		}

		await refreshCategoryDependents();
		setNotification({
			type: "success",
			message: archived ? "Category archived." : "Category restored.",
		});
		setLoading((current) => ({ ...current, archive: null, restore: null }));
	};

	const onMoveCategory = async (categoryName, direction) => {
		const index = activeCategories.findIndex((category) => category.name === categoryName);
		const targetIndex = direction === "up" ? index - 1 : index + 1;
		if (index < 0 || targetIndex < 0 || targetIndex >= activeCategories.length) return;

		const reordered = [...activeCategories];
		[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

		setLoading((current) => ({ ...current, reorder: categoryName }));
		const result = await reorderCategories(reordered.map((category) => category.name));
		if (!result.success) {
			setNotification({ type: "error", message: result.error });
			setLoading((current) => ({ ...current, reorder: null }));
			return;
		}

		await refreshCategoryDependents();
		setLoading((current) => ({ ...current, reorder: null }));
	};

	return (
		<div className="grow flex flex-col">
			<div className="grow overflow-y-auto p-6">
				<div className="text-lg text-slate-600 font-semibold mb-1 dark:text-slate-100">Categories</div>
				<div className="text-slate-500 mb-4 dark:text-slate-400">
					Create, rename, reorder, and archive categories. Archived categories stay on historical data but
					are removed from new selections.
				</div>

				<div className="border border-slate-300 rounded-xl p-4 mb-4 flex flex-col gap-3 dark:border-slate-800 dark:bg-slate-900/60">
					<div className="text-sm font-semibold text-slate-600 dark:text-slate-100">Create Category</div>
					<div className="flex gap-2">
						<input
							value={newCategoryName}
							onChange={(e) => setNewCategoryName(e.target.value)}
							placeholder="New category name"
							maxLength={80}
							className="grow border border-slate-300 rounded px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
						/>
						<button
							onClick={onCreateCategory}
							disabled={loading.create || newCategoryName.trim().length === 0}
							className={`relative rounded text-sm px-3 py-2 border ${
								loading.create || newCategoryName.trim().length === 0
									? "cursor-default border-slate-300 bg-cGreen-light text-slate-400 opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
									: "border-slate-300 bg-cGreen-light text-slate-700 dark:border-cGreen/40 dark:bg-cGreen dark:text-slate-950 dark:hover:bg-cGreen-light"
							}`}
						>
							<span className={loading.create ? "opacity-0" : ""}>Create</span>
							{loading.create && <ButtonSpinner />}
						</button>
					</div>
				</div>

				<div className="flex flex-col gap-3 mb-6">
					<div className="text-sm font-semibold text-slate-600 dark:text-slate-100">Active Categories</div>
					{activeCategories.map((category, index) => {
						const isProtected = protectedCategoryNames.has(category.name);
						const isEditing = editingCategoryName === category.name;

						return (
							<div
								key={category.name}
								className="border border-slate-300 rounded-xl p-4 flex flex-col gap-3 dark:border-slate-800 dark:bg-slate-900/60"
							>
								<div className="flex justify-between items-start gap-3">
									<div className="min-w-0">
										{isEditing ? (
											<input
												value={editingNameValue}
												onChange={(e) => setEditingNameValue(e.target.value)}
												maxLength={80}
												className="w-full border border-slate-300 rounded px-2 py-1 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
											/>
										) : (
											<div
												className="inline-block text-sm px-2 py-1 rounded font-medium"
												style={getCategoryChipStyle({
													color: category.color,
													colorDark: category.colorDark,
													theme,
												})}
											>
												{category.name}
											</div>
										)}
										<div className="text-xs text-slate-400 mt-1 dark:text-slate-500">
											Order {index + 1}
											{isProtected ? " • protected" : ""}
										</div>
									</div>
									<div className="flex gap-2 flex-wrap justify-end">
										<button
											onClick={() => onMoveCategory(category.name, "up")}
											disabled={index === 0 || loading.reorder !== null || isProtected}
											className={`border border-slate-300 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-950 ${
												index === 0 || loading.reorder !== null || isProtected
													? "opacity-50 cursor-default dark:bg-slate-950 dark:text-slate-500"
													: ""
											}`}
										>
											Up
										</button>
										<button
											onClick={() => onMoveCategory(category.name, "down")}
											disabled={
												index === activeCategories.length - 1 ||
												loading.reorder !== null ||
												isProtected
											}
											className={`border border-slate-300 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-950 ${
												index === activeCategories.length - 1 ||
												loading.reorder !== null ||
												isProtected
													? "opacity-50 cursor-default dark:bg-slate-950 dark:text-slate-500"
													: ""
											}`}
										>
											Down
										</button>
										{isEditing ? (
											<>
												<button
													onClick={() => onSaveRename(category.name)}
													className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-950"
												>
													{loading.save === category.name ? "Saving..." : "Save"}
												</button>
												<button
													onClick={() => {
														setEditingCategoryName(null);
														setEditingNameValue("");
													}}
													className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-950"
												>
													Cancel
												</button>
											</>
										) : (
											<button
												onClick={() => {
													setEditingCategoryName(category.name);
													setEditingNameValue(category.name);
												}}
												disabled={isProtected}
												className={`border border-slate-300 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-950 ${
													isProtected ? "opacity-50 cursor-default dark:bg-slate-950 dark:text-slate-500" : ""
												}`}
											>
												Rename
											</button>
										)}
										<button
											onClick={() => onSetArchived(category.name, true)}
											disabled={isProtected || loading.archive !== null}
											className={`border border-slate-300 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-950 ${
												isProtected || loading.archive !== null
													? "opacity-50 cursor-default dark:bg-slate-950 dark:text-slate-500"
													: ""
											}`}
										>
											{loading.archive === category.name ? "Archiving..." : "Archive"}
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>

				<div className="flex flex-col gap-3">
					<div className="text-sm font-semibold text-slate-600 dark:text-slate-100">Archived Categories</div>
					{archivedCategories.length === 0 && (
						<div className="border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
							No archived categories.
						</div>
					)}
					{archivedCategories.map((category) => (
						<div
							key={category.name}
							className="border border-slate-300 rounded-xl p-4 flex justify-between gap-3 dark:border-slate-800 dark:bg-slate-900/60"
						>
							<div>
								<div
									className="inline-block text-sm px-2 py-1 rounded font-medium"
									style={getCategoryChipStyle({
										color: category.color,
										colorDark: category.colorDark,
										theme,
									})}
								>
									{category.name}
								</div>
								<div className="text-xs text-slate-400 mt-1 dark:text-slate-500">
									Archived categories stay on existing data.
								</div>
							</div>
							<button
								onClick={() => onSetArchived(category.name, false)}
								className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-950"
							>
								{loading.restore === category.name ? "Restoring..." : "Restore"}
							</button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default CategorySettings;
