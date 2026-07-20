<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :bordered="false"
    :closable="false"
    :mask-closable="maskClosable"
    class="rizhi-fund-modal-card"
    content-style="padding: 0;"
    :style="{ width, maxHeight, borderRadius: '20px', overflow: 'hidden' }"
  >
    <slot />
  </NModal>
</template>

<script setup lang="ts">
import { NModal } from "naive-ui";

withDefaults(defineProps<{ width: string; maxHeight?: string; maskClosable?: boolean }>(), { maxHeight: undefined, maskClosable: false });
const visible = defineModel<boolean>({ required: true });
</script>
