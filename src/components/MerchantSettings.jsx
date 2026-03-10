import { useEffect, useRef, useState } from "react";
import { useDataStore } from "../util/dataStore";
import MerchantSettingsItem from "./MerchantSettingsItem";
import MerchantSettingsItemCreate from "./MerchantSettingsItemCreate";
import { getTransactions, updateTransactions } from "../util/supabaseQueries";
import { checkForSavedMerchants } from "../util/transactionUtil";
import { getDashboardStats } from "../util/statsUtil";
import ButtonSpinner from "./ButtonSpinner";

const MerchantSettings = () => {
	const {
		merchantSettings,
		fetchMerchantSettings,
		editingMerchantSetting,
		setEditingMerchantSetting,
		filters,
		setTransactions,
		setDashboardStats,
		setNotification,
	} = useDataStore((state) => ({
		merchantSettings: state.merchantSettings,
		fetchMerchantSettings: state.fetchMerchantSettings,
		editingMerchantSetting: state.editingMerchantSetting,
		setEditingMerchantSetting: state.setEditingMerchantSetting,
		filters: state.filters,
		setTransactions: state.setTransactions,
		setDashboardStats: state.setDashboardStats,
		setNotification: state.setNotification,
	}));
	const [loading, setLoading] = useState({
		save: false,
		delete: false,
		create: false,
		apply: false,
	});
	const [merchantSearch, setMerchantSearch] = useState("");
	const bottomRef = useRef(null);

	useEffect(() => {
		if (merchantSettings === null) fetchMerchantSettings();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onClickCreate = () => {
		if (Object.values(loading).some((value) => value)) return;

		if (editingMerchantSetting?.id === -1) {
			setEditingMerchantSetting(null);
			return;
		}
		setEditingMerchantSetting({ id: -1, category: { name: "Uncategorized" }, text: "", type: "contains" });
		setTimeout(() => {
			if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
		}, 100);
	};

	const onClickApplyToExisting = async () => {
		if (Object.values(loading).some((value) => value)) return;

		setLoading({ ...loading, apply: true });
		let allTransactions = await getTransactions();
		allTransactions = checkForSavedMerchants(allTransactions, merchantSettings);
		const success = await updateTransactions(allTransactions);

		if (!success) {
			setLoading({ ...loading, apply: false });
			setNotification({ type: "error", message: "Could not apply merchant settings to existing transactions." });
			return;
		}

		setTransactions(allTransactions);
		setDashboardStats(await getDashboardStats(allTransactions, filters));
		setNotification({
			type: "success",
			message: "Successfully applied merchant settings to existing transactions.",
		});
		setLoading({ ...loading, apply: false });
	};

	return (
		<div className="grow flex flex-col">
			<div className="grow overflow-y-auto p-6">
				<div className="flex justify-between items-center flex-wrap mb-3">
					<div className="text-lg text-slate-600 font-semibold">Merchants</div>
					<div className="w-52 flex items-center border border-slate-300 rounded p-0.5">
						<input
							value={merchantSearch}
							onChange={(e) => setMerchantSearch(e.target.value)}
							placeholder="Search merchants"
							className="grow text-xs outline-none bg-transparent pl-1"
						></input>
						<div className="w-5 p-0.5 mr-0.5">
							<img src="./search.svg" className="w-full h-full" />
						</div>
					</div>
				</div>
				{/* <div className="w-full bg-cGreen-lighter border border-cGreen p-3 rounded-lg mb-3">
					<span className="font-semibold">NOTE:</span> One or more of your saved merchants is{" "}
					<span className="underline">contained</span> within another merchant. This may cause unexpected
					categorizations of your transactions{" "}
					{
						"(e.g. if 'contains KROGER' is added after 'contains KROGER FUEL', all transactions containing KROGER FUEL will be categorized according to 'contains KROGER'). "
					}
					You should review your saved merchants and ensure they work as you intend.
				</div> */}
				<div className="flex flex-col gap-3">
					{merchantSettings?.length === 0 && editingMerchantSetting?.id !== -1 && (
						<div className="w-full border border-slate-300 rounded flex justify-center items-center py-3">
							{"No merchants saved :("}
						</div>
					)}
					{merchantSettings
						?.filter((m) => m.text.toLowerCase().includes(merchantSearch.toLowerCase()))
						.map((item, index) => (
							<MerchantSettingsItem key={index} item={item} loading={loading} setLoading={setLoading} />
						))}
					{merchantSettings?.filter((m) => m.text.toLowerCase().includes(merchantSearch.toLowerCase()))
						.length === 0 && (
						<div className="w-full border border-slate-300 rounded flex justify-center items-center py-3">
							{"No search results found :("}
						</div>
					)}
					{editingMerchantSetting?.id === -1 && (
						<MerchantSettingsItemCreate loading={loading} setLoading={setLoading} />
					)}
				</div>
				<div ref={bottomRef}></div>
			</div>
			<div className="border-t border-slate-300 w-full flex justify-between px-8 py-4">
				<button
					onClick={onClickApplyToExisting}
					className="border-slate-200 relative text-slate-500 hover:bg-slate-50 text-sm font-normal px-2 py-1 border-slate-300 border rounded"
				>
					<span className={`${loading.apply ? "opacity-0" : ""}`}>Apply to Existing Transactions</span>
					{loading.apply && <ButtonSpinner />}
				</button>
				{editingMerchantSetting?.id === -1 ? (
					<div className="flex justify-start items-start">
						<button
							onClick={onClickCreate}
							className="border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-normal px-2 py-1 border-slate-300 border rounded"
						>
							Cancel
						</button>
					</div>
				) : (
					<button
						className="relative bg-blue-100 py-1 px-2 bg-cGreen-light border border-slate-300 rounded text-sm text-slate-700 p-1"
						onClick={onClickCreate}
					>
						Create
					</button>
				)}
			</div>
		</div>
	);
};

export default MerchantSettings;
