import { ApiError, apiRequest } from "../config/apiClient";

const isUnauthorized = (error) => error instanceof ApiError && error.status === 401;
const logReadFailure = (label, error) => {
	console.error(`${label}:`, error);
};

const formatTransactions = (transactions) => {
	transactions = transactions.map((transaction) => {
		transaction.date = new Date(transaction.date).toLocaleDateString("en-US");
		transaction.amount = Number(transaction.amount);
		return transaction;
	});

	transactions.sort((a, b) => {
		const dateA = new Date(a.date);
		const dateB = new Date(b.date);

		if (dateA > dateB) return -1;
		else if (dateA < dateB) return 1;
		return a.merchant.localeCompare(b.merchant);
	});

	return transactions;
};

export const getTransactions = async () => {
	try {
		const data = await apiRequest("/api/transactions");
		if (data.length === 100000) {
			alert("Max transaction limit reached.");
		}
		return formatTransactions(data);
	} catch (error) {
		if (!isUnauthorized(error)) logReadFailure("Could not fetch transactions", error);
		return [];
	}
};

export const getTransactionCount = async () => {
	try {
		const { count } = await apiRequest("/api/transactions/count");
		return count;
	} catch (error) {
		if (isUnauthorized(error)) return 0;
		throw error;
	}
};

export const setTransactionIgnored = async (transactionId, ignored) => {
	try {
		await apiRequest(`/api/transactions/${transactionId}/ignored`, {
			method: "PATCH",
			body: JSON.stringify({ ignored }),
		});
		return true;
	} catch {
		return false;
	}
};

export const setTransactionsIgnored = async (transactions, ignored) => {
	try {
		await apiRequest("/api/transactions/bulk/ignored", {
			method: "PATCH",
			body: JSON.stringify({
				ids: transactions.map((transaction) => transaction.id),
				ignored,
			}),
		});
		return true;
	} catch {
		return false;
	}
};

export const setTransactionCategory = async (transactionId, categoryName) => {
	try {
		await apiRequest(`/api/transactions/${transactionId}/category`, {
			method: "PATCH",
			body: JSON.stringify({ categoryName }),
		});
		return true;
	} catch {
		return false;
	}
};

export const setTransactionCategories = async (transactions, categoryName) => {
	try {
		await apiRequest("/api/transactions/bulk/category", {
			method: "PATCH",
			body: JSON.stringify({
				ids: transactions.map((transaction) => transaction.id),
				categoryName,
			}),
		});
		return true;
	} catch {
		return false;
	}
};

export const deleteTransaction = async (transactionId) => {
	try {
		await apiRequest(`/api/transactions/${transactionId}`, {
			method: "DELETE",
		});
		return true;
	} catch {
		return false;
	}
};

export const deleteTransactions = async (transactions) => {
	try {
		await apiRequest("/api/transactions/bulk-delete", {
			method: "POST",
			body: JSON.stringify({
				ids: transactions.map((transaction) => transaction.id),
			}),
		});
		return true;
	} catch {
		return false;
	}
};

export const getConfigurations = async () => {
	try {
		const data = await apiRequest("/api/configurations");
		data.sort((a, b) => a.name.localeCompare(b.name));
		return data;
	} catch (error) {
		if (!isUnauthorized(error)) logReadFailure("Could not fetch configurations", error);
		return [];
	}
};

export const upsertConfiguration = async (configuration) => {
	try {
		await apiRequest("/api/configurations", {
			method: "POST",
			body: JSON.stringify({ configuration }),
		});
		return { success: true, error: null };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Could not save configuration.",
		};
	}
};

export const deleteConfiguration = async (configurationName) => {
	try {
		await apiRequest(`/api/configurations/${encodeURIComponent(configurationName)}`, {
			method: "DELETE",
		});
		return true;
	} catch {
		return false;
	}
};

export const getCategories = async () => {
	try {
		const data = await apiRequest("/api/categories");
		data.sort((a, b) => a.orderIndex - b.orderIndex);
		return data;
	} catch (error) {
		if (!isUnauthorized(error)) logReadFailure("Could not fetch categories", error);
		return [];
	}
};

