<template>
  <n-modal
    :show="show"
    preset="card"
    :bordered="false"
    :closable="false"
    :mask-closable="false"
    class="dictionary-modal-card"
    content-style="padding: 0;"
    :style="{ width: 'min(640px, calc(100vw - 48px))', borderRadius: '18px', overflow: 'hidden' }"
    @update:show="$emit('update:show', $event)"
  >
    <form class="dictionary-form" @submit.prevent="$emit('save')">
      <header class="dictionary-form__head">
        <div>
          <span>{{ draft.parentId ? "SUBCATEGORY" : domain === "account" ? "ACCOUNT TYPE" : "CATEGORY" }}</span>
          <h3>{{ draft.id ? "编辑" : draft.parentId ? "新增子分类" : "新增" }}{{ draft.parentId ? "" : panelTitle }}</h3>
        </div>
        <button type="button" aria-label="关闭" @click="$emit('close')">×</button>
      </header>
      <RInlineFeedback v-if="message" :tone="messageTone" class="dictionary-form__feedback">{{ message }}</RInlineFeedback>
      <div class="dictionary-form__body">
        <label v-if="domain === 'asset' && draft.parentId"><span>所属一级分类 *</span><RSelect v-model="draft.parentId" :options="parentOptions" /></label>
        <label><span>名称 *</span><RInput v-model="draft.name" placeholder="请输入名称" /></label>
        <label v-if="domain === 'bank'"><span>备注</span><RInput v-model="draft.note" placeholder="例如：美国分行、国际账户" /></label>
        <label v-if="domain === 'account'"><span>账户方向 *</span><RSelect v-model="draft.accountDirection" :options="directionOptions" /></label>
        <label v-if="domain === 'account'"><span>账户分组 *</span><RSelect v-model="draft.accountGroup" :options="accountGroupOptions" /></label>
        <label v-if="domain === 'account'" class="enabled-row"><input v-model="draft.requiresBank" type="checkbox" /> 需要选择银行</label>
        <div v-if="domain === 'asset'" class="scope-field">
          <span>适用范围 *</span>
          <div class="scope-options">
            <label><input v-model="draft.scopes" type="checkbox" value="asset" /> 资产</label>
            <label><input v-model="draft.scopes" type="checkbox" value="expense" /> 支出</label>
            <label><input v-model="draft.scopes" type="checkbox" value="income" /> 收入</label>
          </div>
          <small>资产和支出可以共用分类；三餐、出行等只勾选支出；工资、转卖等只勾选收入。</small>
        </div>
        <label>
          <span>分类图标</span>
          <div class="icon-upload">
            <span class="icon-preview"><img v-if="draft.iconUrl" :src="draft.iconUrl" alt="" /><ImageIcon v-else :size="22" /></span>
            <RButton type="button" variant="secondary" :loading="uploading" @click="fileInput?.click()">上传图片</RButton>
            <button v-if="draft.iconUrl" type="button" class="remove-icon" @click="$emit('remove-icon')">移除</button>
            <input ref="fileInput" hidden type="file" accept="image/png,image/jpeg,image/webp" @change="$emit('select-icon', $event)" />
          </div>
        </label>
        <label class="enabled-row"><input v-model="draft.enabled" type="checkbox" /> 启用该项</label>
      </div>
      <div class="form-actions">
        <RButton native-type="button" variant="secondary" @click="$emit('close')">取消</RButton>
        <RButton v-if="draft.id && deleteBlocked && draft.enabled" native-type="button" variant="secondary" :loading="deactivating" @click="$emit('deactivate')">停用该项</RButton>
        <RButton native-type="submit" :loading="saving">保存</RButton>
        <RButton v-if="draft.id" native-type="button" variant="danger" @click="$emit('delete-request')">删除</RButton>
      </div>
    </form>
  </n-modal>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ImageIcon } from "@lucide/vue";
import { NModal } from "naive-ui";
import type { CategoryDomain, CategoryRecord, CategoryScope } from "@/domain/models";
import RButton from "@/components/ui/RButton.vue";
import RInput from "@/components/ui/RInput.vue";
import RSelect from "@/components/ui/RSelect.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";

defineProps<{
  show: boolean;
  domain: CategoryDomain;
  panelTitle: string;
  draft: {
    id: string;
    name: string;
    note: string;
    parentId: string;
    accountDirection: string;
    accountGroup: string;
    requiresBank: boolean;
    iconUrl: string;
    scopes: CategoryScope[];
    enabled: boolean;
  };
  parentOptions: Array<{ label: string; value: string }>;
  directionOptions: Array<{ label: string; value: string }>;
  accountGroupOptions: Array<{ label: string; value: string }>;
  uploading: boolean;
  message: string;
  messageTone: "success" | "danger";
  deleteBlocked: boolean;
  deactivating: boolean;
  saving: boolean;
}>();

defineEmits<{
  "update:show": [value: boolean];
  close: [];
  save: [];
  deactivate: [];
  "delete-request": [];
  "remove-icon": [];
  "select-icon": [event: Event];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
</script>

<style scoped>
.dictionary-form { display: grid; align-content: start; background: #fff; }
.dictionary-form label { display: grid; gap: 7px; font-size: 12px; font-weight: 700; }
.dictionary-form__head { display: flex; align-items: center; justify-content: space-between; padding: 22px 24px; color: #fff; background: radial-gradient(circle at 86% 16%, rgba(255, 255, 255, 0.22), transparent 24%), linear-gradient(135deg, #1257c7, #1677ff); }
.dictionary-form__head span { color: rgba(255, 255, 255, .76); font-size: 11px; font-weight: 800; letter-spacing: .08em; }
.dictionary-form__head h3 { margin: 6px 0 0; font-size: 22px; }
.dictionary-form__head button { display: grid; width: 32px; height: 32px; place-items: center; color: #fff; background: rgba(255, 255, 255, .16); border: 0; border-radius: 50%; cursor: pointer; font-size: 20px; }
.dictionary-form__feedback { margin: 16px 20px 0; }
.dictionary-form__body { display: grid; gap: 14px; max-height: calc(100dvh - 260px); overflow: auto; padding: 22px 24px; background: #fff; }
.scope-field { display: grid; gap: 8px; font-size: 12px; font-weight: 700; }
.scope-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.scope-options label { display: flex; align-items: center; justify-content: center; min-height: 36px; padding: 0 10px; background: #fff; border: 1px solid var(--color-border); border-radius: 9px; }
.scope-field small { color: var(--color-text-muted); font-weight: 500; line-height: 1.6; }
.icon-upload { display: flex; align-items: center; justify-content: flex-start; gap: 12px; }
.icon-preview { display: grid; width: 52px; height: 52px; place-items: center; overflow: hidden; color: #fff; background: #fff; border: 1px solid var(--color-border); border-radius: 12px; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .18); }
.icon-preview img { width: 100%; height: 100%; object-fit: cover; }
.remove-icon { color: var(--color-danger); background: none; border: 0; }
.enabled-row { display: flex !important; align-items: center; }
.form-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 16px 24px; background: var(--color-bg-hover); border-top: 1px solid var(--color-border); }
</style>
