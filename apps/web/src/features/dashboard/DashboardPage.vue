<template>
	<RDataGate :loading="store.loading" :ready="store.initialized" :error="store.error" @retry="initializeData">
		<section class="dashboard-page">
			<section class="dashboard-welcome">
				<div class="dashboard-welcome__copy">
					<h1>把资产、交易与物品，<br />整理成更清晰的生活秩序</h1>
					<p>在 Rizhi，统一管理你的交易、资产与物品，清楚每一笔收支，<br />掌握资产状况，物品去向不再遗忘，重要事项及时提醒，<br />让生活与财务井井有条。</p>
				</div>
				<div class="dashboard-welcome__visual" aria-hidden="true"><img src="/dashboard-hero.png" alt="" /></div>
			</section>
			<section class="dashboard-entry-grid" aria-label="快速入口">
				<button class="dashboard-entry dashboard-entry--purple" type="button"
					@click="router.push('/assets')"><span class="dashboard-entry__icon">
						<Package :size="32" :stroke-width="1.8" />
					</span><span class="dashboard-entry__arrow">
						<ChevronRight :size="15" :stroke-width="2" />
					</span><strong>物品</strong>
					<p>管理物品信息与所在位置，<br />物品去向清晰可查。</p>
				</button>
				<button class="dashboard-entry dashboard-entry--blue" type="button"
					@click="router.push('/ledger')"><span class="dashboard-entry__icon">▤</span><span
						class="dashboard-entry__arrow">
						<ChevronRight :size="15" :stroke-width="2" />
					</span><strong>记账</strong>
					<p>轻松记录每一笔收支，<br />分类清晰，账目一目了然。</p>
				</button>
				<button class="dashboard-entry dashboard-entry--green" type="button"
					@click="router.push('/funds')"><span class="dashboard-entry__icon">◔</span><span
						class="dashboard-entry__arrow">
						<ChevronRight :size="15" :stroke-width="2" />
					</span><strong>资产</strong>
					<p>全面管理各类资产与负债，<br />掌握净资产变化趋势。</p>
				</button>

			</section>
			<header class="page-head">
				<div>
					<h1>数据总览</h1>
					<p>关注净资产、支出趋势、即将过保和即将还款。</p>
				</div>
			</header>

			<div class="stat-grid">
				<StatCard v-for="item in statCards" :key="item.label" :label="item.label" :value="item.value"
					:change="item.change" :sign="item.sign" @click="openStatCard(item.target)" />
			</div>

			<div class="panel-grid panel-grid--three">
				<AssetMiniList title="即将过保的物品" :items="expiringAssets" @select="goAsset" />
				<AssetMiniList title="即将还款的账户" :items="repaymentAccounts" @select="goFundAccount" />
				<AssetMiniList title="闲置较久的物品" :items="idleAssets" @select="goAsset" />
			</div>

			<div class="panel-grid panel-grid--three panel-grid--bottom">
				<RCard>
					<section class="chart-card">
						<h3>本月收支趋势</h3>
						<div class="chart-card__lines">
							<div class="chart-card__y-axis" aria-hidden="true">
								<span v-for="tick in trendTicks" :key="tick.label"
									:style="{ top: `${tick.top}%` }">{{ tick.label }}</span>
							</div>
							<svg viewBox="0 0 300 140" role="img" aria-label="本月收支趋势">
								<defs>
									<linearGradient id="dashboard-income-fill" x1="0" x2="0" y1="0" y2="1">
										<stop offset="0" stop-color="#2f7cff" stop-opacity=".2" />
										<stop offset="1" stop-color="#2f7cff" stop-opacity="0" />
									</linearGradient>
									<linearGradient id="dashboard-expense-fill" x1="0" x2="0" y1="0" y2="1">
										<stop offset="0" stop-color="#f05268" stop-opacity=".16" />
										<stop offset="1" stop-color="#f05268" stop-opacity="0" />
									</linearGradient>
								</defs>
								<path v-if="incomeTrendPath" class="trend-area income-area"
									:d="`${incomeTrendPath} L 290 126 L 10 126 Z`" />
								<path v-if="expenseTrendPath" class="trend-area expense-area"
									:d="`${expenseTrendPath} L 290 126 L 10 126 Z`" />
								<g class="chart-grid" aria-hidden="true">
									<line v-for="tick in trendTicks" :key="tick.label" x1="0" x2="300" :y1="tick.y"
										:y2="tick.y" />
								</g>
								<path v-if="incomeTrendPath" class="trend-line" :d="incomeTrendPath" />
								<path v-if="expenseTrendPath" class="trend-line expense" :d="expenseTrendPath" />
								<g v-for="point in trendPointMarkers" :key="`${point.type}-${point.index}`"
									@mouseenter="hoveredTrendPoint = point" @mouseleave="hoveredTrendPoint = null">
									<circle class="trend-hit-area" :cx="point.x" :cy="point.y" r="9" />
								</g>
							</svg>
							<div v-if="hoveredTrendPoint" class="chart-card__tooltip">
								<span>{{ hoveredTrendPoint.day }}日 ·
									{{ hoveredTrendPoint.type === 'income' ? '收入' : '支出' }}</span>
								<strong>{{ formatTrendAmount(hoveredTrendPoint.value) }}</strong>
							</div>
							<div v-if="!incomeTrendPoints && !expenseTrendPoints" class="chart-empty">本月暂无收支趋势</div>
						</div>
						<div class="chart-card__legend">
							<RTag tone="info">收入</RTag>
							<RTag tone="danger">支出</RTag>
						</div>
					</section>
				</RCard>
				<AssetMiniList title="日均成本最高的物品 TOP5" :items="dailyCostTop" @select="goAsset" />
				<AssetMiniList title="最近交易记录" :items="recentLedger" @select="goLedgerTransaction" />
			</div>
		</section>
	</RDataGate>
