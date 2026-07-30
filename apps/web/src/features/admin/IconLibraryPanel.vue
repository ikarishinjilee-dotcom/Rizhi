<template>
  <section class="icon-library-panel">
    <RInlineFeedback v-if="syncError" tone="danger" data-testid="icon-library-sync-error">{{ syncError }}</RInlineFeedback>
    <RInlineFeedback v-else-if="syncMessage" tone="success" data-testid="icon-library-sync-success">{{ syncMessage }}</RInlineFeedback>
    <header class="panel-heading">
      <div>
        <h2>图标库管理</h2>
        <p>由你维护图标资源。普通图标支持自定义小类，银行图标独立管理；分类只保存稳定的图标 Key，方便后续多端映射。</p>
      </div>
    </header>

    <div v-if="showResourceNote" class="resource-note">
      <div class="resource-note__icon"><Info :size="20" /></div>
      <div><strong>跨端资源绑定</strong><span>上传图标只作为 Web 预览。小程序、Android、iOS 使用相同 Key，在各自端映射原生资源，避免把 Web 地址写进业务数据。</span></div>
      <button type="button" aria-label="关闭提示" @click="showResourceNote = false"><X :size="18" /></button>
    </div>

    <div class="icon-library-panel__workspace">
      <section class="icon-library-panel__upload">
        <label>名称<input v-model="draft.label" placeholder="例如：餐饮、工资" /></label>

        <div class="assignment-row"><label>所属大类<RSelect v-model="formKind" :options="categoryOptions" placeholder="请选择大类" :clearable="false" /></label>
        <label>所属小类<RSelect v-model="draft.groupId" :options="formGroupOptions" placeholder="请选择小类" :clearable="false" /></label></div>

        <label>稳定 Key
          <div class="key-field"><input v-model="draft.key" readonly /><button type="button" class="regenerate-button" title="重新生成 Key" @click="draft.key = createIconKey(formKind)"><RefreshCw :size="15" /><span>重新生成</span></button></div>
        </label>


        <label>上传图标
          <button type="button" class="upload-dropzone" :class="{ 'upload-dropzone--filled': draft.assetUrl, 'upload-dropzone--dragging': isDragging }" @click="fileInput?.click()" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="onDrop">
            <img v-if="draft.assetUrl" :src="draft.assetUrl" :alt="draft.label || '待上传图标'" />
            <template v-else><UploadCloud :size="30" /><strong>点击或拖拽文件到此处上传</strong><span>支持 PNG / SVG，建议 256×256 及以上</span></template>
          </button>
          <input ref="fileInput" class="hidden-file" type="file" accept="image/png,image/svg+xml,image/webp" @change="onFileChange" />
        </label>

        <div class="icon-library-panel__actions">
          <button data-testid="icon-library-add-group" type="button" class="button button--secondary" @click.stop.prevent="openGroupDialog"><Plus :size="17" />新增小类</button>
          <button type="button" class="button button--primary" :disabled="!canSave || syncing" @click="saveIcon"><LoaderCircle v-if="syncing" :size="16" class="button-spinner" /><Save v-else :size="16" />{{ syncing ? '保存中…' : '保存图标' }}</button>
        </div>
      </section>

      <section class="icon-library-panel__browser">
        <div class="icon-library-panel__tabs">
          <div class="category-switcher__toolbar">
            <div class="category-switcher__title"><strong>图标大类</strong><span>{{ categories.length }} 个</span></div>
            <div class="category-switcher__actions">
              <button type="button" class="category-add-trigger" title="新增大类" @click="openCategoryDialog"><Plus :size="15" />新增大类</button>
              <button v-if="categories.length > 1" type="button" class="category-sort-trigger" title="排序大类" @click="openSortDialog('categories')"><ArrowDownUp :size="14" />排序</button>
            </div>
          </div>
          <div class="category-switcher__rail">
            <div v-for="category in categories" :key="category.id" class="category-tab-item" :class="{ active: kind === category.id }">
              <button type="button" class="category-tab-select" :title="category.label" @click="kind = category.id">{{ category.label }}</button>
              <button type="button" class="category-tab-edit" :aria-label="`编辑大类“${category.label}”`" title="编辑大类" @click="openCategoryEditor(category.id, category.label)"><Pencil :size="12" /></button>
            </div>
          </div>
        </div>
        <label class="search-field"><Search :size="18" /><input v-model="searchQuery" type="search" placeholder="搜索当前大类图标" /></label>

        <div class="standard-browser">
          <nav class="group-nav" :aria-label="`${activeCategory?.label || '图标'}分类`">
            <div class="group-nav__heading"><span>图标分类</span><button v-if="groups.length > 1" type="button" class="group-sort-trigger" title="排序分类" @click="openSortDialog('groups')"><ArrowDownUp :size="13" />排序</button></div>
            <div v-for="group in groups" :key="group.id" class="group-nav__item" :class="{ active: selectedGroupId === group.id }">
              <button type="button" class="group-nav__select" @click="selectedGroupId = group.id; searchQuery = ''">{{ group.label }}</button>
              <span class="group-nav__actions">
                <button type="button" aria-label="编辑小类" title="编辑小类" @click.stop="openGroupEditor(group.id, group.label)"><Pencil :size="13" /></button>
                <button type="button" aria-label="删除小类" title="删除小类" @click.stop="requestRemoveGroup(group.id)"><Trash2 :size="13" /></button>
              </span>
            </div>
            <p v-if="!groups.length" class="empty-hint">暂无小类</p>
          </nav>
          <div class="icon-grid-shell">
            <div class="browser-heading"><h3>{{ searchQuery.trim() ? '搜索结果' : selectedGroupLabel }}</h3><div class="browser-heading__tools"><span>{{ displayedIcons.length }} 个</span><button v-if="!searchQuery.trim() && displayedIcons.length > 1" type="button" class="sort-trigger" @click="openSortDialog('icons')"><ArrowDownUp :size="14" />排序</button></div></div>
            <div v-if="displayedIcons.length" class="icon-grid">
              <article v-for="icon in displayedIcons" :key="icon.key" class="icon-card">
                <div class="icon-card__preview"><IconGlyph :icon-key="icon.key" :size="34" /></div><strong>{{ icon.label }}</strong>
                <div class="icon-card__actions"><button type="button" title="编辑图标" @click.stop="openEditIcon(icon)"><Pencil :size="14" /></button><button type="button" title="删除图标" @click.stop="requestRemoveIcon(icon.key)"><Trash2 :size="14" /></button></div>
              </article>
            </div>
            <p v-else class="browser-empty">这个小类还没有图标。</p>
          </div>
        </div>
      </section>
    </div>

    <Teleport to="body"><div v-if="categoryDialogVisible" class="group-dialog-overlay" data-testid="icon-library-category-dialog" @click.self="categoryDialogVisible = false">
      <section class="group-dialog" role="dialog" aria-modal="true" aria-labelledby="category-dialog-title">
        <header><div><span>ICON LIBRARY</span><h3 id="category-dialog-title">{{ editingCategoryId ? '编辑大类' : '新增大类' }}</h3></div><button type="button" aria-label="关闭" @click="categoryDialogVisible = false"><X :size="18" /></button></header>
        <div class="group-dialog__body"><label>大类名称<input v-model="newCategoryLabel" autofocus placeholder="例如：普通图标、品牌图标" @keyup.enter="saveCategory" /></label><p>新大类会自动创建一个“未分类”小类，并支持图标上传、编辑、删除和排序。</p></div>
        <footer><button type="button" class="button button--secondary" :disabled="syncing" @click="categoryDialogVisible = false">取消</button><button type="button" class="button button--primary" :disabled="!newCategoryLabel.trim() || syncing" @click="saveCategory"><LoaderCircle v-if="syncing" :size="16" class="button-spinner" />{{ syncing ? '保存中…' : '保存大类' }}</button></footer>
      </section>
    </div></Teleport>
    <Teleport to="body"><div v-if="groupDialogVisible" class="group-dialog-overlay" data-testid="icon-library-group-dialog" @click.self="groupDialogVisible = false">
      <section class="group-dialog" role="dialog" aria-modal="true" aria-labelledby="group-dialog-title">
          <header><div><span>ICON CATEGORY</span><h3 id="group-dialog-title">{{ editingGroupId ? '编辑小类' : '新增小类' }}</h3></div><button type="button" aria-label="关闭" @click="groupDialogVisible = false"><X :size="18" /></button></header>
        <div class="group-dialog__body"><label>小类名称<input v-model="newGroupLabel" autofocus placeholder="例如：收入、餐饮、日常" @keyup.enter="saveGroup" /></label><p>新增或修改后会同步更新当前大类下的分类导航。</p></div>
        <footer><button type="button" class="button button--secondary" :disabled="syncing" @click="groupDialogVisible = false">取消</button><button data-testid="icon-library-save-group" type="button" class="button button--primary" :disabled="!newGroupLabel.trim() || syncing" @click="saveGroup"><LoaderCircle v-if="syncing" :size="16" class="button-spinner" />{{ syncing ? '保存中…' : (editingGroupId ? '保存修改' : '保存小类') }}</button></footer>
      </section>
    </div></Teleport>
    <Teleport to="body"><div v-if="sortDialogVisible" class="group-dialog-overlay" data-testid="icon-library-sort-dialog" @click.self="sortDialogVisible = false">
      <section class="group-dialog sort-dialog" role="dialog" aria-modal="true" aria-labelledby="sort-dialog-title">
        <header><div><span>{{ sortTarget === 'categories' ? 'LIBRARY ORDER' : sortTarget === 'groups' ? 'CATEGORY ORDER' : 'ICON ORDER' }}</span><h3 id="sort-dialog-title">{{ sortTarget === 'categories' ? '排序大类' : sortTarget === 'groups' ? '排序小类' : '排序图标' }}</h3></div><button type="button" aria-label="关闭" @click="sortDialogVisible = false"><X :size="18" /></button></header>
        <div class="sort-dialog__body"><p>{{ sortTarget === 'categories' ? '拖拽调整图标库大类顺序。' : sortTarget === 'groups' ? '拖拽调整当前大类下的小类顺序。' : '拖拽图标调整顺序，保存后会应用到当前小类。' }}</p><div class="sort-list" :class="{ 'sort-list--grid': sortTarget === 'icons' }"><div v-for="key in sortKeys" :key="key" class="sort-item" draggable="true" :class="{ dragging: draggingSortKey === key }" @dragstart="onSortDragStart(key)" @dragover.prevent @drop="onSortDrop(key)"><GripVertical :size="17" class="sort-item__handle" /><span v-if="sortTarget === 'icons'" class="sort-item__icon"><IconGlyph :icon-key="key" :size="30" /></span><span v-else class="sort-item__number">{{ sortKeys.indexOf(key) + 1 }}</span><strong :title="sortTarget === 'categories' ? categoryById(key)?.label : sortTarget === 'groups' ? sortGroupByKey(key)?.label : sortIconByKey(key)?.label">{{ sortTarget === 'categories' ? categoryById(key)?.label : sortTarget === 'groups' ? sortGroupByKey(key)?.label : sortIconByKey(key)?.label }}</strong></div></div></div>
        <footer><button type="button" class="button button--secondary" :disabled="syncing" @click="sortDialogVisible = false">取消</button><button type="button" class="button button--primary" :disabled="syncing" @click="saveSortOrder"><LoaderCircle v-if="syncing" :size="16" class="button-spinner" /><Save v-else :size="16" />{{ syncing ? '保存中…' : '保存排序' }}</button></footer>
      </section>
    </div></Teleport>
    <Teleport to="body"><div v-if="editingIcon" class="group-dialog-overlay" data-testid="icon-library-edit-dialog" @click.self="closeEditIcon">
      <section class="group-dialog edit-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title">
        <header><div><span>ICON ASSET</span><h3 id="edit-dialog-title">编辑图标</h3></div><button type="button" aria-label="关闭" @click="closeEditIcon"><X :size="18" /></button></header>
        <div class="group-dialog__body">
          <label>名称<input v-model="editDraft.label" placeholder="输入图标名称" /></label>
          <div class="assignment-row"><label>所属大类<RSelect v-model="editKind" :options="categoryOptions" placeholder="请选择大类" :clearable="false" /></label>
          <label>所属小类<RSelect v-model="editDraft.groupId" :options="editGroupOptions" placeholder="请选择小类" :clearable="false" /></label></div>
          <label>稳定 Key<div class="edit-key">{{ editingIcon.key }}</div></label>
          <label>图标文件<button type="button" class="edit-asset-picker" @click="editFileInput?.click()"><img v-if="editDraft.assetUrl" :src="editDraft.assetUrl" alt="当前图标" /><span v-else>选择图标文件</span></button><input ref="editFileInput" class="hidden-file" type="file" accept="image/png,image/svg+xml,image/webp" @change="onEditFileChange" /></label>
        </div>
        <footer><button type="button" class="button button--secondary" :disabled="syncing" @click="closeEditIcon">取消</button><button type="button" class="button button--primary" :disabled="!editDraft.label.trim() || syncing" @click="saveEditedIcon"><LoaderCircle v-if="syncing" :size="16" class="button-spinner" /><Save v-else :size="16" />{{ syncing ? '保存中…' : '保存修改' }}</button></footer>
      </section>
    </div></Teleport>
    <DeleteConfirmModal
      v-model:show="groupDeleteVisible"
      eyebrow="小类删除"
      :title="`删除小类“${pendingDeleteGroupLabel}”？`"
      :description="pendingDeleteGroupIconCount > 0 ? `该小类下还有 ${pendingDeleteGroupIconCount} 个图标，不能直接删除。请先编辑图标并移动到其他小类，或先删除这些图标。` : '删除后该小类将从普通图标分类导航中移除，此操作会同步到云端。'"
      :show-confirm="pendingDeleteGroupIconCount === 0"
      :loading="syncing"
      @confirm="confirmRemoveGroup"
    />
    <DeleteConfirmModal
      v-model:show="iconDeleteVisible"
      eyebrow="图标删除"
      :title="`删除图标「${pendingDeleteIconLabel}」？`"
      description="删除后会从图标库和云端资源索引中移除，已引用该图标的分类或账户不会自动改动。"
      confirm-text="确认删除"
      :loading="syncing"
      @confirm="confirmRemoveIcon"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ArrowDownUp, GripVertical, Info, LoaderCircle, Pencil, Plus, RefreshCw, Save, Search, Trash2, UploadCloud, X } from "@lucide/vue";
