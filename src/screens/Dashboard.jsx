import TransactionTable from "../components/TransactionTable";
import Navbar from "../components/Navbar";
import { useState } from "react";
import { useDataStore } from "../util/dataStore";
import NotificationBanner from "../components/NotificationBanner";
import DashboardStats from "../components/DashboardStats";
import UploadModal from "../components/UploadModal";
import PlaidConnectionCard from "../components/PlaidConnectionCard";

const Dashboard = () => {
	const { transactions, setTransactions, transactionsLoading } = useDataStore((state) => ({
		transactions: state.transactions,
		setTransactions: state.setTransactions,
		transactionsLoading: state.transactionsLoading,
	}));
	const [uploadModalVisible, setUploadModalVisible] = useState(false);
	const [uploadModalAnimating, setUploadModalAnimating] = useState(false);

	const openUploadModal = () => {
		setUploadModalAnimating(true);
		setUploadModalVisible(true);
		setTimeout(() => {
			setUploadModalAnimating(false);
		}, 100);
	};

	const closeUploadModal = () => {
		setUploadModalAnimating(true);
		setUploadModalVisible(false);
		setTimeout(() => {
			setUploadModalAnimating(false);
		}, 100);
	};

	return (
		<div className="w-screen h-screen flex overflow-hidden relative">
			<Navbar activePage={"Dashboard"} />
			<div className="grow flex flex-col gap-3 h-full overflow-y-auto no-scrollbar bg-slate-100 p-4 md:p-8 lg:p-8 xl:p-16 2xl:p-32">
				<DashboardStats />
				<PlaidConnectionCard />
				<TransactionTable
					transactions={transactions}
					setTransactions={setTransactions}
					transactionsLoading={transactionsLoading}
					linkToTransactionsPage={true}
					openUploadModal={openUploadModal}
				/>
			</div>
			<NotificationBanner />
			<UploadModal
				modalVisible={uploadModalVisible}
				setModalVisible={setUploadModalVisible}
				modalAnimating={uploadModalAnimating}
				setModalAnimating={setUploadModalAnimating}
				openUploadModal={openUploadModal}
				closeUploadModal={closeUploadModal}
			/>
		</div>
	);
};

export default Dashboard;
