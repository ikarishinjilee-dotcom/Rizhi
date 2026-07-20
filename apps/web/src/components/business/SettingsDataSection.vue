<template>
  <div class="settings-section">
    <div class="section-heading"><h2>本地数据</h2><p>当前数据存储在浏览器 IndexedDB 中。建议定期导出备份，避免浏览器数据被清理后丢失。</p></div>
    <div class="data-grid">
      <div><span>资产</span><strong>{{ assets }}</strong></div><div><span>附加项</span><strong>{{ assetAddons }}</strong></div><div><span>账户</span><strong>{{ accounts }}</strong></div><div><span>交易</span><strong>{{ transactions }}</strong></div>
    </div>
    <div class="backup-zone"><div><h3>备份与恢复</h3><p>导出 JSON 备份文件，后续可覆盖恢复到本地 IndexedDB。导入会先校验文件格式。</p></div><div class="action-row"><RButton variant="secondary" :loading="exporting" @click="$emit('export-backup')">导出备份</RButton><RButton :loading="importing" @click="backupFileInput?.click()">导入恢复</RButton><input ref="backupFileInput" class="hidden-file" type="file" accept="application/json,.json" @change="$emit('import-backup', $event)" /></div></div>
    <RInlineFeedback v-if="backupMessage" :tone="backupMessageTone">{{ backupMessage }}</RInlineFeedback>
    <div class="danger-zone"><div><h3>开发期重置</h3><p>会清空当前浏览器里的本地数据，并重新写入最新的初始数据。这个按钮后续正式上线前需要移除或加权限保护。</p></div><RButton variant="danger" :loading="resetting" @click="$emit('reset-data')">重置本地数据</RButton></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import RButton from "@/components/ui/RButton.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";

defineProps<{
  assets: number; assetAddons: number; accounts: number; transactions: number;
  exporting: boolean; importing: boolean; resetting: boolean;
  backupMessage: string; backupMessageTone: "success" | "danger";
}>();
defineEmits<{ "export-backup": []; "import-backup": [event: Event]; "reset-data": [] }>();
const backupFileInput = ref<HTMLInputElement | null>(null);
</script>

<style scoped>
.settings-section { display: grid; gap: var(--space-5); padding: var(--space-5); }
.section-heading h2, .section-heading p { margin: 0; }
.section-heading h2 { font-size: 17px; }
.section-heading p { margin-top: 5px; color: var(--color-text-secondary); font-size: 13px; }
.data-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-4); }
.data-grid div { padding: var(--space-4); background: var(--color-bg-hover); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
.data-grid span { display: block; color: var(--color-text-secondary); font-size: var(--font-caption); }
.data-grid strong { display: block; margin-top: var(--space-2); color: var(--color-text-primary); font-size: 24px; }
.danger-zone { display: grid; grid-template-columns: 1fr auto; gap: var(--space-4); align-items: center; padding: var(--space-4); background: #fff7f7; border: 1px solid #ffd0d0; border-radius: var(--radius-lg); }
.backup-zone { display: grid; grid-template-columns: 1fr auto; gap: var(--space-4); align-items: center; padding: var(--space-4); background: linear-gradient(135deg, var(--color-primary-soft), #fff); border: 1px solid #bbd5ff; border-radius: var(--radius-lg); }
.backup-zone h3, .danger-zone h3 { margin: 0; }
.backup-zone p, .danger-zone p { margin: var(--space-1) 0 0; color: var(--color-text-secondary); }
.action-row { display: flex; gap: var(--space-3); align-items: center; }
.hidden-file { display: none; }
@media (max-width: 760px) { .data-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .backup-zone, .danger-zone { grid-template-columns: 1fr; } }
</style>
