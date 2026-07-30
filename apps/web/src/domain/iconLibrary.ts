import { reactive } from "vue";

/**
 * Kept as `IconLibraryKind` for compatibility with existing consumers. New
 * top-level categories use their own stable id instead of a hard-coded union.
 */
export type IconLibraryKind = string;

export type IconLibraryCategory = {
	id : string;
	label : string;
	sort : number;
};

export type IconLibraryGroup = {
	id : string;
	label : string;
	kind : IconLibraryKind;
};

export type IconDefinition = {
	key : string;
	label : string;
	kind : IconLibraryKind;
	groupId : string;
	/** Web preview or uploaded asset. Native clients use the same key to map their own bundle. */
	assetUrl ?: string;
	/** uniCloud file ID for the Web preview asset. */
	assetFileId ?: string;
	platforms ?: Partial<Record<"web" | "mp" | "android" | "ios", string>>;
};

const STORAGE_KEY = "rizhi.icon-library.v1";

export function createIconKey(kind : IconLibraryKind) {
	// Existing bank-* keys remain untouched in persisted data. Every newly
	// generated key uses the cross-category icon-* convention.
	const prefix = "icon";
	const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID().replace(/-/g, "")
		: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
	return `${prefix}-${random}`;
}

const defaultGroups : IconLibraryGroup[] = [
	{ id: "standard-other", label: "未分类", kind: "standard" },
	{ id: "bank-default", label: "银行", kind: "bank" },
];

export type IconLibraryState = {
	categories : IconLibraryCategory[];
	groups : IconLibraryGroup[];
	icons : IconDefinition[];
	/** Legacy key aliases used only to keep old browser data renderable. */
	aliases : Record<string, string>;
};

const defaultCategories : IconLibraryCategory[] = [
	{ id: "standard", label: "普通图标", sort: 10 },
	{ id: "bank", label: "银行图标", sort: 20 },
];

function ensureLibraryShape(input : Partial<IconLibraryState> | null | undefined) : IconLibraryState {
	const groups = Array.isArray(input?.groups) ? input.groups.filter((item) => item && item.id && item.label && item.kind) : [];
	const icons = Array.isArray(input?.icons) ? input.icons.filter((item) => item && item.key && item.label && item.kind) : [];
	const categories = Array.isArray(input?.categories) ? input.categories.filter((item) => item && item.id && item.label) : [];
	const nextCategories = categories.length
		? categories.map((item, index) => ({ id: String(item.id), label: String(item.label).trim(), sort: Number(item.sort) || (index + 1) * 10 }))
		: [...defaultCategories];
	const categoryIds = new Set(nextCategories.map((item) => item.id));
	for (const kind of ["standard", "bank"]) {
		if (!categoryIds.has(kind)) {
			nextCategories.push({ ...defaultCategories.find((item) => item.id === kind)! });
			categoryIds.add(kind);
		}
	}
	const nextGroups = groups.map((group) => ({ id: String(group.id), label: String(group.label).trim(), kind: String(group.kind) }));
	for (const category of nextCategories) {
		if (!nextGroups.some((group) => group.kind === category.id)) {
			nextGroups.push({ id: `${category.id}-default`, label: "未分类", kind: category.id });
		}
	}
	const validGroupIds = new Set(nextGroups.map((group) => group.id));
	const nextIcons = icons.map((icon) => ({
		...icon,
		key: String(icon.key),
		label: String(icon.label).trim(),
		kind: String(icon.kind),
		groupId: validGroupIds.has(String(icon.groupId)) ? String(icon.groupId) : `${String(icon.kind)}-default`,
	}));
	const aliases = input?.aliases && typeof input.aliases === "object" ? Object.fromEntries(Object.entries(input.aliases).map(([key, value]) => [String(key), String(value)])) : {};
	return { categories: nextCategories, groups: nextGroups, icons: nextIcons, aliases };
}

function loadState() : IconLibraryState {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			return ensureLibraryShape(JSON.parse(raw) as Partial<IconLibraryState>);
		}
	} catch {
		// Local storage is optional; the app remains usable when it is unavailable.
	}
	return ensureLibraryShape({ categories: defaultCategories, groups: defaultGroups, icons: [], aliases: {} });
}

export const iconLibraryState = reactive<IconLibraryState>(loadState());

