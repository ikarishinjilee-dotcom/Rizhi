<template>
	<section class="dictionary-panel">
		<header>
			<div>
				<h2>{{ panelTitle }}</h2>
				<p>{{ panelDescription }}</p>
			</div>
			<div class="panel-actions">
				<template v-if="domain === 'asset'">
					<RButton variant="secondary" @click="exportDefaults">导出默认分类备份</RButton>
				</template>
			</div>
		</header>

		<RInlineFeedback v-if="message" :tone="messageTone">{{ message }}</RInlineFeedback>
		<CategoryManagerGrid
			:items="visibleParentItems"
			:query="query"
			:status="statusFilter"
			:status-options="domain === 'asset' ? statusOptions : []"
			:create-label="`新增${domain === 'account' ? '账户类型' : '一级分类'}`"
			:empty-text="'暂无符合条件的分类。'"
			@update:query="query = $event"
			@update:status="statusFilter = $event as 'all' | 'enabled' | 'disabled'"
			@create="startCreate"
		>
			<template #filters>
				<RSelect v-if="domain === 'asset'" v-model="scopeFilter" :options="scopeOptions" />
			</template>
			<template #actions>
				<template v-if="domain === 'asset'">
					<RButton variant="secondary" @click="startBatch">批量管理</RButton>
					<RButton variant="secondary" @click="refreshAdminItems">刷新</RButton>
				</template>
			</template>
			<template #card="{ category: item }">
				<CategoryCard
					:key="item.id"
					:category="item"
					:active="draft.id === item.id"
					:show-sort="false"
					:show-scopes="domain === 'asset'"
					:show-child-actions="domain === 'asset'"
					@edit="edit"
					@view-children="openChildren"
					@add-child="startCreateChild"
				/>
			</template>
		</CategoryManagerGrid>

		<CategoryChildrenModal v-model:show="childrenVisible" :title="`「${selectedChildParent?.name ?? ''}」的子分类`">
				<div class="children-list">
					<template v-for="child in selectedChildItems" :key="child.id">
						<button type="button" class="children-item" @click="edit(child)">
							<span class="item-icon small"
								:style="{ backgroundColor: '#eef4ff' }">
								<img v-if="child.iconUrl" :src="child.iconUrl" alt="" />
								<b v-else>{{ child.icon || child.name.slice(0, 1) }}</b>
							</span>
							<span><strong>{{ child.name }}</strong><small>{{ groupLabel(child) }}</small></span>
							<em>{{ categoryStatusLabel(child) }}</em>
						</button>
					</template>
					<div v-if="!selectedChildItems.length" class="empty-state">暂无子分类。</div>
				</div>
				<template #footer>
					<RButton variant="secondary" @click="childrenVisible = false">关闭</RButton>
					<RButton v-if="selectedChildParent" @click="startCreateChild(selectedChildParent)">添加子分类</RButton>
				</template>
		</CategoryChildrenModal>

		<SystemDictionaryEditorModal
			v-model:show="editorVisible"
			:domain="domain"
			:panel-title="panelTitle"
			:draft="draft"
			:parent-options="parentOptions"
			:direction-options="directionOptions"
			:account-group-options="accountGroupOptions"
			:uploading="uploading"
			:message="message"
			:message-tone="messageTone"
			:delete-blocked="deleteBlocked"
			:deactivating="deactivating"
			:saving="saving"
			@save="save"
			@close="editorVisible = false"
			@deactivate="deactivate"
			@delete-request="deleteVisible = true"
			@remove-icon="removeIcon"
			@select-icon="selectIcon"
		/>

		<DeleteConfirmModal v-model:show="deleteVisible" title="删除系统分类？" description="已被资产或账户使用时将无法删除，建议优先停用。"
			:loading="deleting" @confirm="confirmDelete" />
		<DeleteConfirmModal v-model:show="batchDeleteVisible" title="批量删除分类？"
			:description="`将尝试删除 ${selectedBatchItems.length} 个分类。已被资产、记账或账户使用的分类会被系统阻止删除。`"
			:loading="batchDeleting" @confirm="confirmBatchDelete" />

		<n-modal v-model:show="batchVisible" preset="card" :bordered="false" :closable="false" :mask-closable="false"
			class="dictionary-modal-card" content-style="padding: 0;"
			:style="{ width: 'min(860px, calc(100vw - 48px))', borderRadius: '18px', overflow: 'hidden' }">
			<section class="batch-modal">
				<header class="dictionary-form__head">
					<div>
						<span>BATCH</span>
						<h3>批量管理分类</h3>
					</div>
					<button type="button" aria-label="关闭" @click="batchVisible = false">×</button>
				</header>
				<div class="batch-body">
					<section class="batch-picker">
						<div class="batch-picker__head">
							<div>
								<strong>选择分类</strong>
								<small>当前筛选结果内共 {{ batchItems.length }} 项，已选 {{ selectedBatchIds.length }} 项。</small>
							</div>
							<div class="batch-picker__actions">
								<button type="button" @click="selectAllBatchItems">全选</button>
								<button type="button" @click="selectedBatchIds = []">清空</button>
							</div>
						</div>
						<div class="batch-list">
							<label v-for="item in batchItems" :key="item.id" class="batch-item"
								:class="{ checked: selectedBatchIds.includes(item.id), child: Boolean(item.parentId) }">
								<input v-model="selectedBatchIds" type="checkbox" :value="item.id" />
								<span class="item-icon small" :style="{ backgroundColor: '#eef4ff' }">
									<img v-if="item.iconUrl" :src="item.iconUrl" alt="" />
									<b v-else>{{ item.icon || item.name.slice(0, 1) }}</b>
								</span>
								<span>
									<strong>{{ item.name }}</strong>
									<small>{{ item.parentId ? "子分类" : "一级分类" }} · {{ groupLabel(item) }} · {{ categoryStatusLabel(item) }}</small>
								</span>
							</label>
							<div v-if="!batchItems.length" class="empty-state">暂无可批量管理的分类。</div>
						</div>
					</section>
					<section class="batch-operation">
						<strong>批量动作</strong>
						<label>
							<span>操作类型</span>
							<RSelect v-model="batchOperation" :options="batchOperationOptions" />
						</label>
						<div v-if="batchOperation === 'scopes'" class="scope-field">
							<span>适用范围</span>
							<div class="scope-options">
								<label><input v-model="batchScopes" type="checkbox" value="asset" /> 资产</label>
								<label><input v-model="batchScopes" type="checkbox" value="expense" /> 支出</label>
								<label><input v-model="batchScopes" type="checkbox" value="income" /> 收入</label>
							</div>
							<small>会覆盖所选分类的适用范围。仅收入类会自动改为收入分类。</small>
						</div>
						<div v-if="batchOperation === 'delete'" class="batch-danger-note">
							<strong>删除前确认</strong>
							<p>删除会先经过二次确认；有业务引用的分类会被系统阻止删除。建议优先停用不用的分类。</p>
						</div>
						<div class="batch-preview">
							<span>执行预览</span>
							<p>{{ batchPreviewText }}</p>
						</div>
					</section>
				</div>
				<footer class="form-actions">
					<RButton variant="secondary" @click="batchVisible = false">取消</RButton>
					<RButton :loading="batchSaving" @click="applyBatch">应用批量操作</RButton>
				</footer>
			</section>
		</n-modal>
	</section>
