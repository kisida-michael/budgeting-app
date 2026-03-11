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

const formatBalance = (value, currencyCode = "USD") => {
	if (value === null || value === undefined || Number.isNaN(Number(value))) {
		return "--";
	}

	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currencyCode || "USD",
			maximumFractionDigits: 2,
		}).format(Number(value));
	} catch {
		return Number(value).toFixed(2);
	}
};

const syncStateConfig = {
	healthy: {
		label: "Healthy",
		className: "border-cGreen-light bg-cGreen-light/40 text-slate-700 dark:border-cGreen/40 dark:bg-cGreen/15 dark:text-cGreen-light",
	},
	stale: {
		label: "Stale",
		className: "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-200",
	},
	pending: {
		label: "Pending sync",
		className: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
	},
};

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
		<div className="w-full bg-white border border-slate-300 rounded-2xl p-5 flex flex-col gap-4 dark:border-slate-700 dark:bg-slate-950/70">
			<div className="flex justify-between items-start gap-4">
				<div>
					<div className="text-lg text-slate-600 font-semibold mb-1 dark:text-slate-100">
						Bank Connections
					</div>
					<div className="text-slate-500 text-sm">
						{status.available
							? status.connectedItems > 0
								? `${status.connectedAccounts} cached account${status.connectedAccounts === 1 ? "" : "s"} across ${status.connectedItems} connection${status.connectedItems === 1 ? "" : "s"}`
								: "Plaid is configured and ready for bank connections."
							: "Plaid setup is not finished yet for this environment."}
					</div>
					<div className="text-xs text-slate-400 mt-1">
						{status.available
							? "Balances shown below are cached from the latest Plaid sync."
							: status.reason || "Plaid is unavailable in this environment."}
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
							!status.available || status.connectedItems === 0 || loading !== null
								? "cursor-default opacity-55 dark:bg-slate-900 dark:text-slate-500"
								: "dark:text-slate-300 dark:hover:bg-slate-900"
						} relative border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-normal px-3 py-2 border border-slate-300 rounded dark:border-slate-700`}
					>
						<span className={`${loading === "sync" ? "opacity-0" : ""}`}>Sync</span>
						{loading === "sync" && <ButtonSpinner />}
					</button>
					<button
						onClick={handleConnect}
						disabled={!status.available || loading !== null}
						className={`${
							!status.available || loading !== null
								? "cursor-default opacity-60 dark:bg-slate-900 dark:text-slate-500"
								: "dark:bg-cGreen dark:text-slate-950 dark:hover:bg-cGreen-light"
						} relative font-normal text-slate-600 bg-cGreen-light hover:bg-cGreen-lightHover border border-slate-300 rounded text-sm py-2 px-3 dark:border-cGreen/40`}
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
							className="border border-slate-200 rounded-xl px-4 py-3 flex flex-col gap-3 dark:border-slate-800 dark:bg-slate-900/60"
						>
							<div className="flex justify-between items-start gap-4">
								<div>
									<div className="flex items-center gap-2 flex-wrap">
										<div className="text-sm font-medium text-slate-600 dark:text-slate-100">
											{item.institutionName}
										</div>
										<span
											className={`border rounded-full px-2 py-0.5 text-xs ${
												syncStateConfig[item.syncStatus]?.className ?? syncStateConfig.pending.className
											}`}
										>
											{syncStateConfig[item.syncStatus]?.label ?? syncStateConfig.pending.label}
										</span>
									</div>
									<div className="text-xs text-slate-400 dark:text-slate-500">
										{item.accountCount} account{item.accountCount === 1 ? "" : "s"}
										{item.lastSyncAt ? ` • synced ${new Date(item.lastSyncAt).toLocaleString("en-US")}` : ""}
									</div>
								</div>
								<div className="flex gap-2">
									<button
										onClick={() => handleSync(item.itemId)}
										disabled={loading !== null}
										className={`${
											loading !== null
												? "cursor-default opacity-55 dark:bg-slate-950 dark:text-slate-500"
												: "dark:text-slate-300 dark:hover:bg-slate-950"
										} relative border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-normal px-2 py-1 border border-slate-300 rounded dark:border-slate-700`}
									>
										<span className={`${loading === `sync:${item.itemId}` ? "opacity-0" : ""}`}>Sync</span>
										{loading === `sync:${item.itemId}` && <ButtonSpinner />}
									</button>
									<button
										onClick={() => handleDisconnect(item.itemId)}
										disabled={loading !== null}
										className={`${
											loading !== null
												? "cursor-default opacity-55 dark:bg-slate-950 dark:text-slate-500"
												: "dark:text-slate-300 dark:hover:bg-slate-950"
										} relative border border-slate-300 rounded text-xs px-2 py-1 text-slate-500 hover:bg-slate-50 dark:border-slate-700`}
									>
										<span className={`${loading === `disconnect:${item.itemId}` ? "opacity-0" : ""}`}>
											Disconnect
										</span>
										{loading === `disconnect:${item.itemId}` && <ButtonSpinner />}
									</button>
								</div>
							</div>
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
								{item.accounts?.length > 0 ? (
									item.accounts.map((account) => (
										<div
											key={account.accountId}
											className="border border-slate-200 rounded-lg px-3 py-2 flex justify-between gap-3 dark:border-slate-800 dark:bg-slate-950/80"
										>
											<div className="min-w-0">
												<div className="text-sm font-medium text-slate-600 truncate dark:text-slate-100">
													{account.name}
													{account.mask ? ` • ${account.mask}` : ""}
												</div>
												<div className="text-xs text-slate-400 truncate dark:text-slate-500">
													{account.officialName || `${account.subtype || account.type} account`}
												</div>
											</div>
											<div className="text-right shrink-0">
												<div className="text-sm font-semibold text-slate-600 dark:text-slate-100">
													{formatBalance(account.currentBalance, account.isoCurrencyCode)}
												</div>
												<div className="text-xs text-slate-400 dark:text-slate-500">
													Available {formatBalance(account.availableBalance, account.isoCurrencyCode)}
												</div>
											</div>
										</div>
									))
								) : (
									<div className="border border-dashed border-slate-200 rounded-lg px-3 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400">
										No cached account details yet. Run sync to refresh balances.
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default PlaidConnectionCard;