export function replaceIconLibraryState(next : IconLibraryState) {
	const normalized = ensureLibraryShape(next);
	iconLibraryState.categories.splice(0, iconLibraryState.categories.length, ...normalized.categories);
	iconLibraryState.groups.splice(0, iconLibraryState.groups.length, ...normalized.groups);
	iconLibraryState.icons.splice(0, iconLibraryState.icons.length, ...normalized.icons);
	Object.keys(iconLibraryState.aliases).forEach((key) => { delete iconLibraryState.aliases[key]; });
	Object.assign(iconLibraryState.aliases, normalized.aliases);
	persist();
}

function persist() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: iconLibraryState.categories, groups: iconLibraryState.groups, icons: iconLibraryState.icons, aliases: iconLibraryState.aliases }));
	} catch {
		// Uploading is still reflected in the current session if persistence is unavailable.
	}
}

function stripImageBackground(dataUrl : string) {
	if (typeof Image === "undefined" || typeof document === "undefined" || !dataUrl.startsWith("data:image/")) return Promise.resolve(dataUrl);
	return new Promise<string>((resolve) => {
		const image = new Image();
		image.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;
			const context = canvas.getContext("2d");
			if (!context || !canvas.width || !canvas.height) return resolve(dataUrl);
			context.drawImage(image, 0, 0);
			const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
			const { data, width, height } = pixels;
			const ring : Array<[number, number, number]> = [];
			const marginX = Math.max(1, Math.floor(width * 0.08));
			const marginY = Math.max(1, Math.floor(height * 0.08));
			for (let y = marginY; y < height - marginY; y += Math.max(1, Math.floor(height / 12))) {
				for (const x of [marginX, width - marginX - 1]) {
					const index = (y * width + x) * 4;
					if (data[index + 3] > 180) ring.push([data[index], data[index + 1], data[index + 2]]);
				}
			}
			for (let x = marginX; x < width - marginX; x += Math.max(1, Math.floor(width / 12))) {
				for (const y of [marginY, height - marginY - 1]) {
					const index = (y * width + x) * 4;
					if (data[index + 3] > 180) ring.push([data[index], data[index + 1], data[index + 2]]);
				}
			}
			if (!ring.length) return resolve(dataUrl);
			const background = ring[Math.floor(ring.length / 2)];
			const matchingSamples = ring.filter(([red, green, blue]) => Math.abs(red - background[0]) + Math.abs(green - background[1]) + Math.abs(blue - background[2]) < 42).length;
			if (matchingSamples < Math.max(3, Math.ceil(ring.length * 0.35))) return resolve(dataUrl);
			for (let index = 0; index < data.length; index += 4) {
				const distance = Math.abs(data[index] - background[0]) + Math.abs(data[index + 1] - background[1]) + Math.abs(data[index + 2] - background[2]);
				if (data[index + 3] > 0 && distance < 42) data[index + 3] = 0;
			}
			resolve(canvas.toDataURL("image/png"));
		};
		image.onerror = () => resolve(dataUrl);
		image.src = dataUrl;
	});
}

async function normalizeBankIcons() {
	let changed = false;
	for (const icon of iconLibraryState.icons.filter((item) => item.kind === "bank" && item.assetUrl)) {

		const normalized = await stripImageBackground(icon.assetUrl!);
		if (normalized !== icon.assetUrl) {
			icon.assetUrl = normalized;
			changed = true;
		}
	}
	if (changed) persist();
}

