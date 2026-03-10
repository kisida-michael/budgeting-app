import PropTypes from "prop-types";
import { useAuth, useClerk, useUser } from "@clerk/react";
import { useSignIn, useSignUp } from "@clerk/react/legacy";
import { configureClerkAdapter, emitAuthChange } from "../config/supabaseClient";
import { setApiTokenGetter } from "../config/apiClient";
import { useEffect } from "react";

const getErrorMessage = (error) => {
	if (Array.isArray(error?.errors) && error.errors.length > 0) {
		return error.errors[0].longMessage || error.errors[0].message || "Authentication failed.";
	}

	return error?.message || "Authentication failed.";
};

const buildSession = (user) => {
	if (!user?.id) return null;

	return {
		user: {
			id: user.id,
			email: user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? "",
		},
	};
};

const ClerkAuthBridge = ({ children }) => {
	const { isLoaded, isSignedIn, getToken } = useAuth();
	const { user } = useUser();
	const { setActive, signOut } = useClerk();
	const { signIn } = useSignIn();
	const { signUp } = useSignUp();
	const currentSession = buildSession(user);

	configureClerkAdapter({
		async getSession() {
			if (!isLoaded) return null;
			return currentSession;
		},
		async signInWithPassword({ email, password }) {
			if (!isLoaded || !signIn) {
				throw new Error("Authentication is still loading.");
			}

			try {
				const result = await signIn.create({
					identifier: email,
					password,
				});

				if (result.status !== "complete" || !result.createdSessionId) {
					throw new Error("Clerk did not complete sign-in.");
				}

				await setActive({ session: result.createdSessionId });
				return { session: currentSession };
			} catch (error) {
				throw new Error(getErrorMessage(error));
			}
		},
		async signUp({ email, password }) {
			if (!isLoaded || !signUp) {
				throw new Error("Authentication is still loading.");
			}

			try {
				await signUp.create({
					emailAddress: email,
					password,
				});
				await signUp.prepareEmailAddressVerification({
					strategy: "email_code",
				});

				return { session: null, needsVerification: true };
			} catch (error) {
				throw new Error(getErrorMessage(error));
			}
		},
		async verifyEmailCode({ code }) {
			if (!isLoaded || !signUp) {
				throw new Error("Authentication is still loading.");
			}

			try {
				const result = await signUp.attemptEmailAddressVerification({
					code,
				});

				if (result.status !== "complete" || !result.createdSessionId) {
					throw new Error("Email verification did not complete.");
				}

				await setActive({ session: result.createdSessionId });
				return { session: currentSession };
			} catch (error) {
				throw new Error(getErrorMessage(error));
			}
		},
		async signOut() {
			await signOut();
		},
	});

	setApiTokenGetter(async () => {
		if (!isLoaded || !isSignedIn) return null;
		return await getToken();
	});

	useEffect(() => {
		if (!isLoaded) return;
		emitAuthChange(isSignedIn ? "SIGNED_IN" : "SIGNED_OUT", currentSession);
	}, [currentSession, isLoaded, isSignedIn]);

	return children;
};

ClerkAuthBridge.propTypes = {
	children: PropTypes.node,
};

export default ClerkAuthBridge;
