<template>
  <n-modal v-model:show="visible" :mask-closable="true" class="rizhi-account-picker-card" content-style="padding: 0;">
    <section class="account-picker-modal">
      <header>
        <div><span>资金账户</span><h2>选择{{ title }}</h2></div>
        <button type="button" aria-label="关闭账户选择" @click="visible = false">×</button>
      </header>
      <div class="account-picker-modal__content">
        <button v-if="target === 'draft'" type="button" class="account-picker-none" :class="{ active: !selectedId }" @click="$emit('select', null)">
          <i>账</i><span><strong>不选择账户</strong><small>仅记录收支，不影响资金账户余额</small></span>
        </button>
        <div v-for="section in sections" :key="section.key" class="account-picker-section">
          <h3>{{ section.title }}</h3>
          <div class="account-picker-grid">
            <button v-for="account in section.accounts" :key="account.id" type="button" :class="{ active: selectedId === account.id }" @click="$emit('select', account.id)">
              <img v-if="account.iconUrl" :src="account.iconUrl" alt="" />
              <i v-else :style="{ background: account.color || '#3b82f6' }">{{ account.icon || account.name.slice(0, 1) }}</i>
              <span><strong>{{ account.name }}</strong><small>{{ balance(account) }}</small></span>
            </button>
          </div>
        </div>
        <p v-if="!sections.length" class="account-picker-empty">暂无可用账户，请先到资金页添加账户。</p>
      </div>
    </section>
  </n-modal>
</template>

<script setup lang="ts">
import { NModal } from "naive-ui";
import type { MoneyAccountRecord } from "@/domain/models";

type AccountSection = { key: string; title: string; accounts: MoneyAccountRecord[] };

const visible = defineModel<boolean>({ required: true });
defineProps<{
  title: string;
  target: "draft" | "from" | "to";
  selectedId: string | number | null;
  sections: AccountSection[];
  balance: (account: MoneyAccountRecord) => string;
}>();
defineEmits<{ select: [id: string | number | null] }>();
</script>

<style scoped>
.account-picker-modal { width: min(760px, calc(100vw - 48px)); overflow: hidden; background: var(--color-bg-card); border-radius: 18px; }
.account-picker-modal > header { display: flex; align-items: flex-start; justify-content: space-between; padding: 26px 30px 20px; color: #fff; background: linear-gradient(120deg, #123373, #397ff0); }
.account-picker-modal > header span { display: block; margin-bottom: 6px; font-size: 11px; font-weight: 700; letter-spacing: .08em; opacity: .78; text-transform: uppercase; }
.account-picker-modal > header h2 { margin: 0; font-size: 24px; }
.account-picker-modal > header > button { display: grid; width: 32px; height: 32px; padding: 0; place-items: center; color: #fff; border: 0; border-radius: 50%; background: rgba(255,255,255,.16); cursor: pointer; font-size: 20px; }
.account-picker-modal__content { display: grid; gap: 22px; max-height: min(540px, calc(100dvh - 210px)); padding: 24px 30px 30px; overflow-y: auto; }
.account-picker-none { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 10px; align-items: center; min-height: 70px; padding: 12px; color: var(--color-text-primary); text-align: left; background: #fff; border: 1px dashed var(--color-border); border-radius: 12px; cursor: pointer; transition: border-color .16s ease, background .16s ease; }
.account-picker-none:hover, .account-picker-none.active { border-color: var(--color-primary); background: var(--color-primary-light); }
.account-picker-none i { display: grid; width: 36px; height: 36px; place-items: center; color: #64748b; font-size: 14px; font-style: normal; background: #e2e8f0; border-radius: 11px; }
.account-picker-none span { display: grid; gap: 3px; min-width: 0; }.account-picker-none strong { font-size: 13px; }.account-picker-none small { color: var(--color-text-tertiary); font-size: 12px; }
.account-picker-section { display: grid; gap: 12px; }.account-picker-section h3 { margin: 0; color: var(--color-text-secondary); font-size: 13px; }
.account-picker-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.account-picker-grid > button { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 10px; align-items: center; min-height: 70px; padding: 12px; color: var(--color-text-primary); text-align: left; background: #fff; border: 1px solid var(--color-border); border-radius: 12px; cursor: pointer; transition: border-color .16s ease, background .16s ease, box-shadow .16s ease; }
.account-picker-grid > button:hover, .account-picker-grid > button.active { border-color: var(--color-primary); background: var(--color-primary-light); box-shadow: 0 5px 16px rgba(34, 105, 226, .1); }
.account-picker-grid img, .account-picker-grid i { display: grid; width: 36px; height: 36px; place-items: center; color: #fff; border-radius: 11px; font-size: 14px; font-style: normal; object-fit: cover; }
.account-picker-grid > button > span { display: grid; gap: 3px; min-width: 0; }.account-picker-grid strong, .account-picker-grid small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-picker-grid strong { font-size: 13px; }.account-picker-grid small { color: var(--color-text-tertiary); font-size: 12px; }
.account-picker-empty { margin: 0; padding: 32px; color: var(--color-text-tertiary); text-align: center; border: 1px dashed var(--color-border); border-radius: 12px; }
</style>
