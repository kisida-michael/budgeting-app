import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkLoaded, ClerkLoading, ClerkProvider } from "@clerk/react";
import App from "./App.jsx";
import ClerkAuthBridge from "./auth/ClerkAuthBridge.jsx";
import "./index.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
	throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		<ClerkProvider publishableKey={clerkPublishableKey}>
			<ClerkLoading />
			<ClerkLoaded>
				<ClerkAuthBridge>
					<App />
				</ClerkAuthBridge>
			</ClerkLoaded>
		</ClerkProvider>
	</React.StrictMode>
);
