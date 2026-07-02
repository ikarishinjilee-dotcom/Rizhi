<template>
  <n-select v-model:value="proxyValue" class="r-select" :options="options" :placeholder="placeholder" :to="false" clearable />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NSelect, type SelectOption } from "naive-ui";

type SelectValue = string | number | null;

const props = withDefaults(defineProps<{
  modelValue?: SelectValue;
  options: SelectOption[];
  placeholder?: string;
}>(), {
  modelValue: null,
});

const emit = defineEmits<{
  "update:modelValue": [value: SelectValue];
}>();

const proxyValue = computed({
  get: () => props.modelValue,
  set: (value: SelectValue) => emit("update:modelValue", value),
});
</script>
