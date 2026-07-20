<template>
  <RDataGate :loading="store.loading" :ready="store.initialized" :error="store.error" @retry="initializeData">
    <section class="ledger-page">
    <div v-if="mode === 'records'" class="ledger-dashboard">
      <header class="ledger-dashboard__toolbar">
        <LedgerFilterToolbar
          :ledger-view="ledgerView"
          :month-label="monthLabel"
          :year-label="yearLabel"
          :show-month-picker="showMonthPicker"
          :month-picker-years="monthPickerYears"
          :month-picker-year="monthPickerYear"
          :calendar-month="calendarMonth"
          :show-filter-panel="showFilterPanel"
          :type-filter="typeFilter"
          :category-filter="categoryFilter"
          :sub-category-filter="subCategoryFilter"
          :account-filter="accountFilter"
          :type-options="typeOptions"
          :category-options="categoryOptions"
          :sub-category-filter-options="subCategoryFilterOptions"
          :account-options="accountOptions"
          @shift-month="shiftCalendarMonth"
          @open-month-picker="openMonthPicker"
          @select-picker-year="selectPickerYear"
          @select-picker-month="selectPickerMonth"
          @set-ledger-view="ledgerView = $event"
          @open-daily-report="showDailyReport = true"
          @open-calendar="showCalendarModal = true"
          @create-entry="openCreateModal"
          @update:type-filter="typeFilter = $event"
          @update:category-filter="categoryFilter = $event"
          @update:sub-category-filter="subCategoryFilter = $event"
          @update:account-filter="accountFilter = $event"
        />
      </header>

      <LedgerOverviewCards :month-label="monthLabel" :month-income="monthIncome" :month-expense="monthExpense" :month-net="monthNet" :daily-expense-average="dailyExpenseAverage" />

      <div class="ledger-content-grid">
        <LedgerStatisticsPanel
          :ledger-view="ledgerView"
          :chart-metric="chartMetric"
          :category-metric="categoryMetric"
          :daily-chart-option="dailyChartOption"
          :category-summary="categorySummary"
          :category-summary-total="categorySummaryTotal"
          :hovered-category="hoveredCategory"
          :category-segment-path="categorySegmentPath"
          :format-amount="formatAmount"
          @update:chart-metric="chartMetric = $event"
          @update:category-metric="categoryMetric = $event"
          @chart-click="handleDailyChartClick"
          @donut-move="handleDonutMouseMove"
          @clear-category-hover="hoveredCategoryKey = null"
        />

        <LedgerDayEntriesPanel
          ref="dayEntriesPanel"
          :selected-date-display="selectedDateDisplay"
          :selected-date-context-label="selectedDateContextLabel"
          :selected-date-key="selectedDateKey"
          :selected-day-income="selectedDayIncome"
          :selected-day-expense="selectedDayExpense"
          :selected-day-entries="selectedDayEntries"
          :summary-category-for-entry="summaryCategoryForEntry"
          :category-initial="categoryInitial"
          :category-label="categoryLabel"
          :entry-display-name="entryDisplayName"
          :entry-source-label="entrySourceLabel"
          :account-for-entry="accountForEntry"
          :account-relation-label="accountRelationLabel"
          :is-positive="isPositive"
          :amount-prefix="amountPrefix"
          :format-amount="formatAmount"
          @shift-date="shiftSelectedDate"
          @open-date-picker="openDatePicker"
          @date-change="handleDatePickerChange"
          @open-entry="openEntryDetail"
          @open-calendar="showCalendarModal = true"
        />
      </div>
    </div>

    <LedgerCalendarModal
      v-model:show="showCalendarModal"
      :calendar-title="calendarTitle"
      :weekdays="weekdays"
      :calendar-days="calendarDays"
      :selected-date-key="selectedDateKey"
      :selected-date-label="selectedDateLabel"
      :selected-day-income="selectedDayIncome"
      :selected-day-expense="selectedDayExpense"
      :selected-day-net="selectedDayNet"
      :selected-day-entries="selectedDayEntries"
      :format-amount="formatAmount"
      :compact-amount="compactAmount"
      :tag-tone="tagTone"
      :transaction-type-label="transactionTypeLabel"
      :category-label="categoryLabel"
      :account-relation-label="accountRelationLabel"
      :is-positive="isPositive"
      :is-repayment-transaction="isRepaymentTransaction"
      :amount-prefix="amountPrefix"
      @shift-month="shiftCalendarMonth"
      @current-month="goCurrentMonth"
      @select-date="selectedDateKey = $event"
    />

    <LedgerDailyReport v-model="showDailyReport" :period-label="ledgerView === 'year' ? yearLabel : monthLabel" :rows="dailyReportRows" :average="dailyReportAverage" />

    <div v-if="mode === 'records'" class="pagination">
      <span>当前筛选共 {{ filteredEntries.length }} 条交易</span>
    </div>

    <LedgerEntryDetailModal
      v-model:show="showDetailModal"
      :selected-transaction="selectedTransaction"
      :entry-display-name="entryDisplayName"
      :entry-source-label="entrySourceLabel"
      :asset-name="assetName"
      :category-label="categoryLabel"
      :account-relation-label="accountRelationLabel"
      :display-occurred-at="displayOccurredAt"
      :amount-prefix="amountPrefix"
      :format-amount="formatAmount"
      :is-positive="isPositive"
      :is-repayment-transaction="isRepaymentTransaction"
      :is-transfer-transaction="isTransferTransaction"
      :is-protected-transaction="isProtectedTransaction"
      @edit="editSelectedEntry"
      @delete="deleteSelectedEntry"
    />

    <LedgerEntryModalShell
      v-model="showModal"
      :draft-type="draftType"
      :saving="saving"
      @close="requestCloseLedgerModal"
      @save="saveDraft"
      @switch-draft-type="switchDraftType"
    >
      <LedgerEntryEditorForm
        v-model:draft-amount="draftAmount"
        v-model:draft-category-id="draftCategoryId"
        v-model:draft-sub-category-id="draftSubCategoryId"
        v-model:draft-account-id="draftAccountId"
        v-model:draft-asset-id="draftAssetId"
        v-model:asset-search-query="assetSearchQuery"
        v-model:draft-merchant="draftMerchant"
        v-model:draft-note="draftNote"
        v-model:asset-link-mode="assetLinkMode"
        v-model:transaction-date="transactionDate"
        v-model:transfer-draft="transferDraft"
        :draft-type="draftType"
        :draft-errors="draftErrors"
        :transfer-errors="transferErrors"
        :current-root-categories="currentRootCategories"
        :current-sub-categories="currentSubCategories"
        :asset-create-options="assetCreateOptions"
        :asset-search-results="assetSearchResults"
        :selected-asset-name="selectedAssetName"
        :draft-receipt-name="draftReceiptName"
        :open-account-picker="openAccountPicker"
        :account-picker-account-name="accountPickerAccountName"
        :select-transaction-root-category="selectTransactionRootCategory"
        :category-display-name="categoryDisplayName"
        :category-icon-text="categoryIconText"
        @select-receipt="selectReceipt"
      />

    </LedgerEntryModalShell>

    <LedgerAccountPickerModal
      v-model="showAccountPicker"
      :title="accountPickerTitle"
      :target="accountPickerTarget"
      :selected-id="accountPickerSelectedId"
      :sections="accountPickerSections"
      :balance="accountPickerBalance"
      @select="selectPickerAccount"
    />

    <DeleteConfirmModal
      v-model:show="showDeleteModal"
      :title="deleteDialogTitle"
      :description="deleteDialogDescription"
      :eyebrow="isRepaymentTransaction(deletingTransaction) ? '撤销还款' : isTransferTransaction(deletingTransaction) ? '撤销转账' : '删除交易'"
      :confirm-text="deleteDialogPositiveText"
      :loading="deletingTransactionLoading"
      @confirm="confirmDelete"
    >
      <div v-if="deletingTransaction" class="delete-transaction-detail">
        <div>
          <span>交易类型</span>
          <strong>{{ transactionTypeLabel(deletingTransaction.type) }}</strong>
        </div>
        <div>
          <span>金额</span>
          <strong>{{ amountPrefix(deletingTransaction) }}{{ formatAmount(deletingTransaction.amount) }}</strong>
        </div>
        <div>
          <span>发生日期</span>
          <strong>{{ formatDateTime(displayOccurredAt(deletingTransaction)) }}</strong>
        </div>
        <div>
          <span>商家/备注</span>
          <strong>{{ deletingTransaction.merchant || deletingTransaction.note || "-" }}</strong>
        </div>
      </div>
    </DeleteConfirmModal>

    <DeleteConfirmModal
      v-model:show="showUnsavedLedgerModal"
      title="放弃未保存的记账内容？"
      description="当前记账表单里有尚未保存的修改。离开后，金额、分类、账户、资产关联和备注都会丢失。"
      eyebrow="内容未保存"
      confirm-text="放弃离开"
      @confirm="confirmCloseLedgerModal"
    />

    <DeleteConfirmModal
      v-model:show="showProtectedTransferModal"
      title="这条流水需要回到来源处维护"
      description="资产购买、资产转让和附加项流水都会联动资产成本与资金余额。为了避免三边账不一致，请到资产详情页维护对应记录。"
      eyebrow="来源维护"
      confirm-text="查看来源资产"
      cancel-text="知道了"
      @confirm="goProtectedAsset"
    />
    </section>
  </RDataGate>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { BarChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import DeleteConfirmModal from "@/components/business/DeleteConfirmModal.vue";
import LedgerOverviewCards from "@/components/business/LedgerOverviewCards.vue";
import LedgerStatisticsPanel from "@/components/business/LedgerStatisticsPanel.vue";
import LedgerDayEntriesPanel from "@/components/business/LedgerDayEntriesPanel.vue";
import LedgerDailyReport from "@/components/business/LedgerDailyReport.vue";
import LedgerAccountPickerModal from "@/components/business/LedgerAccountPickerModal.vue";
import LedgerCalendarModal from "@/components/business/LedgerCalendarModal.vue";
import LedgerEntryDetailModal from "@/components/business/LedgerEntryDetailModal.vue";
import LedgerEntryModalShell from "@/components/business/LedgerEntryModalShell.vue";
import LedgerEntryEditorForm from "@/components/business/LedgerEntryEditorForm.vue";
import LedgerFilterToolbar from "@/components/business/LedgerFilterToolbar.vue";
import RDataGate from "@/components/ui/RDataGate.vue";
import { imageFileToPersistentUrl } from "@/utils/imageFiles";
import { compactAmount, formatAmount, formatDateTime } from "@/utils/formatters";
import type { AssetAddonRecord, MoneyAccountRecord, TransactionRecord, TransactionType } from "@/domain/models";
import { assetAddonService } from "@/services/assetAddonService";
import { accountService } from "@/services/accountService";
import { transactionService } from "@/services/transactionService";
import { useAppDataStore } from "@/stores/appDataStore";

use([BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const store = useAppDataStore();
const router = useRouter();
const route = useRoute();

const mode = ref<"records" | "calendar">("records");
const showCalendarModal = ref(false);
const showDailyReport = ref(false);
const ledgerView = ref<"month" | "year">("month");
const chartMetric = ref<"expense" | "income" | "all">("expense");
const categoryMetric = ref<"expense" | "income">("expense");
const showFilterPanel = ref(false);
const showMonthPicker = ref(false);
const monthPickerYear = ref(new Date().getFullYear());
const typeFilter = ref<string | number | null>("all");
const categoryFilter = ref<string | number | null>("all");
const subCategoryFilter = ref<string | number | null>("all");
const accountFilter = ref<string | number | null>("all");
const showModal = ref(false);
const showDetailModal = ref(false);
const selectedTransactionId = ref<string | null>(null);
const showDeleteModal = ref(false);
const showProtectedTransferModal = ref(false);
const showUnsavedLedgerModal = ref(false);
const showAccountPicker = ref(false);
const accountPickerTarget = ref<"draft" | "from" | "to">("draft");
const saving = ref(false);
const deletingTransactionLoading = ref(false);
const draftType = ref<"expense" | "income" | "transfer">("expense");
let transferDraft = reactive({ fromAccountId: null as string | number | null, toAccountId: null as string | number | null, note: "" });
const transferErrors = reactive({ fromAccountId: "", toAccountId: "", form: "" });
const draftAmount = ref("");
const draftCategoryId = ref<string | number | null>(null);
const draftSubCategoryId = ref<string | number | null>(null);
const draftAccountId = ref<string | number | null>(null);
const draftAssetId = ref<string | number | null>(null);
const assetSearchQuery = ref("");
const draftMerchant = ref("");
const draftNote = ref("");
const draftReceiptUrl = ref("");
const draftReceiptName = ref("");
const assetLinkMode = ref<"related" | "addon-included" | "addon-excluded">("related");
const transactionDate = ref<number | null>(Date.now());
const draftErrors = reactive({
  amount: "",
  date: "",
  categoryId: "",
  accountId: "",
  assetId: "",
  form: "",
});
const editingTransactionId = ref<string | null>(null);
const deletingTransactionId = ref<string | null>(null);
const protectedAssetId = ref<string | null>(null);
const calendarMonth = ref(startOfMonth(new Date()).getTime());
const selectedDateKey = ref(toDateKey(new Date()));
const dayEntriesPanel = ref<{ openDatePicker: () => void } | null>(null);
const initialLedgerDraftSnapshot = ref("");

const transactionCategories = computed(() => store.categories.filter((category) => category.domain === "transaction"));
const activeTransactionCategories = computed(() => transactionCategories.value.filter((category) => category.enabled !== false && !category.deletedAt));
const expenseCategories = computed(() => activeTransactionCategories.value.filter((category) => category.type === "expense" && !category.parentId));
const incomeCategories = computed(() => activeTransactionCategories.value.filter((category) => category.type === "income" && !category.parentId));
const typeOptions = [
  { label: "全部类型", value: "all" },
  { label: "支出", value: "expense" },
  { label: "收入", value: "income" },
];
const categoryOptions = computed(() => [
  { label: "全部一级分类", value: "all" },
  ...activeTransactionCategories.value
    .filter((category) => !category.parentId && (category.type === "expense" || category.type === "income"))
    .map((category) => ({ label: category.name, value: category.id })),
]);
const subCategoryFilterOptions = computed(() => [
  { label: "全部子分类", value: "all" },
  ...activeTransactionCategories.value
    .filter((category) => category.parentId && (isAllFilter(categoryFilter.value) || category.parentId === categoryFilter.value))
    .map((category) => ({ label: category.name, value: category.id })),
]);
const accountOptions = computed(() => [
  { label: "全部账户", value: "all" },
  ...store.accounts.map((account) => ({ label: account.name, value: account.id })),
]);
const accountCreateOptions = computed(() => store.accounts.map((account) => ({ label: account.name, value: account.id })));
const accountPickerSelectedId = computed(() => accountPickerTarget.value === "draft"
  ? draftAccountId.value
  : accountPickerTarget.value === "from" ? transferDraft.fromAccountId : transferDraft.toAccountId);
const accountPickerTitle = computed(() => accountPickerTarget.value === "draft"
  ? (draftType.value === "income" ? "收款账户" : "付款账户")
  : accountPickerTarget.value === "from" ? "转出账户" : "转入账户");
const accountPickerSections = computed<Array<{ key: string; title: string; accounts: MoneyAccountRecord[] }>>(() => {
  const configured = store.categories
    .filter((category) => category.domain === "account" && category.enabled !== false && !category.deletedAt)
    .sort((left, right) => left.sort - right.sort);
  if (!configured.length) {
    return [
      { key: "asset", title: "资产账户", accounts: store.accounts.filter((account) => account.direction === "asset") },
      { key: "liability", title: "信用账户", accounts: store.accounts.filter((account) => account.direction === "liability") },
    ].filter((section) => section.accounts.length);
  }
  const included = new Set<string | number>();
  const sections = configured.map((category) => {
    const accounts = store.accounts.filter((account) => account.accountTypeId === category.id);
    accounts.forEach((account) => included.add(account.id));
    return { key: String(category.id), title: category.name, accounts };
  }).filter((section) => section.accounts.length);
  const remaining = store.accounts.filter((account) => !included.has(account.id));
  if (remaining.length) sections.push({ key: "other", title: "其他账户", accounts: remaining });
  return sections;
});
const assetCreateOptions = computed(() => store.assets.map((asset) => ({ label: asset.name, value: asset.id })));
const assetSearchResults = computed(() => {
  const query = assetSearchQuery.value.trim().toLowerCase();
  if (!query) return [];
  return store.assets.filter((asset) => `${asset.name} ${asset.brand ?? ""} ${asset.model ?? ""}`.toLowerCase().includes(query)).slice(0, 8);
});
const selectedAssetName = computed(() => store.assets.find((asset) => asset.id === draftAssetId.value)?.name ?? "");
const currentCategoryOptions = computed(() => (draftType.value === "income" ? incomeCategories.value : expenseCategories.value)
  .map((category) => ({ label: categoryDisplayName(category.id, category.name), value: category.id })));
const currentRootCategories = computed(() => (draftType.value === "income" ? incomeCategories.value : expenseCategories.value));
const currentSubCategories = computed(() => activeTransactionCategories.value.filter((category) => category.parentId === draftCategoryId.value && category.type === draftType.value));
const currentSubCategoryOptions = computed(() => [
  { label: "不选择子分类", value: "none" },
  ...activeTransactionCategories.value
    .filter((category) => category.parentId === draftCategoryId.value)
    .map((category) => ({ label: category.name, value: category.id })),
]);
const ledgerEntries = computed(() => store.transactions
  .filter((entry) => entry.type !== "transfer" && entry.businessType !== "balance_adjustment")
  .sort((left, right) =>
    new Date(displayOccurredAt(right)).getTime() - new Date(displayOccurredAt(left)).getTime() ||
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()));
const filteredEntries = computed(() => {
  return ledgerEntries.value.filter((entry) => matchesLedgerFilters(entry));
});
const trendEntries = computed(() => {
  return ledgerEntries.value.filter((entry) => matchesLedgerFilters(entry));
});
const monthIncome = computed(() => periodEntries.value
  .filter((entry) => ledgerDirection(entry) === "income")
  .reduce((sum, entry) => sum + entry.amount, 0));
const monthExpense = computed(() => periodEntries.value
  .filter((entry) => ledgerDirection(entry) === "expense")
  .reduce((sum, entry) => sum + entry.amount, 0));
const monthNet = computed(() => monthIncome.value - monthExpense.value);
const dailyReportRows = computed(() => {
  const rows = new Map<string, { key: string; label: string; income: number; expense: number; net: number }>();
  for (const entry of periodEntries.value) {
    const date = new Date(displayOccurredAt(entry));
    const key = toDateKey(date);
    const row = rows.get(key) ?? { key, label: `${date.getMonth() + 1}/${date.getDate()}`, income: 0, expense: 0, net: 0 };
    if (ledgerDirection(entry) === "income") row.income += entry.amount;
    else row.expense += entry.amount;
    row.net = row.income - row.expense;
    rows.set(key, row);
  }
  return [...rows.values()].sort((left, right) => right.key.localeCompare(left.key));
});
const dailyReportAverage = computed(() => {
  const count = Math.max(1, dailyReportRows.value.length);
  const income = dailyReportRows.value.reduce((sum, row) => sum + row.income, 0) / count;
  const expense = dailyReportRows.value.reduce((sum, row) => sum + row.expense, 0) / count;
  return { income, expense, net: income - expense };
});
const categoryBreakdown = computed(() => buildCategoryBreakdown(filteredEntries.value));
const recentMonths = computed(() => {
  const now = new Date();
  return [-2, -1, 0].map((offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return {
      key: toMonthKey(date),
      label: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    };
  });
});
const recentMonthSummaries = computed(() => recentMonths.value.map((month) => {
  const entries = trendEntries.value.filter((entry) => toMonthKey(new Date(entry.occurredAt)) === month.key);
  const income = entries.filter((entry) => ledgerDirection(entry) === "income").reduce((sum, entry) => sum + entry.amount, 0);
  const expense = entries.filter((entry) => ledgerDirection(entry) === "expense").reduce((sum, entry) => sum + entry.amount, 0);
  return {
    ...month,
    income,
    expense,
    net: income - expense,
  };
}));
const monthPickerYears = computed(() => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 18 }, (_, index) => currentYear + 7 - index);
});
const selectedMonthKey = computed({
  get: () => toMonthKey(new Date(calendarMonth.value)),
  set: (value: string) => {
    const [year, month] = value.split("-").map(Number);
    calendarMonth.value = new Date(year, month - 1, 1).getTime();
    selectedDateKey.value = toDateKey(new Date(calendarMonth.value));
  },
});
const monthLabel = computed(() => {
  const date = new Date(calendarMonth.value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
});
const yearLabel = computed(() => `${new Date(calendarMonth.value).getFullYear()}年`);
const periodEntries = computed(() => ledgerEntries.value.filter((entry) => {
  const date = new Date(displayOccurredAt(entry));
  const matchesPeriod = ledgerView.value === "year"
    ? date.getFullYear() === new Date(calendarMonth.value).getFullYear()
    : toMonthKey(date) === selectedMonthKey.value;
  return matchesPeriod && matchesLedgerFilters(entry);
}));
const dailyExpenseAverage = computed(() => {
  const date = new Date(calendarMonth.value);
  const days = ledgerView.value === "year" ? (new Date(date.getFullYear(), 1, 29).getMonth() === 1 ? 366 : 365) : new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return monthExpense.value / Math.max(1, days);
});
const dailyChart = computed(() => {
  const date = new Date(calendarMonth.value);
  if (ledgerView.value === "year") {
    const values = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const entries = ledgerEntries.value.filter((entry) => {
        const entryDate = new Date(displayOccurredAt(entry));
        return entryDate.getFullYear() === date.getFullYear() && entryDate.getMonth() + 1 === month && matchesLedgerFilters(entry);
      });
      return { day: month, expense: entries.filter((entry) => ledgerDirection(entry) === "expense").reduce((sum, entry) => sum + entry.amount, 0), income: entries.filter((entry) => ledgerDirection(entry) === "income").reduce((sum, entry) => sum + entry.amount, 0), key: `${date.getFullYear()}-${String(month).padStart(2, "0")}` };
    });
    const getValue = (item: typeof values[number]) => chartMetric.value === "expense" ? item.expense : chartMetric.value === "income" ? item.income : item.income + item.expense;
    const max = Math.max(...values.map((item) => Math.max(item.expense, item.income)), 1);
    return values.map((item) => ({ ...item, value: getValue(item), expenseHeight: Math.round((item.expense / max) * 100), incomeHeight: Math.round((item.income / max) * 100), label: `${item.day}月`, shortLabel: `${item.day}月` }));
  }
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const values = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const entries = periodEntries.value.filter((entry) => new Date(displayOccurredAt(entry)).getDate() === day);
    const expense = entries.filter((entry) => ledgerDirection(entry) === "expense").reduce((sum, entry) => sum + entry.amount, 0);
    const income = entries.filter((entry) => ledgerDirection(entry) === "income").reduce((sum, entry) => sum + entry.amount, 0);
    return { day, expense, income, key: `${selectedMonthKey.value}-${String(day).padStart(2, "0")}` };
  });
  const getValue = (item: typeof values[number]) => chartMetric.value === "expense" ? item.expense : chartMetric.value === "income" ? item.income : item.income + item.expense;
  const max = Math.max(...values.map((item) => Math.max(item.expense, item.income)), 1);
  return values.map((item) => ({ ...item, value: getValue(item), expenseHeight: Math.round((item.expense / max) * 100), incomeHeight: Math.round((item.income / max) * 100), label: `${item.day}日`, shortLabel: item.day === 1 || item.day % 5 === 0 ? `${item.day}` : "" }));
});
const dailyChartOption = computed(() => {
  const showExpense = chartMetric.value !== "income";
  const showIncome = chartMetric.value !== "expense";
  return {
    animation: true,
    animationDuration: 260,
    grid: { left: 42, right: 14, top: chartMetric.value === "all" ? 30 : 14, bottom: 28, containLabel: true },
    legend: { show: chartMetric.value === "all", top: 0, right: 8, itemWidth: 10, itemHeight: 10, textStyle: { color: "#71809a", fontSize: 12 } },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (items: Array<{ axisValue: string; seriesName: string; value: number }>) => {
        const rows = items.filter((item) => item.value > 0).map((item) => `${item.seriesName}：${formatAmount(item.value)}`);
        if (!rows.length) return undefined;
        return [`<strong>${items[0]?.axisValue ?? ""}</strong>`, ...rows].join("<br />");
      },
    },
    xAxis: {
      type: "category",
      data: dailyChart.value.map((item) => ledgerView.value === "year" ? item.label : `${new Date(calendarMonth.value).getMonth() + 1}/${String(item.day).padStart(2, "0")}`),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#e7edf5" } },
      axisLabel: { color: "#8996aa", fontSize: 10, interval: ledgerView.value === "year" ? 0 : 1, hideOverlap: false, margin: 10 },
    },
    yAxis: {
      type: "value",
      min: 0,
      splitNumber: 4,
      axisLabel: { color: "#8996aa", fontSize: 11, formatter: (value: number) => compactAmount(value) },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#edf1f7", type: "dashed" } },
    },
    series: [
      ...(showExpense ? [{ name: "支出", type: "bar", data: dailyChart.value.map((item) => item.expense || null), barMaxWidth: 12, itemStyle: { color: "#f04444", borderRadius: [4, 4, 0, 0] } }] : []),
      ...(showIncome ? [{ name: "收入", type: "bar", data: dailyChart.value.map((item) => item.income || null), barMaxWidth: 12, itemStyle: { color: "#18a673", borderRadius: [4, 4, 0, 0] } }] : []),
    ],
  };
});
const chartYAxisMax = computed(() => Math.max(...dailyChart.value.map((item) => Math.max(item.expense, item.income)), 0));
const chartYAxisTicks = computed(() => {
  const max = chartYAxisMax.value;
  if (!max) return [0, 0, 0, 0, 0];
  return [max, max * 0.8, max * 0.6, max * 0.4, max * 0.2, 0];
});
const categorySummary = computed(() => {
  const map = new Map<string, { key: string; name: string; total: number; icon?: string; iconUrl?: string }>();
  for (const entry of periodEntries.value) {
    if (ledgerDirection(entry) !== categoryMetric.value) continue;
    const category = summaryCategoryForEntry(entry);
    const key = category.id;
    const item = map.get(key) ?? {
      key,
      name: category.name,
      total: 0,
      icon: category?.icon,
      iconUrl: category?.iconUrl,
    };
    item.total += entry.amount;
    map.set(key, item);
  }
  const total = Array.from(map.values()).reduce((sum, item) => sum + item.total, 0);
  const colors = ["#2f7cf6", "#4ecdc4", "#6b4ce6", "#f59e0b", "#ef6b78", "#8ca0b8"];
  return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 8).map((item, index) => ({ ...item, percent: total ? Number(((item.total / total) * 100).toFixed(1)) : 0, color: colors[index % colors.length] }));
});
const categorySummaryTotal = computed(() => categorySummary.value.reduce((sum, item) => sum + item.total, 0));
const hoveredCategoryKey = ref<string | null>(null);
const hoveredCategory = computed(() => categorySummary.value.find((item) => item.key === hoveredCategoryKey.value));
const categoryDonutBackground = computed(() => {
  let start = 0;
  const stops = categorySummary.value.map((item) => {
    const end = start + item.percent;
    const stop = `${item.color} ${start}% ${end}%`;
    start = end;
    return stop;
  });
  return stops.length ? `conic-gradient(${stops.join(", ")})` : "#e7edf5";
});

