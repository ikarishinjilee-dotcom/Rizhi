<template>
	<RDataGate :loading="store.loading" :ready="store.initialized" :error="store.error" @retry="initializeData">
		<section class="asset-list-page">
			<header class="asset-hero">
				<div>
					<h1>物品资产</h1>
					<p>记录所有物品，计算使用天数、日均成本和过保提醒</p>
				</div>
				<div class="asset-hero__actions">
					<RButton data-testid="asset-create-button" @click="openCreateModal">
						<Plus :size="16" />
						新增物品
					</RButton>
				</div>
			</header>

			<AssetSummaryGrid
				v-model:show-total-asset="showTotalAsset"
				:total-asset-cost="totalAssetCost"
				:monthly-asset-increase="monthlyAssetIncrease"
				:asset-growth-rate="assetGrowthRate"
				:summary-sparkline-points="summarySparklinePoints"
				:using-count="usingCount"
				:idle-count="idleCount"
				:warranty-soon-count="warrantySoonCount"
				:average-daily-cost="averageDailyCost"
				:using-assets="usingAssets"
				:idle-assets="idleAssets"
				:warranty-assets="warrantyAssets"
				:format-currency="formatCurrency"
			/>

			<AssetAnalyticsGrid
				:composition-mode="compositionMode" :composition-menu-open="compositionMenuOpen" :composition-stats="compositionStats" :composition-donut-gradient="compositionDonutGradient" :hovered-composition="hoveredComposition"
				:trend-range="trendRange" :trend-menu-open="trendMenuOpen" :trend-range-label="trendRangeLabel" :trend-ranges="trendRanges" :trend-y-axis-labels="trendYAxisLabels" :trend-polyline-points="trendPolylinePoints" :trend-points="trendPoints" :hovered-trend-index="hoveredTrendIndex" :trend-tooltip-style="trendTooltipStyle" :active-trend-point="activeTrendPoint"
				:usage-mode="usageMode" :usage-menu-open="usageMenuOpen" :usage-stats="usageStats" :usage-donut-gradient="usageDonutGradient" :format-currency="formatCurrency" :format-trend-axis-label="formatTrendAxisLabel"
				@update:composition-mode="compositionMode = $event" @update:composition-menu-open="compositionMenuOpen = $event" @composition-donut-move="handleCompositionDonutMove" @composition-hover="hoveredCompositionKey = $event"
				@update:trend-range="trendRange = $event" @update:trend-menu-open="trendMenuOpen = $event" @trend-hover="hoveredTrendIndex = $event"
				@update:usage-mode="usageMode = $event" @update:usage-menu-open="usageMenuOpen = $event"
			/>
			<AssetFilterToolbar
				:tabs="tabs"
				:active-tab="activeTab"
				:sort-by="sortBy"
				:sort-options="sortOptions"
				:view-mode="viewMode"
				@select-tab="activeTab = $event; categoryFilter = $event"
				@update:sort-by="sortBy = $event"
				@update:view-mode="viewMode = $event"
			/>

			<div v-if="filteredAssets.length && viewMode === 'card'" class="asset-grid">
				<AssetCard v-for="asset in filteredAssets" :key="asset.id" :asset="asset" @open="openAsset"
					@edit="openEditModal" @delete="openDeleteModal" />
			</div>

			<RCard v-else-if="filteredAssets.length" class="asset-table-card">
				<table class="simple-table">
					<thead>
						<tr>
							<th>名称</th>
							<th>分类</th>
							<th>资产总成本</th>
							<th>持有天数</th>
							<th>日均成本</th>
							<th>状态</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="asset in filteredAssets" :key="asset.id" @click="openAsset(asset.id)">
							<td>{{ asset.name }}</td>
							<td>{{ asset.category }}</td>
							<td>¥{{ asset.totalCost.toLocaleString("zh-CN", { minimumFractionDigits: 2 }) }}</td>
							<td>{{ asset.days }} 天</td>
							<td>¥{{ asset.dailyCost.toFixed(2) }}</td>
							<td>
								<RTag tone="success">{{ asset.status }}</RTag>
							</td>
						</tr>
					</tbody>
				</table>
			</RCard>

			<REmptyState v-else title="没有找到资产" description="换个关键词或清空筛选试试。">
				<RButton variant="secondary" @click="clearFilters">清空筛选</RButton>
			</REmptyState>

			<div class="pagination">
				<span>显示 {{ filteredAssets.length }} 条，共 {{ store.assets.length }} 条资产</span>
			</div>

			<AssetUpsertModal v-model:show="showAssetModal" :asset="editingAsset" :error="assetFormError"
				:loading="saving" :mode="editingAsset ? 'edit' : 'create'" @save="saveAsset" />

			<DeleteConfirmModal v-model:show="showDeleteModal" :loading="deleting"
				:title="`删除「${deletingAsset?.name ?? '该资产'}」？`" description="删除后会移除资产档案和附加项。历史记账流水会保留，但会解除与该资产的关联。"
				confirm-text="删除资产" @confirm="confirmDeleteAsset">
				<div class="delete-detail">
					<span>资产总成本</span>
					<strong>¥{{ deletingAssetTotalCost.toLocaleString("zh-CN", { minimumFractionDigits: 2 }) }}</strong>
				</div>
				<div class="delete-detail">
					<span>附加项数量</span>
					<strong>{{ deletingAddonCount }} 项</strong>
				</div>
			</DeleteConfirmModal>
		</section>
	</RDataGate>
