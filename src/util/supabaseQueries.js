import { ApiError, apiRequest } from "../config/apiClient";
import { getCategoricalSpending } from "./statsUtil";
import { ignoredCategories } from "../constants/Categories";

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

export const getTransactionsByMonth = async (dateObj) => {
	try {
		const data = await apiRequest(
			`/api/transactions/month?month=${dateObj.getMonth() + 1}&year=${dateObj.getFullYear()}`
		);
		return formatTransactions(data);
	} catch (error) {
		if (!isUnauthorized(error)) logReadFailure("Could not fetch dashboard statistics", error);
		return [];
	}
};

export const insertTransactions = async (transactions) => {
	await apiRequest("/api/transactions/import", {
		method: "POST",
		body: JSON.stringify({ transactions }),
	});
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

export const updateTransactions = async (transactions) => {
	try {
		await apiRequest("/api/transactions", {
			method: "PUT",
			body: JSON.stringify({
				transactions: transactions.map((transaction) => ({
					id: transaction.id,
					categoryName: transaction.categoryName,
					ignored: transaction.ignored,
				})),
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
		return true;
	} catch {
		return false;
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
	let spending = [];
	const yearTotals = { Total: 0 };
	for (let i = 0; i < 12; i++) {
		const transactions = await getTransactionsByMonth(new Date(year, i, 1));
		const categoricalSpending = await getCategoricalSpending(transactions);

		let total = 0;
		Object.keys(categoricalSpending).forEach((categoryName) => {
			if (!ignoredCategories.includes(categoryName)) total += categoricalSpending[categoryName];
			if (!Object.keys(yearTotals).includes(categoryName)) yearTotals[categoryName] = 0;
			yearTotals[categoryName] += categoricalSpending[categoryName];
		});
		categoricalSpending["Total"] = total;
		yearTotals["Total"] += total;
		categoricalSpending["Income"] *= -1;
		spending[i] = categoricalSpending;
	}

	yearTotals["Income"] *= -1;
	spending[12] = yearTotals;
	return spending;
};

export const getBudgets = async (date) => {
	let budgetLimits = [];
	try {
		budgetLimits = await apiRequest("/api/budget-limits");
	} catch (error) {
		if (!isUnauthorized(error)) throw error;
	}
	const [categoriesData, transactions] = await Promise.all([getCategories(), getTransactionsByMonth(date)]);
	const categoricalSpending = getCategoricalSpending(transactions);

	let totalLimit = 0;
	let totalSpending = 0;
	let budgets = categoriesData.map((budget) => {
		const newBudget = { ...budget };
		const matchedBudget = budgetLimits.find((limitRow) => limitRow.categoryName === newBudget.name);
		newBudget.limit = matchedBudget ? Number(matchedBudget.limit) : null;
		newBudget.spending = categoricalSpending[newBudget.name] || 0;
		newBudget.percentage = newBudget.limit ? (newBudget.spending / newBudget.limit) * 100 : null;

		if (!ignoredCategories.includes(newBudget.name)) {
			if (newBudget.limit) totalLimit += newBudget.limit;
			totalSpending += newBudget.spending;
		}

		return newBudget;
	});

	budgets.sort((a, b) => a.orderIndex - b.orderIndex);

	const totalBudget = {
		name: "Total",
		limit: totalLimit > 0 ? totalLimit : null,
		spending: totalSpending,
		percentage: totalLimit > 0 ? (totalSpending / totalLimit) * 100 : null,
		color: "white",
		colorDark: "rgb(226 232 240)",
		colorLight: "rgb(248 250 252)",
	};
	budgets = [totalBudget, ...budgets];

	return budgets;
};

export const updateBudget = async (newBudgets) => {
	try {
		await apiRequest("/api/budgets", {
			method: "PUT",
			body: JSON.stringify({
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

export const createUpload = async (_userId, uploadId, files, transactionsUploaded) => {
	await apiRequest("/api/uploads", {
		method: "POST",
		body: JSON.stringify({
			upload: {
				id: uploadId,
				files,
				transactionsUploaded,
			},
		}),
	});
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
