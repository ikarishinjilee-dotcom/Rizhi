import { createRouter, createWebHistory } from "vue-router";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/dashboard" },
    { path: "/dashboard", component: () => import("@/features/dashboard/DashboardPage.vue") },
    { path: "/assets", component: () => import("@/features/assets/AssetListPage.vue") },
    { path: "/assets/:id", component: () => import("@/features/assets/AssetDetailPage.vue") },
    { path: "/ledger", component: () => import("@/features/ledger/LedgerPage.vue") },
    { path: "/funds", component: () => import("@/features/funds/FundsPage.vue") },
    { path: "/me", redirect: "/settings" },
    { path: "/settings", component: () => import("@/features/settings/SettingsPage.vue"), meta: { title: "设置中心", section: "overview" } },
    { path: "/settings/profile", component: () => import("@/features/settings/SettingsPage.vue"), meta: { title: "个人资料", section: "profile" } },
    { path: "/settings/categories", component: () => import("@/features/settings/SettingsPage.vue"), meta: { title: "分类管理", section: "categories" } },
    { path: "/settings/data", component: () => import("@/features/settings/SettingsPage.vue"), meta: { title: "数据管理", section: "data" } },
    { path: "/help", component: () => import("@/features/help/HelpPage.vue"), meta: { title: "使用帮助" } },
  ],
});
