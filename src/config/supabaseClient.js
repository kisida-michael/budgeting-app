const listeners = new Set();
let clerkAdapter = null;

const normalizeSession = (session) => {
	if (!session?.user?.id) return null;

	return {
		user: {
			id: session.user.id,
			email: session.user.email ?? "",
		},
	};
};

const createErrorResult = (error) => ({
	data: { session: null },
	error: { message: error instanceof Error ? error.message : String(error) },
});

export const emitAuthChange = async (event, session) => {
	const normalizedSession = normalizeSession(session);
	for (const listener of listeners) {
		await listener(event, normalizedSession);
	}
};

export const configureClerkAdapter = (adapter) => {
	clerkAdapter = adapter;
};

const requireAdapter = () => {
	if (!clerkAdapter) {
		throw new Error("Clerk auth adapter is not ready.");
	}

	return clerkAdapter;
};

const supabase = {
	auth: {
		async getSession() {
			try {
				const session = await requireAdapter().getSession();
				return { data: { session: normalizeSession(session) }, error: null };
			} catch (error) {
				return createErrorResult(error);
			}
		},
		async signInWithPassword(credentials) {
			try {
				const data = await requireAdapter().signInWithPassword(credentials);
				return { data: { session: normalizeSession(data?.session), ...data }, error: null };
			} catch (error) {
				return createErrorResult(error);
			}
		},
		async signUp(credentials) {
			try {
				const data = await requireAdapter().signUp(credentials);
				return { data: { session: normalizeSession(data?.session), ...data }, error: null };
			} catch (error) {
				return createErrorResult(error);
			}
		},
		async verifyEmailCode(payload) {
			try {
				const data = await requireAdapter().verifyEmailCode(payload);
				return { data: { session: normalizeSession(data?.session), ...data }, error: null };
			} catch (error) {
				return createErrorResult(error);
			}
		},
		async signOut() {
			try {
				await requireAdapter().signOut();
				return { error: null };
			} catch (error) {
				return { error: { message: error instanceof Error ? error.message : String(error) } };
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