</template>

<script setup lang="ts">
	import AssetMiniList from "@/components/business/AssetMiniList.vue";
	import StatCard from "@/components/business/StatCard.vue";
	import RCard from "@/components/ui/RCard.vue";
	import RTag from "@/components/ui/RTag.vue";
	import RDataGate from "@/components/ui/RDataGate.vue";
	import { ChevronRight, Package } from "@lucide/vue";
	import { assetTotalCost } from "@/domain/assetCalculations";
	import type { AssetRecord, TransactionRecord } from "@/domain/models";
	import { useAppDataStore } from "@/stores/appDataStore";
	import { computed, onMounted, ref } from "vue";
	import { useRouter } from "vue-router";

	type MiniListItem = {
		id ?: string;
		name : string;
		meta : string;
		value : string;
		tone ?: "success" | "danger";
		icon ?: string;
	};

	const store = useAppDataStore();
	const router = useRouter();

	onMounted(initializeData);

	async function initializeData() {
		await store.init().catch(() => undefined);
	}

	const now = computed(() => new Date());
	const currentMonthRange = computed(() => monthRange(now.value));
	const lastMonthRange = computed(() => monthRange(new Date(now.value.getFullYear(), now.value.getMonth() - 1, 1)));
	const thisMonthTransactions = computed(() => transactionsInRange(currentMonthRange.value.start, currentMonthRange.value.end));
	const lastMonthTransactions = computed(() => transactionsInRange(lastMonthRange.value.start, lastMonthRange.value.end));

	const thisMonthIncome = computed(() => transactionIncome(thisMonthTransactions.value));
	const thisMonthExpense = computed(() => transactionExpense(thisMonthTransactions.value));
	const lastMonthIncome = computed(() => transactionIncome(lastMonthTransactions.value));
	const lastMonthExpense = computed(() => transactionExpense(lastMonthTransactions.value));
	const thisMonthBalance = computed(() => thisMonthIncome.value - thisMonthExpense.value);
	const statCards = computed(() => [
		{ label: "净资产", value: store.netWorth, change: "当前账户余额", sign: "none" as const, target: "funds" as const },
		{ label: "总资产", value: store.totalAssetBalance, change: `${store.assetAccounts.length} 个资产账户`, sign: "none" as const, target: "asset-accounts" as const },
		{ label: "总负债", value: -store.totalLiabilityBalance, change: `${store.liabilityAccounts.length} 个负债账户`, sign: "auto" as const, target: "liability-accounts" as const },
		{ label: "本月收入", value: thisMonthIncome.value, change: compareText(thisMonthIncome.value, lastMonthIncome.value), sign: "none" as const, target: "income" as const },
		{ label: "本月支出", value: thisMonthExpense.value, change: compareText(thisMonthExpense.value, lastMonthExpense.value, true), sign: "none" as const, target: "expense" as const },
		{ label: "本月结余", value: thisMonthBalance.value, change: `${thisMonthTransactions.value.length} 条交易`, sign: "auto" as const, target: "balance" as const },
	]);

	const expiringAssets = computed<MiniListItem[]>(() => store.assets
		.filter((asset) => asset.status === "using" && warrantyDays(asset) !== undefined)
		.map((asset) => ({
			name: asset.name,
			id: asset.id,
			meta: categoryName(asset.categoryId),
			value: `剩余 ${warrantyDays(asset)} 天`,
			tone: (warrantyDays(asset) ?? 0) <= 30 ? "danger" as const : undefined,
			icon: iconText(asset.name),
		}))
		.sort((a, b) => Number(a.value.match(/\d+/)?.[0] ?? 0) - Number(b.value.match(/\d+/)?.[0] ?? 0))
		.slice(0, 4));

	const repaymentAccounts = computed<MiniListItem[]>(() => store.liabilityAccounts
		.filter((account) => account.repaymentDay && account.balance > 0)
		.map((account) => ({
			name: account.name,
			id: account.id,
			meta: account.institution || accountTypeLabel(account.type),
			value: formatSignedAmount(-account.balance),
			tone: "danger" as const,
			icon: account.icon || iconText(account.name),
			days: daysUntilMonthlyDay(account.repaymentDay ?? 1),
		}))
		.sort((a, b) => a.days - b.days)
		.slice(0, 4)
		.map(({ days: _days, ...item }) => item));

	const idleAssets = computed<MiniListItem[]>(() => store.assets
		.filter((asset) => asset.status === "idle" || Boolean(asset.lastUsedAt))
		.map((asset) => ({
			name: asset.name,
			id: asset.id,
			meta: categoryName(asset.categoryId),
			idleDays: idleDays(asset),
			value: `闲置 ${idleDays(asset)} 天`,
			tone: idleDays(asset) >= 30 ? "success" as const : undefined,
			icon: iconText(asset.name),
		}))
		.filter((item) => item.idleDays > 0)
		.sort((a, b) => b.idleDays - a.idleDays)
		.slice(0, 4)
		.map(({ idleDays: _idleDays, ...item }) => item));

	const dailyCostTop = computed<MiniListItem[]>(() => store.assets
		.filter((asset) => asset.status !== "disposed")
		.map((asset) => {
			const totalCost = assetTotalCost(asset, store.assetAddons);
			return {
				name: asset.name,
				id: asset.id,
				meta: categoryName(asset.categoryId),
				dailyCost: totalCost / heldDays(asset),
				value: `${formatAmount(totalCost / heldDays(asset))}/天`,
				icon: iconText(asset.name),
			};
		})
		.sort((a, b) => b.dailyCost - a.dailyCost)
		.slice(0, 5)
		.map(({ dailyCost: _dailyCost, ...item }) => item));

	const recentLedger = computed<MiniListItem[]>(() => [...store.transactions]
		.filter((transaction) => transaction.businessType !== "balance_adjustment")
		.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
		.slice(0, 5)
		.map((transaction) => ({
			id: transaction.id,
			name: transaction.note || transaction.merchant || transactionTypeLabel(transaction.type),
			meta: transaction.categorySnapshot?.subCategoryName
				? `${transaction.categorySnapshot.categoryName} / ${transaction.categorySnapshot.subCategoryName}`
				: transaction.categorySnapshot?.categoryName ?? transactionTypeLabel(transaction.type),
			value: transactionAmountText(transaction),
			tone: transactionTone(transaction),
			icon: iconText(transaction.categorySnapshot?.categoryName || transactionTypeLabel(transaction.type)),
		})));

	const incomeTrendValues = computed(() => monthlyTrend("income"));
	const expenseTrendValues = computed(() => monthlyTrend("expense"));
	const trendMax = computed(() => Math.max(...incomeTrendValues.value, ...expenseTrendValues.value, 1));
	const trendTicks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
		label: trendValueLabel(trendMax.value * (1 - ratio)),
		top: ratio * 100,
		y: 14 + ratio * 112,
	})));
	const incomeTrendPoints = computed(() => toPolylinePoints(incomeTrendValues.value, 300, 140, trendMax.value));
	const expenseTrendPoints = computed(() => toPolylinePoints(expenseTrendValues.value, 300, 140, trendMax.value));
	const incomeTrendPath = computed(() => toSmoothPath(incomeTrendValues.value, 300, 140, trendMax.value));
	const expenseTrendPath = computed(() => toSmoothPath(expenseTrendValues.value, 300, 140, trendMax.value));
	type TrendPoint = { x : number; y : number; index : number; day : number; value : number; type : "income" | "expense" };
	const hoveredTrendPoint = ref<TrendPoint | null>(null);
	const trendPointMarkers = computed<TrendPoint[]>(() => [
		...trendCoordinates(incomeTrendValues.value, 300, 140, trendMax.value).map((point, index) => ({ ...point, index, day: index + 1, value: incomeTrendValues.value[index], type: "income" as const })),
		...trendCoordinates(expenseTrendValues.value, 300, 140, trendMax.value).map((point, index) => ({ ...point, index, day: index + 1, value: expenseTrendValues.value[index], type: "expense" as const })),
	].filter((point) => point.value > 0));

	function trendValueLabel(value : number) {
		return value >= 1000 ? `¥${(value / 1000).toFixed(1)}k` : `¥${Math.round(value)}`;
	}

	function formatTrendAmount(value : number) {
		return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	}

	function goAsset(item : MiniListItem) {
		if (!item.id) return;
		router.push(`/assets/${item.id}`);
	}

	function goFundAccount(item : MiniListItem) {
		if (!item.id) return;
		router.push({ path: "/funds", query: { accountId: item.id } });
	}

	function goLedgerTransaction(item : MiniListItem) {
		if (!item.id) return;
		router.push({ path: "/ledger", query: { transactionId: item.id } });
	}

	function openStatCard(target : "funds" | "asset-accounts" | "liability-accounts" | "income" | "expense" | "balance") {
		if (target === "funds") {
			router.push("/funds");
		} else if (target === "asset-accounts") {
			router.push({ path: "/funds", query: { view: "asset" } });
		} else if (target === "liability-accounts") {
			router.push({ path: "/funds", query: { view: "liability" } });
		} else {
			router.push({
				path: "/ledger",
				query: {
					type: target === "balance" ? "all" : target,
					month: "current",
				},
			});
		}
	}

	function monthRange(date : Date) {
		const start = new Date(date.getFullYear(), date.getMonth(), 1);
		const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
		return { start, end };
	}

	function transactionsInRange(start : Date, end : Date) {
		return store.transactions.filter((transaction) => {
			const time = new Date(transaction.occurredAt).getTime();
			return time >= start.getTime() && time <= end.getTime();
		});
	}

	function transactionIncome(transactions : TransactionRecord[]) {
		return transactions
			.filter((transaction) => transaction.businessType !== "balance_adjustment")
			.filter((transaction) => transaction.type === "income" || transaction.type === "refund")
			.reduce((sum, transaction) => sum + transaction.amount, 0);
	}

	function transactionExpense(transactions : TransactionRecord[]) {
		return transactions
			.filter((transaction) => transaction.businessType !== "balance_adjustment")
			.filter((transaction) => transaction.type === "expense" || transaction.type === "asset_purchase" || transaction.type === "repayment")
			.reduce((sum, transaction) => sum + transaction.amount, 0);
	}

	function compareText(current : number, previous : number, reverseTone = false) {
		if (previous === 0) return current === 0 ? "本月暂无变化" : "本月新增";
		const delta = current - previous;
		const rate = Math.abs(delta / previous * 100).toFixed(1);
		const arrow = delta >= 0 ? "↑" : "↓";
		const prefix = reverseTone ? "较上月" : "较上月";
		return `${prefix} ${arrow} ${rate}%`;
	}

	function warrantyDays(asset : AssetRecord) {
		if (!asset.warrantyEndDate) return undefined;
		return Math.max(0, Math.ceil((new Date(asset.warrantyEndDate).getTime() - Date.now()) / 86_400_000));
	}

	function heldDays(asset : AssetRecord) {
		return Math.max(1, Math.ceil((Date.now() - new Date(asset.purchaseDate).getTime()) / 86_400_000));
	}

	function idleDays(asset : AssetRecord) {
		const date = asset.idleSince || asset.lastUsedAt;
		if (!date) return 0;
		return Math.max(0, Math.ceil((Date.now() - new Date(date).getTime()) / 86_400_000));
	}

	function daysUntilMonthlyDay(day : number) {
		const today = new Date();
		const target = new Date(today.getFullYear(), today.getMonth(), day);
		if (target.getTime() < today.getTime()) target.setMonth(target.getMonth() + 1);
		return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86_400_000));
	}

	function categoryName(categoryId : string) {
		return store.categories.find((category) => category.id === categoryId)?.name ?? "未分类";
	}

	function accountTypeLabel(type : string) {
		return ({
			cash: "现金",
			wallet: "电子钱包",
			debit_card: "储蓄卡",
			credit_card: "信用卡",
			consumer_credit: "消费信用",
			loan: "贷款",
			investment: "投资账户",
			other: "其他账户",
		} as Record<string, string>)[type] ?? "账户";
	}

	function transactionTypeLabel(type : TransactionRecord["type"]) {
		return ({ income: "收入", expense: "支出", transfer: "转账", refund: "退款", repayment: "还款", asset_purchase: "资产购买" } satisfies Record<TransactionRecord["type"], string>)[type];
	}

	function transactionTone(transaction : TransactionRecord) : MiniListItem["tone"] {
		return transaction.type === "income" || transaction.type === "refund" ? "success" : transaction.type === "transfer" ? undefined : "danger";
	}

	function transactionAmountText(transaction : TransactionRecord) {
		if (transaction.type === "transfer") return formatAmount(transaction.amount);
		const sign = transactionTone(transaction) === "success" ? "+" : "-";
		return `${sign}${formatAmount(transaction.amount)}`;
	}

	function formatAmount(value : number) {
		return `¥${Math.abs(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	}

	function formatSignedAmount(value : number) {
		return `${value > 0 ? "+" : value < 0 ? "-" : ""}${formatAmount(value)}`;
	}

	function iconText(value : string) {
		return (value || "日").slice(0, 1);
	}

	function monthlyTrend(type : "income" | "expense") {
		const daysInMonth = currentMonthRange.value.end.getDate();
		const values = Array.from({ length: daysInMonth }, () => 0);
		thisMonthTransactions.value.forEach((transaction) => {
			const isTarget = type === "income"
				? transaction.type === "income" || transaction.type === "refund"
				: transaction.type === "expense" || transaction.type === "asset_purchase" || transaction.type === "repayment";
			if (!isTarget) return;
			const day = new Date(transaction.occurredAt).getDate();
			values[day - 1] += transaction.amount;
		});
		return values;
	}

	function trendCoordinates(values : number[], width : number, height : number, max : number) {
		const verticalPadding = 14;
		const horizontalPadding = 10;
		const usableWidth = width - horizontalPadding * 2;
		const usableHeight = height - verticalPadding * 2;
		return values.map((value, index) => ({
			x: horizontalPadding + (index / Math.max(values.length - 1, 1)) * usableWidth,
			y: height - verticalPadding - (value / Math.max(max, 1)) * usableHeight,
		}));
	}

	function toPolylinePoints(values : number[], width : number, height : number, max : number) {
		const hasData = values.some((value) => value > 0);
		if (!hasData) return "";
		return trendCoordinates(values, width, height, max).map(({ x, y }) => `${Number(x.toFixed(1))},${Number(y.toFixed(1))}`).join(" ");
	}

	function toSmoothPath(values : number[], width : number, height : number, max : number) {
		if (!values.some((value) => value > 0)) return "";
		const points = trendCoordinates(values, width, height, max);
		return points.reduce((path, point, index) => {
			if (index === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
			const previous = points[index - 1];
			const midX = ((previous.x + point.x) / 2).toFixed(1);
			return `${path} Q ${midX} ${previous.y.toFixed(1)} ${midX} ${((previous.y + point.y) / 2).toFixed(1)} Q ${midX} ${point.y.toFixed(1)} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
		}, "");
	}
