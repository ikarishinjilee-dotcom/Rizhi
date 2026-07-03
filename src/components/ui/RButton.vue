<template>
  <n-button
    :type="type"
    :size="size"
    :disabled="disabled"
    :loading="loading"
    :native-type="nativeType"
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
}
</style>
