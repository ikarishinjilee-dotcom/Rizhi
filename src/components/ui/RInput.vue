<template>
  <n-input v-model:value="proxyValue" class="r-input" :placeholder="placeholder">
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
}>(), {
  modelValue: "",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const proxyValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
});
</script>