function handleDonutMouseMove(event: MouseEvent) {
  if (!categorySummary.value.length) return;
  const element = event.currentTarget as HTMLElement;
  const rect = element.getBoundingClientRect();
  const x = event.clientX - (rect.left + rect.width / 2);
  const y = event.clientY - (rect.top + rect.height / 2);
  const distance = Math.sqrt(x * x + y * y);
  if (distance < rect.width * 0.2 || distance > rect.width * 0.5) {
    hoveredCategoryKey.value = null;
    return;
  }
  let degrees = (Math.atan2(y, x) * 180) / Math.PI + 90;
  if (degrees < 0) degrees += 360;
  const percent = degrees / 3.6;
  let accumulated = 0;
  hoveredCategoryKey.value = categorySummary.value.find((item) => {
    accumulated += item.percent;
    return percent <= accumulated;
  })?.key ?? categorySummary.value[categorySummary.value.length - 1]?.key ?? null;
}

function categorySegmentPath(index: number) {
  const outer = 64;
  const inner = 42;
  const startPercent = categorySummary.value.slice(0, index).reduce((sum, item) => sum + item.percent, 0);
  const endPercent = startPercent + categorySummary.value[index].percent;
  // SVG arcs with identical start/end points are treated as an empty path.
  // Handle a single 100% category explicitly so the donut remains visible.
  if (endPercent - startPercent >= 99.999) {
    return `M 76 12 A ${outer} ${outer} 0 1 1 76 140 A ${outer} ${outer} 0 1 1 76 12 Z`;
  }
  const start = ((startPercent / 100) * Math.PI * 2) - Math.PI / 2;
  const end = ((endPercent / 100) * Math.PI * 2) - Math.PI / 2;
  const largeArc = endPercent - startPercent > 50 ? 1 : 0;
  const point = (radius: number, angle: number) => [76 + radius * Math.cos(angle), 76 + radius * Math.sin(angle)];
  const [sx, sy] = point(outer, start);
  const [ex, ey] = point(outer, end);
  const [ix, iy] = point(inner, end);
  const [isx, isy] = point(inner, start);
  return `M ${sx} ${sy} A ${outer} ${outer} 0 ${largeArc} 1 ${ex} ${ey} L ${ix} ${iy} A ${inner} ${inner} 0 ${largeArc} 0 ${isx} ${isy} Z`;
}
const selectedDateDisplay = computed(() => {
  const date = parseDateKey(selectedDateKey.value);
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
});
const selectedDateIsToday = computed(() => selectedDateKey.value === toDateKey(new Date()));
const selectedDateContextLabel = computed(() => {
  if (selectedDateIsToday.value) return "今天";
  return ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][parseDateKey(selectedDateKey.value).getDay()];
});
const categoryMoMTrends = computed(() => {
  const currentKey = recentMonths.value[2]?.key;
  const previousKey = recentMonths.value[1]?.key;
  if (!currentKey || !previousKey) return [];

  const current = expenseByCategoryForMonth(currentKey);
  const previous = expenseByCategoryForMonth(previousKey);
  return Array.from(current.entries())
    .map(([categoryId, amount]) => {
      const last = previous.get(categoryId) ?? 0;
      const delta = last > 0 ? Math.round(((amount - last) / last) * 100) : 100;
      return {
        categoryId,
        name: categoryName(categoryId),
        current: amount,
        previous: last,
        delta,
      };
    })
    .sort((a, b) => b.current - a.current)
    .slice(0, 5);
});
const budgetInsights = computed(() => {
  const currentKey = recentMonths.value[2]?.key;
  if (!currentKey) return [];
  const spending = expenseByCategoryForMonth(currentKey);
  return store.categories
    .filter((category) => category.domain === "transaction" && category.type === "expense" && !category.parentId && !category.deletedAt && category.monthlyBudget && category.monthlyBudget > 0)
    .map((category) => {
      const used = spending.get(category.id) ?? 0;
      const budget = category.monthlyBudget ?? 0;
      const progress = budget > 0 ? Math.round((used / budget) * 100) : 0;
      const diff = Math.abs(budget - used);
      return {
        categoryId: category.id,
        name: category.name,
        used,
        budget,
        progress,
        diff,
        status: used > budget ? "over" : progress >= 80 ? "warning" : "normal",
      };
    })
    .filter((item) => item.used > 0 || item.status !== "normal")
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);
});
const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
const calendarTitle = computed(() => {
  const date = new Date(calendarMonth.value);
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
});
const entriesByDate = computed(() => {
  const map = new Map<string, TransactionRecord[]>();
  for (const entry of filteredEntries.value) {
    const key = toDateKey(new Date(entry.occurredAt));
    const entries = map.get(key) ?? [];
    entries.push(entry);
    map.set(key, entries);
  }
  return map;
});
const calendarDays = computed(() => {
  const monthStart = new Date(calendarMonth.value);
  const firstDayIndex = (monthStart.getDay() + 6) % 7;
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const gridCells = 42;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstDayIndex);

  return Array.from({ length: gridCells }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = toDateKey(date);
    const entries = entriesByDate.value.get(key) ?? [];
    const income = entries.filter((entry) => ledgerDirection(entry) === "income").reduce((sum, entry) => sum + entry.amount, 0);
    const expense = entries.filter((entry) => ledgerDirection(entry) === "expense").reduce((sum, entry) => sum + entry.amount, 0);
    return {
      key,
      dateKey: key,
      day: date.getDate(),
      inMonth: date.getMonth() === monthStart.getMonth(),
      isToday: key === toDateKey(new Date()),
      count: entries.length,
      income,
      expense,
      net: income - expense,
    };
  });
});
const selectedDayEntries = computed(() => entriesByDate.value.get(selectedDateKey.value) ?? []);
const selectedDayIncome = computed(() => selectedDayEntries.value.filter((entry) => ledgerDirection(entry) === "income").reduce((sum, entry) => sum + entry.amount, 0));
const selectedDayExpense = computed(() => selectedDayEntries.value.filter((entry) => ledgerDirection(entry) === "expense").reduce((sum, entry) => sum + entry.amount, 0));
const selectedDayNet = computed(() => selectedDayIncome.value - selectedDayExpense.value);
const selectedDayCategoryBreakdown = computed(() => buildCategoryBreakdown(selectedDayEntries.value).slice(0, 4));
const selectedDateLabel = computed(() => {
  const date = parseDateKey(selectedDateKey.value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
});
const deletingTransaction = computed(() => store.transactions.find((entry) => entry.id === deletingTransactionId.value));
const selectedTransaction = computed(() => store.transactions.find((entry) => entry.id === selectedTransactionId.value));
const isLedgerDraftDirty = computed(() => showModal.value && serializeLedgerDraft() !== initialLedgerDraftSnapshot.value);
const deleteDialogTitle = computed(() => {
  if (isRepaymentTransaction(deletingTransaction.value)) return "撤销这笔还款？";
  if (isTransferTransaction(deletingTransaction.value)) return "撤销这笔转账？";
  return "删除交易？";
});
const deleteDialogPositiveText = computed(() => {
  if (isRepaymentTransaction(deletingTransaction.value)) return "撤销还款";
  if (isTransferTransaction(deletingTransaction.value)) return "撤销转账";
  return "删除";
});
const deleteDialogDescription = computed(() => {
  if (isRepaymentTransaction(deletingTransaction.value)) {
    return "撤销后会删除还款交易和两条账户流水，并把付款账户余额加回、负债账户欠款加回。";
  }
  if (isTransferTransaction(deletingTransaction.value)) {
    return "撤销后会删除转账交易和两条账户流水，并同时恢复转出与转入账户的余额。";
  }
  return "删除后会同步修正账户余额，并移除这条交易对应的资金流水。";
});

onMounted(initializeData);

async function initializeData() {
  await store.init().catch(() => undefined);
  if (store.initialized) {
    applyRouteState();
    selectDefaultDateForMonth(new Date(calendarMonth.value));
  }
}

watch(() => [route.query.transactionId, route.query.type, route.query.month], () => {
  applyRouteState();
});

watch(categoryFilter, () => {
  subCategoryFilter.value = "all";
});

watch(draftCategoryId, () => {
  if (!draftSubCategoryId.value || draftSubCategoryId.value === "none") return;
  const exists = activeTransactionCategories.value.some((category) => category.id === draftSubCategoryId.value && category.parentId === draftCategoryId.value);
  if (!exists) draftSubCategoryId.value = "none";
});

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shiftCalendarMonth(offset: number) {
  const current = new Date(calendarMonth.value);
  const next = new Date(current.getFullYear(), current.getMonth() + offset, 1);
  calendarMonth.value = next.getTime();
  selectDefaultDateForMonth(next);
}

function goCurrentMonth() {
  const today = new Date();
  calendarMonth.value = startOfMonth(today).getTime();
  selectedDateKey.value = toDateKey(today);
}

function parseAmount(value: string) {
  const amount = Number(value.replace(/[¥,\s]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("请输入正确金额");
  return amount;
}

function readAmount(value: string) {
  return Number(value.replace(/[¥￥,\s]/g, ""));
}

function clearDraftErrors() {
  draftErrors.amount = "";
  draftErrors.date = "";
  draftErrors.categoryId = "";
  draftErrors.accountId = "";
  draftErrors.assetId = "";
  draftErrors.form = "";
}

function accountPickerAccountName(accountId: string | number | null) {
  return accountId ? store.accounts.find((account) => account.id === accountId)?.name ?? "选择账户" : "不选择账户";
}

function accountPickerBalance(account: MoneyAccountRecord) {
  const prefix = account.direction === "liability" && account.balance > 0 ? "-" : "";
  return `${prefix}${formatAmount(account.balance)}`;
}

function openAccountPicker(target: "draft" | "from" | "to") {
  accountPickerTarget.value = target;
  showAccountPicker.value = true;
}

function selectPickerAccount(accountId: string | number | null) {
  if (accountPickerTarget.value === "draft") {
    draftAccountId.value = accountId;
    draftErrors.accountId = "";
  } else if (accountPickerTarget.value === "from") {
    if (accountId) transferDraft.fromAccountId = accountId;
    transferErrors.fromAccountId = "";
  } else {
    if (accountId) transferDraft.toAccountId = accountId;
    transferErrors.toAccountId = "";
  }
  showAccountPicker.value = false;
}

function validateDraft() {
  clearDraftErrors();
  const amount = readAmount(draftAmount.value);
  if (!draftAmount.value.trim()) {
    draftErrors.amount = "请填写金额。";
  } else if (!Number.isFinite(amount) || amount <= 0) {
    draftErrors.amount = "金额必须是大于 0 的数字。";
  }
  if (!transactionDate.value) draftErrors.date = "请选择发生日期。";
  if (!draftCategoryId.value) draftErrors.categoryId = "请选择分类。";
  if (!draftAccountId.value && draftType.value === "expense" && assetLinkMode.value !== "related") draftErrors.accountId = "作为附加项时必须选择付款账户。";
  if (draftType.value === "expense" && assetLinkMode.value !== "related" && !draftAssetId.value) {
    draftErrors.assetId = "作为附加项时必须选择关联资产。";
  }
  return !draftErrors.amount && !draftErrors.date && !draftErrors.categoryId && !draftErrors.accountId && !draftErrors.assetId;
}

function categoryName(id: string) {
  const category = store.categories.find((item) => item.id === id);
  return category ? categoryDisplayName(id, category.name) : categoryDisplayName(id, "未分类");
}

function selectDefaultDateForMonth(month: Date) {
  const today = new Date();
  if (month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()) {
    selectedDateKey.value = toDateKey(today);
    return;
  }

  const latestEntry = filteredEntries.value.find((entry) => {
    const occurredAt = new Date(displayOccurredAt(entry));
    return occurredAt.getFullYear() === month.getFullYear() && occurredAt.getMonth() === month.getMonth();
  });
  selectedDateKey.value = latestEntry ? toDateKey(new Date(displayOccurredAt(latestEntry))) : toDateKey(month);
}

function shiftSelectedDate(offset: number) {
  const next = parseDateKey(selectedDateKey.value);
  next.setDate(next.getDate() + offset);
  selectedDateKey.value = toDateKey(next);
  calendarMonth.value = startOfMonth(next).getTime();
}

function handleDailyChartClick(params: { dataIndex?: number }) {
  if (typeof params.dataIndex !== "number") return;
  const item = dailyChart.value[params.dataIndex];
  if (!item) return;
  if (ledgerView.value === "year") {
    const month = new Date(new Date(calendarMonth.value).getFullYear(), item.day - 1, 1);
    selectDefaultDateForMonth(month);
    return;
  }
  selectedDateKey.value = item.key;
}

function rootTransactionCategory(id: string) {
  let category = store.categories.find((item) => item.id === id && item.domain === "transaction");
  while (category?.parentId) {
    category = store.categories.find((item) => item.id === category?.parentId && item.domain === "transaction");
  }
  return category;
}

function openDatePicker() {
  dayEntriesPanel.value?.openDatePicker();
}

function handleDatePickerChange(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  if (!value) return;
  selectedDateKey.value = value;
  calendarMonth.value = startOfMonth(parseDateKey(value)).getTime();
}

function rootAssetCategory(id: string) {
  let category = store.categories.find((item) => item.id === id && item.domain === "asset");
  while (category?.parentId) {
    category = store.categories.find((item) => item.id === category?.parentId && item.domain === "asset");
  }
  return category;
}

function summaryCategoryForEntry(entry: TransactionRecord) {
  // 资产购买记账使用交易分类保存，但分类统计应按实际购买资产的分类归类。
  if ((entry.businessType === "asset_purchase" || entry.categoryId === "tx-asset-purchase" || entry.businessType === "asset_addon" || entry.businessType === "asset_transfer") && entry.assetId) {
    const asset = store.assets.find((item) => item.id === entry.assetId);
    const assetCategory = asset ? rootAssetCategory(asset.categoryId) : undefined;
    if (assetCategory) return assetCategory;
  }
  const directCategory = rootTransactionCategory(entry.categoryId);
  if (directCategory) return directCategory;

  const fallbackId = entry.businessType === "asset_purchase"
    ? "tx-asset-purchase"
    : entry.businessType === "asset_addon"
      ? (ledgerDirection(entry) === "income" ? "tx-asset-addon-income" : "tx-asset-addon-accessory")
      : entry.businessType === "asset_transfer"
        ? "tx-asset-transfer"
        : entry.businessType === "legacy_part_event"
          ? "tx-asset-part-transfer"
          : "tx-uncategorized";
  return store.categories.find((item) => item.id === fallbackId && item.domain === "transaction") ?? {
    id: "tx-uncategorized",
    name: "未分类",
    icon: undefined,
    iconUrl: undefined,
  };
}

function categoryLabel(entry: TransactionRecord) {
  const usesAssetCategory = Boolean(entry.assetId && (entry.businessType === "asset_purchase" || entry.businessType === "asset_addon" || entry.businessType === "asset_transfer" || entry.categoryId === "tx-asset-purchase"));
  const category = usesAssetCategory ? summaryCategoryForEntry(entry).name : entry.categorySnapshot?.categoryName ?? categoryName(entry.categoryId);
  const subCategory = entry.categorySnapshot?.subCategoryName ?? (entry.subCategoryId ? categoryName(entry.subCategoryId) : "");
  return subCategory && subCategory !== "-" && !usesAssetCategory ? `${category} / ${subCategory}` : category;
}

function chartTooltip(day: { label: string; expense: number; income: number }) {
  if (chartMetric.value === "expense") return `${day.label}：支出 ${formatAmount(day.expense)}`;
  if (chartMetric.value === "income") return `${day.label}：收入 ${formatAmount(day.income)}`;
  return `${day.label}：收入 ${formatAmount(day.income)}，支出 ${formatAmount(day.expense)}`;
}

function openMonthPicker() {
  monthPickerYear.value = new Date(calendarMonth.value).getFullYear();
  showMonthPicker.value = !showMonthPicker.value;
}

function selectPickerMonth(month: number) {
  calendarMonth.value = new Date(monthPickerYear.value, month - 1, 1).getTime();
  selectDefaultDateForMonth(new Date(calendarMonth.value));
  showMonthPicker.value = false;
}

function selectPickerYear(year: number) {
  calendarMonth.value = new Date(year, 0, 1).getTime();
  selectDefaultDateForMonth(new Date(calendarMonth.value));
  showMonthPicker.value = false;
}

function categoryInitial(entry: TransactionRecord) {
  const label = categoryLabel(entry);
  return label.trim().slice(0, 1) || "账";
}

function openEntryDetail(id: string) {
  selectedTransactionId.value = id;
  showDetailModal.value = true;
}

function editSelectedEntry() {
  if (!selectedTransaction.value) return;
  showDetailModal.value = false;
  editEntry(selectedTransaction.value.id);
}

function deleteSelectedEntry() {
  if (!selectedTransaction.value) return;
  showDetailModal.value = false;
  deleteEntry(selectedTransaction.value.id);
}

function matchesLedgerFilters(entry: TransactionRecord) {
  const direction = ledgerDirection(entry);
  const matchesType = isAllFilter(typeFilter.value) || direction === typeFilter.value;
  const matchesCategory = isAllFilter(categoryFilter.value) || entry.categoryId === categoryFilter.value;
  const matchesSubCategory = isAllFilter(subCategoryFilter.value) || entry.subCategoryId === subCategoryFilter.value;
  const matchesAccount = isAllFilter(accountFilter.value) || entry.accountId === accountFilter.value;
  return matchesType && matchesCategory && matchesSubCategory && matchesAccount;
}

function buildCategoryBreakdown(entries: TransactionRecord[]) {
  const groups = new Map<string, {
    key: string;
    categoryName: string;
    direction: "expense" | "income";
    total: number;
    subMap: Map<string, { key: string; name: string; total: number }>;
  }>();

  for (const entry of entries) {
    const direction = ledgerDirection(entry);
    if (!direction) continue;
    const summaryCategory = summaryCategoryForEntry(entry);
    const categoryNameValue = summaryCategory.name;
    const categoryKey = `${direction}:${summaryCategory.id}:${categoryNameValue}`;
    const group = groups.get(categoryKey) ?? {
      key: categoryKey,
      categoryName: categoryNameValue,
      direction,
      total: 0,
      subMap: new Map<string, { key: string; name: string; total: number }>(),
    };
    group.total += entry.amount;

    const subName = entry.categorySnapshot?.subCategoryName ?? (entry.subCategoryId ? categoryName(entry.subCategoryId) : "未细分");
    const subKey = `${entry.subCategoryId ?? "none"}:${subName}`;
    const sub = group.subMap.get(subKey) ?? { key: subKey, name: subName, total: 0 };
    sub.total += entry.amount;
    group.subMap.set(subKey, sub);
    groups.set(categoryKey, group);
  }

  const maxTotal = Math.max(...Array.from(groups.values()).map((group) => group.total), 0);
  return Array.from(groups.values())
    .map((group) => ({
      key: group.key,
      categoryName: group.categoryName,
      direction: group.direction,
      total: group.total,
      ratio: maxTotal > 0 ? Math.max(8, Math.round((group.total / maxTotal) * 100)) : 0,
      monthlyBudget: categoryMonthlyBudget(group.key),
      budgetProgress: categoryBudgetProgress(group.key, group.total),
      budgetBarWidth: categoryBudgetBarWidth(group.key, group.total),
      budgetStatus: categoryBudgetStatus(group.key, group.total),
      subCategories: Array.from(group.subMap.values()).sort((a, b) => b.total - a.total).slice(0, 4),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
}

function expenseByCategoryForMonth(monthKey: string) {
  const result = new Map<string, number>();
  for (const entry of trendEntries.value) {
    if (ledgerDirection(entry) !== "expense") continue;
    if (toMonthKey(new Date(entry.occurredAt)) !== monthKey) continue;
    result.set(entry.categoryId, (result.get(entry.categoryId) ?? 0) + entry.amount);
  }
  return result;
}

function categoryIdFromBreakdownKey(key: string) {
  return key.split(":")[1];
}

function categoryMonthlyBudget(key: string) {
  const categoryId = categoryIdFromBreakdownKey(key);
  const category = store.categories.find((item) => item.id === categoryId);
  if (category?.domain !== "transaction" || category.type !== "expense" || category.parentId) return undefined;
  return category.monthlyBudget && category.monthlyBudget > 0 ? category.monthlyBudget : undefined;
}

function categoryBudgetProgress(key: string, total: number) {
  const budget = categoryMonthlyBudget(key);
  if (!budget) return undefined;
  return Math.round((total / budget) * 100);
}

function categoryBudgetStatus(key: string, total: number) {
  const progress = categoryBudgetProgress(key, total);
  if (progress === undefined) return "none";
  if (progress >= 100) return "over";
  if (progress >= 80) return "warning";
  return "normal";
}

function categoryBudgetBarWidth(key: string, total: number) {
  const progress = categoryBudgetProgress(key, total);
  if (progress === undefined) return undefined;
  return Math.min(100, Math.max(8, progress));
}

function isAllFilter(value: string | number | null) {
  return value === null || value === "all";
}

function accountName(id?: string) {
  return id ? store.accounts.find((account) => account.id === id)?.name ?? "-" : "未选择账户";
}

const transactionCategoryLabels: Record<string, string> = {
  "tx-food": "餐饮美食",
  "tx-shopping": "购物消费",
  "tx-transport": "交通出行",
  "tx-housing": "住房居家",
  "tx-entertainment": "休闲娱乐",
  "tx-health": "医疗健康",
  "tx-education": "教育学习",
  "tx-salary": "工资收入",
  "tx-side-income": "外快收入",
  "tx-asset-transfer": "资产转让收入",
  "tx-asset-addon-income": "资产附加项收入",
  "tx-asset-part-transfer": "资产部件收入",
};

function categoryDisplayName(id: string | number, fallback: string) {
  return transactionCategoryLabels[String(id)] || fallback;
}

function categoryIconText(category: { icon?: string; name: string }) {
  const icon = category.icon?.trim();
  return icon && icon.length <= 2 ? icon : category.name.trim().slice(0, 1) || "类";
}

function accountForEntry(entry: TransactionRecord) {
  return store.accounts.find((account) => account.id === entry.accountId);
}

function accountRelationLabel(entry: TransactionRecord) {
  if (isRepaymentTransaction(entry) && entry.relatedAccountId) {
    return `${accountName(entry.accountId)} → ${accountName(entry.relatedAccountId)}`;
  }
  return accountName(entry.accountId);
}

function entryDisplayName(entry: TransactionRecord) {
  if (entry.addonId) {
    const addon = store.assetAddons.find((item) => item.id === entry.addonId);
    if (addon?.name) return addon.name;
  }
  return entry.merchant?.trim() || entry.note?.trim() || (entry.assetId ? assetName(entry) : transactionTypeLabel(entry.type));
}

function entrySourceLabel(entry: TransactionRecord) {
  if (entry.addonId || entry.businessType === "asset_addon") return "附加项";
  if (entry.businessType === "asset_purchase" || entry.businessType === "asset_transfer" || entry.assetId) return "资产流水";
  return "";
}

function assetName(entry: TransactionRecord) {
  if (entry.assetId) {
    const currentAsset = store.assets.find((asset) => asset.id === entry.assetId);
    if (currentAsset) return currentAsset.name;
  }
  return entry.assetSnapshot?.name ?? legacyAssetName(entry) ?? "-";
}

function legacyAssetName(entry: TransactionRecord) {
  const text = entry.note || "";
  const purchase = text.match(/^购买资产：(.+)$/);
  if (purchase?.[1]) return purchase[1];
  const addon = text.match(/^资产附加项(?:收入)?：([^/]+)\s*\//);
  if (addon?.[1]) return addon[1].trim();
  const transfer = text.match(/^转让资产：(.+)$/);
  return transfer?.[1];
}

function displayOccurredAt(entry: TransactionRecord) {
  if (!["asset_purchase", "asset_addon", "asset_transfer"].includes(entry.businessType ?? "")) return entry.occurredAt;
  const occurred = new Date(entry.occurredAt);
  if (occurred.getHours() || occurred.getMinutes() || occurred.getSeconds()) return entry.occurredAt;
  const created = new Date(entry.createdAt);
  occurred.setHours(created.getHours(), created.getMinutes(), created.getSeconds(), created.getMilliseconds());
  return occurred.toISOString();
}

function transactionTypeLabel(type: TransactionType) {
  const labels: Record<TransactionType, string> = {
    expense: "支出",
    income: "收入",
    transfer: "转账",
    refund: "退款",
    repayment: "还款",
    asset_purchase: "资产购买",
  };
  return labels[type];
}

function ledgerDirection(entry: TransactionRecord): "expense" | "income" | null {
  if (entry.type === "income" || entry.type === "refund") return "income";
  if (entry.type === "expense" || entry.type === "asset_purchase") return "expense";
  return null;
}

function isPositive(type: TransactionType) {
  return type === "income" || type === "refund";
}

function isRepaymentTransaction(entry?: TransactionRecord | null) {
  return Boolean(entry && (entry.businessType === "debt_repayment" || entry.type === "repayment"));
}

function amountPrefix(entry: TransactionRecord) {
  if (isRepaymentTransaction(entry)) return "";
  return isPositive(entry.type) ? "+" : "-";
}

function tagTone(type: TransactionRecord["type"]) {
  if (type === "income" || type === "refund") return "success";
  if (type === "transfer" || type === "repayment") return "warning";
  if (type === "asset_purchase") return "info";
  return "danger";
}

function addonTypeFromTransactionCategory(categoryId: string | number | null): AssetAddonRecord["type"] {
  const mapping: Record<string, AssetAddonRecord["type"]> = {
    "tx-asset-addon-accessory": "accessory",
    "tx-asset-addon-repair": "repair",
    "tx-asset-addon-maintenance": "maintenance",
    "tx-asset-addon-upgrade": "upgrade",
    "tx-asset-addon-consumable": "consumable",
    "tx-asset-addon-other": "other",
  };
  return categoryId ? mapping[String(categoryId)] ?? "accessory" : "accessory";
}

function isProtectedTransaction(entry: TransactionRecord) {
  return entry.type === "asset_purchase" ||
    entry.categoryId === "tx-asset-purchase" ||
    entry.categoryId === "tx-asset-transfer" ||
    Boolean(entry.addonId) ||
    Boolean(entry.partEventId);
}

function isTransferTransaction(entry?: TransactionRecord | null) {
  return entry?.businessType === "account_transfer" || entry?.type === "transfer";
}

function protectedTransactionTip(entry: TransactionRecord) {
  if (isRepaymentTransaction(entry)) return "还款会同时影响两个账户，不能普通编辑；可撤销后重新记录";
  if (isTransferTransaction(entry)) return "转账会同时影响两个账户，不能普通编辑；可撤销后重新转账";
  if (!isProtectedTransaction(entry)) return "";
  if (entry.categoryId === "tx-asset-transfer") return "资产转让收入请到资产详情中撤销";
  if (entry.addonId) return "附加项流水请到资产详情中编辑附加项";
  if (entry.partEventId) return "资产部件变动流水请到资产详情中维护";
  return "资产购买流水请到资产详情中维护";
}

function isAssetOpenForAddon(assetId: string | number | null) {
  if (!assetId) return false;
  const asset = store.assets.find((item) => item.id === String(assetId));
  return asset?.status === "using" || asset?.status === "idle";
}

function resetDraft(type: "expense" | "income" | "transfer") {
  editingTransactionId.value = null;
  draftType.value = type;
  draftAmount.value = "";
  draftCategoryId.value = type === "income" ? incomeCategories.value[0]?.id ?? null : expenseCategories.value[0]?.id ?? null;
  draftSubCategoryId.value = "none";
  draftAccountId.value = store.accounts[0]?.id ?? null;
  draftAssetId.value = null;
  assetSearchQuery.value = "";
  draftMerchant.value = "";
  draftNote.value = "";
  transferDraft.fromAccountId = store.assetAccounts[0]?.id ?? null;
  transferDraft.toAccountId = store.assetAccounts[1]?.id ?? store.accounts[1]?.id ?? null;
  transferDraft.note = "";
  transferErrors.fromAccountId = "";
  transferErrors.toAccountId = "";
  transferErrors.form = "";
  draftReceiptUrl.value = "";
  draftReceiptName.value = "";
  assetLinkMode.value = "related";
  transactionDate.value = Date.now();
  clearDraftErrors();
  initialLedgerDraftSnapshot.value = serializeLedgerDraft();
}

function openCreateModal(type: "expense" | "income" | "transfer") {
  resetDraft(type);
  showModal.value = true;
}

function editEntry(id: string) {
  const entry = store.transactions.find((item) => item.id === id);
  if (!entry) return;
  if (isRepaymentTransaction(entry)) return;
  if (isProtectedTransaction(entry)) {
    protectedAssetId.value = entry.assetId ?? null;
    showProtectedTransferModal.value = true;
    return;
  }
  editingTransactionId.value = id;
  draftType.value = isPositive(entry.type) ? "income" : "expense";
  draftAmount.value = String(entry.amount);
  draftCategoryId.value = entry.categoryId;
  draftSubCategoryId.value = entry.subCategoryId ?? "none";
  draftAccountId.value = entry.accountId ?? null;
  draftAssetId.value = entry.assetId ?? null;
  assetSearchQuery.value = entry.assetId ? store.assets.find((asset) => asset.id === entry.assetId)?.name ?? "" : "";
  draftMerchant.value = entry.merchant ?? "";
  draftNote.value = entry.note ?? "";
  draftReceiptUrl.value = entry.receiptUrl ?? "";
  draftReceiptName.value = entry.receiptUrl ? "已上传凭证" : "";
  assetLinkMode.value = "related";
  transactionDate.value = new Date(entry.occurredAt).getTime();
  initialLedgerDraftSnapshot.value = serializeLedgerDraft();
  showModal.value = true;
}

function applyRouteState() {
  const transactionId = typeof route.query.transactionId === "string" ? route.query.transactionId : "";
  if (transactionId) {
    const entry = store.transactions.find((item) => item.id === transactionId);
    if (entry) {
      mode.value = "records";
      typeFilter.value = ledgerDirection(entry);
      categoryFilter.value = entry.categoryId;
      subCategoryFilter.value = entry.subCategoryId ?? "all";
      accountFilter.value = entry.accountId ?? "all";

      if (!isRepaymentTransaction(entry)) {
        editEntry(entry.id);
      }
      return;
    }
  }

  const requestedType = typeof route.query.type === "string" ? route.query.type : "";
  const requestedMonth = typeof route.query.month === "string" ? route.query.month : "";
  if (!requestedType && !requestedMonth) return;

  mode.value = "records";
  typeFilter.value = requestedType === "income" || requestedType === "expense" ? requestedType : "all";
  categoryFilter.value = "all";
  subCategoryFilter.value = "all";
  accountFilter.value = "all";
}

function serializeLedgerDraft() {
  return JSON.stringify({
    editingTransactionId: editingTransactionId.value,
    draftType: draftType.value,
    draftAmount: draftAmount.value,
    draftCategoryId: draftCategoryId.value,
    draftSubCategoryId: draftSubCategoryId.value,
    draftAccountId: draftAccountId.value,
    draftAssetId: draftAssetId.value,
    draftMerchant: draftMerchant.value,
    draftNote: draftNote.value,
    assetLinkMode: assetLinkMode.value,
    transactionDate: transactionDate.value,
    draftReceiptUrl: draftReceiptUrl.value,
  });
}

function requestCloseLedgerModal() {
  if (isLedgerDraftDirty.value) {
    showUnsavedLedgerModal.value = true;
    return;
  }
  showModal.value = false;
}

function confirmCloseLedgerModal() {
  showUnsavedLedgerModal.value = false;
  initialLedgerDraftSnapshot.value = serializeLedgerDraft();
  showModal.value = false;
}

function deleteEntry(id: string) {
  const entry = store.transactions.find((item) => item.id === id);
  if (entry && isProtectedTransaction(entry)) {
    protectedAssetId.value = entry.assetId ?? null;
    showProtectedTransferModal.value = true;
    return;
  }

  deletingTransactionId.value = id;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!deletingTransactionId.value) return;
  deletingTransactionLoading.value = true;
  try {
    await transactionService.delete(deletingTransactionId.value);
    await store.refresh();
    showDeleteModal.value = false;
    deletingTransactionId.value = null;
  } finally {
    deletingTransactionLoading.value = false;
  }
}

function goProtectedAsset() {
  if (!protectedAssetId.value) return;
  router.push(`/assets/${protectedAssetId.value}`);
  protectedAssetId.value = null;
}

async function saveDraft() {
  if (draftType.value === "transfer") {
    await saveTransferDraft();
    return;
  }
  if (!validateDraft()) return;
  saving.value = true;
  try {
    const amount = parseAmount(draftAmount.value);
    const occurredAt = new Date(transactionDate.value!).toISOString();
    const shouldCreateAddon = draftType.value === "expense" && assetLinkMode.value !== "related";
    const addonType = addonTypeFromTransactionCategory(draftCategoryId.value);
    const subCategoryId = draftSubCategoryId.value && draftSubCategoryId.value !== "none" ? String(draftSubCategoryId.value) : undefined;

    if (shouldCreateAddon && !draftAssetId.value) {
      draftErrors.assetId = "请选择要关联的物品资产。";
      return;
    }

    if (shouldCreateAddon && draftAssetId.value && !isAssetOpenForAddon(draftAssetId.value)) {
      draftErrors.form = "该资产已转让或已处置，不能继续追加附加项。";
      return;
    }

    if (editingTransactionId.value) {
      if (shouldCreateAddon && draftAssetId.value) {
        await transactionService.convertToAssetAddon({
          id: editingTransactionId.value,
          amount,
          occurredAt,
          accountId: String(draftAccountId.value),
          assetId: String(draftAssetId.value),
          addonType,
          includedInCost: assetLinkMode.value === "addon-included",
          merchant: draftMerchant.value,
          note: draftNote.value,
        });
      } else {
        await transactionService.update({
          id: editingTransactionId.value,
          type: draftType.value,
          categoryId: String(draftCategoryId.value),
          subCategoryId,
          amount,
          occurredAt,
          accountId: draftAccountId.value ? String(draftAccountId.value) : undefined,
          assetId: draftAssetId.value ? String(draftAssetId.value) : undefined,
          merchant: draftMerchant.value,
          note: draftNote.value,
          receiptUrl: draftReceiptUrl.value || undefined,
        });
      }
    } else if (draftType.value === "expense" && draftAssetId.value && assetLinkMode.value !== "related") {
      if (!isAssetOpenForAddon(draftAssetId.value)) {
        draftErrors.form = "该资产已转让或已处置，不能继续追加附加项。";
        return;
      }
      await assetAddonService.create({
        assetId: String(draftAssetId.value),
        name: draftMerchant.value || draftNote.value || "资产附加项",
        type: addonType,
        amount,
        purchaseDate: occurredAt.slice(0, 10),
        paymentAccountId: String(draftAccountId.value),
        includedInCost: assetLinkMode.value === "addon-included",
        notes: draftNote.value,
      });
    } else {
      await transactionService.create({
        type: draftType.value,
        categoryId: String(draftCategoryId.value),
        subCategoryId,
        amount,
        occurredAt,
        accountId: draftAccountId.value ? String(draftAccountId.value) : undefined,
        assetId: draftAssetId.value ? String(draftAssetId.value) : undefined,
        merchant: draftMerchant.value,
        note: draftNote.value,
        receiptUrl: draftReceiptUrl.value || undefined,
      });
    }
    await store.refresh();
    initialLedgerDraftSnapshot.value = serializeLedgerDraft();
    editingTransactionId.value = null;
    showModal.value = false;
  } catch (err) {
    draftErrors.form = err instanceof Error ? err.message : "保存失败，请检查表单后重试。";
  } finally {
    saving.value = false;
  }
}

async function saveTransferDraft() {
  transferErrors.fromAccountId = "";
  transferErrors.toAccountId = "";
  transferErrors.form = "";
  if (!transferDraft.fromAccountId) transferErrors.fromAccountId = "请选择转出账户。";
  if (!transferDraft.toAccountId) transferErrors.toAccountId = "请选择转入账户。";
  if (transferDraft.fromAccountId && transferDraft.fromAccountId === transferDraft.toAccountId) transferErrors.form = "转出和转入账户不能相同。";
  let amount = 0;
  try { amount = parseAmount(draftAmount.value); } catch { transferErrors.form = transferErrors.form || "请输入正确金额。"; }
  if (transferErrors.fromAccountId || transferErrors.toAccountId || transferErrors.form) return;
  saving.value = true;
  try {
    await accountService.transfer({ fromAccountId: String(transferDraft.fromAccountId), toAccountId: String(transferDraft.toAccountId), amount, occurredAt: new Date(transactionDate.value ?? Date.now()).toISOString(), note: transferDraft.note.trim() || "资金转账" });
    await store.refresh();
    showModal.value = false;
  } catch (err) {
    transferErrors.form = err instanceof Error ? err.message : "转账保存失败。";
  } finally { saving.value = false; }
}

function switchDraftType(type: "expense" | "income" | "transfer") {
  if (editingTransactionId.value) return;
  draftType.value = type;
  if (type === "income") draftCategoryId.value = incomeCategories.value[0]?.id ?? null;
  if (type === "expense") draftCategoryId.value = expenseCategories.value[0]?.id ?? null;
  if (type !== "transfer") draftSubCategoryId.value = "none";
  if (type === "transfer") {
    transferDraft.fromAccountId ||= store.accounts[0]?.id ?? null;
    transferDraft.toAccountId ||= store.accounts[1]?.id ?? null;
  }
}

function selectTransactionRootCategory(id: string | number) {
  draftCategoryId.value = id;
  draftSubCategoryId.value = "none";
}

async function selectReceipt(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
    draftErrors.form = "凭证仅支持图片或 PDF 文件。";
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    draftErrors.form = "凭证文件不能超过 8 MB。";
    return;
  }
  try {
    draftReceiptUrl.value = file.type === "application/pdf" ? await fileToDataUrl(file) : await imageFileToPersistentUrl(file);
    draftReceiptName.value = file.name;
    draftErrors.form = "";
  } catch (error) {
    draftErrors.form = error instanceof Error ? error.message : "凭证读取失败，请重新选择。";
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("凭证读取失败，请重新选择。"));
    reader.readAsDataURL(file);
  });
}
</script>

<style scoped>
.ledger-page {
  display: grid;
  gap: var(--space-5);
}

.ledger-tabs {
  display: flex;
  gap: var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.ledger-tabs button {
  height: 56px;
  padding: 0 var(--space-4);
  color: var(--color-text-secondary);
  background: none;
  border: 0;
  border-bottom: 3px solid transparent;
  cursor: pointer;
}

.ledger-tabs button.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 700;
}

.ledger-filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(130px, 1fr)) auto;
  gap: var(--space-4);
  align-items: center;
}

.create-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

.ledger-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: var(--space-5);
}

