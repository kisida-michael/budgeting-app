import { useEffect, useState } from "react";
import { apiRequest } from "../config/apiClient";

const PlaidConnectionCard = () => {
	const [status, setStatus] = useState({ available: false, reason: "Checking Plaid configuration..." });

	useEffect(() => {
		const loadStatus = async () => {
			try {
				const data = await apiRequest("/api/plaid/status");
				setStatus(data);
			} catch (error) {
				setStatus({
					available: false,
					reason: error.message,
				});
			}
		};

		loadStatus();
	}, []);

	return (
		<div className="w-full bg-white border border-slate-300 rounded-2xl p-5 flex justify-between items-center gap-4">
			<div>
				<div className="text-lg text-slate-600 font-semibold mb-1">Bank Connections</div>
				<div className="text-slate-500 text-sm">
					{status.available
						? "Plaid is configured and ready for bank connections."
						: "Plaid setup is not finished yet for this environment."}
				</div>
				<div className="text-xs text-slate-400 mt-1">{status.reason}</div>
			</div>
			<button
				disabled={!status.available}
				className={`${
					!status.available ? "opacity-50 cursor-default" : ""
				} font-normal text-slate-600 bg-cGreen-light hover:bg-cGreen-lightHover border border-slate-300 rounded text-sm py-2 px-3`}
			>
				Connect Bank
			</button>
		</div>
	);
};

export default PlaidConnectionCard;
