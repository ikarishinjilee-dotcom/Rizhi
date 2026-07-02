<template>
  <RDataGate :loading="store.loading" :ready="store.initialized" :error="store.error" @retry="initializeData">
    <section class="funds-page">
    <PageHeader title="资金账户">
      <template #eyebrow>
        <p class="page-subtitle">全面管理您的资产、负债、资金流向与还款计划，助您清晰掌控财务状况。</p>
      </template>
      <RButton variant="secondary" @click="openTransferModal">资金转账</RButton>
      <RButton @click="openAccountModal">+ 添加账户</RButton>
    </PageHeader>

    <div class="summary-grid">
      <section v-for="card in summaryCards" :key="card.label" class="summary-card" :class="card.tone">
        <div class="summary-card__head">
          <span>{{ card.label }}</span>
          <i>{{ card.icon }}</i>
        </div>
        <strong>{{ card.value }}</strong>
        <p>{{ card.trendLabel }} <em>{{ card.compare }}</em> <small>{{ card.rate }}</small></p>
        <svg v-if="card.points" viewBox="0 0 240 56" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            :points="card.points"
            fill="none"
            :stroke="card.stroke"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <div v-else class="trend-empty">暂无趋势</div>
      </section>
    </div>

    <div class="panel-grid">
      <RCard>
        <section class="list-panel">
          <div class="panel-head">
            <h3>资产账户</h3>
            <span>{{ assetAccounts.length }}个账户</span>
          </div>
          <button v-for="account in assetAccounts.slice(0, 6)" :key="account.id" class="account-line" data-testid="fund-account-line" type="button" @click="openAccount(account.id)">
            <span class="account-icon" :style="{ background: account.color || '#1677ff' }">{{ account.icon || account.name.slice(0, 1) }}</span>
            <strong>{{ account.name }}</strong>
            <em>{{ formatAmount(account.balance) }}</em>
            <svg v-if="accountSparklinePoints(account.id)" viewBox="0 0 72 24" aria-hidden="true">
              <polyline :points="accountSparklinePoints(account.id)" />
            </svg>
            <small v-else class="mini-trend-empty">暂无趋势</small>
          </button>
          <REmptyState v-if="!assetAccounts.length" compact title="暂无资产账户" description="添加现金、钱包或储蓄卡后即可记录余额。">
            <RButton size="small" @click="openAccountModal">添加账户</RButton>
          </REmptyState>
          <button v-else class="panel-link" type="button" @click="openAccountListDrawer('asset')">查看全部资产账户 ›</button>
        </section>
      </RCard>

      <RCard>
        <section class="list-panel">
          <div class="panel-head">
            <h3>负债账户</h3>
            <span>{{ liabilityAccounts.length }}个账户</span>
          </div>
          <button v-for="account in liabilityAccounts.slice(0, 4)" :key="account.id" class="debt-line" data-testid="fund-account-line" type="button" @click="openAccount(account.id)">
            <span class="account-icon" :style="{ background: account.color || '#ef4444' }">{{ account.icon || account.name.slice(0, 1) }}</span>
            <div>
              <strong>{{ account.name }}</strong>
              <small>剩余额度 {{ formatAmount(Math.max((account.creditLimit ?? 0) - account.balance, 0)) }}</small>
            </div>
            <div>
              <em>当前欠款 {{ formatAmount(account.balance) }}</em>
              <small>总额度 {{ formatAmount(account.creditLimit ?? 0) }}</small>
            </div>
          </button>
          <REmptyState v-if="!liabilityAccounts.length" compact title="暂无负债账户" description="添加信用卡、消费信用或贷款账户。">
            <RButton size="small" @click="openAccountModal">添加账户</RButton>
          </REmptyState>
          <button v-else class="panel-link" type="button" @click="openAccountListDrawer('liability')">查看全部负债账户 ›</button>
        </section>
      </RCard>

      <RCard>
        <section class="list-panel">
          <div class="panel-head">
            <h3>近期还款提醒</h3>
            <span>{{ repaymentReminders.length }}条待还</span>
          </div>
          <button v-for="item in repaymentReminders" :key="item.id" class="reminder-line" type="button" @click="openAccount(item.id)">
            <span class="account-icon danger-bg">{{ item.icon }}</span>
            <div>
              <strong>{{ item.name }}</strong>
              <small>还款日 {{ item.date }}</small>
            </div>
            <div>
              <em>{{ formatAmount(item.balance) }}</em>
              <small :class="item.days <= 1 ? 'danger' : 'success'">{{ item.daysText }}</small>
            </div>
          </button>
          <REmptyState v-if="!repaymentReminders.length" compact title="暂无近期还款" description="设置负债账户的还款日后会在这里提醒。" />
          <button v-else class="panel-link" type="button" @click="openAccountListDrawer('repayment')">查看全部还款计划 ›</button>
        </section>
      </RCard>
    </div>

    <RCard>
      <section class="flow-panel">
        <div class="panel-head">
          <h3>资金流水 <small>最近5条</small></h3>
          <button type="button" @click="goLedger">查看全部流水 ›</button>
        </div>
        <table v-if="recentFlowRows.length">
          <thead>
            <tr>
              <th>交易描述</th>
              <th>账户</th>
              <th>金额</th>
              <th>类型</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="flow in recentFlowRows" :key="flow.id">
              <td>{{ flow.title }}</td>
              <td>{{ flow.accountName }}</td>
              <td :class="flow.direction === 'in' ? 'success' : 'danger'">{{ flow.direction === "in" ? "+" : "-" }}{{ formatAmount(flow.amount) }}</td>
              <td><span class="type-pill" :class="flow.direction">{{ flow.typeLabel }}</span></td>
              <td>{{ flow.time }}</td>
            </tr>
          </tbody>
        </table>
        <REmptyState v-else compact title="暂无资金流水" description="新增交易、转账或还款后会在这里显示。" />
      </section>
    </RCard>

    <n-modal
      v-model:show="showAccountModal"
      preset="card"
      :bordered="false"
      :closable="false"
      :mask-closable="false"
      class="rizhi-fund-modal-card"
      content-style="padding: 0;"
      :style="{ width: 'min(900px, calc(100vw - 48px))', maxHeight: 'calc(100dvh - 48px)', borderRadius: '20px', overflow: 'hidden' }"
    >
      <section class="account-modal">
        <header class="modal-head">
          <div>
            <span>{{ editingAccountId ? "编辑账户" : "添加账户" }}</span>
            <h2>{{ editingAccountId ? "维护账户档案" : "把资金账户统一建档" }}</h2>
            <p>{{ editingAccountId ? "可修改账户类型、名称、余额、额度、账单日和还款日；已有流水的账户不能在资产和负债之间切换。" : "选择账户类型后填写余额、欠款、账单日和还款日。" }}</p>
          </div>
          <button type="button" @click="requestCloseAccountModal">×</button>
        </header>

        <div class="account-modal__body">
          <aside class="type-panel">
            <div v-for="group in accountTypeSections" :key="group.title" class="type-group">
              <h4>{{ group.title }}</h4>
              <div class="type-grid">
                <button
                  v-for="item in group.items"
                  :key="item.key"
                  :class="{ active: selectedAccountType.key === item.key }"
                  type="button"
                  :disabled="isAccountTypeDisabled(item)"
                  :title="accountTypeDisabledTitle(item)"
                  @click="selectAccountType(item)"
                >
                  <span :style="{ background: item.color }">{{ item.icon }}</span>
                  <small>{{ item.label }}</small>
                </button>
              </div>
            </div>
          </aside>

          <div class="account-form">
            <h3>账户信息</h3>
            <div class="form-grid">
              <label :class="{ invalid: accountErrors.name }">
                <span>名称 *</span>
                <RInput v-model="accountDraft.name" placeholder="例如 花呗" />
                <em>{{ accountErrors.name }}</em>
              </label>
              <label>
                <span>备注</span>
                <RInput v-model="accountDraft.note" placeholder="例如 日常消费分期" />
              </label>
              <label :class="{ invalid: accountErrors.balance }">
                <span>{{ selectedAccountType.direction === "liability" ? "当前欠款" : "当前余额" }}</span>
                <RInput v-model="accountDraft.balance" placeholder="1,256.00" />
                <em>{{ accountErrors.balance }}</em>
              </label>
              <label>
                <span>总额度</span>
                <RInput v-model="accountDraft.creditLimit" placeholder="5,000.00" />
              </label>
              <label>
                <span>出账日</span>
                <RSelect v-model="accountDraft.billDay" :options="dayOptions" placeholder="每月10日" />
              </label>
              <label>
                <span>还款日</span>
                <RSelect v-model="accountDraft.repaymentDay" :options="dayOptions" placeholder="每月10日" />
              </label>
            </div>
            <RInlineFeedback v-if="accountErrors.form" tone="danger">{{ accountErrors.form }}</RInlineFeedback>
            <footer>
              <RButton variant="secondary" @click="requestCloseAccountModal">取消</RButton>
              <RButton :loading="savingAccount" @click="submitAccount">{{ editingAccountId ? "保存修改" : "保存账户" }}</RButton>
            </footer>
          </div>
        </div>
      </section>
    </n-modal>

    <n-modal
      v-model:show="showTransferModal"
      preset="card"
      :bordered="false"
      :closable="false"
      :mask-closable="false"
      class="rizhi-fund-modal-card"
      content-style="padding: 0;"
      :style="{ width: 'min(720px, calc(100vw - 48px))', borderRadius: '20px', overflow: 'hidden' }"
    >
      <section class="transfer-modal">
        <header class="modal-head green">
          <div>
            <span>资金转账</span>
            <h2>记录一次账户间资金流动</h2>
            <p>转账会生成转出和转入两条账户流水。</p>
          </div>
          <button type="button" @click="requestCloseTransferModal">×</button>
        </header>
        <div class="transfer-body">
          <label :class="{ invalid: transferErrors.fromAccountId }"><span>转出账户</span><RSelect v-model="transferDraft.fromAccountId" :options="accountOptions" placeholder="选择转出账户" /><em>{{ transferErrors.fromAccountId }}</em></label>
          <label :class="{ invalid: transferErrors.toAccountId }"><span>转入账户</span><RSelect v-model="transferDraft.toAccountId" :options="accountOptions" placeholder="选择转入账户" /><em>{{ transferErrors.toAccountId }}</em></label>
          <label :class="{ invalid: transferErrors.amount }"><span>转账金额</span><RInput v-model="transferDraft.amount" placeholder="¥ 0.00" /><em>{{ transferErrors.amount }}</em></label>
          <label><span>备注</span><RInput v-model="transferDraft.note" placeholder="例如 支付宝转入微信" /></label>
        </div>
        <RInlineFeedback v-if="transferErrors.form" class="transfer-error" tone="danger">{{ transferErrors.form }}</RInlineFeedback>
        <footer class="modal-footer">
          <RButton variant="secondary" @click="requestCloseTransferModal">取消</RButton>
          <RButton :loading="savingTransfer" @click="submitTransfer">确认转账</RButton>
        </footer>
      </section>
    </n-modal>

    <n-modal
      v-model:show="showRepaymentModal"
      preset="card"
      :bordered="false"
      :closable="false"
      :mask-closable="false"
      class="rizhi-fund-modal-card"
      content-style="padding: 0;"
      :style="{ width: 'min(680px, calc(100vw - 48px))', borderRadius: '20px', overflow: 'hidden' }"
    >
      <section class="repayment-modal">
        <header class="modal-head orange">
          <div>
            <span>账户还款</span>
            <h2>记录一次负债账户还款</h2>
            <p>还款会减少付款账户余额，并同步减少负债账户欠款。</p>
          </div>
          <button type="button" @click="requestCloseRepaymentModal">×</button>
        </header>
        <div class="transfer-body">
          <label :class="{ invalid: repaymentErrors.fromAccountId }"><span>付款账户</span><RSelect v-model="repaymentDraft.fromAccountId" :options="assetAccountOptions" placeholder="选择付款账户" /><em>{{ repaymentErrors.fromAccountId }}</em></label>
          <label :class="{ invalid: repaymentErrors.liabilityAccountId }"><span>负债账户</span><RSelect v-model="repaymentDraft.liabilityAccountId" :options="liabilityAccountOptions" placeholder="选择负债账户" /><em>{{ repaymentErrors.liabilityAccountId }}</em></label>
          <label :class="{ invalid: repaymentErrors.amount }"><span>还款金额</span><RInput v-model="repaymentDraft.amount" placeholder="¥ 0.00" /><em>{{ repaymentErrors.amount }}</em></label>
          <label :class="{ invalid: repaymentErrors.date }"><span>还款日期</span><RDatePicker v-model="repaymentDraft.occurredAt" type="datetime" placeholder="选择日期时间" /><em>{{ repaymentErrors.date }}</em></label>
          <label class="full"><span>备注</span><RInput v-model="repaymentDraft.note" placeholder="例如 花呗 6 月账单还款" /></label>
        </div>
        <RInlineFeedback v-if="repaymentErrors.form" class="transfer-error" tone="danger">{{ repaymentErrors.form }}</RInlineFeedback>
        <footer class="modal-footer">
          <RButton variant="secondary" @click="requestCloseRepaymentModal">取消</RButton>
          <RButton :loading="savingRepayment" @click="submitRepayment">确认还款</RButton>
        </footer>
      </section>
    </n-modal>

    <RDrawer v-model:show="showDetailDrawer" title="账户详情" :width="720">
      <div v-if="selectedAccount" class="account-detail" data-testid="fund-account-detail">
        <section class="account-detail-hero" :class="selectedAccount.direction">
          <div class="account-detail__icon" :style="{ background: selectedAccount.color ?? '#1677FF' }">{{ selectedAccount.icon ?? "账" }}</div>
          <div>
            <span>{{ selectedAccount.direction === "liability" ? "负债账户" : "资产账户" }}</span>
            <h3>{{ selectedAccount.name }}</h3>
            <p>{{ selectedAccount.institution || accountTypeLabel(selectedAccount.type) }} · {{ selectedAccount.enabled === false ? "已停用" : "启用中" }}</p>
          </div>
          <strong>{{ selectedAccount.direction === "liability" ? "-" : "" }}{{ formatAmount(selectedAccount.balance) }}</strong>
        </section>

        <section class="account-maintenance">
          <RButton variant="secondary" @click="openEditAccount(selectedAccount.id)">编辑账户</RButton>
          <RButton v-if="selectedAccount.enabled !== false" variant="secondary" @click="disableAccount(selectedAccount.id)">停用账户</RButton>
          <RButton v-else @click="enableAccount(selectedAccount.id)">重新启用</RButton>
          <RButton data-testid="fund-account-delete" variant="danger" @click="openDeleteAccountModal(selectedAccount.id)">删除账户</RButton>
        </section>

        <section v-if="selectedAccount.direction === 'liability'" class="repayment-callout">
          <div>
            <span>还款操作</span>
            <strong>从资产账户还到「{{ selectedAccount.name }}」</strong>
            <p>保存后会生成还款交易、两条账户流水，并同步减少当前欠款。</p>
          </div>
          <RButton @click="openRepaymentModal(selectedAccount.id)">立即还款</RButton>
        </section>

        <section class="account-metric-grid">
          <div>
            <span>{{ selectedAccount.direction === "liability" ? "当前欠款" : "当前余额" }}</span>
            <strong>{{ formatAmount(selectedAccount.balance) }}</strong>
          </div>
          <div>
            <span>账户类型</span>
            <strong>{{ accountTypeLabel(selectedAccount.type) }}</strong>
          </div>
          <div v-if="selectedAccount.direction === 'liability'">
            <span>总额度</span>
            <strong>{{ formatAmount(selectedAccount.creditLimit ?? 0) }}</strong>
          </div>
          <div v-if="selectedAccount.direction === 'liability'">
            <span>可用额度</span>
            <strong>{{ formatAmount(selectedAccountAvailableCredit) }}</strong>
          </div>
          <div v-if="selectedAccount.billDay">
            <span>出账日</span>
            <strong>每月 {{ selectedAccount.billDay }} 日</strong>
          </div>
          <div v-if="selectedAccount.repaymentDay">
            <span>还款日</span>
            <strong>每月 {{ selectedAccount.repaymentDay }} 日</strong>
          </div>
        </section>

        <section class="account-flow-section">
          <div class="drawer-section-head">
            <div>
              <span>账户流水</span>
              <h4>最近 {{ selectedAccountFlowRows.length }} 条资金变动</h4>
            </div>
            <small>余额随每条流水回放</small>
          </div>
          <div v-if="selectedAccountFlowRows.length" class="account-flow-list">
            <div v-for="flow in selectedAccountFlowRows" :key="flow.id" class="account-flow-item">
              <span class="type-pill" :class="flow.direction">{{ flow.typeLabel }}</span>
              <div>
                <strong>{{ flow.title }}</strong>
                <small>{{ flow.time }} · 余额 {{ formatAmount(flow.balanceAfter) }}</small>
              </div>
              <div class="flow-tail">
                <em :class="flow.direction === 'in' ? 'success' : 'danger'">{{ flow.direction === "in" ? "+" : "-" }}{{ formatAmount(flow.amount) }}</em>
                <button v-if="flow.canRevokeRepayment" type="button" @click="openRevokeRepaymentModal(flow.transactionId)">撤销还款</button>
                <button v-if="flow.canRevokeBalanceAdjustment" type="button" @click="openRevokeBalanceAdjustmentModal(flow.transactionId)">撤销调整</button>
              </div>
            </div>
          </div>
          <div v-else class="drawer-empty">这个账户还没有资金流水。</div>
        </section>

        <section class="account-flow-section">
          <div class="drawer-section-head">
            <div>
              <span>关联记账</span>
              <h4>由这些交易产生账户流水</h4>
            </div>
          </div>
          <div v-if="selectedAccountTransactionRows.length" class="account-transaction-list">
            <div v-for="item in selectedAccountTransactionRows" :key="item.id" class="account-transaction-item">
              <div>
                <strong>{{ item.title }}</strong>
                <small>{{ item.category }} · {{ item.time }}</small>
              </div>
              <RButton variant="text" size="small" @click="goLedger">去记账页</RButton>
            </div>
          </div>
          <div v-else class="drawer-empty">暂无关联记账。</div>
        </section>
      </div>
    </RDrawer>

    <RDrawer v-model:show="showAccountListDrawer" :title="accountListDrawerTitle" :width="680">
      <section v-if="accountListMode !== 'repayment'" class="account-list-drawer">
        <div class="drawer-section-head">
          <div>
            <span>{{ accountListMode === "asset" ? "资产账户" : "负债账户" }}</span>
            <h4>{{ accountListDrawerAccounts.length }} 个账户</h4>
          </div>
          <RButton size="small" @click="openAccountModal">添加账户</RButton>
        </div>

        <div v-if="accountListDrawerAccounts.length" class="drawer-account-list">
          <button
            v-for="account in accountListDrawerAccounts"
            :key="account.id"
            class="drawer-account-item"
            type="button"
            @click="openAccountFromList(account.id)"
          >
            <span class="account-icon" :style="{ background: account.color || (account.direction === 'liability' ? '#ef4444' : '#1677ff') }">{{ account.icon || account.name.slice(0, 1) }}</span>
            <div>
              <strong>{{ account.name }}</strong>
              <small>{{ account.institution || accountTypeLabel(account.type) }} · {{ account.enabled === false ? "已停用" : "启用中" }}</small>
            </div>
            <div class="drawer-account-tail">
              <em>{{ account.direction === "liability" ? "当前欠款" : "当前余额" }}</em>
              <strong>{{ account.direction === "liability" ? "-" : "" }}{{ formatAmount(account.balance) }}</strong>
              <small v-if="account.direction === 'liability'">可用 {{ formatAmount(Math.max((account.creditLimit ?? 0) - account.balance, 0)) }}</small>
            </div>
          </button>
        </div>
        <div v-else class="drawer-empty">暂无账户。</div>
      </section>

      <section v-else class="account-list-drawer">
        <div class="drawer-section-head">
          <div>
            <span>还款计划</span>
            <h4>{{ allRepaymentReminders.length }} 条待还提醒</h4>
          </div>
          <RButton size="small" @click="openRepaymentModal()">立即还款</RButton>
        </div>

        <div v-if="allRepaymentReminders.length" class="drawer-account-list">
          <button
            v-for="item in allRepaymentReminders"
            :key="item.id"
            class="drawer-account-item repayment"
            type="button"
            @click="openAccountFromList(item.id)"
          >
            <span class="account-icon danger-bg">{{ item.icon }}</span>
            <div>
              <strong>{{ item.name }}</strong>
              <small>还款日 {{ item.date }} · {{ item.daysText }}</small>
            </div>
            <div class="drawer-account-tail">
              <em>当前欠款</em>
              <strong>-{{ formatAmount(item.balance) }}</strong>
              <RButton size="small" @click.stop="openRepaymentFromList(item.id)">还款</RButton>
            </div>
          </button>
        </div>
        <div v-else class="drawer-empty">暂无还款提醒。</div>
      </section>
    </RDrawer>

    <DeleteConfirmModal
      v-model:show="showDeleteAccountModal"
      :title="pendingDeleteAccount ? `删除「${pendingDeleteAccount.name}」？` : '删除账户？'"
      description="删除账户会永久移除账户档案。若账户已有资金流水，系统会阻止删除；这种情况下建议改为停用账户，以保留历史记录。"
      eyebrow="删除账户"
      confirm-text="确认删除"
      :loading="deletingAccount"
      @confirm="confirmDeleteAccount"
    >
      <div v-if="pendingDeleteAccount" class="delete-account-detail">
        <div>
          <span>账户类型</span>
          <strong>{{ accountTypeLabel(pendingDeleteAccount.type) }}</strong>
        </div>
        <div>
          <span>{{ pendingDeleteAccount.direction === "liability" ? "当前欠款" : "当前余额" }}</span>
          <strong>{{ pendingDeleteAccount.direction === "liability" ? "-" : "" }}{{ formatAmount(pendingDeleteAccount.balance) }}</strong>
        </div>
        <RInlineFeedback v-if="accountDeleteError" tone="danger" data-testid="fund-account-delete-error">{{ accountDeleteError }}</RInlineFeedback>
        <RButton
          v-if="accountDeleteError && pendingDeleteAccount.enabled !== false"
          variant="secondary"
          @click="disablePendingDeleteAccount"
        >
          改为停用账户
        </RButton>
      </div>
    </DeleteConfirmModal>

    <DeleteConfirmModal
      v-model:show="showRevokeRepaymentModal"
      title="撤销这笔还款？"
      description="撤销后会删除还款交易和两条账户流水，并把付款账户余额加回、负债账户欠款加回。"
      eyebrow="撤销还款"
      confirm-text="确认撤销"
      :loading="revokingRepayment"
      @confirm="confirmRevokeRepayment"
    />

    <DeleteConfirmModal
      v-model:show="showRevokeBalanceAdjustmentModal"
      title="撤销最近一次余额调整？"
      description="撤销后会删除这条余额调整记录，恢复账户余额，并同步修正该调整之后产生的资金流水余额。"
      eyebrow="撤销余额调整"
      confirm-text="确认撤销"
      :loading="revokingBalanceAdjustment"
      @confirm="confirmRevokeBalanceAdjustment"
    >
      <RInlineFeedback v-if="revokeBalanceAdjustmentError" tone="danger">{{ revokeBalanceAdjustmentError }}</RInlineFeedback>
    </DeleteConfirmModal>

    <DeleteConfirmModal
      v-model:show="showUnsavedAccountModal"
      title="放弃未保存的账户内容？"
      description="当前账户表单里有尚未保存的修改。离开后，名称、余额、额度、账单日和备注都会丢失。"
      eyebrow="内容未保存"
      confirm-text="放弃离开"
      @confirm="confirmCloseAccountModal"
    />

    <DeleteConfirmModal
      v-model:show="showUnsavedTransferModal"
      title="放弃未保存的转账内容？"
      description="当前转账表单里有尚未保存的修改。离开后，转出账户、转入账户、金额和备注都会丢失。"
      eyebrow="内容未保存"
      confirm-text="放弃离开"
      @confirm="confirmCloseTransferModal"
    />

    <DeleteConfirmModal
      v-model:show="showUnsavedRepaymentModal"
      title="放弃未保存的还款内容？"
      description="当前还款表单里有尚未保存的修改。离开后，付款账户、负债账户、金额、日期和备注都会丢失。"
      eyebrow="内容未保存"
      confirm-text="放弃离开"
      @confirm="confirmCloseRepaymentModal"
    />
    </section>
  </RDataGate>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { NModal } from "naive-ui";