.ledger-summary div + div {
  border-left: 1px solid var(--color-border);
  padding-left: var(--space-8);
}

.ledger-summary span {
  color: var(--color-text-secondary);
}

.ledger-summary strong {
  display: block;
  margin-top: var(--space-2);
  font-size: 24px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  align-items: flex-start;
}

.section-head span,
.section-head small {
  color: var(--color-text-tertiary);
  font-size: var(--font-caption);
  font-weight: 800;
}

.section-head h3 {
  margin: var(--space-1) 0 0;
  color: var(--color-text-primary);
  font-size: 16px;
}

.category-breakdown {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}

.category-breakdown__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.category-stat-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  background:
    radial-gradient(circle at 100% 0%, rgba(22, 119, 255, 0.08), transparent 32%),
    #fff;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
}

.category-stat-card__head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-2);
  align-items: center;
}

.category-stat-card__head > strong {
  overflow: hidden;
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-stat-card__head em {
  font-style: normal;
  font-weight: 800;
}

.category-stat-card__bar {
  height: 8px;
  overflow: hidden;
  background: #eef2f7;
  border-radius: 999px;
}

.category-stat-card__bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), #60a5fa);
  border-radius: inherit;
}

.category-stat-card__bar i.warning {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.category-stat-card__bar i.over {
  background: linear-gradient(90deg, var(--color-danger), #fb7185);
}

.budget-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 8px 10px;
  color: var(--color-primary);
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  font-size: var(--font-caption);
}

.budget-row.warning {
  color: #b45309;
  background: #fffbeb;
  border-color: #fde68a;
}

.budget-row.over {
  color: var(--color-danger);
  background: #fff1f0;
  border-color: #ffccc7;
}

.budget-row strong {
  white-space: nowrap;
}

.sub-category-list {
  display: grid;
  gap: var(--space-2);
}

.sub-category-list div,
.calendar-category-breakdown div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
}