</template>

<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";
	import { useRouter } from "vue-router";
	import { ChevronDown, Plus } from "@lucide/vue";
	import AssetCard, { type AssetCardItem } from "@/components/business/AssetCard.vue";
	import AssetFilterToolbar from "@/components/business/AssetFilterToolbar.vue";
	import AssetSummaryGrid from "@/components/business/AssetSummaryGrid.vue";
	import AssetAnalyticsGrid from "@/components/business/AssetAnalyticsGrid.vue";
	import AssetUpsertModal, { type AssetUpsertDraft } from "@/components/business/AssetUpsertModal.vue";
	import DeleteConfirmModal from "@/components/business/DeleteConfirmModal.vue";
	import RButton from "@/components/ui/RButton.vue";
	import RCard from "@/components/ui/RCard.vue";
	import REmptyState from "@/components/ui/REmptyState.vue";
	import RInput from "@/components/ui/RInput.vue";
	import RTag from "@/components/ui/RTag.vue";
	import RDataGate from "@/components/ui/RDataGate.vue";
	import { assetCategoryKind, assetImageUrls, assetTotalCost } from "@/domain/assetCalculations";
	import type { AssetRecord } from "@/domain/models";
	import { assetService } from "@/services/assetService";
	import { useAppDataStore } from "@/stores/appDataStore";
	import { formatCurrency } from "@/utils/formatters";

	const router = useRouter();
	const store = useAppDataStore();

	const query = ref("");
	const activeTab = ref<string | number>("all");
	const statusFilter = ref<string | number | null>("all");
	const categoryFilter = ref<string | number | null>("all");
	const sortBy = ref<string | number | null>("purchaseDate");
	const viewMode = ref<"card" | "table">("card");
	const showTotalAsset = ref(true);
	const compositionMode = ref<"category" | "status">("category");
	const compositionMenuOpen = ref(false);
	const trendRange = ref(6);
	const trendMenuOpen = ref(false);
	const hoveredTrendIndex = ref<number | null>(null);
	const usageMode = ref<"all" | "using" | "idle">("all");
	const usageMenuOpen = ref(false);
	const trendRanges = [
		{ label: "近3个月", value: 3 },
		{ label: "近6个月", value: 6 },
		{ label: "近12个月", value: 12 },
	] as const;
	const showAssetModal = ref(false);
	const showDeleteModal = ref(false);
	const saving = ref(false);
	const deleting = ref(false);
	const assetFormError = ref("");
	const editingAssetId = ref<string | null>(null);
	const deletingAssetId = ref<string | null>(null);

	const editingAsset = computed(() => editingAssetId.value ? store.assets.find((asset) => asset.id === editingAssetId.value) ?? null : null);
	const deletingAsset = computed(() => deletingAssetId.value ? store.assets.find((asset) => asset.id === deletingAssetId.value) ?? null : null);
	const deletingAssetTotalCost = computed(() => deletingAsset.value ? assetTotalCost(deletingAsset.value, store.assetAddons) : 0);
	const deletingAddonCount = computed(() => deletingAssetId.value ? store.assetAddons.filter((addon) => addon.assetId === deletingAssetId.value).length : 0);
	const assetCategoryIds = computed(() => new Set(store.assets.map((asset) => asset.categoryId)));
	const assetRootCategoryIds = computed(() => new Set([...assetCategoryIds.value].map((id) => categoryRootId(id))));
	const assetCategories = computed(() => store.categories
		.filter((category) => (category.domain === "asset" || assetRootCategoryIds.value.has(category.id)) && !category.parentId && !category.deletedAt && category.enabled !== false)
		.sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name, "zh-CN")));
	const legacyTabs = computed(() => [
		{ label: `全部 (${store.assets.length})`, value: "all" },
		...assetCategories.value
			.map((category) => ({
				category,
				count: store.assets.filter((asset) => categoryRootId(asset.categoryId) === category.id).length,
			}))
			.filter(({ count }) => count > 0)
			.map(({ category, count }) => ({
				label: `${category.name} (${count})`,
				value: category.id,
			})),
	]);
	const tabs = computed(() => {
		const populated = [...new Set(store.assets.map((asset) => categoryRootId(asset.categoryId)))]
			.map((id) => ({
				category: store.categories.find((item) => item.id === id),
				count: store.assets.filter((asset) => categoryRootId(asset.categoryId) === id).length,
			}))
			.filter((item) => item.category && item.count > 0)
			.sort((left, right) => left.category!.sort - right.category!.sort);
		return [
			{ label: legacyTabs.value[0]?.label ?? "", value: "all" },
			...populated.map(({ category, count }) => ({ label: `${category!.name} (${count})`, value: category!.id })),
		];
	});
	const sortOptions = [
		{ label: "默认排序", value: "purchaseDate" },
		{ label: "日均成本", value: "dailyCost" },
		{ label: "资产总成本", value: "totalCost" },
	];

	const assetCardItems = computed(() => store.assets.map(toAssetCard));
	const totalAssetCost = computed(() => assetCardItems.value.reduce((total, asset) => total + asset.totalCost, 0));
	const usingCount = computed(() => store.assets.filter((asset) => asset.status === "using").length);
	const idleCount = computed(() => store.assets.filter((asset) => asset.status === "idle").length);
	const usingAssets = computed(() => assetCardItems.value.filter((asset) => store.assets.find((item) => item.id === asset.id)?.status === "using"));
	const idleAssets = computed(() => assetCardItems.value.filter((asset) => store.assets.find((item) => item.id === asset.id)?.status === "idle"));
	const warrantyAssets = computed(() => store.assets.filter((asset) => {
		const days = warrantyDays(asset);
		return days !== undefined && days >= 0 && days <= 30;
	}).map(toAssetCard));
	const warrantySoonCount = computed(() => warrantyAssets.value.length);
	const averageDailyCost = computed(() => {
		if (!assetCardItems.value.length) return 0;
		return assetCardItems.value.reduce((total, asset) => total + asset.dailyCost, 0) / assetCardItems.value.length;
	});
	const monthlyAssetIncrease = computed(() => {
		const now = new Date();
		return store.assets
			.filter((asset) => {
				const date = new Date(asset.purchaseDate);
				return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
			})
			.reduce((total, asset) => total + assetTotalCost(asset, store.assetAddons), 0);
	});
	const assetGrowthRate = computed(() => {
		const base = Math.max(1, totalAssetCost.value - monthlyAssetIncrease.value);
		return ((monthlyAssetIncrease.value / base) * 100).toFixed(2);
	});
	const summarySparklinePoints = computed(() => makeSparklinePoints(assetTrend.value.map((item) => item.value), 220, 64));
	const categoryPalette = ["#2674ff", "#f59e0b", "#38bdf8", "#5eead4", "#7c3aed", "#94a3b8"];
	const categoryStats = computed(() => {
		const total = Math.max(1, totalAssetCost.value);
		const categoryIds = [...new Set([...assetCategories.value.map((category) => category.id), ...assetRootCategoryIds.value])];
		const grouped = categoryIds.map((categoryId, index) => {
			const category = store.categories.find((item) => item.id === categoryId);
			const value = store.assets
				.filter((asset) => categoryRootId(asset.categoryId) === categoryId)
				.reduce((sum, asset) => sum + assetTotalCost(asset, store.assetAddons), 0);
			return {
				id: categoryId,
				name: category?.name ?? "未分类",
				total: value,
				percent: Math.round((value / total) * 1000) / 10,
				color: categoryPalette[index % categoryPalette.length],
			};
		}).filter((item) => item.total > 0);
		const known = grouped.reduce((sum, item) => sum + item.total, 0);
		const other = totalAssetCost.value - known;
		if (other > 0) grouped.push({ id: "other", name: "其他", total: other, percent: Math.round((other / total) * 1000) / 10, color: "#94a3b8" });
		return grouped.sort((left, right) => right.total - left.total);
	});
	const legacyStatusStats = computed(() => {
		const statuses = [
			{ id: "using", name: "使用中", color: "#16b878", total: 0 },
			{ id: "idle", name: "闲置", color: "#f59e0b", total: 0 },
			{ id: "other", name: "其他状态", color: "#94a3b8", total: 0 },
		];
		for (const asset of assetCardItems.value) {
			const bucket = statuses.find((item) => item.id === asset.status) ?? statuses[2];
			bucket.total += asset.totalCost;
		}
		const total = Math.max(1, totalAssetCost.value);
		return statuses.filter((item) => item.total > 0).map((item) => ({ ...item, percent: Math.round((item.total / total) * 1000) / 10 }));
	});
	const statusStats = computed(() => {
		const statuses = [
			{ id: "using", name: "使用中", color: "#16b878", total: 0 },
			{ id: "idle", name: "闲置", color: "#f59e0b", total: 0 },
			{ id: "other", name: "其他状态", color: "#94a3b8", total: 0 },
		];
		for (const asset of store.assets) {
			const bucket = statuses.find((item) => item.id === asset.status) ?? statuses[2];
			bucket.total += assetTotalCost(asset, store.assetAddons);
		}
		const total = Math.max(1, totalAssetCost.value);
		return statuses.filter((item) => item.total > 0).map((item) => ({ ...item, percent: Math.round((item.total / total) * 1000) / 10 }));
	});
	const compositionStats = computed(() => compositionMode.value === "category" ? categoryStats.value : statusStats.value);
	const hoveredCompositionKey = ref<string | null>(null);
	const hoveredComposition = computed(() => compositionStats.value.find((item) => item.id === hoveredCompositionKey.value));
	const compositionDonutGradient = computed(() => makeDonutGradient(compositionStats.value.map((item) => ({ color: item.color, value: item.total }))));
	function handleCompositionDonutMove(event: MouseEvent) {
		if (!compositionStats.value.length) return;
		const element = event.currentTarget as HTMLElement;
		const rect = element.getBoundingClientRect();
		const x = event.clientX - (rect.left + rect.width / 2);
		const y = event.clientY - (rect.top + rect.height / 2);
		const distance = Math.sqrt(x * x + y * y);
		if (distance < rect.width * 0.2 || distance > rect.width * 0.5) {
			hoveredCompositionKey.value = null;
			return;
		}
		let degrees = (Math.atan2(y, x) * 180) / Math.PI + 90;
		if (degrees < 0) degrees += 360;
		const target = degrees / 3.6;
		let accumulated = 0;
		hoveredCompositionKey.value = compositionStats.value.find((item) => {
			accumulated += item.percent;
			return target <= accumulated;
		})?.id ?? null;
	}
	const legacyUsageAssets = computed(() => usageMode.value === "all" ? assetCardItems.value : assetCardItems.value.filter((asset) => asset.status === usageMode.value));
	const usageAssets = computed(() => {
		if (usageMode.value === "all") return assetCardItems.value;
		const matchedIds = new Set(store.assets.filter((asset) => asset.status === usageMode.value).map((asset) => asset.id));
		return assetCardItems.value.filter((asset) => matchedIds.has(asset.id));
	});
	const usageStats = computed(() => {
		const buckets = [
			{ name: "1年以下", color: "#2674ff", count: 0 },
			{ name: "1-3年", color: "#f59e0b", count: 0 },
			{ name: "3-5年", color: "#fb7185", count: 0 },
			{ name: "5年以上", color: "#a855f7", count: 0 },
		];
		for (const item of usageAssets.value) {
			if (item.days <= 365) buckets[0].count += 1;
			else if (item.days <= 1095) buckets[1].count += 1;
			else if (item.days <= 1825) buckets[2].count += 1;
			else buckets[3].count += 1;
		}
		const total = Math.max(1, usageAssets.value.length);
		return buckets.map((bucket) => ({ ...bucket, percent: Math.round((bucket.count / total) * 100) }));
	});
	const usageDonutGradient = computed(() => makeDonutGradient(usageStats.value.map((item) => ({ color: item.color, value: item.count }))));
	const assetTrend = computed(() => {
		const months = lastMonths(trendRange.value);
		return months.map((month) => ({
			label: month.label,
			value: store.assets
				.filter((asset) => asset.purchaseDate <= month.endDate)
				.reduce((sum, asset) => sum + assetTotalCost(asset, store.assetAddons), 0),
		}));
	});
	const trendPoints = computed(() => {
		const values = assetTrend.value.map((item) => item.value);
		const max = Math.max(...values, 1);
		const min = Math.min(...values, 0);
		const spread = Math.max(1, max - min);
		return assetTrend.value.map((item, index) => ({
			...item,
			x: assetTrend.value.length === 1 ? 260 : 28 + index * (464 / (assetTrend.value.length - 1)),
			y: 162 - ((item.value - min) / spread) * 126,
		}));
	});
	const trendPolylinePoints = computed(() => trendPoints.value.map((point) => `${point.x},${point.y}`).join(" "));
	const trendYAxisLabels = computed(() => {
		const values = assetTrend.value.map((item) => item.value);
		const max = Math.max(...values, 1);
		const min = Math.min(...values, 0);
		const spread = Math.max(1, max - min);
		return Array.from({ length: 5 }, (_, index) => {
			const ratio = index / 4;
			const value = max - spread * ratio;
			return { value, top: ratio * 100, label: formatTrendAxisValue(value) };
		});
	});
	const latestTrend = computed(() => assetTrend.value[assetTrend.value.length - 1]);
	const activeTrendPoint = computed(() => trendPoints.value[hoveredTrendIndex.value ?? trendPoints.value.length - 1]);
	const trendTooltipStyle = computed(() => {
		const x = activeTrendPoint.value?.x ?? 420;
		const left = Math.min(82, Math.max(18, (x / 520) * 100));
		return { left: `${left}%`, right: "auto" };
	});
	const trendRangeLabel = computed(() => trendRanges.find((range) => range.value === trendRange.value)?.label ?? "近6个月");

	const filteredAssets = computed(() => {
		const keyword = query.value.trim().toLowerCase();
		return store.assets
			.filter((asset) => {
				const category = categoryName(asset.categoryId);
				const matchesKeyword = !keyword || `${asset.name}${asset.brand ?? ""}${asset.model ?? ""}${category}`.toLowerCase().includes(keyword);
				const matchesTab = isAllFilter(activeTab.value) || categoryRootId(asset.categoryId) === activeTab.value;
				const matchesCategory = isAllFilter(categoryFilter.value) || categoryRootId(asset.categoryId) === categoryFilter.value;
				const matchesStatus = isAllFilter(statusFilter.value) || asset.status === statusFilter.value;
				return matchesKeyword && matchesTab && matchesCategory && matchesStatus;
			})
			.map(toAssetCard)
			.sort((a, b) => {
				const currentSort = sortBy.value || "purchaseDate";
				if (currentSort === "dailyCost") return b.dailyCost - a.dailyCost;
				if (currentSort === "totalCost") return b.totalCost - a.totalCost;
				const rawA = store.assets.find((asset) => asset.id === a.id)?.purchaseDate ?? "";
				const rawB = store.assets.find((asset) => asset.id === b.id)?.purchaseDate ?? "";
				return rawB.localeCompare(rawA);
			});
	});

	onMounted(initializeData);

	async function initializeData() {
		await store.init().catch(() => undefined);
	}

	function categoryName(id : string) {
		return store.categories.find((category) => category.id === id)?.name ?? "未分类";
	}

	function categoryRootId(id: string) {
		let current = store.categories.find((category) => category.id === id);
		const visited = new Set<string>();
		while (current?.parentId && !visited.has(current.id)) {
			visited.add(current.id);
			current = store.categories.find((category) => category.id === current?.parentId);
		}
		return current?.id ?? id;
	}

	function isAllFilter(value : string | number | null) {
		return value === null || value === "all";
	}

	function statusLabel(status : AssetRecord["status"]) {
		const labels : Record<AssetRecord["status"], string> = {
			using: "使用中",
			idle: "闲置",
			transferred: "已转让",
			disposed: "已处置",
		};
		return labels[status];
	}

	function displayStatus(asset : AssetRecord) {
		const days = warrantyDays(asset);
		if (days !== undefined && days >= 0 && days <= 30 && asset.status === "using") return "即将过保";
		return statusLabel(asset.status);
	}

	function dayDiff(from : string, to = Date.now()) {
		const start = new Date(from).getTime();
		if (Number.isNaN(start)) return 1;
		return Math.max(1, Math.ceil((to - start) / 86_400_000));
	}

	function warrantyDays(asset : AssetRecord) {
		if (!asset.warrantyEndDate) return undefined;
		return Math.max(0, Math.ceil((new Date(asset.warrantyEndDate).getTime() - Date.now()) / 86_400_000));
	}

	function imageTone(kind : ReturnType<typeof assetCategoryKind>) : AssetCardItem["imageTone"] {
		if (kind === "digital") return "blue";
		if (kind === "subscription") return "dark";
		if (kind === "home" || kind === "sports") return "warm";
		return "gray";
	}

	function toAssetCard(asset : AssetRecord) : AssetCardItem {
		const days = dayDiff(asset.purchaseDate);
		const totalCost = assetTotalCost(asset, store.assetAddons);
		const images = assetImageUrls(asset);
		return {
			id: asset.id,
			name: asset.name,
			brand: asset.brand,
			category: categoryName(asset.categoryId),
			totalCost,
			days,
			dailyCost: totalCost / days,
			expectedUseDays: asset.expectedUseDays,
			warrantyDays: warrantyDays(asset),
			status: displayStatus(asset),
			symbol: (asset.name || "R").slice(0, 1).toUpperCase(),
			imageTone: imageTone(assetCategoryKind(asset, store.categories)),
			imageUrl: images[0],
			imageUrls: images,
		};
	}

	function formatTrendAxisLabel(label : string) {
		const month = Number(label.split("-")[1]);
		return Number.isFinite(month) ? `${month}月` : label;
	}

	function formatTrendAxisValue(value: number) {
		if (value >= 10000) return `¥${(value / 10000).toFixed(1)}万`;
		if (value >= 1000) return `¥${(value / 1000).toFixed(1)}k`;
		return `¥${Math.round(value)}`;
	}

	function lastMonths(count : number) {
		const now = new Date();
		return Array.from({ length: count }, (_, index) => {
			const date = new Date(now.getFullYear(), now.getMonth() - count + index + 1, 1);
			const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
			return {
				label: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
				endDate: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`,
			};
		});
	}

	function makeSparklinePoints(values : number[], width : number, height : number) {
		if (!values.length) return "";
		const max = Math.max(...values, 1);
		const min = Math.min(...values, 0);
		const spread = Math.max(1, max - min);
		return values
			.map((value, index) => {
				const x = values.length === 1 ? width : (index / (values.length - 1)) * width;
				const y = height - ((value - min) / spread) * (height - 8) - 4;
				return `${x},${y}`;
			})
			.join(" ");
	}

	function makeDonutGradient(items : Array<{ color : string; value : number }>) {
		const total = items.reduce((sum, item) => sum + item.value, 0);
		if (total <= 0) return "conic-gradient(#e2e8f0 0deg 360deg)";
		let cursor = 0;
		const stops = items.flatMap((item) => {
			const start = cursor;
			cursor += (item.value / total) * 360;
			return [`${item.color} ${start}deg`, `${item.color} ${cursor}deg`];
		});
		return `conic-gradient(${stops.join(", ")})`;
	}

	function parseAmount(value : string) {
		const amount = Number(value.replace(/[¥￥,\s]/g, ""));
		if (!Number.isFinite(amount) || amount <= 0) throw new Error("请输入正确金额");
		return amount;
	}

	function normalizeDraftImages(draft : AssetUpsertDraft) {
		return Array.from(draft.imageUrls)
			.filter((url) : url is string => typeof url === "string" && Boolean(url))
			.filter((url, index, urls) => urls.indexOf(url) === index);
	}

	function toDateString(value : number | null) {
		const date = value ? new Date(value) : new Date();
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
	}

	function openAsset(id : string) {
		router.push(`/assets/${id}`);
	}

	function openCreateModal() {
		editingAssetId.value = null;
		assetFormError.value = "";
		showAssetModal.value = true;
	}

	function openEditModal(id : string) {
		editingAssetId.value = id;
		assetFormError.value = "";
		showAssetModal.value = true;
	}

	function openDeleteModal(id : string) {
		deletingAssetId.value = id;
		showDeleteModal.value = true;
	}

	async function confirmDeleteAsset() {
		if (!deletingAssetId.value) return;

		deleting.value = true;
		try {
			await assetService.delete(deletingAssetId.value);
			await store.refresh();
			showDeleteModal.value = false;
			deletingAssetId.value = null;
		} finally {
			deleting.value = false;
		}
	}

	function clearFilters() {
		query.value = "";
		activeTab.value = "all";
		statusFilter.value = "all";
		categoryFilter.value = "all";
	}

	async function saveAsset(draft : AssetUpsertDraft) {
		const selectedCategory = store.categories.find((category) => category.id === draft.categoryId) ?? assetCategories.value[0];
		if (!selectedCategory) {
			assetFormError.value = "资产分类尚未加载，请刷新页面后重试。";
			return;
		}

		saving.value = true;
		assetFormError.value = "";
		try {
			const imageUrls = normalizeDraftImages(draft);
			const payload = {
				name: draft.name.trim() || "未命名资产",
				brand: draft.brand.trim() || undefined,
				model: draft.model.trim() || undefined,
				categoryId: selectedCategory.id,
				originalCost: parseAmount(draft.cost),
				currency: "CNY" as const,
				purchaseDate: toDateString(draft.purchaseDate),
				firstUseDate: toDateString(draft.purchaseDate),
				purchaseChannel: "online" as const,
				merchant: draft.channel.trim() || undefined,
				paymentAccountId: draft.accountId ? String(draft.accountId) : undefined,
				warrantyStartDate: draft.warrantyStart ? toDateString(draft.warrantyStart) : undefined,
				warrantyEndDate: draft.warrantyEnd ? toDateString(draft.warrantyEnd) : undefined,
				expectedUseDays: draft.life ? Number(draft.life) * 365 : undefined,
				notes: draft.note.trim() || undefined,
				imageUrl: draft.imageUrl || imageUrls[0] || undefined,
				imageUrls: imageUrls.length ? imageUrls : undefined,
			};

			if (editingAsset.value) {
				await assetService.update({ id: editingAsset.value.id, ...payload });
			} else {
				await assetService.create(payload);
			}

			await store.refresh();
			showAssetModal.value = false;
			editingAssetId.value = null;
			assetFormError.value = "";
		} catch (err) {
			assetFormError.value = err instanceof Error ? err.message : "资产保存失败，请检查表单后重试。";
		} finally {
			saving.value = false;
		}
	}
</script>

<style scoped>
	.asset-list-page {
		display: grid;
		gap: 14px;
	}

	.asset-hero {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		min-height: 48px;
	}

	.asset-hero h1 {
		margin: 0;
		color: var(--color-text-primary);
		font-size: 30px;
		line-height: 36px;
		font-weight: 900;
		letter-spacing: 0;
	}

	.asset-hero p {
		margin: 5px 0 0;
		color: var(--color-text-secondary);
		font-size: 14px;
	}

	.asset-hero__actions {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.asset-summary-grid {
		display: grid;
		grid-template-columns: minmax(420px, 1.8fr) repeat(3, minmax(210px, 0.9fr));
		gap: 14px;
	}

	.summary-card {
		position: relative;
		overflow: hidden;
		min-height: 126px;
		padding: 18px 22px;
		background: var(--color-bg-card);
		border: 1px solid var(--color-border-soft);
		border-radius: 20px;
		box-shadow: 0 18px 38px rgba(15, 23, 42, 0.055);
	}

	.summary-card>span,
	.summary-card__top {
		color: var(--color-primary);
		font-size: 14px;
		font-weight: 800;
	}

	.summary-card strong {
		display: block;
		margin-top: 8px;
		color: var(--color-text-primary);
		font-size: 30px;
		line-height: 34px;
		font-weight: 900;
	}

	.summary-card--stat {
		overflow: visible;
	}

	.summary-card--stat:hover {
		z-index: 20;
	}

	.summary-card__popover {
		position: absolute;
		z-index: 30;
		top: calc(100% + 10px);
		left: 0;
		width: min(280px, calc(100vw - 32px));
		padding: 14px;
		color: var(--color-text-primary);
		background: rgba(255, 255, 255, 0.98);
		border: 1px solid var(--color-border-soft);
		border-radius: 14px;
		box-shadow: 0 18px 42px rgba(15, 23, 42, 0.16);
		backdrop-filter: blur(12px);
		display: none;
	}

	.summary-card--stat:hover .summary-card__popover,
	.summary-card--stat:focus-within .summary-card__popover {
		display: block;
	}

	.summary-card__popover-title {
		display: block;
		margin: 0 0 9px !important;
		font-size: 14px !important;
		line-height: 20px !important;
	}

	.summary-card__popover ul {
		display: grid;
		gap: 7px;
		max-height: 190px;
		margin: 0;
		padding: 0;
		overflow-y: auto;
		list-style: none;
	}

	.summary-card__popover li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-width: 0;
		padding-bottom: 7px;
		border-bottom: 1px solid var(--color-border-soft);
		font-size: 12px;
	}

	.summary-card__popover li span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.summary-card__popover li em,
	.summary-card__popover p {
		margin: 0;
		color: var(--color-text-tertiary);
		font-size: 11px;
		font-style: normal;
		white-space: nowrap;
	}

	.summary-card__amount {
		display: flex !important;
		align-items: center;
		gap: 8px;
		white-space: nowrap;
		font-size: clamp(22px, 2.25vw, 30px) !important;
	}

	.summary-card__visibility {
		display: inline-grid;
		width: 28px;
		height: 28px;
		place-items: center;
		padding: 0;
		color: currentColor;
		background: transparent;
		border: 0;
		border-radius: var(--radius-pill);
		cursor: pointer;
		opacity: 0.82;
	}

	.summary-card__visibility:hover {
		background: rgba(255, 255, 255, 0.16);
		opacity: 1;
	}

	.summary-card p {
		margin: 8px 0 0;
		color: var(--color-text-secondary);
		font-size: 13px;
	}

	.summary-card p b {
		color: inherit;
	}

	.summary-card p em {
		margin-left: 10px;
		color: inherit;
		font-style: normal;
	}

	.summary-card__top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.summary-card__icon {
		position: absolute;
		top: 18px;
		right: 18px;
		display: grid;
		width: 48px;
		height: 48px;
		place-items: center;
		border-radius: var(--radius-pill);
	}

	.summary-card--primary {
		min-height: 132px;
		color: #fff;
		background:
			radial-gradient(circle at 82% 6%, rgba(255, 255, 255, 0.34), transparent 28%),
			linear-gradient(135deg, #1f6bff 0%, #377dff 48%, #70a8ff 100%);
		border-color: transparent;
		box-shadow: 0 22px 46px rgba(38, 116, 255, 0.25);
	}

	.summary-card--primary .summary-card__top,
	.summary-card--primary strong,
	.summary-card--primary p {
		position: relative;
		z-index: 1;
		max-width: 60%;
		color: #fff;
	}

	.summary-card--primary .summary-card__sparkline {
		position: absolute;
		right: 24px;
		bottom: 20px;
		width: min(200px, 34%);
		height: 52px;
		opacity: 0.72;
	}

	.summary-card--primary .summary-card__sparkline polyline {
		fill: none;
		stroke: rgba(255, 255, 255, 0.94);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 4;
	}

	.summary-card--green {
		background: linear-gradient(135deg, #f0fff8 0%, #fbfffd 100%);
	}

	.summary-card--green>span,
	.summary-card--green p {
		color: #047857;
	}

	.summary-card--green .summary-card__icon {
		color: var(--color-success);
		background: rgba(22, 184, 120, 0.12);
	}

	.summary-card--orange {
		background: linear-gradient(135deg, #fff7eb 0%, #fffdf8 100%);
	}

	.summary-card--orange>span,
	.summary-card--orange p {
		color: #c26208;
	}

	.summary-card--orange .summary-card__icon {
		color: var(--color-warning);
		background: rgba(245, 158, 11, 0.14);
	}

	.summary-card--purple {
		background: linear-gradient(135deg, #f7f0ff 0%, #fffaff 100%);
	}

	.summary-card--purple>span,
	.summary-card--purple p {
		color: var(--color-purple);
	}

	.summary-card--purple .summary-card__icon {
		color: var(--color-purple);
		background: rgba(124, 58, 237, 0.12);
	}

	.asset-analytics {
		display: grid;
		grid-template-columns: 1fr 1.08fr 1fr;
		gap: 14px;
		align-items: stretch;
	}

	.analysis-card {
		box-sizing: border-box;
		height: 220px;
		min-height: 220px;
		padding: 17px 20px;
		background: var(--color-bg-card);
		border: 1px solid var(--color-border-soft);
		border-radius: 20px;
		box-shadow: 0 18px 38px rgba(15, 23, 42, 0.052);
	}

	.analysis-card__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.analysis-card__head h2 {
		margin: 0;
		color: var(--color-text-primary);
		font-size: 15px;
		line-height: 24px;
		font-weight: 900;
	}

	.analysis-card__head button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 30px;
		padding: 0 10px;
		color: var(--color-text-secondary);
		background: #fff;
		border: 1px solid var(--color-border-soft);
		border-radius: var(--radius-pill);
		cursor: pointer;
		font-weight: 700;
	}

	.analysis-select {
		position: relative;
	}

	.analysis-select__menu {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		z-index: 12;
		display: grid;
		min-width: 104px;
		padding: 5px;
		background: #fff;
		border: 1px solid var(--color-border-soft);
		border-radius: 12px;
		box-shadow: 0 16px 32px rgba(15, 23, 42, 0.14);
	}

	.analysis-select__menu button {
		justify-content: flex-start;
		width: 100%;
		border: 0;
		border-radius: 8px;
	}

	.analysis-select__menu button:hover,
	.analysis-select__menu button.active {
		color: var(--color-primary);
		background: var(--color-primary-light);
	}

	.composition-chart {
		display: grid;
		grid-template-columns: 96px minmax(0, 1fr);
		gap: 18px;
		align-items: center;
		margin-top: 16px;
	}

	.donut {
		position: relative;
		width: 92px;
		height: 92px;
		border-radius: var(--radius-pill);
	}

	.donut > i {
		position: absolute;
		inset: 25px;
		background: #fff;
		border-radius: inherit;
		box-shadow: inset 0 0 0 1px var(--color-border-soft);
	}

	.composition-list {
		display: grid;
		gap: 8px;
		max-height: 132px;
		overflow-y: auto;
		padding-right: 4px;
		scrollbar-width: thin;
	}

	.composition-list div {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto 52px;
		gap: 12px;
		align-items: center;
		color: var(--color-text-secondary);
		font-size: 11px;
		white-space: nowrap;
	}

	.composition-list span {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 8px;
	}

	.composition-list i {
		flex: 0 0 auto;
		width: 8px;
		height: 8px;
		border-radius: var(--radius-pill);
	}

	.composition-list b {
		color: var(--color-text-primary);
		font-weight: 700;
	}

	.composition-list em {
		color: var(--color-text-secondary);
		font-style: normal;
		text-align: right;
	}

	.trend-chart {
		position: relative;
		margin-top: 12px;
		padding: 0 4px;
	}

	.trend-chart svg {
		width: 100%;
		height: 126px;
		margin-left: 34px;
		width: calc(100% - 34px);
	}

	.composition-tooltip { position: absolute; z-index: 4; top: 50%; left: calc(100% + 10px); display: grid; grid-template-columns: 1fr auto; gap: 3px 8px; min-width: 120px; padding: 8px 10px; color: var(--color-text-primary); background: #fff; border: 1px solid var(--color-border-soft); border-radius: 8px; box-shadow: 0 8px 20px rgba(15, 23, 42, .16); transform: translateY(-50%); pointer-events: none; white-space: nowrap; }
	.composition-tooltip span { display: flex; align-items: center; gap: 5px; font-size: 11px; }
	.composition-tooltip span i { position: static; inset: auto; width: 8px; height: 8px; background: currentColor; border-radius: 50%; box-shadow: none; }
	.composition-tooltip b { font-size: 11px; }
	.composition-tooltip em { grid-column: 1 / -1; color: var(--color-text-tertiary); font-size: 10px; font-style: normal; }

	.trend-y-axis { position: absolute; top: 0; bottom: 28px; left: 0; width: 32px; color: var(--color-text-tertiary); font-size: 10px; text-align: right; }
	.trend-y-axis span { position: absolute; right: 0; transform: translateY(-50%); white-space: nowrap; }

	.trend-grid line {
		stroke: #e8eef7;
		stroke-width: 1;
	}

	.trend-chart polyline {
		fill: none;
		stroke: var(--color-primary);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 4;
	}

	.trend-chart circle {
		fill: #fff;
		stroke: var(--color-primary);
		stroke-width: 4;
		cursor: pointer;
		pointer-events: all;
	}

	.trend-chart .trend-hit-area {
		fill: transparent;
		stroke: transparent;
		stroke-width: 0;
	}

	.trend-labels {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		box-sizing: border-box;
		padding: 0 5.38%;
		color: var(--color-text-tertiary);
		font-size: 12px;
		text-align: center;
	}

	.trend-tooltip {
		position: absolute;
		transform: translateX(-50%);
		top: 36px;
		display: grid;
		gap: 5px;
		min-width: 134px;
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.88);
		border: 1px solid var(--color-border-soft);
		border-radius: 14px;
		box-shadow: var(--shadow-card);
		backdrop-filter: blur(12px);
	}

	.trend-tooltip span {
		color: var(--color-text-secondary);
		font-size: 12px;
	}

	.trend-tooltip strong {
		color: var(--color-text-primary);
		font-size: 13px;
	}

	.tabs {
		flex-wrap: wrap;
	}

	.asset-toolbar {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 14px;
		align-items: center;
	}

	.tabs,
	.view-switch,
	.asset-toolbar__right {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.tabs button {
		min-height: 38px;
		padding: 0 16px;
		color: var(--color-text-secondary);
		background: rgba(255, 255, 255, 0.82);
		border: 1px solid var(--color-border-soft);
		border-radius: var(--radius-pill);
		cursor: pointer;
		font-weight: 700;
		box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
	}

	.tabs button.active {
		color: #fff;
		background: var(--gradient-primary);
		border-color: transparent;
		box-shadow: 0 12px 26px rgba(38, 116, 255, 0.22);
	}

	.asset-toolbar__right {
		justify-self: end;
	}

	.asset-toolbar__right .r-select {
		width: 144px;
	}

	.view-switch {
		gap: 4px;
		padding: 4px;
		background: rgba(255, 255, 255, 0.82);
		border: 1px solid var(--color-border-soft);
		border-radius: 14px;
	}

	.view-switch button {
		display: grid;
		width: 32px;
		height: 32px;
		place-items: center;
		color: var(--color-text-secondary);
		background: transparent;
		border: 0;
		border-radius: 10px;
		cursor: pointer;
	}

	.view-switch button.active {
		color: var(--color-primary);
		background: var(--color-primary-light);
	}

	.asset-grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 16px;
	}

	.asset-table-card {
		overflow: hidden;
	}

	.simple-table {
		width: 100%;
		border-collapse: collapse;
	}

	.simple-table th,
	.simple-table td {
		height: 48px;
		padding: 0 var(--space-4);
		border-bottom: 1px solid var(--color-border-soft);
		font-size: var(--font-table);
		text-align: left;
	}

	.simple-table th {
		color: #667085;
		background: var(--color-bg-hover);
	}

	.simple-table tr {
		cursor: pointer;
	}

	.simple-table tr:hover {
		background: var(--color-bg-hover);
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		color: var(--color-text-secondary);
		font-size: 13px;
	}

	.delete-detail {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 30px;
		font-size: var(--font-table);
	}

	.delete-detail+.delete-detail {
		border-top: 1px solid var(--color-border-soft);
	}

	.delete-detail span {
		color: var(--color-text-tertiary);
	}

	.delete-detail strong {
		color: var(--color-text-primary);
	}

	@media (max-width: 1500px) {
		.asset-summary-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}

		.asset-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	@media (max-width: 1280px) {

		.asset-summary-grid,
		.asset-analytics {
			grid-template-columns: 1fr 1fr;
		}

		.asset-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
