<template>
	<div class="app-shell" :class="{ 'app-shell--dashboard': route.path === '/dashboard' }">
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
	import { useRoute } from "vue-router";
	import Sidebar from "@/components/layout/Sidebar.vue";
	import Topbar from "@/components/layout/Topbar.vue";

	const route = useRoute();
</script>

<style scoped>
	.app-shell {
		display: grid;
		grid-template-columns: 128px minmax(0, 1480px);
		justify-content: center;
		min-height: 100vh;
	}

	.app-shell__body {
		min-width: 0;
	}

	.app-shell__main {
		padding: 60px 48px 56px;
	}

	.app-shell--dashboard .app-shell__main {
		padding-bottom: 0;
		overflow: hidden;
	}
</style>