import DeleteConfirmModal from "@/components/business/DeleteConfirmModal.vue";
import { accountFlowDelta } from "@/domain/accountCalculations";
import PageHeader from "@/components/business/PageHeader.vue";
import RButton from "@/components/ui/RButton.vue";
import RCard from "@/components/ui/RCard.vue";
import RDatePicker from "@/components/ui/RDatePicker.vue";
import RDrawer from "@/components/ui/RDrawer.vue";
import RInput from "@/components/ui/RInput.vue";
import RSelect from "@/components/ui/RSelect.vue";
import RDataGate from "@/components/ui/RDataGate.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import REmptyState from "@/components/ui/REmptyState.vue";
import type { AccountFlowRecord, AccountType, MoneyAccountRecord } from "@/domain/models";
import { accountService } from "@/services/accountService";
import { transactionService } from "@/services/transactionService";
import { useAppDataStore } from "@/stores/appDataStore";

type AccountTypeItem = {
  key: string;
  label: string;
  icon: string;
  color: string;
  type: AccountType;
  direction: MoneyAccountRecord["direction"];
};
type AccountListMode = "asset" | "liability" | "repayment";

const store = useAppDataStore();
const router = useRouter();
const route = useRoute();
const showAccountModal = ref(false);
const showTransferModal = ref(false);
const showRepaymentModal = ref(false);
const showDetailDrawer = ref(false);
const showAccountListDrawer = ref(false);
const showRevokeRepaymentModal = ref(false);
const showRevokeBalanceAdjustmentModal = ref(false);
const showDeleteAccountModal = ref(false);
const showUnsavedAccountModal = ref(false);
const showUnsavedTransferModal = ref(false);
const showUnsavedRepaymentModal = ref(false);
const selectedAccount = ref<MoneyAccountRecord | null>(null);
const editingAccountId = ref<string | null>(null);
const savingAccount = ref(false);
const savingTransfer = ref(false);
const savingRepayment = ref(false);
const revokingRepayment = ref(false);
const revokingBalanceAdjustment = ref(false);
const deletingAccount = ref(false);
const revokeRepaymentTransactionId = ref<string | null>(null);
const revokeBalanceAdjustmentTransactionId = ref<string | null>(null);
const revokeBalanceAdjustmentError = ref("");
const pendingDeleteAccountId = ref<string | null>(null);
const accountListMode = ref<AccountListMode>("asset");
const accountDeleteError = ref("");
const initialAccountDraftSnapshot = ref("");
const initialTransferDraftSnapshot = ref("");
const initialRepaymentDraftSnapshot = ref("");

