<template>
	<section class="branding-panel">
		<div class="panel-heading">
			<div>
				<h2>网站与首页</h2>
				<p>统一维护网站图标，以及首页欢迎区的品牌、文案和主视觉。</p>
			</div>
			<RButton :loading="loading" @click="load">刷新</RButton>
		</div>
		<RInlineFeedback v-if="message" :tone="messageTone">{{ message }}</RInlineFeedback>

		<section class="branding-section">
			<div class="section-heading">
				<div>
					<h3>网站图标</h3>
					<p>侧边栏 Logo、主 Logo 与浏览器 favicon 分别管理；主 Logo 用于登录、注册等公共页面。</p>
				</div>
			</div>
			<div class="branding-grid">
				<article class="branding-card">
					<div class="branding-card__header">
						<h4>侧边栏 Logo</h4><span class="branding-badge">导航</span>
					</div>
					<div class="branding-preview branding-preview--logo"><img :src="branding.logoUrl"
							alt="当前侧边栏 Logo" /></div>
					<input ref="logoInput" class="branding-file" type="file" accept="image/png,image/jpeg,image/webp"
						@change="upload('logo', $event)" />
					<RButton variant="secondary" :loading="uploading === 'logo'" @click="logoInput?.click()">更换 Logo
					</RButton>
				</article>
				<article class="branding-card">
					<div class="branding-card__header">
						<h4>主 Logo</h4><span class="branding-badge branding-badge--purple">公共页面</span>
					</div>
					<div class="branding-preview branding-preview--main-logo"><img :src="branding.mainLogoUrl"
							alt="当前主 Logo" /></div>
					<input ref="mainLogoInput" class="branding-file" type="file"
						accept="image/png,image/jpeg,image/webp" @change="upload('mainLogo', $event)" />
					<RButton variant="secondary" :loading="uploading === 'mainLogo'" @click="mainLogoInput?.click()">更换主
						Logo
					</RButton>
				</article>
				<article class="branding-card">
					<div class="branding-card__header">
						<h4>浏览器 favicon</h4><span class="branding-badge branding-badge--purple">浏览器</span>
					</div>
					<div class="branding-preview branding-preview--favicon"><img :src="branding.faviconUrl"
							alt="当前 favicon" /></div>
					<input ref="faviconInput" class="branding-file" type="file" accept="image/png,image/jpeg,image/webp"
						@change="upload('favicon', $event)" />
					<RButton variant="secondary" :loading="uploading === 'favicon'" @click="faviconInput?.click()">更换
						favicon</RButton>
				</article>
			</div>
		</section>

		<section class="branding-section">
			<div class="section-heading">
				<div>
					<h3>首页欢迎区</h3>
					<p>首页顶部的品牌锁定图、标题、说明与右侧插画。</p>
				</div>
				<RButton :loading="saving" @click="saveHome">保存首页内容</RButton>
			</div>
			<div class="home-editor">
				<div class="home-editor__fields">
					<label><span>首页标题</span>
						<RInput v-model="branding.homeTitle" placeholder="输入首页主标题" />
					</label>
					<label><span>首页说明</span><textarea v-model="branding.homeDescription"
							placeholder="输入首页说明文案，换行会保留在页面中" /></label>
				</div>
				<div class="home-editor__media">
					<article class="branding-card">
						<div class="branding-card__header">
							<h4>品牌锁定图</h4><span class="branding-badge">品牌</span>
						</div>
						<div class="branding-preview branding-preview--home-logo"><img :src="branding.homeLogoUrl"
								alt="当前首页品牌锁定图" /></div>
						<input ref="homeLogoInput" class="branding-file" type="file"
							accept="image/png,image/jpeg,image/webp" @change="upload('homeLogo', $event)" />
						<RButton variant="secondary" :loading="uploading === 'homeLogo'"
							@click="homeLogoInput?.click()">更换品牌图</RButton>
					</article>
					<article class="branding-card">
						<div class="branding-card__header">
							<a href="">




								；
							</a>
							<h4>首页主视觉</h4><span class="branding-badge branding-badge--purple">插画</span>
						</div>
						<div class="branding-preview branding-preview--hero"><img :src="branding.homeHeroUrl"
								alt="当前首页主视觉" /></div>
						<input ref="homeHeroInput" class="branding-file" type="file"
							accept="image/png,image/jpeg,image/webp" @change="upload('homeHero', $event)" />
						<RButton variant="secondary" :loading="uploading === 'homeHero'"
							@click="homeHeroInput?.click()">更换主视觉</RButton>
					</article>
				</div>
			</div>
		</section>
	</section>
</template>

