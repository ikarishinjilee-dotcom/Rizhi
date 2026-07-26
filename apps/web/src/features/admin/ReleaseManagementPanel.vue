<template>
  <section class="release-panel">
    <div class="panel-heading">
      <div><h2>版本管理</h2><p>统一维护 Web、小程序、Android 和 iOS 的正式线更新记录。</p></div>
      <RButton variant="secondary" :loading="loading" @click="load">刷新</RButton>
    </div>
    <RInlineFeedback v-if="message" :tone="messageTone">{{ message }}</RInlineFeedback>

    <form class="release-editor" @submit.prevent="save">
      <div class="release-editor__top">
        <label><span>平台</span><select v-model="form.platform"><option v-for="item in releasePlatforms" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
        <label><span>版本号</span><RInput v-model="form.version" placeholder="例如 1.0.1" /></label>
        <label><span>发布日期</span><input v-model="form.date" type="date" /></label>
        <label><span>发布状态</span><select v-model="form.status"><option value="draft">草稿</option><option value="published">已发布</option></select></label>
      </div>
      <div class="release-editor__options">
        <label><input v-model="form.forceUpdate" type="checkbox" /> 强制更新</label>
        <label class="release-editor__min"><span>最低支持版本</span><RInput v-model="form.minSupportedVersion" placeholder="可选" /></label>
      </div>
      <div class="release-groups">
        <label v-for="group in form.groups" :key="group.type"><span>{{ group.label }}（每行一条）</span><textarea v-model="groupText[group.type]" :placeholder="`${group.label}内容，例如：新增版本管理功能`" /></label>
      </div>
      <div class="release-actions"><RButton variant="secondary" native-type="button" @click="resetForm">清空</RButton><RButton native-type="submit" :loading="saving">{{ editingId ? "保存修改" : "保存版本" }}</RButton></div>
    </form>

    <div class="release-history">
      <div class="section-heading"><div><h3>历史版本</h3><p>已发布版本会展示在帮助页；历史记录不会被覆盖。</p></div></div>
      <div v-if="!notes.length" class="panel-state">暂无版本记录</div>
      <article v-for="note in notes" :key="note.id" class="release-row">
        <div><strong>v{{ note.version }}</strong><small>{{ platformLabel(note.platform) }} · {{ note.date }}</small></div>
        <span class="status" :class="`status--${note.status}`">{{ note.status === "published" ? "已发布" : "草稿" }}</span>
        <div class="release-row__actions"><RButton variant="secondary" @click="edit(note)">编辑</RButton><RButton variant="danger" @click="remove(note.id)">删除</RButton></div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import RButton from "@/components/ui/RButton.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import RInput from "@/components/ui/RInput.vue";
import { deleteReleaseNote, listReleaseNotes, releasePlatforms, saveReleaseNote, type ManagedReleaseNote, type ReleasePlatform, type ReleaseStatus } from "@/services/releaseService";
import type { ReleaseGroup, ReleaseGroupType } from "@/features/help/releaseNotes";

