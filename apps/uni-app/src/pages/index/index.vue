<template>
  <view class="page">
    <view class="brand">R</view>
    <view class="heading">
      <text class="eyebrow">RIZHI ACCOUNT</text>
      <text class="title">{{ hasLogin ? `你好，${displayName}` : "欢迎使用日值" }}</text>
      <text class="description">
        {{ hasLogin
          ? "账号已登录。当前跨端项目已完成账户体系接入，资产、记账和资金页面将在后续迁移。"
          : "登录后，你的资产、账单和资金数据将在各端保持一致。" }}
      </text>
    </view>
    <view v-if="!hasLogin" class="actions">
      <button class="primary" @click="openLogin">登录</button>
      <button class="secondary" @click="openRegister">创建账户</button>
    </view>
    <view v-else class="account-card">
      <view class="account-meta">
        <text class="account-label">当前账号</text>
        <text class="account-name">{{ displayName }}</text>
        <text class="account-id">UID {{ session.uid }}</text>
      </view>
      <view class="actions account-actions">
        <button class="primary" @click="openProfile">账户资料</button>
        <button class="secondary" @click="logout">退出登录</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { mutations, store } from "@/uni_modules/uni-id-pages/common/store.js";

const session = reactive({
  hasLogin: false,
  uid: "",
});

const hasLogin = computed(() => session.hasLogin);
const displayName = computed(() => {
  return store.userInfo.nickname || store.userInfo.username || session.uid || "日值用户";
});

function syncSession() {
  const current = uniCloud.getCurrentUserInfo();
  const tokenExpired = Number(uni.getStorageSync("uni_id_token_expired") || 0);
  session.uid = current.uid || "";
  session.hasLogin = Boolean(current.uid && tokenExpired > Date.now());
}

onShow(() => {
  syncSession();
  if (session.hasLogin && !store.hasLogin) {
    void mutations.updateUserInfo();
  }
});

function openLogin() {
  uni.navigateTo({ url: "/uni_modules/uni-id-pages/pages/login/login-withpwd" });
}

function openRegister() {
  uni.navigateTo({ url: "/uni_modules/uni-id-pages/pages/register/register" });
}

function openProfile() {
  uni.navigateTo({ url: "/uni_modules/uni-id-pages/pages/userinfo/userinfo" });
}

async function logout() {
  await mutations.logout();
}
</script>

<style>
page {
  background: #f5f7fb;
}

.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 120rpx 48rpx 64rpx;
}

.brand {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #1677ff;
  border-radius: 16rpx;
  font-size: 40rpx;
  font-weight: 800;
}

.heading {
  display: flex;
  flex-direction: column;
  margin-top: 56rpx;
}

.eyebrow {
  color: #1677ff;
  font-size: 24rpx;
  font-weight: 700;
}

.title {
  margin-top: 16rpx;
  color: #111827;
  font-size: 52rpx;
  font-weight: 800;
}

.description {
  margin-top: 20rpx;
  color: #667085;
  font-size: 28rpx;
  line-height: 1.7;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 72rpx;
}

.actions button {
  width: 100%;
  height: 92rpx;
  border-radius: 12rpx;
  font-size: 30rpx;
  font-weight: 700;
}

.primary {
  color: #fff;
  background: #1677ff;
}

.secondary {
  color: #1677ff;
  background: #fff;
  border: 1px solid #b8d4ff;
}

.account-card {
  margin-top: 64rpx;
  padding: 36rpx;
  background: #fff;
  border: 1px solid #e4eaf3;
  border-radius: 20rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}

.account-meta {
  display: flex;
  flex-direction: column;
}

.account-label {
  color: #667085;
  font-size: 24rpx;
}

.account-name {
  margin-top: 12rpx;
  color: #111827;
  font-size: 36rpx;
  font-weight: 800;
}

.account-id {
  margin-top: 8rpx;
  color: #98a2b3;
  font-size: 22rpx;
}

.account-actions {
  margin-top: 36rpx;
}
</style>
