import { apiRequest } from "../config/apiClient";

export const getDashboardStats = async (_transactions, filters) => {
	return await apiRequest("/api/dashboard/stats", {
		method: "POST",
		body: JSON.stringify({ filters }),
	});
};
