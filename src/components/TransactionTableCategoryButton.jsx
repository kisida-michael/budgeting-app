import { useAnimationStore } from "../util/animationStore";
import ButtonSpinner from "./ButtonSpinner";
import PropTypes from "prop-types";
import { getSelectableCategories } from "../util/categorySelections";
import { useDataStore } from "../util/dataStore";
import { getCategoryChipStyle } from "../util/themeStyles";

const TransactionTableCategoryButton = ({
	transaction,
	tableRef,
	categories,
	categoriesLoading,
	editTransactionCategory,
	categoryUpdateLoading,
}) => {
	const { visibleCategoryMenu, animatingCategoryMenu, menuDirectionDown, openCategoryMenu, closeCategoryMenu } =
		useAnimationStore((state) => ({
			visibleCategoryMenu: state.visibleCategoryMenu,
			animatingCategoryMenu: state.animatingCategoryMenu,
			menuDirectionDown: state.categoryMenuDirectionDown,
			openCategoryMenu: state.openCategoryMenu,
			closeCategoryMenu: state.closeCategoryMenu,
		}));
	const theme = useDataStore((state) => state.theme);
	const transactionCategory = categories?.find((category) => category.name === transaction.categoryName);

	return (
		<>
			<button
				ref={(ref) => {
					transaction.buttonRef = ref;
				}}
				onClick={
					transaction.ignored
						? () => {} // If the transaction is ignored, do nothing
						: visibleCategoryMenu === transaction.id
						? closeCategoryMenu
						: () => openCategoryMenu(transaction.id, transaction.buttonRef, tableRef)
				}
				className={`${
					transaction.ignored ? "hover:cursor-default" : ""
				} category-button inline-block px-1.5 py-0.5 border rounded text-sm font-medium`}
				style={getCategoryChipStyle({
					color: transactionCategory?.color,
					colorDark: transactionCategory?.colorDark,
					theme,
				})}
			>
				{transaction.categoryName}
			</button>
			{/** Checks if this menu is either currently visible or being animated to be visible/invisible */}
			{(visibleCategoryMenu === transaction.id || animatingCategoryMenu === transaction.id) && (
				<div
					className={`${
						animatingCategoryMenu === transaction.id // First checks if this menu is being animated
							? visibleCategoryMenu === transaction.id // If it is, then check if it should become visible or invisible
								? "enter"
								: "exit"
							: ""
					} ${
						// Check if the menu should be below or above the button, based on available space
						menuDirectionDown ? "dropdown-down top-[130%]" : "dropdown-up bottom-[130%]"
					} absolute bg-white border border-slate-300 rounded-lg drop-shadow-sm z-10 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950`}
				>
					<div className="font-semibold text-slate-600 mb-1 dark:text-slate-100">Edit Category</div>
					{/** Map each category to be displayed in the dropdown menu */}
					<div className={`${categoryUpdateLoading ? "opacity-0" : ""} flex flex-col gap-1 relative`}>
						{!categoriesLoading &&
							getSelectableCategories(categories, transaction.categoryName).map((category) => (
								<button
									key={category.name}
									className="category-button text-sm px-3 py-0.5 rounded font-medium"
									style={getCategoryChipStyle({
										color: category.color,
										colorDark: category.colorDark,
										theme,
									})}
									onClick={
										!categoryUpdateLoading
											? () => editTransactionCategory(transaction, category.name)
											: () => {}
									}
								>
									{category.name}
								</button>
							))}
					</div>
					{categoryUpdateLoading && <ButtonSpinner />}
				</div>
			)}
		</>
	);
};

TransactionTableCategoryButton.propTypes = {
	transaction: PropTypes.object,
	tableRef: PropTypes.object,
	categories: PropTypes.array,
	categoriesLoading: PropTypes.bool,
	editTransactionCategory: PropTypes.func,
	categoryUpdateLoading: PropTypes.bool,
};

export default TransactionTableCategoryButton;
