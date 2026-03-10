import { create } from "zustand";
import { getDashboardStats } from "./statsUtil";
import { defaultFilter } from "../constants/Filters";
import {
	getTransactions,
	getConfigurations,
	getCategories,
	getBudgets,
	getTransactionCount,
	getMerchantSettings,
	getSpending,
	getUploads,
} from "./supabaseQueries";

const today = new Date();

const store = (set, get) => ({
	totalTransactionCount: -1,
	setTotalTransactionCount: (totalTransactionCount) => set(() => ({ totalTransactionCount })),
	fetchTotalTransactionCount: async () => {
		const count = await getTransactionCount();
		set({ totalTransactionCount: count });
	},

	transactions: null,
	setTransactions: (transactions) => set(() => ({ transactions })),
	transactionsLoading: false,
	fetchTransactions: async () => {
		const { dashboardStats, fetchDashboardStats } = get();
		set({ transactionsLoading: true });
		const data = await getTransactions();
		set({ transactions: data, transactionsLoading: false });
		if (dashboardStats === null) fetchDashboardStats();
	},

	filters: [{ ...defaultFilter }],
	setFilters: (filters) => {
		set(() => ({ filters }));
	},

	configurations: null,
	setConfigurations: (configurations) => set(() => ({ configurations })),
	configurationsLoading: true,
	fetchConfigurations: async () => {
		set({ configurationsLoading: true });
		const data = await getConfigurations();
		set({ configurations: data, configurationsLoading: false });
	},

	categories: null,
	setCategories: (categories) => set(() => ({ categories })),
	categoriesLoading: true,
	fetchCategories: async () => {
		set({ categoriesLoading: true });
		const data = await getCategories();
		set({ categories: data, categoriesLoading: false });
	},

	notification: null,
	setNotification: (notification) => set(() => ({ notification })),

	session: null,
	setSession: (session) => set(() => ({ session })),

	dashboardStats: null,
	setDashboardStats: (dashboardStats) => set(() => ({ dashboardStats })),
	dashboardStatsLoading: true,
	fetchDashboardStats: async () => {
		const { filters } = get();
		set({ dashboardStatsLoading: true });
		const data = await getDashboardStats(null, filters);
		set({ dashboardStats: data, dashboardStatsLoading: false });
	},
	dashboardSortState: null,
	setDashboardSortState: (state) => set(() => ({ dashboardSortState: state })),

	spending: null,
	setSpending: (spending) => set(() => ({ spending })),
	spendingLoading: true,
	spendingYear: today.getFullYear(),
	setSpendingYear: (year) => set(() => ({ spendingYear: year })),
	fetchSpending: async () => {
		const { spending, spendingYear } = get();
		if (spending === null) set({ spendingLoading: true });
		const data = await getSpending(spendingYear);
		set({ spending: data, spendingLoading: false });
	},

	budgets: null,
	setBudgets: (budgets) => set(() => ({ budgets })),
	budgetsMonth: today.getMonth() + 1,
	setBudgetsMonth: (month) => set(() => ({ budgetsMonth: month })),
	budgetsYear: today.getFullYear(),
	setBudgetsYear: (year) => set(() => ({ budgetsYear: year })),
	budgetsLoading: true,
	fetchBudgets: async () => {
		const { budgets, budgetsMonth, budgetsYear } = get();
		if (budgets === null) set({ budgetsLoading: true });
		const data = await getBudgets(new Date(`${budgetsYear}-${budgetsMonth}-01`));
		set({ budgets: data, budgetsLoading: false });
	},

	activeSetting: null,
	setActiveSetting: (setting) => set(() => ({ activeSetting: setting })),

	merchantSettings: null,
	setMerchantSettings: (merchantSettings) => set(() => ({ merchantSettings })),
	merchantSettingsLoading: true,
	editingMerchantSetting: null,
	setEditingMerchantSetting: (merchantSetting) => set(() => ({ editingMerchantSetting: merchantSetting })),
	fetchMerchantSettings: async () => {
		set({ merchantSettingsLoading: true });
		const data = await getMerchantSettings();
		set({ merchantSettings: data, merchantSettingsLoading: false });
	},

	uploads: null,
	setUploads: (uploads) => set(() => ({ uploads })),
	uploadsLoading: true,
	fetchUploads: async () => {
		set({ uploadsLoading: true });
		const data = await getUploads();
		set({ uploads: data, uploadsLoading: false });
	},
});

export const useDataStore = create(store);
