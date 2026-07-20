<template>
  <NModal
    :show="show"
    preset="card"
    :bordered="false"
    :closable="false"
    :mask-closable="false"
    class="personal-batch-modal"
    content-style="padding: 0;"
    :style="{ width: 'min(860px, calc(100vw - 48px))', borderRadius: '18px', overflow: 'hidden' }"
    @update:show="$emit('update:show', $event)"
  >
    <section class="personal-batch">
      <header class="personal-batch__head">
        <div><span>BATCH</span><h3>批量管理分类</h3></div>
        <button type="button" aria-label="关闭" @click="$emit('update:show', false)">×</button>
      </header>
      <div class="personal-batch__body">
        <section class="personal-batch__picker">
          <div class="personal-batch__picker-head">
            <div>
              <strong>选择分类</strong>
              <small>当前筛选结果内共 {{ items.length }} 项，已选 {{ selectedIds.length }} 项。</small>
            </div>
            <div class="personal-batch__picker-actions">
              <button type="button" @click="$emit('select-all')">全选</button>
              <button type="button" @click="$emit('update:selectedIds', [])">清空</button>
            </div>
          </div>
          <div class="personal-batch__list">
            <label
              v-for="category in items"
              :key="category.id"
              class="personal-batch__item"
              :class="{ checked: selectedIds.includes(category.id), child: Boolean(category.parentId) }"
            >
              <input :checked="selectedIds.includes(category.id)" type="checkbox" :value="category.id" @change="toggleCategory(category.id)" />
              <span class="item-icon small" :style="{ backgroundColor: '#eef4ff' }">
                <img v-if="category.iconUrl" :src="category.iconUrl" alt="" />
                <b v-else>{{ category.icon || category.name.slice(0, 1) }}</b>
              </span>
              <span>
                <strong>{{ category.name }}</strong>
                <small>{{ category.parentId ? "子分类" : "一级分类" }} · {{ scopesOf(category).map(scopeLabel).join(" / ") }} · {{ category.enabled === false ? "已停用" : "启用中" }}</small>
              </span>
            </label>
            <div v-if="!items.length" class="empty-category">暂无可批量管理的分类。</div>
          </div>
        </section>
        <section class="personal-batch__operation">
          <strong>批量动作</strong>
          <label><span>操作类型</span><RSelect :model-value="operation" :options="operationOptions" @update:model-value="updateOperation" /></label>
          <div v-if="operation === 'scopes'" class="scope-field">
            <span>适用范围</span>
            <div class="scope-options">
              <label v-for="scope in batchScopes" :key="scope.value">
                <input :checked="selectedScopes.includes(scope.value)" type="checkbox" :value="scope.value" @change="toggleScope(scope.value)" /> {{ scope.label }}
              </label>
            </div>
            <small>会覆盖所选分类的适用范围。</small>
          </div>
          <div v-if="operation === 'delete'" class="personal-batch__danger">
            <strong>删除前确认</strong>
            <p>有业务记录的分类可能无法直接删除，需要先迁移相关数据。</p>
          </div>
          <div class="personal-batch__preview"><span>执行预览</span><p>{{ previewText }}</p></div>
        </section>
      </div>
      <footer class="personal-batch__footer">
        <RButton variant="secondary" @click="$emit('update:show', false)">取消</RButton>
        <RButton :loading="saving" @click="$emit('apply')">应用批量操作</RButton>
      </footer>
    </section>
  </NModal>
</template>

<script setup lang="ts">
import { NModal } from "naive-ui";
import RButton from "@/components/ui/RButton.vue";
import RSelect from "@/components/ui/RSelect.vue";
import type { CategoryRecord, CategoryScope } from "@/domain/models";

const props = defineProps<{
  show: boolean;
  items: CategoryRecord[];
  selectedIds: string[];
  operation: "enable" | "disable" | "scopes" | "delete";
  operationOptions: Array<{ label: string; value: string }>;
  selectedScopes: CategoryScope[];
  batchScopes: Array<{ label: string; value: CategoryScope }>;
  previewText: string;
  saving: boolean;
  scopesOf: (category: CategoryRecord) => CategoryScope[];
  scopeLabel: (scope: CategoryScope) => string;
}>();

const emit = defineEmits<{
  "update:show": [value: boolean];
  "update:selectedIds": [value: string[]];
  "update:operation": [value: "enable" | "disable" | "scopes" | "delete"];
  "update:selectedScopes": [value: CategoryScope[]];
  "select-all": [];
  apply: [];
}>();

