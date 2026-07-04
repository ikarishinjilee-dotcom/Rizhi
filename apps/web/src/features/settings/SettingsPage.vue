<template>
  <RDataGate :loading="store.loading" :ready="store.initialized" :error="store.error" @retry="initializeData">
    <section class="settings-page">
    <header class="settings-header">
      <div class="settings-identity">
        <div class="avatar">
          <img v-if="profileDraft.avatarDataUrl" :src="profileDraft.avatarDataUrl" alt="" />
          <span v-else>{{ profileInitial }}</span>
        </div>
        <div>
          <p>设置中心</p>
          <h1>{{ currentSectionTitle }}</h1>
          <span>{{ currentSectionDescription }}</span>
        </div>
      </div>
      <nav class="settings-nav" aria-label="设置中心导航">
        <RouterLink v-for="item in settingsNavItems" :key="item.path" :to="item.path">
          <component :is="item.icon" :size="17" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </header>

    <div v-if="activeSection === 'overview'" class="settings-overview">
      <RouterLink v-for="item in overviewItems" :key="item.path" :to="item.path" class="overview-card">
        <span class="overview-card__icon"><component :is="item.icon" :size="20" /></span>
        <div>
          <h2>{{ item.label }}</h2>
          <p>{{ item.description }}</p>
        </div>
        <span class="overview-card__meta">{{ item.meta }}</span>
        <ChevronRight :size="18" />
      </RouterLink>
    </div>

    <RCard v-if="activeSection === 'profile'">
      <div class="profile-settings">
        <section class="profile-photo-panel">
          <div class="profile-photo">
            <img v-if="profileDraft.avatarDataUrl" :src="profileDraft.avatarDataUrl" alt="当前头像" />
            <span v-else>{{ profileInitial }}</span>
          </div>
          <div>
            <h2>个人头像</h2>
            <p>图片只保存在当前浏览器，不会上传到服务器。</p>
          </div>
          <RButton variant="secondary" @click="avatarFileInput?.click()">选择图片</RButton>
          <button v-if="profileDraft.avatarDataUrl" class="text-danger-button" type="button" @click="profileDraft.avatarDataUrl = undefined">移除头像</button>
          <input ref="avatarFileInput" class="hidden-file" type="file" accept="image/png,image/jpeg,image/webp" @change="selectAvatar" />
        </section>
        <section class="profile-form">
          <div class="section-heading">
            <h2>基本资料</h2>
            <p>这些信息用于应用内的账户标识和界面展示。</p>
          </div>
          <div class="profile-form__grid">
            <label>
              <span>显示名称</span>
              <RInput v-model="profileDraft.displayName" placeholder="请输入显示名称" />
            </label>
            <label>
              <span>默认货币</span>
              <RSelect v-model="profileDraft.currency" :options="currencyOptions" />
            </label>
            <label>
              <span>语言</span>
              <RSelect v-model="profileDraft.locale" :options="localeOptions" />
            </label>
            <label>
              <span>每周开始日</span>
              <RSelect v-model="profileDraft.firstDayOfWeek" :options="weekStartOptions" />
            </label>
          </div>
          <RInlineFeedback v-if="profileMessage" :tone="profileMessageTone">{{ profileMessage }}</RInlineFeedback>
          <div class="profile-actions">
            <RButton :loading="savingProfile" @click="saveProfile">保存设置</RButton>
            <RButton variant="secondary" @click="loadProfile">恢复已保存内容</RButton>
          </div>
        </section>
      </div>
    </RCard>

    <RCard v-if="activeSection === 'data'">
      <div class="settings-section">
        <div class="section-heading">
          <h2>本地数据</h2>
          <p>当前数据存储在浏览器 IndexedDB 中。建议定期导出备份，避免浏览器数据被清理后丢失。</p>
        </div>
        <div class="data-grid">
          <div><span>资产</span><strong>{{ store.assets.length }}</strong></div>
          <div><span>附加项</span><strong>{{ store.assetAddons.length }}</strong></div>
          <div><span>账户</span><strong>{{ store.accounts.length }}</strong></div>
          <div><span>交易</span><strong>{{ store.transactions.length }}</strong></div>
        </div>
        <div class="backup-zone">
          <div>
            <h3>备份与恢复</h3>
            <p>导出 JSON 备份文件，后续可覆盖恢复到本地 IndexedDB。导入会先校验文件格式。</p>
          </div>
          <div class="action-row">
            <RButton variant="secondary" :loading="exporting" @click="exportBackup">导出备份</RButton>
            <RButton :loading="importing" @click="backupFileInput?.click()">导入恢复</RButton>
            <input ref="backupFileInput" class="hidden-file" type="file" accept="application/json,.json" @change="importBackup" />
          </div>
        </div>
        <RInlineFeedback v-if="backupMessage" :tone="backupMessageTone">{{ backupMessage }}</RInlineFeedback>
        <div class="danger-zone">
          <div>
            <h3>开发期重置</h3>
            <p>会清空当前浏览器里的本地数据，并重新写入最新的初始数据。这个按钮后续正式上线前需要移除或加权限保护。</p>
          </div>
          <RButton variant="danger" :loading="resetting" @click="resetData">重置本地数据</RButton>
        </div>
      </div>
    </RCard>

    <RCard v-if="activeSection === 'categories'">
      <div class="settings-section">
        <div class="section-heading">
          <h2>分类管理</h2>
          <p>维护资产、记账和账户分类。已有业务记录的分类需要先完成迁移，才能删除。</p>
        </div>
        <div v-if="migrationSourceCategory" class="migration-panel" :class="{ done: migrationCompletedCount !== null }">
          <div>
            <span>{{ migrationCompletedCount === null ? "分类迁移" : "迁移完成" }}</span>
            <h3>{{ migrationCompletedCount === null ? `「${migrationSourceCategory.name}」已有记账记录` : `已迁移「${migrationSourceCategory.name}」` }}</h3>
            <p v-if="migrationCompletedCount === null">先把这些记账迁移到其他同类型分类，再回来删除原分类。</p>
            <p v-else>已迁移 {{ migrationCompletedCount }} 条记账记录。现在可以直接删除原分类，系统会再次校验是否仍有关联账单。</p>
            <div v-if="migrationTargetCategoryId" class="migration-route">
              <small>迁移目标</small>
              <strong>{{ migrationTargetLabel }}</strong>
            </div>
          </div>
          <div class="migration-form">
            <template v-if="migrationCompletedCount === null">
              <label>
                <span>目标一级分类</span>
                <RSelect v-model="migrationTargetCategoryId" :options="migrationTargetCategoryOptions" placeholder="选择目标分类" />
              </label>
              <label>
                <span>目标子分类</span>
                <RSelect v-model="migrationTargetSubCategoryId" :options="migrationTargetSubCategoryOptions" placeholder="可选" />
              </label>
              <div class="action-row">
                <RButton :loading="migratingCategory" @click="migrateCategoryTransactions">迁移记账</RButton>
                <RButton variant="secondary" @click="clearMigrationPanel">取消</RButton>
              </div>
            </template>
            <div v-else class="migration-done-actions">
              <RButton variant="danger" @click="openMigratedCategoryDeleteModal">删除原分类</RButton>
              <RButton variant="secondary" @click="migrationCompletedCount = null">重新选择目标</RButton>
              <RButton variant="secondary" @click="clearMigrationPanel">关闭</RButton>
            </div>
          </div>
        </div>
        <div class="category-zone">
          <div class="category-zone__head">
            <div>
              <h3>分类管理</h3>
              <p>维护资产、记账和账户分类。已有记账记录的分类不能删除，需要先把相关记账改到其他分类。</p>
            </div>
            <div class="category-tabs">
              <button
                v-for="option in categoryDomainOptions"
                :key="option.value"
                :data-testid="`category-domain-${option.value}`"
                :class="{ active: categoryDomain === option.value }"
                type="button"
                @click="categoryDomain = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div v-if="categoryDomain === 'transaction'" class="ledger-category-manager">
            <div class="ledger-category-toolbar">
              <div class="category-direction-tabs">
                <button :class="{ active: categoryDirection === 'expense' }" type="button" @click="switchCategoryDirection('expense')">支出分类</button>
                <button :class="{ active: categoryDirection === 'income' }" type="button" @click="switchCategoryDirection('income')">收入分类</button>
              </div>
              <RButton @click="startCreateParentCategory">+ 新增一级分类</RButton>
            </div>

            <div class="ledger-category-layout">
              <div class="category-tree">
                <div v-if="parentCategories.length" class="category-tree__body">
                  <section v-for="parent in parentCategories" :key="parent.id" class="category-parent-card" data-testid="category-parent-card" :data-category-id="parent.id" :class="{ active: selectedParentCategoryId === parent.id }">
                    <button class="category-parent-main" type="button" @click="selectParentCategory(parent.id)">
                      <span class="category-color" :style="{ background: parent.color || '#94a3b8' }"></span>
                      <div>
                        <strong>{{ parent.name }}</strong>
                        <small>{{ childCategoriesOf(parent.id).length }} 个子分类 · sort {{ parent.sort }}</small>
                      </div>
                    </button>
                    <div class="category-actions">
                      <button type="button" @click="editCategory(parent)">编辑</button>
                      <button class="danger" data-testid="category-parent-delete" type="button" @click="deleteCategory(parent.id)">删除</button>
                    </div>
                    <div class="category-child-list">
                      <div v-for="child in childCategoriesOf(parent.id)" :key="child.id" class="category-child-item">
                        <button type="button" @click="editCategory(child)">
                          <span>{{ child.name }}</span>
                          <small>{{ child.id }}</small>
                        </button>
                        <div class="category-actions">
                          <button type="button" @click="editCategory(child)">编辑</button>
                          <button class="danger" data-testid="category-delete" type="button" @click="deleteCategory(child.id)">删除</button>
                        </div>
                      </div>
                      <button class="add-child-button" type="button" @click="startCreateChildCategory(parent.id)">+ 给「{{ parent.name }}」添加子分类</button>
                    </div>
                  </section>
                </div>
                <p v-else class="empty-category">暂无{{ categoryDirection === "expense" ? "支出" : "收入" }}一级分类，可以从右侧新增。</p>
              </div>

              <aside class="category-inspector">
                <div class="category-inspector__head">
                  <span>{{ categoryLevel === "child" ? "子分类" : "一级分类" }}</span>
                  <h4>{{ categoryFormTitle }}</h4>
                  <p>{{ categoryFormDescription }}</p>
                </div>
                <label v-if="categoryLevel === 'child'">
                  <span>所属一级分类</span>
                  <RSelect v-model="categoryDraft.parentId" :options="parentCategoryOptions" placeholder="选择一级分类" />
                </label>
                <label>
                  <span>分类名称</span>
                  <RInput v-model="categoryDraft.name" :placeholder="categoryLevel === 'child' ? '例如 午餐 / 地铁 / A 公司工资' : '例如 餐饮 / 出行 / 工资'" />
                </label>
                <label>
                  <span>排序</span>
                  <RInput v-model="categoryDraft.sort" placeholder="数字越小越靠前" />
                </label>
                <label>
                  <span>颜色</span>
                  <div class="color-input">
                    <input v-model="categoryDraft.color" type="color" />
                    <RInput v-model="categoryDraft.color" placeholder="#1677FF" />
                  </div>
                </label>
                <label v-if="showCategoryBudgetField">
                  <span>月预算</span>
                  <RInput v-model="categoryDraft.monthlyBudget" placeholder="例如 1500，不填则不设置预算" />
                </label>
                <RInlineFeedback v-if="categoryMessage" :tone="categoryMessageTone">{{ categoryMessage }}</RInlineFeedback>
                <div class="action-row">
                  <RButton :loading="savingCategory" @click="saveCategory">{{ editingCategoryId ? "保存修改" : "保存新增" }}</RButton>
                  <RButton variant="secondary" @click="requestResetCategoryDraft">清空</RButton>
                </div>
              </aside>
            </div>
          </div>

          <div v-else class="category-editor">
            <div class="category-form">
              <h4>{{ editingCategoryId ? "编辑分类" : "新增分类" }}</h4>
              <label>
                <span>分类名称</span>
                <RInput v-model="categoryDraft.name" placeholder="例如 数码配件" />
              </label>
              <label v-if="categoryDomain === 'account'">
                <span>业务类型</span>
                <RSelect v-model="categoryDraft.type" :options="currentCategoryTypeOptions" placeholder="选择类型" />
              </label>
              <label>
                <span>排序</span>
                <RInput v-model="categoryDraft.sort" placeholder="例如 600" />
              </label>
              <label>
                <span>颜色</span>
                <div class="color-input">
                  <input v-model="categoryDraft.color" type="color" />
                  <RInput v-model="categoryDraft.color" placeholder="#1677FF" />
                </div>
              </label>
              <RInlineFeedback v-if="categoryMessage" :tone="categoryMessageTone">{{ categoryMessage }}</RInlineFeedback>
              <div class="action-row">
                <RButton :loading="savingCategory" @click="saveCategory">{{ editingCategoryId ? "保存分类" : "新增分类" }}</RButton>
                <RButton v-if="editingCategoryId" variant="secondary" @click="requestResetCategoryDraft">取消编辑</RButton>
              </div>
            </div>

            <div class="category-list">
              <div v-if="categoryDomain === 'asset'" class="asset-category-toolbar">
                <RInput v-model="categoryQuery" placeholder="搜索资产分类" />
                <div class="category-status-switch" aria-label="资产分类状态">
                  <button
                    v-for="option in assetCategoryStatusOptions"
                    :key="option.value"
                    :data-testid="`asset-category-status-${option.value}`"
                    type="button"
                    :class="{ active: assetCategoryStatus === option.value }"
                    @click="assetCategoryStatus = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
                <div class="category-sort-switch" aria-label="资产分类排序">
                  <button
                    v-for="option in assetCategorySortOptions"
                    :key="option.value"
                    type="button"
                    :class="{ active: assetCategorySort === option.value }"
                    @click="assetCategorySort = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>
              <div v-for="category in visibleCategories" :key="category.id" class="category-item" :data-testid="`category-item-${category.id}`">
                <span class="category-color" :style="{ background: category.color || '#94a3b8' }"></span>
                <div>
                  <strong>{{ category.name }}</strong>
                  <small v-if="category.domain === 'asset'">{{ assetCategoryUsage(category.id) }} 项资产 · 顺序 {{ category.sort }} · {{ category.enabled === false ? "已停用" : "启用中" }}</small>
                  <small v-else>{{ category.id }} · {{ category.type || "-" }} · sort {{ category.sort }} · {{ category.enabled === false || category.deletedAt ? "已停用" : "启用中" }}</small>
                </div>
                <div class="category-actions">
                  <button type="button" @click="editCategory(category)">编辑</button>
                  <button
                    v-if="category.domain === 'asset'"
                    type="button"
                    :data-testid="`asset-category-toggle-${category.id}`"
                    @click="setCategoryEnabled(category, category.enabled === false)"
                  >
                    {{ category.enabled === false ? "恢复" : "停用" }}
                  </button>
                  <button class="danger" data-testid="category-delete" type="button" @click="deleteCategory(category.id)">删除</button>
                </div>
              </div>
              <p v-if="!visibleCategories.length" class="empty-category">暂无分类，可以从左侧新增。</p>
            </div>
          </div>
        </div>
      </div>
    </RCard>

    <DeleteConfirmModal
      v-model:show="deleteCategoryModalVisible"
      :title="deleteCategoryModalTitle"
      :description="deleteCategoryModalDescription"
      :eyebrow="pendingDeleteBlockedReason ? '无法删除' : '分类删除'"
      confirm-text="确认删除"
      :cancel-text="pendingDeleteBlockedReason ? '知道了' : '取消'"
      :show-confirm="!pendingDeleteBlockedReason"
      :loading="deleteCategoryLoading"
      @confirm="confirmDeleteCategory"
    >
      <div v-if="pendingDeleteImpact" class="delete-impact">
        <div class="delete-impact__grid">
          <div>
            <span>子分类</span>
            <strong>{{ pendingDeleteImpact.childCategories }}</strong>
          </div>
          <div>
            <span>关联记账</span>
            <strong>{{ pendingDeleteImpact.transactions }}</strong>
          </div>
          <div>
            <span>关联资产</span>
            <strong>{{ pendingDeleteImpact.assets }}</strong>
          </div>
          <div>
            <span>关联账户</span>
            <strong>{{ pendingDeleteImpact.accounts }}</strong>
          </div>
        </div>
        <div v-if="pendingDeleteLatestTransaction" class="delete-impact__latest">
          <span>最近一条记账</span>
          <strong>{{ transactionSummary(pendingDeleteLatestTransaction) }}</strong>
        </div>
        <p>{{ pendingDeleteBlockedReason || "当前没有检测到会阻止删除的业务数据，可以删除。" }}</p>
        <div v-if="pendingDeleteImpact.transactions > 0" class="delete-impact__actions">
          <RButton @click="openMigrationFromDeleteModal">去迁移记账</RButton>
        </div>
      </div>
    </DeleteConfirmModal>

    <DeleteConfirmModal
      v-model:show="resetDataModalVisible"
      title="重置本地数据？"
      description="这会清空当前浏览器里的 IndexedDB 数据，并重新写入最新的初始数据。当前资产、附加项、账户和交易都会被替换。"
      eyebrow="重置本地数据"
      confirm-text="确认重置"
      :loading="resetting"
      @confirm="confirmResetData"
    >
      <div class="delete-impact">
        <div class="delete-impact__grid">
          <div><span>资产</span><strong>{{ store.assets.length }}</strong></div>
          <div><span>附加项</span><strong>{{ store.assetAddons.length }}</strong></div>
          <div><span>账户</span><strong>{{ store.accounts.length }}</strong></div>
          <div><span>交易</span><strong>{{ store.transactions.length }}</strong></div>
        </div>
        <p>建议先导出备份。确认后，本地现有数据会被开发期初始数据覆盖。</p>
      </div>
    </DeleteConfirmModal>

    <DeleteConfirmModal
      v-model:show="importBackupModalVisible"
      title="导入备份并覆盖当前数据？"
      description="导入备份会覆盖当前浏览器里的所有本地数据。请确认你选择的是可信备份文件。"
      eyebrow="导入覆盖"
      confirm-text="确认导入"
      :loading="importing"
      @confirm="confirmImportBackup"
    >
      <div class="delete-impact">
        <div class="delete-impact__latest">
          <span>备份文件</span>
          <strong>{{ pendingBackupFile?.name ?? "未选择文件" }}</strong>
        </div>
        <div class="delete-impact__grid">
          <div><span>当前资产</span><strong>{{ store.assets.length }}</strong></div>
          <div><span>当前附加项</span><strong>{{ store.assetAddons.length }}</strong></div>
          <div><span>当前账户</span><strong>{{ store.accounts.length }}</strong></div>
          <div><span>当前交易</span><strong>{{ store.transactions.length }}</strong></div>
        </div>
        <p>确认后会先校验备份格式，再执行覆盖恢复。</p>
      </div>
    </DeleteConfirmModal>

    <DeleteConfirmModal
      v-model:show="showUnsavedCategoryModal"
      title="放弃未保存的分类内容？"
      description="当前分类表单里有尚未保存的修改。离开后，分类名称、排序、颜色和预算设置都会丢失。"
      eyebrow="内容未保存"
      confirm-text="放弃清空"
      @confirm="confirmResetCategoryDraft"
    />
    </section>
  </RDataGate>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { ChevronRight, DatabaseBackup, LayoutGrid, Tags, UserRound } from "@lucide/vue";
