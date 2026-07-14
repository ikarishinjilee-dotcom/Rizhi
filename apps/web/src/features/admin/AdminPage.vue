<template>
  <main class="admin-page">
    <header class="admin-header">
      <div><span>ADMINISTRATION</span><h1>管理中心</h1><p>维护全局系统字典与用户角色。</p></div>
      <strong><ShieldCheck :size="18" /> 管理员</strong>
    </header>
    <div class="admin-workspace">
    <nav class="admin-tabs">
      <span>系统配置</span>
      <button :class="{ active: activeTab === 'asset' }" @click="activeTab = 'asset'">资产与记账分类</button>
      <button :class="{ active: activeTab === 'account' }" @click="activeTab = 'account'">资金账户类型</button>
      <button :class="{ active: activeTab === 'bank' }" @click="activeTab = 'bank'">银行管理</button>
      <span>权限控制</span>
      <button :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">用户与角色</button>
    </nav>
    <div class="admin-content">
    <SystemDictionaryPanel v-if="activeTab === 'asset'" domain="asset" />
    <SystemDictionaryPanel v-else-if="activeTab === 'account'" domain="account" />
    <SystemDictionaryPanel v-else-if="activeTab === 'bank'" domain="bank" />
    <section v-else class="users-panel">
      <div class="panel-heading"><div><h2>用户与角色</h2><p>角色变更将在用户下次登录时生效。</p></div><RButton variant="secondary" :loading="loading" @click="loadUsers">刷新</RButton></div>
      <RInlineFeedback v-if="message" :tone="messageTone">{{ message }}</RInlineFeedback>
      <div v-if="loading" class="panel-state">正在加载用户...</div>
      <div v-else-if="!users.length" class="panel-state">暂无用户</div>
      <div v-else class="user-list">
        <article v-for="user in users" :key="user.id" class="user-row">
          <div class="avatar"><img v-if="user.avatar" :src="user.avatar" alt="" /><template v-else>{{ (user.nickname || user.username || "U").slice(0, 1).toUpperCase() }}</template></div>
          <div><strong>{{ user.nickname || user.username }}</strong><small>@{{ user.username }} · {{ user.id }}</small></div>
          <div class="user-badges">
            <span class="role-tag" :class="{ admin: user.roles.includes('admin') || user.roles.includes('super_admin') }">{{ roleLabel(user) }}</span>
            <span class="status-tag" :class="{ disabled: user.status === 1 }">{{ user.status === 1 ? "已停用" : "正常" }}</span>
          </div>
          <div class="user-actions">
            <RButton v-if="isSuperAdmin() && !user.roles.includes('super_admin')" variant="secondary" :disabled="savingUserId === user.id" @click="requestRoleChange(user)">{{ user.roles.includes("admin") ? "取消管理员" : "设为管理员" }}</RButton>
            <RButton
              v-if="canChangeStatus(user)"
              :variant="user.status === 1 ? 'secondary' : 'danger'"
              :disabled="savingUserId === user.id"
              @click="requestStatusChange(user)"
            >
              {{ user.status === 1 ? "恢复账户" : "停用账户" }}
            </RButton>
          </div>
        </article>
      </div>
    </section>
    </div>
    </div>
    <DeleteConfirmModal v-model:show="confirmVisible" eyebrow="角色变更" :title="pendingUser?.roles.includes('admin') ? '取消管理员身份？' : '授予管理员身份？'" :description="pendingUser ? `${pendingUser.nickname || pendingUser.username} 的权限将在下次登录时更新。` : ''" :confirm-text="pendingUser?.roles.includes('admin') ? '确认取消' : '确认授予'" :loading="Boolean(savingUserId)" @confirm="confirmRoleChange" />
    <DeleteConfirmModal
      v-model:show="statusConfirmVisible"
      eyebrow="账户状态"
      :title="pendingStatusUser?.status === 1 ? '恢复该用户账户？' : '停用该用户账户？'"
      :description="pendingStatusUser ? (pendingStatusUser.status === 1 ? `${pendingStatusUser.nickname || pendingStatusUser.username} 将可以重新登录并使用日值。` : `${pendingStatusUser.nickname || pendingStatusUser.username} 将立即无法继续登录日值，已有业务数据不会删除。`) : ''"
      :confirm-text="pendingStatusUser?.status === 1 ? '确认恢复' : '确认停用'"
      :loading="Boolean(savingUserId)"
      @confirm="confirmStatusChange"
    />
  </main>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ShieldCheck } from "@lucide/vue";