function updateOperation(value: string | number | null) {
  emit("update:operation", String(value) as "enable" | "disable" | "scopes" | "delete");
}

function toggleCategory(id: string) {
  const next = props.selectedIds.includes(id)
    ? props.selectedIds.filter((item) => item !== id)
    : [...props.selectedIds, id];
  emit("update:selectedIds", next);
}

function toggleScope(scope: CategoryScope) {
  const next = props.selectedScopes.includes(scope)
    ? props.selectedScopes.filter((item) => item !== scope)
    : [...props.selectedScopes, scope];
  emit("update:selectedScopes", next);
}
</script>

<style scoped>
.personal-batch { display: grid; background: #fff; }
.personal-batch__head { display: flex; min-height: 112px; align-items: center; justify-content: space-between; padding: 22px 26px; color: #fff; background: linear-gradient(120deg, #1754c6, #3788ff); }
.personal-batch__head span { display: block; margin-bottom: 8px; font-size: 12px; font-weight: 900; letter-spacing: .12em; }
.personal-batch__head h3 { margin: 0; font-size: 24px; }
.personal-batch__head button { display: grid; width: 34px; height: 34px; place-items: center; color: #fff; background: rgba(255,255,255,.16); border: 0; border-radius: 50%; cursor: pointer; font-size: 22px; }
.personal-batch__body { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(280px, .75fr); gap: 18px; max-height: calc(100dvh - 260px); overflow: auto; padding: 22px 24px; }
.personal-batch__picker, .personal-batch__operation { display: grid; align-content: start; gap: 14px; padding: 16px; background: #f8fafc; border: 1px solid var(--color-border); border-radius: 16px; }
.personal-batch__picker-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.personal-batch__picker-head strong, .personal-batch__operation > strong { display: block; color: var(--color-text-primary); font-size: 16px; }
.personal-batch__picker-head small { display: block; margin-top: 4px; color: var(--color-text-muted); font-size: 12px; }
.personal-batch__picker-actions { display: flex; gap: 8px; }
.personal-batch__picker-actions button { padding: 6px 10px; color: var(--color-primary); background: #fff; border: 1px solid var(--color-border); border-radius: 8px; cursor: pointer; font-weight: 800; }
.personal-batch__list { display: grid; gap: 10px; max-height: 460px; overflow: auto; padding-right: 4px; }
.personal-batch__item { display: grid; grid-template-columns: auto auto minmax(0, 1fr); align-items: center; gap: 12px; padding: 12px; background: #fff; border: 1px solid var(--color-border); border-radius: 13px; cursor: pointer; }
.personal-batch__item.child { margin-left: 24px; }
.personal-batch__item.checked { border-color: #1677ff; box-shadow: 0 0 0 3px rgba(22,119,255,.1); }
.personal-batch__item .item-icon { display: grid; width: 34px; height: 34px; overflow: hidden; place-items: center; color: #fff; border-radius: 9px; }
.personal-batch__item .item-icon img { width: 100%; height: 100%; object-fit: cover; }
.personal-batch__item strong, .personal-batch__item small { display: block; }
.personal-batch__item small { margin-top: 4px; color: var(--color-text-muted); font-size: 12px; }
.personal-batch__operation > label { display: grid; gap: 8px; font-size: 12px; font-weight: 800; }
.personal-batch__preview, .personal-batch__danger { padding: 14px; background: #fff; border: 1px solid var(--color-border); border-radius: 12px; }
.personal-batch__danger { color: #b42318; background: #fff1f0; border-color: #ffd5d2; }
.personal-batch__danger strong { color: #b42318; font-size: 13px; }
.personal-batch__danger p, .personal-batch__preview p { margin: 8px 0 0; line-height: 1.6; }
.personal-batch__preview span { color: var(--color-text-muted); font-size: 12px; font-weight: 800; }
.personal-batch__footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; background: #f8fafc; border-top: 1px solid var(--color-border); }
.scope-field { display: grid; gap: 8px; }
.scope-options { display: flex; flex-wrap: wrap; gap: 12px; }
.scope-options label { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
.empty-category { padding: 24px; color: var(--color-text-muted); text-align: center; }
</style>

<style>
.personal-batch-modal.n-card { overflow: hidden; background: var(--color-bg-card); box-shadow: 0 24px 80px rgba(17, 24, 39, 0.24); }
.personal-batch-modal .n-card__content { padding: 0 !important; }
</style>