const accountTypeSections: Array<{ title: string; items: AccountTypeItem[] }> = [
  {
    title: "资金账户",
    items: [
      { key: "cash", label: "现金", icon: "现", color: "#3B82F6", type: "cash", direction: "asset" },
      { key: "wechat", label: "微信", icon: "微", color: "#22C55E", type: "wallet", direction: "asset" },
      { key: "alipay", label: "支付宝", icon: "支", color: "#1677FF", type: "wallet", direction: "asset" },
      { key: "bank", label: "银行卡", icon: "卡", color: "#38BDF8", type: "debit_card", direction: "asset" },
      { key: "other-asset", label: "其它", icon: "其", color: "#94A3B8", type: "other", direction: "asset" },
    ] satisfies AccountTypeItem[],
  },
  {
    title: "信用账户",
    items: [
      { key: "credit-card", label: "信用卡", icon: "信", color: "#F97316", type: "credit_card", direction: "liability" },
      { key: "huabei", label: "花呗", icon: "花", color: "#3B82F6", type: "consumer_credit", direction: "liability" },
      { key: "jiedai", label: "借呗", icon: "借", color: "#0EA5E9", type: "consumer_credit", direction: "liability" },
      { key: "jd", label: "京东", icon: "京", color: "#EF4444", type: "consumer_credit", direction: "liability" },
    ] satisfies AccountTypeItem[],
  },
  {
    title: "充值账户",
    items: [
      { key: "mobile", label: "话费充值", icon: "话", color: "#06B6D4", type: "wallet", direction: "asset" },
      { key: "food", label: "餐饮卡", icon: "餐", color: "#14B8A6", type: "wallet", direction: "asset" },
      { key: "transport", label: "交通卡", icon: "交", color: "#0EA5E9", type: "wallet", direction: "asset" },
    ] satisfies AccountTypeItem[],
  },
];
const allAccountTypeItems: AccountTypeItem[] = accountTypeSections.flatMap((section) => section.items);