export const getSpending = async (year) => {
	return await apiRequest(`/api/spending?year=${year}`);
};

export const getBudgets = async (date) => {
	return await apiRequest(`/api/budgets?month=${date.getMonth() + 1}&year=${date.getFullYear()}`);
};

export const updateBudget = async (newBudgets) => {
	try {
		await apiRequest("/api/budgets", {
			method: "PUT",
			body: JSON.stringify({
				month: newBudgets?.budgetContext?.month ?? undefined,
				year: newBudgets?.budgetContext?.year ?? undefined,
				budgets: newBudgets
					.filter((budget) => budget.name !== "Total")
					.map((budget) => ({
						categoryName: budget.name,
						limit: budget.limit === "" ? null : budget.limit,
					})),
			}),
		});
		return true;
	} catch {
		return false;
	}
};

export const copyPreviousBudget = async (month, year) => {
	return await apiRequest("/api/budgets/copy-previous", {
		method: "POST",
		body: JSON.stringify({ month, year }),
	});
};

export const getMerchantSettings = async () => {
	try {
		const data = await apiRequest("/api/merchants");
		data.sort((a, b) => a.id - b.id);
		return data;
	} catch (error) {
		if (!isUnauthorized(error)) logReadFailure("Could not fetch merchant settings", error);
		return [];
	}
};

export const upsertMerchantSetting = async (merchantSetting) => {
	try {
		await apiRequest("/api/merchants", {
			method: "POST",
			body: JSON.stringify({ merchantSetting }),
		});
		return true;
	} catch {
		return false;
	}
};

export const deleteMerchantSetting = async (merchantSettingId) => {
	try {
		await apiRequest(`/api/merchants/${merchantSettingId}`, {
			method: "DELETE",
		});
		return true;
	} catch {
		return false;
	}
};

export const getUploads = async () => {
	try {
		const uploads = await apiRequest("/api/uploads");
		return uploads.map((upload) => ({
			...upload,
			created_at: upload.createdAt,
		}));
	} catch (error) {
		if (!isUnauthorized(error)) logReadFailure("Could not fetch uploads", error);
		return [];
	}
};

export const previewTransactionsUpload = async (uploadId, files) => {
	return await apiRequest("/api/uploads/preview", {
		method: "POST",
		body: JSON.stringify({ uploadId, files }),
	});
};

export const commitTransactionsUpload = async (uploadId, filesLabel, transactions) => {
	return await apiRequest("/api/uploads/commit", {
		method: "POST",
		body: JSON.stringify({ uploadId, filesLabel, transactions }),
	});
};

export const applyMerchantSettingsToExisting = async () => {
	try {
		await apiRequest("/api/merchants/apply-existing", {
			method: "POST",
		});
		return true;
	} catch {
		return false;
	}
};

export const deleteUpload = async (uploadId) => {
	try {
		await apiRequest(`/api/uploads/${uploadId}`, {
			method: "DELETE",
		});
	} catch (error) {
		throw Error(error.message);
	}
};

export const getPlaidStatus = async () => {
	try {
		return await apiRequest("/api/plaid/status");
	} catch (error) {
		if (!isUnauthorized(error)) throw error;
		return {
			available: false,
			reason: "Unauthorized",
			connectedItems: 0,
			connectedAccounts: 0,
			lastSyncAt: null,
			items: [],
		};
	}
};

export const createPlaidLinkToken = async () => {
	return await apiRequest("/api/plaid/link-token", {
		method: "POST",
	});
};

export const exchangePlaidPublicToken = async ({ publicToken, institutionId, institutionName }) => {
	return await apiRequest("/api/plaid/exchange", {
		method: "POST",
		body: JSON.stringify({
			publicToken,
			institutionId,
			institutionName,
		}),
	});
};

export const syncPlaidTransactions = async (itemId = null) => {
	return await apiRequest("/api/plaid/sync", {
		method: "POST",
		body: JSON.stringify(itemId ? { itemId } : {}),
	});
};

export const disconnectPlaidItem = async (itemId) => {
	return await apiRequest(`/api/plaid/items/${itemId}`, {
		method: "DELETE",
	});
};
