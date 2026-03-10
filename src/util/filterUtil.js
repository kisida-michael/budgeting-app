export const filterTransactions = (transactions, filters) => {
	const filterTypes = ["Date", "Merchant", "Category", "Configuration", "Amount", "Search"];
	let filteredTransactions = [...transactions];
	filterTypes.forEach((filterType) => {
		const matchingFilters = filters.filter((filter) => filter.type === filterType);

		if (matchingFilters.length > 0) {
			const matchingTransactions = [];
			matchingFilters.forEach((filter) => {
				filteredTransactions.forEach((transaction) => {
					let isMatchingTransaction = false;

					if (filter.type === "Date") {
						const transactionDate = new Date(transaction.date);
						const startDate = new Date(`${filter.start.month}/${filter.start.day}/${filter.start.year}`);
						const endDate = new Date(`${filter.end.month}/${filter.end.day}/${filter.end.year}`);
						isMatchingTransaction = transactionDate >= startDate && transactionDate <= endDate;
					} else if (filter.type === "Merchant") {
						// TODO: Maybe later break up the search term and rank search results based on matches
						isMatchingTransaction = transaction.merchant
							.toLowerCase()
							.includes(filter.merchant.toLowerCase());
					} else if (filter.type === "Category") {
						isMatchingTransaction = transaction.categoryName === filter.category.name;
					} else if (filter.type === "Configuration") {
						isMatchingTransaction = transaction.configurationName === filter.configuration;
					} else if (filter.type === "Amount") {
						const transactionAmount = parseFloat(transaction.amount);
						const filterAmount = parseFloat(filter.amount);
						isMatchingTransaction =
							(filter.condition === "lessThan" && transactionAmount < filterAmount) ||
							(filter.condition === "greaterThan" && transactionAmount > filterAmount) ||
							(filter.condition === "equals" && transactionAmount === filterAmount);
					} else if (filter.type === "Search") {
						const query = filter.query.toLowerCase().trim();
						const searchableText = [
							transaction.merchant,
							transaction.categoryName,
							transaction.configurationName,
							transaction.date,
							transaction.amount?.toString(),
						]
							.filter(Boolean)
							.join(" ")
							.toLowerCase();

						isMatchingTransaction = query.length === 0 || searchableText.includes(query);
					}

					if (
						isMatchingTransaction &&
						!matchingTransactions.some((existingTransaction) => existingTransaction.id === transaction.id)
					) {
						matchingTransactions.push(transaction);
					}
				});
			});

			filteredTransactions = [...matchingTransactions];
		}
	});

	return filteredTransactions;
};