import IconGlyph from "@/components/ui/IconGlyph.vue";
import RSelect from "@/components/ui/RSelect.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import DeleteConfirmModal from "@/components/business/DeleteConfirmModal.vue";
import { addIconCategory, addIconGroup, createIconKey, getGroups, getIconCategories, iconLibraryState, removeIcon as removeLibraryIcon, removeIconGroup, replaceIconLibraryState, setCategoryOrder, setGroupOrder, setIconOrder, updateIconCategory, updateIconGroup, upsertIcon, type IconDefinition, type IconLibraryKind, type IconLibraryState } from "@/domain/iconLibrary";
import { getCloudIconLibrary, isCloudDataSource, saveCloudIconLibrary, uploadImageDataUrl } from "@/services/cloudApiService";

const kind = ref<IconLibraryKind>("standard");
const formKind = ref<IconLibraryKind>("standard");
const draft = reactive({ label: "", key: "", groupId: "", assetUrl: "" });
const searchQuery = ref("");
const selectedGroupId = ref("");
const groupDialogVisible = ref(false);
const categoryDialogVisible = ref(false);
const newGroupLabel = ref("");
const editingGroupId = ref("");
const newCategoryLabel = ref("");
const editingCategoryId = ref("");
const groupDeleteVisible = ref(false);
const iconDeleteVisible = ref(false);
const pendingDeleteGroupId = ref("");
const pendingDeleteIconKey = ref("");
const showResourceNote = ref(true);
const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const editFileInput = ref<HTMLInputElement | null>(null);
const editingIcon = ref<IconDefinition | null>(null);
const editDraft = reactive({ label: "", groupId: "", assetUrl: "" });
const editKind = ref<IconLibraryKind>("standard");
const sortDialogVisible = ref(false);
const sortKeys = ref<string[]>([]);
const draggingSortKey = ref("");
const sortTarget = ref<"icons" | "groups" | "categories">("icons");
const syncing = ref(false);
const syncError = ref("");
const syncMessage = ref("");
const syncedLibrarySnapshot = ref<IconLibraryState | null>(null);
const categories = computed(() => getIconCategories());
const activeCategory = computed(() => categories.value.find((category) => category.id === kind.value));
const groups = computed(() => getGroups(kind.value));
const categoryOptions = computed(() => categories.value.map((category) => ({ label: category.label, value: category.id })));
const formGroupOptions = computed(() => getGroups(formKind.value).map((group) => ({ label: group.label, value: group.id })));
const editGroupOptions = computed(() => getGroups(editKind.value).map((group) => ({ label: group.label, value: group.id })));
const icons = computed(() => iconLibraryState.icons.filter((icon) => icon.kind === kind.value));
const selectedGroupLabel = computed(() => groups.value.find((group) => group.id === selectedGroupId.value)?.label || "未分类");
const displayedIcons = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase();
  return icons.value.filter((icon) => (query || icon.groupId === selectedGroupId.value) && (!query || icon.label.toLocaleLowerCase().includes(query) || icon.key.toLocaleLowerCase().includes(query)));
});
const pendingDeleteGroupLabel = computed(() => groups.value.find((group) => group.id === pendingDeleteGroupId.value)?.label || "");
const pendingDeleteGroupIconCount = computed(() => iconLibraryState.icons.filter((icon) => icon.groupId === pendingDeleteGroupId.value).length);
const pendingDeleteIconLabel = computed(() => iconLibraryState.icons.find((icon) => icon.key === pendingDeleteIconKey.value)?.label || "该图标");
const canSave = computed(() => Boolean(draft.label.trim() && draft.key.trim() && draft.assetUrl && draft.groupId));

