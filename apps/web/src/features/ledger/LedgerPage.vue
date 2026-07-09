<template>
  <RDataGate :loading="store.loading" :ready="store.initialized" :error="store.error" @retry="initializeData">
    <section class="ledger-page">
    <div class="ledger-tabs">
      <button :class="{ active: mode === 'records' }" @click="mode = 'records'">交易记录</button>
      <button :class="{ active: mode === 'calendar' }" @click="mode = 'calendar'">日历视图</button>
    </div>

    <div class="ledger-filters">
      <RDatePicker v-model="dateRange" type="daterange" />
      <RSelect v-model="typeFilter" :options="typeOptions" placeholder="全部类型" />
      <RSelect v-model="categoryFilter" :options="categoryOptions" placeholder="全部一级分类" />
      <RSelect v-model="subCategoryFilter" :options="subCategoryFilterOptions" placeholder="全部子分类" />
      <RSelect v-model="assetFilter" :options="assetOptions" placeholder="全部物品" />
      <RSelect v-model="accountFilter" :options="accountOptions" placeholder="全部账户" />
      <div class="create-actions">
        <RButton variant="danger" @click="openCreateModal('expense')">支出</RButton>
        <RButton @click="openCreateModal('income')">收入</RButton>
      </div>
    </div>

    <RInput v-model="keyword" class="ledger-search" placeholder="搜索商家、备注、金额" />

    <RCard>
      <div class="ledger-summary">
        <div><span>支出</span><strong class="danger">{{ formatAmount(monthExpense) }}</strong></div>
        <div><span>收入</span><strong class="success">{{ formatAmount(monthIncome) }}</strong></div>
        <div><span>净流入</span><strong :class="monthNet >= 0 ? 'success' : 'danger'">{{ monthNet >= 0 ? "" : "-" }}{{ formatAmount(monthNet) }}</strong></div>
      </div>
    </RCard>

    <RCard>
      <div class="category-breakdown">
        <div class="section-head">
          <div>
            <span>分类统计</span>
            <h3>当前筛选范围的收支结构</h3>
          </div>
          <small>{{ categoryBreakdown.length ? `共 ${categoryBreakdown.length} 个一级分类` : "暂无分类数据" }}</small>
        </div>
        <div v-if="categoryBreakdown.length" class="category-breakdown__grid">
          <section v-for="group in categoryBreakdown" :key="group.key" class="category-stat-card">
            <div class="category-stat-card__head">
              <RTag :tone="group.direction === 'income' ? 'success' : 'danger'">{{ group.direction === "income" ? "收入" : "支出" }}</RTag>
              <strong>{{ group.categoryName }}</strong>
              <em :class="group.direction === 'income' ? 'positive' : 'negative'">
                {{ group.direction === "income" ? "+" : "-" }}{{ formatAmount(group.total) }}
              </em>
            </div>
            <div class="category-stat-card__bar">
              <i :class="{ over: group.budgetStatus === 'over', warning: group.budgetStatus === 'warning' }" :style="{ width: `${group.budgetBarWidth ?? group.ratio}%` }"></i>
            </div>
            <div v-if="group.monthlyBudget" class="budget-row" :class="group.budgetStatus">
              <span>月预算 {{ formatAmount(group.monthlyBudget) }}</span>
              <strong>{{ group.budgetStatus === "over" ? "已超出" : "已使用" }} {{ group.budgetProgress }}%</strong>
            </div>
            <div class="sub-category-list">
              <div v-for="sub in group.subCategories" :key="sub.key">
                <span>{{ sub.name }}</span>
                <strong>{{ formatAmount(sub.total) }}</strong>
              </div>
            </div>
          </section>
        </div>
        <div v-else class="category-breakdown__empty">当前筛选范围内还没有可统计的记账。</div>
      </div>
    </RCard>

    <RCard>
      <div class="trend-panel">
        <div class="section-head">
          <div>
            <span>趋势分析</span>
            <h3>最近 3 个月收支变化</h3>
          </div>
          <small>跟随当前分类、账户和关键词筛选</small>
        </div>
        <div class="trend-grid">
          <section class="trend-months">
            <div v-for="month in recentMonthSummaries" :key="month.key" class="trend-month-card">
              <span>{{ month.label }}</span>
              <strong :class="month.net >= 0 ? 'positive' : 'negative'">{{ month.net >= 0 ? "" : "-" }}{{ formatAmount(month.net) }}</strong>
              <div>
                <em class="positive">收入 {{ formatAmount(month.income) }}</em>
                <em class="negative">支出 {{ formatAmount(month.expense) }}</em>
              </div>
            </div>
          </section>
          <section class="trend-card">
            <div class="trend-card__head">
              <span>支出分类环比</span>
              <strong>{{ categoryMoMTrends.length ? "本月 vs 上月" : "暂无可比数据" }}</strong>
            </div>
            <div v-if="categoryMoMTrends.length" class="mom-list">
              <div v-for="item in categoryMoMTrends" :key="item.categoryId">
                <span>{{ item.name }}</span>
                <strong :class="item.delta >= 0 ? 'negative' : 'positive'">{{ item.delta >= 0 ? "+" : "" }}{{ item.delta }}%</strong>
                <em>{{ formatAmount(item.current) }}</em>
              </div>
            </div>
            <p v-else>最近两个月还没有足够的支出分类数据。</p>
          </section>
          <section class="trend-card">
            <div class="trend-card__head">
              <span>预算提醒</span>
              <strong>{{ budgetInsights.length ? `${budgetInsights.length} 个分类` : "暂无预算提醒" }}</strong>
            </div>
            <div v-if="budgetInsights.length" class="budget-insight-list">
              <div v-for="item in budgetInsights" :key="item.categoryId" :class="item.status">
                <span>{{ item.name }}</span>
                <strong>{{ item.status === "over" ? `超出 ${formatAmount(item.diff)}` : `剩余 ${formatAmount(item.diff)}` }}</strong>
                <em>{{ item.progress }}%</em>
              </div>
            </div>
            <p v-else>设置支出分类月预算后，这里会提示剩余和超支。</p>
          </section>
        </div>
      </div>
    </RCard>

    <RCard v-if="mode === 'records'">
      <table v-if="filteredEntries.length" class="ledger-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>类型</th>
            <th>分类</th>
            <th>商家/备注</th>
            <th>账户</th>
            <th>关联资产</th>
            <th>金额</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in filteredEntries" :key="entry.id" data-testid="ledger-row">
            <td>{{ formatDateTime(displayOccurredAt(entry)) }}</td>
            <td><RTag :tone="tagTone(entry.type)">{{ transactionTypeLabel(entry.type) }}</RTag></td>
            <td><span class="ledger-category-cell"><CategoryIcon :category="categoryForEntry(entry)" :size="18" /><span>{{ categoryLabel(entry) }}</span></span></td>
            <td>{{ entry.merchant || entry.note || "-" }}</td>
            <td>{{ accountRelationLabel(entry) }}</td>
            <td>{{ assetName(entry) }}</td>
            <td class="amount" :class="{ positive: isPositive(entry.type), negative: !isPositive(entry.type), warning: isRepaymentTransaction(entry) }">
              {{ amountPrefix(entry) }}{{ formatAmount(entry.amount) }}
            </td>
            <td class="ops">
              <button :disabled="isProtectedTransaction(entry) || isRepaymentTransaction(entry) || isTransferTransaction(entry)" :title="protectedTransactionTip(entry)" @click="editEntry(entry.id)">编辑</button>
              <button data-testid="ledger-delete-transaction" :disabled="isProtectedTransaction(entry)" :title="protectedTransactionTip(entry)" @click="deleteEntry(entry.id)">{{ isRepaymentTransaction(entry) || isTransferTransaction(entry) ? "撤销" : "删除" }}</button>
            </td>
          </tr>
        </tbody>
      </table>
      <REmptyState v-else title="没有符合条件的交易" description="调整筛选条件，或新增一笔收入或支出。" />
    </RCard>

    <RCard v-else>
      <div class="ledger-calendar">
        <div class="calendar-toolbar">
          <div>
            <span>日历视图</span>
            <strong>{{ calendarTitle }}</strong>
          </div>
          <div class="calendar-actions">
            <button type="button" @click="shiftCalendarMonth(-1)">上个月</button>
            <button type="button" @click="goCurrentMonth">本月</button>
            <button type="button" @click="shiftCalendarMonth(1)">下个月</button>
          </div>
        </div>

        <div class="calendar-layout">
          <div class="calendar-board">
            <div v-for="weekday in weekdays" :key="weekday" class="calendar-weekday">{{ weekday }}</div>
            <button
              v-for="day in calendarDays"
              :key="day.key"
              type="button"
              class="calendar-day"
              :class="{ muted: !day.inMonth, today: day.isToday, selected: day.dateKey === selectedDateKey }"
              @click="selectedDateKey = day.dateKey"
            >
              <span>{{ day.day }}</span>
              <div v-if="day.count" class="day-summary">
                <em v-if="day.income" class="positive">+{{ compactAmount(day.income) }}</em>
                <em v-if="day.expense" class="negative">-{{ compactAmount(day.expense) }}</em>
                <strong :class="day.net >= 0 ? 'positive' : 'negative'">{{ day.net >= 0 ? "+" : "-" }}{{ compactAmount(Math.abs(day.net)) }}</strong>
              </div>
              <small v-if="day.count">{{ day.count }} 笔</small>
            </button>
          </div>

          <aside class="calendar-detail">
            <div class="calendar-detail__head">
              <span>选中日期</span>
              <strong>{{ selectedDateLabel }}</strong>
            </div>
            <div class="calendar-detail__summary">
              <div><span>收入</span><strong class="positive">{{ formatAmount(selectedDayIncome) }}</strong></div>
              <div><span>支出</span><strong class="negative">{{ formatAmount(selectedDayExpense) }}</strong></div>
              <div><span>净流入</span><strong :class="selectedDayNet >= 0 ? 'positive' : 'negative'">{{ selectedDayNet >= 0 ? "" : "-" }}{{ formatAmount(selectedDayNet) }}</strong></div>
            </div>
            <div v-if="selectedDayCategoryBreakdown.length" class="calendar-category-breakdown">
              <div v-for="group in selectedDayCategoryBreakdown" :key="group.key">
                <span>{{ group.categoryName }}</span>
                <strong :class="group.direction === 'income' ? 'positive' : 'negative'">
                  {{ group.direction === "income" ? "+" : "-" }}{{ formatAmount(group.total) }}
                </strong>
              </div>
            </div>
            <div v-if="selectedDayEntries.length" class="calendar-entry-list">
              <div v-for="entry in selectedDayEntries" :key="entry.id" class="calendar-entry">
                <RTag :tone="tagTone(entry.type)">{{ transactionTypeLabel(entry.type) }}</RTag>
                <div>
                  <strong>{{ entry.merchant || entry.note || categoryLabel(entry) }}</strong>
                  <span>{{ categoryLabel(entry) }} / {{ accountRelationLabel(entry) }}</span>
                </div>
                <em :class="isPositive(entry.type) ? 'positive' : isRepaymentTransaction(entry) ? 'warning' : 'negative'">
                  {{ amountPrefix(entry) }}{{ formatAmount(entry.amount) }}
                </em>
              </div>
            </div>
            <div v-else class="calendar-empty">这一天暂无交易</div>
          </aside>
        </div>
      </div>
    </RCard>

    <div v-if="mode === 'records'" class="pagination">
      <span>当前筛选共 {{ filteredEntries.length }} 条交易</span>
    </div>

    <n-modal
      v-model:show="showModal"
      preset="card"
      :bordered="false"
      :closable="false"
      :mask-closable="false"
      class="rizhi-ledger-modal-card"
      content-style="padding: 0;"
      :style="{ width: 'min(860px, calc(100vw - 48px))', maxHeight: 'calc(100dvh - 48px)', borderRadius: '18px', overflow: 'hidden' }"
    >
      <section class="ledger-modal" :class="{ income: draftType === 'income' }">
        <header class="ledger-modal__hero">
          <div>
            <span>{{ draftType === "income" ? "Income" : "Expense" }}</span>
            <h2>{{ draftType === "income" ? "记录一笔收入" : "记录一笔日常支出" }}</h2>
            <p>{{ draftType === "income" ? "收入会增加所选账户余额。" : "支出会减少现金账户余额，或增加信用/负债账户欠款。" }}</p>
          </div>
          <button type="button" @click="requestCloseLedgerModal">×</button>
        </header>

        <div class="ledger-modal__body">
          <div class="amount-panel" :class="{ invalid: draftErrors.amount }">
            <span>金额</span>
            <div class="amount-input">
              <strong>¥</strong>
              <input v-model="draftAmount" placeholder="0.00" />
            </div>
            <em>{{ draftErrors.amount }}</em>
            <p>{{ draftType === "income" ? "收入会增加所选账户余额。" : "支出会同步写入账户流水。" }}</p>
          </div>

          <div class="ledger-form">
            <section class="form-section">
              <h3>交易信息</h3>
              <div class="form-grid">
                <label :class="{ invalid: draftErrors.date }"><span>发生日期</span><RDatePicker v-model="transactionDate" type="datetime" placeholder="选择日期时间" /><em>{{ draftErrors.date }}</em></label>
                <div class="category-field" :class="{ invalid: draftErrors.categoryId }">
                  <CategoryCascadePicker
                    v-model:category-id="draftCategoryId"
                    v-model:sub-category-id="draftSubCategoryId"
                    :scope="draftType"
                    :title="draftType === 'income' ? '收入分类' : '支出分类'"
                  />
                  <em>{{ draftErrors.categoryId }}</em>
                </div>
                <label :class="{ invalid: draftErrors.accountId }"><span>{{ draftType === "income" ? "收款账户" : "付款账户" }}</span><RSelect v-model="draftAccountId" :options="accountCreateOptions" placeholder="选择账户" /><em>{{ draftErrors.accountId }}</em></label>
                <label><span>{{ draftType === "income" ? "来源" : "商家" }}</span><RInput v-model="draftMerchant" :placeholder="draftType === 'income' ? '例如 工资 / 副业' : '例如 麦当劳 / 京东'" /></label>
              </div>
            </section>

            <section v-if="draftType === 'expense'" class="form-section">
              <h3>资产关联（可选）</h3>
              <div class="asset-link-box" :class="{ invalid: draftErrors.assetId }">
                <RSelect v-model="draftAssetId" :options="assetCreateOptions" placeholder="选择已有资产" />
                <em>{{ draftErrors.assetId }}</em>
                <div class="link-options">
                  <label><input v-model="assetLinkMode" type="radio" value="related" /> 仅作为相关支出</label>
                  <label><input v-model="assetLinkMode" type="radio" value="addon-included" /> 作为附加项并计入资产成本</label>
                  <label><input v-model="assetLinkMode" type="radio" value="addon-excluded" /> 作为附加项但不计入成本</label>
                </div>
              </div>
            </section>

            <section class="form-section">
              <h3>备注与凭证</h3>
              <RInput v-model="draftNote" placeholder="添加备注，例如订单号、用途、说明" />
              <div class="receipt-box">+ 上传凭证</div>
            </section>
            <RInlineFeedback v-if="draftErrors.form" tone="danger">{{ draftErrors.form }}</RInlineFeedback>
          </div>
        </div>

        <footer class="ledger-modal__footer">
          <RButton variant="secondary" @click="requestCloseLedgerModal">取消</RButton>
          <RButton :variant="draftType === 'income' ? 'primary' : 'danger'" :loading="saving" @click="saveDraft">
            {{ draftType === "income" ? "保存收入" : "保存支出" }}
          </RButton>
        </footer>
      </section>
    </n-modal>

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
import { NModal } from "naive-ui";
import CategoryCascadePicker from "@/components/business/CategoryCascadePicker.vue";
import CategoryIcon from "@/components/business/CategoryIcon.vue";
import DeleteConfirmModal from "@/components/business/DeleteConfirmModal.vue";
import RButton from "@/components/ui/RButton.vue";
import RCard from "@/components/ui/RCard.vue";
import RDatePicker from "@/components/ui/RDatePicker.vue";
import RInput from "@/components/ui/RInput.vue";
import RSelect from "@/components/ui/RSelect.vue";
import RTag from "@/components/ui/RTag.vue";
import RDataGate from "@/components/ui/RDataGate.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import REmptyState from "@/components/ui/REmptyState.vue";
import { categoryHasScope } from "@/domain/categoryScopes";
import type { AssetAddonRecord, TransactionRecord, TransactionType } from "@/domain/models";
import { assetAddonService } from "@/services/assetAddonService";
import { transactionService } from "@/services/transactionService";
import { useAppDataStore } from "@/stores/appDataStore";

