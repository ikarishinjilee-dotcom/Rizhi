<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <router-view v-if="route.meta.public" />
      <AppShell v-else>
        <router-view />
      </AppShell>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider, type GlobalThemeOverrides } from "naive-ui";
import { useRoute } from "vue-router";
import AppShell from "@/components/layout/AppShell.vue";

const route = useRoute();

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: "#2674FF",
    primaryColorHover: "#3B82FF",
    primaryColorPressed: "#155EE8",
    borderRadius: "12px",
    fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif',
    textColor1: "#0F172A",
    textColor2: "#475569",
    textColor3: "#94A3B8",
    borderColor: "#E2E8F0",
  },
  Button: {
    heightMedium: "40px",
    heightSmall: "34px",
    heightLarge: "44px",
    borderRadiusMedium: "12px",
    borderRadiusSmall: "10px",
    borderRadiusLarge: "14px",
    fontSizeMedium: "14px",
    fontSizeSmall: "13px",
    fontSizeLarge: "15px",
  },
  Card: {
    borderRadius: "16px",
    color: "#FFFFFF",
    borderColor: "#E8EEF7",
  },
  Input: {
    heightMedium: "40px",
    borderRadius: "12px",
    borderHover: "1px solid #2674FF",
    borderFocus: "1px solid #2674FF",
    boxShadowFocus: "0 0 0 3px rgba(38, 116, 255, 0.12)",
  },
  Select: {
    peers: {
      InternalSelection: {
        heightMedium: "40px",
        borderRadius: "12px",
        borderHover: "1px solid #2674FF",
        borderFocus: "1px solid #2674FF",
        boxShadowFocus: "0 0 0 3px rgba(38, 116, 255, 0.12)",
      },
    },
  },
  DataTable: {
    thColor: "#F8FAFD",
    thTextColor: "#64748B",
    tdTextColor: "#334155",
    borderColor: "#E8EEF7",
    borderRadius: "16px",
  },
  Modal: {
    borderRadius: "20px",
  },
};
</script>
