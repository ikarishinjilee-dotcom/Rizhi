import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import { hasActiveSession, isAdmin, isUniCloudMode, refreshCurrentIdentity } from "@/services/authService";

const history = import.meta.env.VITE_ROUTER_MODE === "hash"
  ? createWebHashHistory()
  : createWebHistory();

export const router = createRouter({
  history,
  routes: [
    { path: "/login", component: () => import("@/features/auth/LoginPage.vue"), meta: { public: true } },
    { path: "/register", component: () => import("@/features/auth/RegisterPage.vue"), meta: { public: true } },
    { path: "/", redirect: "/dashboard" },
    { path: "/dashboard", component: () => import("@/features/dashboard/DashboardPage.vue") },
    { path: "/assets", component: () => import("@/features/assets/AssetListPage.vue") },
    { path: "/assets/:id", component: () => import("@/features/assets/AssetDetailPage.vue") },
    { path: "/ledger", component: () => import("@/features/ledger/LedgerPage.vue") },
    { path: "/funds", component: () => import("@/features/funds/FundsPage.vue") },
    { path: "/me", redirect: "/settings" },
    { path: "/admin", component: () => import("@/features/admin/AdminPage.vue"), meta: { admin: true } },
    { path: "/settings/categories", component: () => import("@/features/settings/SettingsPage.vue"), meta: { title: "分类管理", section: "categories" } },
    { path: "/settings", component: () => import("@/features/settings/SettingsPage.vue"), meta: { title: "设置中心", section: "overview" } },
    { path: "/settings/profile", component: () => import("@/features/settings/SettingsPage.vue"), meta: { title: "个人资料", section: "profile" } },
    { path: "/settings/data", component: () => import("@/features/settings/SettingsPage.vue"), meta: { title: "数据管理", section: "data" } },
    { path: "/help", component: () => import("@/features/help/HelpPage.vue"), meta: { title: "使用帮助" } },
  ],
});

router.beforeEach(async (to) => {
  const uniCloudMode = isUniCloudMode();
  if (uniCloudMode && to.meta.public) return hasActiveSession() ? { path: "/dashboard" } : true;
  if (uniCloudMode && !hasActiveSession()) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
  if (to.meta.admin) {
    // 管理中心必须始终校验当前会话的角色；本地模式也不能因为跳过云端会话检查而绕过权限。
    if (!isAdmin() && uniCloudMode) await refreshCurrentIdentity();
    if (!isAdmin()) return { path: "/dashboard" };
  }
  return true;
});
