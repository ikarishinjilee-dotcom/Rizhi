<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <AppShell>
        <router-view />
      </AppShell>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider, type GlobalThemeOverrides } from "naive-ui";
import AppShell from "@/components/layout/AppShell.vue";

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: "#1677FF",
    primaryColorHover: "#2F80FF",
    primaryColorPressed: "#0F63D9",
    borderRadius: "6px",
    fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif',
  },
  Button: {
    heightMedium: "32px",
    borderRadiusMedium: "6px",
    fontSizeMedium: "13px",
  },
  Card: {
    borderRadius: "8px",
  },
  DataTable: {
    thColor: "#F8FAFD",
    thTextColor: "#667085",
    tdTextColor: "#344054",
    borderColor: "#E8EDF5",
  },
};
</script>