function resetDraft() { formKind.value = kind.value; draft.label = ""; draft.key = createIconKey(formKind.value); draft.groupId = selectedGroupId.value || getGroups(formKind.value)[0]?.id || ""; draft.assetUrl = ""; isDragging.value = false; }
function selectDefaultGroup() { if (!groups.value.some((group) => group.id === selectedGroupId.value)) selectedGroupId.value = groups.value[0]?.id || ""; }
function openGroupDialog() { editingGroupId.value = ""; newGroupLabel.value = ""; groupDialogVisible.value = true; }
function openGroupEditor(id: string, label: string) { editingGroupId.value = id; newGroupLabel.value = label; groupDialogVisible.value = true; }
function openCategoryDialog() { editingCategoryId.value = ""; newCategoryLabel.value = ""; categoryDialogVisible.value = true; }
function openCategoryEditor(id: string, label: string) { editingCategoryId.value = id; newCategoryLabel.value = label; categoryDialogVisible.value = true; }
async function syncCloudLibrary() {
  if (!isCloudDataSource()) return;
  syncing.value = true;
  syncError.value = "";
  syncMessage.value = "";
  try {
    for (const icon of iconLibraryState.icons) {
      if (icon.assetUrl?.startsWith("data:image/") && !icon.assetFileId) {
        const uploaded = await uploadImageDataUrl(icon.assetUrl, "icon_library");
        icon.assetFileId = uploaded.fileId;
        icon.assetUrl = uploaded.url;
      }
    }
    await saveCloudIconLibrary({
      categories: iconLibraryState.categories.map(({ id, label, sort }) => ({ id, label, sort })),
      groups: iconLibraryState.groups.map(({ id, label, kind }) => ({ id, label, kind })),
      icons: iconLibraryState.icons.map(({ key, label, kind, groupId, assetFileId, platforms }) => ({ key, label, kind, groupId, assetFileId, platforms })),
      aliases: iconLibraryState.aliases,
    });
    syncedLibrarySnapshot.value = JSON.parse(JSON.stringify({ categories: iconLibraryState.categories, groups: iconLibraryState.groups, icons: iconLibraryState.icons, aliases: iconLibraryState.aliases })) as IconLibraryState;
  } catch (error) {
    if (syncedLibrarySnapshot.value) replaceIconLibraryState(syncedLibrarySnapshot.value);
    syncError.value = error instanceof Error ? error.message : "图标库同步失败";
    throw error;
  } finally {
    syncing.value = false;
  }
}

