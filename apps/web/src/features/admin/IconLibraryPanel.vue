<template>
  <section class="icon-library-panel">
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
        <h3><span class="section-title-icon"><Plus :size="18" /></span>{{ kind === 'standard' ? '新增普通图标' : '新增银行图标' }}</h3>

        <label>名称<input v-model="draft.label" :placeholder="kind === 'standard' ? '例如：餐饮、工资' : '例如：工商银行'" /></label>

        <label>稳定 Key
          <div class="key-field"><input v-model="draft.key" readonly /><button type="button" class="regenerate-button" title="重新生成 Key" @click="draft.key = createIconKey(kind)"><RefreshCw :size="15" /><span>重新生成</span></button></div>
        </label>

        <label v-if="kind === 'standard'">所属小类<select v-model="draft.groupId"><option value="" disabled>请选择小类</option><option v-for="group in groups" :key="group.id" :value="group.id">{{ group.label }}</option></select></label>

        <label>上传图标
          <button type="button" class="upload-dropzone" :class="{ 'upload-dropzone--filled': draft.assetUrl, 'upload-dropzone--dragging': isDragging }" @click="fileInput?.click()" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="onDrop">
            <img v-if="draft.assetUrl" :src="draft.assetUrl" :alt="draft.label || '待上传图标'" />
            <template v-else><UploadCloud :size="30" /><strong>点击或拖拽文件到此处上传</strong><span>支持 PNG / SVG，建议 256×256 及以上</span></template>
          </button>
          <input ref="fileInput" class="hidden-file" type="file" accept="image/png,image/svg+xml,image/webp" @change="onFileChange" />
        </label>

        <div class="icon-library-panel__actions">
          <button v-if="kind === 'standard'" data-testid="icon-library-add-group" type="button" class="button button--secondary" @click.stop.prevent="groupDialogVisible = true; newGroupLabel = ''"><Plus :size="17" />新增小类</button>
          <button type="button" class="button button--primary" :disabled="!canSave" @click="saveIcon"><Save :size="16" />保存图标</button>
        </div>
      </section>

      <section class="icon-library-panel__browser">
        <div class="icon-library-panel__tabs">
          <button type="button" :class="{ active: kind === 'standard' }" @click="kind = 'standard'">普通图标</button>
          <button type="button" :class="{ active: kind === 'bank' }" @click="kind = 'bank'">银行图标</button>
        </div>
        <label class="search-field"><Search :size="18" /><input v-model="searchQuery" type="search" :placeholder="kind === 'standard' ? '搜索普通图标' : '搜索银行图标'" /></label>

        <div v-if="kind === 'standard'" class="standard-browser">
          <nav class="group-nav" aria-label="普通图标分类">
            <div class="group-nav__heading"><span>图标分类</span><button v-if="groups.length > 1" type="button" class="group-sort-trigger" title="排序分类" @click="openSortDialog('groups')"><ArrowDownUp :size="13" />排序</button></div>
            <button v-for="group in groups" :key="group.id" type="button" :class="{ active: selectedGroupId === group.id }" @click="selectedGroupId = group.id; searchQuery = ''">{{ group.label }}</button>
            <p v-if="!groups.length" class="empty-hint">暂无小类</p>
          </nav>
          <div class="icon-grid-shell">
            <div class="browser-heading"><h3>{{ searchQuery.trim() ? '搜索结果' : selectedGroupLabel }}</h3><div class="browser-heading__tools"><span>{{ displayedIcons.length }} 个</span><button v-if="!searchQuery.trim() && displayedIcons.length > 1" type="button" class="sort-trigger" @click="openSortDialog('icons')"><ArrowDownUp :size="14" />排序</button></div></div>
            <div v-if="displayedIcons.length" class="icon-grid">
              <article v-for="icon in displayedIcons" :key="icon.key" class="icon-card">
                <div class="icon-card__preview"><IconGlyph :icon-key="icon.key" :size="34" /></div><strong>{{ icon.label }}</strong>
                <div class="icon-card__actions"><button type="button" title="编辑图标" @click.stop="openEditIcon(icon)"><Pencil :size="14" /></button><button type="button" title="删除图标" @click.stop="removeIcon(icon.key)"><Trash2 :size="14" /></button></div>
              </article>
            </div>
            <p v-else class="browser-empty">这个小类还没有图标。</p>
          </div>
        </div>

        <div v-else class="bank-browser">
          <div class="browser-heading"><h3>银行图标</h3><div class="browser-heading__tools"><span>{{ displayedIcons.length }} 个</span><button v-if="!searchQuery.trim() && displayedIcons.length > 1" type="button" class="sort-trigger" @click="openSortDialog('icons')"><ArrowDownUp :size="14" />排序</button></div></div>
          <div v-if="displayedIcons.length" class="icon-grid">
            <article v-for="icon in displayedIcons" :key="icon.key" class="icon-card">
              <div class="icon-card__preview"><IconGlyph :icon-key="icon.key" :size="34" /></div><strong>{{ icon.label }}</strong>
              <div class="icon-card__actions"><button type="button" title="编辑图标" @click.stop="openEditIcon(icon)"><Pencil :size="14" /></button><button type="button" title="删除图标" @click.stop="removeIcon(icon.key)"><Trash2 :size="14" /></button></div>
            </article>
          </div>
          <p v-else class="browser-empty">暂未上传银行图标。</p>
        </div>
      </section>
    </div>

    <Teleport to="body"><div v-if="groupDialogVisible" class="group-dialog-overlay" data-testid="icon-library-group-dialog" @click.self="groupDialogVisible = false">
      <section class="group-dialog" role="dialog" aria-modal="true" aria-labelledby="group-dialog-title">
        <header><div><span>ICON CATEGORY</span><h3 id="group-dialog-title">新增小类</h3></div><button type="button" aria-label="关闭" @click="groupDialogVisible = false"><X :size="18" /></button></header>
        <div class="group-dialog__body"><label>小类名称<input v-model="newGroupLabel" autofocus placeholder="例如：收入、餐饮、日常" @keyup.enter="saveGroup" /></label><p>新增后会显示在普通图标的分类导航中。</p></div>
        <footer><button type="button" class="button button--secondary" @click="groupDialogVisible = false">取消</button><button data-testid="icon-library-save-group" type="button" class="button button--primary" :disabled="!newGroupLabel.trim()" @click="saveGroup">保存小类</button></footer>
      </section>
    </div></Teleport>
    <Teleport to="body"><div v-if="sortDialogVisible" class="group-dialog-overlay" data-testid="icon-library-sort-dialog" @click.self="sortDialogVisible = false">
      <section class="group-dialog sort-dialog" role="dialog" aria-modal="true" aria-labelledby="sort-dialog-title">
        <header><div><span>{{ sortTarget === 'groups' ? 'CATEGORY ORDER' : 'ICON ORDER' }}</span><h3 id="sort-dialog-title">{{ sortTarget === 'groups' ? '排序图标分类' : '排序图标' }}</h3></div><button type="button" aria-label="关闭" @click="sortDialogVisible = false"><X :size="18" /></button></header>
        <div class="sort-dialog__body"><p>{{ sortTarget === 'groups' ? '拖拽分类调整顺序，保存后会应用到普通图标分类导航。' : '拖拽图标调整顺序，保存后会应用到当前分类。' }}</p><div class="sort-list"><div v-for="key in sortKeys" :key="key" class="sort-item" draggable="true" :class="{ dragging: draggingSortKey === key }" @dragstart="onSortDragStart(key)" @dragover.prevent @drop="onSortDrop(key)"><GripVertical :size="17" class="sort-item__handle" /><span v-if="sortTarget === 'icons'" class="sort-item__icon"><IconGlyph :icon-key="key" :size="28" /></span><span v-else class="sort-item__number">{{ sortKeys.indexOf(key) + 1 }}</span><strong>{{ sortTarget === 'groups' ? sortGroupByKey(key)?.label : sortIconByKey(key)?.label }}</strong></div></div></div>
        <footer><button type="button" class="button button--secondary" @click="sortDialogVisible = false">取消</button><button type="button" class="button button--primary" @click="saveSortOrder"><Save :size="16" />保存排序</button></footer>
      </section>
    </div></Teleport>
    <Teleport to="body"><div v-if="editingIcon" class="group-dialog-overlay" data-testid="icon-library-edit-dialog" @click.self="closeEditIcon">
      <section class="group-dialog edit-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title">
        <header><div><span>ICON ASSET</span><h3 id="edit-dialog-title">编辑图标</h3></div><button type="button" aria-label="关闭" @click="closeEditIcon"><X :size="18" /></button></header>
        <div class="group-dialog__body">
          <label>名称<input v-model="editDraft.label" placeholder="输入图标名称" /></label>
          <label v-if="editingIcon.kind === 'standard'">所属小类<select v-model="editDraft.groupId"><option v-for="group in groups" :key="group.id" :value="group.id">{{ group.label }}</option></select></label>
          <label>稳定 Key<div class="edit-key">{{ editingIcon.key }}</div></label>
          <label>图标文件<button type="button" class="edit-asset-picker" @click="editFileInput?.click()"><img v-if="editDraft.assetUrl" :src="editDraft.assetUrl" alt="当前图标" /><span v-else>选择图标文件</span></button><input ref="editFileInput" class="hidden-file" type="file" accept="image/png,image/svg+xml,image/webp" @change="onEditFileChange" /></label>
        </div>
        <footer><button type="button" class="button button--secondary" @click="closeEditIcon">取消</button><button type="button" class="button button--primary" :disabled="!editDraft.label.trim()" @click="saveEditedIcon"><Save :size="16" />保存修改</button></footer>
      </section>
    </div></Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { ArrowDownUp, GripVertical, Info, Pencil, Plus, RefreshCw, Save, Search, Trash2, UploadCloud, X } from "@lucide/vue";
