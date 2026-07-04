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
  padding: 10px 12px;
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: var(--radius-lg);
  font-size: var(--font-caption);
  font-weight: 600;
  line-height: 1.55;
}

.inline-feedback svg {
  margin-top: 1px;
}

.inline-feedback--danger {
  color: #b42318;
  background: var(--color-danger-light);
  border-color: #fecaca;
}

.inline-feedback--success {
  color: #047857;
  background: var(--color-success-light);
  border-color: #bbf7d0;
}
</style>
