<template>
  <n-button
    :type="type"
    :size="size"
    :disabled="disabled"
    :loading="loading"
    :attr-type="nativeType"
    :ghost="variant === 'secondary'"
    :text="variant === 'text'"
    class="r-button"
  >
    <slot />
  </n-button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NButton } from "naive-ui";

const props = withDefaults(defineProps<{
  variant?: "primary" | "secondary" | "text" | "danger";
  size?: "tiny" | "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  nativeType?: "button" | "submit" | "reset";
}>(), {
  variant: "primary",
  size: "medium",
  nativeType: "button",
});

const type = computed(() => {
  if (props.variant === "danger") return "error";
  if (props.variant === "primary") return "primary";
  return "default";
});
</script>

<style scoped>
.r-button {
  font-weight: 600;
  letter-spacing: 0;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.r-button:not(:disabled):not(.n-button--loading):hover {
  transform: translateY(-1px);
}

.r-button:deep(.n-button__content) {
  gap: 6px;
}

.r-button.n-button--primary-type {
  background: var(--gradient-primary);
  border-color: transparent;
  box-shadow: 0 10px 22px rgba(38, 116, 255, 0.22);
}

.r-button.n-button--primary-type:not(:disabled):hover {
  box-shadow: 0 14px 28px rgba(38, 116, 255, 0.28);
}

.r-button.n-button--default-type {
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.86);
  border-color: var(--color-border);
}

.r-button.n-button--default-type:not(:disabled):hover {
  color: var(--color-primary);
  background: var(--color-primary-soft);
  border-color: rgba(38, 116, 255, 0.35);
}

.r-button.n-button--error-type {
  box-shadow: 0 10px 22px rgba(239, 68, 68, 0.18);
}
</style>
