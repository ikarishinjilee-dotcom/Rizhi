<template>
  <n-input v-model:value="proxyValue" class="r-input" :type="type" :placeholder="placeholder">
    <template v-if="$slots.prefix" #prefix>
      <slot name="prefix" />
    </template>
  </n-input>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NInput } from "naive-ui";

const props = withDefaults(defineProps<{
  modelValue?: string;
  placeholder?: string;
  type?: "text" | "password";
}>(), {
  modelValue: "",
  type: "text",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const proxyValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
});
</script>

<style scoped>
.r-input {
  width: 100%;
}

.r-input:deep(.n-input) {
  background: rgba(255, 255, 255, 0.92);
}

.r-input:deep(.n-input__input-el),
.r-input:deep(.n-input__textarea-el) {
  color: var(--color-text-primary);
}

.r-input:deep(.n-input__placeholder) {
  color: var(--color-text-tertiary);
}
</style>