export function addIconGroup(label : string, kind : IconLibraryKind) {
	const name = label.trim();
	if (!name) return;
	iconLibraryState.groups.push({ id: `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, label: name, kind });
	persist();
}

export function updateIconGroup(id : string, label : string) {
	const name = label.trim();
	if (!name) return false;
	const group = iconLibraryState.groups.find((item) => item.id === id);
	if (!group) return false;
	group.label = name;
	persist();
	return true;
}

export function removeIconGroup(id : string) {
	const index = iconLibraryState.groups.findIndex((item) => item.id === id);
	if (index < 0) return false;
	const kind = iconLibraryState.groups[index].kind;
	if (iconLibraryState.groups.filter((item) => item.kind === kind).length <= 1) return false;
	iconLibraryState.groups.splice(index, 1);
	persist();
	return true;
}

export function upsertIcon(icon : IconDefinition) {
	const index = iconLibraryState.icons.findIndex((item) => item.key === icon.key);
	if (index >= 0) iconLibraryState.icons.splice(index, 1, icon);
	else iconLibraryState.icons.push(icon);
	persist();
}

export function removeIcon(key : string) {
	const index = iconLibraryState.icons.findIndex((item) => item.key === key);
	if (index >= 0) iconLibraryState.icons.splice(index, 1);
	persist();
}

export function moveIcon(key : string, direction : -1 | 1) {
	const index = iconLibraryState.icons.findIndex((item) => item.key === key);
	if (index < 0) return;
	const current = iconLibraryState.icons[index];
	const siblings = iconLibraryState.icons
		.map((item, itemIndex) => ({ item, itemIndex }))
		.filter(({ item }) => item.kind === current.kind && item.groupId === current.groupId);
	const siblingIndex = siblings.findIndex(({ item }) => item.key === key);
	const target = siblings[siblingIndex + direction];
	if (!target) return;
	const [moved] = iconLibraryState.icons.splice(index, 1);
	const targetIndex = iconLibraryState.icons.findIndex((item) => item.key === target.item.key);
	iconLibraryState.icons.splice(targetIndex + (direction > 0 ? 1 : 0), 0, moved);
	persist();
}

export function setIconOrder(kind : IconLibraryKind, groupId : string, keys : string[]) {
	const siblingIndexes = iconLibraryState.icons
		.map((item, index) => ({ item, index }))
		.filter(({ item }) => item.kind === kind && item.groupId === groupId)
		.map(({ index }) => index);
	const byKey = new Map(iconLibraryState.icons.filter((item) => item.kind === kind && item.groupId === groupId).map((item) => [item.key, item]));
	const ordered = keys.map((key) => byKey.get(key)).filter((item) : item is IconDefinition => Boolean(item));
	if (ordered.length !== siblingIndexes.length) return;
	siblingIndexes.forEach((index, position) => { iconLibraryState.icons[index] = ordered[position]; });
	persist();
}

export function setGroupOrder(kind : IconLibraryKind, ids : string[]) {
	const indexes = iconLibraryState.groups.map((group, index) => ({ group, index })).filter(({ group }) => group.kind === kind);
	const byId = new Map(indexes.map(({ group }) => [group.id, group]));
	const ordered = ids.map((id) => byId.get(id)).filter((group) : group is IconLibraryGroup => Boolean(group));
	if (ordered.length !== indexes.length) return;
	indexes.forEach(({ index }, position) => { iconLibraryState.groups[index] = ordered[position]; });
	persist();
}

export function getIconCategories() {
	return [...iconLibraryState.categories].sort((a, b) => a.sort - b.sort);
}

export function addIconCategory(label : string) {
	const name = label.trim();
	if (!name) return undefined;
	const id = `category-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
	const sort = Math.max(0, ...iconLibraryState.categories.map((item) => item.sort)) + 10;
	iconLibraryState.categories.push({ id, label: name, sort });
	iconLibraryState.groups.push({ id: `${id}-default`, label: "未分类", kind: id });
	persist();
	return id;
}

export function updateIconCategory(id : string, label : string) {
	const name = label.trim();
	const category = iconLibraryState.categories.find((item) => item.id === id);
	if (!category || !name) return false;
	category.label = name;
	persist();
	return true;
}

export function setCategoryOrder(ids : string[]) {
	const byId = new Map(iconLibraryState.categories.map((category) => [category.id, category]));
	const ordered = ids.map((id) => byId.get(id)).filter((category) : category is IconLibraryCategory => Boolean(category));
	if (ordered.length !== iconLibraryState.categories.length) return;
	ordered.forEach((category, index) => { category.sort = (index + 1) * 10; });
	iconLibraryState.categories.splice(0, iconLibraryState.categories.length, ...ordered);
	persist();
}

export function getIconDefinition(key ?: string) {
	if (!key) return undefined;
	const resolvedKey = iconLibraryState.aliases[key] || key;
	return iconLibraryState.icons.find((item) => item.key === resolvedKey);
}

export function inferIconKey(label : string) {
	const value = label.trim();
	return iconLibraryState.icons.find((item) => item.label === value)?.key;
}

export function getGroups(kind ?: IconLibraryKind) {
	return iconLibraryState.groups.filter((group) => !kind || group.kind === kind);
}

void normalizeBankIcons();