</script>

<style scoped>
	.dashboard-page {
		display: grid;
		gap: var(--space-5);
		min-height: calc(100vh - 100px);
		align-content: space-between;
		padding: 42px 56px 52px;
		/* background: radial-gradient(circle at 78% 24%, rgba(234, 236, 243, 1.0), transparent 42%), #f8faff; */
	}

	.dashboard-page>.page-head,
	.dashboard-page>.stat-grid,
	.dashboard-page>.panel-grid {
		display: none;
	}

	.dashboard-welcome {
		display: grid;
		grid-template-columns: .92fr 1.08fr;
		align-items: center;
		min-height: 480px;
	}

	.dashboard-welcome__copy {
		position: relative;
		z-index: 1;
		padding-left: 42px;
	}

	.dashboard-welcome__copy h1 {
		margin: 0;
		color: #122957;
		font-size: clamp(30px, 2.7vw, 44px);
		line-height: 1.28;
		letter-spacing: -.045em;
		font-weight: 900;
	}

	.dashboard-welcome__copy p {
		margin: 30px 0 0;
		color: #5a6d91;
		font-size: 18px;
		line-height: 2;
	}

	.dashboard-welcome__visual {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
	}

	.dashboard-welcome__visual img {
		display: block;
		width: min(100%, 760px);
		max-height: 520px;
		object-fit: contain;
		opacity: .92;
		mix-blend-mode: multiply;
		filter: saturate(.86) contrast(.94);
		-webkit-mask-image: radial-gradient(ellipse at center, #000 48%, rgba(0, 0, 0, .78) 72%, transparent 100%);
		mask-image: radial-gradient(ellipse at center, #000 48%, rgba(0, 0, 0, .78) 72%, transparent 100%);
	}

	.dashboard-entry-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 32px;
		width: min(100%, 1030px);
		margin: 0 auto;
	}

	.dashboard-entry {
		position: relative;
		min-height: 244px;
		padding: 30px 30px 28px;
		color: #132653;
		text-align: left;
		background: rgba(255, 255, 255, .92);
		border: 1px solid rgba(216, 226, 244, .84);
		border-radius: 24px;
		box-shadow: 0 20px 46px rgba(60, 91, 150, .11);
		cursor: pointer;
		transition: transform .2s ease, box-shadow .2s ease;
	}

	.dashboard-entry:hover {
		transform: translateY(-4px);
		box-shadow: 0 26px 54px rgba(60, 91, 150, .18);
	}

	.dashboard-entry__icon {
		display: grid;
		width: 68px;
		height: 68px;
		place-items: center;
		border-radius: 20px;
		font-size: 34px;
		font-weight: 800;
	}

	.dashboard-entry--blue .dashboard-entry__icon {
		color: #2475f5;
		background: #eaf2ff;
	}

	.dashboard-entry--green .dashboard-entry__icon {
		color: #16b982;
		background: #eafbf4;
	}

	.dashboard-entry--purple .dashboard-entry__icon {
		color: #7256e8;
		background: #f0edff;
	}

	.dashboard-entry__arrow {
		position: absolute;
		top: 31px;
		right: 30px;
		display: grid;
		width: 24px;
		height: 24px;
		place-items: center;
		color: #2475f5;
		border: 1.5px solid currentColor;
		border-radius: 50%;
		font-size: 20px;
		line-height: 0;
	}

	.dashboard-entry strong {
		display: block;
		margin-top: 18px;
		font-size: 22px;
		font-weight: 900;
	}

	.dashboard-entry p {
		margin: 10px 0 0;
		color: #627395;
		font-size: 15px;
		line-height: 1.8;
	}

	.page-head h1 {
		margin: 0;
		font-size: var(--font-section-title);
		line-height: 24px;
	}

	.page-head p {
		margin: var(--space-1) 0 0;
		color: var(--color-text-tertiary);
		font-size: var(--font-caption);
	}

	.stat-grid {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: var(--space-4);
	}

	.panel-grid {
		display: grid;
		gap: var(--space-4);
	}

	.panel-grid--three {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.panel-grid--bottom {
		align-items: stretch;
	}

	.chart-card {
		height: 100%;
		padding: var(--space-4);
	}

	.chart-card h3 {
		margin: 0 0 var(--space-3);
		font-size: var(--font-card-title);
	}

	.chart-card__lines {
		position: relative;
		height: 150px;
		padding: 0 4px 0 34px;
		border-bottom: 1px solid var(--color-border-soft);
	}

	.chart-card svg {
		width: 100%;
		height: 100%;
	}

	.chart-card__y-axis {
		position: absolute;
		inset: 0 auto 0 0;
		width: 30px;
		color: var(--color-text-tertiary);
		font-size: 10px;
		text-align: right;
	}

	.chart-card__y-axis span {
		position: absolute;
		right: 0;
		transform: translateY(-50%);
		white-space: nowrap;
	}

	.chart-grid line {
		stroke: var(--color-border-soft);
		stroke-dasharray: 3 5;
		stroke-width: 1;
	}

	.chart-card .trend-area {
		stroke: none;
	}

	.chart-card .income-area {
		fill: url(#dashboard-income-fill);
	}

	.chart-card .expense-area {
		fill: url(#dashboard-expense-fill);
	}

	.chart-card .trend-line {
		fill: none;
		stroke: var(--color-primary);
		stroke-width: 2.2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.chart-card .trend-line.expense {
		stroke: var(--color-danger);
	}

	.chart-card .trend-hit-area {
		fill: transparent;
		stroke: transparent;
		pointer-events: all;
		cursor: crosshair;
	}

	.chart-card__tooltip {
		position: absolute;
		top: 12px;
		right: 12px;
		display: grid;
		gap: 3px;
		min-width: 116px;
		padding: 8px 10px;
		background: rgba(255, 255, 255, 0.96);
		border: 1px solid var(--color-border-soft);
		border-radius: 10px;
		box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
		pointer-events: none;
	}

	.chart-card__tooltip span {
		color: var(--color-text-tertiary);
		font-size: 11px;
	}

	.chart-card__tooltip strong {
		color: var(--color-text-primary);
		font-size: 13px;
	}

	.chart-empty {
		display: grid;
		height: 100%;
		place-items: center;
		color: var(--color-text-tertiary);
		background: var(--color-bg-hover);
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-md);
		font-size: var(--font-caption);
	}

	.chart-card__legend {
		display: flex;
		gap: var(--space-2);
		justify-content: center;
		margin-top: var(--space-3);
	}

	@media (max-width: 1440px) {
		.dashboard-page {
			padding: 28px 28px 36px;
		}

		.dashboard-welcome__copy {
			padding-left: 10px;
		}

		.dashboard-welcome__copy h1 {
			font-size: clamp(30px, 3vw, 40px);
		}

		.dashboard-welcome__copy p {
			font-size: 15px;
		}

		.stat-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 900px) {
		.dashboard-page {
			min-height: auto;
			padding: 28px 18px 36px;
		}

		.dashboard-welcome {
			grid-template-columns: 1fr;
			min-height: auto;
			gap: 12px;
		}

		.dashboard-welcome__copy {
			padding: 0;
			text-align: center;
		}

		.dashboard-welcome__copy h1 {
			font-size: 36px;
		}

		.dashboard-welcome__copy p {
			margin-top: 18px;
			font-size: 14px;
			line-height: 1.8;
		}

		.dashboard-welcome__visual img {
			max-height: 340px;
		}

		.dashboard-entry-grid {
			grid-template-columns: 1fr;
			gap: 14px;
		}

		.dashboard-entry {
			min-height: 176px;
		}
	}
</style>