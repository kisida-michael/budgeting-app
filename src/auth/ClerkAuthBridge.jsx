import PropTypes from "prop-types";
import { useAuth, useClerk, useSignUp, useUser } from "@clerk/react";
import { useSignIn } from "@clerk/react/legacy";
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

const derivePendingSignUp = (signUp) => {
	if (!signUp) return null;

	const emailVerificationStatus = signUp.verifications?.emailAddress?.status ?? null;
	const needsVerification =
		signUp.status === "missing_requirements" &&
		Boolean(signUp.emailAddress) &&
		emailVerificationStatus !== "verified";

	if (!needsVerification) return null;

	return {
		needsVerification: true,
		email: signUp.emailAddress ?? "",
	};
};

const getIncompleteSignUpMessage = (signUp) => {
	if (!signUp) return null;

	const missingFields = Array.isArray(signUp.missingFields)
		? signUp.missingFields.filter((field) => !["email_address", "password"].includes(field))
		: [];

	if (missingFields.length > 0) {
		return `This Clerk signup requires additional fields: ${missingFields.join(", ")}. Disable those required fields in Clerk or extend this preserved login form.`;
	}

	const unverifiedFields = Array.isArray(signUp.unverifiedFields) ? signUp.unverifiedFields : [];
	if (unverifiedFields.includes("email_address")) {
		return "Email verification is still pending. Try the code again or resend a fresh code.";
	}

	return null;
};

const ClerkAuthBridge = ({ children }) => {
	const { isLoaded, isSignedIn, getToken } = useAuth();
	const { user } = useUser();
	const { setActive, signOut } = useClerk();
	const { signIn } = useSignIn();
	const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
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
				const signUpResult = await signUp.password({
					emailAddress: email,
					password,
				});
				if (signUpResult.error) {
					throw signUpResult.error;
				}

				const sendCodeResult = await signUp.verifications.sendEmailCode();
				if (sendCodeResult.error) {
					throw sendCodeResult.error;
				}

				const incompleteMessage = getIncompleteSignUpMessage(signUp);
				if (incompleteMessage && !derivePendingSignUp(signUp)) {
					throw new Error(incompleteMessage);
				}

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
				if (signUp.status === "complete") {
					const finalizeResult = await signUp.finalize();
					if (finalizeResult.error) {
						throw finalizeResult.error;
					}

					return { session: buildSession(user) };
				}

				const verifyResult = await signUp.verifications.verifyEmailCode({
					code,
				});
				if (verifyResult.error) {
					throw verifyResult.error;
				}

				const finalizeResult = await signUp.finalize();
				if (finalizeResult.error) {
					throw new Error(getIncompleteSignUpMessage(signUp) ?? getErrorMessage(finalizeResult.error));
				}

				return { session: buildSession(user) };
			} catch (error) {
				throw new Error(getErrorMessage(error));
			}
		},
		async resendEmailCode() {
			if (!isLoaded || !signUp) {
				throw new Error("Authentication is still loading.");
			}

			try {
				const result = await signUp.verifications.sendEmailCode();
				if (result.error) {
					throw result.error;
				}
			} catch (error) {
				throw new Error(getErrorMessage(error));
			}
		},
		async resetSignUp() {
			if (!isLoaded || !signUp) {
				throw new Error("Authentication is still loading.");
			}

			try {
				const result = await signUp.reset();
				if (result.error) {
					throw result.error;
				}
			} catch (error) {
				throw new Error(getErrorMessage(error));
			}
		},
		async getPendingSignUp() {
			if (!isLoaded || signUpFetchStatus === "fetching") {
				return null;
			}

			return derivePendingSignUp(signUp);
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
