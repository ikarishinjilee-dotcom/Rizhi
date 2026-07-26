<template>
	<section class="help-page">
		<header class="help-header">
			<div>
				<h1>使用帮助</h1>
				<p>从常用任务开始，快速找到对应功能和数据管理入口。</p>
			</div>
		</header>

		<RCard>
			<section class="help-section version-section">
				<div class="help-section__head version-section__head">
					<div>
						<h2>版本</h2>
						<p>查看正式线版本更新记录，了解每一版带来的新增、优化和修复。</p>
					</div>
					<span class="version-badge">v{{ currentVersion }}</span>
				</div>
				<div class="release-list">
					<article v-for="release in sortedReleases" :key="release.id"
						:ref="(element) => setReleaseItemRef(release.id, element)" class="release-item"
						:class="{ 'release-item--expanded': expandedReleaseIds.has(release.id) }">
						<div class="release-item__meta">
							<strong>v{{ release.version }}</strong><span>{{ release.date }}</span></div>
						<div class="release-item__groups">
							<div v-for="group in release.groups" :key="group.label" class="release-group">
								<span class="release-group__label"
									:class="`release-group__label--${group.type}`">{{ group.label }}</span>
								<ul v-if="group.items.length" class="release-group__list">
									<li v-for="item in group.items" :key="item">{{ item }}</li>
								</ul>
								<span v-else class="release-group__empty">暂无记录</span>
							</div>
						</div>
						<button v-if="expandableReleaseIds.has(release.id)" class="release-item__toggle" type="button"
							@click="toggleRelease(release.id)">{{ expandedReleaseIds.has(release.id) ? "收起" : "展开详情" }}</button>
					</article>
				</div>
			</section>
		</RCard>

		<div class="help-grid">
			<RouterLink v-for="item in taskLinks" :key="item.path" :to="item.path" class="help-task">
				<span class="help-task__icon">
					<component :is="item.icon" :size="20" />
				</span>
				<div><strong>{{ item.title }}</strong>
					<p>{{ item.description }}</p>
				</div>
				<ChevronRight :size="17" />
			</RouterLink>
		</div>

		<RCard>
			<section class="help-section">
				<div class="help-section__head">
					<h2>常见问题</h2>
					<p>以下说明按当前版本的功能和数据规则整理。</p>
				</div>
				<div class="faq-list">
					<details v-for="item in faqItems" :key="item.question">
						<summary>{{ item.question }}</summary>
						<p>{{ item.answer }}</p>
					</details>
				</div>
			</section>
		</RCard>

		<RCard>
			<section class="help-section help-section--backup">
				<div>
					<h2>保护本地数据</h2>
					<p>数据保存在当前浏览器中，建议定期导出 JSON 备份，换设备或浏览器后再导入。</p>
				</div>
				<RouterLink to="/settings/data">前往数据管理
					<ChevronRight :size="16" />
				</RouterLink>
			</section>
		</RCard>
	</section>
</template>

