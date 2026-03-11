import { useState } from "react";
import PropTypes from "prop-types";
import { previewMerchantRule } from "../util/supabaseQueries";
import { useDataStore } from "../util/dataStore";
import { getCategoryChipStyle } from "../util/themeStyles";
import ButtonSpinner from "./ButtonSpinner";

const MerchantRuleTester = ({ disabled }) => {
	const { setNotification, theme } = useDataStore((state) => ({
		setNotification: state.setNotification,
		theme: state.theme,
	}));
	const [merchantText, setMerchantText] = useState("");
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState(null);

	const onTestRule = async () => {
		if (loading || disabled || merchantText.trim().length === 0) return;

		setLoading(true);
		try {
			const nextResult = await previewMerchantRule(merchantText.trim());
			setResult(nextResult);
		} catch (error) {
			setNotification({
				type: "error",
				message: error instanceof Error ? error.message : "Could not preview merchant rule.",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="border border-slate-300 rounded-xl p-4 mb-4 flex flex-col gap-3 dark:border-slate-800 dark:bg-slate-900/60">
			<div>
				<div className="text-sm font-semibold text-slate-600 dark:text-slate-100">Test Merchant Rule</div>
				<div className="text-sm text-slate-500 dark:text-slate-400">
					Type a merchant string to preview which saved rule would win after rule ordering is applied.
				</div>
			</div>
			<div className="flex flex-col gap-2 md:flex-row">
				<input
					value={merchantText}
					onChange={(event) => setMerchantText(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							onTestRule();
						}
					}}
					placeholder="Ex: WHOLE FOODS MARKET 1023"
					className="grow border border-slate-300 rounded px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
				/>
				<button
					onClick={onTestRule}
					disabled={loading || disabled || merchantText.trim().length === 0}
					className={`relative border border-slate-300 rounded px-3 py-2 text-sm ${
						loading || disabled || merchantText.trim().length === 0
							? "cursor-default bg-cGreen-light text-slate-400 opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500"
							: "bg-cGreen-light text-slate-700 dark:border-cGreen/40 dark:bg-cGreen dark:text-slate-950 dark:hover:bg-cGreen-light"
					}`}
				>
					<span className={loading ? "opacity-0" : ""}>Test Rule</span>
					{loading && <ButtonSpinner />}
				</button>
			</div>
			{result && (
				<div className="border border-slate-200 rounded-lg px-3 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/70">
					<div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
						Preview Result
					</div>
					{result.matched && result.rule ? (
						<div className="flex flex-col gap-2">
							<div className="text-slate-600 dark:text-slate-200">
								Rule #{result.rulePosition} would match this merchant.
							</div>
							<div className="text-slate-500 dark:text-slate-400">
								When merchant <span className="underline">{result.rule.type}</span>{" "}
								<span className="font-semibold text-slate-600 dark:text-slate-100">
									{result.rule.text}
								</span>
								, categorize as
							</div>
							<div
								className="inline-flex w-fit rounded px-2 py-1 text-sm font-medium"
								style={getCategoryChipStyle({
									color: result.rule.category.color,
									colorDark: result.rule.category.colorDark,
									theme,
								})}
							>
								{result.rule.category.name}
							</div>
						</div>
					) : (
						<div className="text-slate-500 dark:text-slate-400">
							No saved merchant rule would match. This would remain uncategorized unless another workflow
							assigns a category.
						</div>
					)}
				</div>
			)}
		</div>
	);
};

MerchantRuleTester.propTypes = {
	disabled: PropTypes.bool,
};

export default MerchantRuleTester;