<script setup lang="ts">
	import { onMounted, reactive, ref } from "vue";
	import RButton from "@/components/ui/RButton.vue";
	import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
	import RInput from "@/components/ui/RInput.vue";
	import { siteBrandingService, type SiteBranding } from "@/services/siteBrandingService";

	const logoInput = ref<HTMLInputElement | null>(null);
	const mainLogoInput = ref<HTMLInputElement | null>(null);
	const faviconInput = ref<HTMLInputElement | null>(null);
	const homeLogoInput = ref<HTMLInputElement | null>(null);
	const homeHeroInput = ref<HTMLInputElement | null>(null);
	const branding = reactive<SiteBranding>({
		logoUrl: "/rizhi-logo-mark.png", mainLogoUrl: "/rizhi-logo-lockup.png", faviconUrl: "/rizhi-logo-mark.png", homeLogoUrl: "/rizhi-logo-lockup.png", homeHeroUrl: "/dashboard-hero.png",
		homeTitle: "把资产、交易与物品，\n整理成更清晰的生活秩序", homeDescription: "在 Rizhi，统一管理你的交易、资产与物品，清楚每一笔收支，\n掌握资产状况，物品去向不再遗忘，重要事项及时提醒，\n让生活与财务井井有条。",
	});
	const loading = ref(false), saving = ref(false), uploading = ref<"logo" | "mainLogo" | "favicon" | "homeLogo" | "homeHero" | "">("");
	const message = ref("");
	const messageTone = ref<"success" | "danger">("success");

	async function load() { loading.value = true; message.value = ""; try { Object.assign(branding, await siteBrandingService.get()); } catch (error) { messageTone.value = "danger"; message.value = error instanceof Error ? error.message : "网站配置加载失败"; } finally { loading.value = false; } }
	async function upload(kind : "logo" | "mainLogo" | "favicon" | "homeLogo" | "homeHero", event : Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = ""; if (!file) return; uploading.value = kind; message.value = ""; try { Object.assign(branding, await siteBrandingService.upload(file, kind)); message.value = "图片已更新"; messageTone.value = "success"; } catch (error) { messageTone.value = "danger"; message.value = error instanceof Error ? error.message : "图片上传失败"; } finally { uploading.value = ""; } }
	async function saveHome() { saving.value = true; message.value = ""; try { Object.assign(branding, await siteBrandingService.update({ homeTitle: branding.homeTitle.trim(), homeDescription: branding.homeDescription.trim() })); message.value = "首页内容已保存"; messageTone.value = "success"; } catch (error) { messageTone.value = "danger"; message.value = error instanceof Error ? error.message : "首页内容保存失败"; } finally { saving.value = false; } }
	onMounted(load);
</script>

<style scoped>
	.branding-panel,
	.branding-section,
	.home-editor,
	.home-editor__fields,
	.home-editor__media {
		display: grid;
		gap: 18px
	}

	.branding-panel {
		padding: 24px;
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		box-shadow: 0 12px 30px rgba(15, 23, 42, .04)
	}

	.panel-heading {
		order: -2
	}

	.branding-panel>.branding-section:nth-of-type(2) {
		order: -1
	}

	.panel-heading,
	.section-heading,
	.branding-card__header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px
	}

	.panel-heading h2,
	.section-heading h3,
	.branding-card h4 {
		margin: 0
	}

	.panel-heading h2 {
		font-size: 22px
	}

	.panel-heading p,
	.section-heading p {
		margin: 6px 0 0;
		color: var(--color-text-muted)
	}

	.branding-section {
		padding-top: 20px;
		border-top: 1px solid var(--color-border)
	}

	.section-heading h3 {
		font-size: 17px
	}

	.branding-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px
	}

	.branding-card {
		display: grid;
		gap: 14px;
		padding: 18px;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border);
		border-radius: 14px
	}

	.branding-badge {
		height: 24px;
		padding: 0 9px;
		display: grid;
		place-items: center;
		color: var(--color-primary);
		background: var(--color-primary-light);
		border-radius: 999px;
		font-size: 11px;
		font-weight: 700
	}

	.branding-badge--purple {
		color: #7c3aed;
		background: #f2eafe
	}

	.branding-preview {
		display: grid;
		place-items: center;
		height: 150px;
		background: #fff;
		border: 1px dashed var(--color-border);
		border-radius: 12px
	}

	.branding-preview img {
		max-width: 82%;
		max-height: 112px;
		object-fit: contain
	}

	.branding-preview--favicon img {
		width: 82px;
		height: 82px
	}

	.branding-preview--main-logo img {
		max-width: 92%;
		max-height: 104px
	}

	.branding-preview--hero img {
		max-width: 94%;
		max-height: 130px
	}

	.branding-file {
		display: none
	}

	.home-editor {
		grid-template-columns: minmax(0, .8fr) minmax(420px, 1.2fr);
		align-items: start
	}

	.home-editor__fields label {
		display: grid;
		gap: 8px;
		color: var(--color-text-secondary);
		font-size: 13px;
		font-weight: 700
	}

	.home-editor__fields textarea {
		min-height: 140px;
		resize: vertical;
		padding: 11px 12px;
		color: var(--color-text-primary);
		font: inherit;
		line-height: 1.7;
		background: #fff;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		outline: none
	}

	.home-editor__fields textarea:focus {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(38, 116, 255, .12)
	}

	.home-editor__media {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px
	}

	@media(max-width:960px) {
		.home-editor {
			grid-template-columns: 1fr
		}

		.home-editor__media {
			grid-template-columns: 1fr
		}
	}

	@media(max-width:700px) {
		.branding-grid {
			grid-template-columns: 1fr
		}

		.panel-heading,
		.section-heading {
			align-items: stretch;
			flex-direction: column
		}
	}
</style>