async function loadCloudLibrary() {
  if (!isCloudDataSource()) return;
  try {
    const cloud = await getCloudIconLibrary();
    const local = JSON.parse(JSON.stringify({ categories: iconLibraryState.categories, groups: iconLibraryState.groups, icons: iconLibraryState.icons, aliases: iconLibraryState.aliases })) as IconLibraryState;
    const cloudCategories = cloud.categories?.length ? cloud.categories : getIconCategories();
    const mergedAliases = { ...local.aliases, ...(cloud.aliases || {}) };
    const migratedLocalIcons = local.icons.map((icon) => mergedAliases[icon.key] ? { ...icon, key: mergedAliases[icon.key] } : icon);
    const cloudGroupIds = new Set(cloud.groups.map((group) => group.id));
    const cloudIconByKey = new Map(cloud.icons.map((icon) => [icon.key, icon]));
    const merged = {
      categories: cloudCategories,
      groups: [...cloud.groups, ...local.groups.filter((group) => !cloudGroupIds.has(group.id))],
      aliases: mergedAliases,
      icons: cloud.icons.map((icon) => {
        const localIcon = local.icons.find((item) => item.key === icon.key);
        return icon.assetFileId || !localIcon?.assetUrl ? icon : { ...icon, assetUrl: localIcon.assetUrl };
      }).concat(migratedLocalIcons.filter((icon) => !cloudIconByKey.has(icon.key))),
    } as IconLibraryState;
    const needsMigration = !cloud.categories?.length || cloud.icons.some((icon) => icon.key.startsWith("bank-")) || local.groups.some((group) => !cloudGroupIds.has(group.id))
      || local.icons.some((icon) => {
        const remote = cloudIconByKey.get(icon.key);
        return !remote || (!remote.assetFileId && Boolean(icon.assetUrl));
      });
    // During first migration, keep the merged local data as the rollback point.
    // A failed upload must not erase the only copy still present in this browser.
    syncedLibrarySnapshot.value = JSON.parse(JSON.stringify(merged)) as IconLibraryState;
    replaceIconLibraryState(merged);
    if (needsMigration) await syncCloudLibrary();
  } catch (error) {
    syncMessage.value = "";
    syncError.value = error instanceof Error ? error.message : "图标库加载失败";
  }
}

