<template>
  <n-date-picker
    v-model:value="proxyValue"
    class="r-date-picker"
    :type="type"
    :placeholder="placeholder"
    to="body"
    input-readonly
    close-on-select
    clearable
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NDatePicker } from "naive-ui";

type DateValue = number | [number, number] | null;

const props = withDefaults(defineProps<{
  modelValue?: DateValue;
  type?: "date" | "datetime" | "daterange" | "datetimerange";
  placeholder?: string;
}>(), {
  modelValue: null,
  type: "date",
});

const emit = defineEmits<{
  "update:modelValue": [value: DateValue];
}>();

const proxyValue = computed({
  get: () => props.modelValue,
  set: (value: DateValue) => emit("update:modelValue", value),
});
</script>

<style scoped>
.r-date-picker {
  width: 100%;
}

.r-date-picker:deep(.n-input) {
  background: rgba(255, 255, 255, 0.92);
}
</style>
