<template>
  <header class="settings-header">
    <div class="settings-identity">
      <div class="avatar">
        <img v-if="avatarDataUrl" :src="avatarDataUrl" alt="" />
        <span v-else>{{ profileInitial }}</span>
      </div>
      <div>
        <p>设置中心</p>
        <h1>{{ currentSectionTitle }}</h1>
        <span>{{ currentSectionDescription }}</span>
      </div>
    </div>
    <nav class="settings-nav" aria-label="设置中心导航">
      <RouterLink v-for="item in navItems" :key="item.path" :to="item.path">
        <component :is="item.icon" :size="17" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.settings-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-6);
  align-items: end;
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.settings-identity {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.settings-identity p,
.settings-identity h1,
.settings-identity span {
  margin: 0;
}

.settings-identity p {
  margin-bottom: 3px;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 800;
}

.settings-identity h1 {
  font-size: 24px;
  line-height: 1.35;
}

.settings-identity > div > span {
  display: block;
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.avatar {
  overflow: hidden;
  display: grid;
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
  place-items: center;
  color: #fff;
  background: var(--color-primary);
  border-radius: 16px;
  font-size: 24px;
  font-weight: 800;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.settings-nav {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: #edf1f7;
  border-radius: var(--radius-lg);
}

.settings-nav a {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 14px;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 700;
}

.settings-nav a:hover {
  color: var(--color-text-primary);
}

.settings-nav a.router-link-exact-active {
  color: var(--color-primary);
  background: #fff;
  box-shadow: 0 1px 4px rgba(17, 24, 39, 0.1);
}

@media (max-width: 1100px) {
  .settings-header {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .settings-nav {
    width: 100%;
  }

  .settings-nav a {
    flex: 1;
    justify-content: center;
  }
}

@media (max-width: 760px) {
  .settings-identity {
    align-items: flex-start;
  }

  .settings-nav {
    overflow-x: auto;
    justify-content: flex-start;
  }

  .settings-nav a {
    flex: 0 0 auto;
  }

  .settings-nav a span {
    white-space: nowrap;
  }
}
</style>

<script setup lang="ts">
import type { Component } from "vue";
import { RouterLink } from "vue-router";

type SettingsNavItem = {
  label: string;
  path: string;
  icon: Component;
};

defineProps<{
  avatarDataUrl?: string;
  profileInitial: string;
  currentSectionTitle: string;
  currentSectionDescription: string;
  navItems: SettingsNavItem[];
}>();
</script>