import DeleteConfirmModal from "@/components/business/DeleteConfirmModal.vue";
import RButton from "@/components/ui/RButton.vue";
import RCard from "@/components/ui/RCard.vue";
import RInput from "@/components/ui/RInput.vue";
import RSelect from "@/components/ui/RSelect.vue";
import RDataGate from "@/components/ui/RDataGate.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import type { CategoryDomain, CategoryRecord, TransactionRecord } from "@/domain/models";
import { backupService } from "@/services/backupService";
import { categoryService } from "@/services/categoryService";
import { settingsService } from "@/services/settingsService";
import { useAppDataStore } from "@/stores/appDataStore";

const store = useAppDataStore();
const route = useRoute();
const savingProfile = ref(false);
const avatarFileInput = ref<HTMLInputElement | null>(null);
const profileMessage = ref("");
const profileMessageTone = ref<"success" | "danger">("success");
const profileDraft = reactive({
  displayName: "Demo User",
  avatarDataUrl: undefined as string | undefined,
  currency: "CNY" as string | number | null,
  locale: "zh-CN" as string | number | null,
  firstDayOfWeek: 1 as string | number | null,
});
const resetting = ref(false);
const exporting = ref(false);
const importing = ref(false);
const resetDataModalVisible = ref(false);
const importBackupModalVisible = ref(false);
const showUnsavedCategoryModal = ref(false);
const pendingBackupFile = ref<File | null>(null);
const backupFileInput = ref<HTMLInputElement | null>(null);
const backupMessage = ref("");
const backupMessageTone = ref<"success" | "danger">("success");
const categoryDomain = ref<CategoryDomain>("asset");
const categoryDirection = ref<"expense" | "income">("expense");
const categoryLevel = ref<"parent" | "child">("parent");
const selectedParentCategoryId = ref<string | null>(null);
const editingCategoryId = ref<string | null>(null);
const savingCategory = ref(false);
const migratingCategory = ref(false);
const migrationSourceCategoryId = ref<string | null>(null);
const migrationTargetCategoryId = ref<string | number | null>(null);
const migrationTargetSubCategoryId = ref<string | number | null>("none");
const migrationCompletedCount = ref<number | null>(null);
const deleteCategoryModalVisible = ref(false);
const deleteCategoryLoading = ref(false);
const pendingDeleteCategory = ref<CategoryRecord | null>(null);
const pendingDeleteImpact = ref<{
  assets: number;
  transactions: number;
  childCategories: number;
  accounts: number;
  total: number;
} | null>(null);
const pendingDeleteLatestTransaction = ref<TransactionRecord | null>(null);
const categoryMessage = ref("");
const categoryMessageTone = ref<"success" | "danger">("success");
const categoryQuery = ref("");
const assetCategorySort = ref<"manual" | "name" | "usage">("manual");
const assetCategoryStatus = ref<"active" | "disabled" | "all">("active");
const categoryDraft = reactive({
  name: "",
  type: "other" as string | number | null,
  parentId: null as string | number | null,
  sort: "999",
  color: "#1677FF",
  monthlyBudget: "",
  enabled: true,
});
const initialCategoryDraftSnapshot = ref("");

