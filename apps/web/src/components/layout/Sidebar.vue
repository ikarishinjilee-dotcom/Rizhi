<template>
  <aside class="sidebar">
    <div class="sidebar__logo">
      <div class="sidebar__mark">R</div>
      <span>Rizhi</span>
    </div>

    <nav class="sidebar__nav">
      <RouterLink v-for="item in navItems" :key="item.path" :to="item.path" class="sidebar__item">
        <component :is="item.icon" :size="16" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="sidebar__foot">
      <RouterLink v-if="isAdmin()" class="sidebar__item" to="/admin" @click="openAdmin">
        <ShieldCheck :size="16" />
        <span>管理中心</span>
      </RouterLink>
      <RouterLink class="sidebar__item" to="/settings">
        <Settings :size="16" />
        <span>设置</span>
      </RouterLink>
      <RouterLink class="sidebar__item" to="/help">
        <CircleHelp :size="16" />
        <span>帮助</span>
      </RouterLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { RouterLink, useRouter } from "vue-router";
import { BarChart3, Box, CircleHelp, CreditCard, NotebookText, Settings, ShieldCheck, User } from "@lucide/vue";
import { isAdmin } from "@/services/authService";

const navItems = [
  { label: "看板", path: "/dashboard", icon: BarChart3 },
  { label: "物品资产", path: "/assets", icon: Box },
  { label: "记账", path: "/ledger", icon: NotebookText },
  { label: "资金", path: "/funds", icon: CreditCard },
  { label: "我的", path: "/settings/profile", icon: User },
];
const router = useRouter();

function openAdmin() {
  void router.push("/admin");
}
</script>

<style scoped>
.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  height: 100vh;
  flex-direction: column;
  padding: var(--space-4) var(--space-2);
  background: var(--color-bg-card);
  border-right: 1px solid var(--color-border);
}

.sidebar__logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 40px;
  padding: 0 var(--space-2);
  font-size: 13px;
  font-weight: 700;
}

.sidebar__mark {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  color: #fff;
  background: var(--color-primary);
  border-radius: 7px;
}

.sidebar__nav {
  display: grid;
  gap: var(--space-1);
  margin-top: var(--space-5);
}

.sidebar__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 32px;
  padding: 0 var(--space-2);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 600;
}

.sidebar__item:hover,
.sidebar__item.router-link-exact-active {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.sidebar__foot {
  display: grid;
  gap: var(--space-1);
  margin-top: auto;
}
</style>
