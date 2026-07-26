<template>
	<section class="icon-picker">
		<div class="icon-picker__head"><strong>从图标库选择</strong><input v-model="query" type="search" placeholder="搜索图标名称" /></div>
		<div v-if="props.kind === 'standard' && groups.length" class="icon-picker__groups">
			<button v-for="group in groups" :key="group.id" type="button" :class="{ active: activeGroup === group.id }" @click="activeGroup = group.id">{{ group.label }}</button>
		</div>
		<div v-if="filteredIcons.length" class="icon-picker__grid">
			<button v-for="icon in filteredIcons" :key="icon.key" type="button" :class="{ active: modelValue === icon.key }" :title="icon.label" @click="select(icon.key)">
				<IconGlyph :icon-key="icon.key" :size="compact ? 20 : 24" /><span>{{ icon.label }}</span>
			</button>
		</div>
		<p v-else class="icon-picker__empty">图标库暂未配置图标，请先在管理中心上传。</p>
	</section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import IconGlyph from "./IconGlyph.vue";
import { iconLibraryState, type IconLibraryKind } from "@/domain/iconLibrary";

const props = withDefaults(defineProps<{ modelValue?: string; compact?: boolean; kind?: IconLibraryKind }>(), { modelValue: "", compact: false, kind: "standard" });
const emit = defineEmits<{ "update:modelValue": [string]; select: [string] }>();
const query = ref("");
const activeGroup = ref("");
const groups = computed(() => iconLibraryState.groups.filter((group) => group.kind === "standard"));
const filteredIcons = computed(() => iconLibraryState.icons.filter((icon) => icon.kind === props.kind && (props.kind === "bank" || !activeGroup.value || icon.groupId === activeGroup.value) && (!query.value.trim() || icon.label.includes(query.value.trim()) || icon.key.includes(query.value.trim()))));
watch([() => props.kind, groups], () => { activeGroup.value = props.kind === "standard" ? (groups.value[0]?.id || "") : ""; }, { immediate: true });
function select(key: string) { emit("update:modelValue", key); emit("select", key); }
</script>

<style scoped>
.icon-picker { display: grid; gap: 10px; padding: 12px; background: #f8fbff; border: 1px solid var(--color-border); border-radius: 12px; }
.icon-picker__head, .icon-picker__groups { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.icon-picker__head input { width: 160px; padding: 7px 10px; border: 1px solid var(--color-border); border-radius: 8px; }
.icon-picker__groups button, .icon-picker__grid button { border: 1px solid var(--color-border); background: #fff; border-radius: 8px; cursor: pointer; }
.icon-picker__groups button { padding: 5px 9px; color: var(--color-text-secondary); }
.icon-picker__groups { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 6px; max-height: 118px; overflow-y: auto; padding: 6px; background: #f4f7fb; border: 1px solid #e2e8f1; border-radius: 10px; }
.icon-picker__groups button { min-width: 0; min-height: 32px; overflow: hidden; padding: 0 8px; color: var(--color-text-secondary); text-overflow: ellipsis; white-space: nowrap; }
.icon-picker__groups button.active, .icon-picker__grid button.active { color: var(--color-primary); border-color: #8bb8ff; background: var(--color-primary-light); }
.icon-picker__grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; max-height: 180px; overflow: auto; }
.icon-picker__grid button { display: grid; justify-items: center; gap: 4px; padding: 8px 4px; color: var(--color-text-secondary); font-size: 11px; }
.icon-picker__empty { margin: 0; color: var(--color-text-muted); font-size: 12px; }
</style>