.sub-category-list strong,
.calendar-category-breakdown strong {
  color: var(--color-text-primary);
}

.category-breakdown__empty {
  display: grid;
  min-height: 88px;
  place-items: center;
  color: var(--color-text-tertiary);
  background: var(--color-bg-hover);
  border: 1px dashed var(--color-border);
  border-radius: 14px;
}

.trend-panel {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}

.trend-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.trend-months {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.trend-month-card,
.trend-card {
  padding: var(--space-4);
  background:
    radial-gradient(circle at 92% 8%, rgba(22, 119, 255, 0.08), transparent 34%),
    #fff;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
}

.trend-month-card {
  display: grid;
  gap: var(--space-3);
}

.trend-month-card > span,
.trend-card__head span {
  color: var(--color-text-tertiary);
  font-size: var(--font-caption);
  font-weight: 800;
}

.trend-month-card > strong {
  font-size: 20px;
}

.trend-month-card div {
  display: grid;
  gap: 4px;
}

.trend-month-card em {
  font-size: var(--font-caption);
  font-style: normal;
  font-weight: 700;
}

.trend-card {
  display: grid;
  gap: var(--space-3);
}

.trend-card__head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.trend-card__head strong {
  color: var(--color-text-primary);
  font-size: var(--font-caption);
}

.mom-list,
.budget-insight-list {
  display: grid;
  gap: var(--space-2);
}

.mom-list div,
.budget-insight-list div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: var(--space-3);
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.mom-list div:last-child,
.budget-insight-list div:last-child {
  border-bottom: 0;
}

.mom-list span,
.budget-insight-list span {
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mom-list strong,
.budget-insight-list strong {
  font-size: var(--font-caption);
}

.mom-list em,
.budget-insight-list em {
  color: var(--color-text-tertiary);
  font-size: var(--font-caption);
  font-style: normal;
  font-weight: 700;
}

.budget-insight-list .warning strong {
  color: #b45309;
}

.budget-insight-list .over strong {
  color: var(--color-danger);
}

.trend-card p {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-caption);
  line-height: 1.7;
}

.danger,
.negative {
  color: var(--color-danger);
}

.success,
.positive {
  color: var(--color-success);
}

.warning {
  color: #b45309;
}

.ledger-table {
  width: 100%;
  border-collapse: collapse;
}

.ledger-table th,
.ledger-table td {
  height: 56px;
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-table);
  text-align: left;
}

