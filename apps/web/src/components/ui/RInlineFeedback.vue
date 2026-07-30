<template>
  <Teleport to="body">
    <Transition name="feedback">
      <div v-if="visible" v-bind="attrs" class="inline-feedback" :class="`inline-feedback--${tone}`" :role="tone === 'danger' ? 'alert' : 'status'">
        <component :is="feedbackIcon" :size="15" />
        <span><slot /></span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUpdated, ref, useAttrs, useSlots } from "vue";
import { AlertTriangle, CircleAlert, CircleCheck, Info, LoaderCircle } from "@lucide/vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
  tone?: "danger" | "success" | "warning" | "loading" | "info";
}>(), {
  tone: "info",
});

const slots = useSlots();
const attrs = useAttrs();
const visible = ref(true);
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let lastMessage = "";

function readMessage() {
  return (slots.default?.() || []).map((node) => typeof node.children === "string" ? node.children : "").join("");
}

function scheduleHide() {
  visible.value = true;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { visible.value = false; }, 3000);
}

onMounted(() => {
  lastMessage = readMessage();
  scheduleHide();
});

onUpdated(() => {
  const nextMessage = readMessage();
  if (nextMessage !== lastMessage) {
    lastMessage = nextMessage;
    scheduleHide();
  }
});

onBeforeUnmount(() => { if (hideTimer) clearTimeout(hideTimer); });

const feedbackIcon = computed(() => {
  if (props.tone === "danger") return CircleAlert;
  if (props.tone === "success") return CircleCheck;
  if (props.tone === "warning") return AlertTriangle;
  if (props.tone === "loading") return LoaderCircle;
  return Info;
});
</script>

<style scoped>
.inline-feedback {
  position: fixed;
  z-index: 5000;
  top: 66px;
  left: 50%;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(560px, calc(100vw - 32px));
  padding: 9px 13px;
  color: #334155;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .2);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  transform: translateX(-50%);
}

.inline-feedback svg {
  margin-top: 1px;
}

.inline-feedback--danger {
  color: #ef4444;
}

.inline-feedback--success {
  color: #10b981;
}

.inline-feedback--warning {
  color: #f59e0b;
}

.inline-feedback--loading {
  color: #3b82f6;
}

.inline-feedback--loading svg {
  animation: feedback-spin .9s linear infinite;
}

.feedback-enter-active,
.feedback-leave-active {
  transition: opacity .22s ease, transform .22s ease;
}

.feedback-enter-from {
  opacity: 0;
  transform: translate(-50%, -14px);
}

.feedback-leave-to {
  opacity: 0;
  transform: translate(-50%, -6px);
}

@keyframes feedback-spin {
  to { transform: rotate(360deg); }
}
</style>