const blankGroups = (): ReleaseGroup[] => [
  { label: "新增", type: "new", items: [] },
  { label: "优化", type: "improved", items: [] },
  { label: "修复", type: "fixed", items: [] },
];
const form = reactive({ platform: "web" as ReleasePlatform, version: "", date: new Date().toISOString().slice(0, 10), status: "draft" as ReleaseStatus, forceUpdate: false, minSupportedVersion: "", groups: blankGroups() });
const groupText = reactive<Record<ReleaseGroupType, string>>({ new: "", improved: "", fixed: "" });
const notes = ref<ManagedReleaseNote[]>([]), loading = ref(false), saving = ref(false), editingId = ref("");
const message = ref(""), messageTone = ref<"success" | "danger">("success");
function platformLabel(platform: ReleasePlatform) { return releasePlatforms.find((item) => item.value === platform)?.label || platform; }
function resetForm() { Object.assign(form, { platform: "web", version: "", date: new Date().toISOString().slice(0, 10), status: "draft", forceUpdate: false, minSupportedVersion: "", groups: blankGroups() }); Object.assign(groupText, { new: "", improved: "", fixed: "" }); editingId.value = ""; }
function edit(note: ManagedReleaseNote) { editingId.value = note.id; Object.assign(form, { platform: note.platform, version: note.version, date: note.date, status: note.status, forceUpdate: note.forceUpdate, minSupportedVersion: note.minSupportedVersion, groups: note.groups.map((group) => ({ ...group, items: [...group.items] })) }); for (const group of form.groups) groupText[group.type] = group.items.join("\n"); window.scrollTo({ top: 0, behavior: "smooth" }); }
async function load() { loading.value = true; try { notes.value = await listReleaseNotes(undefined, false, true); } catch (error) { messageTone.value = "danger"; message.value = error instanceof Error ? error.message : "版本记录加载失败"; } finally { loading.value = false; } }
async function save() { if (!form.version.trim()) { messageTone.value = "danger"; message.value = "请输入版本号"; return; } saving.value = true; try { await saveReleaseNote({ id: editingId.value || undefined, platform: form.platform, version: form.version.trim(), date: form.date, status: form.status, forceUpdate: form.forceUpdate, minSupportedVersion: form.minSupportedVersion.trim(), groups: form.groups.map((group) => ({ ...group, items: groupText[group.type].split("\n").map((item) => item.trim()).filter(Boolean) })) }); messageTone.value = "success"; message.value = "版本记录已保存"; resetForm(); await load(); } catch (error) { messageTone.value = "danger"; message.value = error instanceof Error ? error.message : "版本记录保存失败"; } finally { saving.value = false; } }
async function remove(id: string) { if (!window.confirm("确定删除这条版本记录吗？")) return; try { await deleteReleaseNote(id); messageTone.value = "success"; message.value = "版本记录已删除"; await load(); } catch (error) { messageTone.value = "danger"; message.value = error instanceof Error ? error.message : "版本记录删除失败"; } }
onMounted(load);
</script>

<style scoped>
.release-panel { display: grid; gap: 18px; padding: 24px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 12px; box-shadow: 0 12px 30px rgba(15,23,42,.04); }
.panel-heading, .section-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.panel-heading h2, .section-heading h3 { margin: 0; }.panel-heading p, .section-heading p { margin: 6px 0 0; color: var(--color-text-muted); }
.release-editor, .release-groups, .release-history { display: grid; gap: 16px; }.release-editor { padding: 18px; background: var(--color-bg-subtle); border: 1px solid var(--color-border); border-radius: 12px; }
.release-editor__top, .release-groups { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }.release-groups { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.release-editor label { display: grid; gap: 7px; color: var(--color-text-secondary); font-size: 13px; font-weight: 700; }.release-editor select, .release-editor input[type="date"], .release-editor textarea { width: 100%; min-height: 38px; padding: 9px 11px; color: var(--color-text-primary); font: inherit; background: #fff; border: 1px solid var(--color-border); border-radius: 10px; }.release-editor textarea { min-height: 124px; resize: vertical; line-height: 1.6; }.release-editor__options { display: flex; align-items: center; gap: 22px; }.release-editor__options > label:first-child { display: flex; align-items: center; }.release-editor__min { display: flex !important; align-items: center; gap: 10px !important; }.release-editor__min :deep(.r-input) { width: 150px; }.release-actions, .release-row__actions { display: flex; justify-content: flex-end; gap: 8px; }.release-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 14px; align-items: center; padding: 14px 0; border-top: 1px solid var(--color-border); }.release-row strong, .release-row small { display: block; }.release-row small { margin-top: 4px; color: var(--color-text-muted); }.status { padding: 5px 9px; border-radius: 999px; font-size: 12px; font-weight: 700; }.status--published { color: var(--color-success); background: var(--color-success-light); }.status--draft { color: var(--color-warning); background: var(--color-warning-light); }.panel-state { padding: 24px; color: var(--color-text-muted); text-align: center; }
@media(max-width:900px) { .release-editor__top, .release-groups { grid-template-columns: 1fr; }.release-row { grid-template-columns: 1fr auto; }.release-row__actions { grid-column: 1 / -1; justify-content: flex-start; } }
</style>
