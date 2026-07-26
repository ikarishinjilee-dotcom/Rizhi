import { reactive } from "vue";

export type IconLibraryKind = "standard" | "bank";

export type IconLibraryGroup = {
	id: string;
	label: string;
	kind: IconLibraryKind;
};

export type IconDefinition = {
	key: string;
	label: string;
	kind: IconLibraryKind;
	groupId: string;
	/** Web preview or uploaded asset. Native clients use the same key to map their own bundle. */
	assetUrl?: string;
	platforms?: Partial<Record<"web" | "mp" | "android" | "ios", string>>;
};

const STORAGE_KEY = "rizhi.icon-library.v1";

export function createIconKey(kind: IconLibraryKind) {
	const prefix = kind === "bank" ? "bank" : "icon";
	const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID().replace(/-/g, "")
		: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
	return `${prefix}-${random}`;
}

const defaultGroups: IconLibraryGroup[] = [
	{ id: "standard-other", label: "未分类", kind: "standard" },
	{ id: "bank-default", label: "银行", kind: "bank" },
];

export type IconLibraryState = {
	groups: IconLibraryGroup[];
	icons: IconDefinition[];
};

function loadState(): IconLibraryState {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as Partial<IconLibraryState>;
			return {
				groups: Array.isArray(parsed.groups) ? parsed.groups : [...defaultGroups],
				icons: Array.isArray(parsed.icons) ? parsed.icons : [],
			};
		}
	} catch {
		// Local storage is optional; the app remains usable when it is unavailable.
	}
	return { groups: [...defaultGroups], icons: [] };
}

export const iconLibraryState = reactive<IconLibraryState>(loadState());

function persist() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ groups: iconLibraryState.groups, icons: iconLibraryState.icons }));
	} catch {
		// Uploading is still reflected in the current session if persistence is unavailable.
	}
}

export function addIconGroup(label: string, kind: IconLibraryKind) {
	const name = label.trim();
	if (!name) return;
	iconLibraryState.groups.push({ id: `${kind}-${Date.now().toString(36)}`, label: name, kind });
	persist();
}

export function upsertIcon(icon: IconDefinition) {
	const index = iconLibraryState.icons.findIndex((item) => item.key === icon.key);
	if (index >= 0) iconLibraryState.icons.splice(index, 1, icon);
	else iconLibraryState.icons.push(icon);
	persist();
}

export function removeIcon(key: string) {
	const index = iconLibraryState.icons.findIndex((item) => item.key === key);
	if (index >= 0) iconLibraryState.icons.splice(index, 1);
	persist();
}

export function moveIcon(key: string, direction: -1 | 1) {
	const index = iconLibraryState.icons.findIndex((item) => item.key === key);
	if (index < 0) return;
	const current = iconLibraryState.icons[index];
	const siblings = iconLibraryState.icons
		.map((item, itemIndex) => ({ item, itemIndex }))
		.filter(({ item }) => item.kind === current.kind && (current.kind === "bank" || item.groupId === current.groupId));
	const siblingIndex = siblings.findIndex(({ item }) => item.key === key);
	const target = siblings[siblingIndex + direction];
	if (!target) return;
	const [moved] = iconLibraryState.icons.splice(index, 1);
	const targetIndex = iconLibraryState.icons.findIndex((item) => item.key === target.item.key);
	iconLibraryState.icons.splice(targetIndex + (direction > 0 ? 1 : 0), 0, moved);
	persist();
}

export function setIconOrder(kind: IconLibraryKind, groupId: string, keys: string[]) {
	const siblingIndexes = iconLibraryState.icons
		.map((item, index) => ({ item, index }))
		.filter(({ item }) => item.kind === kind && (kind === "bank" || item.groupId === groupId))
		.map(({ index }) => index);
	const byKey = new Map(iconLibraryState.icons.filter((item) => item.kind === kind && (kind === "bank" || item.groupId === groupId)).map((item) => [item.key, item]));
	const ordered = keys.map((key) => byKey.get(key)).filter((item): item is IconDefinition => Boolean(item));
	if (ordered.length !== siblingIndexes.length) return;
	siblingIndexes.forEach((index, position) => { iconLibraryState.icons[index] = ordered[position]; });
	persist();
}

export function setGroupOrder(kind: IconLibraryKind, ids: string[]) {
	const indexes = iconLibraryState.groups.map((group, index) => ({ group, index })).filter(({ group }) => group.kind === kind);
	const byId = new Map(indexes.map(({ group }) => [group.id, group]));
	const ordered = ids.map((id) => byId.get(id)).filter((group): group is IconLibraryGroup => Boolean(group));
	if (ordered.length !== indexes.length) return;
	indexes.forEach(({ index }, position) => { iconLibraryState.groups[index] = ordered[position]; });
	persist();
}

export function getIconDefinition(key?: string) {
	return iconLibraryState.icons.find((item) => item.key === key);
}

export function inferIconKey(label: string) {
	const value = label.trim();
	return iconLibraryState.icons.find((item) => item.label === value)?.key;
}

export function getGroups(kind?: IconLibraryKind) {
	return iconLibraryState.groups.filter((group) => !kind || group.kind === kind);
}
