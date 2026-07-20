<template>
	<main class="admin-page">
		<header class="admin-header">
			<div><span>ADMINISTRATION</span>
				<h1>管理中心</h1>
				<p>维护全局系统字典与用户角色。</p>
			</div>
			<strong>
				<ShieldCheck :size="18" /> 管理员
			</strong>
		</header>
		<div class="admin-workspace">
			<nav class="admin-tabs">
				<span>系统配置</span>
				<button :class="{ active: activeTab === 'asset' }" @click="activeTab = 'asset'">资产与记账分类</button>
				<button :class="{ active: activeTab === 'account' }" @click="activeTab = 'account'">资金账户类型</button>
				<button :class="{ active: activeTab === 'bank' }" @click="activeTab = 'bank'">银行管理</button>
				<span>权限控制</span>
				<button v-if="isSuperAdmin()" :class="{ active: activeTab === 'permissions' }" @click="activeTab = 'permissions'">管理员权限设置</button>
				<button v-if="canManagePermission('system_users')" :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">用户与角色</button>
				<button :class="{ active: activeTab === 'branding' }" @click="activeTab = 'branding'">网站与首页</button>
			</nav>
			<div class="admin-content">
				<SystemDictionaryPanel v-if="activeTab === 'asset'" domain="asset" />
				<SystemDictionaryPanel v-else-if="activeTab === 'account'" domain="account" />
				<SystemDictionaryPanel v-else-if="activeTab === 'bank'" domain="bank" />
				<SiteBrandingPanel v-else-if="activeTab === 'branding'" />
				<AdminPermissionPanel v-else-if="activeTab === 'permissions' && isSuperAdmin()"
					:permission-roles="permissionRoles" :permission-rows="permissionRows"
					:permission-matrix="permissionMatrix" :permission-message="permissionMessage"
					:permission-message-tone="permissionMessageTone" @save="savePermissionMatrix" />
				<AdminUsersPanel v-else-if="canManagePermission('system_users')"
					:users="users" :loading="loading" :saving-user-id="savingUserId" :message="message"
					:message-tone="messageTone" :username-query="usernameQuery" :searching-user="searchingUser"
					:searched-user="searchedUser" :role-label="roleLabel" :can-change-status="canChangeStatus"
					:is-super-admin="isSuperAdmin" @refresh="loadUsers" @search="searchUserByUsername"
					@update:username-query="usernameQuery = $event" @role-change="requestRoleChange"
					@status-change="requestStatusChange" />
			</div>
		</div>
		<DeleteConfirmModal v-model:show="confirmVisible" eyebrow="角色变更"
			:title="pendingUser?.roles.includes('admin') ? '取消管理员身份？' : '授予管理员身份？'"
			:description="pendingUser ? `${pendingUser.nickname || pendingUser.username} 的权限将在下次登录时更新。` : ''"
			:confirm-text="pendingUser?.roles.includes('admin') ? '确认取消' : '确认授予'" :loading="Boolean(savingUserId)"
			@confirm="confirmRoleChange" />
		<DeleteConfirmModal v-model:show="statusConfirmVisible" eyebrow="账户状态"
			:title="pendingStatusUser?.status === 1 ? '恢复该用户账户？' : '停用该用户账户？'"
			:description="pendingStatusUser ? (pendingStatusUser.status === 1 ? `${pendingStatusUser.nickname || pendingStatusUser.username} 将可以重新登录并使用日值。` : `${pendingStatusUser.nickname || pendingStatusUser.username} 将立即无法继续登录日值，已有业务数据不会删除。`) : ''"
			:confirm-text="pendingStatusUser?.status === 1 ? '确认恢复' : '确认停用'" :loading="Boolean(savingUserId)"
			@confirm="confirmStatusChange" />
	</main>
