<template>
  <RDataGate :loading="store.loading" :ready="store.initialized" :error="store.error" @retry="initializeData">
    <section class="dashboard-page">
    <header class="page-head">
      <div>
        <h1>数据总览</h1>
        <p>关注净资产、支出趋势、即将过保和即将还款。</p>
      </div>
    </header>

    <div class="stat-grid">
      <StatCard
        v-for="item in statCards"
        :key="item.label"
        :label="item.label"
        :value="item.value"
        :change="item.change"
        :sign="item.sign"
        @click="openStatCard(item.target)"
      />
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
            <svg viewBox="0 0 300 140" role="img" aria-label="本月收支趋势">
              <polyline v-if="incomeTrendPoints" :points="incomeTrendPoints" />
              <polyline v-if="expenseTrendPoints" class="expense" :points="expenseTrendPoints" />
            </svg>
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
import { assetTotalCost } from "@/domain/assetCalculations";
import type { AssetRecord, TransactionRecord } from "@/domain/models";
import { useAppDataStore } from "@/stores/appDataStore";
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";

type MiniListItem = {
  id?: string;
  name: string;
  meta: string;
  value: string;
  tone?: "success" | "danger";
  icon?: string;
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

const incomeTrendPoints = computed(() => toPolylinePoints(monthlyTrend("income"), 300, 140));
const expenseTrendPoints = computed(() => toPolylinePoints(monthlyTrend("expense"), 300, 140));

function goAsset(item: MiniListItem) {
  if (!item.id) return;
  router.push(`/assets/${item.id}`);
}

function goFundAccount(item: MiniListItem) {
  if (!item.id) return;
  router.push({ path: "/funds", query: { accountId: item.id } });
}

function goLedgerTransaction(item: MiniListItem) {
  if (!item.id) return;
  router.push({ path: "/ledger", query: { transactionId: item.id } });
}

function openStatCard(target: "funds" | "asset-accounts" | "liability-accounts" | "income" | "expense" | "balance") {
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

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function transactionsInRange(start: Date, end: Date) {
  return store.transactions.filter((transaction) => {
    const time = new Date(transaction.occurredAt).getTime();
    return time >= start.getTime() && time <= end.getTime();
  });
}

function transactionIncome(transactions: TransactionRecord[]) {
  return transactions
    .filter((transaction) => transaction.businessType !== "balance_adjustment")
    .filter((transaction) => transaction.type === "income" || transaction.type === "refund")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

function transactionExpense(transactions: TransactionRecord[]) {
  return transactions
    .filter((transaction) => transaction.businessType !== "balance_adjustment")
    .filter((transaction) => transaction.type === "expense" || transaction.type === "asset_purchase" || transaction.type === "repayment")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

function compareText(current: number, previous: number, reverseTone = false) {
  if (previous === 0) return current === 0 ? "本月暂无变化" : "本月新增";
  const delta = current - previous;
  const rate = Math.abs(delta / previous * 100).toFixed(1);
  const arrow = delta >= 0 ? "↑" : "↓";
  const prefix = reverseTone ? "较上月" : "较上月";
  return `${prefix} ${arrow} ${rate}%`;
}

function warrantyDays(asset: AssetRecord) {
  if (!asset.warrantyEndDate) return undefined;
  return Math.max(0, Math.ceil((new Date(asset.warrantyEndDate).getTime() - Date.now()) / 86_400_000));
}

function heldDays(asset: AssetRecord) {
  return Math.max(1, Math.ceil((Date.now() - new Date(asset.purchaseDate).getTime()) / 86_400_000));
}

function idleDays(asset: AssetRecord) {
  const date = asset.idleSince || asset.lastUsedAt;
  if (!date) return 0;
  return Math.max(0, Math.ceil((Date.now() - new Date(date).getTime()) / 86_400_000));
}

function daysUntilMonthlyDay(day: number) {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth(), day);
  if (target.getTime() < today.getTime()) target.setMonth(target.getMonth() + 1);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86_400_000));
}

function categoryName(categoryId: string) {
  return store.categories.find((category) => category.id === categoryId)?.name ?? "未分类";
}

function accountTypeLabel(type: string) {
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

function transactionTypeLabel(type: TransactionRecord["type"]) {
  return ({ income: "收入", expense: "支出", transfer: "转账", refund: "退款", repayment: "还款", asset_purchase: "资产购买" } satisfies Record<TransactionRecord["type"], string>)[type];
}

function transactionTone(transaction: TransactionRecord): MiniListItem["tone"] {
  return transaction.type === "income" || transaction.type === "refund" ? "success" : transaction.type === "transfer" ? undefined : "danger";
}

function transactionAmountText(transaction: TransactionRecord) {
  if (transaction.type === "transfer") return formatAmount(transaction.amount);
  const sign = transactionTone(transaction) === "success" ? "+" : "-";
  return `${sign}${formatAmount(transaction.amount)}`;
}

function formatAmount(value: number) {
  return `¥${Math.abs(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatSignedAmount(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${formatAmount(value)}`;
}

function iconText(value: string) {
  return (value || "日").slice(0, 1);
}

function monthlyTrend(type: "income" | "expense") {
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

function toPolylinePoints(values: number[], width: number, height: number) {
  const hasData = values.some((value) => value > 0);
  if (!hasData) return "";
  const max = Math.max(...values);
  const min = 0;
  const verticalPadding = 14;
  const horizontalPadding = 10;
  const usableWidth = width - horizontalPadding * 2;
  const usableHeight = height - verticalPadding * 2;
  return values.map((value, index) => {
    const x = horizontalPadding + (index / Math.max(values.length - 1, 1)) * usableWidth;
    const y = height - verticalPadding - ((value - min) / Math.max(max - min, 1)) * usableHeight;
    return `${Number(x.toFixed(1))},${Number(y.toFixed(1))}`;
  }).join(" ");
}
</script>

<style scoped>
.dashboard-page {
  display: grid;
  gap: var(--space-5);
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
  height: 150px;
  border-bottom: 1px solid var(--color-border);
}

.chart-card svg {
  width: 100%;
  height: 100%;
}

.chart-card polyline {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chart-card .expense {
  stroke: var(--color-danger);
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
  .stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
