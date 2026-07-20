<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :bordered="false"
    :closable="false"
    class="dictionary-modal-card"
    content-style="padding: 0;"
    :style="{ width: 'min(720px, calc(100vw - 48px))', borderRadius: '18px', overflow: 'hidden' }"
  >
    <section class="children-modal">
      <header class="children-modal__head">
        <div>
          <span>SUBCATEGORIES</span>
          <h3>{{ title }}</h3>
        </div>
        <button type="button" aria-label="关闭" @click="visible = false">×</button>
      </header>
      <div class="children-modal__body"><slot /></div>
      <footer class="children-modal__footer"><slot name="footer"><RButton variant="secondary" @click="visible = false">关闭</RButton></slot></footer>
    </section>
  </NModal>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NModal } from "naive-ui";
import RButton from "@/components/ui/RButton.vue";

const props = defineProps<{ show: boolean; title: string }>();
const emit = defineEmits<{ "update:show": [show: boolean] }>();
const visible = computed({ get: () => props.show, set: (show) => emit("update:show", show) });
</script>

<style scoped>
.children-modal { display: grid; background: #fff; }
.children-modal__head { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; color: #fff; background: linear-gradient(135deg, #1459d5, #3387ff); }
.children-modal__head span { display: block; font-size: 11px; font-weight: 800; letter-spacing: .08em; }
.children-modal__head h3 { margin: 8px 0 0; font-size: 20px; }
.children-modal__head > button { display: grid; width: 32px; height: 32px; place-items: center; color: #fff; background: rgba(255, 255, 255, .16); border: 0; border-radius: 50%; cursor: pointer; font-size: 22px; }
.children-modal__body { min-height: 112px; }
.children-modal__footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; background: var(--color-bg-hover); border-top: 1px solid var(--color-border); }
</style>