type SettingsSection = "overview" | "profile" | "categories" | "data";

const activeSection = computed<SettingsSection>(() => {
  const section = route.meta.section;
  return section === "profile" || section === "categories" || section === "data" ? section : "overview";
});
const profileInitial = computed(() => profileDraft.displayName.trim().charAt(0).toUpperCase() || "R");
const settingsNavItems = [
  { label: "设置总览", path: "/settings", icon: LayoutGrid },
  { label: "个人资料", path: "/settings/profile", icon: UserRound },
  { label: "分类管理", path: "/settings/categories", icon: Tags },
  { label: "数据管理", path: "/settings/data", icon: DatabaseBackup },
];
const sectionCopy: Record<SettingsSection, { title: string; description: string }> = {
  overview: { title: "设置中心", description: "管理个人资料、业务分类和本地数据。" },
  profile: { title: "个人资料", description: "设置应用内显示身份和基础偏好。" },
  categories: { title: "分类管理", description: "维护资产、记账和资金账户的分类体系。" },
  data: { title: "数据管理", description: "备份、恢复和维护当前浏览器中的本地数据。" },
};
const currentSectionTitle = computed(() => sectionCopy[activeSection.value].title);
const currentSectionDescription = computed(() => sectionCopy[activeSection.value].description);
const overviewItems = computed(() => [
  {
    label: "个人资料",
    path: "/settings/profile",
    icon: UserRound,
    description: "头像、显示名称和基础偏好",
    meta: profileDraft.displayName || "未设置",
  },
  {
    label: "分类管理",
    path: "/settings/categories",
    icon: Tags,
    description: "资产、记账和账户分类",
    meta: `${store.categories.filter((item) => !item.deletedAt).length} 个分类`,
  },
  {
    label: "数据管理",
    path: "/settings/data",
    icon: DatabaseBackup,
    description: "本地备份、恢复和数据重置",
    meta: `${store.transactions.length} 条交易`,
  },
]);
const currencyOptions = [{ label: "人民币（CNY）", value: "CNY" }];
const localeOptions = [{ label: "简体中文", value: "zh-CN" }];
const weekStartOptions = [
  { label: "星期一", value: 1 },
  { label: "星期日", value: 0 },
];

