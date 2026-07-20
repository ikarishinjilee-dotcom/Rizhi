<template>
  <main class="auth-page">
    <section class="auth-panel">
      <img class="brand-mark" :src="branding.mainLogoUrl" alt="Rizhi" />
      <div class="auth-heading">
        <span>Rizhi Account</span>
        <h1>创建日值账户</h1>
        <p>一个账户用于同步你的资产、账单和资金数据。</p>
      </div>

      <form class="auth-form" @submit.prevent="submit">
        <label>
          <span>用户名</span>
          <RInput v-model="form.username" placeholder="3-32 位用户名" />
          <small v-if="usernameError" class="field-error">{{ usernameError }}</small>
        </label>
        <label>
          <span>昵称 <small>选填</small></span>
          <RInput v-model="form.nickname" placeholder="页面中显示的名称" />
        </label>
        <div class="field-grid">
          <label>
            <span>密码</span>
            <RInput v-model="form.password" type="password" placeholder="8-16 位密码" />
          </label>
          <label>
            <span>确认密码</span>
            <RInput v-model="form.confirmPassword" type="password" placeholder="再次输入密码" />
          </label>
        </div>
        <label>
          <span>图形验证码</span>
          <div class="captcha-row">
            <RInput v-model="form.captcha" placeholder="输入图中字符" />
            <button class="captcha-image" type="button" :disabled="captchaLoading" @click="refreshCaptcha">
              <img v-if="captchaImage" :src="captchaImage" alt="图形验证码" />
              <span v-else>{{ captchaLoading ? "加载中" : "重新加载" }}</span>
            </button>
          </div>
        </label>

        <RInlineFeedback v-if="errorMessage" tone="danger">{{ errorMessage }}</RInlineFeedback>
        <RButton size="large" :loading="submitting" :disabled="!canSubmit" native-type="submit">
          创建账户
        </RButton>
      </form>

      <p class="auth-footnote">已有账户？<RouterLink to="/login">返回登录</RouterLink></p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import RButton from "@/components/ui/RButton.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import RInput from "@/components/ui/RInput.vue";
import { loadRegisterCaptcha, registerAccount } from "@/services/authService";
import { settingsService } from "@/services/settingsService";
import { getCachedSiteBranding, siteBrandingService } from "@/services/siteBrandingService";
import { useAppDataStore } from "@/stores/appDataStore";

const router = useRouter();
const store = useAppDataStore();
const form = reactive({
  username: "",
  nickname: "",
  password: "",
  confirmPassword: "",
  captcha: "",
});
const captchaImage = ref("");
const captchaLoading = ref(false);
const submitting = ref(false);
const errorMessage = ref("");
const branding = ref(getCachedSiteBranding());
const usernameError = computed(() => {
  const username = form.username.trim();
  if (!username) return "";
  return /^[A-Za-z0-9_]{3,32}$/.test(username)
    ? ""
    : "用户名仅支持 3-32 位英文字母、数字或下划线，不支持中文、空格和其他符号。";
});
const canSubmit = computed(() => (
  !usernameError.value
  && form.username.trim().length >= 3
  && form.password.length >= 8
  && form.password === form.confirmPassword
  && form.captcha.trim().length === 4
));

async function refreshCaptcha() {
  captchaLoading.value = true;
  errorMessage.value = "";
  form.captcha = "";
  try {
    captchaImage.value = await loadRegisterCaptcha();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "验证码加载失败";
  } finally {
    captchaLoading.value = false;
  }
}

async function submit() {
  if (submitting.value) return;
  if (usernameError.value || form.username.trim().length < 3) {
    errorMessage.value = usernameError.value || "请输入至少 3 位用户名。";
    return;
  }
  if (!canSubmit.value) {
    errorMessage.value = form.password !== form.confirmPassword
      ? "两次输入的密码不一致。"
      : "请完整填写注册信息并完成验证码。";
    return;
  }
  submitting.value = true;
  errorMessage.value = "";
  try {
    await registerAccount({
      username: form.username.trim(),
      nickname: form.nickname.trim() || undefined,
      password: form.password,
      captcha: form.captcha.trim(),
    });
    await settingsService.update({
      displayName: form.nickname.trim() || form.username.trim(),
      avatarDataUrl: undefined,
    });
    store.clearSessionData();
    await store.init();
    await router.replace("/dashboard");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "注册失败";
    await refreshCaptcha();
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await refreshCaptcha();
  try {
    branding.value = await siteBrandingService.get();
  } catch {
    // 注册页保留本地缓存或内置图标，不能因品牌配置请求失败阻断注册。
  }
});
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  background: var(--color-bg-page);
}

.auth-panel {
  width: min(560px, 100%);
  padding: 40px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-popover);
}

.brand-mark {
	width: 42px;
	height: 42px;
	display: block;
	object-fit: contain;
}

.auth-heading {
  margin: var(--space-6) 0 var(--space-8);
}

.auth-heading span {
  color: var(--color-primary);
  font-size: var(--font-caption);
  font-weight: 700;
}

.auth-heading h1 {
  margin: var(--space-2) 0;
  font-size: 28px;
}

.auth-heading p,
.auth-footnote {
  margin: 0;
  color: var(--color-text-tertiary);
  line-height: 1.7;
}

.auth-form {
  display: grid;
  gap: var(--space-5);
}

.auth-form label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-table);
  font-weight: 600;
}

.auth-form small {
  color: var(--color-text-tertiary);
  font-weight: 400;
}

.auth-form .field-error {
  color: var(--color-danger);
  font-weight: 500;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.captcha-row {
  display: grid;
  grid-template-columns: 1fr 132px;
  gap: var(--space-3);
}

.captcha-image {
  height: 34px;
  overflow: hidden;
  padding: 0;
  color: var(--color-text-tertiary);
  background: #fefae7;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.captcha-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.auth-form :deep(.r-button) {
  width: 100%;
}

.auth-footnote {
  margin-top: var(--space-6);
  text-align: center;
  font-size: var(--font-caption);
}

.auth-footnote a {
  color: var(--color-primary);
  text-decoration: none;
}

@media (max-width: 560px) {
  .auth-page {
    padding: 16px;
  }

  .auth-panel {
    padding: 28px 22px;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