</template>

<script setup lang="ts">
	import { computed, onMounted, reactive, ref } from "vue";
	import { NModal } from "naive-ui";
	import { categoryScopes, isBusinessCategory } from "@/domain/categoryScopes";
	import type { CategoryDomain, CategoryRecord, CategoryScope } from "@/domain/models";
	import type { CreateCategoryInput } from "@/services/categoryService";
	import { categoryService } from "@/services/categoryService";
	import { imageFileToPersistentUrl } from "@/utils/imageFiles";
	import { uploadImageDataUrl } from "@/services/cloudApiService";
	import { useAppDataStore } from "@/stores/appDataStore";
	import RButton from "@/components/ui/RButton.vue";
	import RSelect from "@/components/ui/RSelect.vue";
	import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
	import CategoryCard from "@/components/business/CategoryCard.vue";
	import CategoryChildrenModal from "@/components/business/CategoryChildrenModal.vue";
	import CategoryManagerGrid from "@/components/business/CategoryManagerGrid.vue";
import DeleteConfirmModal from "@/components/business/DeleteConfirmModal.vue";
import SystemDictionaryEditorModal from "@/components/business/SystemDictionaryEditorModal.vue";

	const props = defineProps<{ domain : "asset" | "account" | "bank" }>();
	const store = useAppDataStore();
	const systemItems = ref<CategoryRecord[]>([]);
	const saving = ref(false), uploading = ref(false), deleting = ref(false), deleteVisible = ref(false), deactivating = ref(false), deleteBlocked = ref(false);
	const editorVisible = ref(false);
	const childrenVisible = ref(false);
	const batchVisible = ref(false);
	const batchSaving = ref(false);
	const batchDeleteVisible = ref(false);
	const batchDeleting = ref(false);
	const selectedChildParent = ref<CategoryRecord | null>(null);
	const selectedBatchIds = ref<string[]>([]);
	const batchOperation = ref<"enable" | "disable" | "scopes" | "delete">("enable");
	const batchScopes = ref<CategoryScope[]>(["asset", "expense"]);
	const query = ref("");
	const statusFilter = ref<"all" | "enabled" | "disabled">("all");
	const scopeFilter = ref<"all" | CategoryScope>("all");
	const message = ref(""), messageTone = ref<"success" | "danger">("success");
	const draft = reactive({ id: "", name: "", note: "", sort: "100", type: "other", parentId: "", accountDirection: "asset", accountGroup: "asset", requiresBank: false, iconUrl: "", iconFileId: "", scopes: ["asset", "expense"] as CategoryScope[], enabled: true });
	const items = computed(() => systemItems.value
		.filter((item) => props.domain === "asset" ? isBusinessCategory(item) : item.domain === props.domain)
		.sort((a, b) => a.sort - b.sort));
	const parentItems = computed(() => items.value.filter((item) => !item.parentId));
	const visibleParentItems = computed(() => parentItems.value.filter((item) => {
		const keyword = query.value.trim().toLowerCase();
		const children = childItemsOf(item.id);
		const matchesKeyword = !keyword
			|| item.name.toLowerCase().includes(keyword)
			|| children.some((child) => child.name.toLowerCase().includes(keyword));
		const matchesStatus = statusFilter.value === "all"
			|| (statusFilter.value === "enabled" ? isEffectivelyEnabled(item) : !isEffectivelyEnabled(item));
		const matchesScope = scopeFilter.value === "all" || categoryScopes(item).includes(scopeFilter.value);
		return matchesKeyword && matchesStatus && matchesScope;
	}));
	const parentOptions = computed(() => parentItems.value.map((item) => ({ label: item.name, value: item.id })));
	const selectedChildItems = computed(() => selectedChildParent.value ? childItemsOf(selectedChildParent.value.id) : []);
	const batchItems = computed(() => visibleParentItems.value.flatMap((item) => [item, ...childItemsOf(item.id)]));
	const selectedBatchItems = computed(() => batchItems.value.filter((item) => selectedBatchIds.value.includes(item.id)));
	const panelTitle = computed(() => props.domain === "asset" ? "默认资产与记账分类" : props.domain === "account" ? "默认资金账户类型" : "默认银行列表");
	const panelDescription = computed(() => props.domain === "asset" ? "维护新用户首次使用时获得的默认资产与记账分类。" : props.domain === "account" ? "维护新用户首次使用时获得的默认资金账户类型。" : "维护新用户首次使用时获得的默认银行列表。");
	async function loadSystemItems() {
		try {
			let items = await categoryService.list({ scope: "system" });
			if (!items.length && props.domain === "asset") {
				const backup = await categoryService.getBuiltinDefaults();
				if (backup.categories.length) {
					await categoryService.importDefaults(backup);
					items = await categoryService.list({ scope: "system" });
				}
			}
			systemItems.value = items;
		} catch (error) {
			systemItems.value = [];
			showError(error);
		}
	}
	async function refreshAdminItems() { await Promise.all([store.refresh(), loadSystemItems()]); }
	async function exportDefaults() {
		const backup = await categoryService.exportDefaults();
		const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a"); link.href = url; link.download = "rizhi-default-categories.json"; link.click(); URL.revokeObjectURL(url);
	}
	const statusOptions = [{ label: "状态：全部", value: "all" }, { label: "状态：启用", value: "enabled" }, { label: "状态：停用", value: "disabled" }];
	const scopeOptions = [{ label: "分类类型：全部", value: "all" }, { label: "资产", value: "asset" }, { label: "支出", value: "expense" }, { label: "收入", value: "income" }];
	const directionOptions = [{ label: "资产账户", value: "asset" }, { label: "负债账户", value: "liability" }];
	const accountGroupOptions = [{ label: "现金账户", value: "asset" }, { label: "信用账户", value: "credit" }, { label: "充值账户", value: "stored_value" }];
	const batchOperationOptions = [{ label: "批量启用", value: "enable" }, { label: "批量停用", value: "disable" }, { label: "批量修改适用范围", value: "scopes" }, { label: "批量删除", value: "delete" }];
	const batchPreviewText = computed(() => {
		const count = selectedBatchIds.value.length;
		if (!count) return "请选择至少一个分类。";
		if (batchOperation.value === "enable") return `将启用 ${count} 个分类。`;
		if (batchOperation.value === "disable") return `将停用 ${count} 个分类，已有关联数据仍会保留。`;
		if (batchOperation.value === "delete") return `将尝试删除 ${count} 个分类；有业务引用的分类会被阻止删除。`;
		return `将 ${count} 个分类的适用范围改为：${batchScopes.value.map(scopeLabel).join(" / ") || "未选择"}`;
	});

	function groupLabel(item : CategoryRecord) {
		if (isBusinessCategory(item)) {
			return categoryScopes(item).map((scope) => ({ asset: "资产", expense: "支出", income: "收入" })[scope]).join(" / ");
		}
		return "";
	}
	function childItemsOf(parentId : string) {
		return items.value.filter((item) => item.parentId === parentId);
	}
	function parentOf(item : CategoryRecord) {
		return item.parentId ? items.value.find((parent) => parent.id === item.parentId) || null : null;
	}
	function isEffectivelyEnabled(item : CategoryRecord) {
		const parent = parentOf(item);
		return item.enabled !== false && parent?.enabled !== false;
	}
	function categoryStatusLabel(item : CategoryRecord) {
		const parent = parentOf(item);
		if (parent?.enabled === false) return "随父级停用";
		return item.enabled === false ? "已停用" : "启用中";
	}
	function scopeBadges(item : CategoryRecord) {
		return categoryScopes(item);
	}
	function scopeLabel(scope : CategoryScope) {
		return ({ asset: "资产", expense: "支出", income: "收入" })[scope];
	}
	function openChildren(parent : CategoryRecord) {
		selectedChildParent.value = parent;
		childrenVisible.value = true;
	}
	function startBatch() {
		selectedBatchIds.value = [];
		batchOperation.value = "enable";
		batchScopes.value = ["asset", "expense"];
		batchVisible.value = true;
	}
	function selectAllBatchItems() {
		selectedBatchIds.value = batchItems.value.map((item) => item.id);
	}
	async function applyBatch() {
		const selectedItems = selectedBatchItems.value;
		if (!selectedItems.length) return showError(new Error("请至少选择一个分类"));
		if (batchOperation.value === "delete") {
			batchDeleteVisible.value = true;
			return;
		}
		if (batchOperation.value === "scopes" && !batchScopes.value.length) return showError(new Error("请至少选择一个适用范围"));
		if (batchOperation.value === "enable") {
			const blockedChildren = selectedItems.filter((item) => item.parentId && parentOf(item)?.enabled === false);
			if (blockedChildren.length) return showError(new Error(`有 ${blockedChildren.length} 个子分类的一级分类已停用，请先启用一级分类`));
		}
		batchSaving.value = true;
		try {
			if (batchOperation.value === "enable" || batchOperation.value === "disable") {
				const enabled = batchOperation.value === "enable";
				const cascadeChildren = enabled ? [] : selectedItems.flatMap((item) => item.parentId ? [] : childItemsOf(item.id));
				const updateItems = Array.from(new Map([...selectedItems, ...cascadeChildren].map((item) => [item.id, item])).values());
				await Promise.all(updateItems.map((item) => categoryService.update({ id: item.id, enabled })));
			} else {
				const scopes = [...batchScopes.value];
				const domain: CategoryDomain = scopes.includes("asset") ? "asset" : "transaction";
				await Promise.all(selectedItems.map((item) => categoryService.update({
					id: item.id,
					domain,
					scopes,
					type: scopes.includes("income") && !scopes.includes("expense") ? "income" : item.type,
				})));
			}
			await refreshAdminItems();
			message.value = "批量操作已完成。";
			messageTone.value = "success";
			batchVisible.value = false;
			selectedBatchIds.value = [];
		} catch (error) {
			showError(error);
		} finally {
			batchSaving.value = false;
		}
	}
	async function confirmBatchDelete() {
		const selectedItems = selectedBatchItems.value;
		if (!selectedItems.length) return;
		batchDeleting.value = true;
		try {
			const results = await Promise.allSettled(selectedItems.map((item) => categoryService.delete(item.id)));
			const deletedCount = results.filter((result) => result.status === "fulfilled").length;
			const failedCount = results.length - deletedCount;
			await refreshAdminItems();
			batchDeleteVisible.value = false;
			if (failedCount > 0) {
				message.value = `已删除 ${deletedCount} 个分类，${failedCount} 个分类因存在业务引用未删除。`;
				messageTone.value = "danger";
			} else {
				message.value = `已删除 ${deletedCount} 个分类。`;
				messageTone.value = "success";
				batchVisible.value = false;
			}
			selectedBatchIds.value = [];
		} catch (error) {
			showError(error);
		} finally {
			batchDeleting.value = false;
		}
	}
	function reset() { deleteBlocked.value = false; Object.assign(draft, { id: "", name: "", note: "", sort: "100", type: "other", parentId: "", accountDirection: "asset", accountGroup: "asset", requiresBank: false, iconUrl: "", iconFileId: "", scopes: props.domain === "asset" ? ["asset", "expense"] : [], enabled: true }); }
	function clearEditorMessage() { message.value = ""; messageTone.value = "danger"; deleteBlocked.value = false; }
	function startCreate() {
		clearEditorMessage();
		reset();
		draft.sort = String(Math.max(0, ...parentItems.value.map((item) => item.sort)) + 10);
		selectedChildParent.value = null;
		childrenVisible.value = false;
		editorVisible.value = true;
	}
	function startCreateChild(parent : CategoryRecord) {
		clearEditorMessage();
		reset();
		Object.assign(draft, {
			parentId: parent.id,
			type: String(parent.type || "other"),
			scopes: categoryScopes(parent),
			sort: String(Math.max(parent.sort, ...childItemsOf(parent.id).map((item) => item.sort)) + 10),
		});
		selectedChildParent.value = parent;
		editorVisible.value = true;
	}
	function edit(item : CategoryRecord) {
		clearEditorMessage();
		Object.assign(draft, { id: item.id, name: item.name, note: item.note || "", sort: String(item.sort), type: String(item.type || "other"), parentId: item.parentId || "", accountDirection: item.accountDirection || (item.accountGroup === "credit" ? "liability" : "asset"), accountGroup: item.accountGroup || "asset", requiresBank: item.requiresBank ?? (item.type === "debit_card" || item.type === "credit_card"), iconUrl: item.iconUrl || "", iconFileId: item.iconFileId || "", scopes: categoryScopes(item), enabled: item.enabled !== false });
		selectedChildParent.value = item.parentId ? items.value.find((parent) => parent.id === item.parentId) || null : null;
		editorVisible.value = true;
	}
	async function selectIcon(event : Event) {
		const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
		uploading.value = true;
		try { const dataUrl = await imageFileToPersistentUrl(file); const uploaded = await uploadImageDataUrl(dataUrl, "category_icon"); draft.iconUrl = uploaded.url; draft.iconFileId = uploaded.fileId; }
		catch (error) { showError(error); } finally { uploading.value = false; (event.target as HTMLInputElement).value = ""; }
	}
	function removeIcon() { draft.iconUrl = ""; draft.iconFileId = ""; }
	function showError(error : unknown) { message.value = error instanceof Error ? error.message : "操作失败"; messageTone.value = "danger"; }
	async function save() {
		if (!draft.name.trim()) return showError(new Error("请输入名称"));
		const sort = Number(draft.sort); if (!Number.isFinite(sort)) return showError(new Error("排序必须是数字"));
		if (props.domain === "asset" && !draft.scopes.length) return showError(new Error("请至少选择一个适用范围"));
		const currentParent = draft.parentId ? items.value.find((item) => item.id === draft.parentId) : null;
		if (props.domain === "asset" && draft.parentId && draft.enabled && currentParent?.enabled === false) return showError(new Error("一级分类已停用，不能单独启用子分类"));
		saving.value = true;
		const businessType = draft.scopes.includes("income") && !draft.scopes.includes("expense") ? "income" : draft.type;
		const domain : CategoryDomain = props.domain === "asset" ? (draft.scopes.includes("asset") ? "asset" : "transaction") : props.domain;
		const payload : CreateCategoryInput = { domain, name: draft.name.trim(), note: props.domain === "bank" ? draft.note.trim() || undefined : undefined, sort, parentId: draft.parentId || undefined, type: (props.domain === "asset" ? businessType : draft.type) as CategoryRecord["type"], scopes: props.domain === "asset" ? [...draft.scopes] : undefined, enabled: draft.enabled, isSystem: true, iconUrl: draft.iconUrl || undefined, iconFileId: draft.iconFileId || undefined, accountDirection: props.domain === "account" ? draft.accountDirection as CategoryRecord["accountDirection"] : undefined, accountGroup: props.domain === "account" ? draft.accountGroup as CategoryRecord["accountGroup"] : undefined, requiresBank: props.domain === "account" ? draft.requiresBank : undefined, scope: "system" };
		try {
			draft.id ? await categoryService.update({ id: draft.id, ...payload }) : await categoryService.create(payload);
			if (draft.id && props.domain === "asset" && !draft.parentId && !draft.enabled) {
				await Promise.all(childItemsOf(draft.id).map((child) => categoryService.update({ id: child.id, enabled: false })));
			}
			await refreshAdminItems(); message.value = "系统分类已保存。"; messageTone.value = "success"; editorVisible.value = false; reset();
		}
		catch (error) { showError(error); } finally { saving.value = false; }
	}
	async function deactivate() {
		if (!draft.id) return;
		deactivating.value = true;
		try {
			await categoryService.update({ id: draft.id, enabled: false });
			await refreshAdminItems();
			draft.enabled = false;
			deleteBlocked.value = false;
			message.value = "该分类已停用，历史数据会保留，后续新增时不会再显示。";
			messageTone.value = "success";
		} catch (error) { showError(error); } finally { deactivating.value = false; }
	}
	async function confirmDelete() { if (!draft.id) return; deleting.value = true; deleteBlocked.value = false; try { await categoryService.delete(draft.id); await refreshAdminItems(); deleteVisible.value = false; editorVisible.value = false; reset(); } catch (error) { deleteVisible.value = false; deleteBlocked.value = true; showError(error); } finally { deleting.value = false; } }
	onMounted(() => { void loadSystemItems(); });
	reset();
