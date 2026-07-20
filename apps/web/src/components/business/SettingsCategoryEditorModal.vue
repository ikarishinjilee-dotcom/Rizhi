<template>
  <NModal
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
    <form class="category-form" @submit.prevent="$emit('save')">
      <header class="category-form__head">
        <div>
          <span>CATEGORY</span>
          <h3>{{ categoryFormTitle }}</h3>
        </div>
        <button type="button" aria-label="关闭" @click="$emit('close')">×</button>
      </header>
      <div class="category-form__body">
        <p class="category-form__hint">通过适用范围决定此分类在资产、支出或收入中可用。</p>
        <label v-if="categoryLevel === 'child'">
          <span>所属一级分类</span>
          <RSelect v-model="categoryDraft.parentId" :options="parentCategoryOptions" placeholder="选择一级分类" />
        </label>
        <label>
          <span>分类名称</span>
          <RInput v-model="categoryDraft.name" :placeholder="categoryLevel === 'child' ? '例如 午餐 / 地铁 / 工资' : '例如 餐饮 / 数码设备 / 工资'" />
        </label>
        <div class="scope-field">
          <span>适用范围</span>
          <div class="scope-options">
            <label v-for="scope in categoryScopeOptions" :key="scope.value">
              <input v-model="categoryDraft.scopes" type="checkbox" :value="scope.value" /> {{ scope.label }}
            </label>
          </div>
        </div>
        <label>
          <span>分类图标</span>
          <div class="category-icon-upload">
            <span class="category-icon-preview">
              <img v-if="categoryDraft.iconUrl" :src="categoryDraft.iconUrl" alt="当前分类图标" />
              <span v-else>{{ categoryDraft.name.trim().slice(0, 1) || "分" }}</span>
            </span>
            <RButton native-type="button" variant="secondary" :loading="uploadingCategoryIcon" @click="categoryIconFileInput?.click()">上传图标</RButton>
            <button v-if="categoryDraft.iconUrl" type="button" class="text-danger-button" @click="$emit('remove-icon')">移除图标</button>
            <input ref="categoryIconFileInput" class="hidden-file" type="file" accept="image/png,image/jpeg,image/webp" @change="$emit('select-icon', $event)" />
          </div>
        </label>
        <label class="category-enabled-row">
          <input v-model="categoryDraft.enabled" type="checkbox" />
          <span>启用该项</span>
        </label>
        <RInlineFeedback v-if="categoryMessage" :tone="categoryMessageTone">{{ categoryMessage }}</RInlineFeedback>
      </div>
      <footer class="category-form__actions">
        <RButton native-type="button" variant="secondary" @click="$emit('close')">取消</RButton>
        <RButton native-type="submit" :loading="savingCategory">{{ editingCategoryId ? "保存" : "保存新增" }}</RButton>
        <RButton v-if="editingCategoryId" native-type="button" variant="danger" @click="$emit('delete')">删除</RButton>
      </footer>
    </form>
  </NModal>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { NModal } from "naive-ui";
import RButton from "@/components/ui/RButton.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import RInput from "@/components/ui/RInput.vue";
import RSelect from "@/components/ui/RSelect.vue";
import type { CategoryScope } from "@/domain/models";

defineProps<{
  show: boolean;
  categoryFormTitle: string;
  categoryLevel: "parent" | "child";
  categoryDraft: {
    parentId: string | number | null;
    name: string;
    scopes: CategoryScope[];
    iconUrl: string;
    enabled: boolean;
  };
  parentCategoryOptions: Array<{ label: string; value: string }>;
  categoryScopeOptions: Array<{ label: string; value: CategoryScope }>;
  uploadingCategoryIcon: boolean;
  categoryMessage: string;
  categoryMessageTone: "success" | "danger";
  savingCategory: boolean;
  editingCategoryId: string | null;
}>();

defineEmits<{
  "update:show": [value: boolean];
  close: [];
  save: [];
  delete: [];
  "remove-icon": [];
  "select-icon": [event: Event];
}>();

const categoryIconFileInput = ref<HTMLInputElement | null>(null);
</script>

<style scoped>
.category-form { display: grid; background: var(--color-bg-card); }
.category-form__head { display: flex; min-height: 112px; align-items: center; justify-content: space-between; padding: 22px 26px; color: #fff; background: linear-gradient(120deg, #1754c6, #3788ff); }
.category-form__head span { display: block; margin-bottom: 8px; font-size: 12px; font-weight: 900; letter-spacing: .12em; }
.category-form__head h3 { margin: 0; font-size: 24px; }
.category-form__head > button { display: grid; width: 34px; height: 34px; place-items: center; color: #fff; background: rgba(255,255,255,.16); border: 0; border-radius: 50%; cursor: pointer; font-size: 22px; }
.category-form__body { display: grid; gap: 16px; padding: 24px 26px; }
.category-form label, .scope-field { display: grid; gap: 8px; color: var(--color-text-secondary); font-size: 13px; font-weight: 800; }
.category-form__hint { margin: 0; color: var(--color-text-muted); font-size: 13px; line-height: 1.6; }
.category-form__actions { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 26px; background: var(--color-bg-hover); border-top: 1px solid var(--color-border); }
.scope-options { display: flex; flex-wrap: wrap; gap: 12px; }
.scope-options label { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
.category-icon-upload { display: flex; align-items: center; gap: 12px; }
.category-icon-preview { display: grid; width: 46px; height: 46px; place-items: center; overflow: hidden; color: var(--color-primary); background: #eef4ff; border: 1px solid var(--color-border); border-radius: 12px; font-size: 20px; font-weight: 900; }
.category-icon-preview img { width: 100%; height: 100%; object-fit: cover; }
.category-enabled-row { display: flex !important; align-items: center; gap: 8px !important; }
.text-danger-button { padding: 0; color: var(--color-danger); background: transparent; border: 0; cursor: pointer; font-weight: 700; }
</style>

<style>
.dictionary-modal-card.n-card { overflow: hidden; background: var(--color-bg-card); box-shadow: 0 24px 80px rgba(17, 24, 39, 0.24); }
.dictionary-modal-card .n-card__content { padding: 0 !important; }
</style>