async function saveCategory() { const label = newCategoryLabel.value.trim(); if (!label || syncing.value) return; const id = editingCategoryId.value || addIconCategory(label); if (editingCategoryId.value) updateIconCategory(editingCategoryId.value, label); try { await syncCloudLibrary(); if (id && !editingCategoryId.value) kind.value = id; categoryDialogVisible.value = false; editingCategoryId.value = ""; syncMessage.value = isCloudDataSource() ? "大类已保存并同步到云端。" : "大类已保存。"; } catch { /* syncError is rendered above */ } }
async function saveGroup() { const label = newGroupLabel.value.trim(); if (!label || syncing.value) return; if (editingGroupId.value) updateIconGroup(editingGroupId.value, label); else addIconGroup(label, kind.value); selectedGroupId.value = editingGroupId.value || groups.value[groups.value.length - 1]?.id || selectedGroupId.value; draft.groupId = selectedGroupId.value; try { await syncCloudLibrary(); groupDialogVisible.value = false; editingGroupId.value = ""; syncMessage.value = isCloudDataSource() ? "小类已保存并同步到云端。" : "小类已保存。"; } catch { /* syncError is rendered above */ } }
function requestRemoveGroup(id: string) { if (syncing.value) return; syncError.value = ""; pendingDeleteGroupId.value = id; groupDeleteVisible.value = true; }
async function confirmRemoveGroup() { const id = pendingDeleteGroupId.value; if (!id || syncing.value || pendingDeleteGroupIconCount.value > 0) return; if (!removeIconGroup(id)) { syncError.value = "每个大类至少需要保留一个小类。"; groupDeleteVisible.value = false; return; } groupDeleteVisible.value = false; pendingDeleteGroupId.value = ""; if (selectedGroupId.value === id) { selectedGroupId.value = groups.value[0]?.id || ""; draft.groupId = selectedGroupId.value; } try { await syncCloudLibrary(); syncMessage.value = isCloudDataSource() ? "小类已删除并同步到云端。" : "小类已删除。"; } catch { /* syncError is rendered above */ } }
function getFileLabel(fileName: string) { return fileName.replace(/\.[^/.]+$/, "").trim(); }
function readFile(file?: File) { if (!file || !file.type.match(/^image\/(png|svg\+xml|webp)$/)) return; if (!draft.label.trim()) draft.label = getFileLabel(file.name); const reader = new FileReader(); reader.onload = () => { draft.assetUrl = String(reader.result || ""); }; reader.readAsDataURL(file); }
function onFileChange(event: Event) { readFile((event.target as HTMLInputElement).files?.[0]); }
function onDrop(event: DragEvent) { isDragging.value = false; readFile(event.dataTransfer?.files?.[0]); }
async function saveIcon() { if (!canSave.value || syncing.value) return; upsertIcon({ key: draft.key.trim(), label: draft.label.trim(), kind: formKind.value, groupId: draft.groupId, assetUrl: draft.assetUrl, platforms: {} }); try { await syncCloudLibrary(); resetDraft(); syncMessage.value = isCloudDataSource() ? "图标已保存并同步到云端。" : "图标已保存。"; } catch { /* syncError is rendered above */ } }
function requestRemoveIcon(key: string) { if (syncing.value) return; syncError.value = ""; pendingDeleteIconKey.value = key; iconDeleteVisible.value = true; }
async function confirmRemoveIcon() { const key = pendingDeleteIconKey.value; if (!key || syncing.value) return; removeLibraryIcon(key); iconDeleteVisible.value = false; pendingDeleteIconKey.value = ""; try { await syncCloudLibrary(); syncMessage.value = isCloudDataSource() ? "图标已删除并同步到云端。" : "图标已删除。"; } catch { /* syncError is rendered above */ } }
function openSortDialog(target: "icons" | "groups" | "categories" = "icons") { sortTarget.value = target; sortKeys.value = target === "categories" ? categories.value.map((category) => category.id) : target === "groups" ? groups.value.map((group) => group.id) : displayedIcons.value.map((icon) => icon.key); draggingSortKey.value = ""; sortDialogVisible.value = true; }
function sortIconByKey(key: string) { return icons.value.find((icon) => icon.key === key); }
function sortGroupByKey(key: string) { return groups.value.find((group) => group.id === key); }
function categoryById(key: string) { return categories.value.find((category) => category.id === key); }
function onSortDragStart(key: string) { draggingSortKey.value = key; }
function onSortDrop(targetKey: string) { if (!draggingSortKey.value || draggingSortKey.value === targetKey) return; const next = [...sortKeys.value]; const from = next.indexOf(draggingSortKey.value); const to = next.indexOf(targetKey); if (from < 0 || to < 0) return; next.splice(from, 1); next.splice(to, 0, draggingSortKey.value); sortKeys.value = next; draggingSortKey.value = ""; }
async function saveSortOrder() { if (syncing.value) return; if (sortTarget.value === "categories") setCategoryOrder(sortKeys.value); else if (sortTarget.value === "groups") setGroupOrder(kind.value, sortKeys.value); else setIconOrder(kind.value, selectedGroupId.value, sortKeys.value); try { await syncCloudLibrary(); sortDialogVisible.value = false; syncMessage.value = isCloudDataSource() ? "排序已保存并同步到云端。" : "排序已保存。"; } catch { /* syncError is rendered above */ } }
function openEditIcon(icon: IconDefinition) { editingIcon.value = icon; editKind.value = icon.kind; editDraft.label = icon.label; editDraft.groupId = icon.groupId; editDraft.assetUrl = icon.assetUrl || ""; }
function closeEditIcon() { editingIcon.value = null; }
function onEditFileChange(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (!file || !file.type.match(/^image\/(png|svg\+xml|webp)$/)) return; const reader = new FileReader(); reader.onload = () => { editDraft.assetUrl = String(reader.result || ""); }; reader.readAsDataURL(file); }
async function saveEditedIcon() { if (!editingIcon.value || !editDraft.label.trim() || !editDraft.groupId || syncing.value) return; upsertIcon({ ...editingIcon.value, kind: editKind.value, label: editDraft.label.trim(), groupId: editDraft.groupId, assetUrl: editDraft.assetUrl, assetFileId: editDraft.assetUrl === editingIcon.value.assetUrl ? editingIcon.value.assetFileId : undefined }); try { await syncCloudLibrary(); closeEditIcon(); syncMessage.value = isCloudDataSource() ? "图标修改已保存，文件已重新上传并同步到云端。" : "图标修改已保存。"; } catch { /* syncError is rendered above */ } }