const store = useAppDataStore();
const router = useRouter();
const route = useRoute();

const mode = ref<"records" | "calendar">("records");
const dateRange = ref<[number, number] | null>(null);
const typeFilter = ref<string | number | null>("all");
const categoryFilter = ref<string | number | null>("all");
const subCategoryFilter = ref<string | number | null>("all");
const assetFilter = ref<string | number | null>("all");
const accountFilter = ref<string | number | null>("all");
const keyword = ref("");
const showModal = ref(false);
const showDeleteModal = ref(false);
const showProtectedTransferModal = ref(false);
const showUnsavedLedgerModal = ref(false);
const saving = ref(false);
const deletingTransactionLoading = ref(false);
const draftType = ref<"expense" | "income">("expense");
const draftAmount = ref("");
const draftCategoryId = ref<string | number | null>(null);
const draftSubCategoryId = ref<string | number | null>(null);
const draftAccountId = ref<string | number | null>(null);
const draftAssetId = ref<string | number | null>(null);
const draftMerchant = ref("");
const draftNote = ref("");
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
const initialLedgerDraftSnapshot = ref("");

const transactionCategories = computed(() => store.categories.filter((category) => categoryHasScope(category, "expense") || categoryHasScope(category, "income")));
const activeTransactionCategories = computed(() => transactionCategories.value.filter((category) => category.enabled !== false && !category.deletedAt));
const expenseCategories = computed(() => activeTransactionCategories.value.filter((category) => categoryHasScope(category, "expense") && !category.parentId));
const incomeCategories = computed(() => activeTransactionCategories.value.filter((category) => categoryHasScope(category, "income") && !category.parentId));
const typeOptions = [
  { label: "全部类型", value: "all" },
  { label: "支出", value: "expense" },
  { label: "收入", value: "income" },
];
const categoryOptions = computed(() => [
  { label: "全部一级分类", value: "all" },
  ...activeTransactionCategories.value
    .filter((category) => !category.parentId)
    .map((category) => ({ label: category.name, value: category.id })),
]);
const subCategoryFilterOptions = computed(() => [
  { label: "全部子分类", value: "all" },
  ...activeTransactionCategories.value
    .filter((category) => category.parentId && (isAllFilter(categoryFilter.value) || category.parentId === categoryFilter.value))
    .map((category) => ({ label: category.name, value: category.id })),
]);
const assetOptions = computed(() => [
  { label: "全部物品", value: "all" },
  ...store.assets.map((asset) => ({ label: asset.name, value: asset.id })),
]);
const accountOptions = computed(() => [
  { label: "全部账户", value: "all" },
  ...store.accounts.map((account) => ({ label: account.name, value: account.id })),
]);
const accountCreateOptions = computed(() => store.accounts.map((account) => ({ label: account.name, value: account.id })));
const assetCreateOptions = computed(() => store.assets.map((asset) => ({ label: asset.name, value: asset.id })));
const ledgerEntries = computed(() => store.transactions
  .filter((entry) => entry.type !== "transfer" && entry.businessType !== "balance_adjustment")
  .sort((left, right) =>
    new Date(displayOccurredAt(right)).getTime() - new Date(displayOccurredAt(left)).getTime() ||
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()));
const filteredEntries = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  return ledgerEntries.value.filter((entry) => matchesLedgerFilters(entry, q, true));
});
const trendEntries = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  return ledgerEntries.value.filter((entry) => matchesLedgerFilters(entry, q, false));
});
const monthIncome = computed(() => filteredEntries.value
  .filter((entry) => ledgerDirection(entry) === "income")
  .reduce((sum, entry) => sum + entry.amount, 0));
