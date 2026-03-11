import { useDataStore } from "../util/dataStore";
import { upsertMerchantSetting, getMerchantSettings } from "../util/supabaseQueries";
import ButtonSpinner from "./ButtonSpinner";
import PropTypes from "prop-types";
import { getActiveCategories } from "../util/categorySelections";

const MerchantSettingsItemCreate = ({ loading, setLoading }) => {
	const {
		categories,
		merchantSettings,
		editingMerchantSetting,
		setMerchantSettings,
		setEditingMerchantSetting,
		setNotification,
		session,
	} = useDataStore((state) => ({
		categories: state.categories,
		merchantSettings: state.merchantSettings,
		editingMerchantSetting: state.editingMerchantSetting,
		setMerchantSettings: state.setMerchantSettings,
		setEditingMerchantSetting: state.setEditingMerchantSetting,
		setNotification: state.setNotification,
		session: state.session,
	}));

	const onClickSave = async () => {
		if (Object.values(loading).some((value) => value)) return;

		setLoading({ ...loading, create: true });

		// Check if this is a duplicate
		if (
			merchantSettings.some(
				(setting) =>
					editingMerchantSetting.text === setting.text && editingMerchantSetting.type === setting.type
			)
		) {
			setNotification({ type: "error", message: "This merchant already exists." });
			setLoading({ ...loading, save: false });
			return;
		}

		const newMerchantSetting = {
			...editingMerchantSetting,
			categoryName: editingMerchantSetting.category.name,
			userId: session.user.id,
		};
		delete newMerchantSetting.category;
		delete newMerchantSetting.id;

		const success = await upsertMerchantSetting(newMerchantSetting);

		if (!success) {
			setLoading({ ...loading, create: false });
			setNotification({ type: "error", message: "Could not create merchant setting." });
			return;
		}

		const newMerchantSettings = await getMerchantSettings();
		setMerchantSettings(newMerchantSettings);
		setEditingMerchantSetting(null);
		setLoading({ ...loading, create: false });
	};

	return (
		<>
			{editingMerchantSetting !== null && (
				<div className="w-full border border-cGreen p-3 rounded-lg flex flex-col gap-2 dark:border-cGreen/40 dark:bg-slate-900/70 dark:text-slate-200">
					<div className="flex flex-col gap-2">
						<div className="grow flex flex-col gap-2">
							<div className="w-full">
								<div className="flex items-center gap-1">
									<span>When merchant</span>
									<select
										value={editingMerchantSetting.type}
										onChange={(e) =>
											setEditingMerchantSetting({
												...editingMerchantSetting,
												type: e.target.value,
											})
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
											setEditingMerchantSetting({
												...editingMerchantSetting,
												text: e.target.value,
											})
										}
									></input>
									<span>,</span>
								</div>
							</div>
							<div className="w-full flex items-center gap-1.5">
								<span>categorize the transaction as</span>
								<select
									value={editingMerchantSetting.category.name}
									onChange={(e) =>
										setEditingMerchantSetting({
											...editingMerchantSetting,
											category: {
												...editingMerchantSetting.category,
												name: e.target.value,
											},
										})
									}
									className="border border-slate-300 text-sm rounded outline-none p-1 bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
								>
									{getActiveCategories(categories).map((category) => (
										<option key={category.name} value={category.name}>
											{category.name}
										</option>
									))}
								</select>
							</div>
						</div>
						<div className="flex justify-end">
							<div className="flex items-center gap-2">
								<button
									className="relative py-1 px-2 bg-cGreen-light border border-slate-300 rounded text-sm text-slate-700 p-1 dark:border-cGreen/40 dark:bg-cGreen dark:text-slate-950 dark:hover:bg-cGreen-light"
									onClick={onClickSave}
								>
									<span className={`${loading.create ? "opacity-0" : ""}`}>Save</span>
									{loading.create && <ButtonSpinner />}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

MerchantSettingsItemCreate.propTypes = {
	item: PropTypes.object,
	loading: PropTypes.object,
	setLoading: PropTypes.func,
};

export default MerchantSettingsItemCreate;
