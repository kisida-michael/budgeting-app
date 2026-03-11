import { useEffect, useMemo, useState } from "react";
import { useDataStore } from "../util/dataStore";
import { filterTransactions } from "../util/filterUtil";
import { buildDefaultDateFilter } from "../constants/Filters";
import { getPlaidStatus } from "../util/supabaseQueries";

const DashboardAttentionPanel = () => {
	const { transactions, transactionsLoading, budgets, budgetsLoading, fetchBudgets } = useDataStore((state) => ({
		transactions: state.transactions,
		transactionsLoading: state.transactionsLoading,
		budgets: state.budgets,
		budgetsLoading: state.budgetsLoading,
		fetchBudgets: state.fetchBudgets,
	}));
	const [plaidStatus, setPlaidStatus] = useState(null);
	const [plaidStatusLoading, setPlaidStatusLoading] = useState(true);

	useEffect(() => {
		if (budgets === null) {
			fetchBudgets();
		}
	}, [budgets, fetchBudgets]);

	useEffect(() => {
		let cancelled = false;

		const loadPlaidStatus = async () => {
			setPlaidStatusLoading(true);
			try {
				const status = await getPlaidStatus();
				if (!cancelled) {
					setPlaidStatus(status);
				}
			} catch (error) {
				if (!cancelled) {
					setPlaidStatus({
						available: false,
						reason: error instanceof Error ? error.message : "Could not load Plaid status.",
						connectedItems: 0,
						connectedAccounts: 0,
						lastSyncAt: null,
						items: [],
					});
				}
			} finally {
				if (!cancelled) {
					setPlaidStatusLoading(false);
				}
			}
		};

		loadPlaidStatus();

		return () => {
			cancelled = true;
		};
	}, []);

	const currentMonthTransactions = useMemo(() => {
		if (!transactions) {
			return [];
		}

		return filterTransactions(transactions, [buildDefaultDateFilter()]);
	}, [transactions]);

	const uncategorizedCount = currentMonthTransactions.filter(
		(transaction) => !transaction.ignored && transaction.categoryName === "Uncategorized"
	).length;
	const overBudgetCategories = (budgets ?? []).filter(
		(budget) => budget.name !== "Total" && budget.limit && budget.spending > budget.limit
	);
	const overBudgetAmount = overBudgetCategories.reduce(
		(total, budget) => total + (budget.spending - budget.limit),
		0
	);

	const plaidAttention = useMemo(() => {
		if (!plaidStatus) {
			return {
				tone: "neutral",
				label: "Checking connection state",
				detail: "Loading Plaid status.",
			};
		}

		if (!plaidStatus.available) {
			return {
				tone: "warning",
				label: "Plaid is unavailable",
				detail: plaidStatus.reason || "Plaid is not configured for this environment.",
			};
		}

		if (plaidStatus.connectedItems === 0) {
			return {
				tone: "warning",
				label: "No bank connected",
				detail: "Connect a bank to keep transactions current.",
			};
		}

		const pendingItems = plaidStatus.items?.filter((item) => item.syncStatus === "pending") ?? [];
		if (pendingItems.length > 0) {
			return {
				tone: "warning",
				label: "Bank connected, sync pending",
				detail: `${pendingItems.length} connection${pendingItems.length === 1 ? "" : "s"} still need an initial sync.`,
			};
		}

		const staleItems = plaidStatus.items?.filter((item) => item.syncStatus === "stale") ?? [];
		if (staleItems.length > 0 && plaidStatus.lastSyncAt) {
			const lastSyncDate = new Date(plaidStatus.lastSyncAt);
			const daysSinceSync = Math.floor((Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24));
			return {
				tone: "warning",
				label: "Plaid sync is stale",
				detail: `${staleItems.length} connection${staleItems.length === 1 ? "" : "s"} have not synced in ${daysSinceSync} day${daysSinceSync === 1 ? "" : "s"}.`,
			};
		}

		if (!plaidStatus.lastSyncAt) {
			return {
				tone: "warning",
				label: "Bank connected, sync pending",
				detail: "Run the first sync to import accounts and transactions.",
			};
		}

		const lastSyncDate = new Date(plaidStatus.lastSyncAt);
		return {
			tone: "ok",
			label: `${plaidStatus.connectedAccounts} account${plaidStatus.connectedAccounts === 1 ? "" : "s"} connected`,
			detail: `Last synced ${lastSyncDate.toLocaleDateString("en-US")}.`,
		};
	}, [plaidStatus]);

	const cards = [
		{
			key: "uncategorized",
			title: "Uncategorized",
			loading: transactionsLoading,
			tone: uncategorizedCount > 0 ? "warning" : "ok",
			value: uncategorizedCount,
			detail:
				uncategorizedCount > 0
					? `${uncategorizedCount} transaction${uncategorizedCount === 1 ? "" : "s"} need review this month.`
					: "No uncategorized transactions this month.",
		},
		{
			key: "budgets",
			title: "Over Budget",
			loading: budgetsLoading && budgets === null,
			tone: overBudgetCategories.length > 0 ? "warning" : "ok",
			value: overBudgetCategories.length,
			detail:
				overBudgetCategories.length > 0
					? `${overBudgetAmount.toFixed(2)} over across ${overBudgetCategories.length} categor${
							overBudgetCategories.length === 1 ? "y" : "ies"
					  }.`
					: "No categories are over budget right now.",
		},
		{
			key: "plaid",
			title: "Bank Sync",
			loading: plaidStatusLoading,
			tone: plaidAttention.tone,
			value:
				plaidStatus && plaidStatus.available
					? `${plaidStatus.connectedItems}/${plaidStatus.connectedAccounts}`
					: "!",
			detail: plaidAttention.detail,
			label: plaidAttention.label,
		},
	];

	const toneClasses = {
		ok: "border-cGreen-light bg-cGreen-light/30",
		warning: "border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700",
		neutral: "border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700",
	};

	return (
		<div className="w-full flex flex-col bg-white border border-slate-300 rounded-2xl p-5 gap-3">
			<div className="flex items-center justify-between gap-3">
				<div>
					<div className="text-lg text-slate-700 font-semibold">Needs Attention</div>
					<div className="text-sm text-slate-500">
						Current month cleanup, budget pressure, and connection health.
					</div>
				</div>
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
				{cards.map((card) => (
					<div
						key={card.key}
						className={`border rounded-xl p-4 flex flex-col gap-2 ${toneClasses[card.tone] ?? toneClasses.neutral}`}
					>
						<div className="flex items-start justify-between gap-3">
							<div className="text-sm font-semibold text-slate-600">{card.title}</div>
							<div className="text-2xl font-bold text-slate-700">
								{card.loading ? <span className="inline-block h-8 w-10 rounded bg-slate-200 animate-pulse" /> : card.value}
							</div>
						</div>
						<div className="text-sm text-slate-700">{card.label ?? card.title}</div>
						<div className="text-sm text-slate-500">{card.detail}</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default DashboardAttentionPanel;
