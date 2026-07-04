<template>
  <main class="login-page">
    <section class="login-panel">
      <div class="brand-mark">R</div>
      <div class="login-heading">
        <span>Rizhi Account</span>
        <h1>登录日值</h1>
        <p>资产、账单和资金数据将安全同步到你的账户。</p>
      </div>

      <form class="login-form" @submit.prevent="submit">
        <label>
          <span>用户名</span>
          <RInput v-model="username" placeholder="请输入用户名" />
        </label>
        <label>
          <span>密码</span>
          <RInput v-model="password" type="password" placeholder="请输入密码" />
        </label>
        <RInlineFeedback v-if="errorMessage" tone="danger">{{ errorMessage }}</RInlineFeedback>
        <RButton size="large" :loading="submitting" :disabled="!canSubmit" native-type="submit">
          登录
        </RButton>
      </form>

      <p class="login-footnote">还没有账户？<RouterLink to="/register">立即创建</RouterLink></p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import RButton from "@/components/ui/RButton.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import RInput from "@/components/ui/RInput.vue";
import { login } from "@/services/authService";
import { useAppDataStore } from "@/stores/appDataStore";

const route = useRoute();
const router = useRouter();
const store = useAppDataStore();
const username = ref("");
const password = ref("");
const submitting = ref(false);
const errorMessage = ref("");
const canSubmit = computed(() => username.value.trim().length >= 3 && password.value.length >= 6);

async function submit() {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;
  errorMessage.value = "";
  try {
    await login(username.value.trim(), password.value);
    store.clearSessionData();
    await store.init();
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/dashboard";
    await router.replace(redirect);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "登录失败";
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--space-8);
  background: var(--color-bg-page);
}

.login-panel {
  width: min(420px, 100%);
  padding: 40px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-popover);
}

.brand-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--color-primary);
  border-radius: var(--radius-md);
  font-size: 20px;
  font-weight: 800;
}

.login-heading {
  margin: var(--space-6) 0 var(--space-8);
}

.login-heading span {
  color: var(--color-primary);
  font-size: var(--font-caption);
  font-weight: 700;
}

.login-heading h1 {
  margin: var(--space-2) 0;
  font-size: 28px;
}

.login-heading p,
.login-footnote {
  margin: 0;
  color: var(--color-text-tertiary);
  line-height: 1.7;
}

.login-footnote a {
  color: var(--color-primary);
  text-decoration: none;
}

.login-form {
  display: grid;
  gap: var(--space-5);
}

.login-form label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-table);
  font-weight: 600;
}

.login-form :deep(.r-button) {
  width: 100%;
}

.login-footnote {
  margin-top: var(--space-6);
  text-align: center;
  font-size: var(--font-caption);
}
</style>