import IconGlyph from "@/components/ui/IconGlyph.vue";
import { addIconGroup, createIconKey, getGroups, iconLibraryState, removeIcon as removeLibraryIcon, setGroupOrder, setIconOrder, upsertIcon, type IconDefinition, type IconLibraryKind } from "@/domain/iconLibrary";

const kind = ref<IconLibraryKind>("standard");
const draft = reactive({ label: "", key: "", groupId: "", assetUrl: "" });
const searchQuery = ref("");
const selectedGroupId = ref("");
const groupDialogVisible = ref(false);
const newGroupLabel = ref("");
const showResourceNote = ref(true);
const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const editFileInput = ref<HTMLInputElement | null>(null);
const editingIcon = ref<IconDefinition | null>(null);
const editDraft = reactive({ label: "", groupId: "", assetUrl: "" });
const sortDialogVisible = ref(false);
const sortKeys = ref<string[]>([]);
const draggingSortKey = ref("");
const sortTarget = ref<"icons" | "groups">("icons");
const groups = computed(() => getGroups("standard"));
const icons = computed(() => iconLibraryState.icons.filter((icon) => icon.kind === kind.value));
const selectedGroupLabel = computed(() => groups.value.find((group) => group.id === selectedGroupId.value)?.label || "未分类");
const displayedIcons = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase();
  return icons.value.filter((icon) => (kind.value === "bank" || query || icon.groupId === selectedGroupId.value) && (!query || icon.label.toLocaleLowerCase().includes(query) || icon.key.toLocaleLowerCase().includes(query)));
});
const canSave = computed(() => Boolean(draft.label.trim() && draft.key.trim() && draft.assetUrl && (kind.value === "bank" || draft.groupId)));

