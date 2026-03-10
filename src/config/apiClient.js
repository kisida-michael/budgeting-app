const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";
let authTokenGetter = null;

export const setApiTokenGetter = (getter) => {
	authTokenGetter = getter;
};

export class ApiError extends Error {
	constructor(message, status) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}

export const apiRequest = async (path, init = {}) => {
	const token = authTokenGetter ? await authTokenGetter() : null;
	const response = await fetch(`${API_BASE_URL}${path}`, {
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
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
