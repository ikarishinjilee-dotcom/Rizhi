<template>
	<header class="topbar">
		<div ref="searchRoot" class="global-search">
			<RInput v-model="query" class="topbar__search" placeholder="全局搜索（资产、交易、账户）" @focus="searchOpen = true"
				@keydown="handleSearchKeydown">
				<template #prefix>
					<Search :size="15" />
				</template>
			</RInput>
			<button v-if="query" class="global-search__clear" type="button" aria-label="清空搜索" @click="clearSearch">
				<X :size="14" />
			</button>

			<div v-if="searchOpen && normalizedQuery" class="global-search__panel">
				<template v-if="searchResults.length">
					<p class="global-search__summary">找到 {{ searchResults.length }} 个结果</p>
					<button v-for="(result, index) in searchResults" :key="`${result.kind}-${result.id}`" type="button"
						class="global-search__result" :class="{ active: selectedIndex === index }"
						@mouseenter="selectedIndex = index" @click="openResult(result)">
						<span class="global-search__result-icon" :class="`is-${result.kind}`">
							<component :is="result.icon" :size="16" />
						</span>
						<span class="global-search__result-copy">
							<strong>{{ result.title }}</strong>
							<small>{{ result.description }}</small>
						</span>
						<span class="global-search__result-meta">{{ result.meta }}</span>
						<ChevronRight :size="15" />
					</button>
					<p v-if="totalMatchCount > searchResults.length" class="global-search__more">
						仅展示最相关的 {{ searchResults.length }} 项
					</p>
				</template>
				<div v-else class="global-search__empty">
					<SearchX :size="22" />
					<strong>没有找到相关内容</strong>
					<span>尝试搜索名称、品牌、商家、备注或账户机构。</span>
				</div>
			</div>
		</div>
		<div class="topbar__actions">
			<span v-if="isTestEnvironment" class="environment-badge">测试环境</span>
			<div ref="notificationRoot" class="notification-center">
				<button class="topbar__icon-button" type="button" aria-label="打开通知中心" :aria-expanded="notificationOpen"
					@click="notificationOpen = !notificationOpen">
					<Bell :size="17" />
					<span v-if="notificationCount"
						class="notification-badge">{{ notificationCount > 99 ? "99+" : notificationCount }}</span>
				</button>
				<div v-if="notificationOpen" class="notification-panel">
					<div class="notification-panel__head">
						<div>
							<strong>通知中心</strong>
							<span>{{ unreadNotificationCount ? `${unreadNotificationCount} 条未读提醒` : "当前没有未读提醒" }}</span>
						</div>
						<div class="notification-panel__head-actions">
							<button type="button" aria-label="提醒设置" :class="{ active: notificationSettingsOpen }"
								@click="toggleNotificationSettings">
								<Settings2 :size="16" />
							</button>
							<button type="button" aria-label="关闭通知中心" @click="notificationOpen = false">
								<X :size="16" />
							</button>
						</div>
					</div>
					<div v-if="notificationSettingsOpen" class="notification-settings">
						<div class="notification-settings__title">
							<strong>提醒阈值</strong>
							<span>满足条件后才进入通知中心。</span>
						</div>
						<label>
							<span>提前过保提醒</span>
							<div>
								<RInput v-model="notificationDraft.warrantyDays" /><em>天</em>
							</div>
						</label>
						<label>
							<span>提前还款提醒</span>
							<div>
								<RInput v-model="notificationDraft.repaymentDays" /><em>天</em>
							</div>
						</label>
						<label>
							<span>闲置提醒</span>
							<div>
								<RInput v-model="notificationDraft.idleDays" /><em>天</em>
							</div>
						</label>
						<p v-if="notificationSettingsMessage" class="notification-settings__message"
							:class="{ danger: notificationSettingsTone === 'danger' }">
							{{ notificationSettingsMessage }}
						</p>
						<div class="notification-settings__actions">
							<button class="primary" type="button" @click="saveNotificationSettings">保存设置</button>
							<button v-if="ignoredNotificationIds.size" type="button"
								@click="restoreIgnoredNotifications">
								恢复 {{ ignoredNotificationIds.size }} 条已忽略提醒
							</button>
						</div>
					</div>
					<template v-else>
						<div class="notification-toolbar">
							<div>
								<button type="button" :class="{ active: notificationView === 'unread' }"
									@click="notificationView = 'unread'">
									未读 {{ unreadNotificationCount }}
								</button>
								<button type="button" :class="{ active: notificationView === 'all' }"
									@click="notificationView = 'all'">
									全部 {{ notifications.length }}
								</button>
							</div>
							<button v-if="unreadNotificationCount" type="button"
								@click="markAllNotificationsRead">全部已读</button>
						</div>
						<div v-if="visibleNotifications.length" class="notification-list">
							<div v-for="item in visibleNotifications" :key="item.id" class="notification-item"
								:class="{ read: readNotificationIds.has(item.id) }" role="button" tabindex="0"
								@click="openNotification(item)" @keydown.enter.prevent="openNotification(item)">
								<span class="notification-item__icon" :class="`is-${item.tone}`">
									<component :is="item.icon" :size="17" />
								</span>
								<span class="notification-item__copy">
									<strong>{{ item.title }}</strong>
									<small>{{ item.description }}</small>
								</span>
								<span class="notification-item__meta" :class="`is-${item.tone}`">{{ item.meta }}</span>
								<button class="notification-item__ignore" type="button" aria-label="忽略这条提醒"
									@click.stop="ignoreNotification(item)">
									<EyeOff :size="14" />
								</button>
								<ChevronRight :size="15" />
							</div>
						</div>
						<div v-else class="notification-empty">
							<BellRing :size="23" />
							<strong>{{ notificationView === "unread" ? "没有未读提醒" : "没有需要处理的提醒" }}</strong>
							<span>{{ notificationView === "unread" ? "可以切换到“全部”查看已读内容。" : "资产保修、还款日和闲置状态都很正常。" }}</span>
						</div>
					</template>
				</div>
			</div>
			<div ref="accountRoot" class="account-menu" @mouseenter="openAccountMenu"
				@mouseleave="scheduleAccountMenuClose">
				<button class="account-menu__trigger" type="button" :aria-expanded="accountMenuOpen" aria-label="打开账户菜单"
					@click="toggleAccountMenu">
					<span class="topbar__avatar">
						<img v-if="profile.avatarDataUrl" :src="profile.avatarDataUrl" alt="" />
						<span v-else>{{ profileInitial }}</span>
					</span>
					<span>{{ profile.displayName }}</span>
					<ChevronDown :size="14" />
				</button>
				<div v-if="accountMenuOpen" class="account-menu__panel">
					<div class="account-menu__identity">
						<strong>{{ profile.displayName }}</strong>
						<span>{{ authSession.username || "日值账户" }}</span>
						<em class="account-menu__role">{{ accountRoleLabel }}</em>
					</div>
					<button type="button" @click="openProfile">
						<UserRound :size="16" />
						个人资料
					</button>
					<button class="danger" type="button" @click="showLogoutConfirm = true; accountMenuOpen = false">
						<LogOut :size="16" />
						退出登录
					</button>
				</div>
			</div>
		</div>

		<DeleteConfirmModal v-model:show="showLogoutConfirm" eyebrow="账户操作" title="确认退出当前账户？"
			description="退出后，本机将清除登录凭证。重新登录后仍可继续访问云端数据。" confirm-text="确认退出" :loading="loggingOut"
			@confirm="confirmLogout" />
	</header>