</script>

<style scoped>
	.dictionary-panel {
		display: grid;
		gap: 18px;
		padding: 20px;
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}

	header,
	.form-actions,
	.icon-upload {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	h2,
	h3 {
		margin: 0 0 6px;
	}

	.dictionary-panel p {
		margin: 0;
		color: var(--color-text-muted);
	}

	.dictionary-toolbar {
		display: grid;
		grid-template-columns: minmax(220px, 1fr) 170px 190px auto;
		gap: 16px;
		align-items: center;
		padding: 16px;
		background: rgba(255, 255, 255, .72);
		border: 1px solid var(--color-border);
		border-radius: 16px;
		box-shadow: 0 10px 30px rgba(15, 23, 42, .04);
	}

	.toolbar-actions {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
	}

	.dictionary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 18px;
	}

	.category-card {
		position: relative;
		display: grid;
		min-height: 148px;
		overflow: hidden;
		align-content: space-between;
		background: #fff;
		border: 1px solid var(--color-border);
		border-radius: 16px;
		box-shadow: 0 14px 34px rgba(15, 23, 42, .055);
		transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
	}

	.category-card:hover,
	.category-card.active {
		transform: translateY(-2px);
		border-color: #9ec5ff;
		box-shadow: 0 20px 48px rgba(22, 119, 255, .12);
	}

	.drag-chosen {
		cursor: grabbing !important;
	}

	.drag-ghost {
		opacity: .35;
		transform: scale(.98);
		background: var(--color-primary-light);
		border-color: #1677ff;
	}

	.drag-active {
		transform: rotate(.4deg) scale(1.02);
		box-shadow: 0 26px 60px rgba(22, 119, 255, .2);
	}

	.category-card__main {
		display: grid;
		width: 100%;
		grid-template-columns: 56px minmax(0, 1fr);
		align-items: center;
		gap: 16px;
		padding: 22px 72px 12px 18px;
		color: var(--color-text-primary);
		text-align: left;
		background: transparent;
		border: 0;
		cursor: pointer;
	}

	.category-card__main strong {
		display: block;
		overflow: hidden;
		color: var(--color-text-primary);
		font-size: 16px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.category-card__main small {
		display: block;
		margin-top: 6px;
		color: var(--color-text-muted);
		font-size: 12px;
	}

	.dictionary-form__feedback { margin: 16px 20px 0; }
	.panel-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

	.category-card__main .category-card__note {
		margin-top: 3px;
		max-width: 180px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.category-card__more {
		position: absolute;
		top: 16px;
		right: 16px;
		color: var(--color-text-secondary);
		background: transparent;
		border: 0;
		cursor: pointer;
		font-size: 18px;
		font-weight: 800;
	}

	.item-icon,
	.icon-preview {
		display: grid;
		width: 52px;
		height: 52px;
		place-items: center;
		overflow: hidden;
		color: #fff;
		border-radius: 12px;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .18);
	}

	.item-icon.small {
		width: 32px;
		height: 32px;
		border-radius: 8px;
	}

	.item-icon img,
	.icon-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.category-card__badges {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 0 18px 12px 86px;
	}

	.category-card__badges em {
		padding: 3px 8px;
		border-radius: 999px;
		font-size: 12px;
		font-style: normal;
		font-weight: 800;
	}

	.scope-asset {
		color: var(--color-primary);
		background: var(--color-primary-light);
	}

	.scope-expense {
		color: #d92d20;
		background: #fff1f0;
	}

	.scope-income {
		color: #039855;
		background: #ecfdf3;
	}

	.category-card__badges .disabled {
		color: #667085;
		background: #f2f4f7;
	}

	.category-card__actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border-top: 1px solid var(--color-border);
	}

	.category-card__actions button {
		height: 42px;
		color: var(--color-primary);
		background: #fff;
		border: 0;
		cursor: pointer;
		font-weight: 800;
	}

	.category-card__actions button+button {
		border-left: 1px solid var(--color-border);
	}

	.category-card__actions button:hover {
		background: var(--color-primary-light);
	}

	.children-modal {
		display: grid;
		background: #fff;
	}

	.children-list {
		display: grid;
		gap: 10px;
		max-height: min(520px, calc(100dvh - 240px));
		overflow: auto;
		padding: 20px 24px;
	}

	.children-item {
		display: grid;
		grid-template-columns: 30px auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 12px;
		padding: 12px;
		text-align: left;
		background: #fff;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		cursor: pointer;
	}

	.children-item:hover {
		border-color: #9ec5ff;
		background: var(--color-primary-light);
	}

	.children-item strong,
	.children-item small {
		display: block;
	}

	.children-item small,
	.children-item em {
		color: var(--color-text-muted);
		font-size: 12px;
		font-style: normal;
	}

	.batch-modal {
		display: grid;
		background: #fff;
	}

	.batch-body {
		display: grid;
		grid-template-columns: minmax(0, 1.25fr) minmax(280px, .75fr);
		gap: 18px;
		max-height: calc(100dvh - 230px);
		overflow: auto;
		padding: 22px 24px;
	}

	.batch-picker,
	.batch-operation {
		display: grid;
		align-content: start;
		gap: 14px;
		padding: 16px;
		background: #f8fafc;
		border: 1px solid var(--color-border);
		border-radius: 16px;
	}

	.batch-picker__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	.batch-picker__head strong,
	.batch-operation strong {
		display: block;
		color: var(--color-text-primary);
		font-size: 16px;
	}

	.batch-picker__head small {
		display: block;
		margin-top: 4px;
		color: var(--color-text-muted);
		font-size: 12px;
	}

	.batch-picker__actions {
		display: flex;
		gap: 8px;
	}

	.batch-picker__actions button {
		color: var(--color-primary);
		background: #fff;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		cursor: pointer;
		font-weight: 800;
		padding: 6px 10px;
	}

	.batch-list {
		display: grid;
		gap: 10px;
		max-height: 460px;
		overflow: auto;
		padding-right: 4px;
	}

	.batch-item {
		display: grid;
		grid-template-columns: auto auto minmax(0, 1fr);
		align-items: center;
		gap: 12px;
		padding: 12px;
		background: #fff;
		border: 1px solid var(--color-border);
		border-radius: 13px;
		cursor: pointer;
	}

	.batch-item.child {
		margin-left: 24px;
	}

	.batch-item.checked {
		border-color: #1677ff;
		box-shadow: 0 0 0 3px rgba(22, 119, 255, .1);
	}

	.batch-item strong,
	.batch-item small {
		display: block;
	}

	.batch-item small {
		margin-top: 4px;
		color: var(--color-text-muted);
		font-size: 12px;
	}

	.batch-operation label {
		display: grid;
		gap: 8px;
		font-size: 12px;
		font-weight: 800;
	}

	.batch-preview {
		padding: 14px;
		background: #fff;
		border: 1px solid var(--color-border);
		border-radius: 12px;
	}

	.batch-danger-note {
		padding: 14px;
		color: #b42318;
		background: #fff1f0;
		border: 1px solid #ffd5d2;
		border-radius: 12px;
	}

	.batch-danger-note strong {
		display: block;
		color: #b42318;
		font-size: 13px;
	}

	.batch-danger-note p {
		margin: 8px 0 0;
		line-height: 1.6;
	}

	.batch-preview span {
		color: var(--color-text-muted);
		font-size: 12px;
		font-weight: 800;
	}

	.batch-preview p {
		margin: 8px 0 0;
		color: var(--color-text-primary);
		line-height: 1.6;
	}

	.empty-state {
		display: grid;
		min-height: 120px;
		place-items: center;
		color: var(--color-text-muted);
		background: rgba(255, 255, 255, .72);
		border: 1px dashed var(--color-border);
		border-radius: 16px;
	}

	.dictionary-form {
		display: grid;
		align-content: start;
		background: #fff;
	}

	.dictionary-form label {
		display: grid;
		gap: 7px;
		font-size: 12px;
		font-weight: 700;
	}

	.dictionary-form__head {
		padding: 22px 24px;
		color: #fff;
		background:
			radial-gradient(circle at 86% 16%, rgba(255, 255, 255, 0.22), transparent 24%),
			linear-gradient(135deg, #1257c7, #1677ff);
	}

	.dictionary-form__head span {
		color: rgba(255, 255, 255, .76);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: .08em;
	}

	.dictionary-form__head h3 {
		margin: 6px 0 0;
		font-size: 22px;
	}

	.dictionary-form__head button {
		display: grid;
		width: 32px;
		height: 32px;
		place-items: center;
		color: #fff;
		background: rgba(255, 255, 255, .16);
		border: 0;
		border-radius: 50%;
		cursor: pointer;
		font-size: 20px;
	}

	.dictionary-form__body {
		display: grid;
		gap: 14px;
		max-height: calc(100dvh - 260px);
		overflow: auto;
		padding: 22px 24px;
		background: #fff;
	}

	.scope-field {
		display: grid;
		gap: 8px;
		font-size: 12px;
		font-weight: 700;
	}

	.scope-options {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}

	.scope-options label {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 36px;
		padding: 0 10px;
		background: #fff;
		border: 1px solid var(--color-border);
		border-radius: 9px;
	}

	.scope-field small {
		color: var(--color-text-muted);
		font-weight: 500;
		line-height: 1.6;
	}

	.icon-upload {
		justify-content: flex-start;
	}

	.icon-preview {
		background: #fff;
		border: 1px solid var(--color-border);
	}

	.remove-icon {
		color: var(--color-danger);
		background: none;
		border: 0;
	}

	.enabled-row {
		display: flex !important;
		align-items: center;
	}

	.form-actions {
		justify-content: flex-end;
		padding: 16px 24px;
		background: var(--color-bg-hover);
		border-top: 1px solid var(--color-border);
	}

	@media (max-width: 1100px) {
		.dictionary-toolbar {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.toolbar-actions {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 720px) {

		.dictionary-toolbar,
		.dictionary-grid,
		.batch-body {
			grid-template-columns: 1fr;
		}
	}
</style>

<style>
	.dictionary-modal-card.n-card {
		overflow: hidden;
		box-shadow: 0 24px 80px rgba(17, 24, 39, 0.22);
	}

	.dictionary-modal-card .n-card__content {
		padding: 0 !important;
	}
</style>

