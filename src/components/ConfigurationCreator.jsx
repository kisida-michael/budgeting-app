import { useEffect, useState } from "react";
import DisabledConfigurationOptions from "./DisabledConfigurationOptions";
import ButtonSpinner from "./ButtonSpinner";
import CSVColNumOption from "./CSVColNumOption";
import CSVSymbolOption from "./CSVSymbolOption";
import ErrorMessage from "./ErrorMessage";
import { useDataStore } from "../util/dataStore";
import { deleteConfiguration, upsertConfiguration } from "../util/supabaseQueries";

const ConfigurationCreator = () => {
	const { configurations, configurationsLoading, fetchConfigurations } = useDataStore((state) => ({
		configurations: state.configurations,
		setConfigurations: state.setConfigurations,
		configurationsLoading: state.configurationsLoading,
		fetchConfigurations: state.fetchConfigurations,
	}));
	const [activeConfiguration, setActiveConfiguration] = useState(null);
	const [newConfigurationName, setNewConfigurationName] = useState("");
	const [newConfigurationError, setNewConfigurationError] = useState(null);
	const [saveConfigurationErrors, setSaveConfigurationErrors] = useState([]);
	const [successVisible, setSuccessVisible] = useState(false);
	const [loading, setLoading] = useState({
		save: false,
		delete: false,
	});

	const emptyConfiguration = {
		name: null,
		minusSymbolMeaning: null,
		plusSymbolMeaning: null,
		noSymbolMeaning: null,
		dateColNum: null,
		amountColNum: null,
		merchantColNum: null,
		hasHeader: false,
	};

	useEffect(() => {
		if (configurations === null) fetchConfigurations();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleClickConfiguration = (configurationName) => {
		if (Object.values(loading).some((value) => value)) return;

		setActiveConfiguration(configurations?.find((configuration) => configuration.name === configurationName));
		setNewConfigurationName("");
	};

	const handleCreateConfiguration = async () => {
		if (Object.values(loading).some((value) => value)) return;

		const empty = newConfigurationName === "";
		const tooLong = newConfigurationName.length > 25;
		const alreadyExists = configurations?.some((configuration) => configuration.name === newConfigurationName);
		if (empty || tooLong || alreadyExists) {
			if (empty) setNewConfigurationError("Configuration name cannot be empty.");
			else if (tooLong) setNewConfigurationError("Configuration name cannot be longer than 25 characters.");
			else if (alreadyExists) setNewConfigurationError("Configuration name already exists.");

			setTimeout(() => {
				setNewConfigurationError(null);
			}, 4000);
			return;
		}

		const newConfiguration = {
			...emptyConfiguration,
			name: newConfigurationName,
		};

		setNewConfigurationName("");
		setActiveConfiguration(newConfiguration);
	};

	const handleDeleteConfiguration = async () => {
		if (Object.values(loading).some((value) => value)) return;

		setLoading({ ...loading, delete: true });

		// Check if the active configuration is one that has been "created" but not saved, then we can just clear the active configuration
		if (configurations?.find((configuration) => configuration.name === activeConfiguration.name) === undefined) {
			setLoading({ ...loading, delete: false });
			setActiveConfiguration(null);
			return;
		}

		const success = await deleteConfiguration(activeConfiguration.name);
		if (!success) {
			setLoading({ ...loading, delete: false });
			setSaveConfigurationErrors(["Could not delete configuration."]);
			return;
		}

		fetchConfigurations();

		setActiveConfiguration(null);
		setLoading({ ...loading, delete: false });
	};

	const handleSaveConfiguration = async () => {
		if (Object.values(loading).some((value) => value)) return;

		setSaveConfigurationErrors([]);
		setLoading({ ...loading, save: true });

		const errors = [];
		if (activeConfiguration.name === null) errors.push("Configuration name cannot be empty.");
		if (activeConfiguration.name.length > 25)
			errors.push("Configuration name cannot be longer than 25 characters.");

		if (activeConfiguration.dateColNum === null) errors.push("Date column number cannot be empty.");
		else if (isNaN(activeConfiguration.dateColNum)) errors.push("Date column number must be a number.");

		if (activeConfiguration.amountColNum === null) errors.push("Amount column number cannot be empty.");
		if (isNaN(activeConfiguration.amountColNum)) errors.push("Amount column number must be a number.");

		if (activeConfiguration.merchantColNum === null) errors.push("Merchant column number cannot be empty.");
		else if (isNaN(activeConfiguration.merchantColNum)) errors.push("Merchant column number must be a number.");

		const selectedSymbolOptions = [];
		if (activeConfiguration.minusSymbolMeaning) selectedSymbolOptions.push(activeConfiguration.minusSymbolMeaning);
		if (activeConfiguration.plusSymbolMeaning) selectedSymbolOptions.push(activeConfiguration.plusSymbolMeaning);
		if (activeConfiguration.noSymbolMeaning) selectedSymbolOptions.push(activeConfiguration.noSymbolMeaning);
		if (selectedSymbolOptions.length != 2) {
			errors.push("Exactly two checkboxes should be selected signifying transactions minus/plus/no symbols.");
		} else {
			const credits = selectedSymbolOptions.filter((option) => option === "credit").length;
			if (credits != 1) errors.push("Exactly one checkbox should be selected for credit transactions.");
			const charges = selectedSymbolOptions.filter((option) => option === "charge").length;
			if (charges != 1) errors.push("Exactly one checkbox should be selected for charge transactions.");
		}

		// Check for errors before making Supabase call
		if (errors.length > 0) {
			setSaveConfigurationErrors(errors);
			setLoading({ ...loading, save: false });
			return;
		}

		const success = await upsertConfiguration(activeConfiguration);
		if (!success) {
			setSaveConfigurationErrors(["Could not save configuration."]);
			setLoading({ ...loading, save: false });
			return;
		}

		setNewConfigurationName("");
		fetchConfigurations();

		setLoading({ ...loading, save: false });
		setSuccessVisible(true);
		setTimeout(() => {
			setSuccessVisible(false);
		}, 2000);
	};

	return (
		<div className="w-full h-full flex bg-white rounded-2xl">
			<section className="flex flex-col w-3/12 border-r-2">
				<div className="grow overflow-y-auto p-6">
					<div className="text-lg text-slate-600 font-semibold mb-3">Configurations</div>
					<div className="flex flex-col gap-4">
						{!configurationsLoading &&
							configurations?.map((configuration, index) => (
								<div className="flex" key={index}>
									<button
										className={`${
											activeConfiguration?.name === configuration.name
												? "border-cGreen text-cGreen-dark font-medium"
												: "border-slate-300"
										} border rounded-lg grow p-2`}
										onClick={() => {
											handleClickConfiguration(configuration.name);
										}}
									>
										{configuration.name}
									</button>
								</div>
							))}
						{configurationsLoading && (
							<>
								<div className="rounded-lg animate-pulse bg-gray-100 grow p-2">
									<div className="h-4"></div>
								</div>
								<div className="rounded-lg animate-pulse bg-gray-100 grow p-2">
									<div className="h-4"></div>
								</div>
								<div className="rounded-lg animate-pulse bg-gray-100 grow p-2">
									<div className="h-4"></div>
								</div>
							</>
						)}
					</div>
				</div>
				<div className="border-t border-slate-300 px-8 pb-6 pt-4">
					<div className="border border-slate-300 rounded p-3 flex flex-col gap-2">
						<input
							className="border border-slate-300 rounded py-1 px-2 text-sm"
							type="text"
							placeholder="New Configuration Name"
							value={newConfigurationName}
							onChange={(e) => {
								setNewConfigurationError(null);
								setNewConfigurationName(e.target.value);
							}}
						/>
						<button
							className="bg-cGreen-light hover:bg-cGreen-lightHover border border-slate-300 rounded text-sm text-slate-700 p-1"
							onClick={handleCreateConfiguration}
						>
							Create
						</button>
						<ErrorMessage error={newConfigurationError} />
					</div>
				</div>
			</section>
			<section className="flex flex-col grow">
				{activeConfiguration ? (
					<>
						<div className="flex flex-col grow px-8 pt-8 pb-4 overflow-y-auto">
							<div className="mb-8">
								<div className="text-slate-500 mb-1">Configuration Name</div>
								<input
									className="w-1/2"
									type="text"
									value={activeConfiguration?.name || ""}
									onChange={(e) => {
										setActiveConfiguration({
											...activeConfiguration,
											name: e.target.value !== "" ? e.target.value : null,
										});
									}}
								/>
							</div>
							<div id="configOptionsContainer" className="mb-6">
								<div className="text-slate-500 text-xs mb-1 font-light italic">
									For date, amount, and merchant, enter the column number corresponding to these
									fields in your CSV.
								</div>
								<div className="flex flex-col gap-3">
									<CSVColNumOption
										name={"Date"}
										value={activeConfiguration?.dateColNum?.toString() || ""}
										onChange={(e) => {
											setActiveConfiguration({
												...activeConfiguration,
												dateColNum: e.target.value !== "" ? e.target.value : null,
											});
										}}
									/>

									<CSVColNumOption
										name={"Amount"}
										value={activeConfiguration?.amountColNum?.toString() || ""}
										onChange={(e) => {
											setActiveConfiguration({
												...activeConfiguration,
												amountColNum: e.target.value !== "" ? e.target.value : null,
											});
										}}
									/>

									<CSVColNumOption
										name={"Merchant"}
										value={activeConfiguration?.merchantColNum?.toString() || ""}
										onChange={(e) => {
											setActiveConfiguration({
												...activeConfiguration,
												merchantColNum: e.target.value !== "" ? e.target.value : null,
											});
										}}
									/>
								</div>
							</div>
							<div className="flex justify-between mb-6">
								<label>{"Does your CSV have a header?"}</label>
								<input
									className="accent-cGreen-light text-white bg-white"
									type="checkbox"
									checked={activeConfiguration.hasHeader}
									onChange={(e) => {
										setActiveConfiguration({
											...activeConfiguration,
											hasHeader: e.target.checked,
										});
									}}
								/>
							</div>
							<div className="flex flex-col gap-4">
								<CSVSymbolOption
									symbolMeaning={activeConfiguration?.minusSymbolMeaning}
									firstQuestion={"Does your CSV have minus (-) symbols?"}
									firstOnChange={(e) => {
										setActiveConfiguration({
											...activeConfiguration,
											minusSymbolMeaning: e.target.checked ? "charge" : null,
										});
									}}
									secondQuestion={"What does the minus symbol signify?"}
									secondOnChange={(e) =>
										setActiveConfiguration({
											...activeConfiguration,
											minusSymbolMeaning: e.target.value,
										})
									}
								/>

								<CSVSymbolOption
									symbolMeaning={activeConfiguration?.plusSymbolMeaning}
									firstQuestion={"Does your CSV have plus (+) symbols?"}
									firstOnChange={(e) => {
										setActiveConfiguration({
											...activeConfiguration,
											plusSymbolMeaning: e.target.checked ? "credit" : null,
										});
									}}
									secondQuestion={"What does the plus symbol signify?"}
									secondOnChange={(e) =>
										setActiveConfiguration({
											...activeConfiguration,
											plusSymbolMeaning: e.target.value,
										})
									}
								/>

								<CSVSymbolOption
									symbolMeaning={activeConfiguration?.noSymbolMeaning}
									firstQuestion={"Does your CSV have transactions without symbols?"}
									firstOnChange={(e) => {
										setActiveConfiguration({
											...activeConfiguration,
											noSymbolMeaning: e.target.checked ? "credit" : null,
										});
									}}
									secondQuestion={"What does these transactions signify?"}
									secondOnChange={(e) =>
										setActiveConfiguration({
											...activeConfiguration,
											noSymbolMeaning: e.target.value,
										})
									}
								/>
							</div>
							<div className={`${saveConfigurationErrors?.length > 0 ? "mt-3" : ""}`}>
								<ErrorMessage errors={saveConfigurationErrors} />
							</div>
						</div>

						<div className="border-t border-slate-300 flex justify-between px-8 py-4">
							<button
								className="relative bg-red-100 py-1 px-2 bg-cGreen-light border border-slate-300 rounded text-sm text-slate-700 p-1"
								onClick={handleDeleteConfiguration}
							>
								<span className={`${loading.delete ? "opacity-0" : ""}`}>Delete</span>
								{loading.delete && <ButtonSpinner />}
							</button>
							<div className="flex items-center gap-2">
								{successVisible && (
									<div className="text-xs text-cGreen-dark">Configuration saved successfully!</div>
								)}
								<button
									className="relative bg-blue-100 py-1 px-2 bg-cGreen-light border border-slate-300 rounded text-sm text-slate-700 p-1"
									onClick={handleSaveConfiguration}
								>
									<span className={`${loading.save ? "opacity-0" : ""}`}>Save</span>
									{loading.save && <ButtonSpinner />}
								</button>
							</div>
						</div>
					</>
				) : (
					<DisabledConfigurationOptions />
				)}
			</section>
		</div>
	);
};

export default ConfigurationCreator;
