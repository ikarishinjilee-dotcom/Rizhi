<template>
  <div class="inline-feedback" :class="`inline-feedback--${tone}`" :role="tone === 'danger' ? 'alert' : 'status'">
    <component :is="feedbackIcon" :size="15" />
    <span><slot /></span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { CircleAlert, CircleCheck, Info } from "@lucide/vue";

const props = withDefaults(defineProps<{
  tone?: "danger" | "success" | "info";
}>(), {
  tone: "info",
});

const feedbackIcon = computed(() => {
  if (props.tone === "danger") return CircleAlert;
  if (props.tone === "success") return CircleCheck;
  return Info;
});
</script>

<style scoped>
.inline-feedback {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: var(--space-2);
  align-items: start;
  padding: 12px 14px;
  color: var(--color-primary);
  background: var(--color-primary-soft);
  border: 1px solid rgba(38, 116, 255, 0.16);
  border-radius: var(--radius-md);
  font-size: var(--font-caption);
  font-weight: 600;
  line-height: 1.55;
}

.inline-feedback svg {
  margin-top: 1px;
}

.inline-feedback--danger {
  color: var(--color-danger);
  background: var(--color-danger-light);
  border-color: rgba(239, 68, 68, 0.2);
}

.inline-feedback--success {
  color: var(--color-success);
  background: var(--color-success-light);
  border-color: rgba(22, 184, 120, 0.2);
}
</style>
