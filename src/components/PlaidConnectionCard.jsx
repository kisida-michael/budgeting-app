import { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useDataStore } from "../util/dataStore";
import {
	createPlaidLinkToken,
	disconnectPlaidItem,
	exchangePlaidPublicToken,
	getPlaidStatus,
	getTransactions,
	syncPlaidTransactions,
} from "../util/supabaseQueries";
import { getDashboardStats } from "../util/statsUtil";
import ButtonSpinner from "./ButtonSpinner";

const PlaidConnectionCard = () => {
	const { filters, setTransactions, setDashboardStats, fetchBudgets, fetchTotalTransactionCount, setNotification } =
		useDataStore((state) => ({
			filters: state.filters,
			setTransactions: state.setTransactions,
			setDashboardStats: state.setDashboardStats,
			fetchBudgets: state.fetchBudgets,
			fetchTotalTransactionCount: state.fetchTotalTransactionCount,
			setNotification: state.setNotification,
		}));
	const [status, setStatus] = useState({
		available: false,
		reason: "Checking Plaid configuration...",
		connectedItems: 0,
		connectedAccounts: 0,
		lastSyncAt: null,
		items: [],
	});
	const [token, setToken] = useState(null);
	const [launchRequested, setLaunchRequested] = useState(false);
	const [loading, setLoading] = useState(null);

	const refreshWorkspaceData = async () => {
		const transactions = await getTransactions();
		setTransactions(transactions);
		setDashboardStats(await getDashboardStats(transactions, filters));
		await fetchBudgets();
		await fetchTotalTransactionCount();
	};

	const loadStatus = async () => {
		try {
			setStatus(await getPlaidStatus());
		} catch (error) {
			setStatus({
				available: false,
				reason: error.message,
				connectedItems: 0,
				connectedAccounts: 0,
				lastSyncAt: null,
				items: [],
			});
		}
	};

	useEffect(() => {
		loadStatus();
	}, []);

	const { open, ready } = usePlaidLink({
		token,
		onSuccess: async (publicToken, metadata) => {
			setLoading("connect");
			try {
				await exchangePlaidPublicToken({
					publicToken,
					institutionId: metadata?.institution?.institution_id ?? null,
					institutionName: metadata?.institution?.name ?? null,
				});
				await refreshWorkspaceData();
				await loadStatus();
				setNotification({ type: "success", message: "Bank account connected and transactions synced." });
			} catch (error) {
				setNotification({ type: "error", message: error.message });
			} finally {
				setLoading(null);
				setLaunchRequested(false);
				setToken(null);
			}
		},
		onExit: (error) => {
			if (error) {
				setNotification({ type: "error", message: error.error_message ?? "Plaid Link exited unexpectedly." });
			}
			setLaunchRequested(false);
			setLoading(null);
		},
	});

	useEffect(() => {
		if (launchRequested && ready) {
			open();
		}
	}, [launchRequested, ready, open]);

	const handleConnect = async () => {
		if (loading) return;

		setLoading("connect");
		try {
			const { linkToken } = await createPlaidLinkToken();
			setToken(linkToken);
			setLaunchRequested(true);
		} catch (error) {
			setLoading(null);
			setNotification({ type: "error", message: error.message });
		}
	};

	const handleSync = async (itemId = null) => {
		if (loading) return;

		setLoading(itemId ? `sync:${itemId}` : "sync");
		try {
			await syncPlaidTransactions(itemId);
			await refreshWorkspaceData();
			await loadStatus();
			setNotification({ type: "success", message: "Plaid transactions synced." });
		} catch (error) {
			setNotification({ type: "error", message: error.message });
		} finally {
			setLoading(null);
		}
	};

	const handleDisconnect = async (itemId) => {
		if (loading) return;

		setLoading(`disconnect:${itemId}`);
		try {
			await disconnectPlaidItem(itemId);
			await refreshWorkspaceData();
			await loadStatus();
			setNotification({ type: "success", message: "Disconnected bank connection." });
		} catch (error) {
			setNotification({ type: "error", message: error.message });
		} finally {
			setLoading(null);
		}
	};

	return (
		<div className="w-full bg-white border border-slate-300 rounded-2xl p-5 flex flex-col gap-4">
			<div className="flex justify-between items-start gap-4">
				<div>
					<div className="text-lg text-slate-600 font-semibold mb-1">Bank Connections</div>
					<div className="text-slate-500 text-sm">
						{status.available
							? status.connectedItems > 0
								? `${status.connectedItems} bank connection${status.connectedItems === 1 ? "" : "s"} linked`
								: "Plaid is configured and ready for bank connections."
							: "Plaid setup is not finished yet for this environment."}
					</div>
					<div className="text-xs text-slate-400 mt-1">
						{status.reason || `Connected accounts: ${status.connectedAccounts}`}
					</div>
					{status.lastSyncAt && (
						<div className="text-xs text-slate-400 mt-1">
							Last sync: {new Date(status.lastSyncAt).toLocaleString("en-US")}
						</div>
					)}
				</div>
				<div className="flex gap-2">
					<button
						onClick={() => handleSync()}
						disabled={!status.available || status.connectedItems === 0 || loading !== null}
						className={`${
							!status.available || status.connectedItems === 0 || loading !== null ? "opacity-50 cursor-default" : ""
						} relative border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-normal px-3 py-2 border border-slate-300 rounded`}
					>
						<span className={`${loading === "sync" ? "opacity-0" : ""}`}>Sync</span>
						{loading === "sync" && <ButtonSpinner />}
					</button>
					<button
						onClick={handleConnect}
						disabled={!status.available || loading !== null}
						className={`${
							!status.available || loading !== null ? "opacity-50 cursor-default" : ""
						} relative font-normal text-slate-600 bg-cGreen-light hover:bg-cGreen-lightHover border border-slate-300 rounded text-sm py-2 px-3`}
					>
						<span className={`${loading === "connect" ? "opacity-0" : ""}`}>
							{status.connectedItems > 0 ? "Connect Another Bank" : "Connect Bank"}
						</span>
						{loading === "connect" && <ButtonSpinner />}
					</button>
				</div>
			</div>
			{status.items.length > 0 && (
				<div className="flex flex-col gap-2">
					{status.items.map((item) => (
						<div
							key={item.itemId}
							className="border border-slate-200 rounded-xl px-4 py-3 flex justify-between items-center gap-4"
						>
							<div>
								<div className="text-sm font-medium text-slate-600">{item.institutionName}</div>
								<div className="text-xs text-slate-400">
									{item.accountCount} account{item.accountCount === 1 ? "" : "s"}
									{item.lastSyncAt ? ` • synced ${new Date(item.lastSyncAt).toLocaleString("en-US")}` : ""}
								</div>
							</div>
							<div className="flex gap-2">
								<button
									onClick={() => handleSync(item.itemId)}
									disabled={loading !== null}
									className={`${
										loading !== null ? "opacity-50 cursor-default" : ""
									} relative border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-normal px-2 py-1 border border-slate-300 rounded`}
								>
									<span className={`${loading === `sync:${item.itemId}` ? "opacity-0" : ""}`}>Sync</span>
									{loading === `sync:${item.itemId}` && <ButtonSpinner />}
								</button>
								<button
									onClick={() => handleDisconnect(item.itemId)}
									disabled={loading !== null}
									className={`${
										loading !== null ? "opacity-50 cursor-default" : ""
									} relative border border-slate-300 rounded text-xs px-2 py-1 text-slate-500 hover:bg-slate-50`}
								>
									<span className={`${loading === `disconnect:${item.itemId}` ? "opacity-0" : ""}`}>
										Disconnect
									</span>
									{loading === `disconnect:${item.itemId}` && <ButtonSpinner />}
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default PlaidConnectionCard;
