import { apiRequest } from "../config/apiClient";

export const isEmailWhitelisted = async (email) => {
	try {
		const data = await apiRequest(`/api/auth/whitelist?email=${encodeURIComponent(email)}`);
		return data.whitelisted === true;
	} catch {
		console.error("Could not get whitelisted emails.");
		return false;
	}
};