const monthExpense = computed(() => filteredEntries.value
  .filter((entry) => ledgerDirection(entry) === "expense")
  .reduce((sum, entry) => sum + entry.amount, 0));
const monthNet = computed(() => monthIncome.value - monthExpense.value);
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
    .filter((category) => categoryHasScope(category, "expense") && !category.parentId && !category.deletedAt && category.monthlyBudget && category.monthlyBudget > 0)
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
  const requiredCells = firstDayIndex + monthEnd.getDate();
  const gridCells = Math.ceil(requiredCells / 7) * 7;
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
  if (store.initialized) applyRouteState();
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

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
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
  selectedDateKey.value = toDateKey(next);
}

function goCurrentMonth() {
  const today = new Date();
  calendarMonth.value = startOfMonth(today).getTime();
  selectedDateKey.value = toDateKey(today);
}

function formatAmount(value: number) {
  return `¥${Math.abs(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function compactAmount(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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
  if (!draftAccountId.value) draftErrors.accountId = draftType.value === "income" ? "请选择收款账户。" : "请选择付款账户。";
  if (draftType.value === "expense" && assetLinkMode.value !== "related" && !draftAssetId.value) {
    draftErrors.assetId = "作为附加项时必须选择关联资产。";
  }
  return !draftErrors.amount && !draftErrors.date && !draftErrors.categoryId && !draftErrors.accountId && !draftErrors.assetId;
}

function categoryName(id: string) {
  return store.categories.find((category) => category.id === id)?.name ?? "-";
}

function categoryLabel(entry: TransactionRecord) {
  const category = entry.categorySnapshot?.categoryName ?? categoryName(entry.categoryId);
  const subCategory = entry.categorySnapshot?.subCategoryName ?? (entry.subCategoryId ? categoryName(entry.subCategoryId) : "");
  return subCategory && subCategory !== "-" ? `${category} / ${subCategory}` : category;
}

function categoryForEntry(entry: TransactionRecord) {
  return store.categories.find((item) => item.id === (entry.subCategoryId || entry.categoryId))
    || store.categories.find((item) => item.id === entry.categoryId);
}

function matchesLedgerFilters(entry: TransactionRecord, q: string, includeDate: boolean) {
  const direction = ledgerDirection(entry);
  const matchesType = isAllFilter(typeFilter.value) || direction === typeFilter.value;
  const matchesCategory = isAllFilter(categoryFilter.value) || entry.categoryId === categoryFilter.value;
  const matchesSubCategory = isAllFilter(subCategoryFilter.value) || entry.subCategoryId === subCategoryFilter.value;
  const matchesAsset = isAllFilter(assetFilter.value) || entry.assetId === assetFilter.value;
  const matchesAccount = isAllFilter(accountFilter.value) || entry.accountId === accountFilter.value;
  const matchesDate = !includeDate || !dateRange.value || (
    new Date(entry.occurredAt).getTime() >= dateRange.value[0] &&
    new Date(entry.occurredAt).getTime() <= dateRange.value[1]
  );
  const haystack = `${entry.merchant ?? ""}${entry.note ?? ""}${entry.amount}${categoryLabel(entry)}${accountName(entry.accountId)}`.toLowerCase();
  return matchesType && matchesCategory && matchesSubCategory && matchesAsset && matchesAccount && matchesDate && (!q || haystack.includes(q));
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
    const categoryNameValue = entry.categorySnapshot?.categoryName ?? categoryName(entry.categoryId);
    const categoryKey = `${direction}:${entry.categoryId}:${categoryNameValue}`;
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
  if (!category || !categoryHasScope(category, "expense") || category.parentId) return undefined;
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

function accountName(id: string) {
  return store.accounts.find((account) => account.id === id)?.name ?? "-";
}

function accountRelationLabel(entry: TransactionRecord) {
  if (isRepaymentTransaction(entry) && entry.relatedAccountId) {
    return `${accountName(entry.accountId)} → ${accountName(entry.relatedAccountId)}`;
  }
  return accountName(entry.accountId);
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

function resetDraft(type: "expense" | "income") {
  editingTransactionId.value = null;
  draftType.value = type;
  draftAmount.value = "";
  draftCategoryId.value = type === "income" ? incomeCategories.value[0]?.id ?? null : expenseCategories.value[0]?.id ?? null;
  draftSubCategoryId.value = "none";
  draftAccountId.value = store.accounts[0]?.id ?? null;
  draftAssetId.value = null;
  draftMerchant.value = "";
  draftNote.value = "";
  assetLinkMode.value = "related";
  transactionDate.value = Date.now();
  clearDraftErrors();
  initialLedgerDraftSnapshot.value = serializeLedgerDraft();
}

function openCreateModal(type: "expense" | "income") {
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
  draftAccountId.value = entry.accountId;
  draftAssetId.value = entry.assetId ?? null;
  draftMerchant.value = entry.merchant ?? "";
  draftNote.value = entry.note ?? "";
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
      accountFilter.value = entry.accountId;
      assetFilter.value = entry.assetId ?? "all";
      keyword.value = entry.note || entry.merchant || "";

      if (!isRepaymentTransaction(entry)) {
        editEntry(entry.id);
      }
      return;
    }
  }

  const requestedType = typeof route.query.type === "string" ? route.query.type : "";
  const requestedMonth = typeof route.query.month === "string" ? route.query.month : "";
  if (!requestedType && !requestedMonth) return;

  const today = new Date();
  mode.value = "records";
  typeFilter.value = requestedType === "income" || requestedType === "expense" ? requestedType : "all";
  categoryFilter.value = "all";
  subCategoryFilter.value = "all";
  accountFilter.value = "all";
  assetFilter.value = "all";
  keyword.value = "";
  if (requestedMonth === "current") {
    dateRange.value = [startOfMonth(today).getTime(), endOfMonth(today).getTime()];
  }
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
          accountId: String(draftAccountId.value),
          assetId: draftAssetId.value ? String(draftAssetId.value) : undefined,
          merchant: draftMerchant.value,
          note: draftNote.value,
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
        accountId: String(draftAccountId.value),
        assetId: draftAssetId.value ? String(draftAssetId.value) : undefined,
        merchant: draftMerchant.value,
        note: draftNote.value,
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
  grid-template-columns: 260px repeat(5, minmax(130px, 1fr)) auto;
  gap: var(--space-4);
  align-items: center;
}

.create-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

.ledger-search {
  width: 330px;
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

.ledger-category-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
}

.ledger-category-cell svg {
  color: var(--color-primary);
}

.ledger-calendar {
  display: grid;
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
  grid-template-columns: minmax(0, 1fr) 282px;
  gap: var(--space-4);
  align-items: start;
}

.calendar-board {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
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

.calendar-entry span {
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

.ledger-modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: calc(100dvh - 48px);
  overflow: hidden;
  background: var(--color-bg-card);
}

.ledger-modal__hero {
  display: flex;
  flex: 0 0 auto;
  justify-content: space-between;
  gap: var(--space-6);
  padding: 28px 32px;
  color: #fff;
  background:
    radial-gradient(circle at 84% 18%, rgba(255, 255, 255, 0.25), transparent 26%),
    linear-gradient(135deg, #f04438, #ff776d);
}

.ledger-modal.income .ledger-modal__hero {
  background:
    radial-gradient(circle at 84% 18%, rgba(255, 255, 255, 0.25), transparent 26%),
    linear-gradient(135deg, #0f9f6e, #16a36a);
}

.ledger-modal__hero span {
  font-size: var(--font-caption);
  font-weight: 800;
  opacity: 0.86;
  text-transform: uppercase;
}

.ledger-modal__hero h2 {
  margin: var(--space-2) 0;
  font-size: 24px;
}

.ledger-modal__hero p {
  margin: 0;
  opacity: 0.85;
}

.ledger-modal__hero button {
  width: 32px;
  height: 32px;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.ledger-modal__body {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: 250px 1fr;
  gap: var(--space-6);
  min-height: 0;
  overflow: auto;
  padding: 28px 32px;
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
  gap: var(--space-4);
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
.category-field.invalid,
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
.category-field em,
.asset-link-box em,
.amount-panel em {
  min-height: 16px;
  color: var(--color-danger);
  font-style: normal;
  font-weight: 600;
  line-height: 16px;
}

.category-field {
  display: grid;
  grid-column: 1 / -1;
  gap: var(--space-2);
}

.category-field.invalid :deep(.category-cascade) {
  padding: var(--space-3);
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 12px;
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
  height: 60px;
  place-items: center;
  color: var(--color-text-tertiary);
  background: var(--color-bg-hover);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-lg);
}

.ledger-modal__footer {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: 20px 32px;
  background: var(--color-bg-hover);
  border-top: 1px solid var(--color-border);
}

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

  .ledger-search {
    width: 100%;
  }
}
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
  min-height: 0;
  overflow: hidden;
  padding: 0 !important;
}
</style>
