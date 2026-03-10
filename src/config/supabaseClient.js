import { apiRequest } from "./apiClient";

const listeners = new Set();

const emitAuthChange = async (event, session) => {
	for (const listener of listeners) {
		await listener(event, session);
	}
};

const supabase = {
	auth: {
		async getSession() {
			try {
				const data = await apiRequest("/api/auth/session");
				return { data, error: null };
			} catch (error) {
				return { data: { session: null }, error };
			}
		},
		async signInWithPassword(credentials) {
			try {
				const data = await apiRequest("/api/auth/login", {
					method: "POST",
					body: JSON.stringify(credentials),
				});
				await emitAuthChange("SIGNED_IN", data.session);
				return { data, error: null };
			} catch (error) {
				return { data: { session: null }, error: { message: error.message } };
			}
		},
		async signUp(credentials) {
			try {
				const data = await apiRequest("/api/auth/signup", {
					method: "POST",
					body: JSON.stringify(credentials),
				});
				await emitAuthChange("SIGNED_IN", data.session);
				return { data, error: null };
			} catch (error) {
				return { data: { session: null }, error: { message: error.message } };
			}
		},
		async signOut() {
			try {
				await apiRequest("/api/auth/logout", {
					method: "POST",
				});
				await emitAuthChange("SIGNED_OUT", null);
				return { error: null };
			} catch (error) {
				return { error: { message: error.message } };
			}
		},
		onAuthStateChange(listener) {
			listeners.add(listener);
			return {
				data: {
					subscription: {
						unsubscribe() {
							listeners.delete(listener);
						},
					},
				},
			};
		},
	},
	from() {
		throw new Error("Direct table access has been removed. Use API-backed query helpers instead.");
	},
};

export default supabase;