const categoryDomainOptions: Array<{ label: string; value: CategoryDomain }> = [
  { label: "资产分类", value: "asset" },
  { label: "交易分类", value: "transaction" },
  { label: "账户分类", value: "account" },
];

const categoryTypeOptions = {
  asset: [
    { label: "自定义分类", value: "other" },
  ],
  transaction: [
    { label: "支出", value: "expense" },
    { label: "收入", value: "income" },
  ],
  account: [
    { label: "现金", value: "cash" },
    { label: "电子钱包", value: "wallet" },
    { label: "储蓄卡", value: "debit_card" },
    { label: "信用卡", value: "credit_card" },
    { label: "消费信用", value: "consumer_credit" },
    { label: "贷款", value: "loan" },
    { label: "投资账户", value: "investment" },
    { label: "其他账户", value: "other" },
  ],
};


const assetCategorySortOptions = [
  { label: "自定义", value: "manual" as const },
  { label: "名称", value: "name" as const },
  { label: "使用量", value: "usage" as const },
];

const assetCategoryStatusOptions = [
  { label: "启用", value: "active" as const },
  { label: "已停用", value: "disabled" as const },
  { label: "全部", value: "all" as const },
];

const visibleCategories = computed(() => {
  const keyword = categoryQuery.value.trim().toLowerCase();
  const categories = store.categories
    .filter((category) => category.domain === categoryDomain.value && !category.deletedAt)
    .filter((category) => {
      if (categoryDomain.value !== "asset" || assetCategoryStatus.value === "all") return true;
      return assetCategoryStatus.value === "disabled" ? category.enabled === false : category.enabled !== false;
    })
    .filter((category) => !keyword || category.name.toLowerCase().includes(keyword));

  if (categoryDomain.value !== "asset") return categories.sort(compareByManualOrder);
  if (assetCategorySort.value === "name") {
    return categories.sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
  }
  if (assetCategorySort.value === "usage") {
    return categories.sort((left, right) => assetCategoryUsage(right.id) - assetCategoryUsage(left.id) || compareByManualOrder(left, right));
  }
  return categories.sort(compareByManualOrder);
});
const activeTransactionCategories = computed(() => store.categories.filter((category) => category.domain === "transaction" && category.type === categoryDirection.value && !category.deletedAt));
const parentCategories = computed(() => activeTransactionCategories.value
  .filter((category) => !category.parentId)
  .sort((a, b) => a.sort - b.sort));
const parentCategoryOptions = computed(() => parentCategories.value.map((category) => ({ label: category.name, value: category.id })));
const currentCategoryTypeOptions = computed(() => categoryTypeOptions[categoryDomain.value]);

function compareByManualOrder(left: CategoryRecord, right: CategoryRecord) {
  return left.sort - right.sort || left.name.localeCompare(right.name, "zh-CN");
}

function assetCategoryUsage(categoryId: string) {
  return store.assets.filter((asset) => asset.categoryId === categoryId).length;
}