.ledger-table th {
  color: #667085;
  background: var(--color-bg-hover);
}

.ledger-table .amount {
  text-align: right;
  font-weight: 700;
}

.ledger-calendar {
  display: grid;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  gap: var(--space-3);
  padding: var(--space-3);
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: 58px;
  padding: 12px 16px;
  color: #fff;
  background:
    radial-gradient(circle at 88% 12%, rgba(255, 255, 255, 0.2), transparent 24%),
    linear-gradient(135deg, #111827, #1d4ed8 62%, #2f7cff);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(22, 119, 255, 0.1);
}

.calendar-toolbar span {
  display: block;
  font-size: var(--font-caption);
  font-weight: 800;
  opacity: 0.78;
}

.calendar-toolbar strong {
  display: block;
  margin-top: 2px;
  font-size: 20px;
  letter-spacing: 0;
}

.calendar-actions {
  display: flex;
  gap: var(--space-2);
}

.calendar-actions button {
  height: 28px;
  padding: 0 10px;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 700;
  font-size: 12px;
}

.calendar-actions button:hover {
  background: rgba(255, 255, 255, 0.22);
}

.calendar-layout {
  display: grid;
  min-height: 0;
  height: 100%;
  grid-template-columns: minmax(0, 1fr) 282px;
  gap: var(--space-4);
  align-items: start;
}

.calendar-board {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: 36px repeat(6, minmax(0, 1fr));
  height: 100%;
  gap: 1px;
  overflow: hidden;
  background: #e8edf5;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.03);
}

.calendar-weekday {
  display: grid;
  height: 28px;
  place-items: center;
  color: #64748b;
  background: #f8fafc;
  font-size: var(--font-caption);
  font-weight: 800;
}

.calendar-day {
  position: relative;
  display: grid;
  min-height: 62px;
  align-content: start;
  gap: 2px;
  padding: 8px;
  text-align: left;
  background: rgba(255, 255, 255, 0.92);
  border: 0;
  cursor: pointer;
  transition: background 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.calendar-day:hover {
  z-index: 1;
  background: #f8fbff;
  box-shadow: inset 0 0 0 1px rgba(22, 119, 255, 0.28);
}

.calendar-day.muted {
  color: var(--color-text-tertiary);
  background: #f8fafc;
}

.calendar-day.selected {
  z-index: 1;
  background:
    linear-gradient(180deg, rgba(22, 119, 255, 0.08), rgba(255, 255, 255, 0.96));
  box-shadow: inset 0 0 0 2px var(--color-primary), 0 8px 18px rgba(22, 119, 255, 0.1);
}

.calendar-day.today > span {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  color: #fff;
  background: var(--color-primary);
  border-radius: 50%;
  font-weight: 800;
}

.calendar-day > span {
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 800;
}

.day-summary {
  display: grid;
  gap: 1px;
  margin-top: 1px;
  font-size: 10px;
  line-height: 1.18;
}

.day-summary em,
.day-summary strong {
  font-style: normal;
}

.day-summary strong {
  width: max-content;
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 800;
}

.day-summary .net-positive {
  color: #2563eb;
  background: #eaf2ff;
}

.day-summary .net-negative {
  color: #7c3aed;
  background: #f3e8ff;
}

.calendar-day small {
  color: var(--color-text-tertiary);
  font-size: 9px;
}

.calendar-detail {
  display: grid;
  gap: var(--space-2);
  padding: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.98));
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.045);
}

