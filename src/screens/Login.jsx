import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isEmailWhitelisted } from "../util/userUtil";
import ErrorMessage from "../components/ErrorMessage";
import supabase from "../config/supabaseClient";

const Login = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [verificationCode, setVerificationCode] = useState("");
	const [verificationPending, setVerificationPending] = useState(false);
	const [loginVisible, setLoginVisible] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
		let active = true;

		const hydratePendingSignUp = async () => {
			const { data, error } = await supabase.auth.getPendingSignUp();
			if (!active || error || !data?.pendingSignUp?.needsVerification) return;

			setEmail(data.pendingSignUp.email ?? "");
			setVerificationPending(true);
			setLoginVisible(false);
		};

		void hydratePendingSignUp();

		return () => {
			active = false;
		};
	}, []);

	const toggleForm = async () => {
		if (verificationPending) {
			await supabase.auth.resetSignUp();
		}

		setEmail("");
		setPassword("");
		setConfirmPassword("");
		setVerificationCode("");
		setVerificationPending(false);
		setError(null);
		setLoginVisible(!loginVisible);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			if (verificationPending) await handleVerifyEmailCode();
			else if (loginVisible) await handleLogin();
			else await handleSignup();
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleLogin = async () => {
		const { error } = await supabase.auth.signInWithPassword({
			email: email,
			password: password,
		});

		if (error) {
			setError(error.message);
			return;
		}

		navigate(0);
	};

	const handleSignup = async () => {
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		if (!(await isEmailWhitelisted(email))) {
			setError(
				"Sorry, your email is not whitelisted for signup. Please send an email to jordansheehan26@gmail.com to get your email whitelisted."
			);
			return;
		}

		const { error } = await supabase.auth.signUp({
			email,
			password,
		});

		if (error) {
			setError(error.message);
			return;
		}

		setVerificationPending(true);
		setError(null);
	};

	const handleVerifyEmailCode = async () => {
		const { error } = await supabase.auth.verifyEmailCode({
			code: verificationCode,
		});

		if (error) {
			setError(error.message);
			return;
		}

		navigate(0);
	};

	const handleResendVerificationCode = async () => {
		setIsSubmitting(true);
		const { error } = await supabase.auth.resendEmailCode();
		setIsSubmitting(false);

		if (error) {
			setError(error.message);
			return;
		}

		setError(null);
	};

	const handleStartOver = async () => {
		setIsSubmitting(true);
		const { error } = await supabase.auth.resetSignUp();
		setIsSubmitting(false);

		if (error) {
			setError(error.message);
			return;
		}

		setVerificationCode("");
		setVerificationPending(false);
		setError(null);
	};

	return (
		<div className="w-screen h-screen flex justify-center items-center bg-slate-100">
			<div className="w-1/3 p-5 bg-white border border-slate-300 rounded-lg">
				<div className="text-xl text-slate-600 font-semibold mb-3">
					{verificationPending ? "Verify Email" : `${loginVisible ? "Login" : "Signup"}`}
				</div>
				<form className="flex flex-col gap-4 mb-3" onSubmit={handleSubmit}>
					{!verificationPending && (
						<>
							<div>
								<div className="text-slate-500 mb-0.5">Email</div>
								<input
									className="border border-slate-300 w-full rounded py-1 px-2 text-sm"
									type="email"
									value={email}
									onChange={(e) => {
										setEmail(e.target.value);
										setError(null);
									}}
								/>
							</div>
							<div>
								<div className="text-slate-500 mb-0.5">Password</div>
								<input
									className="border border-slate-300 w-full rounded py-1 px-2 text-sm"
									type="password"
									value={password}
									onChange={(e) => {
										setPassword(e.target.value);
										setError(null);
									}}
								/>
							</div>
						</>
					)}
					{!loginVisible && !verificationPending && (
						<>
							<div>
								<div className="text-slate-500 mb-0.5">Confirm Password</div>
								<input
									className="border border-slate-300 w-full rounded py-1 px-2 text-sm"
									type="password"
									value={confirmPassword}
									onChange={(e) => {
										setConfirmPassword(e.target.value);
										setError(null);
									}}
								/>
							</div>
							<div id="clerk-captcha" className="min-h-16" />
						</>
					)}
					{verificationPending && (
						<div>
							<div className="text-slate-500 mb-0.5">Email Verification Code</div>
							<input
								className="border border-slate-300 w-full rounded py-1 px-2 text-sm"
								type="text"
								value={verificationCode}
								onChange={(e) => {
									setVerificationCode(e.target.value);
									setError(null);
								}}
							/>
						</div>
					)}
					<button
						type="submit"
						disabled={isSubmitting}
						className="bg-cGreen-light hover:bg-cGreen-lightHover border border-slate-300 rounded text-sm text-slate-700 p-1"
					>
						{verificationPending ? "Verify Email" : `${loginVisible ? "Login" : "Signup"}`}
					</button>
				</form>
				<div className="mb-3">
					<ErrorMessage error={error} />
				</div>
				{verificationPending && (
					<div className="flex justify-between text-sm mb-3">
						<button
							type="button"
							className="underline"
							disabled={isSubmitting}
							onClick={handleResendVerificationCode}
						>
							Resend Code
						</button>
						<button type="button" className="underline" disabled={isSubmitting} onClick={handleStartOver}>
							Start Over
						</button>
					</div>
				)}
				<div className={`w-full flex justify-center ${verificationPending ? "hidden" : ""}`}>
					<button
						className="text-sm underline"
						onClick={(e) => {
							e.preventDefault();
							void toggleForm();
						}}
					>
						{`${loginVisible ? "Don't have an account? Sign up." : "Already have an account? Login."}`}
					</button>
				</div>
			</div>
		</div>
	);
};

export default Login;
