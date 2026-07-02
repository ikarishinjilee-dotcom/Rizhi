<template>
  <button class="stat-card-button" type="button" :aria-label="`${label}，点击查看详情`" @click="emit('click')">
    <RCard>
      <div class="stat-card">
        <div class="stat-card__head">
          <div class="stat-card__label">{{ label }}</div>
          <ChevronRight :size="15" />
        </div>
      <AmountText class="stat-card__value" :value="value" :sign="sign" />
      <div v-if="change" class="stat-card__change" :class="changeTone">{{ change }}</div>
      </div>
    </RCard>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ChevronRight } from "@lucide/vue";
import RCard from "@/components/ui/RCard.vue";
import AmountText from "@/components/business/AmountText.vue";

const props = withDefaults(defineProps<{
  label: string;
  value: number;
  change?: string;
  sign?: "auto" | "none";
}>(), {
  sign: "none",
});

const emit = defineEmits<{
  click: [];
}>();

const changeTone = computed(() => props.change?.includes("-") ? "is-negative" : "is-positive");
</script>

<style scoped>
.stat-card-button {
  width: 100%;
  padding: 0;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
}

.stat-card-button :deep(.n-card) {
  height: 100%;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.stat-card-button:hover :deep(.n-card),
.stat-card-button:focus-visible :deep(.n-card) {
  border-color: #9ec5ff;
  box-shadow: 0 10px 24px rgba(22, 119, 255, 0.1);
  transform: translateY(-2px);
}

.stat-card-button:focus-visible {
  outline: none;
}

.stat-card {
  min-height: 88px;
  padding: var(--space-4);
}

.stat-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-card__head svg {
  color: var(--color-text-tertiary);
  transition: color 160ms ease, transform 160ms ease;
}

.stat-card-button:hover .stat-card__head svg {
  color: var(--color-primary);
  transform: translateX(2px);
}

.stat-card__label {
  color: var(--color-text-secondary);
  font-size: var(--font-table);
  font-weight: 600;
}

.stat-card__value {
  display: block;
  margin-top: var(--space-2);
  font-size: 20px;
  line-height: 28px;
}

.stat-card__change {
  margin-top: var(--space-1);
  font-size: var(--font-caption);
  font-weight: 600;
}

.is-positive {
  color: var(--color-success);
}

.is-negative {
  color: var(--color-danger);
}
</style>