.calendar-detail__head span {
  color: var(--color-text-tertiary);
  font-size: var(--font-caption);
  font-weight: 800;
}

.calendar-detail__head strong {
  display: block;
  margin-top: 2px;
  font-size: 16px;
}

.calendar-detail__summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.calendar-detail__summary div {
  padding: 8px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.calendar-detail__summary span {
  display: block;
  color: var(--color-text-tertiary);
  font-size: 11px;
}

.calendar-detail__summary strong {
  display: block;
  margin-top: 2px;
  font-size: 12px;
}

.calendar-category-breakdown {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  background: #f8fafc;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.calendar-entry-list {
  display: grid;
  gap: 8px;
  max-height: 300px;
  overflow: auto;
}

.calendar-entry {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-2);
  align-items: center;
  padding: 8px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.calendar-entry strong {
  display: block;
  color: var(--color-text-primary);
  font-size: 12px;
}

.calendar-entry > div span {
  display: block;
  margin-top: 2px;
  color: var(--color-text-tertiary);
  font-size: 11px;
}

.calendar-entry em {
  font-style: normal;
  font-weight: 800;
}

.calendar-empty {
  display: grid;
  min-height: 120px;
  place-items: center;
  color: var(--color-text-tertiary);
  background: var(--color-bg-card);
  border: 1px dashed var(--color-border);
  border-radius: 10px;
}

.ops {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.ops button {
  color: var(--color-primary);
  background: none;
  border: 0;
  cursor: pointer;
}

.ops button:disabled {
  color: var(--color-text-tertiary);
  cursor: not-allowed;
  opacity: 0.55;
}

.pagination {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  justify-content: flex-end;
  color: var(--color-text-secondary);
}

.calendar-entry > .r-tag {
  justify-content: center;
  box-sizing: border-box;
  line-height: 1;
  vertical-align: middle;
}

.amount-panel {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  padding: var(--space-5);
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: 14px;
}

.amount-panel span {
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
  font-weight: 700;
}

.amount-input {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.amount-input strong {
  color: var(--color-text-primary);
  font-size: 26px;
}

.amount-input input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  font-size: 30px;
  font-weight: 800;
}

.amount-panel p {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-caption);
  line-height: 1.7;
}

.ledger-form,
.form-section {
  display: grid;
  gap: var(--space-4);
}

.form-section {
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.form-section:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.form-section h3 {
  margin: 0;
  font-size: var(--font-card-title);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 10px var(--space-4);
}

.form-grid label {
  display: grid;
  grid-template-rows: auto auto 16px;
  align-content: start;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
  font-weight: 700;
}

.form-grid label.invalid,
.asset-link-box.invalid,
.amount-panel.invalid {
  color: var(--color-danger);
}

.form-grid label.invalid :deep(.n-input),
.form-grid label.invalid :deep(.n-base-selection),
.asset-link-box.invalid :deep(.n-base-selection),
.amount-panel.invalid .amount-input {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 2px rgba(240, 68, 56, 0.08);
}

.form-grid label em,
.asset-link-box em,
.amount-panel em {
  min-height: 16px;
  color: var(--color-danger);
  font-style: normal;
  font-weight: 600;
  line-height: 16px;
}

.form-error {
  padding: var(--space-3) var(--space-4);
  color: var(--color-danger);
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: var(--radius-lg);
  font-size: var(--font-caption);
  font-weight: 700;
}

.delete-transaction-detail {
  display: grid;
  gap: var(--space-3);
}

.delete-transaction-detail div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.delete-transaction-detail div:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.delete-transaction-detail span {
  color: var(--color-text-tertiary);
  font-size: var(--font-caption);
  font-weight: 700;
}

.delete-transaction-detail strong {
  color: var(--color-text-primary);
  text-align: right;
}

.asset-link-box {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-primary-soft);
  border-radius: var(--radius-lg);
}

.link-options {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
}

.receipt-box {
  display: grid;
  width: 100%;
  height: 60px;
  padding: 0;
  place-items: center;
  color: var(--color-text-tertiary);
  font: inherit;
  background: var(--color-bg-hover);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-lg);
  cursor: pointer;
}

