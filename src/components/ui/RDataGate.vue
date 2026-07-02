<template>
  <div v-if="loading && !ready" class="data-gate" role="status" aria-live="polite">
    <LoaderCircle :size="24" />
    <strong>{{ loadingTitle }}</strong>
    <span>{{ loadingDescription }}</span>
  </div>
  <div v-else-if="error" class="data-gate data-gate--error" role="alert">
    <TriangleAlert :size="24" />
    <strong>{{ errorTitle }}</strong>
    <span>{{ error }}</span>
    <RButton variant="secondary" @click="emit('retry')">重新加载</RButton>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { LoaderCircle, TriangleAlert } from "@lucide/vue";
import RButton from "@/components/ui/RButton.vue";

withDefaults(defineProps<{
  loading: boolean;
  ready: boolean;
  error?: string | null;
  loadingTitle?: string;
  loadingDescription?: string;
  errorTitle?: string;
}>(), {
  error: null,
  loadingTitle: "正在加载数据",
  loadingDescription: "正在读取当前浏览器中的本地数据。",
  errorTitle: "数据加载失败",
});

const emit = defineEmits<{
  retry: [];
}>();
</script>

<style scoped>
.data-gate {
  display: grid;
  min-height: 360px;
  place-items: center;
  align-content: center;
  gap: var(--space-3);
  padding: var(--space-8);
  color: var(--color-text-tertiary);
  text-align: center;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.data-gate svg {
  color: var(--color-primary);
  animation: data-gate-spin 900ms linear infinite;
}

.data-gate strong {
  color: var(--color-text-primary);
  font-size: var(--font-card-title);
}

.data-gate span {
  max-width: 440px;
  font-size: var(--font-caption);
  line-height: 1.7;
}

.data-gate--error svg {
  color: var(--color-danger);
  animation: none;
}

@keyframes data-gate-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .data-gate svg {
    animation: none;
  }
}
</style>