const selectedAccountType = ref<AccountTypeItem>(accountTypeSections[0].items[0]);
const accountDraft = reactive({
  name: "",
  note: "",
  balance: "",
  creditLimit: "",
  billDay: null as string | number | null,
  repaymentDay: null as string | number | null,
});
const accountErrors = reactive({ name: "", balance: "", form: "" });
const transferDraft = reactive({
  fromAccountId: null as string | number | null,
  toAccountId: null as string | number | null,
  amount: "",
  note: "",
});
const transferErrors = reactive({ fromAccountId: "", toAccountId: "", amount: "", form: "" });
const repaymentDraft = reactive({
  fromAccountId: null as string | number | null,
  liabilityAccountId: null as string | number | null,
  amount: "",
  occurredAt: Date.now() as number | null,
  note: "",
});
const repaymentErrors = reactive({ fromAccountId: "", liabilityAccountId: "", amount: "", date: "", form: "" });

const assetAccounts = computed(() => store.assetAccounts);
const liabilityAccounts = computed(() => store.liabilityAccounts);
const availableCredit = computed(() => store.liabilityAccounts.reduce((sum, account) => sum + Math.max((account.creditLimit ?? 0) - account.balance, 0), 0));
const accountOptions = computed(() => store.activeAccounts.map((account) => ({ label: account.name, value: account.id })));
const assetAccountOptions = computed(() => store.assetAccounts.map((account) => ({ label: account.name, value: account.id })));
const liabilityAccountOptions = computed(() => store.liabilityAccounts.map((account) => ({ label: account.name, value: account.id })));
const dayOptions = Array.from({ length: 28 }, (_, index) => ({ label: `每月${index + 1}日`, value: index + 1 }));
const summaryCards = computed(() => {
  const netWorthTrend = buildSummaryTrend("netWorth");
  const assetTrend = buildSummaryTrend("assets");
  const liabilityTrend = buildSummaryTrend("liabilities");
  const creditTrend = buildSummaryTrend("availableCredit");

  return [
    { label: "净资产", value: formatAmount(store.netWorth), ...formatTrendMeta(netWorthTrend), icon: "◎", tone: "blue", stroke: "#1677ff", points: toPolylinePoints(netWorthTrend, 240, 56) },
    { label: "现金资产", value: formatAmount(store.totalAssetBalance), ...formatTrendMeta(assetTrend), icon: "▣", tone: "green", stroke: "#16a36a", points: toPolylinePoints(assetTrend, 240, 56) },
    { label: "负债总额", value: formatAmount(store.totalLiabilityBalance), ...formatTrendMeta(liabilityTrend), icon: "▤", tone: "red", stroke: "#ef4444", points: toPolylinePoints(liabilityTrend, 240, 56) },
    { label: "可用信用额度", value: formatAmount(availableCredit.value), ...formatTrendMeta(creditTrend), icon: "◔", tone: "purple", stroke: "#7c3aed", points: toPolylinePoints(creditTrend, 240, 56) },
  ];
});
const recentFlowRows = computed(() => store.accountFlows.slice(0, 5).map((flow) => {
  const transaction = store.transactions.find((item) => item.id === flow.transactionId);
  const account = store.accounts.find((item) => item.id === flow.accountId);
  return {
    id: flow.id,
    title: transaction?.note || transaction?.merchant || "资金变动",
    accountName: account?.name || "-",
    direction: flow.direction,
    amount: flow.amount,
    typeLabel: transactionTypeLabel(transaction?.type),
    time: formatDateTime(flow.occurredAt),
  };
}));
const allRepaymentReminders = computed(() => store.liabilityAccounts
  .filter((account) => account.repaymentDay)
  .map((account) => ({
    id: account.id,
    name: account.name,
    icon: account.icon || account.name.slice(0, 1),
    balance: account.balance,
    date: `2025-06-${String(account.repaymentDay).padStart(2, "0")}`,
    days: calcDaysUntil(account.repaymentDay ?? 1),
    daysText: calcDaysUntil(account.repaymentDay ?? 1) === 0 ? "今日到期" : `${calcDaysUntil(account.repaymentDay ?? 1)}天后到期`,
  }))
  .sort((a, b) => a.days - b.days));
const repaymentReminders = computed(() => allRepaymentReminders.value.slice(0, 3));
const accountListDrawerTitle = computed(() => {
  if (accountListMode.value === "asset") return "全部资产账户";
  if (accountListMode.value === "liability") return "全部负债账户";
  return "全部还款计划";
});
const accountListDrawerAccounts = computed(() => {
  if (accountListMode.value === "asset") return assetAccounts.value;
  if (accountListMode.value === "liability") return liabilityAccounts.value;
  return [];
});
const selectedAccountAvailableCredit = computed(() => {
  if (!selectedAccount.value || selectedAccount.value.direction !== "liability") return 0;
  return Math.max((selectedAccount.value.creditLimit ?? 0) - selectedAccount.value.balance, 0);
});

const editingAccount = computed(() => {
  if (!editingAccountId.value) return null;
  return store.accounts.find((account) => account.id === editingAccountId.value) ?? null;
});

const editingAccountFlowCount = computed(() => {
  if (!editingAccountId.value) return 0;
  return store.accountFlows.filter((flow) => flow.accountId === editingAccountId.value).length;
});
const pendingDeleteAccount = computed(() => pendingDeleteAccountId.value
  ? store.accounts.find((account) => account.id === pendingDeleteAccountId.value) ?? null
  : null);
