import { useDataStore } from "../util/dataStore";
import { upsertMerchantSetting, getMerchantSettings, deleteMerchantSetting } from "../util/supabaseQueries";
import ButtonSpinner from "./ButtonSpinner";
import PropTypes from "prop-types";
import { getSelectableCategories } from "../util/categorySelections";
import { getCategoryChipStyle } from "../util/themeStyles";

const MerchantSettingsItem = ({ item, loading, setLoading }) => {
	const {
		categories,
		merchantSettings,
		setMerchantSettings,
		editingMerchantSetting,
		setEditingMerchantSetting,
		setNotification,
		theme,
	} = useDataStore((state) => ({
		categories: state.categories,
		merchantSettings: state.merchantSettings,
		setMerchantSettings: state.setMerchantSettings,
		editingMerchantSetting: state.editingMerchantSetting,
		setEditingMerchantSetting: state.setEditingMerchantSetting,
		setNotification: state.setNotification,
		theme: state.theme,
	}));

	const onClickEdit = () => {
		if (Object.values(loading).some((value) => value)) return;
		setEditingMerchantSetting(editingMerchantSetting?.id === item.id ? null : item);
	};

	const onClickSave = async () => {
		if (Object.values(loading).some((value) => value)) return;

		setLoading({ ...loading, save: true });

		// Check if this is a duplicate
		if (
			merchantSettings.some(
				(setting) =>
					editingMerchantSetting.text === setting.text &&
					editingMerchantSetting.type === setting.type &&
					setting.id !== editingMerchantSetting.id
			)
		) {
			setNotification({ type: "error", message: "This merchant already exists." });
			setLoading({ ...loading, save: false });
			return;
		}

		const updatedMerchantSetting = {
			...editingMerchantSetting,
			categoryName: editingMerchantSetting.category.name,
		};
		delete updatedMerchantSetting.category;

		const success = await upsertMerchantSetting(updatedMerchantSetting);

		if (!success) {
			setLoading({ ...loading, save: false });
			setNotification({ type: "error", message: "Could not save merchant setting." });
			return;
		}

		await refreshMerchantSettings();
		setLoading({ ...loading, save: false });
	};

	const onClickDelete = async () => {
		if (Object.values(loading).some((value) => value)) return;
		setLoading({ ...loading, delete: true });

		const success = await deleteMerchantSetting(item.id);

		if (!success) {
			setLoading({ ...loading, delete: false });
			setNotification({ type: "error", message: "Could not delete merchant setting." });
			return;
		}

		await refreshMerchantSettings();
		setLoading({ ...loading, delete: false });
	};

	const refreshMerchantSettings = async () => {
		const newMerchantSettings = await getMerchantSettings();
		setMerchantSettings(newMerchantSettings);
		setEditingMerchantSetting(null);
	};

	return (
		<div className="w-full border border-slate-300 p-3 rounded-lg flex flex-col gap-2 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
			<div className="flex gap-3">
				<div className="grow flex flex-col gap-2">
					<div className="w-full">
						{editingMerchantSetting?.id === item.id ? (
							<div className="flex items-center gap-1">
								<span>When merchant</span>
								<select
									value={editingMerchantSetting.type}
									onChange={(e) =>
										setEditingMerchantSetting({ ...editingMerchantSetting, type: e.target.value })
									}
									className="border border-slate-300 text-sm rounded outline-none p-1 bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
								>
									<option value="contains">contains</option>
									<option value="equals">equals</option>
								</select>
								<input
									maxLength="60"
									className="grow border border-slate-300 px-1 py-0.5 text-sm rounded outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
									value={editingMerchantSetting.text}
									onChange={(e) =>
										setEditingMerchantSetting({ ...editingMerchantSetting, text: e.target.value })
									}
								></input>
								<span>,</span>
							</div>
						) : (
							<div className="flex items-center gap-1">
								When merchant <span className="underline">{item.type}</span>{" "}
								<span className="font-semibold">{item.text},</span>
							</div>
						)}
					</div>
					<div className="w-full flex items-center gap-1.5">
						<span>categorize the transaction as</span>
						{editingMerchantSetting?.id === item.id ? (
							<select
								value={editingMerchantSetting.category.name}
								onChange={(e) =>
									setEditingMerchantSetting({
										...editingMerchantSetting,
										category: { ...editingMerchantSetting.category, name: e.target.value },
									})
								}
								className="border border-slate-300 text-sm rounded outline-none p-1 bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
							>
								{getSelectableCategories(categories, editingMerchantSetting.category.name).map((category) => (
									<option key={category.name} value={category.name}>
										{category.name}
									</option>
								))}
							</select>
						) : (
							<div
								className="category-button text-sm px-1 py-0.5 rounded font-medium"
								style={getCategoryChipStyle({
									color: item.category.color,
									colorDark: item.category.colorDark,
									theme,
								})}
							>
								{item.category.name}
							</div>
						)}
					</div>
				</div>
				<div className="flex justify-start items-start">
					<button
						onClick={onClickEdit}
						className="border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-normal px-2 py-1 border-slate-300 border rounded dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-950"
					>
						Edit
					</button>
				</div>
			</div>
			{editingMerchantSetting?.id === item.id && (
				<div className="flex justify-between">
					<button
						className="relative py-1 px-2 bg-rose-100 border border-slate-300 rounded text-sm text-slate-700 p-1 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-100 dark:hover:bg-rose-500/25"
						onClick={onClickDelete}
					>
						<span className={`${loading.delete ? "opacity-0" : ""}`}>Delete</span>
						{loading.delete && <ButtonSpinner />}
					</button>
					<div className="flex items-center gap-2">
						<button
							className="relative py-1 px-2 bg-cGreen-light border border-slate-300 rounded text-sm text-slate-700 p-1 dark:border-cGreen/40 dark:bg-cGreen dark:text-slate-950 dark:hover:bg-cGreen-light"
							onClick={onClickSave}
						>
							<span className={`${loading.save ? "opacity-0" : ""}`}>Save</span>
							{loading.save && <ButtonSpinner />}
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

MerchantSettingsItem.propTypes = {
	item: PropTypes.object,
	loading: PropTypes.object,
	setLoading: PropTypes.func,
};

export default MerchantSettingsItem;