const selectedParentCategory = computed(() => parentCategories.value.find((category) => category.id === selectedParentCategoryId.value));
const migrationSourceCategory = computed(() => store.categories.find((category) => category.id === migrationSourceCategoryId.value));
const migrationTargetCategoryOptions = computed(() => {
  const source = migrationSourceCategory.value;
  if (!source) return [];
  return store.categories
    .filter((category) => category.domain === "transaction" && !category.parentId && !category.deletedAt && category.enabled !== false && category.type === source.type && category.id !== source.id)
    .map((category) => ({ label: category.name, value: category.id }));
});
const migrationTargetSubCategoryOptions = computed(() => [
  { label: "不选择子分类", value: "none" },
  ...store.categories
    .filter((category) => category.domain === "transaction" && !category.deletedAt && category.enabled !== false && category.parentId === migrationTargetCategoryId.value)
    .map((category) => ({ label: category.name, value: category.id })),
]);
const migrationTargetLabel = computed(() => {
  const parent = store.categories.find((category) => category.id === migrationTargetCategoryId.value);
  const sub = migrationTargetSubCategoryId.value && migrationTargetSubCategoryId.value !== "none"
    ? store.categories.find((category) => category.id === migrationTargetSubCategoryId.value)
    : undefined;
  if (!parent) return "未选择";
  return sub ? `${parent.name} / ${sub.name}` : parent.name;
});
const pendingDeleteBlockedReason = computed(() => {
  const impact = pendingDeleteImpact.value;
  if (!impact) return "";
  if (impact.transactions > 0) return `该分类底下已有 ${impact.transactions} 条记账记录，不能直接删除。请先把这些记账迁移或改到其他分类。`;
  if (impact.assets > 0) return `该分类已有 ${impact.assets} 个资产使用，不能直接删除。请先把对应资产改到其他分类。`;
  if (impact.accounts > 0) return `该分类已有 ${impact.accounts} 个账户使用，不能直接删除。请先把对应账户改到其他分类。`;
  return "";
});
const deleteCategoryModalTitle = computed(() => {
  const name = pendingDeleteCategory.value?.name;
  if (!name) return "删除分类？";
  return pendingDeleteBlockedReason.value ? `不能删除「${name}」` : `删除「${name}」？`;
});
const deleteCategoryModalDescription = computed(() => {
  if (pendingDeleteBlockedReason.value) return "这个分类仍在被业务数据使用。为了避免历史账单失去归属，需要先处理关联数据。";
  return "删除后不可恢复。系统会在确认时再次校验，如果仍有关联业务数据会阻止删除。";
});
const showCategoryBudgetField = computed(() => categoryDomain.value === "transaction" && categoryDirection.value === "expense" && categoryLevel.value === "parent");
const isCategoryDraftDirty = computed(() => serializeCategoryDraft() !== initialCategoryDraftSnapshot.value);
const categoryFormTitle = computed(() => {
  if (editingCategoryId.value) return categoryLevel.value === "child" ? "编辑子分类" : "编辑一级分类";
  return categoryLevel.value === "child" ? "新增子分类" : "新增一级分类";
});
const categoryFormDescription = computed(() => {
  if (categoryLevel.value === "child") {
    return `归属到${selectedParentCategory.value ? `「${selectedParentCategory.value.name}」` : "某个一级分类"}，用于更细地统计账单。`;
  }
  return categoryDirection.value === "expense" ? "一级分类用于支出大类统计，例如餐饮、出行、购物。" : "一级分类用于收入大类统计，例如工资、外快、资产收入。";
});

onMounted(initializeData);

async function initializeData() {
  await store.init().catch(() => undefined);
  if (store.initialized) await loadProfile();
}

watch(categoryDomain, () => {
  resetCategoryDraft();
});

watch(parentCategories, (parents) => {
  if (categoryDomain.value !== "transaction") return;
  if (!selectedParentCategoryId.value || !parents.some((parent) => parent.id === selectedParentCategoryId.value)) {
    selectedParentCategoryId.value = parents[0]?.id ?? null;
  }
}, { immediate: true });

async function loadProfile() {
  const settings = await settingsService.get();
  profileDraft.displayName = settings.displayName ?? "Demo User";
  profileDraft.avatarDataUrl = settings.avatarDataUrl;
  profileDraft.currency = settings.currency;
  profileDraft.locale = settings.locale;
  profileDraft.firstDayOfWeek = settings.firstDayOfWeek;
  profileMessage.value = "";
}

async function saveProfile() {
  const displayName = profileDraft.displayName.trim();
  if (!displayName) {
    profileMessageTone.value = "danger";
    profileMessage.value = "请填写显示名称。";
    return;
  }

  savingProfile.value = true;
  try {
    await settingsService.update({
      displayName,
      avatarDataUrl: profileDraft.avatarDataUrl,
      currency: "CNY",
      locale: "zh-CN",
      firstDayOfWeek: Number(profileDraft.firstDayOfWeek) === 0 ? 0 : 1,
    });
    profileDraft.displayName = displayName;
    profileMessageTone.value = "success";
    profileMessage.value = "个人资料已保存到本地。";
  } catch (error) {
    profileMessageTone.value = "danger";
    profileMessage.value = error instanceof Error ? error.message : "保存失败，请稍后重试。";
  } finally {
    savingProfile.value = false;
  }
}

function selectAvatar(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    profileMessageTone.value = "danger";
    profileMessage.value = "头像文件不能超过 2 MB。";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    profileDraft.avatarDataUrl = typeof reader.result === "string" ? reader.result : undefined;
    profileMessage.value = "";
  };
  reader.onerror = () => {
    profileMessageTone.value = "danger";
    profileMessage.value = "图片读取失败，请重新选择。";
  };
  reader.readAsDataURL(file);
}

function resetData() {
  resetDataModalVisible.value = true;
}

async function confirmResetData() {
  resetting.value = true;
  try {
    await store.resetLocalData();
    resetDataModalVisible.value = false;
    setBackupMessage("本地数据已重置。");
  } finally {
    resetting.value = false;
  }
}

function setBackupMessage(message: string, tone: "success" | "danger" = "success") {
  backupMessage.value = message;
  backupMessageTone.value = tone;
}

function backupFileName() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return `rizhi-backup-${date}-${time}.json`;
}

async function exportBackup() {
  exporting.value = true;
  setBackupMessage("");
  try {
    const text = await backupService.exportText();
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = backupFileName();
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setBackupMessage("备份文件已导出。");
  } catch (err) {
    setBackupMessage(err instanceof Error ? err.message : "导出备份失败", "danger");
  } finally {
    exporting.value = false;
  }
}

async function importBackup(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  pendingBackupFile.value = file;
  importBackupModalVisible.value = true;
}

async function confirmImportBackup() {
  const file = pendingBackupFile.value;
  if (!file) return;

  importing.value = true;
  setBackupMessage("");
  try {
    const text = await file.text();
    await backupService.restoreText(text);
    await store.refresh();
    importBackupModalVisible.value = false;
    pendingBackupFile.value = null;
    setBackupMessage("备份已恢复，本地数据已刷新。");
  } catch (err) {
    setBackupMessage(err instanceof Error ? err.message : "导入备份失败", "danger");
  } finally {
    importing.value = false;
  }
}

function setCategoryMessage(message: string, tone: "success" | "danger" = "success") {
  categoryMessage.value = message;
  categoryMessageTone.value = tone;
}

function openMigrationPanel(categoryId: string) {
  const category = store.categories.find((item) => item.id === categoryId);
  if (!category) return;
  migrationSourceCategoryId.value = categoryId;
  migrationTargetCategoryId.value = migrationTargetCategoryOptions.value[0]?.value ?? null;
  migrationTargetSubCategoryId.value = "none";
  migrationCompletedCount.value = null;
}

function clearMigrationPanel() {
  migrationSourceCategoryId.value = null;
  migrationTargetCategoryId.value = null;
  migrationTargetSubCategoryId.value = "none";
  migrationCompletedCount.value = null;
}

function resetCategoryDraft() {
  editingCategoryId.value = null;
  categoryDraft.name = "";
  categoryDraft.type = categoryDomain.value === "transaction"
    ? categoryDirection.value
    : categoryDomain.value === "asset"
      ? "other"
      : categoryTypeOptions.account[0]?.value ?? "other";
  categoryDraft.parentId = categoryDomain.value === "transaction" && categoryLevel.value === "child" ? selectedParentCategoryId.value : null;
  categoryDraft.sort = "999";
  categoryDraft.color = "#1677FF";
  categoryDraft.monthlyBudget = "";
  categoryDraft.enabled = true;
  setCategoryMessage("");
  initialCategoryDraftSnapshot.value = serializeCategoryDraft();
}

