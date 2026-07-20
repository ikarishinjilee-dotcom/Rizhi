<template>
  <div class="profile-settings">
    <section class="profile-photo-panel">
      <div class="profile-photo">
        <img v-if="profileDraft.avatarDataUrl" :src="profileDraft.avatarDataUrl" alt="当前头像" />
        <span v-else>{{ profileInitial }}</span>
      </div>
      <div>
        <h2>个人头像</h2>
        <p>图片只保存在当前浏览器，不会上传到服务器。</p>
      </div>
      <RButton variant="secondary" @click="avatarFileInput?.click()">选择图片</RButton>
      <button v-if="profileDraft.avatarDataUrl" class="text-danger-button" type="button" @click="profileDraft.avatarDataUrl = undefined">移除头像</button>
      <input ref="avatarFileInput" class="hidden-file" type="file" accept="image/png,image/jpeg,image/webp" @change="$emit('select-avatar', $event)" />
    </section>
    <section class="profile-form">
      <div class="section-heading">
        <h2>基本资料</h2>
        <p>这些信息用于应用内的账户标识和界面展示。</p>
      </div>
      <div class="profile-form__grid">
        <label><span>显示名称</span><RInput v-model="profileDraft.displayName" placeholder="请输入显示名称" /></label>
        <label><span>默认货币</span><RSelect v-model="profileDraft.currency" :options="currencyOptions" /></label>
        <label><span>语言</span><RSelect v-model="profileDraft.locale" :options="localeOptions" /></label>
      </div>
      <RInlineFeedback v-if="profileMessage" :tone="profileMessageTone">{{ profileMessage }}</RInlineFeedback>
      <div class="profile-actions">
        <RButton :loading="savingProfile" @click="$emit('save-profile')">保存设置</RButton>
        <RButton variant="secondary" @click="$emit('load-profile')">恢复已保存内容</RButton>
      </div>
      <div class="profile-logout">
        <div><h3>退出登录</h3><p>退出后会清除当前设备上的登录状态和本地业务缓存。</p></div>
        <RButton data-testid="profile-logout-button" variant="danger" :loading="loggingOut" @click="$emit('logout')">退出登录</RButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import RButton from "@/components/ui/RButton.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import RInput from "@/components/ui/RInput.vue";
import RSelect from "@/components/ui/RSelect.vue";

defineProps<{
  profileDraft: { avatarDataUrl?: string; displayName: string; currency: string | number | null; locale: string | number | null };
  profileInitial: string;
  currencyOptions: Array<{ label: string; value: string }>;
  localeOptions: Array<{ label: string; value: string }>;
  profileMessage: string;
  profileMessageTone: "success" | "danger";
  savingProfile: boolean;
  loggingOut: boolean;
}>();

defineEmits<{
  "select-avatar": [event: Event];
  "save-profile": [];
  "load-profile": [];
  logout: [];
}>();

const avatarFileInput = ref<HTMLInputElement | null>(null);
</script>

<style scoped>
.profile-settings { display: grid; grid-template-columns: 280px minmax(0, 1fr); min-height: 420px; }
.profile-photo-panel { display: flex; align-items: center; flex-direction: column; gap: var(--space-3); padding: 40px 32px; background: var(--color-bg-hover); border-right: 1px solid var(--color-border); text-align: center; }
.profile-photo { overflow: hidden; display: grid; width: 104px; height: 104px; place-items: center; color: #fff; background: var(--color-primary); border-radius: 28px; font-size: 42px; font-weight: 800; }
.profile-photo img { width: 100%; height: 100%; object-fit: cover; }
.profile-photo-panel h2, .profile-photo-panel p { margin: 0; }
.profile-photo-panel h2 { font-size: 15px; }
.profile-photo-panel p { margin-top: 5px; color: var(--color-text-secondary); font-size: 12px; line-height: 1.7; }
.text-danger-button { color: var(--color-danger); background: none; border: 0; cursor: pointer; font-size: 12px; }
.profile-form { padding: 36px 40px; }
.section-heading h2, .section-heading p { margin: 0; }
.section-heading h2 { font-size: 17px; }
.section-heading p { margin-top: 5px; color: var(--color-text-secondary); font-size: 13px; }
.profile-form__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-5); margin-top: 28px; }
.profile-form__grid label { display: grid; gap: var(--space-2); color: var(--color-text-secondary); font-size: 12px; font-weight: 700; }
.profile-actions { display: flex; gap: var(--space-2); margin-top: var(--space-6); }
.profile-logout { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); margin-top: var(--space-6); padding-top: var(--space-5); border-top: 1px solid var(--color-border); }
.profile-logout h3 { margin: 0; color: var(--color-danger); font-size: var(--font-body); }
.profile-logout p { margin: var(--space-1) 0 0; color: var(--color-text-muted); font-size: var(--font-caption); }
.hidden-file { display: none; }
@media (max-width: 760px) { .profile-settings { grid-template-columns: 1fr; } .profile-photo-panel { border-right: 0; border-bottom: 1px solid var(--color-border); } .profile-form__grid { grid-template-columns: 1fr; } }
</style>
