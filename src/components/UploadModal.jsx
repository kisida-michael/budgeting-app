import { useState, useEffect, useRef, Fragment } from "react";
import { insertTransactions, createUpload } from "../util/supabaseQueries";
import {
	parseTransactionsFromCSV,
	checkForDuplicateTransactions,
	checkForSavedMerchants,
} from "../util/transactionUtil";
import { useDataStore } from "../util/dataStore";
import { useAnimationStore } from "../util/animationStore";
import ButtonSpinner from "../components/ButtonSpinner";

const UploadModal = () => {
	const [stagedFiles, setStagedFiles] = useState([]);
	const [pendingTransactions, setPendingTransactions] = useState([]);
	const [pendingUploadId, setPendingUploadId] = useState(null);
	const [duplicateTransactions, setDuplicateTransactions] = useState([]);
	const [loading, setLoading] = useState(false);
	const fileInputRef = useRef(null);
	const MAX_FILES = 10;
	const {
		configurations,
		fetchConfigurations,
		fetchMerchantSettings,
		setNotification,
		fetchTransactions,
		fetchDashboardStats,
		fetchUploads,
		merchantSettings,
		session,
	} = useDataStore((state) => ({
		configurations: state.configurations,
		fetchConfigurations: state.fetchConfigurations,
		fetchMerchantSettings: state.fetchMerchantSettings,
		setNotification: state.setNotification,
		fetchTransactions: state.fetchTransactions,
		fetchDashboardStats: state.fetchDashboardStats,
		fetchUploads: state.fetchUploads,
		merchantSettings: state.merchantSettings,
		session: state.session,
	}));
	const { uploadModalVisible, uploadModalAnimating, closeUploadModal } = useAnimationStore((state) => ({
		uploadModalVisible: state.uploadModalVisible,
		uploadModalAnimating: state.uploadModalAnimating,
		closeUploadModal: state.closeUploadModal,
	}));

	useEffect(() => {
		if (!uploadModalVisible && !uploadModalAnimating) return;

		if (configurations === null) fetchConfigurations();
		if (merchantSettings === null) fetchMerchantSettings();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [uploadModalVisible, uploadModalAnimating, configurations, merchantSettings]);

	const onStageFile = (event) => {
		const stagedFileNames = stagedFiles.map((stagedFile) => stagedFile.file.name); // Existing staged files
		const allNewFiles = Array.from(event.target.files);
		const allNewFileNames = allNewFiles.map((file) => file.name);

		if (allNewFiles.length + stagedFiles.length > MAX_FILES) {
			setNotification({
				message: `Uploading these files would exceed the limit. A maximum of ${MAX_FILES} files can be staged at a time.`,
				type: "error",
			});
			return;
		}

		const conflictingFileCount = stagedFiles.filter((stagedFile) =>
			allNewFileNames.includes(stagedFile.file.name)
		).length;
		if (conflictingFileCount > 0) {
			setNotification({
				message: `${conflictingFileCount} ${
					conflictingFileCount > 1
						? "files had identical names to files that are already staged and were ignored."
						: "file had an identical name to a file that was already staged and was ignored."
				}`,
				type: "error",
			});

			if (conflictingFileCount === allNewFiles.length) {
				setLoading(false);
				fileInputRef.current.value = "";
				return;
			}
		}

		// Files that do not have conflicting names with existing files
		const newFiles = Array.from(event.target.files).filter((newFile) => !stagedFileNames.includes(newFile.name)); // Only files that are not already staged

		const newStagedFiles = newFiles.map((newFile, index) => ({
			file: newFile,
			configuration: null,
			add_index: stagedFiles.length + index,
		}));

		setStagedFiles([...stagedFiles, ...newStagedFiles]);
		fileInputRef.current.value = ""; // Clear out the input's file - disables default behavior that stops the user from uploading duplicates
	};

	const setStagedFileConfiguration = (fileObj, configuration) => {
		const otherStagedFiles = stagedFiles.filter((stagedFile) => stagedFile.file.name !== fileObj.file.name);
		setStagedFiles([...otherStagedFiles, { ...fileObj, configuration }]);
	};

	const onFileUpload = async () => {
		if (loading) return;
		setLoading(true);

		if (stagedFiles.length === 0) {
			setNotification({ message: "Please select at least one file to upload.", type: "error" });
			setLoading(false);
			return;
		}

		if (stagedFiles.some((stagedFile) => !stagedFile?.configuration)) {
			setNotification({ message: "Please select a configuration for all files.", type: "error" });
			setLoading(false);
			return;
		}

		try {
			// Generate a UUID for this upload
			const uploadId = crypto.randomUUID();

			// Create promises to read each file
			const promises = [];
			for (const stagedFile of stagedFiles) {
				let filePromise = new Promise((resolve) => {
					let reader = new FileReader();
					reader.readAsText(stagedFile.file);
					reader.onload = () => resolve(reader.result);
				});
				promises.push(filePromise);
			}

			// Once all promises are resolved, parse transactions
			let transactions = [];
			Promise.all(promises).then((fileContents) => {
				fileContents.forEach((fileContent, index) => {
					const parsedTransactions = parseTransactionsFromCSV(
						fileContent,
						configurations?.find(
							(configuration) => configuration.name === stagedFiles[index].configuration
						),
						session.user.id,
						uploadId
					);
					transactions.push(...parsedTransactions);
				});
			});

			const duplicateResults = await checkForDuplicateTransactions(transactions);
			if (duplicateResults.length > 0) {
				setPendingTransactions(
					transactions.filter((t) => !duplicateResults.some((d) => d.tempInsertId === t.tempInsertId))
				);
				setPendingUploadId(uploadId);
				setDuplicateTransactions(duplicateResults);
				setLoading(false);
				return;
			}

			transactions = transactions.map((transaction) => {
				delete transaction.tempInsertId;
				return transaction;
			});

			transactions = checkForSavedMerchants(transactions, merchantSettings);

			const fileNames = stagedFiles
				.map((stagedFile) => stagedFile.file.name + ` (${stagedFile.configuration})`)
				.join("\n");
			await createUpload(session.user.id, uploadId, fileNames, transactions.length);
			await insertTransactions(transactions);
			await fetchTransactions();
			await fetchDashboardStats();
			await fetchUploads();
		} catch (error) {
			setNotification({ message: error.message, type: "error" });
			setLoading(false);
			return;
		}

		onClose();
		setNotification({ message: "Transactions uploaded successfully!", type: "success" });
		setLoading(false);
	};

	const onDuplicateUpload = async () => {
		setLoading(true);
		let transactions = [...pendingTransactions];

		duplicateTransactions.forEach((duplicate) => {
			if (duplicate.include) {
				transactions.push(duplicate);
			}
		});

		transactions = transactions.map((transaction) => {
			delete transaction.tempInsertId;
			delete transaction.include;
			return transaction;
		});

		transactions = checkForSavedMerchants(transactions, merchantSettings);

		const fileNames = stagedFiles
			.map((stagedFile) => stagedFile.file.name + ` (${stagedFile.configuration})`)
			.join("\n");
		await createUpload(session.user.id, pendingUploadId, fileNames, transactions.length);
		await insertTransactions(transactions);
		await fetchTransactions();
		await fetchDashboardStats();
		await fetchUploads();

		onClose();
		setNotification({ message: "Transactions uploaded successfully!", type: "success" });
		setLoading(false);
	};

	const onClose = () => {
		closeUploadModal();
		setDuplicateTransactions([]);
		setPendingTransactions([]);
		setPendingUploadId(null);
		setStagedFiles([]);
		document.querySelector("#fileInput").value = "";
		setLoading(false);
	};

	const onCancelDuplicateUpload = () => {
		setPendingTransactions([]);
		setDuplicateTransactions([]);
		setPendingUploadId(null);
	};

	return (
		<>
			{uploadModalVisible || uploadModalAnimating ? (
				<div
					onClick={onClose}
					className={`${uploadModalAnimating ? (uploadModalVisible ? "enter" : "exit") : ""}
			z-[99] overflow-hidden upload-modal top-0 left-0 absolute w-full h-full flex items-center justify-center bg-[rgba(0,0,0,0.25)]`}
				>
					<div
						onClick={(e) => {
							e.stopPropagation();
						}}
						className="w-1/2 overflow-hidden flex flex-col gap-2 bg-white rounded-xl border border-slate-200"
					>
						<div
							className="w-[200%] flex items-center transition-[all] duration-300"
							style={{ transform: duplicateTransactions.length > 0 ? "translateX(-50%)" : "" }}
						>
							{/* First Section (Contains the Upload Transactions form) */}
							<div className="w-1/2 p-3 flex flex-col gap-5">
								<div className="flex w-full justify-between items-center px-3 py-2.5 border border-slate-200 rounded-[0.4rem]">
									<div className="text-base text-slate-600 font-semibold">Upload Transactions</div>
									<button onClick={onClose}>
										<img src="./close.svg" alt="close" className="w-3" />
									</button>
								</div>

								{/* STAGED FILES CONTAINER */}
								<div>
									<div className="text-[0.8rem] mb-0.5">Staged Files</div>
									<div className="border border-slate-200 rounded-[0.4rem]">
										{stagedFiles.length === 0 && (
											<div className="flex justify-center items-center p-2 text-slate-400 text-sm">
												None selected
											</div>
										)}
										{stagedFiles
											.sort((a, b) => a.add_index - b.add_index)
											.map((fileObj, index) => (
												<Fragment key={fileObj.file.name}>
													{index > 0 && <div className="h-[1px] bg-slate-300 mx-2"></div>}
													<div className="flex justify-between items-center gap-2 px-3 py-4">
														<div className="grow text-[0.8rem] text-wrap">
															{fileObj.file.name}
														</div>
														<div className="flex w-[40%] h-full shrink-0">
															<select
																className="p-0.5 grow text-[0.8rem] bg-white rounded border border-slate-300"
																value={
																	stagedFiles.find(
																		(stagedFile) =>
																			stagedFile.file.name === fileObj.file.name
																	)?.configuration || ""
																}
																onChange={(e) =>
																	setStagedFileConfiguration(fileObj, e.target.value)
																}
															>
																<option value="" disabled>
																	Select a configuration
																</option>
																{configurations?.map((configuration) => (
																	<option
																		key={configuration.name}
																		value={configuration.name}
																	>
																		{configuration.name}
																	</option>
																))}
															</select>
														</div>
														<button
															className="relative bg-red-100 py-1 px-2 bg-cGreen-light border border-slate-300 rounded text-xs text-slate-700 p-1"
															onClick={() => {
																setStagedFiles(
																	stagedFiles.filter(
																		(stagedFile) =>
																			stagedFile.file.name !== fileObj.file.name
																	)
																);
															}}
														>
															Delete
														</button>
													</div>
												</Fragment>
											))}
									</div>
								</div>

								<div className="flex justify-between w-full gap-5">
									<input
										id="fileInput"
										name="fileInput"
										accept=".csv"
										type="file"
										className="inputfile"
										onChange={onStageFile}
										ref={fileInputRef}
										multiple
									/>
									<label
										htmlFor="fileInput"
										className="border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-normal px-2 py-1 border-slate-300 border rounded"
									>
										Choose files
									</label>
									<button
										className="relative bg-cGreen-light hover:bg-cGreen-lightHover border border-slate-300 rounded text-sm text-slate-700 py-1 px-3"
										onClick={onFileUpload}
									>
										<span className={`${loading ? "opacity-0" : ""}`}>Upload</span>
										{loading && <ButtonSpinner />}
									</button>
								</div>
							</div>

							{/* Second Section (Contains the Duplicate Transactions form) */}
							<div
								className={`${
									duplicateTransactions.length > 0 ? "h-[40vh]" : "h-0"
								} transition-[all] duration-300 w-1/2 p-4 flex flex-col gap-3`}
							>
								<div>
									<div className="text-base text-slate-600 font-semibold">
										Duplicate Transactions Detected
									</div>
									<div className="text-xs text-slate-500 italic">
										The following transactions share an identical date, merchant, amount, and
										configuration with an existing transaction and will automatically be ignored.
										Check any transactions that you would like to include.
									</div>
								</div>
								<div className="grow border border-slate-200 rounded overflow-auto">
									{duplicateTransactions.map((transaction, index) => (
										<div
											key={index}
											className={`${
												index < duplicateTransactions.length - 1 ? "border-b" : ""
											} border-slate-200 w-full py-1.5 text-sm flex items-center px-2`}
										>
											<div className="w-[15%] pr-2">{transaction.date}</div>
											<div className="w-[50%] pr-3">{transaction.merchant}</div>
											<div className="w-[17%] pr-3">{transaction.configurationName}</div>
											<div
												className={`${
													transaction.amount.toString().includes("-")
														? "text-cGreen-dark"
														: ""
												} w-[13%] pr-2`}
											>
												{transaction.amount.toFixed(2)}
											</div>
											<div className="w-[5%] flex justify-center items-center">
												<input
													className="w-full"
													type="checkbox"
													checked={transaction?.include || false}
													onChange={(e) => {
														setDuplicateTransactions(
															duplicateTransactions.map((duplicate) => {
																if (
																	duplicate.tempInsertId === transaction.tempInsertId
																) {
																	duplicate.include = e.target.checked;
																}
																return duplicate;
															})
														);
													}}
												/>
											</div>
										</div>
									))}
								</div>
								{pendingTransactions.length == 0 && (
									<div>
										<p className="text-xs text-slate-500 italic bg-cGreen-lightTrans border border-cGreen rounded p-2">
											<span className="font-bold inline">NOTE: </span>All transactions were
											detected as duplicates. Either select at least one transaction to be
											included or cancel the upload.
										</p>
									</div>
								)}
								<div className="flex justify-between items-center">
									<button
										onClick={onCancelDuplicateUpload}
										className="border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-normal px-2 py-1 border-slate-300 border rounded"
									>
										Cancel
									</button>
									<button
										onClick={
											pendingTransactions.length === 0 &&
											duplicateTransactions.filter((d) => d.include).length === 0
												? () => {}
												: onDuplicateUpload
										}
										className={`${
											pendingTransactions.length === 0 &&
											duplicateTransactions.filter((d) => d.include).length === 0
												? "opacity-40 hover:cursor-default"
												: ""
										} relative font-normal text-slate-600 bg-cGreen-light hover:bg-cGreen-lightHover border border-slate-300 rounded text-sm py-1 px-3`}
									>
										<span className={`${loading ? "opacity-0" : ""}`}>Upload</span>
										{loading && <ButtonSpinner />}
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			) : (
				""
			)}
		</>
	);
};

export default UploadModal;
