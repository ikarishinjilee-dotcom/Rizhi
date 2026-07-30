<template>
	<img v-if="definition?.assetUrl" class="icon-glyph icon-glyph--image" :src="definition.assetUrl"
		:alt="definition.label" :style="style" />
	<span v-else class="icon-glyph icon-glyph--fallback" :style="style" aria-hidden="true">{{ fallback }}</span>
</template>

<script setup lang="ts">
	import { computed } from "vue";
	import { getIconDefinition } from "@/domain/iconLibrary";

	const props = withDefaults(defineProps<{ iconKey ?: string; size ?: number }>(), { size: 20 });
	const definition = computed(() => getIconDefinition(props.iconKey));
	const fallback = computed(() => definition.value?.label?.slice(0, 1) || "图");
	const style = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }));
</script>

<style scoped>
	.icon-glyph {
		display: inline-flex;
		flex: 0 0 auto;
		align-items: center;
		justify-content: center;
		object-fit: contain;
	}

	.icon-glyph--fallback {
		color: currentColor;
		font-size: 0.62em;
		font-weight: 700;
		line-height: 1;
	}
</style>