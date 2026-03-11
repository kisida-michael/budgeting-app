import PropTypes from "prop-types";
import { useDataStore } from "../util/dataStore";
import { getBudgetFillColor, getBudgetRailStyle, getCategoryChipStyle } from "../util/themeStyles";

const DashboardStatsCategory = ({ category }) => {
	const theme = useDataStore((state) => state.theme);

	return (
		<div className="flex flex-col bg-transparent gap-1.5">
			<div className="w-full flex justify-between items-center">
				<div className="flex items-center gap-2">
					<span
						className="inline-flex rounded-md px-2 py-0.5 text-sm font-medium"
						style={getCategoryChipStyle({
							color: category.color,
							colorDark: category.colorDark,
							theme,
						})}
					>
						{category.name}
					</span>
					<span>{`${category.percentage.toFixed()}%`}</span>
				</div>
				<div className="font-semibold">{category.amount.toFixed(2)}</div>
			</div>
			<div
				className="h-2 w-full rounded-3xl overflow-hidden border"
				style={getBudgetRailStyle({
					colorLight: category.colorLight,
					colorDark: category.colorDark,
					theme,
				})}
			>
				<div
					className="h-full"
					style={{
						backgroundColor: getBudgetFillColor({
							colorDark: category.colorDark,
							percentage: category.percentage,
							theme,
						}),
						width: `${category.percentage}%`,
					}}
				></div>
			</div>
		</div>
	);
};

DashboardStatsCategory.propTypes = {
	category: PropTypes.object,
};

export default DashboardStatsCategory;
