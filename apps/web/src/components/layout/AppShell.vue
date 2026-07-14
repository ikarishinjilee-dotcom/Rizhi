<template>
  <div class="app-shell">
    <Sidebar />
    <div class="app-shell__body">
      <Topbar />
      <main class="app-shell__main">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import Sidebar from "@/components/layout/Sidebar.vue";
import Topbar from "@/components/layout/Topbar.vue";
</script>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: 112px minmax(0, 1480px);
  justify-content: center;
  min-height: 100vh;
}

.app-shell__body {
  min-width: 0;
}

.app-shell__main {
  padding: 24px 48px 56px;
}
</style>
