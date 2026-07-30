<template>
		<section class="icon-picker">
			<div class="icon-picker__head"><strong>从图标库选择</strong><input v-model="query" type="search" placeholder="搜索图标名称" /></div>
			<div v-if="allCategories && categories.length" class="icon-picker__categories">
				<button v-for="category in categories" :key="category.id" type="button" :class="{ active: activeKind === category.id }" @click="selectCategory(category.id)">{{ category.label }}</button>
			</div>
			<div v-if="groups.length" class="icon-picker__groups">
				<button v-for="group in groups" :key="group.id" type="button" :class="{ active: activeGroup === group.id }" @click="selectGroup(group.id)">{{ group.label }}</button>
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
import { getIconCategories, iconLibraryState, type IconLibraryKind } from "@/domain/iconLibrary";

const LOCATION_STORAGE_KEY = "rizhi_icon_library_picker_location";
const props = withDefaults(defineProps<{ modelValue?: string; compact?: boolean; kind?: IconLibraryKind; allCategories?: boolean }>(), { modelValue: "", compact: false, kind: "standard", allCategories: true });
const emit = defineEmits<{ "update:modelValue": [string]; select: [string] }>();
const query = ref("");
const activeKind = ref<IconLibraryKind>(props.kind);
const activeGroup = ref("");
const categories = computed(() => props.allCategories ? getIconCategories() : []);
const groups = computed(() => iconLibraryState.groups.filter((group) => group.kind === activeKind.value));
const filteredIcons = computed(() => {
	const keyword = query.value.trim().toLocaleLowerCase();
	return iconLibraryState.icons.filter((icon) => {
		const matchesQuery = !keyword || icon.label.toLocaleLowerCase().includes(keyword) || icon.key.toLocaleLowerCase().includes(keyword);
		if (!matchesQuery) return false;
		if (props.allCategories && keyword) return true;
		return icon.kind === activeKind.value && (!activeGroup.value || icon.groupId === activeGroup.value);
	});
});
function readRememberedLocation() {
	if (typeof window === "undefined") return null;
	try {
		const value = JSON.parse(window.localStorage.getItem(LOCATION_STORAGE_KEY) || "null") as { kind?: IconLibraryKind; groupId?: string } | null;
		return value?.kind ? { kind: value.kind, groupId: value.groupId || "" } : null;
	} catch {
		return null;
	}
}
function rememberLocation(kind = activeKind.value, groupId = activeGroup.value) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ kind, groupId }));
	} catch {
		// 浏览位置记忆失败不应影响图标选择。
	}
}
function selectInitialLocation() {
	const selected = iconLibraryState.icons.find((icon) => icon.key === props.modelValue);
	const remembered = props.allCategories && !selected ? readRememberedLocation() : null;
	const nextKind = props.allCategories && selected
		? selected.kind
		: props.allCategories
			? (remembered && categories.value.some((category) => category.id === remembered.kind)
				? remembered.kind
				: categories.value.some((category) => category.id === activeKind.value)
					? activeKind.value
					: categories.value[0]?.id)
			: props.kind;
	activeKind.value = nextKind || props.kind;
	const rememberedGroup = remembered?.kind === activeKind.value
		&& groups.value.some((group) => group.id === remembered.groupId)
		? remembered.groupId
		: "";
	activeGroup.value = selected?.kind === activeKind.value
		? selected.groupId
		: rememberedGroup || groups.value[0]?.id || "";
}
watch([() => props.kind, () => props.allCategories, () => props.modelValue, categories], selectInitialLocation, { immediate: true });
function selectCategory(kind: IconLibraryKind) {
	activeKind.value = kind;
	activeGroup.value = groups.value[0]?.id || "";
	rememberLocation();
}
function selectGroup(groupId: string) {
	activeGroup.value = groupId;
	rememberLocation();
}
function select(key: string) {
	const selected = iconLibraryState.icons.find((icon) => icon.key === key);
	if (selected) {
		activeKind.value = selected.kind;
		activeGroup.value = selected.groupId;
		rememberLocation(selected.kind, selected.groupId);
	}
	emit("update:modelValue", key);
	emit("select", key);
}
</script>

<style scoped>
.icon-picker { display: grid; gap: 10px; padding: 12px; background: #f8fbff; border: 1px solid var(--color-border); border-radius: 12px; }
.icon-picker__head, .icon-picker__categories, .icon-picker__groups { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.icon-picker__head input { width: 160px; padding: 7px 10px; border: 1px solid var(--color-border); border-radius: 8px; }
.icon-picker__categories button, .icon-picker__groups button, .icon-picker__grid button { border: 1px solid var(--color-border); background: #fff; border-radius: 8px; cursor: pointer; }
.icon-picker__categories { justify-content: flex-start; padding-bottom: 8px; overflow-x: auto; flex-wrap: nowrap; border-bottom: 1px solid #e2e8f1; }
.icon-picker__categories button { flex: 0 0 auto; min-height: 32px; padding: 0 11px; color: var(--color-text-secondary); white-space: nowrap; }
.icon-picker__groups button { padding: 5px 9px; color: var(--color-text-secondary); }
.icon-picker__groups { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 6px; max-height: 118px; overflow-y: auto; padding: 6px; background: #f4f7fb; border: 1px solid #e2e8f1; border-radius: 10px; }
.icon-picker__groups button { min-width: 0; min-height: 32px; overflow: hidden; padding: 0 8px; color: var(--color-text-secondary); text-overflow: ellipsis; white-space: nowrap; }
.icon-picker__categories button.active, .icon-picker__groups button.active, .icon-picker__grid button.active { color: var(--color-primary); border-color: #8bb8ff; background: var(--color-primary-light); }
.icon-picker__grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; max-height: 180px; overflow: auto; }
.icon-picker__grid button { display: grid; justify-items: center; gap: 4px; padding: 8px 4px; color: var(--color-text-secondary); font-size: 11px; }
.icon-picker__empty { margin: 0; color: var(--color-text-muted); font-size: 12px; }
</style>
