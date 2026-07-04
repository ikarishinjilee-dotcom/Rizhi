<template>
  <n-modal
    :show="show"
    preset="card"
    :bordered="false"
    :closable="false"
    :mask-closable="!loading"
    :z-index="4200"
    class="rizhi-delete-modal-card"
    content-style="padding: 0;"
    :style="{ width: 'min(520px, calc(100vw - 40px))', borderRadius: '18px', overflow: 'hidden' }"
    @update:show="$emit('update:show', $event)"
  >
    <section class="delete-modal" data-testid="confirm-modal">
      <div class="delete-modal__icon">!</div>
      <div class="delete-modal__content">
        <p class="delete-modal__eyebrow">{{ eyebrow }}</p>
        <h2>{{ title }}</h2>
        <p class="delete-modal__description">{{ description }}</p>
      </div>

      <div v-if="$slots.default" class="delete-modal__detail">
        <slot />
      </div>

      <footer class="delete-modal__footer">
        <RButton data-testid="confirm-modal-cancel" variant="secondary" :disabled="loading" @click="$emit('update:show', false)">{{ cancelText }}</RButton>
        <RButton v-if="showConfirm" data-testid="confirm-modal-confirm" variant="danger" :loading="loading" @click="$emit('confirm')">{{ confirmText }}</RButton>
      </footer>
    </section>
  </n-modal>
</template>

<script setup lang="ts">
import { NModal } from "naive-ui";
import RButton from "@/components/ui/RButton.vue";

withDefaults(defineProps<{
  show: boolean;
  title: string;
  description: string;
  eyebrow?: string;
  confirmText?: string;
  cancelText?: string;
  showConfirm?: boolean;
  loading?: boolean;
}>(), {
  eyebrow: "危险操作",
  confirmText: "确认删除",
  cancelText: "取消",
  showConfirm: true,
  loading: false,
});

defineEmits<{
  "update:show": [value: boolean];
  confirm: [];
}>();
</script>

<style scoped>
.delete-modal {
  display: grid;
  justify-items: center;
  padding: 32px;
  text-align: center;
  background:
    radial-gradient(circle at 50% 0%, rgba(240, 68, 56, 0.14), transparent 36%),
    var(--color-bg-card);
}

.delete-modal__icon {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  color: var(--color-danger);
  background: #fff1f1;
  border: 1px solid #ffd0d0;
  border-radius: 18px;
  font-size: 30px;
  font-weight: 900;
}

.delete-modal__content {
  margin-top: var(--space-4);
}

.delete-modal__eyebrow {
  margin: 0 0 var(--space-1);
  color: var(--color-danger);
  font-size: var(--font-caption);
  font-weight: 800;
}

.delete-modal h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 22px;
}

.delete-modal__description {
  max-width: 390px;
  margin: var(--space-3) auto 0;
  color: var(--color-text-secondary);
  font-size: var(--font-body);
  line-height: 1.7;
}

.delete-modal__detail {
  width: 100%;
  margin-top: var(--space-5);
  padding: var(--space-4);
  color: var(--color-text-secondary);
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-align: left;
}

.delete-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  width: 100%;
  margin-top: var(--space-6);
}
</style>

<style>
.rizhi-delete-modal-card.n-card {
  overflow: hidden;
  background: var(--color-bg-card);
  box-shadow: 0 24px 80px rgba(17, 24, 39, 0.24);
}

.rizhi-delete-modal-card .n-card__content {
  padding: 0 !important;
}
</style>