function editCategory(category: CategoryRecord) {
  editingCategoryId.value = category.id;
  if (category.domain === "transaction") {
    categoryDirection.value = category.type === "income" ? "income" : "expense";
    categoryLevel.value = category.parentId ? "child" : "parent";
    selectedParentCategoryId.value = category.parentId ?? category.id;
  }
  categoryDraft.name = category.name;
  categoryDraft.type = category.type ?? categoryTypeOptions[category.domain][0]?.value ?? "other";
  categoryDraft.parentId = category.parentId ?? null;
  categoryDraft.sort = String(category.sort);
  categoryDraft.color = category.color || "#1677FF";
  categoryDraft.monthlyBudget = category.monthlyBudget ? String(category.monthlyBudget) : "";
  categoryDraft.enabled = category.enabled !== false;
  setCategoryMessage("");
  initialCategoryDraftSnapshot.value = serializeCategoryDraft();
}

function serializeCategoryDraft() {
  return JSON.stringify({
    categoryDomain: categoryDomain.value,
    categoryDirection: categoryDirection.value,
    categoryLevel: categoryLevel.value,
    editingCategoryId: editingCategoryId.value,
    ...categoryDraft,
  });
}

function requestResetCategoryDraft() {
  if (isCategoryDraftDirty.value) {
    showUnsavedCategoryModal.value = true;
    return;
  }
  resetCategoryDraft();
}

function confirmResetCategoryDraft() {
  showUnsavedCategoryModal.value = false;
  resetCategoryDraft();
}

function switchCategoryDirection(direction: "expense" | "income") {
  categoryDirection.value = direction;
  categoryLevel.value = "parent";
  selectedParentCategoryId.value = parentCategories.value[0]?.id ?? null;
  resetCategoryDraft();
}

function selectParentCategory(id: string) {
  selectedParentCategoryId.value = id;
  if (!editingCategoryId.value && categoryLevel.value === "child") {
    categoryDraft.parentId = id;
  }
}

function startCreateParentCategory() {
  categoryLevel.value = "parent";
  resetCategoryDraft();
}

function startCreateChildCategory(parentId = selectedParentCategoryId.value) {
  if (!parentId) {
    setCategoryMessage("请先创建或选择一个一级分类。", "danger");
    return;
  }
  categoryLevel.value = "child";
  selectedParentCategoryId.value = parentId;
  resetCategoryDraft();
  categoryDraft.parentId = parentId;
  initialCategoryDraftSnapshot.value = serializeCategoryDraft();
}

function childCategoriesOf(parentId: string) {
  return activeTransactionCategories.value
    .filter((category) => category.parentId === parentId)
    .sort((a, b) => a.sort - b.sort);
}

function relatedTransactionsForCategory(category: CategoryRecord) {
  if (category.domain !== "transaction") return [];
  const childIds = store.categories
    .filter((item) => item.parentId === category.id && !item.deletedAt)
    .map((item) => item.id);
  const categoryIds = new Set([category.id, ...childIds]);
  return store.transactions
    .filter((transaction) => categoryIds.has(transaction.categoryId) || (transaction.subCategoryId && categoryIds.has(transaction.subCategoryId)))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

function transactionSummary(transaction: TransactionRecord) {
  const sign = transaction.type === "income" ? "+" : "-";
  const date = transaction.occurredAt.slice(0, 10);
  const title = transaction.merchant || transaction.note || transaction.categorySnapshot?.subCategoryName || transaction.categorySnapshot?.categoryName || "未命名记账";
  return `${date} ${title} ${sign}¥${transaction.amount.toFixed(2)}`;
}

async function buildDeleteCategoryImpact(category: CategoryRecord) {
  const usage = await categoryService.usage(category.id);
  const relatedTransactions = relatedTransactionsForCategory(category);
  return {
    usage: {
      ...usage,
      transactions: relatedTransactions.length || usage.transactions,
      total: usage.assets + (relatedTransactions.length || usage.transactions) + usage.childCategories + usage.accounts,
    },
    latestTransaction: relatedTransactions[0] ?? null,
  };
}

async function saveCategory() {
  savingCategory.value = true;
  setCategoryMessage("");
  try {
    const sort = Number(categoryDraft.sort);
    if (!Number.isFinite(sort)) throw new Error("排序必须是数字");
    const monthlyBudget = categoryDraft.monthlyBudget.trim() ? Number(categoryDraft.monthlyBudget) : undefined;
    if (monthlyBudget !== undefined && (!Number.isFinite(monthlyBudget) || monthlyBudget < 0)) {
      throw new Error("月预算必须是大于等于 0 的数字");
    }
    if (categoryDomain.value === "transaction" && categoryLevel.value === "child" && !categoryDraft.parentId) {
      throw new Error("新增子分类时必须选择所属一级分类");
    }
  const type = categoryDomain.value === "transaction"
    ? categoryDirection.value
    : categoryDomain.value === "asset"
      ? "other"
      : categoryDraft.type as CategoryRecord["type"];
    const parentId = categoryDomain.value === "transaction" && categoryLevel.value === "child" ? String(categoryDraft.parentId) : undefined;
    const budget = showCategoryBudgetField.value ? monthlyBudget : undefined;
    if (editingCategoryId.value) {
      await categoryService.update({
        id: editingCategoryId.value,
        name: categoryDraft.name,
        type,
        parentId,
        sort,
        color: categoryDraft.color,
        monthlyBudget: budget,
        enabled: categoryDraft.enabled,
      });
      setCategoryMessage("分类已保存。");
    } else {
      await categoryService.create({
        domain: categoryDomain.value,
        name: categoryDraft.name,
        type,
        parentId,
        sort,
        color: categoryDraft.color,
        monthlyBudget: budget,
        enabled: true,
      });
      setCategoryMessage("分类已新增。");
    }
    await store.refresh();
    if (!editingCategoryId.value) {
      resetCategoryDraft();
    } else {
      initialCategoryDraftSnapshot.value = serializeCategoryDraft();
    }
  } catch (err) {
    setCategoryMessage(err instanceof Error ? err.message : "保存分类失败", "danger");
  } finally {
    savingCategory.value = false;
  }
}

async function setCategoryEnabled(category: CategoryRecord, enabled: boolean) {
  setCategoryMessage("");
  try {
    await categoryService.update({ id: category.id, enabled });
    await store.refresh();
    if (editingCategoryId.value === category.id) {
      categoryDraft.enabled = enabled;
      initialCategoryDraftSnapshot.value = serializeCategoryDraft();
    }
    setCategoryMessage(enabled ? "分类已恢复。" : "分类已停用。");
  } catch (err) {
    setCategoryMessage(err instanceof Error ? err.message : "更新分类状态失败", "danger");
  }
}

async function deleteCategory(id: string) {
  const category = store.categories.find((item) => item.id === id);
  if (!category) return;
  setCategoryMessage("");
  try {
    const impact = await buildDeleteCategoryImpact(category);
    pendingDeleteCategory.value = category;
    pendingDeleteImpact.value = impact.usage;
    pendingDeleteLatestTransaction.value = impact.latestTransaction;
    deleteCategoryModalVisible.value = true;
  } catch (err) {
    setCategoryMessage(err instanceof Error ? err.message : "读取分类影响范围失败", "danger");
  }
}

function openMigrationFromDeleteModal() {
  if (!pendingDeleteCategory.value) return;
  const id = pendingDeleteCategory.value.id;
  deleteCategoryModalVisible.value = false;
  openMigrationPanel(id);
}

async function confirmDeleteCategory() {
  if (!pendingDeleteCategory.value) return;
  if (pendingDeleteBlockedReason.value) return;

  const id = pendingDeleteCategory.value.id;
  setCategoryMessage("");
  deleteCategoryLoading.value = true;
  try {
    await categoryService.delete(id);
    await store.refresh();
    if (editingCategoryId.value === id) resetCategoryDraft();
    deleteCategoryModalVisible.value = false;
    pendingDeleteCategory.value = null;
    pendingDeleteImpact.value = null;
    pendingDeleteLatestTransaction.value = null;
    setCategoryMessage("分类已删除。");
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除分类失败";
    setCategoryMessage(message, "danger");
    if (message.includes("记账记录")) {
      deleteCategoryModalVisible.value = false;
      openMigrationPanel(id);
    }
  } finally {
    deleteCategoryLoading.value = false;
  }
}

async function migrateCategoryTransactions() {
  if (!migrationSourceCategoryId.value || !migrationTargetCategoryId.value) {
    setCategoryMessage("请选择要迁移到的目标分类。", "danger");
    return;
  }

  migratingCategory.value = true;
  setCategoryMessage("");
  try {
    const count = await categoryService.migrateTransactions({
      fromCategoryId: migrationSourceCategoryId.value,
      toCategoryId: String(migrationTargetCategoryId.value),
      toSubCategoryId: migrationTargetSubCategoryId.value && migrationTargetSubCategoryId.value !== "none" ? String(migrationTargetSubCategoryId.value) : undefined,
    });
    await store.refresh();
    const sourceName = migrationSourceCategory.value?.name ?? "该分类";
    migrationCompletedCount.value = count;
    setCategoryMessage(`已迁移 ${count} 条记账记录。现在可以删除「${sourceName}」。`);
  } catch (err) {
    setCategoryMessage(err instanceof Error ? err.message : "迁移失败", "danger");
  } finally {
    migratingCategory.value = false;
  }
}

function openMigratedCategoryDeleteModal() {
  if (!migrationSourceCategoryId.value) return;
  deleteCategory(migrationSourceCategoryId.value);
}
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: var(--space-6);
  max-width: 1240px;
  margin: 0 auto;
}