const isAccountDraftDirty = computed(() => showAccountModal.value && serializeAccountDraft() !== initialAccountDraftSnapshot.value);
const isTransferDraftDirty = computed(() => showTransferModal.value && serializeTransferDraft() !== initialTransferDraftSnapshot.value);
const isRepaymentDraftDirty = computed(() => showRepaymentModal.value && serializeRepaymentDraft() !== initialRepaymentDraftSnapshot.value);
const selectedAccountFlows = computed(() => {
  if (!selectedAccount.value) return [];
  return store.accountFlows
    .filter((flow) => flow.accountId === selectedAccount.value?.id)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
});
const latestBalanceAdjustmentTransactionId = computed(() => {
  for (const flow of selectedAccountFlows.value) {
    const transaction = store.transactions.find((item) => item.id === flow.transactionId);
    if (transaction?.businessType === "balance_adjustment") return transaction.id;
  }
  return null;
});
const selectedAccountFlowRows = computed(() => selectedAccountFlows.value.slice(0, 12).map((flow) => {
  const transaction = store.transactions.find((item) => item.id === flow.transactionId);
  return {
    id: flow.id,
    transactionId: flow.transactionId,
    title: transaction?.note || transaction?.merchant || flow.note || "资金变动",
    direction: flow.direction,
    amount: flow.amount,
    balanceAfter: flow.balanceAfter,
    typeLabel: transaction?.businessType === "balance_adjustment" ? "余额调整" : transactionTypeLabel(transaction?.type),
    time: formatDateTime(flow.occurredAt),
    canRevokeRepayment: transaction?.businessType === "debt_repayment" || transaction?.type === "repayment",
    canRevokeBalanceAdjustment: transaction?.businessType === "balance_adjustment" &&
      transaction.id === latestBalanceAdjustmentTransactionId.value,
  };
}));
const selectedAccountTransactionRows = computed(() => {
  const transactionIds = new Set(selectedAccountFlows.value.map((flow) => flow.transactionId));
  return store.transactions
    .filter((transaction) => transactionIds.has(transaction.id))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 8)
    .map((transaction) => ({
      id: transaction.id,
      title: transaction.note || transaction.merchant || "未命名交易",
      category: transaction.categorySnapshot?.subCategoryName
        ? `${transaction.categorySnapshot.categoryName} / ${transaction.categorySnapshot.subCategoryName}`
        : transaction.categorySnapshot?.categoryName ?? transactionTypeLabel(transaction.type),
      time: formatDateTime(transaction.occurredAt),
    }));
});

onMounted(initializeData);

async function initializeData() {
  await store.init().catch(() => undefined);
  if (store.initialized) applyRouteState();
}

watch(() => [route.query.accountId, route.query.view], () => {
  applyRouteState();
});

function openAccountModal() {
  resetAccountForm();
  showAccountModal.value = true;
}

function openEditAccount(id: string) {
  const account = store.accounts.find((item) => item.id === id);
  if (!account) return;
  editingAccountId.value = id;
  selectedAccountType.value = matchAccountType(account);
  accountDraft.name = account.name;
  accountDraft.note = account.note ?? "";
  accountDraft.balance = String(account.balance);
  accountDraft.creditLimit = account.creditLimit !== undefined ? String(account.creditLimit) : "";
  accountDraft.billDay = account.billDay ?? null;
  accountDraft.repaymentDay = account.repaymentDay ?? null;
  accountErrors.name = "";
  accountErrors.balance = "";
  accountErrors.form = "";
  initialAccountDraftSnapshot.value = serializeAccountDraft();
  showAccountModal.value = true;
}

function selectAccountType(item: AccountTypeItem) {
  if (isAccountTypeDisabled(item)) return;
  const previousType = selectedAccountType.value;
  selectedAccountType.value = item;
  const currentName = accountDraft.name.trim();
  const previousInstitution = editingAccount.value?.institution?.trim();
  if (!currentName || currentName === previousType.label || currentName === previousInstitution) {
    accountDraft.name = item.label;
  }
}

function matchAccountType(account: MoneyAccountRecord) {
  const institution = account.institution?.trim();
  const exactPreset = allAccountTypeItems.find((item) =>
    item.direction === account.direction
    && item.type === account.type
    && (item.label === institution || item.label === account.name || item.icon === account.icon || item.color === account.color)
  );
  if (exactPreset) return exactPreset;

  const sameType = allAccountTypeItems.find((item) => item.type === account.type && item.direction === account.direction);
  return sameType ?? accountTypeSections[0].items[0];
}

function isAccountTypeDisabled(item: AccountTypeItem) {
  return Boolean(editingAccount.value && editingAccountFlowCount.value > 0 && item.direction !== editingAccount.value.direction);
}

function accountTypeDisabledTitle(item: AccountTypeItem) {
  if (!isAccountTypeDisabled(item)) return "";
  return `该账户已有 ${editingAccountFlowCount.value} 条资金流水，不能从${editingAccount.value?.direction === "asset" ? "资产" : "负债"}账户改为${item.direction === "asset" ? "资产" : "负债"}账户。`;
}

function flowDelta(account: MoneyAccountRecord, flow: AccountFlowRecord) {
  const transaction = store.transactions.find((item) => item.id === flow.transactionId);
  return accountFlowDelta(account, transaction, flow);
}

function toPolylinePoints(values: number[], width: number, height: number) {
  const meaningfulValues = values.filter((value) => Number.isFinite(value));
  if (meaningfulValues.length < 2) return "";

  const min = Math.min(...meaningfulValues);
  const max = Math.max(...meaningfulValues);
  const range = max - min;
  const verticalPadding = 6;
  const usableHeight = height - verticalPadding * 2;
  const denominator = Math.max(meaningfulValues.length - 1, 1);

  return meaningfulValues
    .map((value, index) => {
      const x = (index / denominator) * width;
      const ratio = range === 0 ? 0.5 : (value - min) / range;
      const y = height - verticalPadding - ratio * usableHeight;
      return `${Number(x.toFixed(1))},${Number(y.toFixed(1))}`;
    })
    .join(" ");
}

function accountSparklinePoints(accountId: string) {
  const account = store.accounts.find((item) => item.id === accountId);
  if (!account) return "";
  const flows = store.accountFlows
    .filter((flow) => flow.accountId === accountId)
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
    .slice(-8);

  if (!flows.length) return "";

  const firstFlow = flows[0];
  const series = [firstFlow.balanceAfter - flowDelta(account, firstFlow), ...flows.map((flow) => flow.balanceAfter)];
  return toPolylinePoints(series, 72, 24);
}

type SummaryTrendKind = "netWorth" | "assets" | "liabilities" | "availableCredit";

function buildSummaryTrend(kind: SummaryTrendKind) {
  if (!store.accountFlows.length) return [];

  const now = Date.now();
  const points = 8;
  const interval = 30 * 86_400_000 / (points - 1);

  return Array.from({ length: points }, (_, index) => {
    const cutoff = new Date(now - interval * (points - 1 - index));
    cutoff.setHours(23, 59, 59, 999);
    return calcSummaryValueAt(cutoff, kind);
  });
}

function calcSummaryValueAt(cutoff: Date, kind: SummaryTrendKind) {
  return store.accounts.reduce((sum, account) => {
    const balance = calcAccountBalanceAt(account, cutoff);
    if (kind === "assets") return account.direction === "asset" ? sum + balance : sum;
    if (kind === "liabilities") return account.direction === "liability" ? sum + balance : sum;
    if (kind === "availableCredit") {
      return account.direction === "liability" ? sum + Math.max((account.creditLimit ?? 0) - balance, 0) : sum;
    }
    return sum + (account.direction === "asset" ? balance : -balance);
  }, 0);
}

function calcAccountBalanceAt(account: MoneyAccountRecord, cutoff: Date) {
  const laterDelta = store.accountFlows
    .filter((flow) => flow.accountId === account.id && new Date(flow.occurredAt).getTime() > cutoff.getTime())
    .reduce((sum, flow) => sum + flowDelta(account, flow), 0);
  return account.balance - laterDelta;
}

function formatTrendMeta(values: number[]) {
  if (values.length < 2) return { trendLabel: "近30天", compare: "暂无变化", rate: "" };

  const start = values[0];
  const end = values[values.length - 1];
  const delta = end - start;
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
  const rate = start === 0 ? "" : `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta / start * 100).toFixed(2)}%`;

  return {
    trendLabel: "近30天",
    compare: `${sign}${formatAmount(Math.abs(delta))}`,
    rate,
  };
}