watch(kind, () => { formKind.value = kind.value; searchQuery.value = ""; selectDefaultGroup(); resetDraft(); });
watch(formKind, () => { if (!getGroups(formKind.value).some((group) => group.id === draft.groupId)) draft.groupId = getGroups(formKind.value)[0]?.id || ""; });
watch(editKind, () => { if (!getGroups(editKind.value).some((group) => group.id === editDraft.groupId)) editDraft.groupId = getGroups(editKind.value)[0]?.id || ""; });
watch(groups, () => { selectDefaultGroup(); if (!draft.groupId) draft.groupId = selectedGroupId.value; });
selectDefaultGroup();
resetDraft();
onMounted(() => { void loadCloudLibrary(); });
</script>

<style scoped>
.button-spinner { animation: icon-library-spin .8s linear infinite; }
@keyframes icon-library-spin { to { transform: rotate(360deg); } }
.icon-library-panel { display: grid; gap: 22px; padding: 28px 32px 34px; background: #fff; border: 1px solid var(--color-border); border-radius: 16px; box-shadow: 0 12px 30px rgba(15, 23, 42, .04); }
.panel-heading h2 { margin: 0 0 8px; color: #182338; font-size: 32px; letter-spacing: -.03em; }.panel-heading p { margin: 0; color: #536176; font-size: 15px; }
.resource-note { display: flex; align-items: flex-start; gap: 14px; padding: 20px 22px; color: #27344a; background: linear-gradient(100deg, #f1f6ff, #fbfdff); border: 1px solid #c8dcff; border-radius: 13px; }.resource-note__icon { display: grid; width: 30px; height: 30px; flex: 0 0 auto; place-items: center; color: #fff; background: var(--color-primary); border-radius: 50%; }.resource-note div:nth-child(2) { display: grid; gap: 6px; }.resource-note span { color: #536176; font-size: 14px; line-height: 1.5; }.resource-note > button { margin-left: auto; padding: 2px; color: #758297; background: transparent; border: 0; cursor: pointer; }
.icon-library-panel__workspace { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 360px); min-width: 0; gap: 24px; }.icon-library-panel__upload, .icon-library-panel__browser { min-width: 0; padding: 22px 24px; border: 1px solid #e0e7f0; border-radius: 13px; }.icon-library-panel__upload { display: grid; order: 2; align-content: start; gap: 18px; }.icon-library-panel__browser { order: 1; overflow: hidden; }.icon-library-panel__upload h3 { display: flex; align-items: center; gap: 12px; margin: 0 0 2px; color: #182338; font-size: 18px; }.section-title-icon { display: grid; width: 30px; height: 30px; place-items: center; color: #fff; background: var(--color-primary); border-radius: 7px; }.assignment-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.icon-library-panel__upload label { display: grid; gap: 8px; color: #344258; font-size: 13px; font-weight: 700; }.icon-library-panel__upload input, .icon-library-panel__upload select { width: 100%; box-sizing: border-box; padding: 11px 12px; color: #26344a; background: #fff; border: 1px solid #d5deeb; border-radius: 9px; outline: none; }.icon-library-panel__upload input:focus, .icon-library-panel__upload select:focus, .search-field:focus-within { border-color: #79a8ff; box-shadow: 0 0 0 3px rgba(47, 94, 255, .1); }.key-field { display: flex; gap: 10px; }.key-field input { min-width: 0; flex: 1; color: #68758a; background: #f8fafc; }.regenerate-button { display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto; padding: 0 12px; color: var(--color-primary); background: #fff; border: 1px solid #c9d9f7; border-radius: 9px; cursor: pointer; font-weight: 700; }
.upload-dropzone { display: grid; min-height: 132px; place-items: center; align-content: center; gap: 8px; padding: 14px; color: var(--color-primary); background: #fbfdff; border: 1px dashed #9dbfff; border-radius: 10px; cursor: pointer; }.upload-dropzone strong { color: #37445a; font-size: 13px; }.upload-dropzone span { color: #8190a5; font-size: 12px; font-weight: 400; }.upload-dropzone img { width: 72px; height: 72px; object-fit: contain; }.upload-dropzone--dragging { background: #eef5ff; border-color: var(--color-primary); }.hidden-file { display: none !important; }
.icon-library-panel__actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 2px; }.button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; padding: 0 16px; border-radius: 9px; cursor: pointer; font-weight: 800; }.button--secondary { color: #2059d6; background: #fff; border: 1px solid #d6e0ef; }.button--primary { color: #fff; background: linear-gradient(135deg, #2f5eff, #2450e9); border: 1px solid #2f5eff; box-shadow: 0 6px 15px rgba(47, 94, 255, .2); }.button:disabled { opacity: .45; cursor: not-allowed; }
.icon-card__actions { position: absolute; top: -6px; right: -2px; display: none; gap: 4px; }.icon-card:hover .icon-card__actions { display: flex; }.icon-card__actions button { display: grid; place-items: center; padding: 5px; color: #2450e9; background: #fff; border: 1px solid #c9d9f7; border-radius: 6px; cursor: pointer; }.icon-card__actions button:last-child { color: #d9485f; border-color: #f2c9d0; }
.icon-card__actions button:disabled { cursor: not-allowed; opacity: .35; }
.icon-library-panel__tabs { display: grid; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid #dce4ef; }.category-switcher__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.category-switcher__title { display: flex; align-items: baseline; gap: 8px; color: #26344a; }.category-switcher__title strong { font-size: 14px; }.category-switcher__title span { color: #8a97a9; font-size: 12px; }.category-switcher__actions { display: flex; align-items: center; gap: 7px; }.category-add-trigger, .category-sort-trigger { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 34px; padding: 0 10px; color: #2450e9; white-space: nowrap; background: #fff; border: 1px solid #c9d9f7; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 800; }.category-add-trigger:hover, .category-sort-trigger:hover { background: #f3f7ff; border-color: #8eb2f7; }.category-switcher__rail { display: flex; gap: 7px; min-width: 0; padding: 2px 1px 5px; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; scrollbar-color: #c9d5e5 transparent; }.category-tab-item { display: inline-flex; align-items: center; flex: 0 0 auto; max-width: 190px; min-height: 36px; color: #526077; background: #f7f9fc; border: 1px solid #e1e7ef; border-radius: 9px; transition: background .16s ease, border-color .16s ease, box-shadow .16s ease; }.category-tab-item:hover { color: #2450e9; background: #f3f7ff; border-color: #bfd1f2; }.category-tab-item.active { color: #1959d5; background: #edf4ff; border-color: #8db2f8; box-shadow: 0 2px 8px rgba(47, 94, 255, .1); }.category-tab-select { min-width: 0; max-width: 155px; padding: 8px 5px 8px 11px; overflow: hidden; color: inherit; text-overflow: ellipsis; white-space: nowrap; background: transparent; border: 0; cursor: pointer; font-size: 13px; font-weight: 750; }.category-tab-edit { display: grid; width: 28px; height: 28px; flex: 0 0 28px; place-items: center; margin-right: 3px; color: #7f8da1; background: transparent; border: 0; border-radius: 6px; cursor: pointer; opacity: 0; transition: opacity .16s ease, background .16s ease, color .16s ease; }.category-tab-item:hover .category-tab-edit, .category-tab-item.active .category-tab-edit, .category-tab-edit:focus-visible { opacity: 1; }.category-tab-edit:hover { color: #2450e9; background: #fff; }.search-field { display: flex; align-items: center; gap: 10px; margin: 16px 0; padding: 0 14px; color: #7b899e; border: 1px solid #d5deeb; border-radius: 9px; }.search-field input { width: 100%; min-height: 40px; color: #26344a; border: 0; outline: 0; }
.standard-browser { display: grid; grid-template-columns: 160px minmax(0, 1fr); min-width: 0; min-height: 450px; gap: 12px; }.group-nav { display: grid; align-content: start; align-self: start; gap: 2px; max-height: 450px; padding-right: 12px; overflow-x: hidden; overflow-y: auto; border-right: 1px solid #dce4ef; scrollbar-gutter: stable; }.group-nav__item { position: relative; display: flex; align-items: center; min-width: 0; border-radius: 7px; }.group-nav__item:hover { background: #f3f6fb; }.group-nav__item.active { color: var(--color-primary); background: #edf3ff; box-shadow: inset 3px 0 0 var(--color-primary); font-weight: 800; }.group-nav__select { min-width: 0; flex: 1; padding: 9px 12px; overflow: hidden; color: #26344a; text-align: left; text-overflow: ellipsis; white-space: nowrap; background: transparent; border: 0; border-radius: 7px; cursor: pointer; font-size: 14px; }.group-nav__item.active .group-nav__select { color: var(--color-primary); font-weight: 800; }.group-nav__actions { display: none; align-items: center; gap: 2px; padding-right: 4px; }.group-nav__item:hover .group-nav__actions, .group-nav__item.active .group-nav__actions { display: inline-flex; }.group-nav__actions button { display: grid; place-items: center; padding: 4px; color: #6b7a90; background: transparent; border: 0; border-radius: 5px; cursor: pointer; }.group-nav__actions button:hover { color: var(--color-primary); background: #fff; }.group-nav__actions button:last-child:hover { color: #d9485f; }.empty-hint, .browser-empty { color: #8190a5; font-size: 13px; }.browser-empty { align-self: start; padding: 40px 12px; text-align: center; }.icon-grid-shell { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 450px; min-width: 0; overflow: hidden; box-sizing: border-box; padding: 14px 16px 18px; border: 1px solid #dfe6ef; border-radius: 10px; }.browser-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.browser-heading h3 { min-width: 0; margin: 0; overflow: hidden; color: var(--color-primary); font-size: 18px; text-overflow: ellipsis; white-space: nowrap; }.browser-heading span { color: #8190a5; font-size: 12px; }.icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); align-content: start; gap: 18px 12px; min-width: 0; min-height: 0; margin-top: 20px; padding-right: 6px; overflow-x: hidden; overflow-y: auto; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: #c9d5e5 transparent; }.icon-card { position: relative; display: grid; justify-items: center; gap: 6px; min-width: 0; padding: 2px 4px 8px; text-align: center; }.icon-card__preview { display: grid; width: 58px; height: 58px; max-width: 100%; place-items: center; color: #687587; background: #f2f5f8; border-radius: 50%; }.icon-card strong { max-width: 100%; overflow: hidden; color: #354258; font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.icon-card small { max-width: 100%; overflow: hidden; color: #9aa6b6; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.icon-card__remove { position: absolute; top: -4px; right: 0; display: none; padding: 4px; color: #d9485f; background: #fff; border: 1px solid #f2c9d0; border-radius: 6px; cursor: pointer; }.icon-card:hover .icon-card__remove { display: grid; }.bank-browser { min-height: 450px; padding: 14px 16px; border: 1px solid #dfe6ef; border-radius: 10px; }
.group-dialog-overlay { position: fixed; inset: 0; z-index: 3000; display: grid; place-items: center; padding: 20px; background: rgba(15, 23, 42, .46); backdrop-filter: blur(5px); }.group-dialog { width: min(420px, 100%); overflow: hidden; background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(15, 23, 42, .2); }.group-dialog header { display: flex; align-items: start; justify-content: space-between; gap: 16px; padding: 22px 24px; color: #fff; background: linear-gradient(135deg, #1754c6, #3788ff); }.group-dialog header span { font-size: 11px; font-weight: 800; letter-spacing: .08em; opacity: .84; }.group-dialog h3 { margin: 6px 0 0; font-size: 21px; }.group-dialog header button { display: grid; place-items: center; padding: 6px; color: #fff; background: rgba(255,255,255,.16); border: 0; border-radius: 7px; cursor: pointer; }.group-dialog__body { display: grid; gap: 8px; padding: 22px 24px; }.group-dialog__body label { display: grid; gap: 7px; color: #344258; font-size: 13px; font-weight: 700; }.group-dialog__body input { width: 100%; box-sizing: border-box; padding: 11px 12px; border: 1px solid #d5deeb; border-radius: 8px; }.group-dialog__body p { margin: 0; color: #8190a5; font-size: 12px; }.group-dialog footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 24px; background: #f7f9fc; border-top: 1px solid #e5eaf1; }
.edit-key { padding: 11px 12px; color: #68758a; background: #f8fafc; border: 1px solid #d5deeb; border-radius: 8px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; word-break: break-all; }.edit-asset-picker { display: grid; min-height: 92px; place-items: center; color: var(--color-primary); background: #fbfdff; border: 1px dashed #9dbfff; border-radius: 9px; cursor: pointer; }.edit-asset-picker img { width: 70px; height: 70px; object-fit: contain; }.edit-asset-picker span { font-size: 13px; }
.browser-heading__tools { display: flex; align-items: center; gap: 10px; }.sort-trigger, .group-sort-trigger { display: inline-flex; align-items: center; gap: 5px; padding: 6px 9px; color: #2450e9; background: #fff; border: 1px solid #c9d9f7; border-radius: 7px; cursor: pointer; font-size: 12px; font-weight: 700; }.group-nav__heading { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 4px 4px 8px 12px; color: #8190a5; background: #fff; font-size: 12px; font-weight: 800; }.group-sort-trigger { padding: 4px 6px; font-size: 11px; }.sort-dialog { width: min(680px, 100%); }.sort-dialog__body { display: grid; gap: 10px; max-height: min(520px, calc(100dvh - 240px)); overflow: auto; padding: 20px 24px; }.sort-dialog__body > p { margin: 0; color: #8190a5; font-size: 12px; }.sort-list { display: grid; gap: 8px; }.sort-item { display: grid; grid-template-columns: 22px 42px minmax(0, 1fr); align-items: center; gap: 10px; min-height: 58px; padding: 8px 12px; background: #fff; border: 1px solid #dfe6ef; border-radius: 9px; cursor: grab; }.sort-item:active { cursor: grabbing; }.sort-item.dragging { opacity: .45; border-color: #7da9ff; background: #eef4ff; }.sort-item__handle { color: #9aa6b6; }.sort-item__icon, .sort-item__number { display: grid; width: 40px; height: 40px; place-items: center; background: #f2f5f8; border-radius: 9px; }.sort-item__number { color: #2450e9; background: #edf3ff; font-weight: 800; }.sort-item strong { color: #354258; font-size: 14px; }.sort-list--grid { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; }.sort-list--grid .sort-item { position: relative; grid-template-columns: minmax(0, 1fr); justify-items: center; align-content: center; min-height: 98px; padding: 13px 6px 8px; gap: 5px; text-align: center; }.sort-list--grid .sort-item__handle { position: absolute; top: 7px; left: 7px; width: 14px; height: 14px; }.sort-list--grid .sort-item__icon { width: 46px; height: 46px; border-radius: 12px; }.sort-list--grid .sort-item strong { width: 100%; overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 1100px) { .icon-library-panel { padding: 22px; }.icon-library-panel__workspace { grid-template-columns: minmax(0, 1fr) minmax(270px, 320px); }.standard-browser { grid-template-columns: 130px minmax(0, 1fr); } }
@media (max-width: 800px) { .icon-library-panel { padding: 18px; }.icon-library-panel__workspace { grid-template-columns: 1fr; }.standard-browser { grid-template-columns: 1fr; }.group-nav { grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: 260px; padding: 0 0 10px; border-right: 0; border-bottom: 1px solid #dce4ef; }.group-nav__heading { grid-column: 1 / -1; }.assignment-row { grid-template-columns: 1fr; }.resource-note { padding: 15px; }.resource-note span { font-size: 13px; } }
</style>