function resetDraft() { draft.label = ""; draft.key = createIconKey(kind.value); draft.groupId = kind.value === "standard" ? (selectedGroupId.value || groups.value[0]?.id || "") : "bank-default"; draft.assetUrl = ""; isDragging.value = false; }
function selectDefaultGroup() { if (!groups.value.some((group) => group.id === selectedGroupId.value)) selectedGroupId.value = groups.value[0]?.id || ""; }
function openGroupDialog() { newGroupLabel.value = ""; groupDialogVisible.value = true; }
function saveGroup() { const label = newGroupLabel.value.trim(); if (!label) return; addIconGroup(label, "standard"); selectedGroupId.value = groups.value[groups.value.length - 1]?.id || selectedGroupId.value; draft.groupId = selectedGroupId.value; groupDialogVisible.value = false; }
function readFile(file?: File) { if (!file || !file.type.match(/^image\/(png|svg\+xml|webp)$/)) return; const reader = new FileReader(); reader.onload = () => { draft.assetUrl = String(reader.result || ""); }; reader.readAsDataURL(file); }
function onFileChange(event: Event) { readFile((event.target as HTMLInputElement).files?.[0]); }
function onDrop(event: DragEvent) { isDragging.value = false; readFile(event.dataTransfer?.files?.[0]); }
function saveIcon() { if (!canSave.value) return; upsertIcon({ key: draft.key.trim(), label: draft.label.trim(), kind: kind.value, groupId: kind.value === "standard" ? draft.groupId : "bank-default", assetUrl: draft.assetUrl, platforms: {} }); resetDraft(); }
function removeIcon(key: string) { removeLibraryIcon(key); }
function openSortDialog(target: "icons" | "groups" = "icons") { sortTarget.value = target; sortKeys.value = target === "groups" ? groups.value.map((group) => group.id) : displayedIcons.value.map((icon) => icon.key); draggingSortKey.value = ""; sortDialogVisible.value = true; }
function sortIconByKey(key: string) { return icons.value.find((icon) => icon.key === key); }
function sortGroupByKey(key: string) { return groups.value.find((group) => group.id === key); }
function onSortDragStart(key: string) { draggingSortKey.value = key; }
function onSortDrop(targetKey: string) { if (!draggingSortKey.value || draggingSortKey.value === targetKey) return; const next = [...sortKeys.value]; const from = next.indexOf(draggingSortKey.value); const to = next.indexOf(targetKey); if (from < 0 || to < 0) return; next.splice(from, 1); next.splice(to, 0, draggingSortKey.value); sortKeys.value = next; draggingSortKey.value = ""; }
function saveSortOrder() { if (sortTarget.value === "groups") setGroupOrder("standard", sortKeys.value); else setIconOrder(kind.value, kind.value === "bank" ? "bank-default" : selectedGroupId.value, sortKeys.value); sortDialogVisible.value = false; }
function openEditIcon(icon: IconDefinition) { editingIcon.value = icon; editDraft.label = icon.label; editDraft.groupId = icon.kind === "standard" ? icon.groupId : "bank-default"; editDraft.assetUrl = icon.assetUrl || ""; }
function closeEditIcon() { editingIcon.value = null; }
function onEditFileChange(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (!file || !file.type.match(/^image\/(png|svg\+xml|webp)$/)) return; const reader = new FileReader(); reader.onload = () => { editDraft.assetUrl = String(reader.result || ""); }; reader.readAsDataURL(file); }
function saveEditedIcon() { if (!editingIcon.value || !editDraft.label.trim()) return; upsertIcon({ ...editingIcon.value, label: editDraft.label.trim(), groupId: editingIcon.value.kind === "standard" ? editDraft.groupId : "bank-default", assetUrl: editDraft.assetUrl }); closeEditIcon(); }

