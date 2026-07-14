<template>
  <span class="r-tag" :class="`r-tag--${tone}`">
    <slot />
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  tone?: "success" | "danger" | "warning" | "info" | "muted" | "purple";
}>(), {
  tone: "info",
});
</script>

<style scoped>
.r-tag {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  font-size: var(--font-caption);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.r-tag--success {
  color: var(--color-success);
  background: var(--color-success-light);
  border-color: rgba(22, 184, 120, 0.18);
}

.r-tag--danger {
  color: var(--color-danger);
  background: var(--color-danger-light);
  border-color: rgba(239, 68, 68, 0.18);
}

.r-tag--warning {
  color: var(--color-warning);
  background: var(--color-warning-light);
  border-color: rgba(245, 158, 11, 0.2);
}

.r-tag--info {
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-color: rgba(38, 116, 255, 0.18);
}

.r-tag--muted {
  color: var(--color-text-secondary);
  background: #f1f5f9;
  border-color: rgba(148, 163, 184, 0.2);
}

.r-tag--purple {
  color: var(--color-purple);
  background: var(--color-purple-light);
  border-color: rgba(124, 58, 237, 0.18);
}
</style>
