const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
	constructor(message, status) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}

export const apiRequest = async (path, init = {}) => {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...(init.headers || {}),
		},
		...init,
	});

	const contentType = response.headers.get("content-type") ?? "";
	const payload = contentType.includes("application/json") ? await response.json() : await response.text();

	if (!response.ok) {
		throw new ApiError(payload?.error ?? payload ?? `Request failed with ${response.status}`, response.status);
	}

	return payload;
};
