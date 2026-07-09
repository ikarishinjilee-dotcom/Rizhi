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
    { path: "/settings", component: () => import("@/features/settings/SettingsPage.vue"), meta: { title: "设置中心", section: "overview" } },
    { path: "/settings/profile", component: () => import("@/features/settings/SettingsPage.vue"), meta: { title: "个人资料", section: "profile" } },
    { path: "/settings/data", component: () => import("@/features/settings/SettingsPage.vue"), meta: { title: "数据管理", section: "data" } },
    { path: "/admin", component: () => import("@/features/admin/AdminPage.vue"), meta: { title: "管理中心", admin: true } },
    { path: "/help", component: () => import("@/features/help/HelpPage.vue"), meta: { title: "使用帮助" } },
  ],
});

router.beforeEach(async (to) => {
  if (!isUniCloudMode()) return true;
  if (to.meta.public) return hasActiveSession() ? { path: "/dashboard" } : true;
  if (!hasActiveSession()) {
    return {
      path: "/login",
      query: { redirect: to.fullPath },
    };
  }
  if (to.meta.admin) {
    if (!isAdmin()) await refreshCurrentIdentity();
    if (!isAdmin()) return { path: "/dashboard" };
  }
  return true;
});