watch(kind, () => { searchQuery.value = ""; selectDefaultGroup(); resetDraft(); });
watch(groups, () => { selectDefaultGroup(); if (kind.value === "standard" && !draft.groupId) draft.groupId = selectedGroupId.value; });
selectDefaultGroup();
resetDraft();
</script>

<style scoped>
.icon-library-panel { display: grid; gap: 22px; padding: 28px 32px 34px; background: #fff; border: 1px solid var(--color-border); border-radius: 16px; box-shadow: 0 12px 30px rgba(15, 23, 42, .04); }
.panel-heading h2 { margin: 0 0 8px; color: #182338; font-size: 32px; letter-spacing: -.03em; }.panel-heading p { margin: 0; color: #536176; font-size: 15px; }
.resource-note { display: flex; align-items: flex-start; gap: 14px; padding: 20px 22px; color: #27344a; background: linear-gradient(100deg, #f1f6ff, #fbfdff); border: 1px solid #c8dcff; border-radius: 13px; }.resource-note__icon { display: grid; width: 30px; height: 30px; flex: 0 0 auto; place-items: center; color: #fff; background: var(--color-primary); border-radius: 50%; }.resource-note div:nth-child(2) { display: grid; gap: 6px; }.resource-note span { color: #536176; font-size: 14px; line-height: 1.5; }.resource-note > button { margin-left: auto; padding: 2px; color: #758297; background: transparent; border: 0; cursor: pointer; }
.icon-library-panel__workspace { display: grid; grid-template-columns: minmax(300px, 360px) minmax(0, 1fr); gap: 24px; }.icon-library-panel__upload, .icon-library-panel__browser { min-width: 0; padding: 22px 24px; border: 1px solid #e0e7f0; border-radius: 13px; }.icon-library-panel__upload { display: grid; align-content: start; gap: 18px; }.icon-library-panel__upload h3 { display: flex; align-items: center; gap: 12px; margin: 0 0 2px; color: #182338; font-size: 18px; }.section-title-icon { display: grid; width: 30px; height: 30px; place-items: center; color: #fff; background: var(--color-primary); border-radius: 7px; }
.icon-library-panel__upload label { display: grid; gap: 8px; color: #344258; font-size: 13px; font-weight: 700; }.icon-library-panel__upload input, .icon-library-panel__upload select { width: 100%; box-sizing: border-box; padding: 11px 12px; color: #26344a; background: #fff; border: 1px solid #d5deeb; border-radius: 9px; outline: none; }.icon-library-panel__upload input:focus, .icon-library-panel__upload select:focus, .search-field:focus-within { border-color: #79a8ff; box-shadow: 0 0 0 3px rgba(47, 94, 255, .1); }.key-field { display: flex; gap: 10px; }.key-field input { min-width: 0; flex: 1; color: #68758a; background: #f8fafc; }.regenerate-button { display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto; padding: 0 12px; color: var(--color-primary); background: #fff; border: 1px solid #c9d9f7; border-radius: 9px; cursor: pointer; font-weight: 700; }
.upload-dropzone { display: grid; min-height: 132px; place-items: center; align-content: center; gap: 8px; padding: 14px; color: var(--color-primary); background: #fbfdff; border: 1px dashed #9dbfff; border-radius: 10px; cursor: pointer; }.upload-dropzone strong { color: #37445a; font-size: 13px; }.upload-dropzone span { color: #8190a5; font-size: 12px; font-weight: 400; }.upload-dropzone img { width: 72px; height: 72px; object-fit: contain; }.upload-dropzone--dragging { background: #eef5ff; border-color: var(--color-primary); }.hidden-file { display: none !important; }
.icon-library-panel__actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 2px; }.button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; padding: 0 16px; border-radius: 9px; cursor: pointer; font-weight: 800; }.button--secondary { color: #2059d6; background: #fff; border: 1px solid #d6e0ef; }.button--primary { color: #fff; background: linear-gradient(135deg, #2f5eff, #2450e9); border: 1px solid #2f5eff; box-shadow: 0 6px 15px rgba(47, 94, 255, .2); }.button:disabled { opacity: .45; cursor: not-allowed; }
.icon-card__actions { position: absolute; top: -6px; right: -2px; display: none; gap: 4px; }.icon-card:hover .icon-card__actions { display: flex; }.icon-card__actions button { display: grid; place-items: center; padding: 5px; color: #2450e9; background: #fff; border: 1px solid #c9d9f7; border-radius: 6px; cursor: pointer; }.icon-card__actions button:last-child { color: #d9485f; border-color: #f2c9d0; }
.icon-card__actions button:disabled { cursor: not-allowed; opacity: .35; }
.icon-library-panel__tabs { display: flex; gap: 28px; border-bottom: 1px solid #dce4ef; }.icon-library-panel__tabs button { position: relative; padding: 0 22px 15px; color: #435168; background: transparent; border: 0; cursor: pointer; font-size: 15px; font-weight: 700; }.icon-library-panel__tabs button.active { color: var(--color-primary); }.icon-library-panel__tabs button.active::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 3px; background: var(--color-primary); border-radius: 3px 3px 0 0; content: ""; }.search-field { display: flex; align-items: center; gap: 10px; margin: 16px 0; padding: 0 14px; color: #7b899e; border: 1px solid #d5deeb; border-radius: 9px; }.search-field input { width: 100%; min-height: 40px; color: #26344a; border: 0; outline: 0; }
.standard-browser { display: grid; grid-template-columns: 160px minmax(0, 1fr); min-height: 450px; gap: 12px; }.group-nav { display: grid; align-content: start; gap: 2px; padding-right: 12px; border-right: 1px solid #dce4ef; }.group-nav button { padding: 9px 12px; color: #26344a; text-align: left; background: transparent; border: 0; border-radius: 7px; cursor: pointer; font-size: 14px; }.group-nav button:hover { background: #f3f6fb; }.group-nav button.active { color: var(--color-primary); background: #edf3ff; box-shadow: inset 3px 0 0 var(--color-primary); font-weight: 800; }.empty-hint, .browser-empty { color: #8190a5; font-size: 13px; }.browser-empty { padding: 40px 12px; text-align: center; }.icon-grid-shell { min-width: 0; padding: 14px 16px 18px; border: 1px solid #dfe6ef; border-radius: 10px; }.browser-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.browser-heading h3 { margin: 0; color: var(--color-primary); font-size: 18px; }.browser-heading span { color: #8190a5; font-size: 12px; }.icon-grid { display: grid; grid-template-columns: repeat(5, minmax(70px, 1fr)); gap: 18px 12px; margin-top: 20px; }.icon-card { position: relative; display: grid; justify-items: center; gap: 6px; min-width: 0; padding: 2px 4px 8px; text-align: center; }.icon-card__preview { display: grid; width: 58px; height: 58px; place-items: center; color: #687587; background: #f2f5f8; border-radius: 50%; }.icon-card strong { max-width: 100%; overflow: hidden; color: #354258; font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.icon-card small { max-width: 100%; overflow: hidden; color: #9aa6b6; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.icon-card__remove { position: absolute; top: -4px; right: 0; display: none; padding: 4px; color: #d9485f; background: #fff; border: 1px solid #f2c9d0; border-radius: 6px; cursor: pointer; }.icon-card:hover .icon-card__remove { display: grid; }.bank-browser { min-height: 450px; padding: 14px 16px; border: 1px solid #dfe6ef; border-radius: 10px; }
.group-dialog-overlay { position: fixed; inset: 0; z-index: 3000; display: grid; place-items: center; padding: 20px; background: rgba(15, 23, 42, .46); backdrop-filter: blur(5px); }.group-dialog { width: min(420px, 100%); overflow: hidden; background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(15, 23, 42, .2); }.group-dialog header { display: flex; align-items: start; justify-content: space-between; gap: 16px; padding: 22px 24px; color: #fff; background: linear-gradient(135deg, #1754c6, #3788ff); }.group-dialog header span { font-size: 11px; font-weight: 800; letter-spacing: .08em; opacity: .84; }.group-dialog h3 { margin: 6px 0 0; font-size: 21px; }.group-dialog header button { display: grid; place-items: center; padding: 6px; color: #fff; background: rgba(255,255,255,.16); border: 0; border-radius: 7px; cursor: pointer; }.group-dialog__body { display: grid; gap: 8px; padding: 22px 24px; }.group-dialog__body label { display: grid; gap: 7px; color: #344258; font-size: 13px; font-weight: 700; }.group-dialog__body input { width: 100%; box-sizing: border-box; padding: 11px 12px; border: 1px solid #d5deeb; border-radius: 8px; }.group-dialog__body p { margin: 0; color: #8190a5; font-size: 12px; }.group-dialog footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 24px; background: #f7f9fc; border-top: 1px solid #e5eaf1; }
.edit-key { padding: 11px 12px; color: #68758a; background: #f8fafc; border: 1px solid #d5deeb; border-radius: 8px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; word-break: break-all; }.edit-asset-picker { display: grid; min-height: 92px; place-items: center; color: var(--color-primary); background: #fbfdff; border: 1px dashed #9dbfff; border-radius: 9px; cursor: pointer; }.edit-asset-picker img { width: 70px; height: 70px; object-fit: contain; }.edit-asset-picker span { font-size: 13px; }
.browser-heading__tools { display: flex; align-items: center; gap: 10px; }.sort-trigger, .group-sort-trigger { display: inline-flex; align-items: center; gap: 5px; padding: 6px 9px; color: #2450e9; background: #fff; border: 1px solid #c9d9f7; border-radius: 7px; cursor: pointer; font-size: 12px; font-weight: 700; }.group-nav__heading { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 4px 4px 8px 12px; color: #8190a5; font-size: 12px; font-weight: 800; }.group-sort-trigger { padding: 4px 6px; font-size: 11px; }.sort-dialog__body { display: grid; gap: 10px; max-height: min(520px, calc(100dvh - 240px)); overflow: auto; padding: 20px 24px; }.sort-dialog__body > p { margin: 0; color: #8190a5; font-size: 12px; }.sort-list { display: grid; gap: 8px; }.sort-item { display: grid; grid-template-columns: 22px 42px minmax(0, 1fr); align-items: center; gap: 10px; min-height: 58px; padding: 8px 12px; background: #fff; border: 1px solid #dfe6ef; border-radius: 9px; cursor: grab; }.sort-item:active { cursor: grabbing; }.sort-item.dragging { opacity: .45; border-color: #7da9ff; background: #eef4ff; }.sort-item__handle { color: #9aa6b6; }.sort-item__icon, .sort-item__number { display: grid; width: 40px; height: 40px; place-items: center; background: #f2f5f8; border-radius: 9px; }.sort-item__number { color: #2450e9; background: #edf3ff; font-weight: 800; }.sort-item strong { color: #354258; font-size: 14px; }
@media (max-width: 1100px) { .icon-library-panel { padding: 22px; }.icon-library-panel__workspace { grid-template-columns: minmax(270px, 320px) minmax(0, 1fr); }.standard-browser { grid-template-columns: 130px minmax(0, 1fr); }.icon-grid { grid-template-columns: repeat(4, minmax(70px, 1fr)); } }
@media (max-width: 800px) { .icon-library-panel { padding: 18px; }.icon-library-panel__workspace { grid-template-columns: 1fr; }.standard-browser { grid-template-columns: 1fr; }.group-nav { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 0 0 10px; border-right: 0; border-bottom: 1px solid #dce4ef; }.icon-grid { grid-template-columns: repeat(4, minmax(60px, 1fr)); }.resource-note { padding: 15px; }.resource-note span { font-size: 13px; } }
</style>