</template>
<script setup lang="ts">
	import { onMounted, ref } from "vue";
	import { ShieldCheck } from "@lucide/vue";
	import RButton from "@/components/ui/RButton.vue";
	import DeleteConfirmModal from "@/components/business/DeleteConfirmModal.vue";
	import SystemDictionaryPanel from "./SystemDictionaryPanel.vue";
	import SiteBrandingPanel from "./SiteBrandingPanel.vue";
	import AdminPermissionPanel from "./AdminPermissionPanel.vue";
	import AdminUsersPanel from "./AdminUsersPanel.vue";
	import { findAdminUserByUsername, listAdminUsers, setUserAdminRole, setUserEnabled, type AdminUser } from "@/services/adminService";
	import { isAdmin, isSuperAdmin } from "@/services/authService";
	import { getCloudPermissionMatrix, updateCloudPermissionMatrix, normalizePermissionMatrix, type PartialPermissionMatrix, type PermissionKey, type PermissionMatrix } from "@/services/permissionService";
	const activeTab = ref<"asset" | "account" | "bank" | "branding" | "permissions" | "users">("asset");
	const users = ref<AdminUser[]>([]), loading = ref(false), savingUserId = ref(""), message = ref("");
	const messageTone = ref<"success" | "danger">("success"), confirmVisible = ref(false), pendingUser = ref<AdminUser | null>(null);
	const statusConfirmVisible = ref(false), pendingStatusUser = ref<AdminUser | null>(null);
	const usernameQuery = ref(""), searchingUser = ref(false), searchedUser = ref<AdminUser | null>(null);
	const permissionMessage = ref("");
	const permissionMessageTone = ref<"success" | "danger">("success");
	const permissionRoles = [
		{ key: "super_admin", label: "超级管理员" },
		{ key: "admin", label: "管理员" },
		{ key: "user", label: "普通用户" },
	] as const;
	const permissionRows = [
		{ key: "system_users", label: "用户与角色", description: "管理用户、角色和账号状态" },
		{ key: "default_categories", label: "默认资产与记账分类", description: "维护新用户使用的默认分类" },
		{ key: "account_types", label: "资金账户类型", description: "维护现金、信用和充值账户类型" },
		{ key: "banks", label: "银行管理", description: "维护银行名称、图标和备注" },
		{ key: "branding", label: "网站与首页", description: "维护网站图标、首页文案和主视觉" },
	] as const;
	const permissionMatrixVersion = "2";
	const permissionDefaults: PermissionMatrix = {
		super_admin: Object.fromEntries(permissionRows.map((item) => [item.key, true])) as Record<PermissionKey, boolean>,
		admin: Object.fromEntries(permissionRows.map((item) => [item.key, true])) as Record<PermissionKey, boolean>,
		user: Object.fromEntries(permissionRows.map((item) => [item.key, false])) as Record<PermissionKey, boolean>,
	};
	const permissionMatrix = ref<PermissionMatrix>(loadPermissionMatrix());
	const permissionMatrixLoadedFromCloud = ref(false);
	function loadPermissionMatrix(): PermissionMatrix {
		try {
			if (localStorage.getItem("rizhi_permission_matrix_version") !== permissionMatrixVersion) {
				return structuredClone(permissionDefaults);
			}
			const stored = localStorage.getItem("rizhi_permission_matrix");
			if (!stored) return structuredClone(permissionDefaults);
			const parsed = JSON.parse(stored) as PartialPermissionMatrix;
			return {
				super_admin: { ...permissionDefaults.super_admin, ...(parsed.super_admin || {}) },
				admin: { ...permissionDefaults.admin, ...(parsed.admin || {}) },
				user: { ...permissionDefaults.user, ...(parsed.user || {}) },
			};
		} catch { return structuredClone(permissionDefaults); }
	}
	async function loadCloudPermissionMatrix() {
		try {
			permissionMatrix.value = await getCloudPermissionMatrix();
			permissionMatrixLoadedFromCloud.value = true;
		} catch {
			permissionMatrixLoadedFromCloud.value = false;
		}
	}
	async function savePermissionMatrix() {
		try {
			if (permissionMatrixLoadedFromCloud.value) permissionMatrix.value = await updateCloudPermissionMatrix(permissionMatrix.value);
			localStorage.setItem("rizhi_permission_matrix", JSON.stringify(permissionMatrix.value));
			localStorage.setItem("rizhi_permission_matrix_version", permissionMatrixVersion);
			permissionMessageTone.value = "success";
			permissionMessage.value = "权限设置已保存。";
		} catch {
			permissionMessageTone.value = "danger";
			permissionMessage.value = "权限设置保存失败，请重试。";
		}
	}
	function canManagePermission(permission: PermissionKey) {
		if (isSuperAdmin()) return true;
		if (!isAdmin()) return false;
		return permissionMatrix.value.admin[permission] === true;
	}
	async function loadUsers() { loading.value = true; message.value = ""; try { users.value = await listAdminUsers() } catch (error) { message.value = error instanceof Error ? error.message : "用户加载失败"; messageTone.value = "danger" } finally { loading.value = false } }
	async function searchUserByUsername() { const username = usernameQuery.value.trim(); if (!username || searchingUser.value) { if (!username) { messageTone.value = "danger"; message.value = "请输入用户名后再搜索。"; } return; } searchingUser.value = true; searchedUser.value = null; message.value = ""; try { searchedUser.value = await findAdminUserByUsername(username); } catch (error) { messageTone.value = "danger"; message.value = error instanceof Error ? error.message : "用户搜索失败"; } finally { searchingUser.value = false; } }
	function requestRoleChange(user : AdminUser) { pendingUser.value = user; confirmVisible.value = true }
	function roleLabel(user : AdminUser) { return user.roles.includes("super_admin") ? "超级管理员" : user.roles.includes("admin") ? "管理员" : "普通用户" }
	async function confirmRoleChange() { if (!pendingUser.value) return; savingUserId.value = pendingUser.value.id; try { await setUserAdminRole(pendingUser.value.id, !pendingUser.value.roles.includes("admin")); confirmVisible.value = false; message.value = "用户角色已更新。"; messageTone.value = "success"; await loadUsers() } catch (error) { message.value = error instanceof Error ? error.message : "角色更新失败"; messageTone.value = "danger" } finally { savingUserId.value = "" } }
	function canChangeStatus(user : AdminUser) { if (user.isCurrent || user.roles.includes("super_admin")) return false; return isSuperAdmin() || !user.roles.includes("admin") }
	function requestStatusChange(user : AdminUser) { pendingStatusUser.value = user; statusConfirmVisible.value = true }
	async function confirmStatusChange() { if (!pendingStatusUser.value) return; savingUserId.value = pendingStatusUser.value.id; try { await setUserEnabled(pendingStatusUser.value.id, pendingStatusUser.value.status === 1); statusConfirmVisible.value = false; message.value = pendingStatusUser.value.status === 1 ? "用户账户已恢复。" : "用户账户已停用。"; messageTone.value = "success"; await loadUsers() } catch (error) { message.value = error instanceof Error ? error.message : "账户状态更新失败"; messageTone.value = "danger" } finally { savingUserId.value = "" } }
	onMounted(() => {
		permissionMatrix.value = loadPermissionMatrix();
		void loadCloudPermissionMatrix().finally(() => { if (canManagePermission("system_users")) void loadUsers(); });
	});
