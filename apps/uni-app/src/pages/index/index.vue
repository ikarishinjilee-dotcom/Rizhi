<template>
  <view class="page">
    <view class="brand">R</view>
    <view class="heading">
      <text class="eyebrow">RIZHI ACCOUNT</text>
      <text class="title">欢迎使用日值</text>
      <text class="description">登录后，你的资产、账单和资金数据将在各端保持一致。</text>
    </view>
    <view class="actions">
      <button class="primary" @click="openLogin">登录</button>
      <button class="secondary" @click="openRegister">创建账户</button>
    </view>
  </view>
</template>

<script setup lang="ts">
function openLogin() {
  uni.navigateTo({ url: "/uni_modules/uni-id-pages/pages/login/login-withpwd" });
}

function openRegister() {
  uni.navigateTo({ url: "/uni_modules/uni-id-pages/pages/register/register" });
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
</style>