import RButton from "@/components/ui/RButton.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import DeleteConfirmModal from "@/components/business/DeleteConfirmModal.vue";
import SystemDictionaryPanel from "./SystemDictionaryPanel.vue";
import { listAdminUsers, setUserAdminRole, setUserEnabled, type AdminUser } from "@/services/adminService";
import { isSuperAdmin } from "@/services/authService";
const activeTab = ref<"asset" | "account" | "bank" | "users">("asset");
const users = ref<AdminUser[]>([]), loading = ref(false), savingUserId = ref(""), message = ref("");
const messageTone = ref<"success" | "danger">("success"), confirmVisible = ref(false), pendingUser = ref<AdminUser | null>(null);
const statusConfirmVisible = ref(false), pendingStatusUser = ref<AdminUser | null>(null);
async function loadUsers(){loading.value=true;message.value="";try{users.value=await listAdminUsers()}catch(error){message.value=error instanceof Error?error.message:"用户加载失败";messageTone.value="danger"}finally{loading.value=false}}
function requestRoleChange(user:AdminUser){pendingUser.value=user;confirmVisible.value=true}
function roleLabel(user:AdminUser){return user.roles.includes("super_admin")?"超级管理员":user.roles.includes("admin")?"管理员":"普通用户"}
async function confirmRoleChange(){if(!pendingUser.value)return;savingUserId.value=pendingUser.value.id;try{await setUserAdminRole(pendingUser.value.id,!pendingUser.value.roles.includes("admin"));confirmVisible.value=false;message.value="用户角色已更新。";messageTone.value="success";await loadUsers()}catch(error){message.value=error instanceof Error?error.message:"角色更新失败";messageTone.value="danger"}finally{savingUserId.value=""}}
function canChangeStatus(user:AdminUser){if(user.isCurrent||user.roles.includes("super_admin"))return false;return isSuperAdmin()||!user.roles.includes("admin")}
function requestStatusChange(user:AdminUser){pendingStatusUser.value=user;statusConfirmVisible.value=true}
async function confirmStatusChange(){if(!pendingStatusUser.value)return;savingUserId.value=pendingStatusUser.value.id;try{await setUserEnabled(pendingStatusUser.value.id,pendingStatusUser.value.status===1);statusConfirmVisible.value=false;message.value=pendingStatusUser.value.status===1?"用户账户已恢复。":"用户账户已停用。";messageTone.value="success";await loadUsers()}catch(error){message.value=error instanceof Error?error.message:"账户状态更新失败";messageTone.value="danger"}finally{savingUserId.value=""}}
onMounted(loadUsers);
</script>
<style scoped>
.admin-page{display:grid;gap:24px;padding:32px}.admin-header,.panel-heading{display:flex;justify-content:space-between}.admin-header{padding:4px 4px 20px;border-bottom:1px solid var(--color-border)}.admin-header span{color:var(--color-primary);font-size:11px;font-weight:800;letter-spacing:.08em}.admin-header h1{margin:7px 0;font-size:30px}.admin-page p{margin:0;color:var(--color-text-muted)}.admin-header>strong{display:flex;align-items:center;gap:8px;height:40px;padding:0 14px;color:var(--color-primary);background:var(--color-primary-light);border:1px solid #cfe0ff;border-radius:10px}.admin-workspace{display:grid;grid-template-columns:190px minmax(0,1fr);gap:22px;align-items:start}.admin-tabs{position:sticky;top:76px;display:grid;gap:5px;padding:10px;background:#fff;border:1px solid var(--color-border);border-radius:12px;box-shadow:0 8px 24px rgba(15,23,42,.04)}.admin-tabs>span{padding:12px 10px 5px;color:var(--color-text-muted);font-size:10px;font-weight:800;letter-spacing:.08em}.admin-tabs button{min-height:40px;padding:0 12px;color:var(--color-text-secondary);text-align:left;background:none;border:0;border-radius:8px;font-weight:700}.admin-tabs button:hover{background:var(--color-bg-hover)}.admin-tabs button.active{color:var(--color-primary);background:var(--color-primary-light)}.admin-content{min-width:0}.users-panel{display:grid;gap:16px;padding:24px;background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:12px;box-shadow:0 12px 30px rgba(15,23,42,.04)}.user-list{display:grid}.user-row{display:grid;grid-template-columns:auto minmax(180px,1fr) auto auto;align-items:center;gap:14px;padding:15px 0;border-top:1px solid var(--color-border)}.avatar{display:grid;width:40px;height:40px;place-items:center;overflow:hidden;color:#fff;background:var(--color-primary);border-radius:10px;font-weight:800}.avatar img{width:100%;height:100%;object-fit:cover}.user-row small{display:block;margin-top:4px;color:var(--color-text-muted)}.user-badges,.user-actions{display:flex;align-items:center;gap:8px}.role-tag,.status-tag{padding:5px 9px;background:var(--color-bg-subtle);border-radius:999px;font-size:12px;white-space:nowrap}.role-tag.admin{color:var(--color-primary);background:var(--color-primary-light)}.status-tag{color:var(--color-success);background:#ecfdf3}.status-tag.disabled{color:var(--color-danger);background:#fff1f1}.panel-state{padding:36px;text-align:center;color:var(--color-text-muted)}@media(max-width:900px){.admin-workspace{grid-template-columns:1fr}.admin-tabs{position:static;grid-template-columns:repeat(2,1fr)}.admin-tabs>span{grid-column:1/-1}.user-row{grid-template-columns:auto 1fr}.user-badges,.user-actions{grid-column:2;justify-content:flex-start;flex-wrap:wrap}}
</style>