.asset-link-box > .r-select,
.asset-link-box > .r-input { min-width: 0; }
.asset-link-box > .asset-search-results,
.asset-link-box > .asset-search-empty,
.asset-link-box > .asset-selected-hint,
.asset-link-box > em,
.asset-link-box > .link-options { grid-column: 1 / -1; }

.asset-search-results { display: grid; max-height: 190px; margin-top: 8px; overflow-y: auto; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 10px; }
.asset-search-results button { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 9px 12px; color: var(--color-text-primary); background: transparent; border: 0; border-bottom: 1px solid var(--color-border); cursor: pointer; text-align: left; }
.asset-search-results button:last-of-type { border-bottom: 0; }
.asset-search-results button:hover, .asset-search-results button.active { background: var(--color-primary-light); }
.asset-search-results button span, .asset-search-empty, .asset-selected-hint { color: var(--color-text-tertiary); font-size: var(--font-caption); }
.asset-search-empty { padding: 12px; }
.asset-selected-hint { margin-top: 8px; }

.form-grid label.category-field { display: block; grid-column: 1 / -1; align-self: start; }
.ledger-category-picker { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 8px; }
.ledger-category-picker button { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 4px 10px; color: var(--color-text-secondary); background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; }
.ledger-category-picker button.active { color: var(--color-primary); background: var(--color-primary-light); border-color: #bbd5ff; font-weight: 700; }
.ledger-category-picker button img, .ledger-category-picker button i { display: grid; width: 20px; height: 20px; place-items: center; border-radius: 6px; font-size: 11px; font-style: normal; object-fit: cover; }
.ledger-category-picker--children { padding-left: 10px; border-left: 2px solid var(--color-primary-light); }

.receipt-box:hover { color: var(--color-primary); border-color: var(--color-primary); background: #f4f8ff; }
.account-picker-trigger { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 42px; padding: 0 12px; color: var(--color-text-primary); background: #fff; border: 1px solid var(--color-border); border-radius: 10px; cursor: pointer; font: inherit; text-align: left; }.account-picker-trigger:hover { border-color: var(--color-primary); }.account-picker-trigger > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.account-picker-trigger svg { flex: 0 0 auto; color: var(--color-text-tertiary); }

@media (max-width: 1200px) {
  .ledger-filters,
  .category-breakdown__grid,
  .trend-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trend-months {
    grid-column: 1 / -1;
  }

  .calendar-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .ledger-summary,
  .category-breakdown__grid,
  .trend-grid,
  .trend-months,
  .ledger-filters {
    grid-template-columns: 1fr;
  }

  .ledger-summary div + div {
    border-left: 0;
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-4);
    padding-left: 0;
  }

}
</style>

<style>
.ledger-dashboard { position: relative; gap: 12px; }
.ledger-month-picker { position: relative; }
.ledger-month-select { display: inline-flex; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid var(--color-border); }
.ledger-month-picker__popover { position: absolute; z-index: 20; top: calc(100% + 9px); left: 0; display: grid; grid-template-columns: 92px 1fr; width: 350px; overflow: hidden; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-bg-card); box-shadow: 0 18px 42px rgba(23, 43, 74, .18); }
.ledger-month-picker__years { display: grid; align-content: start; gap: 4px; max-height: 360px; padding: 12px 8px; overflow-y: auto; border-right: 1px solid var(--color-border); background: #fbfcfe; }
.ledger-month-picker__years button, .ledger-month-picker__months button { border: 0; border-radius: 9px; background: transparent; cursor: pointer; }
.ledger-month-picker__years button { height: 38px; color: var(--color-text-secondary); font-size: 15px; }
.ledger-month-picker__years button.active { color: var(--color-primary); background: #eaf2ff; box-shadow: inset 0 0 0 1px #8db9ff; }
.ledger-month-picker__months { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; align-content: start; padding: 18px; }
.ledger-month-picker__months button { height: 48px; color: var(--color-text-primary); font-size: 16px; }
.ledger-month-picker__months button:hover { background: #f1f6ff; }
.ledger-month-picker__months button.active { color: var(--color-primary); background: #eaf2ff; box-shadow: inset 0 0 0 1px #8db9ff; }
.ledger-month-picker__popover.is-year-picker { display: block; width: 360px; }
.ledger-month-picker__year-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; padding: 18px; }
.ledger-month-picker__year-grid button { height: 52px; color: var(--color-text-primary); border: 0; border-radius: 10px; background: transparent; cursor: pointer; font-size: 16px; }
.ledger-month-picker__year-grid button:hover { background: #f1f6ff; }
.ledger-month-picker__year-grid button.active { color: var(--color-primary); background: #eaf2ff; box-shadow: inset 0 0 0 1px #8db9ff; }
.ledger-dashboard__toolbar { min-height: 42px; }
.ledger-icon-button, .ledger-month-select { height: 36px; }
.ledger-icon-button { width: 36px; display: inline-grid; place-items: center; font-size: 0; }
.ledger-month-select { min-width: 122px; font-size: 16px; }
.ledger-mode-switch { height: 36px; }
.ledger-mode-switch button { height: 30px; min-width: 36px; padding: 0 10px; }
.ledger-dashboard__actions { gap: 8px; }
.ledger-dashboard__actions :deep(.n-button) { min-height: 36px; padding: 0 12px; }
.ledger-filter-panel { position: absolute; z-index: 10; top: 48px; right: 0; width: min(680px, calc(100vw - 32px)); grid-template-columns: repeat(4, minmax(0, 1fr)); padding: 12px; box-shadow: 0 14px 32px rgba(26, 45, 76, .14); }
.ledger-filter-panel__actions { grid-column: 1 / -1; justify-content: flex-end; }
.ledger-surface { padding: 16px; border-radius: 12px; }
.ledger-section-title { margin-bottom: 12px; font-size: 16px; }
.ledger-overview__grid { gap: 10px; }
.ledger-overview__grid article { min-height: 80px; padding: 13px 14px; }
.ledger-overview__grid article > span { font-size: 13px; }
.ledger-overview__grid article > strong { margin-top: 6px; font-size: 21px; }
.ledger-stat-icon { top: 13px; right: 13px; width: 28px; height: 28px; }
.ledger-content-grid { gap: 12px; }
.ledger-content-grid__left { gap: 12px; }
.ledger-chart-panel, .ledger-category-panel, .ledger-day-panel { min-height: 250px; }
.ledger-echart { display: block; width: 100%; min-width: 0; height: 220px; }
.ledger-bar-chart { height: 178px; padding-top: 8px; }
.ledger-bar-chart { display: grid; grid-template-columns: 34px minmax(0,1fr); gap: 8px; align-items: stretch; position: relative; border-bottom: 0; }
.ledger-bar-chart__axis { display: flex; flex-direction: column; justify-content: space-between; padding: 0 0 22px; color: var(--color-text-tertiary); font-size: 10px; text-align: right; }
.ledger-bar-chart__plot { display: flex; width: 100%; min-width: 0; align-items: end; gap: 4px; height: 100%; border-bottom: 1px solid var(--color-border); background: repeating-linear-gradient(to bottom, transparent 0, transparent calc(20% - 1px), var(--color-border) 20%); }
.ledger-bar-chart__item { height: 100%; }
.ledger-bar-chart__bars { display: flex; align-items: end; justify-content: center; gap: 2px; width: 100%; height: calc(100% - 38px); }
.ledger-bar-chart__item i { width: 7px; min-height: 0; }
.ledger-bar-chart__item i.expense { background: #f04444; }
.ledger-bar-chart__item i.income { background: var(--color-success); }
.ledger-category-summary { grid-template-columns: 145px minmax(0, 1fr); gap: 16px; }
.ledger-donut { width: 124px; height: 124px; }
.ledger-donut::before { width: 70px; height: 70px; }
.ledger-day-panel__head { padding: 16px 18px 12px; }
.ledger-day-panel__head strong { font-size: 18px; }
.ledger-day-panel__columns { padding: 9px 18px; }
.ledger-day-row { min-height: 52px; padding: 8px 18px; }
.ledger-day-row__category i { width: 26px; height: 26px; }
.ledger-detail-link { padding: 12px; }
.ledger-dashboard { display: grid; gap: 12px; }
.ledger-dashboard__toolbar, .ledger-period-controls, .ledger-dashboard__actions, .ledger-mode-switch, .ledger-chart-tabs { display: flex; align-items: center; }
.ledger-dashboard__toolbar { justify-content: space-between; gap: 16px; min-height: 52px; }
.ledger-period-controls, .ledger-dashboard__actions { gap: 10px; }
.ledger-icon-button, .ledger-month-select, .ledger-mode-switch, .ledger-chart-tabs { height: 42px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-bg-card); }
.ledger-icon-button { width: 42px; color: var(--color-text-primary); font-size: 26px; cursor: pointer; }
.ledger-month-select { width: 146px; min-width: 146px; padding: 0 12px; color: var(--color-text-primary); font-size: 18px; font-weight: 700; cursor: pointer; }
.ledger-mode-switch, .ledger-chart-tabs { padding: 3px; gap: 2px; background: var(--color-bg-hover); border-color: transparent; }
.ledger-mode-switch button, .ledger-chart-tabs button { height: 34px; min-width: 42px; padding: 0 14px; color: var(--color-text-secondary); border: 0; border-radius: 8px; background: transparent; cursor: pointer; }
.ledger-mode-switch button.active, .ledger-chart-tabs button.active { color: var(--color-primary); background: var(--color-bg-card); box-shadow: 0 1px 4px rgba(22,45,80,.1); }
.ledger-filter-panel { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)) auto; gap: 12px; padding: 14px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-bg-card); }
.ledger-filter-panel__actions { display: flex; gap: 8px; }
.ledger-surface { padding: 22px; border: 1px solid rgba(221,229,240,.9); border-radius: 16px; background: var(--color-bg-card); box-shadow: 0 8px 24px rgba(41,65,104,.045); }
.ledger-section-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; color: var(--color-text-primary); font-size: 19px; font-weight: 700; }
.ledger-section-title small { color: var(--color-text-tertiary); font-size: 13px; font-weight: 500; }
.ledger-overview__grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; }
.ledger-overview__grid article { position: relative; min-height: 96px; padding: 17px 18px; border-radius: 12px; background: linear-gradient(135deg,#fbfcff,#f6f8fc); }
.ledger-overview__grid article > span, .ledger-overview__grid article > strong { display: block; }
.ledger-overview__grid article > span { color: var(--color-text-secondary); font-size: 14px; }
.ledger-overview__grid article > strong { margin-top: 9px; color: var(--color-text-primary); font-size: 26px; }
.ledger-overview__grid article > strong.success { color: var(--color-success); } .ledger-overview__grid article > strong.danger { color: var(--color-danger); }
.ledger-stat-icon { position: absolute; top: 18px; right: 18px; display: grid; width: 34px; height: 34px; place-items: center; color: var(--color-primary); border-radius: 10px; background: #edf4ff; font-style: normal; }
.ledger-stat-icon.expense { color: #ef6b78; background: #fff0f2; } .ledger-stat-icon.balance { color: #7a5af8; background: #f2efff; } .ledger-stat-icon.average { color: #f59e0b; background: #fff6e7; }
.ledger-content-grid { display: grid; grid-template-columns: minmax(0,1.05fr) minmax(420px,1fr); gap: 18px; align-items: stretch; }
.ledger-content-grid__left { display: grid; gap: 18px; } .ledger-chart-panel, .ledger-category-panel, .ledger-day-panel { min-height: 300px; }
.ledger-chart-panel { min-width: 0; }
.ledger-chart-tabs { height: 34px; } .ledger-chart-tabs button { height: 28px; padding: 0 12px; }
.ledger-chart-tabs { height: 30px; padding: 2px; border-radius: 8px; }
.ledger-chart-tabs button { height: 26px; min-width: 38px; padding: 0 10px; font-size: 13px; font-weight: 600; }
.ledger-bar-chart { display: flex; align-items: end; gap: 4px; height: 220px; padding: 16px 8px 0; border-bottom: 1px solid var(--color-border); }
.ledger-bar-chart__item { display: flex; position: relative; flex: 1; align-items: center; justify-content: end; height: 100%; flex-direction: column; min-width: 0; }
.ledger-bar-chart__item i { display: block; width: min(14px,70%); min-height: 2px; border-radius: 5px 5px 0 0; background: var(--color-primary); transition: height .2s ease; }
.ledger-bar-chart__item i.income { background: var(--color-success); } .ledger-bar-chart__item i.all { background: linear-gradient(180deg,var(--color-primary),#8bb8ff); }
.ledger-bar-chart__item small { height: 22px; color: var(--color-text-tertiary); font-size: 11px; } .ledger-bar-chart__value { min-height: 16px; color: var(--color-text-secondary); font-size: 10px; }
.ledger-category-summary { display: grid; grid-template-columns: 180px minmax(0,1fr); gap: 26px; align-items: center; }
.ledger-donut { display: grid; position: relative; width: 152px; height: 152px; place-items: center; border-radius: 50%; cursor: crosshair; }
.ledger-donut svg { position: relative; z-index: 1; width: 152px; height: 152px; overflow: visible; }
.ledger-donut svg path { transition: none; }
.ledger-donut::before { content: ""; position: absolute; width: 88px; height: 88px; border-radius: 50%; background: var(--color-bg-card); }
.ledger-donut span { position: relative; z-index: 1; text-align: center; color: var(--color-text-secondary); font-size: 11px; } .ledger-donut strong { display: block; margin-top: 4px; color: var(--color-text-primary); font-size: 14px; }
.ledger-donut-tooltip { position: absolute; z-index: 4; top: 50%; left: calc(100% + 12px); display: grid; grid-template-columns: auto 1fr auto; gap: 4px 7px; min-width: 150px; padding: 9px 11px; color: var(--color-text-primary); background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 9px; box-shadow: 0 8px 24px rgba(18,32,56,.16); transform: translateY(-50%); pointer-events: none; white-space: nowrap; }
.ledger-donut-tooltip i { width: 9px; height: 9px; margin-top: 4px; border-radius: 50%; } .ledger-donut-tooltip strong { margin: 0; font-size: 12px; } .ledger-donut-tooltip b { font-size: 12px; } .ledger-donut-tooltip em { grid-column: 2 / -1; color: var(--color-text-tertiary); font-size: 11px; font-style: normal; }
.ledger-category-summary__list { display: grid; gap: 9px; } .ledger-category-summary__list > div { display: grid; grid-template-columns: minmax(80px,1fr) auto 42px; gap: 8px; align-items: center; font-size: 13px; }
.ledger-category-summary__list span { min-width: 0; overflow: hidden; color: var(--color-text-secondary); text-overflow: ellipsis; white-space: nowrap; }
.ledger-category-name { display: flex; align-items: center; gap: 6px; }
.ledger-category-name img, .ledger-category-name i { display: inline-grid; width: 20px; height: 20px; flex: 0 0 auto; place-items: center; border-radius: 6px; }
.ledger-category-name img { object-fit: cover; }
.ledger-category-name i { color: #fff; font-size: 11px; font-style: normal; }
.ledger-category-summary__list strong { color: var(--color-text-primary); font-size: 13px; } .ledger-category-summary__list em { color: var(--color-text-tertiary); font-style: normal; text-align: right; }
.ledger-category-summary__list b { display: block; grid-column: 1 / -1; height: 4px; overflow: hidden; border-radius: 4px; background: #edf1f7; } .ledger-category-summary__list b i { display: block; height: 100%; border-radius: inherit; }
.ledger-day-panel { display: flex; flex-direction: column; padding: 0; overflow: hidden; } .ledger-day-panel__head { display: flex; align-items: center; justify-content: space-between; padding: 22px 24px 16px; border-bottom: 1px solid var(--color-border); }
.ledger-day-panel__head strong { display: inline-block; margin-right: 8px; font-size: 22px; } .ledger-day-panel__head span { color: var(--color-text-secondary); } .ledger-day-panel__totals { display: flex; gap: 14px; } .ledger-day-panel__head b { font-size: 14px; } .ledger-day-panel__head b.income { color: var(--color-success); } .ledger-day-panel__head b.expense { color: var(--color-danger); }
.ledger-day-panel__date { display: flex; align-items: center; gap: 8px; }
.ledger-day-panel__date > div { min-width: 112px; text-align: center; }
.ledger-day-panel__date button { display: grid; width: 28px; height: 28px; padding: 0; place-items: center; color: var(--color-text-secondary); background: var(--color-surface-soft); border: 1px solid var(--color-border); border-radius: 8px; cursor: pointer; }
.ledger-day-panel__date button:hover { color: var(--color-primary); border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border)); }
.ledger-day-panel__date .ledger-calendar-date-button { margin-left: 2px; color: var(--color-primary); background: #edf4ff; border-color: #cfe0ff; }
.ledger-date-picker-input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.ledger-day-panel__columns { display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; padding: 12px 24px; color: var(--color-text-tertiary); font-size: 12px; background: var(--color-bg-hover); } .ledger-day-panel__columns span:last-child { text-align: right; }
.ledger-day-list { flex: 1; } .ledger-day-row, .ledger-day-panel__columns { display: grid; grid-template-columns: minmax(125px, 1fr) minmax(130px, 1fr) minmax(130px, 1fr) 112px; gap: 12px; align-items: center; } .ledger-day-row { position: relative; min-height: 61px; padding: 10px 24px; border-bottom: 1px solid var(--color-border); }
.ledger-day-panel__columns { padding: 10px 24px; color: var(--color-text-tertiary); background: var(--color-bg-soft); font-size: 12px; } .ledger-day-panel__columns span:last-child { text-align: right; }
.ledger-day-row { cursor: pointer; transition: background .16s ease; } .ledger-day-row:hover, .ledger-day-row:focus-visible { background: #f7faff; outline: none; } .ledger-day-row__category { display: flex; align-items: center; gap: 10px; min-width: 0; } .ledger-day-row__category i, .ledger-day-row__category img { display: grid; width: 30px; height: 30px; flex: 0 0 auto; place-items: center; color: var(--color-primary); border-radius: 50%; background: #edf4ff; font-style: normal; font-size: 13px; object-fit: cover; }
.ledger-day-row__category strong, .ledger-day-row__note { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .ledger-day-row__name { display: flex; min-width: 0; align-items: center; gap: 8px; overflow: hidden; color: var(--color-text-secondary); } .ledger-day-row__name strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; } .ledger-day-row__name em { flex: 0 0 auto; padding: 2px 6px; color: var(--color-primary); background: var(--color-primary-light); border-radius: 999px; font-size: 11px; font-style: normal; line-height: 1.3; } .ledger-day-row__note { color: var(--color-text-tertiary); } .ledger-account-cell { display: flex; align-items: center; gap: 8px; min-width: 0; } .ledger-account-cell img, .ledger-account-cell i { display: grid; width: 24px; height: 24px; flex: 0 0 auto; place-items: center; border-radius: 7px; font-size: 11px; font-style: normal; object-fit: cover; } .ledger-day-row__amount { text-align: right; white-space: nowrap; } .ledger-day-row__amount.positive { color: var(--color-success); } .ledger-day-row__amount.negative { color: var(--color-danger); }
.ledger-detail-link { margin: auto auto 0; padding: 17px; color: var(--color-primary); border: 0; background: transparent; cursor: pointer; font-size: 14px; }
.calendar-entry > .r-tag { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; line-height: 1; }
@media (max-width: 1100px) { .ledger-content-grid { grid-template-columns: 1fr; } .ledger-filter-panel { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media (max-width: 760px) { .ledger-dashboard__toolbar { align-items: stretch; flex-direction: column; } .ledger-dashboard__actions { justify-content: stretch; } .ledger-dashboard__actions > * { flex: 1; } .ledger-overview__grid { grid-template-columns: repeat(2,minmax(0,1fr)); } .ledger-filter-panel { grid-template-columns: 1fr; } .ledger-category-summary { grid-template-columns: 1fr; justify-items: center; } .ledger-day-panel { overflow-x: auto; } .ledger-day-list, .ledger-day-panel__columns { min-width: 560px; } .ledger-day-row, .ledger-day-panel__columns { grid-template-columns: 125px 130px 130px 92px; } }
@media (max-width: 760px) { .asset-link-box { grid-template-columns: 1fr; } .asset-link-box > .r-select, .asset-link-box > .r-input { grid-column: 1 / -1; } }
</style>

<style>
.rizhi-ledger-modal-card.n-card {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 48px);
  overflow: hidden;
  background: var(--color-bg-card);
  box-shadow: 0 24px 80px rgba(17, 24, 39, 0.22);
}

.rizhi-ledger-modal-card .n-card__content {
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 0 !important;
}

.rizhi-calendar-modal.n-card { height: min(720px, calc(100dvh - 48px)); overflow: hidden; }
.rizhi-calendar-modal .n-card__content { height: 100%; min-height: 0; padding: 0 !important; overflow: hidden; }
.rizhi-calendar-modal .r-card { height: 100%; }
.rizhi-calendar-modal .r-card > .n-card__content { height: 100%; min-height: 0; padding: 0 !important; }
</style>
