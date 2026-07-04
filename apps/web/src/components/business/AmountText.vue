<template>
  <span class="amount-text" :class="toneClass">{{ formatted }}</span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{
  value: number;
  sign?: "auto" | "none";
}>(), {
  sign: "auto",
});

const formatted = computed(() => {
  const abs = Math.abs(props.value);
  const prefix = props.sign === "none" ? "" : props.value > 0 ? "+" : props.value < 0 ? "-" : "";
  return `${prefix}¥${abs.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
});

const toneClass = computed(() => ({
  "amount-text--positive": props.value > 0,
  "amount-text--negative": props.value < 0,
}));
</script>

<style scoped>
.amount-text {
  color: var(--color-text-primary);
  font-weight: 700;
}

.amount-text--positive {
  color: var(--color-success);
}

.amount-text--negative {
  color: var(--color-danger);
}
</style>