</template>

<script setup lang="ts">
	import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
	import { useRouter } from "vue-router";
	import { Bell, BellRing, Box, CalendarClock, ChevronDown, ChevronRight, CreditCard, EyeOff, LogOut, NotebookText, PackageOpen, Search, SearchX, Settings2, ShieldAlert, UserRound, X } from "@lucide/vue";
	import DeleteConfirmModal from "@/components/business/DeleteConfirmModal.vue";
	import RInput from "@/components/ui/RInput.vue";
	import type { UserSettingsRecord } from "@/domain/models";
	import { authSession, isAdmin, isSuperAdmin, logout } from "@/services/authService";
	import { SETTINGS_UPDATED_EVENT, settingsService } from "@/services/settingsService";
	import { useAppDataStore } from "@/stores/appDataStore";

	type SearchResult = {
		id : string;
		kind : "asset" | "transaction" | "account";
		title : string;
		description : string;
		meta : string;
		icon : typeof Box;
		keywords : string;
	};

	type NotificationItem = {
		id : string;
		targetId : string;
		kind : "warranty" | "repayment" | "idle";
		title : string;
		description : string;
		meta : string;
		tone : "danger" | "warning" | "neutral";
		icon : typeof Bell;
		priority : number;
	};

	const router = useRouter();
	const store = useAppDataStore();
	const isTestEnvironment = import.meta.env.VITE_APP_ENV === "test";
	const searchRoot = ref<HTMLElement | null>(null);
	const notificationRoot = ref<HTMLElement | null>(null);
	const accountRoot = ref<HTMLElement | null>(null);
	const query = ref("");
	const searchOpen = ref(false);
	const notificationOpen = ref(false);
	const accountMenuOpen = ref(false);
	let accountMenuCloseTimer: number | undefined;
	const showLogoutConfirm = ref(false);
	const loggingOut = ref(false);
	const notificationSettingsOpen = ref(false);
	const notificationView = ref<"unread" | "all">("unread");
	const readNotificationIds = ref(new Set<string>());
	const ignoredNotificationIds = ref(new Set<string>());
	const notificationSettingsMessage = ref("");
	const notificationSettingsTone = ref<"success" | "danger">("success");
	const notificationPreferences = reactive({
		warrantyDays: 90,
		repaymentDays: 30,
		idleDays: 30,
	});
	const notificationDraft = reactive({
		warrantyDays: "90",
		repaymentDays: "30",
		idleDays: "30",
	});
	const selectedIndex = ref(0);
	const profile = reactive({
		displayName: authSession.username || "未设置",
		avatarDataUrl: undefined as string | undefined,
	});
	const profileInitial = computed(() => profile.displayName.trim().charAt(0).toUpperCase() || "R");
	const accountRoleLabel = computed(() => isSuperAdmin() ? "超级管理员" : isAdmin() ? "管理员" : "普通用户");
	const normalizedQuery = computed(() => query.value.trim().toLocaleLowerCase("zh-CN"));
	const allSearchResults = computed<SearchResult[]>(() => [
		...store.assets.map((asset) => {
			const category = store.categories.find((item) => item.id === asset.categoryId);
			return {
				id: asset.id,
				kind: "asset" as const,
				title: asset.name,
				description: [asset.brand, asset.model, category?.name].filter(Boolean).join(" · ") || "物品资产",
				meta: formatCurrency(asset.currentValue ?? asset.originalCost),
				icon: Box,
				keywords: [asset.name, asset.brand, asset.model, category?.name, asset.merchant, asset.notes, asset.orderNo].filter(Boolean).join(" ").toLocaleLowerCase("zh-CN"),
			};
		}),
		...store.transactions.map((transaction) => {
			const account = store.accounts.find((item) => item.id === transaction.accountId);
			const asset = transaction.assetId ? store.assets.find((item) => item.id === transaction.assetId) : undefined;
			const categoryName = transaction.categorySnapshot?.subCategoryName
				?? transaction.categorySnapshot?.categoryName
				?? store.categories.find((item) => item.id === transaction.subCategoryId)?.name
				?? store.categories.find((item) => item.id === transaction.categoryId)?.name
				?? "未分类";
			return {
				id: transaction.id,
				kind: "transaction" as const,
				title: transaction.merchant || transaction.note || categoryName,
				description: [categoryName, account?.name, asset?.name].filter(Boolean).join(" · "),
				meta: `${isIncomeTransaction(transaction.type) ? "+" : "-"}${formatCurrency(transaction.amount)}`,
				icon: NotebookText,
				keywords: [transaction.merchant, transaction.note, categoryName, account?.name, asset?.name].filter(Boolean).join(" ").toLocaleLowerCase("zh-CN"),
			};
		}),
		...store.activeAccounts.map((account) => ({
			id: account.id,
			kind: "account" as const,
			title: account.name,
			description: [account.institution, account.direction === "asset" ? "资产账户" : "负债账户"].filter(Boolean).join(" · "),
			meta: formatCurrency(account.balance),
			icon: CreditCard,
			keywords: [account.name, account.institution, account.note].filter(Boolean).join(" ").toLocaleLowerCase("zh-CN"),
		})),
	]);
	const matchedSearchResults = computed(() => {
		const keyword = normalizedQuery.value;
		if (!keyword) return [];
		return allSearchResults.value
			.filter((item) => item.keywords.includes(keyword))
			.sort((left, right) => searchScore(right, keyword) - searchScore(left, keyword));
	});
	const totalMatchCount = computed(() => matchedSearchResults.value.length);
	const searchResults = computed(() => matchedSearchResults.value.slice(0, 8));
	const notifications = computed<NotificationItem[]>(() => {
		const warrantyItems = store.assets
			.filter((asset) => asset.status !== "disposed" && asset.status !== "transferred" && asset.warrantyEndDate)
			.map((asset) => {
				const days = daysFromToday(asset.warrantyEndDate!);
				return {
					id: `warranty-${asset.id}`,
					targetId: asset.id,
					kind: "warranty" as const,
					title: asset.name,
					description: `保修到期日 ${formatDate(asset.warrantyEndDate!)}`,
					meta: days < 0 ? `已过保 ${Math.abs(days)} 天` : days === 0 ? "今天过保" : `${days} 天后过保`,
					tone: days <= 7 ? "danger" as const : "warning" as const,
					icon: ShieldAlert,
					priority: days < 0 ? -1000 + days : days,
				};
			})
			.filter((item) => item.priority < 0 || item.priority <= notificationPreferences.warrantyDays);

		const repaymentItems = store.liabilityAccounts
			.filter((account) => account.balance > 0 && account.repaymentDay)
			.map((account) => {
				const days = daysUntilMonthlyDay(account.repaymentDay!);
				return {
					id: `repayment-${account.id}`,
					targetId: account.id,
					kind: "repayment" as const,
					title: account.name,
					description: `当前欠款 ${formatCurrency(account.balance)} · 每月 ${account.repaymentDay} 日`,
					meta: days === 0 ? "今天还款" : `${days} 天后还款`,
					tone: days <= 3 ? "danger" as const : days <= 7 ? "warning" as const : "neutral" as const,
					icon: CalendarClock,
					priority: days,
				};
			})
			.filter((item) => item.priority <= notificationPreferences.repaymentDays);

		const idleItems = store.assets
			.filter((asset) => asset.status === "idle" || Boolean(asset.idleSince))
			.map((asset) => {
				const sourceDate = asset.idleSince || asset.lastUsedAt || asset.updatedAt;
				const days = Math.max(0, -daysFromToday(sourceDate));
				return {
					id: `idle-${asset.id}`,
					targetId: asset.id,
					kind: "idle" as const,
					title: asset.name,
					description: `从 ${formatDate(sourceDate)} 起未继续使用`,
					meta: `已闲置 ${days} 天`,
					tone: days >= 90 ? "warning" as const : "neutral" as const,
					icon: PackageOpen,
					priority: 100 - days,
				};
			})
			.filter((item) => Number(item.meta.match(/\d+/)?.[0] ?? 0) >= notificationPreferences.idleDays);

		return [...warrantyItems, ...repaymentItems, ...idleItems]
			.filter((item) => !ignoredNotificationIds.value.has(item.id))
			.sort((left, right) => left.priority - right.priority)
			.slice(0, 20);
	});
	const unreadNotifications = computed(() => notifications.value.filter((item) => !readNotificationIds.value.has(item.id)));
	const unreadNotificationCount = computed(() => unreadNotifications.value.length);
	const notificationCount = computed(() => unreadNotificationCount.value);
	const visibleNotifications = computed(() => notificationView.value === "unread" ? unreadNotifications.value : notifications.value);

	watch(normalizedQuery, () => {
		selectedIndex.value = 0;
		if (normalizedQuery.value) searchOpen.value = true;
	});

	function searchScore(result : SearchResult, keyword : string) {
		const title = result.title.toLocaleLowerCase("zh-CN");
		if (title === keyword) return 100;
		if (title.startsWith(keyword)) return 80;
		if (title.includes(keyword)) return 60;
		return result.keywords.startsWith(keyword) ? 40 : 20;
	}

	function formatCurrency(value : number) {
		return new Intl.NumberFormat("zh-CN", {
			style: "currency",
			currency: "CNY",
			minimumFractionDigits: 2,
		}).format(value);
	}

	function formatDate(value : string) {
		return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
	}

	function daysFromToday(value : string) {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const targetValue = new Date(value);
		const target = new Date(targetValue.getFullYear(), targetValue.getMonth(), targetValue.getDate());
		return Math.round((target.getTime() - today.getTime()) / 86_400_000);
	}

	function daysUntilMonthlyDay(day : number) {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const target = new Date(now.getFullYear(), now.getMonth(), day);
		if (target < today) target.setMonth(target.getMonth() + 1);
		return Math.round((target.getTime() - today.getTime()) / 86_400_000);
	}

	function isIncomeTransaction(type : string) {
		return type === "income" || type === "refund";
	}

	function moveSelection(direction : number) {
		if (!searchResults.value.length) return;
		searchOpen.value = true;
		selectedIndex.value = (selectedIndex.value + direction + searchResults.value.length) % searchResults.value.length;
	}

	function handleSearchKeydown(event : KeyboardEvent) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			moveSelection(1);
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			moveSelection(-1);
		} else if (event.key === "Enter") {
			event.preventDefault();
			openSelectedResult();
		} else if (event.key === "Escape") {
			event.preventDefault();
			closeSearch();
		}
	}

	function openSelectedResult() {
		const result = searchResults.value[selectedIndex.value];
		if (result) openResult(result);
	}

	async function openResult(result : SearchResult) {
		closeSearch();
		if (result.kind === "asset") await router.push(`/assets/${result.id}`);
		if (result.kind === "account") await router.push({ path: "/funds", query: { accountId: result.id } });
		if (result.kind === "transaction") await router.push({ path: "/ledger", query: { transactionId: result.id } });
	}

	async function openNotification(item : NotificationItem) {
		await markNotificationRead(item.id);
		notificationOpen.value = false;
		if (item.kind === "repayment") {
			await router.push({ path: "/funds", query: { accountId: item.targetId } });
		} else {
			await router.push(`/assets/${item.targetId}`);
		}
	}

	async function markNotificationRead(id : string) {
		if (readNotificationIds.value.has(id)) return;
		readNotificationIds.value = new Set([...readNotificationIds.value, id]);
		await settingsService.update({ notificationReadIds: [...readNotificationIds.value] });
	}

	async function markAllNotificationsRead() {
		readNotificationIds.value = new Set([
			...readNotificationIds.value,
			...notifications.value.map((item) => item.id),
		]);
		await settingsService.update({ notificationReadIds: [...readNotificationIds.value] });
	}

	async function ignoreNotification(item : NotificationItem) {
		ignoredNotificationIds.value = new Set([...ignoredNotificationIds.value, item.id]);
		await settingsService.update({ notificationIgnoredIds: [...ignoredNotificationIds.value] });
	}

	async function restoreIgnoredNotifications() {
		ignoredNotificationIds.value = new Set();
		await settingsService.update({ notificationIgnoredIds: [] });
		notificationSettingsTone.value = "success";
		notificationSettingsMessage.value = "已恢复全部忽略提醒。";
	}

	async function saveNotificationSettings() {
		const warrantyDays = Number(notificationDraft.warrantyDays);
		const repaymentDays = Number(notificationDraft.repaymentDays);
		const idleDays = Number(notificationDraft.idleDays);
		if ([warrantyDays, repaymentDays, idleDays].some((value) => !Number.isInteger(value) || value < 0 || value > 3650)) {
			notificationSettingsTone.value = "danger";
			notificationSettingsMessage.value = "提醒天数需为 0 至 3650 之间的整数。";
			return;
		}

		notificationPreferences.warrantyDays = warrantyDays;
		notificationPreferences.repaymentDays = repaymentDays;
		notificationPreferences.idleDays = idleDays;
		await settingsService.update({
			warrantyReminderDays: warrantyDays,
			repaymentReminderDays: repaymentDays,
			idleReminderDays: idleDays,
		});
		notificationSettingsTone.value = "success";
		notificationSettingsMessage.value = "提醒阈值已保存。";
	}

	function toggleNotificationSettings() {
		notificationSettingsOpen.value = !notificationSettingsOpen.value;
		notificationSettingsMessage.value = "";
	}

	function clearSearch() {
		query.value = "";
		selectedIndex.value = 0;
		nextTick(() => searchRoot.value?.querySelector<HTMLInputElement>("input")?.focus());
	}

	function closeSearch() {
		searchOpen.value = false;
		query.value = "";
		selectedIndex.value = 0;
	}

	function handlePointerDown(event : PointerEvent) {
		if (!searchRoot.value?.contains(event.target as Node)) searchOpen.value = false;
		if (!notificationRoot.value?.contains(event.target as Node)) notificationOpen.value = false;
		if (!accountRoot.value?.contains(event.target as Node)) {
			clearAccountMenuCloseTimer();
			accountMenuOpen.value = false;
		}
	}

	function clearAccountMenuCloseTimer() {
		if (accountMenuCloseTimer !== undefined) {
			window.clearTimeout(accountMenuCloseTimer);
			accountMenuCloseTimer = undefined;
		}
	}

	function openAccountMenu() {
		clearAccountMenuCloseTimer();
		accountMenuOpen.value = true;
	}

	function scheduleAccountMenuClose() {
		clearAccountMenuCloseTimer();
		accountMenuCloseTimer = window.setTimeout(() => {
			accountMenuOpen.value = false;
			accountMenuCloseTimer = undefined;
		}, 220);
	}

	function toggleAccountMenu() {
		clearAccountMenuCloseTimer();
		accountMenuOpen.value = !accountMenuOpen.value;
	}

	async function openProfile() {
		accountMenuOpen.value = false;
		await router.push("/settings/profile");
	}

	async function confirmLogout() {
		if (loggingOut.value) return;
		loggingOut.value = true;
		try {
			await logout();
			store.clearSessionData();
			showLogoutConfirm.value = false;
			await router.replace("/login");
		} finally {
			loggingOut.value = false;
		}
	}

	function applySettings(settings : UserSettingsRecord) {
		profile.displayName = settings.displayName || authSession.username || "未设置";
		profile.avatarDataUrl = settings.avatarDataUrl;
		readNotificationIds.value = new Set(settings.notificationReadIds ?? []);
		ignoredNotificationIds.value = new Set(settings.notificationIgnoredIds ?? []);
		notificationPreferences.warrantyDays = settings.warrantyReminderDays ?? 90;
		notificationPreferences.repaymentDays = settings.repaymentReminderDays ?? 30;
		notificationPreferences.idleDays = settings.idleReminderDays ?? 30;
		notificationDraft.warrantyDays = String(notificationPreferences.warrantyDays);
		notificationDraft.repaymentDays = String(notificationPreferences.repaymentDays);
		notificationDraft.idleDays = String(notificationPreferences.idleDays);
	}

	function handleSettingsUpdated(event : Event) {
		applySettings((event as CustomEvent<UserSettingsRecord>).detail);
	}

	onMounted(async () => {
		await store.init().catch(() => undefined);
		applySettings(await settingsService.get().catch(() => ({
			id: "default" as const,
			currency: "CNY" as const,
			locale: "zh-CN" as const,
			theme: "light" as const,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})));
		window.addEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
		document.addEventListener("pointerdown", handlePointerDown);
	});

	onBeforeUnmount(() => {
		clearAccountMenuCloseTimer();
		window.removeEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
		document.removeEventListener("pointerdown", handlePointerDown);
	});