<script setup lang="ts">
	import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
	import { RouterLink } from "vue-router";
	import { Box, ChevronRight, CreditCard, DatabaseBackup, NotebookText, Tags } from "@lucide/vue";
	import RCard from "@/components/ui/RCard.vue";
	import { listReleaseNotes, releasePlatforms, type ManagedReleaseNote, type ReleasePlatform } from "@/services/releaseService";

	const currentPlatform = (releasePlatforms.some((item) => item.value === import.meta.env.VITE_APP_PLATFORM) ? import.meta.env.VITE_APP_PLATFORM : "web") as ReleasePlatform;
	const releases = ref<ManagedReleaseNote[]>([]);
	const currentVersion = ref("未知");
	const expandedReleaseIds = ref(new Set<string>());
	const expandableReleaseIds = ref(new Set<string>());
	const releaseItemElements = new Map<string, HTMLElement>();

	function setReleaseItemRef(id : string, element : unknown) { if (element instanceof HTMLElement) releaseItemElements.set(id, element); else releaseItemElements.delete(id); }
	function updateExpandableReleases() {
		const next = new Set<string>();
		for (const release of sortedReleases.value) {
			if (expandedReleaseIds.value.has(release.id)) { if (expandableReleaseIds.value.has(release.id)) next.add(release.id); continue; }
			const element = releaseItemElements.get(release.id);
			if (element && element.scrollHeight > element.clientHeight + 1) next.add(release.id);
		}
		expandableReleaseIds.value = next;
	}
	function toggleRelease(id : string) { const next = new Set(expandedReleaseIds.value); if (next.has(id)) next.delete(id); else next.add(id); expandedReleaseIds.value = next; }
	function compareVersions(left : string, right : string) {
		const a = left.replace(/^v/i, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
		const b = right.replace(/^v/i, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
		for (let i = 0; i < Math.max(a.length, b.length); i += 1) { const difference = (b[i] || 0) - (a[i] || 0); if (difference !== 0) return difference; }
		return 0;
	}
	const sortedReleases = computed(() => [...releases.value].sort((left, right) => right.date.localeCompare(left.date) || compareVersions(left.version, right.version)));
	onMounted(async () => { try { releases.value = await listReleaseNotes(currentPlatform, true); currentVersion.value = sortedReleases.value[0]?.version ?? "未知"; await nextTick(); updateExpandableReleases(); } catch { releases.value = []; } });
	window.addEventListener("resize", updateExpandableReleases);
	onUnmounted(() => window.removeEventListener("resize", updateExpandableReleases));

	const taskLinks = [
		{ title: "物品与资产", description: "新增资产、维护图片、添加附加项并查看使用状态。", path: "/assets", icon: Box },
		{ title: "收入与支出", description: "用统一的“记一笔”记录支出、收入和转账，并按日期查看明细。", path: "/ledger", icon: NotebookText },
		{ title: "资金账户", description: "管理现金、信用和充值账户，支持银行图标、账单日及还款日。", path: "/funds", icon: CreditCard },
		{ title: "个人分类", description: "维护自己的资产与记账分类；管理员默认分类只在首次创建账号时提供。", path: "/settings/categories", icon: Tags },
		{ title: "备份与恢复", description: "导出、导入或重置当前浏览器中的数据。", path: "/settings/data", icon: DatabaseBackup },
	];

	const faqItems = [
		{ question: "记录资产购买后，账户余额会同步吗？", answer: "会。保存资产、附加项或记账记录后，系统会生成关联流水并更新对应账户余额；如果不想影响账户，可选择“不选择账户”。" },
		{ question: "管理员默认分类和我的分类有什么区别？", answer: "两者完全独立。新用户首次创建账号时会复制管理员维护的默认分类，之后管理员新增、修改或删除默认分类，都不会影响已有用户的个人分类。" },
		{ question: "管理员删除默认分类会影响用户的历史记录吗？", answer: "不会。删除只作用于系统默认模板，不会删除或修改已有用户的个人分类和历史记录；默认模板中的子分类会随父分类一并处理。" },
		{ question: "如何记录支出、收入和转账？", answer: "点击“记一笔”，在弹窗顶部切换支出、收入或转账模式，再选择分类、账户和关联资产。保存后可在日账面板点击记录查看详情。" },
		{ question: "资金账户中的欠款应该填正数还是负数？", answer: "信用账户的当前欠款填正数，系统会在负债账户和相关汇总中按欠款语义展示，不需要手动输入负号。" },
		{ question: "银行卡或信用卡如何选择银行？", answer: "点击银行字段会打开银行选择弹窗，里面展示管理员维护的银行图标、名称和备注。管理员上传的自定义图标会在账户、记账和资产相关场景统一使用。" },
		{ question: "为什么没有看到管理中心？", answer: "管理中心按角色权限显示。超级管理员可以授予管理员权限和具体功能；普通用户不能进入系统管理，但始终可以在“我的 → 分类管理”中维护自己的个人分类。修改角色后请重新登录。" },
		{ question: "如何避免本地数据丢失？", answer: "定期进入“设置 → 数据管理”导出 JSON 备份；更换浏览器、设备或部署环境时，再使用导入功能恢复数据。" },
	];
</script>

<style scoped>
	.help-page {
		display: grid;
		gap: var(--space-5);
		max-width: 1180px;
		margin: 0 auto;
	}

	.help-header h1,
	.help-header p,
	.help-section h2,
	.help-section p {
		margin: 0;
	}

	.help-header h1 {
		font-size: var(--font-page-title);
	}

	.help-header p,
	.help-section p {
		margin-top: var(--space-1);
		color: var(--color-text-secondary);
		font-size: var(--font-table);
		line-height: 1.7;
	}

	.help-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-4);
	}

	.help-task {
		display: grid;
		grid-template-columns: 42px minmax(0, 1fr) 18px;
		gap: var(--space-3);
		align-items: center;
		min-height: 94px;
		padding: var(--space-4);
		color: var(--color-text-primary);
		background: #fff;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
	}

	.help-task:hover,
	.help-task:focus-visible {
		border-color: #9ec5ff;
		box-shadow: 0 10px 24px rgba(22, 119, 255, 0.1);
		outline: none;
		transform: translateY(-2px);
	}

	.help-task__icon {
		display: grid;
		width: 42px;
		height: 42px;
		place-items: center;
		color: var(--color-primary);
		background: var(--color-primary-light);
		border-radius: var(--radius-lg);
	}

	.help-task strong {
		font-size: var(--font-card-title);
	}

	.help-task p {
		margin: 4px 0 0;
		color: var(--color-text-tertiary);
		font-size: var(--font-caption);
		line-height: 1.55;
	}

	.help-task>svg {
		color: var(--color-text-tertiary);
	}

	.help-section {
		padding: var(--space-5);
	}

	.help-section__head {
		padding-bottom: var(--space-4);
		border-bottom: 1px solid var(--color-border);
	}

	.help-section h2 {
		font-size: var(--font-section-title);
	}

	.version-section__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.version-badge {
		flex: 0 0 auto;
		padding: 5px 10px;
		color: var(--color-primary);
		background: var(--color-primary-light);
		border-radius: var(--radius-pill);
		font-size: var(--font-caption);
		font-weight: 800;
	}

	.release-list {
		display: grid;
	}

	.release-item {
		position: relative;
		display: grid;
		grid-template-columns: 132px minmax(0, 1fr);
		gap: var(--space-6);
		height: 120px;
		min-height: 120px;
		box-sizing: border-box;
		padding: 14px 0 30px;
		overflow: hidden;
		transition: height 220ms ease;
	}

	.release-item--expanded {
		height: auto;
		min-height: 120px;
	}

	.release-item__toggle {
		position: absolute;
		right: 0;
		bottom: 10px;
		z-index: 1;
		padding: 0;
		color: var(--color-primary);
		font-size: var(--font-table);
		font-weight: 700;
		background: transparent;
		border: 0;
		cursor: pointer;
	}

	.release-item__toggle:hover {
		color: var(--color-primary-hover);
	}

	.release-item__meta {
		display: grid;
		align-content: start;
		gap: 4px;
	}

	.release-item__meta strong {
		color: var(--color-text-primary);
		font-size: var(--font-card-title);
	}

	.release-item__meta span,
	.release-group__empty {
		color: var(--color-text-tertiary);
		font-size: var(--font-caption);
	}

	.release-item__groups {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-4);
	}

	.release-group {
		padding: var(--space-3);
		background: var(--color-bg-hover);
		border-radius: var(--radius-md);
	}

	.release-group__label {
		display: inline-flex;
		padding: 2px 7px;
		border-radius: var(--radius-pill);
		font-size: var(--font-caption);
		font-weight: 700;
	}

	.release-group__label--new {
		color: var(--color-success);
		background: var(--color-success-light);
	}

	.release-group__label--improved {
		color: var(--color-primary);
		background: var(--color-primary-light);
	}

	.release-group__label--fixed {
		color: var(--color-danger);
		background: var(--color-danger-light);
	}

	.release-group__list {
		display: grid;
		gap: 4px;
		margin: var(--space-2) 0 0;
		padding-left: 18px;
		color: var(--color-text-secondary);
		font-size: var(--font-caption);
		line-height: 1.6;
	}

	.release-group__empty {
		display: block;
		margin-top: var(--space-2);
	}

	.faq-list details {
		border-bottom: 1px solid var(--color-border);
	}

	.faq-list details:last-child {
		border-bottom: 0;
	}

	.faq-list summary {
		padding: var(--space-4) 0;
		color: var(--color-text-primary);
		cursor: pointer;
		font-size: var(--font-table);
		font-weight: 700;
	}

	.faq-list details p {
		margin: 0;
		padding: 0 0 var(--space-4);
	}

	.help-section--backup {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-5);
	}

	.help-section--backup a {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--color-primary);
		font-size: var(--font-table);
		font-weight: 700;
		white-space: nowrap;
	}

	@media (max-width: 1000px) {
		.help-grid {
			grid-template-columns: 1fr;
		}

		.release-item {
			grid-template-columns: 1fr;
			gap: var(--space-3);
		}

		.release-item__groups {
			grid-template-columns: 1fr;
		}
	}
</style>