.settings-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-6);
  align-items: end;
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.settings-identity {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.settings-identity p,
.settings-identity h1,
.settings-identity span {
  margin: 0;
}

.settings-identity p {
  margin-bottom: 3px;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 800;
}

.settings-identity h1 {
  font-size: 24px;
  line-height: 1.35;
}

.settings-identity > div > span {
  display: block;
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.avatar {
  overflow: hidden;
  display: grid;
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
  place-items: center;
  color: #fff;
  background: var(--color-primary);
  border-radius: 16px;
  font-size: 24px;
  font-weight: 800;
}

.avatar img,
.profile-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.settings-nav {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: #edf1f7;
  border-radius: var(--radius-lg);
}

.settings-nav a {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 14px;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 700;
}

.settings-nav a:hover {
  color: var(--color-text-primary);
}

.settings-nav a.router-link-exact-active {
  color: var(--color-primary);
  background: #fff;
  box-shadow: 0 1px 4px rgba(17, 24, 39, 0.1);
}

.settings-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.overview-card {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto 18px;
  gap: var(--space-3);
  align-items: center;
  min-height: 116px;
  padding: var(--space-5);
  color: var(--color-text-primary);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.overview-card:hover {
  border-color: #a9c9ff;
  box-shadow: 0 12px 28px rgba(22, 119, 255, 0.1);
  transform: translateY(-2px);
}

.overview-card__icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-lg);
}

.overview-card h2,
.overview-card p {
  margin: 0;
}

.overview-card h2 {
  font-size: 15px;
}

.overview-card p {
  margin-top: 5px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.overview-card__meta {
  color: var(--color-text-tertiary);
  font-size: 12px;
  white-space: nowrap;
}

.profile-settings {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  min-height: 420px;
}

.profile-photo-panel {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: var(--space-3);
  padding: 40px 32px;
  background: var(--color-bg-hover);
  border-right: 1px solid var(--color-border);
  text-align: center;
}

.profile-photo {
  overflow: hidden;
  display: grid;
  width: 104px;
  height: 104px;
  place-items: center;
  color: #fff;
  background: var(--color-primary);
  border-radius: 28px;
  font-size: 42px;
  font-weight: 800;
}

.profile-photo-panel h2,
.profile-photo-panel p {
  margin: 0;
}

.profile-photo-panel h2 {
  font-size: 15px;
}

.profile-photo-panel p {
  margin-top: 5px;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.7;
}

.text-danger-button {
  color: var(--color-danger);
  background: none;
  border: 0;
  cursor: pointer;
  font-size: 12px;
}

.profile-form {
  padding: 36px 40px;
}

.section-heading h2,
.section-heading p {
  margin: 0;
}

.section-heading h2 {
  font-size: 17px;
}

.section-heading p {
  margin-top: 5px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.profile-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
  margin-top: 28px;
}

.profile-form__grid label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.profile-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-6);
}

.profile-message {
  margin: var(--space-4) 0 0;
  color: var(--color-success);
  font-size: 12px;
}

.profile-message.danger {
  color: var(--color-danger);
}

.settings-section h2,
.category-zone h3,
.category-form h4,
.danger-zone h3 {
  margin: 0;
}

.settings-section p,
.category-zone p,
.category-form p,
.danger-zone p {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
}

.settings-section {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-5);
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
}

.data-grid div {
  padding: var(--space-4);
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.data-grid span {
  display: block;
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
}

.data-grid strong {
  display: block;
  margin-top: var(--space-2);
  color: var(--color-text-primary);
  font-size: 24px;
}

.danger-zone {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4);
  background: #fff7f7;
  border: 1px solid #ffd0d0;
  border-radius: var(--radius-lg);
}

.backup-zone {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4);
  background: linear-gradient(135deg, var(--color-primary-soft), #fff);
  border: 1px solid #bbd5ff;
  border-radius: var(--radius-lg);
}

.backup-zone h3 {
  margin: 0;
}

.action-row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.hidden-file {
  display: none;
}

.backup-message {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  color: var(--color-success);
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-lg);
  font-weight: 700;
}

.backup-message.danger {
  color: var(--color-danger);
  background: #fff1f0;
  border-color: #ffccc7;
}

