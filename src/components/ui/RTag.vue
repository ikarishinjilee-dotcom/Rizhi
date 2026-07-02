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
  height: 22px;
  padding: 0 var(--space-2);
  border-radius: 999px;
  font-size: var(--font-caption);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.r-tag--success {
  color: var(--color-success);
  background: var(--color-success-light);
}

.r-tag--danger {
  color: var(--color-danger);
  background: var(--color-danger-light);
}

.r-tag--warning {
  color: var(--color-warning);
  background: var(--color-warning-light);
}

.r-tag--info {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.r-tag--muted {
  color: #667085;
  background: var(--color-bg-page);
}

.r-tag--purple {
  color: var(--color-purple);
  background: var(--color-purple-light);
}
</style>
