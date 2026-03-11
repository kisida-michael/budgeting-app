import TransactionTable from "../components/TransactionTable";
import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDataStore } from "../util/dataStore";
import NotificationBanner from "../components/NotificationBanner";
import DashboardStats from "../components/DashboardStats";
import UploadModal from "../components/UploadModal";
import PlaidConnectionCard from "../components/PlaidConnectionCard";
import DashboardAttentionPanel from "../components/DashboardAttentionPanel";
import { applyDashboardFilters } from "../util/dashboardFilters";

const Dashboard = () => {
	const { transactions, setTransactions, transactionsLoading, categories, setFilters, setDashboardStats, setActiveSavedView } =
		useDataStore((state) => ({
		transactions: state.transactions,
		setTransactions: state.setTransactions,
		transactionsLoading: state.transactionsLoading,
		categories: state.categories,
		setFilters: state.setFilters,
		setDashboardStats: state.setDashboardStats,
		setActiveSavedView: state.setActiveSavedView,
	}));
	const [uploadModalVisible, setUploadModalVisible] = useState(false);
	const [uploadModalAnimating, setUploadModalAnimating] = useState(false);
	const location = useLocation();
	const navigate = useNavigate();
	const drilldownFilters = location.state?.transactionDrilldown?.filters ?? null;

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

	useEffect(() => {
		if (!drilldownFilters || !transactions) {
			return;
		}

		let cancelled = false;

		const applyDrilldown = async () => {
			await applyDashboardFilters({
				transactions,
				filters: drilldownFilters,
				categories: categories ?? [],
				setFilters,
				setDashboardStats,
				setActiveSavedView,
			});

			if (cancelled) return;

			navigate("/", { replace: true, state: null });

			window.setTimeout(() => {
				document.getElementById("transactions-panel")?.scrollIntoView({
					behavior: "smooth",
					block: "start",
				});
			}, 50);
		};

		applyDrilldown();

		return () => {
			cancelled = true;
		};
	}, [categories, drilldownFilters, navigate, setActiveSavedView, setDashboardStats, setFilters, transactions]);

	return (
		<div className="w-screen h-screen flex overflow-hidden relative">
			<Navbar activePage={"Dashboard"} />
			<div className="grow flex flex-col gap-3 h-full overflow-y-auto no-scrollbar bg-slate-100 p-4 md:p-8 lg:p-8 xl:p-16 2xl:p-32">
				<DashboardStats />
				<DashboardAttentionPanel />
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
