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

function stripImageBackground(dataUrl: string) {
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
			const ring: Array<[number, number, number]> = [];
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

void normalizeBankIcons();
