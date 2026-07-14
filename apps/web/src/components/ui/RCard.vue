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
  overflow: hidden;
  background: var(--color-bg-card);
  border-color: var(--color-border-soft);
  box-shadow: var(--shadow-card);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.r-card:hover {
  border-color: rgba(38, 116, 255, 0.16);
  box-shadow: var(--shadow-card-hover);
}
</style>