function formatAmount(value: number) {
  return `¥${Math.abs(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseAmount(value: string) {
  const amount = Number(value.replace(/[¥￥,\s]/g, ""));
  if (!Number.isFinite(amount) || amount < 0) throw new Error("请输入正确金额");
  return amount;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function calcDaysUntil(day: number) {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth(), day);
  if (target.getTime() < today.getTime()) target.setMonth(target.getMonth() + 1);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86_400_000));
}

function accountTypeLabel(type: AccountType) {
  const labels: Record<AccountType, string> = {
    cash: "现金",
    wallet: "电子钱包",
    debit_card: "储蓄卡",
    credit_card: "信用卡",
    consumer_credit: "消费信用",
    loan: "贷款",
    investment: "投资账户",
    other: "其他账户",
  };
  return labels[type];
}

function transactionTypeLabel(type?: string) {
  return ({ income: "收入", expense: "支出", transfer: "转账", refund: "退款", repayment: "还款", asset_purchase: "资产购买" } as Record<string, string>)[type || ""] || "流水";
}

function resetAccountForm() {
  editingAccountId.value = null;
  selectedAccountType.value = accountTypeSections[0].items[0];
  accountDraft.name = "";
  accountDraft.note = "";
  accountDraft.balance = "";
  accountDraft.creditLimit = "";
  accountDraft.billDay = null;
  accountDraft.repaymentDay = null;
  accountErrors.name = "";
  accountErrors.balance = "";
  accountErrors.form = "";
  initialAccountDraftSnapshot.value = serializeAccountDraft();
}

function openTransferModal() {
  transferDraft.fromAccountId = null;
  transferDraft.toAccountId = null;
  transferDraft.amount = "";
  transferDraft.note = "";
  transferErrors.fromAccountId = "";
  transferErrors.toAccountId = "";
  transferErrors.amount = "";
  transferErrors.form = "";
  initialTransferDraftSnapshot.value = serializeTransferDraft();
  showTransferModal.value = true;
}

function serializeAccountDraft() {
  return JSON.stringify({
    editingAccountId: editingAccountId.value,
    selectedAccountType: selectedAccountType.value.key,
    ...accountDraft,
  });
}

function serializeTransferDraft() {
  return JSON.stringify({ ...transferDraft });
}

function serializeRepaymentDraft() {
  return JSON.stringify({ ...repaymentDraft });
}

function requestCloseAccountModal() {
  if (isAccountDraftDirty.value) {
    showUnsavedAccountModal.value = true;
    return;
  }
  showAccountModal.value = false;
}

function confirmCloseAccountModal() {
  showUnsavedAccountModal.value = false;
  initialAccountDraftSnapshot.value = serializeAccountDraft();
  showAccountModal.value = false;
}

function requestCloseTransferModal() {
  if (isTransferDraftDirty.value) {
    showUnsavedTransferModal.value = true;
    return;
  }
  showTransferModal.value = false;
}

function confirmCloseTransferModal() {
  showUnsavedTransferModal.value = false;
  initialTransferDraftSnapshot.value = serializeTransferDraft();
  showTransferModal.value = false;
}

function requestCloseRepaymentModal() {
  if (isRepaymentDraftDirty.value) {
    showUnsavedRepaymentModal.value = true;
    return;
  }
  showRepaymentModal.value = false;
}

function confirmCloseRepaymentModal() {
  showUnsavedRepaymentModal.value = false;
  initialRepaymentDraftSnapshot.value = serializeRepaymentDraft();
  showRepaymentModal.value = false;
}

function validateAccount() {
  accountErrors.name = "";
  accountErrors.balance = "";
  accountErrors.form = "";
  if (!accountDraft.name.trim()) accountErrors.name = "请填写账户名称。";
  try {
    parseAmount(accountDraft.balance || "0");
    if (accountDraft.creditLimit) parseAmount(accountDraft.creditLimit);
  } catch {
    accountErrors.balance = "金额必须是大于等于 0 的数字。";
  }
  if (editingAccount.value && editingAccountFlowCount.value > 0 && selectedAccountType.value.direction !== editingAccount.value.direction) {
    accountErrors.form = `该账户已有 ${editingAccountFlowCount.value} 条资金流水，不能在资产账户和负债账户之间切换。`;
  }
  return !accountErrors.name && !accountErrors.balance && !accountErrors.form;
}

async function submitAccount() {
  if (!validateAccount()) return;
  savingAccount.value = true;
  try {
    const type = selectedAccountType.value;
    const payload = {
      name: accountDraft.name.trim(),
      type: type.type,
      direction: type.direction,
      balance: parseAmount(accountDraft.balance || "0"),
      institution: type.label,
      creditLimit: accountDraft.creditLimit ? parseAmount(accountDraft.creditLimit) : undefined,
      billDay: Number(accountDraft.billDay) || undefined,
      repaymentDay: Number(accountDraft.repaymentDay) || undefined,
      color: type.color,
      icon: type.icon,
      note: accountDraft.note.trim() || undefined,
    };
    if (editingAccountId.value) {
      await accountService.update({ id: editingAccountId.value, ...payload });
    } else {
      await accountService.create(payload);
    }
    await store.refresh();
    if (editingAccountId.value) {
      selectedAccount.value = store.accounts.find((account) => account.id === editingAccountId.value) ?? selectedAccount.value;
    }
    initialAccountDraftSnapshot.value = serializeAccountDraft();
    showAccountModal.value = false;
    editingAccountId.value = null;
  } catch (err) {
    accountErrors.form = err instanceof Error ? err.message : "账户保存失败，请检查表单后重试。";
  } finally {
    savingAccount.value = false;
  }
}

function validateTransfer() {
  transferErrors.fromAccountId = "";
  transferErrors.toAccountId = "";
  transferErrors.amount = "";
  transferErrors.form = "";
  if (!transferDraft.fromAccountId) transferErrors.fromAccountId = "请选择转出账户。";
  if (!transferDraft.toAccountId) transferErrors.toAccountId = "请选择转入账户。";
  if (transferDraft.fromAccountId && transferDraft.fromAccountId === transferDraft.toAccountId) transferErrors.form = "转出和转入账户不能相同。";
  try {
    const amount = parseAmount(transferDraft.amount);
    if (amount <= 0) transferErrors.amount = "转账金额必须大于 0。";
  } catch {
    transferErrors.amount = "请输入正确金额。";
  }
  return !transferErrors.fromAccountId && !transferErrors.toAccountId && !transferErrors.amount && !transferErrors.form;
}

async function submitTransfer() {
  if (!validateTransfer()) return;
  savingTransfer.value = true;
  try {
    await accountService.transfer({
      fromAccountId: String(transferDraft.fromAccountId),
      toAccountId: String(transferDraft.toAccountId),
      amount: parseAmount(transferDraft.amount),
      occurredAt: new Date().toISOString(),
      note: transferDraft.note.trim() || "资金转账",
    });
    await store.refresh();
    initialTransferDraftSnapshot.value = serializeTransferDraft();
    showTransferModal.value = false;
    transferDraft.amount = "";
    transferDraft.note = "";
  } catch (err) {
    transferErrors.form = err instanceof Error ? err.message : "转账保存失败。";
  } finally {
    savingTransfer.value = false;
  }
}

function openRepaymentModal(liabilityAccountId?: string) {
  const liability = liabilityAccountId
    ? store.liabilityAccounts.find((account) => account.id === liabilityAccountId)
    : store.liabilityAccounts[0];
  repaymentDraft.fromAccountId = store.assetAccounts[0]?.id ?? null;
  repaymentDraft.liabilityAccountId = liability?.id ?? null;
  repaymentDraft.amount = liability?.balance ? String(liability.balance) : "";
  repaymentDraft.occurredAt = Date.now();
  repaymentDraft.note = liability ? `${liability.name} 还款` : "";
  repaymentErrors.fromAccountId = "";
  repaymentErrors.liabilityAccountId = "";
  repaymentErrors.amount = "";
  repaymentErrors.date = "";
  repaymentErrors.form = "";
  initialRepaymentDraftSnapshot.value = serializeRepaymentDraft();
  showRepaymentModal.value = true;
}

function openAccountListDrawer(mode: AccountListMode) {
  accountListMode.value = mode;
  showAccountListDrawer.value = true;
}

function openAccountFromList(id: string) {
  showAccountListDrawer.value = false;
  openAccount(id);
}

function openRepaymentFromList(id: string) {
  showAccountListDrawer.value = false;
  openRepaymentModal(id);
}

function validateRepayment() {
  repaymentErrors.fromAccountId = "";
  repaymentErrors.liabilityAccountId = "";
  repaymentErrors.amount = "";
  repaymentErrors.date = "";
  repaymentErrors.form = "";
  if (!repaymentDraft.fromAccountId) repaymentErrors.fromAccountId = "请选择付款账户。";
  if (!repaymentDraft.liabilityAccountId) repaymentErrors.liabilityAccountId = "请选择负债账户。";
  if (!repaymentDraft.occurredAt) repaymentErrors.date = "请选择还款日期。";

  const liability = store.liabilityAccounts.find((account) => account.id === repaymentDraft.liabilityAccountId);
  try {
    const amount = parseAmount(repaymentDraft.amount);
    if (amount <= 0) repaymentErrors.amount = "还款金额必须大于 0。";
    if (liability && amount > liability.balance) repaymentErrors.amount = "还款金额不能大于当前欠款。";
  } catch {
    repaymentErrors.amount = "请输入正确金额。";
  }
  return !repaymentErrors.fromAccountId && !repaymentErrors.liabilityAccountId && !repaymentErrors.amount && !repaymentErrors.date && !repaymentErrors.form;
}

async function submitRepayment() {
  if (!validateRepayment()) return;
  savingRepayment.value = true;
  try {
    await accountService.repayDebt({
      fromAccountId: String(repaymentDraft.fromAccountId),
      liabilityAccountId: String(repaymentDraft.liabilityAccountId),
      amount: parseAmount(repaymentDraft.amount),
      occurredAt: new Date(repaymentDraft.occurredAt ?? Date.now()).toISOString(),
      note: repaymentDraft.note.trim() || "账户还款",
    });
    await store.refresh();
    selectedAccount.value = store.accounts.find((account) => account.id === repaymentDraft.liabilityAccountId) ?? selectedAccount.value;
    initialRepaymentDraftSnapshot.value = serializeRepaymentDraft();
    showRepaymentModal.value = false;
  } catch (err) {
    repaymentErrors.form = err instanceof Error ? err.message : "还款保存失败。";
  } finally {
    savingRepayment.value = false;
  }
}

async function disableAccount(id: string) {
  await accountService.update({ id, enabled: false });
  await store.refresh();
  selectedAccount.value = store.accounts.find((account) => account.id === id) ?? selectedAccount.value;
}

async function enableAccount(id: string) {
  await accountService.update({ id, enabled: true });
  await store.refresh();
  selectedAccount.value = store.accounts.find((account) => account.id === id) ?? selectedAccount.value;
}

function openDeleteAccountModal(id: string) {
  pendingDeleteAccountId.value = id;
  accountDeleteError.value = "";
  showDeleteAccountModal.value = true;
}

async function confirmDeleteAccount() {
  if (!pendingDeleteAccountId.value) return;
  const id = pendingDeleteAccountId.value;
  deletingAccount.value = true;
  try {
    await accountService.delete(id);
    await store.refresh();
    if (selectedAccount.value?.id === id) {
      selectedAccount.value = null;
      showDetailDrawer.value = false;
    }
    showDeleteAccountModal.value = false;
    pendingDeleteAccountId.value = null;
    accountDeleteError.value = "";
  } catch (err) {
    accountDeleteError.value = err instanceof Error ? err.message : "账户删除失败。";
  } finally {
    deletingAccount.value = false;
  }
}

async function disablePendingDeleteAccount() {
  if (!pendingDeleteAccountId.value) return;
  const id = pendingDeleteAccountId.value;
  await disableAccount(id);
  showDeleteAccountModal.value = false;
  pendingDeleteAccountId.value = null;
  accountDeleteError.value = "";
  if (selectedAccount.value?.id === id) {
    selectedAccount.value = store.accounts.find((account) => account.id === id) ?? selectedAccount.value;
  }
}

function openRevokeRepaymentModal(transactionId: string) {
  revokeRepaymentTransactionId.value = transactionId;
  showRevokeRepaymentModal.value = true;
}

async function confirmRevokeRepayment() {
  if (!revokeRepaymentTransactionId.value) return;

  revokingRepayment.value = true;
  try {
    const selectedId = selectedAccount.value?.id;
    await transactionService.delete(revokeRepaymentTransactionId.value);
    await store.refresh();
    selectedAccount.value = selectedId ? store.accounts.find((account) => account.id === selectedId) ?? null : null;
    showRevokeRepaymentModal.value = false;
    revokeRepaymentTransactionId.value = null;
  } finally {
    revokingRepayment.value = false;
  }
}

function openRevokeBalanceAdjustmentModal(transactionId: string) {
  revokeBalanceAdjustmentTransactionId.value = transactionId;
  revokeBalanceAdjustmentError.value = "";
  showRevokeBalanceAdjustmentModal.value = true;
}

async function confirmRevokeBalanceAdjustment() {
  if (!revokeBalanceAdjustmentTransactionId.value) return;

  revokingBalanceAdjustment.value = true;
  revokeBalanceAdjustmentError.value = "";
  try {
    const selectedId = selectedAccount.value?.id;
    await transactionService.delete(revokeBalanceAdjustmentTransactionId.value);
    await store.refresh();
    selectedAccount.value = selectedId ? store.accounts.find((account) => account.id === selectedId) ?? null : null;
    showRevokeBalanceAdjustmentModal.value = false;
    revokeBalanceAdjustmentTransactionId.value = null;
  } catch (err) {
    revokeBalanceAdjustmentError.value = err instanceof Error ? err.message : "撤销余额调整失败，请稍后重试。";
  } finally {
    revokingBalanceAdjustment.value = false;
  }
}

function openAccount(id: string) {
  selectedAccount.value = store.accounts.find((account) => account.id === id) ?? null;
  showDetailDrawer.value = true;
}

function applyRouteState() {
  const accountId = typeof route.query.accountId === "string" ? route.query.accountId : "";
  if (accountId) {
    const account = store.accounts.find((item) => item.id === accountId);
    if (account) {
      selectedAccount.value = account;
      showDetailDrawer.value = true;
      return;
    }
  }

  const view = typeof route.query.view === "string" ? route.query.view : "";
  if (view === "asset" || view === "liability" || view === "repayment") {
    openAccountListDrawer(view);
  }
}

function goLedger() {
  showDetailDrawer.value = false;
  router.push("/ledger");
}
</script>

<style scoped>
.funds-page { display: grid; gap: var(--space-5); }
.page-subtitle { margin: 0; color: var(--color-text-secondary); }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-5); }
.summary-card { min-height: 170px; padding: 22px; overflow: hidden; border: 1px solid var(--tone-border); border-radius: 18px; background: linear-gradient(135deg, #fff, var(--tone-bg)); box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05); }
.summary-card.blue { --tone: #1677ff; --tone-bg: #eff6ff; --tone-border: #bfdbfe; }
.summary-card.green { --tone: #16a36a; --tone-bg: #f0fdf4; --tone-border: #bbf7d0; }
.summary-card.red { --tone: #ef4444; --tone-bg: #fff1f0; --tone-border: #fecaca; }
.summary-card.purple { --tone: #7c3aed; --tone-bg: #f5f3ff; --tone-border: #ddd6fe; }
.summary-card__head { display: flex; justify-content: space-between; color: var(--tone); font-size: var(--font-caption); font-weight: 800; }
.summary-card__head i { display: grid; width: 22px; height: 22px; place-items: center; background: color-mix(in srgb, var(--tone) 12%, white); border-radius: 50%; font-style: normal; }
.summary-card strong { display: block; margin-top: var(--space-2); color: var(--tone); font-size: 26px; }
.summary-card p { margin: var(--space-1) 0 var(--space-4); color: var(--color-text-tertiary); font-size: var(--font-caption); }
.summary-card em, .summary-card small { color: var(--color-text-secondary); font-style: normal; }
.summary-card svg { width: 100%; height: 56px; }
.summary-card polyline { fill: none; stroke: var(--tone); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.trend-empty { display: grid; height: 56px; place-items: center; color: color-mix(in srgb, var(--tone) 54%, #94a3b8); font-size: var(--font-caption); font-weight: 800; background: color-mix(in srgb, var(--tone) 6%, transparent); border: 1px dashed color-mix(in srgb, var(--tone) 22%, transparent); border-radius: 12px; }
.panel-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-5); }
.list-panel, .flow-panel { padding: var(--space-5); }
.panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); }
.panel-head h3 { margin: 0; font-size: var(--font-card-title); }
.panel-head span, .panel-head small, .panel-head button { color: var(--color-text-tertiary); }
.panel-head button { background: none; border: 0; cursor: pointer; font-weight: 700; }
.account-line, .debt-line, .reminder-line { width: 100%; min-height: 64px; display: grid; align-items: center; gap: var(--space-3); color: var(--color-text-primary); background: transparent; border: 0; border-bottom: 1px solid var(--color-border); cursor: pointer; text-align: left; }
.account-line { grid-template-columns: 34px 1fr auto 68px; }
.debt-line, .reminder-line { grid-template-columns: 34px 1fr auto; }
.account-line:hover, .debt-line:hover, .reminder-line:hover { background: var(--color-bg-hover); }
.account-icon { display: grid; width: 30px; height: 30px; place-items: center; color: #fff; border-radius: 9px; font-size: 12px; font-weight: 800; }
.account-line strong, .debt-line strong, .reminder-line strong { font-weight: 800; }
.account-line em, .debt-line em, .reminder-line em { font-style: normal; font-weight: 800; }
.account-line small, .debt-line small, .reminder-line small { display: block; margin-top: 3px; color: var(--color-text-tertiary); font-size: 11px; }
.account-line svg { width: 68px; height: 24px; }
.account-line polyline { fill: none; stroke: var(--color-success); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.mini-trend-empty { justify-self: end; width: 68px; margin: 0; color: var(--color-text-tertiary); text-align: right; }
.panel-link { display: block; margin: var(--space-4) auto 0; color: var(--color-primary); background: transparent; border: 0; cursor: pointer; font-weight: 800; }
.flow-panel table { width: 100%; border-collapse: collapse; }
.flow-panel th, .flow-panel td { height: 46px; padding: 0 var(--space-4); color: var(--color-text-secondary); font-size: var(--font-table); text-align: left; border-bottom: 1px solid var(--color-border); }
.flow-panel th { background: var(--color-bg-hover); color: #667085; }
.type-pill { display: inline-flex; height: 24px; align-items: center; padding: 0 var(--space-3); border-radius: 999px; font-size: 12px; font-weight: 800; }
.type-pill.in { color: var(--color-success); background: #dcfce7; }
.type-pill.out { color: var(--color-danger); background: #fee2e2; }
.success { color: var(--color-success) !important; }
.danger { color: var(--color-danger) !important; }
.danger-bg { background: var(--color-danger); }
.account-modal, .transfer-modal { max-height: calc(100dvh - 48px); overflow: auto; background: #fff; }
.modal-head { display: flex; justify-content: space-between; gap: var(--space-6); padding: 24px 28px; color: #fff; background: linear-gradient(135deg, #111827, #2563eb 58%, #60a5fa); }
.modal-head.green { background: linear-gradient(135deg, #0f766e, #1677ff); }
.modal-head.orange { background: linear-gradient(135deg, #7c2d12, #f97316 58%, #fbbf24); }
.modal-head span { font-size: var(--font-caption); font-weight: 800; opacity: .82; }
.modal-head h2 { margin: var(--space-2) 0; }
.modal-head p { margin: 0; opacity: .82; }
.modal-head button { width: 32px; height: 32px; color: #fff; background: rgba(255,255,255,.16); border: 0; border-radius: 50%; cursor: pointer; }
.account-modal__body { display: grid; grid-template-columns: 360px 1fr; min-height: 500px; }
.type-panel { display: grid; gap: var(--space-4); align-content: start; padding: var(--space-5); background: #f8fbff; border-right: 1px solid var(--color-border); }
.type-group h4, .account-form h3 { margin: 0 0 var(--space-3); }
.type-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-3); }
.type-grid button { display: grid; justify-items: center; gap: var(--space-2); min-height: 62px; padding: var(--space-2); background: transparent; border: 1px solid transparent; border-radius: 12px; cursor: pointer; }
.type-grid button.active { background: #eef5ff; border-color: var(--color-primary); }
.type-grid button:disabled { cursor: not-allowed; opacity: .72; }
.type-grid span { display: grid; width: 32px; height: 32px; place-items: center; color: #fff; border-radius: 50%; font-size: 11px; font-weight: 800; }
.account-form { padding: var(--space-5); }
.form-grid, .transfer-body { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
.transfer-body .full { grid-column: 1 / -1; }
.form-grid label, .transfer-body label { display: grid; grid-template-rows: auto auto 16px; gap: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-caption); font-weight: 700; }
.form-grid label.invalid, .transfer-body label.invalid { color: var(--color-danger); }
.form-grid em, .transfer-body em { min-height: 16px; color: var(--color-danger); font-style: normal; line-height: 16px; }
.form-error { margin-top: var(--space-3); padding: var(--space-3); color: var(--color-danger); background: #fff1f0; border: 1px solid #ffccc7; border-radius: 10px; }
.delete-account-detail { display: grid; gap: var(--space-3); }
.delete-account-detail div { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding-bottom: var(--space-3); border-bottom: 1px solid var(--color-border); }
.delete-account-detail span { color: var(--color-text-tertiary); font-size: var(--font-caption); font-weight: 700; }
.delete-account-detail strong { color: var(--color-text-primary); }
.delete-account-detail .form-error { margin: 0; }
.delete-account-detail :deep(.r-button) { justify-self: end; }
.account-form footer, .modal-footer { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-5); }
.transfer-body { padding: var(--space-5); }
.transfer-error { margin: 0 var(--space-5); }
.modal-footer { padding: 0 var(--space-5) var(--space-5); }
.account-detail { display: grid; gap: var(--space-5); }
.account-detail-hero { display: grid; grid-template-columns: 56px 1fr auto; gap: var(--space-4); align-items: center; padding: var(--space-5); color: #fff; background: linear-gradient(135deg, #111827, #2563eb 58%, #60a5fa); border-radius: 18px; box-shadow: 0 18px 42px rgba(22, 119, 255, 0.16); }
.account-detail-hero.liability { background: linear-gradient(135deg, #7f1d1d, #ef4444 58%, #fb7185); box-shadow: 0 18px 42px rgba(239, 68, 68, 0.14); }
.account-detail__icon { display: grid; width: 52px; height: 52px; place-items: center; color: #fff; border: 1px solid rgba(255,255,255,.32); border-radius: 16px; font-weight: 800; box-shadow: inset 0 0 0 999px rgba(255,255,255,.08); }
.account-detail h3, .account-detail p { margin: 0; }
.account-detail-hero span { font-size: var(--font-caption); font-weight: 800; opacity: .82; }
.account-detail-hero h3 { margin: 4px 0; font-size: 22px; }
.account-detail-hero p { opacity: .82; }
.account-detail-hero > strong { font-size: 26px; white-space: nowrap; }
.account-maintenance { display: flex; justify-content: flex-end; gap: var(--space-3); padding: var(--space-3); background: #f8fbff; border: 1px solid var(--color-border); border-radius: 14px; }
.repayment-callout { display: flex; justify-content: space-between; gap: var(--space-4); align-items: center; padding: var(--space-4); background: linear-gradient(135deg, #fff7ed, #fff); border: 1px solid #fed7aa; border-radius: 16px; box-shadow: 0 14px 32px rgba(249, 115, 22, .08); }
.repayment-callout span { color: #c2410c; font-size: var(--font-caption); font-weight: 800; }
.repayment-callout strong { display: block; margin-top: 4px; color: var(--color-text-primary); }
.repayment-callout p { margin: 4px 0 0; color: var(--color-text-secondary); font-size: var(--font-caption); line-height: 1.6; }
.account-metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-3); }
.account-metric-grid div { display: grid; gap: var(--space-2); padding: var(--space-4); background: #f8fbff; border: 1px solid var(--color-border); border-radius: 14px; }
.account-metric-grid span, .drawer-section-head span, .account-flow-item small, .account-transaction-item small, .drawer-section-head small { color: var(--color-text-tertiary); font-size: var(--font-caption); font-weight: 700; }
.account-metric-grid strong { color: var(--color-text-primary); font-size: 16px; }
.account-flow-section { display: grid; gap: var(--space-3); padding: var(--space-4); background: #fff; border: 1px solid var(--color-border); border-radius: 16px; }
.drawer-section-head { display: flex; justify-content: space-between; gap: var(--space-3); align-items: flex-start; }
.drawer-section-head h4 { margin: 4px 0 0; color: var(--color-text-primary); font-size: 16px; }
.account-flow-list, .account-transaction-list { display: grid; gap: var(--space-2); }
.account-flow-item, .account-transaction-item { display: grid; gap: var(--space-3); align-items: center; min-height: 58px; padding: var(--space-3); background: var(--color-bg-hover); border: 1px solid transparent; border-radius: 12px; }
.account-flow-item { grid-template-columns: auto 1fr auto; }
.account-transaction-item { grid-template-columns: 1fr auto; }
.account-flow-item strong, .account-transaction-item strong { color: var(--color-text-primary); }
.account-flow-item em { font-style: normal; font-weight: 800; }
.flow-tail { display: grid; justify-items: end; gap: 4px; }
.flow-tail button { color: var(--color-danger); background: transparent; border: 0; cursor: pointer; font-size: 12px; font-weight: 800; }
.flow-tail button:hover { text-decoration: underline; }
.drawer-empty { display: grid; min-height: 96px; place-items: center; color: var(--color-text-tertiary); background: var(--color-bg-hover); border: 1px dashed var(--color-border); border-radius: 14px; }
.account-list-drawer { display: grid; gap: var(--space-4); }
.drawer-account-list { display: grid; gap: var(--space-3); }
.drawer-account-item { display: grid; grid-template-columns: 40px 1fr auto; gap: var(--space-3); align-items: center; width: 100%; min-height: 78px; padding: var(--space-4); color: var(--color-text-primary); text-align: left; background: #fff; border: 1px solid var(--color-border); border-radius: 16px; cursor: pointer; box-shadow: 0 12px 32px rgba(15, 23, 42, .04); transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease; }
.drawer-account-item:hover { border-color: color-mix(in srgb, var(--color-primary) 38%, var(--color-border)); box-shadow: 0 18px 42px rgba(22, 119, 255, .1); transform: translateY(-1px); }
.drawer-account-item.repayment:hover { border-color: color-mix(in srgb, var(--color-danger) 32%, var(--color-border)); box-shadow: 0 18px 42px rgba(239, 68, 68, .08); }
.drawer-account-item strong { color: var(--color-text-primary); font-weight: 800; }
.drawer-account-item small { display: block; margin-top: 4px; color: var(--color-text-tertiary); font-size: var(--font-caption); font-weight: 700; }
.drawer-account-tail { display: grid; justify-items: end; gap: 3px; min-width: 128px; }
.drawer-account-tail em { color: var(--color-text-tertiary); font-size: var(--font-caption); font-style: normal; font-weight: 700; }
@media (max-width: 1200px) {
  .summary-grid, .panel-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .account-modal__body { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .summary-grid, .panel-grid, .account-metric-grid { grid-template-columns: 1fr; }
  .account-detail-hero { grid-template-columns: 52px 1fr; }
  .account-detail-hero > strong { grid-column: 1 / -1; }
  .account-maintenance { flex-direction: column; }
  .repayment-callout { align-items: stretch; flex-direction: column; }
}
</style>

<style>
.rizhi-fund-modal-card.n-card { overflow: hidden; background: var(--color-bg-card); box-shadow: 0 24px 80px rgba(17, 24, 39, 0.22); }
.rizhi-fund-modal-card .n-card__content { min-height: 0; overflow: auto; padding: 0 !important; }
</style>
