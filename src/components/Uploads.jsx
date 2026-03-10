import { useEffect, useRef, useState } from "react";
import { useDataStore } from "../util/dataStore";
import { deleteUpload } from "../util/supabaseQueries";
import ButtonSpinner from "./ButtonSpinner";

const Uploads = () => {
	const {
		uploads,
		uploadsLoading,
		setNotification,
		fetchUploads,
		fetchBudgets,
		fetchMerchantSettings,
		fetchTransactions,
		fetchDashboardStats,
	} = useDataStore((state) => ({
		uploads: state.uploads,
		setUploads: state.setUploads,
		uploadsLoading: state.uploadsLoading,
		filters: state.filters,
		setNotification: state.setNotification,
		fetchUploads: state.fetchUploads,
		fetchMerchantSettings: state.fetchMerchantSettings,
		fetchTransactions: state.fetchTransactions,
		fetchBudgets: state.fetchBudgets,
		fetchDashboardStats: state.fetchDashboardStats,
	}));
	const bottomRef = useRef(null);
	const [deleting, setDeleting] = useState(null);

	useEffect(() => {
		fetchUploads();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleDelete = async (uploadId) => {
		if (deleting !== null) return;

		setDeleting(uploadId);

		try {
			await deleteUpload(uploadId);
			await fetchUploads();
			await fetchMerchantSettings();
			await fetchTransactions();
			await fetchBudgets();
			await fetchDashboardStats();
			setNotification({ message: "Successfully deleted upload.", type: "success" });
		} catch (err) {
			setNotification({ message: `Failed to delete upload: ${err.message}`, type: "error" });
		} finally {
			setDeleting(null);
		}
	};

	return (
		<div className="grow flex flex-col">
			<div className="grow overflow-y-auto p-6">
				<div className="text-lg text-slate-600 font-semibold">Uploads</div>
				<div className="text-slate-500 mb-3">
					All uploads made past January 27, 2025 will be listed here. Deleting an upload will delete all
					transactions that were included in that upload. This is meant to be used if you made a mistake in
					your configuration and your transactions are formatted incorrectly, you accidentally double uploaded
					a file, etc.
				</div>
				<div className="flex flex-col gap-3">
					{uploadsLoading && (
						<div className="flex grow relative justify-center text-sm text-slate-500 items-center opacity-80">
							<ButtonSpinner />
							<div className="mt-16">Loading uploads...</div>
						</div>
					)}
					{!uploadsLoading && uploads?.length === 0 && (
						<div className="w-full border border-slate-300 rounded flex justify-center items-center py-3">
							{"No uploads found :("}
						</div>
					)}
					{!uploadsLoading &&
						uploads
							?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
							?.map((upload) => (
								<div
									key={upload.id}
									className="w-full border border-slate-300 p-3 rounded-lg flex flex-row gap-2"
								>
									<div className="flex flex-col grow gap-2">
										<div>
											<span className="font-semibold">Date:</span>{" "}
											{new Intl.DateTimeFormat("en-US", {
												month: "2-digit",
												day: "2-digit",
												year: "numeric",
												hour: "2-digit",
												minute: "2-digit",
											}).format(new Date(upload.created_at))}
										</div>
										<div>
											<span className="font-semibold">Transactions uploaded:</span>{" "}
											{upload.transactionsUploaded}
										</div>
										<div className="flex flex-col gap-1">
											<span className="font-semibold">{`Files:\n`}</span>
											{upload.files.split("\n").map((file) => (
												<div key={file}>{file}</div>
											))}
										</div>
									</div>
									<div>
										<button
											onClick={() => handleDelete(upload.id)}
											className="relative bg-red-100 py-1 px-2 bg-cGreen-light border border-slate-300 rounded text-sm text-slate-700 p-1"
										>
											{deleting === upload.id ? "Deleting..." : "Delete"}
										</button>
									</div>
								</div>
							))}
				</div>
				<div ref={bottomRef}></div>
			</div>
		</div>
	);
};

export default Uploads;