</script>
<style scoped>
	.admin-page {
		display: grid;
		gap: 24px;
		padding: 32px
	}

	.admin-header,
	.panel-heading {
		display: flex;
		justify-content: space-between
	}

	.admin-header {
		padding: 4px 4px 20px;
		border-bottom: 1px solid var(--color-border)
	}

	.admin-header span {
		color: var(--color-primary);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: .08em
	}

	.admin-header h1 {
		margin: 7px 0;
		font-size: 30px
	}

	.admin-page p {
		margin: 0;
		color: var(--color-text-muted)
	}

	.admin-header>strong {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 40px;
		padding: 0 14px;
		color: var(--color-primary);
		background: var(--color-primary-light);
		border: 1px solid #cfe0ff;
		border-radius: 10px
	}

	.admin-workspace {
		display: grid;
		grid-template-columns: 190px minmax(0, 1fr);
		gap: 22px;
		align-items: start
	}

	.admin-tabs {
		position: sticky;
		top: 76px;
		display: grid;
		gap: 5px;
		padding: 10px;
		background: #fff;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		box-shadow: 0 8px 24px rgba(15, 23, 42, .04)
	}

	.admin-tabs>span {
		padding: 12px 10px 5px;
		color: var(--color-text-muted);
		font-size: 10px;
		font-weight: 800;
		letter-spacing: .08em
	}

	.admin-tabs button {
		min-height: 40px;
		padding: 0 12px;
		color: var(--color-text-secondary);
		text-align: left;
		background: none;
		border: 0;
		border-radius: 8px;
		font-weight: 700
	}

	.admin-tabs button:hover {
		background: var(--color-bg-hover)
	}

	.admin-tabs button.active {
		color: var(--color-primary);
		background: var(--color-primary-light)
	}

	.admin-content {
		min-width: 0
	}

	.users-panel {
		display: grid;
		gap: 16px;
		padding: 24px;
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		box-shadow: 0 12px 30px rgba(15, 23, 42, .04)
	}

	.admin-user-search {
		display: grid;
		gap: 12px;
		padding: 16px;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border);
		border-radius: 10px;
	}

	.admin-user-search p {
		margin-top: 4px;
		font-size: 13px;
	}

	.admin-user-search__controls {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 104px;
		gap: 10px;
		align-items: center;
	}

	.admin-user-search__controls :deep(.r-button) {
		width: 104px;
		padding-inline: 8px;
	}

	.admin-user-search__result {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto;
		gap: 10px;
		align-items: center;
		padding-top: 4px;
	}

	.admin-user-search__result small {
		display: block;
		margin-top: 3px;
		color: var(--color-text-muted);
	}

	.permission-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
	}

	.permission-matrix {
		display: grid;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		overflow: hidden;
	}
	.permission-matrix__row {
		display: grid;
		grid-template-columns: minmax(240px, 1.6fr) repeat(3, minmax(120px, 1fr));
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		border-top: 1px solid var(--color-border);
	}
	.permission-matrix__row:first-child { border-top: 0; }
	.permission-matrix__header { background: var(--color-bg-subtle); color: var(--color-text-secondary); font-size: 12px; font-weight: 700; }
	.permission-matrix__header span:not(:first-child) { text-align: center; }
	.permission-matrix__row strong { display: block; }
	.permission-matrix__row small { display: block; margin-top: 4px; color: var(--color-text-muted); font-size: 12px; }
	.permission-check { display: flex; justify-content: center; align-items: center; gap: 7px; color: var(--color-text-secondary); font-size: 12px; text-align: center; }
	.permission-check input { accent-color: var(--color-primary); }
	.permission-actions { display: flex; justify-content: flex-end; margin-top: 14px; }

	.permission-card {
		padding: 18px;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border);
		border-radius: 10px;
	}

	.permission-card--super {
		background: linear-gradient(135deg, #eff6ff, #f7fbff);
		border-color: #bed8ff;
	}

	.permission-card > span {
		color: var(--color-primary);
		font-size: 12px;
		font-weight: 800;
	}

	.permission-card h3 {
		margin: 8px 0 12px;
		font-size: 16px;
	}

	.permission-card ul {
		display: grid;
		gap: 7px;
		margin: 0;
		padding-left: 18px;
		color: var(--color-text-secondary);
		font-size: 13px;
		line-height: 1.55;
	}

	.user-list {
		display: grid
	}

	.user-row {
		display: grid;
		grid-template-columns: auto minmax(180px, 1fr) auto auto;
		align-items: center;
		gap: 14px;
		padding: 15px 0;
		border-top: 1px solid var(--color-border)
	}

	.avatar {
		display: grid;
		width: 40px;
		height: 40px;
		place-items: center;
		overflow: hidden;
		color: #fff;
		background: var(--color-primary);
		border-radius: 10px;
		font-weight: 800
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover
	}

	.user-row small {
		display: block;
		margin-top: 4px;
		color: var(--color-text-muted)
	}

	.user-badges,
	.user-actions {
		display: flex;
		align-items: center;
		gap: 8px
	}

	.role-tag,
	.status-tag {
		padding: 5px 9px;
		background: var(--color-bg-subtle);
		border-radius: 999px;
		font-size: 12px;
		white-space: nowrap
	}

	.role-tag.admin {
		color: var(--color-primary);
		background: var(--color-primary-light)
	}

	.status-tag {
		color: var(--color-success);
		background: #ecfdf3
	}

	.status-tag.disabled {
		color: var(--color-danger);
		background: #fff1f1
	}

	.panel-state {
		padding: 36px;
		text-align: center;
		color: var(--color-text-muted)
	}

	@media(max-width:900px) {
		.admin-workspace {
			grid-template-columns: 1fr
		}

		.admin-tabs {
			position: static;
			grid-template-columns: repeat(2, 1fr)
		}

		.admin-tabs>span {
			grid-column: 1/-1
		}

		.user-row {
			grid-template-columns: auto 1fr
		}

		.admin-user-search__controls {
			grid-template-columns: 1fr
		}

		.admin-user-search__result {
			grid-template-columns: auto 1fr
		}

		.permission-grid {
			grid-template-columns: 1fr
		}

		.admin-user-search__result .role-tag,
		.admin-user-search__result :deep(.r-button) {
			grid-column: 2
		}

		.user-badges,
		.user-actions {
			grid-column: 2;
			justify-content: flex-start;
			flex-wrap: wrap
		}
	}
</style>