.migration-panel {
  display: grid;
  grid-template-columns: 1fr minmax(420px, .9fr);
  gap: var(--space-4);
  align-items: start;
  padding: var(--space-5);
  background: linear-gradient(135deg, #fff7ed, #fff);
  border: 1px solid #fed7aa;
  border-radius: var(--radius-lg);
  box-shadow: 0 18px 42px rgba(234, 88, 12, .08);
}

.migration-panel.done {
  background: linear-gradient(135deg, #f0fdf4, #fff);
  border-color: #bbf7d0;
  box-shadow: 0 18px 42px rgba(22, 163, 74, .08);
}

.migration-panel > div:first-child span {
  display: inline-flex;
  height: 24px;
  align-items: center;
  padding: 0 var(--space-2);
  color: #c2410c;
  background: #ffedd5;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.migration-panel.done > div:first-child span {
  color: #15803d;
  background: #dcfce7;
}

.migration-panel h3 {
  margin: var(--space-2) 0 0;
}

.migration-route {
  display: inline-grid;
  gap: 2px;
  margin-top: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: rgba(255, 255, 255, .72);
  border: 1px solid rgba(148, 163, 184, .22);
  border-radius: var(--radius-lg);
}

.migration-route small {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.migration-route strong {
  color: var(--color-text-primary);
}

.migration-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.migration-form label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
  font-weight: 800;
}

.migration-form .action-row {
  grid-column: 1 / -1;
  justify-content: flex-end;
}

.migration-done-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.delete-impact {
  display: grid;
  gap: var(--space-4);
}

.delete-impact__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.delete-impact__grid div,
.delete-impact__latest {
  display: grid;
  gap: 4px;
  padding: var(--space-3);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.delete-impact span {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.delete-impact strong {
  color: var(--color-text-primary);
  font-size: 16px;
}

.delete-impact__latest strong {
  font-size: 14px;
  line-height: 1.6;
}

.delete-impact p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
  line-height: 1.7;
}

.delete-impact__actions {
  display: flex;
  justify-content: flex-end;
}

.category-zone {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.category-zone__head,
.category-editor {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-4);
  align-items: start;
}

.category-tabs {
  display: inline-flex;
  gap: var(--space-2);
  padding: 4px;
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.category-tabs button {
  height: 34px;
  padding: 0 var(--space-3);
  color: var(--color-text-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 700;
}

.category-tabs button.active {
  color: var(--color-primary);
  background: #fff;
  box-shadow: var(--shadow-card);
}

.category-direction-tabs,
.category-level-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  padding: 4px;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.category-direction-tabs button,
.category-level-tabs button {
  height: 34px;
  color: var(--color-text-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 800;
}

.category-direction-tabs button.active,
.category-level-tabs button.active {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.ledger-category-manager {
  display: grid;
  gap: var(--space-4);
}

.ledger-category-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3);
  background: linear-gradient(135deg, #f8fbff, #fff);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.ledger-category-toolbar .category-direction-tabs {
  width: 280px;
}

.ledger-category-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: var(--space-4);
  align-items: start;
}

.category-inspector {
  position: sticky;
  top: var(--space-4);
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 18px 42px rgba(15, 23, 42, .06);
}

.category-inspector__head span {
  display: inline-flex;
  width: fit-content;
  height: 24px;
  align-items: center;
  padding: 0 var(--space-2);
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.category-inspector__head h4 {
  margin: var(--space-2) 0 0;
  font-size: var(--font-card-title);
}

.category-inspector label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
  font-weight: 700;
}

.category-form {
  width: 320px;
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.category-form label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
  font-weight: 700;
}

.color-input {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: var(--space-2);
}

.color-input input {
  width: 44px;
  height: 34px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.category-list {
  min-width: 0;
  display: grid;
  gap: var(--space-2);
}

.asset-category-toolbar {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto auto;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: var(--space-2);
}

.category-status-switch,
.category-sort-switch {
  display: inline-grid;
  grid-template-columns: repeat(3, 64px);
  padding: 3px;
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.category-status-switch button,
.category-sort-switch button {
  height: 30px;
  padding: 0 8px;
  color: var(--color-text-secondary);
  background: transparent;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.category-status-switch button.active,
.category-sort-switch button.active {
  color: var(--color-primary);
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, .12);
  font-weight: 700;
}

.category-tree {
  min-width: 0;
  display: grid;
  gap: var(--space-3);
}

.category-tree__body {
  display: grid;
  gap: var(--space-3);
}

.category-parent-card {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-3);
  padding: var(--space-3);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.category-parent-card.active {
  border-color: #9ec5ff;
  box-shadow: 0 18px 42px rgba(22, 119, 255, 0.1);
}

.category-parent-main {
  min-width: 0;
  display: grid;
  grid-template-columns: 12px 1fr;
  gap: var(--space-3);
  align-items: center;
  color: var(--color-text-primary);
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
}

.category-child-list {
  grid-column: 1 / -1;
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.category-child-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.category-child-item > button {
  display: grid;
  gap: 2px;
  color: var(--color-text-primary);
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
}

.category-child-item span {
  font-weight: 800;
}

.category-child-item small {
  color: var(--color-text-tertiary);
}

.add-child-button {
  height: 36px;
  color: var(--color-primary);
  background: #fff;
  border: 1px dashed #9ec5ff;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 800;
}

.category-item {
  display: grid;
  grid-template-columns: 12px 1fr auto;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.category-color {
  width: 12px;
  height: 36px;
  border-radius: 99px;
}

.category-item strong,
.category-item small {
  display: block;
}

.category-item small {
  margin-top: 2px;
  color: var(--color-text-tertiary);
}

.category-actions {
  display: flex;
  gap: var(--space-2);
}

.category-actions button {
  height: 30px;
  padding: 0 var(--space-3);
  color: var(--color-primary);
  background: var(--color-primary-light);
  border: 1px solid #bbd5ff;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 700;
}

.category-actions button.danger {
  color: var(--color-danger);
  background: #fff1f0;
  border-color: #ffccc7;
}

.category-message {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  color: var(--color-success);
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-md);
  font-size: var(--font-caption);
  font-weight: 700;
}

.category-message.danger {
  color: var(--color-danger);
  background: #fff1f0;
  border-color: #ffccc7;
}

.empty-category {
  padding: var(--space-5);
  text-align: center;
  background: var(--color-bg-hover);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

@media (max-width: 1100px) {
  .settings-header {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .settings-nav {
    width: 100%;
  }

  .settings-nav a {
    flex: 1;
    justify-content: center;
  }

  .settings-overview {
    grid-template-columns: 1fr;
  }

  .profile-settings {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .category-zone__head,
  .category-editor,
  .ledger-category-layout,
  .migration-panel,
  .backup-zone,
  .danger-zone {
    grid-template-columns: 1fr;
  }

  .migration-form {
    grid-template-columns: 1fr;
  }

  .ledger-category-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .ledger-category-toolbar .category-direction-tabs {
    width: 100%;
  }

  .category-inspector {
    position: static;
  }

  .category-form {
    width: auto;
  }

  .asset-category-toolbar {
    grid-template-columns: 1fr;
  }

  .category-sort-switch {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 760px) {
  .settings-identity {
    align-items: flex-start;
  }

  .settings-nav {
    overflow-x: auto;
    justify-content: flex-start;
  }

  .settings-nav a {
    flex: 0 0 auto;
  }

  .settings-nav a span {
    white-space: nowrap;
  }

  .overview-card {
    grid-template-columns: 44px minmax(0, 1fr) 18px;
  }

  .overview-card__meta {
    display: none;
  }

  .profile-settings {
    grid-template-columns: 1fr;
  }

  .profile-photo-panel {
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .profile-form {
    padding: var(--space-5);
  }

  .profile-form__grid,
  .data-grid {
    grid-template-columns: 1fr;
  }
}
</style>
