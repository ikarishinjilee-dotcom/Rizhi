<template>
  <n-card class="r-card" :bordered="true" content-style="padding: 0;">
    <slot />
  </n-card>
</template>

<script setup lang="ts">
import { NCard } from "naive-ui";
</script>

<style scoped>
.r-card {
  border-color: var(--color-border);
  box-shadow: var(--shadow-card);
}
</style>