</script>

<style scoped>
	.topbar {
		position: fixed;
		z-index: 1000;
		top: 0;
		right: max(0px, calc((100vw - 1608px) / 2));
		left: max(128px, calc((100vw - 1608px) / 2 + 128px));
		display: flex;
		align-items: center;
		justify-content: center;
		height: 56px;
		padding: 0 var(--space-6);
		background: radial-gradient(circle at 18% -10%, rgba(38, 116, 255, 0.08), transparent 34%), radial-gradient(circle at 86% 0%, rgba(124, 58, 237, 0.06), transparent 30%), var(--color-bg-page);
		/* background: var(--color-bg-page); */
		border-bottom: 0;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
	}

	.global-search {
		position: relative;
		width: 360px;
	}

	.topbar__search {
		width: 100%;
	}

	.global-search :deep(.n-input__prefix) {
		color: var(--color-text-tertiary);
	}

	.global-search__clear {
		position: absolute;
		z-index: 2;
		top: 50%;
		right: 8px;
		display: grid;
		width: 22px;
		height: 22px;
		place-items: center;
		color: var(--color-text-tertiary);
		background: transparent;
		border: 0;
		border-radius: 4px;
		cursor: pointer;
		transform: translateY(-50%);
	}

	.global-search__clear:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-hover);
	}

	.global-search__panel {
		position: absolute;
		z-index: 1200;
		top: calc(100% + 10px);
		left: 0;
		width: 520px;
		padding: 8px;
		background: #fff;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-popover);
	}

	.global-search__summary,
	.global-search__more {
		margin: 0;
		padding: 7px 10px;
		color: var(--color-text-tertiary);
		font-size: 11px;
	}

	.global-search__result {
		display: grid;
		grid-template-columns: 34px minmax(0, 1fr) auto 16px;
		gap: 10px;
		align-items: center;
		width: 100%;
		min-height: 52px;
		padding: 7px 10px;
		color: var(--color-text-primary);
		background: transparent;
		border: 0;
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
	}

	.global-search__result:hover,
	.global-search__result.active {
		background: var(--color-primary-soft);
	}

	.global-search__result-icon {
		display: grid;
		width: 34px;
		height: 34px;
		place-items: center;
		color: var(--color-primary);
		background: var(--color-primary-light);
		border-radius: var(--radius-md);
	}

	.global-search__result-icon.is-transaction {
		color: var(--color-success);
		background: var(--color-success-light);
	}

	.global-search__result-icon.is-account {
		color: var(--color-purple);
		background: var(--color-purple-light);
	}

	.global-search__result-copy {
		min-width: 0;
		display: grid;
		gap: 3px;
	}

	.global-search__result-copy strong,
	.global-search__result-copy small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.global-search__result-copy strong {
		font-size: 13px;
	}

	.global-search__result-copy small {
		color: var(--color-text-tertiary);
		font-size: 11px;
	}

	.global-search__result-meta {
		color: var(--color-text-secondary);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.global-search__empty {
		display: grid;
		justify-items: center;
		gap: 7px;
		padding: 34px 20px;
		color: var(--color-text-tertiary);
		text-align: center;
	}

	.global-search__empty strong {
		color: var(--color-text-primary);
		font-size: 13px;
	}

	.global-search__empty span {
		font-size: 11px;
	}

	.topbar__actions {
		position: absolute;
		right: var(--space-6);
		display: flex;
		align-items: center;
		gap: var(--space-4);
		color: var(--color-text-secondary);
		font-size: 12px;
	}

	.environment-badge {
		padding: 4px 8px;
		color: #b54708;
		font-weight: 600;
		background: #fffaeb;
		border: 1px solid #fedf89;
		border-radius: 999px;
	}

	.topbar::after {
		display: none;
	}

	.notification-center {
		position: relative;
	}

	.topbar__icon-button {
		position: relative;
		display: grid;
		width: 30px;
		height: 30px;
		place-items: center;
		color: var(--color-text-secondary);
		background: transparent;
		border: 0;
		border-radius: 50%;
		cursor: pointer;
	}

	.topbar__icon-button:hover,
	.topbar__icon-button[aria-expanded="true"] {
		color: var(--color-primary);
		background: var(--color-primary-light);
	}

	.notification-badge {
		position: absolute;
		top: -4px;
		right: -6px;
		display: grid;
		min-width: 17px;
		height: 17px;
		padding: 0 4px;
		place-items: center;
		color: #fff;
		background: var(--color-danger);
		border: 2px solid #fff;
		border-radius: 9px;
		font-size: 9px;
		font-weight: 800;
	}

	.notification-panel {
		position: absolute;
		z-index: 1200;
		top: calc(100% + 12px);
		right: -48px;
		width: 400px;
		max-height: min(620px, calc(100vh - 80px));
		overflow: hidden;
		background: #fff;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-popover);
	}

	.notification-panel__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		border-bottom: 1px solid var(--color-border);
	}

	.notification-panel__head>div:first-child {
		display: grid;
		gap: 4px;
	}

	.notification-panel__head-actions {
		display: flex;
		gap: 4px;
	}

	.notification-panel__head strong {
		color: var(--color-text-primary);
		font-size: 14px;
	}

	.notification-panel__head span {
		color: var(--color-text-tertiary);
		font-size: 11px;
	}

	.notification-panel__head button {
		display: grid;
		width: 28px;
		height: 28px;
		place-items: center;
		color: var(--color-text-tertiary);
		background: transparent;
		border: 0;
		border-radius: var(--radius-md);
		cursor: pointer;
	}

	.notification-panel__head button:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-hover);
	}

	.notification-panel__head button.active {
		color: var(--color-primary);
		background: var(--color-primary-light);
	}

	.notification-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 42px;
		padding: 5px 12px;
		border-bottom: 1px solid var(--color-border);
	}

	.notification-toolbar>div {
		display: flex;
		gap: 4px;
	}

	.notification-toolbar button {
		height: 28px;
		padding: 0 9px;
		color: var(--color-text-tertiary);
		background: transparent;
		border: 0;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 11px;
	}

	.notification-toolbar button:hover,
	.notification-toolbar button.active {
		color: var(--color-primary);
		background: var(--color-primary-light);
	}

	.notification-settings {
		display: grid;
		gap: 14px;
		padding: 18px;
	}

	.notification-settings__title {
		display: grid;
		gap: 4px;
	}

	.notification-settings__title strong {
		color: var(--color-text-primary);
		font-size: 13px;
	}

	.notification-settings__title span {
		color: var(--color-text-tertiary);
		font-size: 11px;
	}

	.notification-settings label {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 118px;
		gap: 12px;
		align-items: center;
		color: var(--color-text-secondary);
		font-size: 12px;
		font-weight: 700;
	}

	.notification-settings label>div {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 24px;
		gap: 6px;
		align-items: center;
	}

	.notification-settings label em {
		color: var(--color-text-tertiary);
		font-size: 11px;
		font-style: normal;
	}

	.notification-settings__message {
		margin: 0;
		color: var(--color-success);
		font-size: 11px;
	}

	.notification-settings__message.danger {
		color: var(--color-danger);
	}

	.notification-settings__actions {
		display: flex;
		gap: 8px;
		padding-top: 4px;
	}

	.notification-settings__actions button {
		min-height: 30px;
		padding: 0 11px;
		color: var(--color-text-secondary);
		background: #fff;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 11px;
		font-weight: 700;
	}

	.notification-settings__actions button.primary {
		color: #fff;
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.notification-list {
		max-height: min(548px, calc(100vh - 152px));
		overflow-y: auto;
		padding: 6px;
	}

	.notification-item {
		display: grid;
		grid-template-columns: 36px minmax(0, 1fr) auto 28px 16px;
		gap: 10px;
		align-items: center;
		width: 100%;
		min-height: 62px;
		padding: 9px 10px;
		color: var(--color-text-primary);
		background: transparent;
		border: 0;
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
	}

	.notification-item:hover {
		background: var(--color-bg-hover);
	}

	.notification-item.read {
		opacity: 0.68;
	}

	.notification-item:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-primary) 35%, transparent);
		outline-offset: -2px;
	}

	.notification-item__icon {
		display: grid;
		width: 36px;
		height: 36px;
		place-items: center;
		color: var(--color-text-secondary);
		background: #eef2f7;
		border-radius: 10px;
	}

	.notification-item__icon.is-danger {
		color: var(--color-danger);
		background: var(--color-danger-light);
	}

	.notification-item__icon.is-warning {
		color: #d97706;
		background: var(--color-warning-light);
	}

	.notification-item__copy {
		min-width: 0;
		display: grid;
		gap: 4px;
	}

	.notification-item__copy strong,
	.notification-item__copy small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.notification-item__copy strong {
		font-size: 12px;
	}

	.notification-item__copy small {
		color: var(--color-text-tertiary);
		font-size: 10px;
	}

	.notification-item__meta {
		color: var(--color-text-secondary);
		font-size: 10px;
		white-space: nowrap;
	}

	.notification-item__meta.is-danger {
		color: var(--color-danger);
	}

	.notification-item__meta.is-warning {
		color: #d97706;
	}

	.notification-item__ignore {
		display: grid;
		width: 28px;
		height: 28px;
		place-items: center;
		color: var(--color-text-tertiary);
		background: transparent;
		border: 0;
		border-radius: var(--radius-md);
		cursor: pointer;
		opacity: 0;
	}

	.notification-item:hover .notification-item__ignore,
	.notification-item:focus-within .notification-item__ignore {
		opacity: 1;
	}

	.notification-item__ignore:hover {
		color: var(--color-danger);
		background: var(--color-danger-light);
	}

	.notification-empty {
		display: grid;
		justify-items: center;
		gap: 7px;
		padding: 44px 20px;
		color: var(--color-text-tertiary);
		text-align: center;
	}

	.notification-empty strong {
		color: var(--color-text-primary);
		font-size: 13px;
	}

	.notification-empty span {
		font-size: 11px;
	}

	.topbar__avatar {
		overflow: hidden;
		display: grid;
		width: 28px;
		height: 28px;
		place-items: center;
		color: #fff;
		background: #f2d3b5;
		border-radius: 50%;
		font-weight: 800;
	}

	.topbar__avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.account-menu {
		position: relative;
	}

	.account-menu::after {
		position: absolute;
		z-index: 1199;
		top: 100%;
		right: 0;
		width: 210px;
		height: 8px;
		content: "";
	}

	.account-menu__trigger {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 4px 6px;
		color: var(--color-text-secondary);
		background: transparent;
		border: 0;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.account-menu__trigger:hover,
	.account-menu__trigger[aria-expanded="true"] {
		color: var(--color-text-primary);
		background: var(--color-bg-hover);
	}

	.account-menu__panel {
		position: absolute;
		z-index: 1200;
		top: calc(100% + 6px);
		right: 0;
		width: 210px;
		padding: var(--space-2);
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-popover);
	}

	.account-menu__identity {
		display: grid;
		gap: 2px;
		margin-bottom: var(--space-2);
		padding: var(--space-3);
		border-bottom: 1px solid var(--color-border);
	}

	.account-menu__identity strong {
		overflow: hidden;
		color: var(--color-text-primary);
		font-size: 13px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.account-menu__identity span {
		overflow: hidden;
		color: var(--color-text-tertiary);
		font-size: 11px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.account-menu__panel>button {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: 9px 10px;
		color: var(--color-text-secondary);
		background: transparent;
		border: 0;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 12px;
		text-align: left;
	}

	.account-menu__panel>button:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-hover);
	}

	.account-menu__role {
		width: fit-content;
		margin-top: 4px;
		padding: 3px 7px;
		color: var(--color-primary);
		background: var(--color-primary-light);
		border-radius: var(--radius-pill);
		font-size: 10px;
		font-style: normal;
		font-weight: 700;
	}

	.account-menu__panel>button.danger {
		color: var(--color-danger);
	}
</style>
