<template>
  <n-drawer :show="show" :width="width" placement="right" @update:show="$emit('update:show', $event)">
    <n-drawer-content :title="title" closable>
      <slot />
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { NDrawer, NDrawerContent } from "naive-ui";

withDefaults(defineProps<{
  show: boolean;
  title?: string;
  width?: number;
}>(), {
  width: 560,
});

defineEmits<{
  "update:show": [value: boolean];
}>();
</script>
