<template>
  <section class="users-panel">
    <div class="panel-heading"><div><h2>用户与角色</h2><p>角色变更将在用户下次登录时生效。</p></div><RButton variant="secondary" :loading="loading" @click="$emit('refresh')">刷新</RButton></div>
    <div class="admin-user-search">
      <div><strong>按用户名新增管理员</strong><p>输入登录用户名搜索；昵称不能用于查找。只有超级管理员可授予管理员身份。</p></div>
      <div class="admin-user-search__controls"><RInput :model-value="usernameQuery" placeholder="输入用户名" @update:model-value="$emit('update:username-query', $event)" @keydown.enter.prevent="$emit('search')" /><RButton variant="secondary" :loading="searchingUser" @click="$emit('search')">搜索用户</RButton></div>
      <div v-if="searchedUser" class="admin-user-search__result"><span class="avatar"><img v-if="searchedUser.avatar" :src="searchedUser.avatar" alt="" /><template v-else>{{ (searchedUser.nickname || searchedUser.username || "U").slice(0, 1).toUpperCase() }}</template></span><div><strong>{{ searchedUser.nickname || searchedUser.username }}</strong><small>@{{ searchedUser.username }}</small></div><span class="role-tag" :class="{ admin: searchedUser.roles.includes('admin') || searchedUser.roles.includes('super_admin') }">{{ roleLabel(searchedUser) }}</span><RButton v-if="!searchedUser.roles.includes('admin') && !searchedUser.roles.includes('super_admin')" :disabled="savingUserId === searchedUser.id" @click="$emit('role-change', searchedUser)">设为管理员</RButton></div>
    </div>
    <RInlineFeedback v-if="message" :tone="messageTone">{{ message }}</RInlineFeedback>
    <div v-if="loading" class="panel-state">正在加载用户...</div><div v-else-if="!users.length" class="panel-state">暂无用户</div>
    <div v-else class="user-list"><article v-for="user in users" :key="user.id" class="user-row"><div class="avatar"><img v-if="user.avatar" :src="user.avatar" alt="" /><template v-else>{{ (user.nickname || user.username || "U").slice(0, 1).toUpperCase() }}</template></div><div><strong>{{ user.nickname || user.username }}</strong><small>@{{ user.username }} · {{ user.id }}</small></div><div class="user-badges"><span class="role-tag" :class="{ admin: user.roles.includes('admin') || user.roles.includes('super_admin') }">{{ roleLabel(user) }}</span><span class="status-tag" :class="{ disabled: user.status === 1 }">{{ user.status === 1 ? "已停用" : "正常" }}</span></div><div class="user-actions"><RButton v-if="isSuperAdmin() && !user.roles.includes('super_admin')" variant="secondary" :disabled="savingUserId === user.id" @click="$emit('role-change', user)">{{ user.roles.includes("admin") ? "取消管理员" : "设为管理员" }}</RButton><RButton v-if="canChangeStatus(user)" :variant="user.status === 1 ? 'secondary' : 'danger'" :disabled="savingUserId === user.id" @click="$emit('status-change', user)">{{ user.status === 1 ? "恢复账户" : "停用账户" }}</RButton></div></article></div>
  </section>
</template>
<script setup lang="ts">
import RButton from "@/components/ui/RButton.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import RInput from "@/components/ui/RInput.vue";
import type { AdminUser } from "@/services/adminService";
defineProps<{ users: AdminUser[]; loading: boolean; savingUserId: string; message: string; messageTone: "success" | "danger"; usernameQuery: string; searchingUser: boolean; searchedUser: AdminUser | null; roleLabel: (user: AdminUser) => string; canChangeStatus: (user: AdminUser) => boolean; isSuperAdmin: () => boolean; }>();
defineEmits<{ refresh: []; search: []; "update:username-query": [value: string]; "role-change": [user: AdminUser]; "status-change": [user: AdminUser] }>();
</script>
<style scoped>
.users-panel { display: grid; gap: 16px; padding: 24px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 12px; box-shadow: 0 12px 30px rgba(15, 23, 42, .04); }
.panel-heading { display: flex; justify-content: space-between; }
.panel-heading p { margin: 0; color: var(--color-text-muted); }
.admin-user-search { display: grid; gap: 12px; padding: 16px; background: var(--color-bg-subtle); border: 1px solid var(--color-border); border-radius: 10px; }
.admin-user-search p { margin-top: 4px; font-size: 13px; }
.admin-user-search__controls { display: grid; grid-template-columns: minmax(0, 1fr) 104px; gap: 10px; align-items: center; }
.admin-user-search__controls :deep(.r-button) { width: 104px; padding-inline: 8px; }
.admin-user-search__result { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; gap: 10px; align-items: center; padding-top: 4px; }
.admin-user-search__result small, .user-row small { display: block; margin-top: 4px; color: var(--color-text-muted); }
.user-list { display: grid; }
.user-row { display: grid; grid-template-columns: auto minmax(180px, 1fr) auto auto; align-items: center; gap: 14px; padding: 15px 0; border-top: 1px solid var(--color-border); }
.avatar { display: grid; width: 40px; height: 40px; place-items: center; overflow: hidden; color: #fff; background: var(--color-primary); border-radius: 10px; font-weight: 800; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.user-badges, .user-actions { display: flex; align-items: center; gap: 8px; }
.role-tag, .status-tag { padding: 5px 9px; background: var(--color-bg-subtle); border-radius: 999px; font-size: 12px; white-space: nowrap; }
.role-tag.admin { color: var(--color-primary); background: var(--color-primary-light); }
.status-tag { color: var(--color-success); background: #ecfdf3; }
.status-tag.disabled { color: var(--color-danger); background: #fff1f1; }
.panel-state { padding: 36px; text-align: center; color: var(--color-text-muted); }
@media(max-width:900px) { .user-row { grid-template-columns: auto 1fr; } .admin-user-search__controls { grid-template-columns: 1fr; } .admin-user-search__result { grid-template-columns: auto 1fr; } .admin-user-search__result .role-tag, .admin-user-search__result :deep(.r-button) { grid-column: 2; } .user-badges, .user-actions { grid-column: 2; justify-content: flex-start; flex-wrap: wrap; } }
</style>
