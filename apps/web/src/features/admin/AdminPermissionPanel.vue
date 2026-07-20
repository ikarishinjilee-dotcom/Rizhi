<template>
  <section class="users-panel permission-panel">
    <div class="panel-heading"><div><h2>管理员权限设置</h2><p>角色权限由系统统一执行；只有超级管理员可以授予或撤销管理员身份。</p></div></div>
    <div class="permission-matrix" role="table" aria-label="角色权限矩阵">
      <div class="permission-matrix__row permission-matrix__header" role="row"><span>功能权限</span><span v-for="role in permissionRoles" :key="role.key">{{ role.label }}</span></div>
      <div v-for="permission in permissionRows" :key="permission.key" class="permission-matrix__row" role="row">
        <div><strong>{{ permission.label }}</strong><small>{{ permission.description }}</small></div>
        <label v-for="role in permissionRoles" :key="role.key" class="permission-check"><input v-model="permissionMatrix[role.key][permission.key]" type="checkbox" :disabled="role.key === 'super_admin'" /><span>{{ permissionMatrix[role.key][permission.key] ? '允许' : '禁止' }}</span></label>
      </div>
    </div>
    <div class="permission-actions"><RButton variant="secondary" @click="$emit('save')">保存权限设置</RButton></div>
    <RInlineFeedback v-if="permissionMessage" :tone="permissionMessageTone">{{ permissionMessage }}</RInlineFeedback>
    <RInlineFeedback tone="success">个人分类与管理员维护的默认分类相互独立；普通用户不需要管理员权限即可编辑自己的分类。</RInlineFeedback>
  </section>
</template>
<script setup lang="ts">
import RButton from "@/components/ui/RButton.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
type PermissionRole = { key: "super_admin" | "admin" | "user"; label: string };
type PermissionRow = { key: string; label: string; description: string };
type PermissionMatrix = Record<PermissionRole["key"], Record<string, boolean>>;
defineProps<{ permissionRoles: readonly PermissionRole[]; permissionRows: readonly PermissionRow[]; permissionMatrix: PermissionMatrix; permissionMessage: string; permissionMessageTone: "success" | "danger"; }>();
defineEmits<{ save: [] }>();
</script>
<style scoped>
.users-panel { display: grid; gap: 16px; padding: 24px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 12px; box-shadow: 0 12px 30px rgba(15, 23, 42, .04); }
.panel-heading { display: flex; justify-content: space-between; }
.panel-heading p { margin: 0; color: var(--color-text-muted); }
.permission-matrix { display: grid; border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; }
.permission-matrix__row { display: grid; grid-template-columns: minmax(240px, 1.6fr) repeat(3, minmax(120px, 1fr)); align-items: center; gap: 12px; padding: 14px 16px; border-top: 1px solid var(--color-border); }
.permission-matrix__row:first-child { border-top: 0; }
.permission-matrix__header { background: var(--color-bg-subtle); color: var(--color-text-secondary); font-size: 12px; font-weight: 700; }
.permission-matrix__header span:not(:first-child) { text-align: center; }
.permission-matrix__row strong { display: block; }
.permission-matrix__row small { display: block; margin-top: 4px; color: var(--color-text-muted); font-size: 12px; }
.permission-check { display: flex; justify-content: center; align-items: center; gap: 7px; color: var(--color-text-secondary); font-size: 12px; text-align: center; }
.permission-check input { accent-color: var(--color-primary); }
.permission-actions { display: flex; justify-content: flex-end; margin-top: 14px; }
</style>
