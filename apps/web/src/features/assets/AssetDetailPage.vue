<template>
  <RDataGate :loading="store.loading" :ready="store.initialized" :error="store.error" @retry="initializeData">
    <section v-if="asset" class="asset-detail-page">
    <PageHeader :title="asset.name">
      <template #eyebrow>
        <nav class="breadcrumb" aria-label="面包屑导航">
          <RouterLink to="/assets">物品资产</RouterLink>
          <span>/</span>
          <span>资产详情</span>
        </nav>
      </template>

      <RButton variant="secondary" @click="openEditAssetModal">编辑</RButton>
      <RButton variant="secondary" :disabled="asset.status === 'transferred' || asset.status === 'disposed'" @click="openTransferModal">转让</RButton>
      <div class="more-menu">
        <RButton variant="secondary">更多 ▾</RButton>
        <div class="more-menu__popover">
          <button v-if="asset.status === 'transferred'" type="button" @click="openRevokeTransferModal">撤销转让</button>
          <button v-if="asset.status === 'idle' || asset.status === 'disposed'" type="button" @click="setAssetStatus('using')">恢复使用中</button>
          <button v-if="asset.status === 'using'" type="button" @click="setAssetStatus('idle')">标记闲置</button>
          <button v-if="asset.status === 'using' || asset.status === 'idle'" type="button" @click="setAssetStatus('disposed')">标记已处置</button>
          <button class="danger" type="button" @click="openDeleteModal">删除资产</button>
        </div>
      </div>
    </PageHeader>

    <div class="detail-hero">
      <RCard>
        <div class="product-media">
          <div class="product-media__main">
            <img v-if="activeMedia.type === 'image'" :src="activeMedia.src" :alt="asset.name" />
            <span v-else>{{ activeMedia.label }}</span>
          </div>
          <div class="product-media__thumbs">
            <button
              v-for="(thumb, index) in mediaItems"
              :key="thumb.key"
              :class="{ active: selectedMediaIndex === index }"
              type="button"
              @click="selectedMediaIndex = index"
            >
              <img v-if="thumb.type === 'image'" :src="thumb.src" :alt="`${asset.name} 图片 ${index + 1}`" />
              <span v-else>{{ thumb.label }}</span>
            </button>
          </div>
        </div>
      </RCard>

      <div class="product-info">
        <h2>{{ asset.name }}</h2>
        <p>{{ asset.brand || "未填写品牌" }} / {{ categoryName(asset.categoryId) }}</p>
        <dl>
          <div><dt>资产状态：</dt><dd><RTag :tone="asset.status === 'transferred' ? 'warning' : 'success'">{{ statusLabel(asset.status) }}</RTag></dd></div>
          <div><dt>购入日期：</dt><dd>{{ asset.purchaseDate }}</dd></div>
          <div><dt>购买渠道：</dt><dd>{{ purchaseChannelLabel(asset.purchaseChannel) }}</dd></div>
          <div><dt>购买商家：</dt><dd>{{ asset.merchant || "-" }}</dd></div>
          <div><dt>保修开始：</dt><dd>{{ asset.warrantyStartDate || "-" }}</dd></div>
          <div><dt>过保日期：</dt><dd>{{ asset.warrantyEndDate || "-" }} <span v-if="warrantyDays !== undefined" class="danger">（剩余 {{ warrantyDays }} 天）</span></dd></div>
          <div><dt>付款账户：</dt><dd>{{ accountName(asset.paymentAccountId) }}</dd></div>
          <div><dt>备注：</dt><dd class="success">{{ asset.notes || "无" }}</dd></div>
        </dl>
      </div>

      <RCard>
        <div class="cost-card">
          <h3>成本概览</h3>
          <div class="cost-row"><span>原始购入价</span><strong>{{ formatAmount(asset.originalCost) }}</strong></div>
          <div class="cost-row"><span>附加项合计</span><strong>{{ formatAmount(addonCost) }}</strong></div>
          <div class="cost-row"><span>资产总成本</span><strong>{{ formatAmount(totalCost) }}</strong></div>
          <div class="cost-row split"><span>{{ asset.status === "transferred" ? "转让收入" : "当前估值" }}</span><strong>{{ formatAmount(asset.currentValue ?? totalCost) }}</strong></div>
          <div class="cost-row"><span>{{ profitLoss >= 0 ? "已收益" : "已损失" }}</span><strong :class="profitLoss >= 0 ? 'success' : 'danger'">{{ formatAmount(Math.abs(profitLoss)) }}</strong></div>
          <div class="daily-cost"><span>日均成本</span><strong>{{ formatAmount(dailyCost) }}</strong></div>
        </div>
      </RCard>
    </div>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab"
        type="button"
        :data-testid="tab === addonTab ? 'asset-tab-addons' : undefined"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <RCard v-if="activeTab === overviewTab">
      <div class="overview-panel">
        <div class="overview-panel__hero">
          <div>
            <span>资产概览</span>
            <h3>{{ asset.name }} 的使用与成本状态</h3>
            <p>把持有、保修、估值和日均成本放在一起看，方便判断这件物品还值不值得继续留着。</p>
          </div>
          <div class="overview-score">
            <span>日均成本</span>
            <strong>{{ formatAmount(dailyCost) }}</strong>
          </div>
        </div>

        <div class="overview-metrics">
          <div v-for="metric in overviewMetrics" :key="metric.label" class="overview-metric" :class="metric.tone">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <small>{{ metric.hint }}</small>
          </div>
        </div>

        <div class="overview-grid">
          <div class="overview-block">
            <span>成本结构</span>
            <div class="overview-row"><em>原始购入价</em><strong>{{ formatAmount(asset.originalCost) }}</strong></div>
            <div class="overview-row"><em>附加项合计</em><strong>{{ formatAmount(addonCost) }}</strong></div>
            <div class="overview-row total"><em>资产总成本</em><strong>{{ formatAmount(totalCost) }}</strong></div>
          </div>
          <div class="overview-block">
            <span>生命周期</span>
            <div class="overview-row"><em>购买日期</em><strong>{{ asset.purchaseDate }}</strong></div>
            <div class="overview-row"><em>过保日期</em><strong>{{ asset.warrantyEndDate || "-" }}</strong></div>
            <div class="overview-row total"><em>当前状态</em><strong>{{ statusLabel(asset.status) }}</strong></div>
          </div>
          <div class="overview-block accent">
            <span>{{ profitLoss >= 0 ? "当前收益" : "当前损失" }}</span>
            <strong>{{ formatAmount(Math.abs(profitLoss)) }}</strong>
            <p>按当前估值与资产总成本估算，不影响历史记账流水。</p>
          </div>
        </div>
      </div>
    </RCard>

    <RCard v-else-if="activeTab === addonTab">
      <div class="section-card">
        <div class="section-card__head">
          <h3>附加项（{{ assetAddons.length }}）</h3>
          <RButton data-testid="asset-add-addon" :disabled="!canManageAddons" @click="openAddonCreate">+ 添加附加项</RButton>
        </div>

        <div v-if="!canManageAddons" class="readonly-hint">
          当前资产状态为「{{ statusLabel(asset.status) }}」，附加项进入只读模式。如需修改，请先恢复为使用中。
        </div>

        <table v-if="assetAddons.length" class="simple-table">
          <thead>
            <tr>
              <th>附加项</th>
              <th>收支</th>
              <th>类型</th>
              <th>金额</th>
              <th>日期</th>
              <th>账户</th>
              <th>是否计入成本</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="addon in assetAddons" :key="addon.id">
              <td>
                <div class="addon-cell">
                  <div class="addon-thumb">
                    <img v-if="addonCover(addon)" :src="addonCover(addon)" :alt="addon.name" />
                    <span v-else>{{ addon.name.slice(0, 1) }}</span>
                  </div>
                  <strong>{{ addon.name }}</strong>
                </div>
              </td>
              <td><RTag :tone="addonDirection(addon) === 'income' ? 'success' : 'danger'">{{ addonDirectionLabel(addon) }}</RTag></td>
              <td>{{ addonTypeLabel(addon.type, addonDirection(addon)) }}</td>
              <td :class="addonDirection(addon) === 'income' ? 'success' : 'danger'">{{ addonDirection(addon) === "income" ? "+" : "-" }}{{ formatAmount(addon.amount) }}</td>
              <td>{{ addon.purchaseDate }}</td>
              <td>{{ accountName(addon.paymentAccountId) }}</td>
              <td>{{ addonDirection(addon) === "income" ? "收入不计成本" : addon.includedInCost ? "计入成本" : "不计入成本" }}</td>
              <td class="table-actions">
                <button type="button" @click="openAddonDetail(addon)">查看</button>
                <button v-if="canManageAddons" type="button" @click="openAddonEdit(addon)">编辑</button>
                <button v-if="canManageAddons" type="button" class="danger" @click="openDeleteAddon(addon)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>

        <REmptyState v-else title="暂无附加项" description="新买 CPU、维修支出、卖掉旧配件的收入都可以沉淀到这里。" />
      </div>
    </RCard>

    <RCard v-else-if="activeTab === historyTab">
      <div class="section-card">
        <div class="section-card__head">
          <h3>历史记录（{{ assetHistoryItems.length }}）</h3>
        </div>

        <div v-if="assetHistoryItems.length" class="history-timeline">
          <div v-for="item in assetHistoryItems" :key="item.id" class="history-item">
            <div class="history-dot" :class="item.tone"></div>
            <div class="history-card">
              <div>
                <span>{{ item.time }}</span>
                <strong>{{ item.title }}</strong>
              </div>
              <p>{{ item.description }}</p>
            </div>
          </div>
        </div>

        <REmptyState v-else title="暂无历史记录" description="后续对资产和附加项的操作会沉淀到这里。" />
      </div>
    </RCard>

    <Teleport to="body">
      <div v-if="showAddonModal" class="modal-overlay">
        <section class="addon-dialog" data-testid="asset-addon-modal" role="dialog" aria-modal="true" aria-labelledby="addon-dialog-title">
          <header class="modal-hero">
            <div>
              <span>{{ editingAddonId ? "编辑附加项" : "资产附加项" }}</span>
              <h2 id="addon-dialog-title">{{ editingAddonId ? "调整附加项信息和图片" : `给「${asset.name}」记录一笔附加项` }}</h2>
              <p>附加项支持支出和收入：新买 CPU 是支出，卖掉旧 CPU 是收入。保存后会同步资产档案和记账流水。</p>
            </div>
            <button type="button" data-testid="asset-addon-close" aria-label="关闭" @click="requestCloseAddonModal">×</button>
          </header>

          <div class="addon-dialog__body">
            <aside class="addon-uploader">
              <div class="addon-uploader__preview">
                <img v-if="addonDraft.imageUrl || addonDraft.imageUrls[0]" :src="addonDraft.imageUrl || addonDraft.imageUrls[0]" :alt="addonDraft.name || '附加项图片'" />
                <span v-else>{{ addonDraft.name.slice(0, 1) || "附" }}</span>
              </div>
              <strong>附加项图片</strong>
              <p>可上传配件实拍、购物凭证或维修单。多张图片会在详情页中展示。</p>
              <input ref="addonFileInput" data-testid="addon-image-input" class="hidden-file" type="file" accept="image/*" multiple @change="handleAddonImages" />
              <RButton variant="secondary" @click="addonFileInput?.click()">上传图片</RButton>
              <div v-if="addonDraft.imageUrls.length" class="addon-image-list">
                <button
                  v-for="(image, index) in addonDraft.imageUrls"
                  :key="`${image.slice(0, 24)}-${index}`"
                  :class="{ active: addonDraft.imageUrl === image }"
                  type="button"
                  @click="addonDraft.imageUrl = image"
                >
                  <img :src="image" :alt="`附加项图片 ${index + 1}`" />
                  <span data-testid="addon-image-remove" @click.stop="openRemoveAddonImageConfirm(index)">×</span>
                </button>
              </div>
            </aside>

            <div class="addon-form">
              <section class="addon-section">
                <h3>收支方向</h3>
                <div class="addon-direction-grid">
                  <button type="button" :class="{ active: addonDraft.direction === 'expense' }" @click="setAddonDirection('expense')">
                    <strong>支出</strong>
                    <span>新买配件、维修、升级，减少付款账户余额。</span>
                  </button>
                  <button type="button" :class="{ active: addonDraft.direction === 'income' }" @click="setAddonDirection('income')">
                    <strong>收入</strong>
                    <span>卖掉旧配件、订阅分摊回款，增加收款账户余额。</span>
                  </button>
                </div>
              </section>

              <section class="addon-section">
                <h3>{{ addonDraft.direction === "income" ? "收入类型" : "附加项类型" }}</h3>
                <div class="addon-type-grid">
                  <button v-for="option in currentAddonTypeOptions" :key="option.value" :class="{ active: addonDraft.type === option.value }" type="button" @click="addonDraft.type = option.value">
                    <strong>{{ option.label }}</strong>
                    <span>{{ option.hint }}</span>
                  </button>
                </div>
              </section>

              <section class="addon-section">
                <h3>{{ addonDraft.direction === "income" ? "收入信息" : "购买信息" }}</h3>
                <div class="addon-form-grid">
                  <label :class="{ invalid: addonErrors.name }">
                    <span>附加项名称</span>
                    <RInput v-model="addonDraft.name" data-testid="addon-name-field" :placeholder="addonDraft.direction === 'income' ? '例如 卖出旧 CPU' : '例如 透明手机壳'" />
                    <em>{{ addonErrors.name }}</em>
                  </label>
                  <label :class="{ invalid: addonErrors.amount }">
                    <span>金额</span>
                    <RInput v-model="addonDraft.amount" data-testid="addon-amount-field" placeholder="¥ 0.00" />
                    <em>{{ addonErrors.amount }}</em>
                  </label>
                  <label :class="{ invalid: addonErrors.purchaseDate }">
                    <span>{{ addonDraft.direction === "income" ? "收入日期" : "购买日期" }}</span>
                    <RDatePicker v-model="addonDraft.purchaseDate" placeholder="选择日期" />
                    <em>{{ addonErrors.purchaseDate }}</em>
                  </label>
                  <label :class="{ invalid: addonErrors.accountId }">
                    <span>{{ addonDraft.direction === "income" ? "收款账户" : "付款账户" }}</span>
                    <RSelect v-model="addonDraft.accountId" :options="accountOptions" :placeholder="addonDraft.direction === 'income' ? '选择收款账户' : '选择付款账户'" />
                    <em>{{ addonErrors.accountId }}</em>
                  </label>
                  <label class="wide-field"><span>备注</span><RInput v-model="addonDraft.note" :placeholder="addonDraft.direction === 'income' ? '例如 闲鱼卖出旧 CPU，主机继续使用' : '例如 官方配件、透明壳、线下维修'" /></label>
                </div>
              </section>

              <RInlineFeedback v-if="addonErrors.form" tone="danger">{{ addonErrors.form }}</RInlineFeedback>

              <section v-if="addonDraft.direction === 'expense'" class="addon-rule-card">
                <label class="addon-switch">
                  <input v-model="addonDraft.includedInCost" type="checkbox" />
                  <strong>计入资产成本</strong>
                </label>
                <p>{{ addonDraft.includedInCost ? "这笔金额会进入资产总成本，并影响日均成本。" : "这笔记录只进入记账流水，不改变资产成本。" }}</p>
              </section>
              <section v-else class="addon-rule-card income-rule">
                <strong>收入不计入资产成本</strong>
                <p>这笔金额会生成收入流水并增加账户余额；资产总成本不变，历史记录会保留这次回款。</p>
              </section>
            </div>
          </div>

          <footer class="modal-footer">
            <RButton data-testid="asset-addon-cancel" variant="secondary" @click="requestCloseAddonModal">取消</RButton>
            <RButton data-testid="asset-addon-save" :loading="savingAddon" @click="saveAddon">{{ editingAddonId ? "保存修改" : "保存附加项" }}</RButton>
          </footer>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="selectedAddon" class="modal-overlay">
        <section class="addon-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="addon-detail-title">
          <header class="modal-hero">
            <div>
              <span>附加项详情</span>
              <h2 id="addon-detail-title">{{ selectedAddon.name }}</h2>
              <p>{{ addonDirectionLabel(selectedAddon) }} / {{ addonTypeLabel(selectedAddon.type, addonDirection(selectedAddon)) }} / {{ asset.name }}</p>
            </div>
            <button type="button" aria-label="关闭" @click="selectedAddon = null">×</button>
          </header>

          <div class="addon-detail-dialog__body">
            <div class="addon-detail-media">
              <img v-if="addonCover(selectedAddon)" :src="addonCover(selectedAddon)" :alt="selectedAddon.name" />
              <span v-else>{{ selectedAddon.name.slice(0, 1) }}</span>
            </div>
            <div class="addon-detail-amount">
              <span>金额</span>
              <strong :class="addonDirection(selectedAddon) === 'income' ? 'success' : 'danger'">{{ addonDirection(selectedAddon) === "income" ? "+" : "-" }}{{ formatAmount(selectedAddon.amount) }}</strong>
            </div>
            <div v-if="addonImages(selectedAddon).length > 1" class="addon-detail-thumbs">
              <img v-for="(image, index) in addonImages(selectedAddon)" :key="`${image}-${index}`" :src="image" :alt="`${selectedAddon.name} 图片 ${index + 1}`" />
            </div>
            <div class="addon-detail-grid">
              <div><span>购买日期</span><strong>{{ selectedAddon.purchaseDate }}</strong></div>
              <div><span>{{ addonDirection(selectedAddon) === "income" ? "收款账户" : "付款账户" }}</span><strong>{{ accountName(selectedAddon.paymentAccountId) }}</strong></div>
              <div><span>是否计入成本</span><strong>{{ addonDirection(selectedAddon) === "income" ? "收入不计成本" : selectedAddon.includedInCost ? "计入成本" : "不计入成本" }}</strong></div>
              <div><span>关联资产</span><strong>{{ asset.name }}</strong></div>
            </div>
            <div class="addon-detail-note">
              <span>备注</span>
              <p>{{ selectedAddon.notes || "暂无备注" }}</p>
            </div>
          </div>

          <footer class="modal-footer">
            <RButton variant="secondary" @click="selectedAddon = null">关闭</RButton>
            <RButton v-if="canManageAddons" variant="danger" @click="openDeleteAddon(selectedAddon)">删除附加项</RButton>
            <RButton v-if="canManageAddons" @click="openAddonEdit(selectedAddon)">编辑附加项</RButton>
          </footer>
        </section>
      </div>
    </Teleport>

    <AssetUpsertModal v-model:show="showEditModal" mode="edit" :asset="asset" :error="assetEditError" :loading="savingEdit" @save="saveAssetEdit" />

    <Teleport to="body">
      <div v-if="showTransferModal" class="modal-overlay">
        <section class="transfer-dialog" role="dialog" aria-modal="true">
          <header class="modal-hero modal-hero--green">
            <div><span>资产转让</span><h2>记录这件物品离开你的时刻</h2><p>保存后会把资产标记为已转让，并生成一条收入记录。</p></div>
            <button type="button" aria-label="关闭" @click="requestCloseTransferModal">×</button>
          </header>
          <div class="transfer-dialog__body">
            <aside class="transfer-summary"><span>资产总成本</span><strong>{{ formatAmount(totalCost) }}</strong><p>转让金额会作为当前估值，用于计算最终收益或损失。</p></aside>
            <div class="transfer-form">
              <label :class="{ invalid: transferErrors.amount }"><span>转让金额</span><RInput v-model="transferDraft.amount" placeholder="例如 5000" /><em>{{ transferErrors.amount }}</em></label>
              <label :class="{ invalid: transferErrors.date }"><span>转让日期</span><RDatePicker v-model="transferDraft.date" placeholder="选择日期" /><em>{{ transferErrors.date }}</em></label>
              <label :class="{ invalid: transferErrors.accountId }"><span>收款账户</span><RSelect v-model="transferDraft.accountId" :options="assetAccountOptions" placeholder="选择收款账户" /><em>{{ transferErrors.accountId }}</em></label>
              <label class="wide-field"><span>备注</span><RInput v-model="transferDraft.note" placeholder="例如 闲鱼卖出 / 送给朋友 / 折价处理" /></label>
            </div>
          </div>
          <RInlineFeedback v-if="transferErrors.form" class="transfer-form-error" tone="danger">{{ transferErrors.form }}</RInlineFeedback>
          <footer class="modal-footer"><RButton variant="secondary" @click="requestCloseTransferModal">取消</RButton><RButton :loading="savingTransfer" @click="saveTransfer">确认转让</RButton></footer>
        </section>
      </div>
    </Teleport>

    <DeleteConfirmModal v-model:show="showDeleteModal" :loading="deletingAsset" :title="`删除「${asset.name}」？`" description="删除后会移除资产档案和附加项。历史记账流水会保留，但会解除与该资产的关联。" confirm-text="删除资产" @confirm="confirmDeleteAsset">
      <div class="delete-detail"><span>资产总成本</span><strong>{{ formatAmount(totalCost) }}</strong></div>
      <div class="delete-detail"><span>附加项数量</span><strong>{{ assetAddons.length }} 项</strong></div>
    </DeleteConfirmModal>

    <DeleteConfirmModal v-model:show="showRevokeTransferModal" :loading="revokingTransfer" :title="`撤销「${asset.name}」的转让？`" description="撤销后会删除对应的资产转让收入，回滚收款账户余额，并把资产恢复为使用中。" eyebrow="撤销操作" confirm-text="撤销转让" @confirm="confirmRevokeTransfer">
      <div class="delete-detail"><span>当前状态</span><strong>{{ statusLabel(asset.status) }}</strong></div>
      <div class="delete-detail"><span>转让收入</span><strong>{{ formatAmount(asset.currentValue ?? 0) }}</strong></div>
    </DeleteConfirmModal>

    <DeleteConfirmModal
      v-model:show="showDeleteAddonModal"
      :loading="deletingAddon"
      :title="pendingDeleteAddon ? `删除「${pendingDeleteAddon.name}」？` : '删除附加项？'"
      description="删除后会移除附加项档案；如果它关联了账单和资金流水，还会同步回滚账户余额并删除对应记录。"
      eyebrow="删除附加项"
      confirm-text="确认删除"
      @confirm="confirmDeleteAddon"
    >
      <template v-if="pendingDeleteAddon">
        <div class="delete-detail"><span>收支方向</span><strong>{{ addonDirectionLabel(pendingDeleteAddon) }}</strong></div>
        <div class="delete-detail"><span>金额</span><strong>{{ formatAmount(pendingDeleteAddon.amount) }}</strong></div>
        <div class="delete-detail"><span>关联账户</span><strong>{{ accountName(pendingDeleteAddon.paymentAccountId) }}</strong></div>
        <RInlineFeedback v-if="addonDeleteError" tone="danger">{{ addonDeleteError }}</RInlineFeedback>
      </template>
    </DeleteConfirmModal>

    <DeleteConfirmModal
      v-model:show="showIdleAddonConfirmModal"
      :title="`仍要给「${asset.name}」新增附加项？`"
      description="该资产当前处于闲置状态。新增附加项后仍会影响资产档案、成本和关联记账，请确认这是你想记录的真实变动。"
      eyebrow="闲置资产提醒"
      confirm-text="继续新增"
      @confirm="confirmIdleAddonCreate"
    >
      <div class="delete-detail"><span>当前状态</span><strong>{{ statusLabel(asset.status) }}</strong></div>
      <div class="delete-detail"><span>当前总成本</span><strong>{{ formatAmount(totalCost) }}</strong></div>
    </DeleteConfirmModal>

    <DeleteConfirmModal
      v-model:show="showRemoveAddonImageModal"
      title="移除这张附加项图片？"
      description="移除后，这张图片不会随附加项保存。若该附加项已经保存过，保存修改后图片会从附加项资料中移除。"
      eyebrow="移除图片"
      confirm-text="确认移除"
      @confirm="confirmRemoveAddonImage"
    />

    <DeleteConfirmModal
      v-model:show="showUnsavedAddonModal"
      title="放弃未保存的附加项内容？"
      description="当前附加项表单里有尚未保存的修改。离开后，名称、金额、收支方向、图片和备注都会丢失。"
      eyebrow="内容未保存"
      confirm-text="放弃离开"
      @confirm="confirmCloseAddonModal"
    />

    <DeleteConfirmModal
      v-model:show="showUnsavedTransferModal"
      title="放弃未保存的转让内容？"
      description="当前转让表单里有尚未保存的修改。离开后，转让金额、日期、收款账户和备注都会丢失。"
      eyebrow="内容未保存"
      confirm-text="放弃离开"
      @confirm="confirmCloseTransferModal"
    />
    </section>

    <REmptyState v-else title="没有找到资产" description="这个资产可能已被删除，或已不在当前数据中。" />
  </RDataGate>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import AssetUpsertModal, { type AssetUpsertDraft } from "@/components/business/AssetUpsertModal.vue";
import DeleteConfirmModal from "@/components/business/DeleteConfirmModal.vue";
import PageHeader from "@/components/business/PageHeader.vue";
import RButton from "@/components/ui/RButton.vue";
import RCard from "@/components/ui/RCard.vue";
import RDatePicker from "@/components/ui/RDatePicker.vue";
import REmptyState from "@/components/ui/REmptyState.vue";
import RInput from "@/components/ui/RInput.vue";
import RSelect from "@/components/ui/RSelect.vue";
import RTag from "@/components/ui/RTag.vue";
import RDataGate from "@/components/ui/RDataGate.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import { addonImageUrls, assetImageUrls, assetTotalCost, includedAddonCost } from "@/domain/assetCalculations";
import type { AssetAddonRecord, AssetRecord, PurchaseChannel } from "@/domain/models";
import { assetAddonService } from "@/services/assetAddonService";
import { assetService } from "@/services/assetService";
import { useAppDataStore } from "@/stores/appDataStore";
import { imageFileToPersistentUrl } from "@/utils/imageFiles";

type MediaItem = { key: string; type: "placeholder"; label: string } | { key: string; type: "image"; src: string; label: string };

const route = useRoute();
const router = useRouter();
const store = useAppDataStore();

const overviewTab = "概览";
const addonTab = "附加项";
const historyTab = "历史记录";
const tabs = [overviewTab, addonTab, historyTab];
const activeTab = ref(overviewTab);
const showAddonModal = ref(false);
const showEditModal = ref(false);
const showTransferModal = ref(false);
const showDeleteModal = ref(false);
const showRevokeTransferModal = ref(false);
const showDeleteAddonModal = ref(false);
const showIdleAddonConfirmModal = ref(false);
const showRemoveAddonImageModal = ref(false);
const showUnsavedAddonModal = ref(false);
const showUnsavedTransferModal = ref(false);
const savingEdit = ref(false);
const assetEditError = ref("");
const savingAddon = ref(false);
const savingTransfer = ref(false);
const deletingAsset = ref(false);
const revokingTransfer = ref(false);
const deletingAddon = ref(false);
const addonDeleteError = ref("");
const selectedMediaIndex = ref(0);
const selectedAddon = ref<AssetAddonRecord | null>(null);
const pendingDeleteAddon = ref<AssetAddonRecord | null>(null);
const editingAddonId = ref<string | null>(null);
const addonFileInput = ref<HTMLInputElement | null>(null);
const pendingRemoveAddonImageIndex = ref<number | null>(null);
const initialAddonDraftSnapshot = ref("");
const initialTransferDraftSnapshot = ref("");

const addonDraft = reactive({
  name: "",
  direction: "expense" as NonNullable<AssetAddonRecord["direction"]>,
  type: "accessory" as AssetAddonRecord["type"],
  amount: "",
  purchaseDate: Date.now() as number | null,
  accountId: null as string | number | null,
  includedInCost: true,
  note: "",
  imageUrl: "",
  imageUrls: [] as string[],
});
const addonErrors = reactive({
  name: "",
  amount: "",
  purchaseDate: "",
  accountId: "",
  form: "",
});

const transferDraft = reactive({
  amount: "",
  date: Date.now() as number | null,
  accountId: null as string | number | null,
  note: "",
});
const transferErrors = reactive({
  amount: "",
  date: "",
  accountId: "",
  form: "",
});

const asset = computed(() => store.assets.find((item) => item.id === route.params.id) ?? null);
const assetAddons = computed(() => (asset.value ? store.assetAddons.filter((addon) => addon.assetId === asset.value?.id) : []));
const accountOptions = computed(() => store.accounts.map((account) => ({ label: account.name, value: account.id })));
const assetAccountOptions = computed(() => store.accounts.filter((account) => account.direction === "asset").map((account) => ({ label: account.name, value: account.id })));
type AddonTypeOption = { label: string; value: AssetAddonRecord["type"]; hint: string };

const expenseAddonTypeOptions: AddonTypeOption[] = [
  { label: "配件", value: "accessory", hint: "配件、保护壳、贴膜" },
  { label: "维修", value: "repair", hint: "维修、更换零件" },
  { label: "保养", value: "maintenance", hint: "保养、清洁护理" },
  { label: "升级", value: "upgrade", hint: "扩容、升级组件" },
  { label: "耗材", value: "consumable", hint: "耗材、替换件" },
  { label: "其他", value: "other", hint: "其他相关支出" },
];
const incomeAddonTypeOptions: AddonTypeOption[] = [
  { label: "配件转卖", value: "accessory", hint: "卖掉旧 CPU、硬盘、镜头" },
  { label: "共享回款", value: "maintenance", hint: "会员分摊、借用补贴" },
  { label: "退款赔偿", value: "repair", hint: "售后退款、维修赔付" },
  { label: "残值回收", value: "upgrade", hint: "回收旧件、折价抵扣" },
  { label: "耗材回款", value: "consumable", hint: "耗材转让、剩余材料回收" },
  { label: "其他收入", value: "other", hint: "其他和资产相关的收入" },
];
const currentAddonTypeOptions = computed(() => addonDraft.direction === "income" ? incomeAddonTypeOptions : expenseAddonTypeOptions);
const mediaItems = computed((): MediaItem[] => {
  if (!asset.value) return [{ key: "placeholder", type: "placeholder", label: "R" }];
  const images = assetImageUrls(asset.value);
  if (!images.length) return [{ key: `placeholder-${asset.value.id}`, type: "placeholder", label: asset.value.name.slice(0, 1).toUpperCase() || "R" }];
  return images.map((src, index) => ({ key: `${asset.value?.id}-${index}-${src.slice(0, 18)}`, type: "image", src, label: asset.value?.name ?? "" }));
});
const activeMedia = computed(() => mediaItems.value[Math.min(selectedMediaIndex.value, mediaItems.value.length - 1)] ?? mediaItems.value[0]);
const addonCost = computed(() => (asset.value ? includedAddonCost(asset.value.id, store.assetAddons) : 0));
const totalCost = computed(() => (asset.value ? assetTotalCost(asset.value, store.assetAddons) : 0));
const heldDays = computed(() => (asset.value ? dayDiff(asset.value.purchaseDate) : 0));
const warrantyDays = computed(() => (asset.value?.warrantyEndDate ? Math.max(0, dayDiffTo(asset.value.warrantyEndDate)) : undefined));
const dailyCost = computed(() => totalCost.value / Math.max(1, heldDays.value));
const profitLoss = computed(() => (asset.value ? (asset.value.currentValue ?? totalCost.value) - totalCost.value : 0));
const canManageAddons = computed(() => asset.value?.status === "using" || asset.value?.status === "idle");
const overviewMetrics = computed(() => {
  if (!asset.value) return [];
  return [
    { label: "持有天数", value: `${heldDays.value} 天`, hint: `自 ${asset.value.purchaseDate} 起`, tone: "primary" },
    { label: "实际使用天数", value: `${heldDays.value} 天`, hint: "当前按持有天数估算", tone: "success" },
    { label: "保修剩余", value: `${warrantyDays.value ?? 0} 天`, hint: asset.value.warrantyEndDate || "未设置过保日期", tone: (warrantyDays.value ?? 0) > 30 ? "success" : "warning" },
    { label: "预计使用天数", value: `${asset.value.expectedUseDays ?? 0} 天`, hint: "用于计算长期日均成本", tone: "primary" },
    { label: "当前估值", value: formatAmount(asset.value.currentValue ?? totalCost.value), hint: "可由手动估值或转让更新", tone: "success" },
    { label: "日均成本", value: formatAmount(dailyCost.value), hint: "总成本 / 持有天数", tone: "primary" },
  ];
});
const assetHistoryItems = computed(() => {
  if (!asset.value) return [];
  const items: Array<{ id: string; time: string; title: string; description: string; tone: "primary" | "success" | "warning" | "danger" }> = [
    {
      id: `asset-created-${asset.value.id}`,
      time: formatHistoryTime(asset.value.createdAt),
      title: "创建资产档案",
      description: `记录「${asset.value.name}」，原始购入价 ${formatAmount(asset.value.originalCost)}。`,
      tone: "primary",
    },
  ];

  if (asset.value.purchaseTransactionId) {
    items.push({
      id: `asset-purchase-${asset.value.purchaseTransactionId}`,
      time: formatHistoryTime(asset.value.purchaseDate),
      title: "生成资产购买流水",
      description: `付款账户：${accountName(asset.value.paymentAccountId)}，金额 ${formatAmount(asset.value.originalCost)}。`,
      tone: "danger",
    });
  }

  for (const addon of assetAddons.value) {
    items.push({
      id: `addon-created-${addon.id}`,
      time: formatHistoryTime(addon.createdAt),
      title: `新增附加项：${addon.name}`,
      description: `${addonDirectionLabel(addon)}，${addonTypeLabel(addon.type, addonDirection(addon))}，${formatAmount(addon.amount)}，${addonDirection(addon) === "income" ? "收入不计入资产成本" : addon.includedInCost ? "计入资产成本" : "不计入资产成本"}。`,
      tone: addonDirection(addon) === "income" ? "success" : "danger",
    });
    if (addon.updatedAt !== addon.createdAt) {
      items.push({
        id: `addon-updated-${addon.id}`,
        time: formatHistoryTime(addon.updatedAt),
        title: `编辑附加项：${addon.name}`,
        description: `同步更新关联流水、付款账户或成本属性。`,
        tone: "primary",
      });
    }
  }

  if (asset.value.transferTransactionId) {
    items.push({
      id: `asset-transfer-${asset.value.transferTransactionId}`,
      time: formatHistoryTime(asset.value.transferDate || asset.value.updatedAt),
      title: "转让资产",
      description: `转让收入 ${formatAmount(asset.value.transferAmount ?? 0)}，收款账户：${accountName(asset.value.transferAccountId)}。`,
      tone: "warning",
    });
  }

  if (asset.value.status === "idle" && asset.value.idleSince) {
    items.push({
      id: `asset-idle-${asset.value.id}`,
      time: formatHistoryTime(asset.value.idleSince),
      title: "标记闲置",
      description: "资产进入闲置状态。",
      tone: "warning",
    });
  }

  if (asset.value.status === "disposed" && asset.value.disposedAt) {
    items.push({
      id: `asset-disposed-${asset.value.id}`,
      time: formatHistoryTime(asset.value.disposedAt),
      title: "标记已处置",
      description: "资产结束使用，附加项进入只读。",
      tone: "danger",
    });
  }

  return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
});
const addonProjectedCost = computed(() => {
  if (!asset.value) return 0;
  const editingAddon = editingAddonId.value ? assetAddons.value.find((item) => item.id === editingAddonId.value) : null;
  const editingCost = editingAddon?.includedInCost && addonDirection(editingAddon) === "expense" ? editingAddon.amount : 0;
  const amount = Number(addonDraft.amount.replace(/[¥￥,\s]/g, ""));
  return totalCost.value - editingCost + (addonDraft.direction === "expense" && addonDraft.includedInCost && Number.isFinite(amount) ? amount : 0);
});
const isAddonDraftDirty = computed(() => showAddonModal.value && serializeAddonDraft() !== initialAddonDraftSnapshot.value);
const isTransferDraftDirty = computed(() => showTransferModal.value && serializeTransferDraft() !== initialTransferDraftSnapshot.value);

onMounted(initializeData);

async function initializeData() {
  await store.init().catch(() => undefined);
}

watch(() => route.params.id, () => {
  selectedMediaIndex.value = 0;
  selectedAddon.value = null;
  showAddonModal.value = false;
});

function formatAmount(value: number) {
  return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatHistoryTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function dayDiff(from: string) {
  const start = new Date(from).getTime();
  if (Number.isNaN(start)) return 1;
  return Math.max(1, Math.ceil((Date.now() - start) / 86_400_000));
}

function dayDiffTo(to: string) {
  const end = new Date(to).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.ceil((end - Date.now()) / 86_400_000);
}

function categoryName(id: string) {
  return store.categories.find((category) => category.id === id)?.name ?? "未分类";
}

function accountName(id?: string) {
  if (!id) return "-";
  return store.accounts.find((account) => account.id === id)?.name ?? "-";
}

function statusLabel(status: AssetRecord["status"]) {
  return ({ using: "使用中", idle: "闲置", transferred: "已转让", disposed: "已处置" } satisfies Record<AssetRecord["status"], string>)[status];
}

function purchaseChannelLabel(channel?: PurchaseChannel) {
  if (!channel) return "-";
  return ({
    online: "线上",
    offline: "线下",
    secondhand: "二手",
    gift: "赠送",
    company_benefit: "公司福利",
    transfer: "转让",
    other: "其他",
  } satisfies Record<PurchaseChannel, string>)[channel];
}

function addonTypeLabel(type: AssetAddonRecord["type"], direction: NonNullable<AssetAddonRecord["direction"]> = "expense") {
  const options = direction === "income" ? incomeAddonTypeOptions : expenseAddonTypeOptions;
  return options.find((option) => option.value === type)?.label ?? "其他";
}

function addonDirection(addon: AssetAddonRecord) {
  return addon.direction ?? "expense";
}

function addonDirectionLabel(addon: AssetAddonRecord) {
  return addonDirection(addon) === "income" ? "收入" : "支出";
}

function addonImages(addon: AssetAddonRecord) {
  return addonImageUrls(addon);
}

function addonCover(addon: AssetAddonRecord) {
  return addonImages(addon)[0] ?? "";
}

function parseAmount(value: string) {
  const amount = Number(value.replace(/[¥￥,\s]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("请输入正确金额");
  return amount;
}

function readAmount(value: string) {
  return Number(value.replace(/[¥￥,\s]/g, ""));
}

function clearTransferErrors() {
  transferErrors.amount = "";
  transferErrors.date = "";
  transferErrors.accountId = "";
  transferErrors.form = "";
}

function validateTransferDraft() {
  clearTransferErrors();
  const amount = readAmount(transferDraft.amount);
  if (!transferDraft.amount.trim()) {
    transferErrors.amount = "请填写转让金额。";
  } else if (!Number.isFinite(amount) || amount <= 0) {
    transferErrors.amount = "转让金额必须是大于 0 的数字。";
  }
  if (!transferDraft.date) transferErrors.date = "请选择转让日期。";
  if (!transferDraft.accountId) transferErrors.accountId = "请选择收款账户。";
  return !transferErrors.amount && !transferErrors.date && !transferErrors.accountId;
}

function parseOptionalAmount(value: string) {
  const normalized = value.replace(/[¥￥,\s]/g, "").trim();
  if (!normalized) return undefined;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) throw new Error("请输入正确金额");
  return amount;
}

function normalizeDraftImages(draft: AssetUpsertDraft) {
  return Array.from(draft.imageUrls)
    .filter((url): url is string => typeof url === "string" && Boolean(url))
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

function toDateString(value: number | null) {
  const date = value ? new Date(value) : new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toLocalStartIso(value: number | null) {
  const selected = value ? new Date(value) : new Date();
  const now = new Date();
  selected.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return selected.toISOString();
}

function toTime(value?: string) {
  if (!value) return Date.now();
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Date.now() : time;
}

async function handleAddonImages(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (!files.length) return;
  try {
    const images = await Promise.all(files.map((file) => imageFileToPersistentUrl(file)));
    addonDraft.imageUrls = [...addonDraft.imageUrls, ...images].filter((url, index, urls) => urls.indexOf(url) === index);
    addonDraft.imageUrl = addonDraft.imageUrl || addonDraft.imageUrls[0] || "";
    addonErrors.form = "";
  } catch (error) {
    addonErrors.form = error instanceof Error ? error.message : "图片处理失败，请重新选择。";
  }
  input.value = "";
}

function openRemoveAddonImageConfirm(index: number) {
  pendingRemoveAddonImageIndex.value = index;
  showRemoveAddonImageModal.value = true;
}

function confirmRemoveAddonImage() {
  if (pendingRemoveAddonImageIndex.value === null) return;
  removeAddonImage(pendingRemoveAddonImageIndex.value);
  pendingRemoveAddonImageIndex.value = null;
  showRemoveAddonImageModal.value = false;
}

function removeAddonImage(index: number) {
  const removed = addonDraft.imageUrls[index];
  addonDraft.imageUrls.splice(index, 1);
  if (addonDraft.imageUrl === removed) addonDraft.imageUrl = addonDraft.imageUrls[0] || "";
}

function setAddonDirection(direction: NonNullable<AssetAddonRecord["direction"]>) {
  addonDraft.direction = direction;
  clearAddonErrors();
  if (!editingAddonId.value) addonDraft.type = direction === "income" ? "accessory" : "accessory";
  if (direction === "income") addonDraft.includedInCost = false;
  if (direction === "expense" && !editingAddonId.value) addonDraft.includedInCost = true;
}

function clearAddonErrors() {
  addonErrors.name = "";
  addonErrors.amount = "";
  addonErrors.purchaseDate = "";
  addonErrors.accountId = "";
  addonErrors.form = "";
}

function validateAddonDraft() {
  clearAddonErrors();
  const amount = readAmount(addonDraft.amount);

  if (!addonDraft.name.trim()) addonErrors.name = addonDraft.direction === "income" ? "请填写收入名称，例如卖出旧 CPU。" : "请填写附加项名称。";
  if (!addonDraft.amount.trim()) {
    addonErrors.amount = "请填写金额。";
  } else if (!Number.isFinite(amount) || amount <= 0) {
    addonErrors.amount = "金额必须是大于 0 的数字。";
  }
  if (!addonDraft.purchaseDate) addonErrors.purchaseDate = addonDraft.direction === "income" ? "请选择收入日期。" : "请选择购买日期。";
  if (!addonDraft.accountId) addonErrors.accountId = addonDraft.direction === "income" ? "请选择收款账户。" : "请选择付款账户。";

  return !addonErrors.name && !addonErrors.amount && !addonErrors.purchaseDate && !addonErrors.accountId;
}

function resetAddonDraft(addon?: AssetAddonRecord) {
  editingAddonId.value = addon?.id ?? null;
  addonDraft.name = addon?.name ?? "";
  addonDraft.direction = addon?.direction ?? "expense";
  addonDraft.type = addon?.type ?? "accessory";
  addonDraft.amount = addon ? String(addon.amount) : "";
  addonDraft.purchaseDate = addon ? toTime(addon.purchaseDate) : Date.now();
  addonDraft.accountId = addon?.paymentAccountId ?? asset.value?.paymentAccountId ?? store.accounts[0]?.id ?? null;
  addonDraft.includedInCost = addonDraft.direction === "expense" ? addon?.includedInCost ?? true : false;
  addonDraft.note = addon?.notes ?? "";
  addonDraft.imageUrls = addon ? addonImages(addon) : [];
  addonDraft.imageUrl = addonDraft.imageUrls[0] || "";
  clearAddonErrors();
  initialAddonDraftSnapshot.value = serializeAddonDraft();
}

function openAddonCreate() {
  if (!asset.value || !canManageAddons.value) return;
  if (asset.value.status === "idle") {
    showIdleAddonConfirmModal.value = true;
    return;
  }
  resetAddonDraft();
  showAddonModal.value = true;
}

function confirmIdleAddonCreate() {
  showIdleAddonConfirmModal.value = false;
  resetAddonDraft();
  showAddonModal.value = true;
}

function openAddonEdit(addon: AssetAddonRecord) {
  if (!canManageAddons.value) return;
  selectedAddon.value = null;
  resetAddonDraft(addon);
  showAddonModal.value = true;
}

function openAddonDetail(addon: AssetAddonRecord) {
  selectedAddon.value = addon;
}

function openDeleteAddon(addon: AssetAddonRecord) {
  if (!canManageAddons.value) return;
  selectedAddon.value = null;
  pendingDeleteAddon.value = addon;
  addonDeleteError.value = "";
  showDeleteAddonModal.value = true;
}

function openEditAssetModal() {
  assetEditError.value = "";
  showEditModal.value = true;
}

function openTransferModal() {
  if (!asset.value || asset.value.status === "transferred" || asset.value.status === "disposed") return;
  transferDraft.amount = asset.value?.currentValue ? String(asset.value.currentValue) : String(totalCost.value);
  transferDraft.date = Date.now();
  transferDraft.accountId = store.accounts.find((account) => account.direction === "asset")?.id ?? null;
  transferDraft.note = "";
  clearTransferErrors();
  initialTransferDraftSnapshot.value = serializeTransferDraft();
  showTransferModal.value = true;
}

function serializeAddonDraft() {
  return JSON.stringify({
    ...addonDraft,
    imageUrls: [...addonDraft.imageUrls],
  });
}

function serializeTransferDraft() {
  return JSON.stringify({ ...transferDraft });
}

function requestCloseAddonModal() {
  if (isAddonDraftDirty.value) {
    showUnsavedAddonModal.value = true;
    return;
  }
  showAddonModal.value = false;
}

function confirmCloseAddonModal() {
  showUnsavedAddonModal.value = false;
  initialAddonDraftSnapshot.value = serializeAddonDraft();
  showAddonModal.value = false;
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

function openDeleteModal() {
  showDeleteModal.value = true;
}

function openRevokeTransferModal() {
  showRevokeTransferModal.value = true;
}

async function setAssetStatus(status: AssetRecord["status"]) {
  if (!asset.value) return;
  await assetService.update({ id: asset.value.id, status });
  await store.refresh();
}

async function saveAssetEdit(draft: AssetUpsertDraft) {
  if (!asset.value) return;
  const selectedCategory = store.categories.find((category) => category.id === draft.categoryId);
  savingEdit.value = true;
  try {
    const imageUrls = normalizeDraftImages(draft);
    await assetService.update({
      id: asset.value.id,
      name: draft.name.trim() || "未命名资产",
      brand: draft.brand.trim() || undefined,
      model: draft.model.trim() || undefined,
      categoryId: selectedCategory?.id ?? asset.value.categoryId,
      originalCost: parseAmount(draft.cost),
      currency: asset.value.currency ?? "CNY",
      purchaseDate: toDateString(draft.purchaseDate),
      firstUseDate: asset.value.firstUseDate ?? toDateString(draft.purchaseDate),
      purchaseChannel: "online",
      merchant: draft.channel.trim() || undefined,
      paymentAccountId: draft.accountId ? String(draft.accountId) : undefined,
      warrantyStartDate: draft.warrantyStart ? toDateString(draft.warrantyStart) : undefined,
      warrantyEndDate: draft.warrantyEnd ? toDateString(draft.warrantyEnd) : undefined,
      expectedUseDays: draft.life ? Number(draft.life) * 365 : undefined,
      notes: draft.note.trim() || undefined,
      imageUrl: draft.imageUrl || imageUrls[0] || undefined,
      imageUrls: imageUrls.length ? imageUrls : undefined,
    });
    await store.refresh();
    showEditModal.value = false;
    assetEditError.value = "";
  } catch (err) {
    assetEditError.value = err instanceof Error ? err.message : "资产保存失败，请检查表单后重试。";
  } finally {
    savingEdit.value = false;
  }
}

async function saveAddon() {
  if (!asset.value || !canManageAddons.value) return;
  if (!validateAddonDraft()) return;
  savingAddon.value = true;
  try {
    const payload = {
      name: addonDraft.name.trim() || "未命名附加项",
      direction: addonDraft.direction,
      type: addonDraft.type,
      amount: parseAmount(addonDraft.amount),
      currency: asset.value.currency,
      purchaseDate: toDateString(addonDraft.purchaseDate),
      paymentAccountId: String(addonDraft.accountId),
      includedInCost: addonDraft.direction === "expense" && addonDraft.includedInCost,
      notes: addonDraft.note.trim() || undefined,
      imageUrl: addonDraft.imageUrl || addonDraft.imageUrls[0] || undefined,
      imageUrls: addonDraft.imageUrls.length ? [...addonDraft.imageUrls] : undefined,
    };

    if (editingAddonId.value) {
      await assetAddonService.update({ id: editingAddonId.value, ...payload });
    } else {
      await assetAddonService.create({ assetId: asset.value.id, ...payload });
    }

    await store.refresh();
    initialAddonDraftSnapshot.value = serializeAddonDraft();
    showAddonModal.value = false;
    editingAddonId.value = null;
  } catch (err) {
    addonErrors.form = err instanceof Error ? err.message : "保存失败，请检查表单后重试。";
  } finally {
    savingAddon.value = false;
  }
}

async function confirmDeleteAddon() {
  if (!pendingDeleteAddon.value) return;
  deletingAddon.value = true;
  addonDeleteError.value = "";
  try {
    await assetAddonService.delete(pendingDeleteAddon.value.id);
    await store.refresh();
    showDeleteAddonModal.value = false;
    pendingDeleteAddon.value = null;
  } catch (err) {
    addonDeleteError.value = err instanceof Error ? err.message : "删除附加项失败，请稍后重试。";
  } finally {
    deletingAddon.value = false;
  }
}

async function saveTransfer() {
  if (!asset.value || !validateTransferDraft()) return;
  savingTransfer.value = true;
  try {
    await assetService.transfer({
      assetId: asset.value.id,
      amount: parseAmount(transferDraft.amount),
      occurredAt: toLocalStartIso(transferDraft.date),
      accountId: String(transferDraft.accountId),
      note: transferDraft.note.trim() || undefined,
    });
    await store.refresh();
    initialTransferDraftSnapshot.value = serializeTransferDraft();
    showTransferModal.value = false;
  } catch (err) {
    transferErrors.form = err instanceof Error ? err.message : "转让保存失败，请检查表单后重试。";
  } finally {
    savingTransfer.value = false;
  }
}

async function confirmDeleteAsset() {
  if (!asset.value) return;
  deletingAsset.value = true;
  try {
    await assetService.delete(asset.value.id);
    await store.refresh();
    showDeleteModal.value = false;
    router.push("/assets");
  } finally {
    deletingAsset.value = false;
  }
}

async function confirmRevokeTransfer() {
  if (!asset.value) return;
  revokingTransfer.value = true;
  try {
    await assetService.revokeTransfer(asset.value.id);
    await store.refresh();
    showRevokeTransferModal.value = false;
  } finally {
    revokingTransfer.value = false;
  }
}
</script>

<style scoped>
.asset-detail-page { display: grid; gap: var(--space-5); }
.breadcrumb { display: inline-flex; gap: var(--space-2); align-items: center; color: var(--color-text-tertiary); font-size: var(--font-caption); }
.breadcrumb a { color: var(--color-primary); font-weight: 700; }
.breadcrumb a:hover { text-decoration: underline; }
.more-menu { position: relative; padding-bottom: 6px; }
.more-menu__popover { position: absolute; top: 38px; right: 0; z-index: 20; display: none; min-width: 132px; padding: var(--space-2); background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-popover); }
.more-menu:hover .more-menu__popover,
.more-menu:focus-within .more-menu__popover { display: grid; }
.more-menu__popover button { height: 34px; padding: 0 var(--space-3); color: var(--color-text-secondary); text-align: left; background: transparent; border: 0; border-radius: var(--radius-md); cursor: pointer; }
.more-menu__popover button:hover { color: var(--color-primary); background: var(--color-primary-light); }
.more-menu__popover button.danger { color: var(--color-danger); }
.detail-hero { display: grid; grid-template-columns: 360px 1fr 360px; gap: var(--space-6); align-items: start; }
.product-media { padding: var(--space-4); }
.product-media__main { display: grid; height: 300px; place-items: center; overflow: hidden; color: #fff; background: linear-gradient(135deg, #111827, #334155); border-radius: var(--radius-lg); font-size: 96px; font-weight: 800; }
.product-media__main img, .product-media__thumbs img { width: 100%; height: 100%; object-fit: cover; }
.product-media__thumbs { display: flex; gap: var(--space-2); margin-top: var(--space-3); }
.product-media__thumbs button { width: 42px; height: 42px; overflow: hidden; color: var(--color-text-primary); background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; }
.product-media__thumbs button.active { color: var(--color-primary); border-color: var(--color-primary); box-shadow: inset 0 0 0 1px var(--color-primary); }
.product-info h2 { margin: var(--space-4) 0 var(--space-3); font-size: 26px; }
.product-info p, .product-info dd, .product-info dt { color: var(--color-text-secondary); font-size: var(--font-body); }
.product-info dl { display: grid; gap: var(--space-4); margin: var(--space-6) 0 0; }
.product-info dl div { display: flex; align-items: center; }
.product-info dt { width: 86px; }
.product-info dd { margin: 0; }
.danger { color: var(--color-danger) !important; }
.success { color: var(--color-success) !important; }
.cost-card { padding: var(--space-5); }
.cost-card h3 { margin: 0 0 var(--space-4); font-size: var(--font-section-title); }
.cost-row { display: flex; justify-content: space-between; padding: var(--space-2) 0; color: var(--color-text-secondary); font-size: var(--font-body); }
.cost-row strong { color: var(--color-text-primary); }
.cost-row.split { margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--color-border); }
.daily-cost { display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-4); padding: var(--space-4); color: var(--color-primary); background: var(--color-primary-light); border-radius: var(--radius-lg); font-size: 20px; font-weight: 800; }
.tabs { display: flex; gap: var(--space-6); border-bottom: 1px solid var(--color-border); }
.tabs button { padding: 0 0 var(--space-3); color: var(--color-text-secondary); background: none; border: 0; border-bottom: 3px solid transparent; cursor: pointer; }
.tabs button.active { color: var(--color-primary); border-bottom-color: var(--color-primary); font-weight: 700; }
.overview-panel { display: grid; gap: var(--space-5); padding: var(--space-5); }
.overview-panel__hero { display: flex; align-items: stretch; justify-content: space-between; gap: var(--space-5); padding: 24px; overflow: hidden; color: #fff; background: radial-gradient(circle at 88% 12%, rgba(255, 255, 255, 0.34), transparent 24%), linear-gradient(135deg, #0f172a, #1d4ed8 58%, #38bdf8); border-radius: 18px; box-shadow: 0 24px 60px rgba(22, 119, 255, 0.18); }
.overview-panel__hero span, .overview-score span { display: block; font-size: var(--font-caption); font-weight: 800; letter-spacing: 0.04em; opacity: 0.78; }
.overview-panel__hero h3 { margin: var(--space-2) 0; font-size: 24px; }
.overview-panel__hero p { max-width: 560px; margin: 0; color: rgba(255, 255, 255, 0.78); line-height: 1.7; }
.overview-score { display: grid; min-width: 190px; align-content: center; padding: var(--space-5); background: rgba(255, 255, 255, 0.14); border: 1px solid rgba(255, 255, 255, 0.24); border-radius: 16px; backdrop-filter: blur(10px); }
.overview-score strong { margin-top: var(--space-2); font-size: 28px; }
.overview-metrics { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: var(--space-3); }
.overview-metric { display: grid; gap: var(--space-2); min-height: 118px; padding: var(--space-4); background: linear-gradient(180deg, #fff, #f8fbff); border: 1px solid var(--color-border); border-radius: 16px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05); }
.overview-metric span { color: var(--color-text-secondary); font-size: var(--font-caption); font-weight: 700; }
.overview-metric strong { color: var(--color-primary); font-size: 22px; }
.overview-metric small { color: var(--color-text-tertiary); line-height: 1.45; }
.overview-metric.success strong { color: var(--color-success); }
.overview-metric.warning strong { color: #f59e0b; }
.overview-grid { display: grid; grid-template-columns: 1fr 1fr 0.8fr; gap: var(--space-4); }
.overview-block { display: grid; gap: var(--space-3); padding: var(--space-4); background: var(--color-bg-hover); border: 1px solid var(--color-border); border-radius: 16px; }
.overview-block > span { color: var(--color-text-tertiary); font-size: var(--font-caption); font-weight: 800; }
.overview-row { display: flex; justify-content: space-between; gap: var(--space-3); color: var(--color-text-secondary); }
.overview-row em { font-style: normal; }
.overview-row strong { color: var(--color-text-primary); }
.overview-row.total { padding-top: var(--space-3); border-top: 1px solid var(--color-border); font-weight: 800; }
.overview-block.accent { align-content: center; color: var(--color-primary); background: linear-gradient(135deg, var(--color-primary-soft), #fff); border-color: #bbd5ff; }
.overview-block.accent strong { font-size: 28px; }
.overview-block.accent p { margin: 0; color: var(--color-text-tertiary); line-height: 1.7; }
.section-card { padding: var(--space-4); }
.section-card__head { display: flex; justify-content: space-between; margin-bottom: var(--space-3); }
.section-card__head h3 { margin: 0; font-size: var(--font-section-title); }
.readonly-hint { margin-bottom: var(--space-3); padding: var(--space-3) var(--space-4); color: var(--color-text-secondary); background: var(--color-warning-light, #fff7e6); border: 1px solid #ffd89b; border-radius: var(--radius-lg); font-size: var(--font-caption); }
.simple-table { width: 100%; border-collapse: collapse; }
.simple-table th, .simple-table td { height: 56px; padding: 0 var(--space-4); color: var(--color-text-secondary); font-size: var(--font-table); text-align: left; border-bottom: 1px solid var(--color-border); }
.simple-table th { color: #667085; background: var(--color-bg-hover); }
.addon-cell { display: inline-flex; gap: var(--space-3); align-items: center; color: var(--color-text-primary); }
.addon-thumb { display: grid; width: 36px; height: 36px; place-items: center; overflow: hidden; color: var(--color-primary); background: var(--color-primary-light); border-radius: 10px; font-weight: 800; }
.addon-thumb img { width: 100%; height: 100%; object-fit: cover; }
.table-actions { display: flex; gap: var(--space-2); align-items: center; }
.table-actions button { height: 34px; padding: 0 var(--space-3); color: var(--color-primary); background: var(--color-primary-light); border: 1px solid #bbd5ff; border-radius: var(--radius-md); cursor: pointer; font-weight: 700; }
.table-actions button:hover { border-color: var(--color-primary); box-shadow: 0 8px 18px rgba(22, 119, 255, 0.14); }
.table-actions button.danger { color: var(--color-danger); background: rgba(240, 68, 56, 0.08); border-color: rgba(240, 68, 56, 0.24); }
.table-actions button.danger:hover { border-color: var(--color-danger); box-shadow: 0 8px 18px rgba(240, 68, 56, 0.12); }
.history-timeline { position: relative; display: grid; gap: var(--space-4); padding: var(--space-2) 0 var(--space-2) 18px; }
.history-timeline::before { position: absolute; top: 8px; bottom: 8px; left: 25px; width: 1px; content: ""; background: linear-gradient(180deg, rgba(22, 119, 255, 0.45), rgba(22, 119, 255, 0.04)); }
.history-item { position: relative; display: grid; grid-template-columns: 16px 1fr; gap: var(--space-4); align-items: start; }
.history-dot { z-index: 1; width: 14px; height: 14px; margin-top: 18px; background: var(--color-primary); border: 3px solid #fff; border-radius: 50%; box-shadow: 0 0 0 4px var(--color-primary-soft); }
.history-dot.success { background: var(--color-success); box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.12); }
.history-dot.warning { background: #f59e0b; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.12); }
.history-dot.danger { background: var(--color-danger); box-shadow: 0 0 0 4px rgba(240, 68, 56, 0.12); }
.history-card { display: grid; gap: var(--space-2); padding: var(--space-4); background: linear-gradient(180deg, #fff, #fbfcff); border: 1px solid var(--color-border); border-radius: 16px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05); }
.history-card div { display: flex; justify-content: space-between; gap: var(--space-4); }
.history-card span { color: var(--color-text-tertiary); font-size: var(--font-caption); }
.history-card strong { color: var(--color-text-primary); }
.history-card p { margin: 0; color: var(--color-text-secondary); line-height: 1.7; }
.delete-detail { display: flex; align-items: center; justify-content: space-between; min-height: 30px; font-size: var(--font-table); }
.delete-detail + .delete-detail { border-top: 1px solid var(--color-border); }
@media (max-width: 1200px) {
  .detail-hero { grid-template-columns: 1fr; }
  .overview-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .overview-grid { grid-template-columns: 1fr; }
  .overview-panel__hero { flex-direction: column; }
}
</style>

<style>
.modal-overlay { position: fixed; inset: 0; z-index: 3000; display: grid; place-items: center; padding: 24px; overflow: auto; background: rgba(15, 23, 42, 0.46); backdrop-filter: blur(8px); }
.modal-overlay .v-binder-follower-container,
.modal-overlay .n-date-panel,
body > .v-binder-follower-container:has(.n-date-panel) { z-index: 3600 !important; }
.transfer-dialog, .addon-dialog, .addon-detail-dialog { display: flex; flex-direction: column; max-height: calc(100dvh - 48px); overflow: visible; background: var(--color-bg-card); border: 1px solid rgba(255, 255, 255, 0.46); border-radius: 20px; box-shadow: 0 28px 90px rgba(17, 24, 39, 0.28); }
.transfer-dialog { width: min(760px, calc(100vw - 48px)); }
.addon-dialog { width: min(940px, calc(100vw - 48px)); max-height: calc(100vh - 48px); }
.addon-detail-dialog { width: min(680px, calc(100vw - 48px)); }
.modal-hero { display: flex; flex: 0 0 auto; justify-content: space-between; gap: var(--space-6); padding: 28px 32px; color: #fff; background: radial-gradient(circle at 86% 10%, rgba(255, 255, 255, 0.26), transparent 24%), linear-gradient(135deg, #1d4ed8, #1677ff 52%, #38bdf8); }
.modal-hero--green { background: radial-gradient(circle at 84% 18%, rgba(255, 255, 255, 0.24), transparent 26%), linear-gradient(135deg, #0f9f6e, #16a36a); }
.modal-hero span { font-size: var(--font-caption); font-weight: 800; opacity: 0.86; }
.modal-hero h2 { margin: var(--space-2) 0; font-size: 24px; }
.modal-hero p { margin: 0; opacity: 0.86; }
.modal-hero button { display: grid; width: 32px; height: 32px; place-items: center; color: #fff; background: rgba(255, 255, 255, 0.16); border: 0; border-radius: 50%; cursor: pointer; font-size: 20px; }
.modal-footer { display: flex; flex: 0 0 auto; justify-content: flex-end; gap: var(--space-3); padding: 20px 32px; background: var(--color-bg-hover); border-top: 1px solid var(--color-border); }
.transfer-dialog__body, .addon-dialog__body { display: grid; flex: 1 1 auto; min-height: 0; gap: var(--space-6); overflow: visible; padding: 28px 32px; }
.transfer-dialog__body { grid-template-columns: 220px 1fr; }
.addon-dialog__body { grid-template-columns: 260px 1fr; }
.addon-uploader, .transfer-summary, .addon-detail-grid div, .addon-detail-note { padding: var(--space-4); background: var(--color-bg-hover); border: 1px solid var(--color-border); border-radius: 14px; }
.addon-uploader { display: grid; align-content: start; gap: var(--space-3); border-style: dashed; }
.addon-uploader__preview, .addon-detail-media { display: grid; place-items: center; overflow: hidden; color: var(--color-primary); background: linear-gradient(135deg, var(--color-primary-soft), #fff); border-radius: 14px; font-size: 48px; font-weight: 800; }
.addon-uploader__preview { height: 180px; }
.addon-detail-media { height: 220px; }
.addon-uploader__preview img, .addon-detail-media img, .addon-image-list img, .addon-detail-thumbs img { width: 100%; height: 100%; object-fit: cover; }
.addon-uploader p { margin: 0; color: var(--color-text-tertiary); font-size: var(--font-caption); line-height: 1.7; }
.hidden-file { display: none; }
.addon-image-list, .addon-detail-thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); }
.addon-image-list button { position: relative; height: 46px; overflow: hidden; padding: 0; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; }
.addon-image-list button.active { border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary-soft); }
.addon-image-list button span { position: absolute; top: 2px; right: 2px; display: grid; width: 16px; height: 16px; place-items: center; color: #fff; background: rgba(17, 24, 39, 0.72); border-radius: 50%; font-size: 12px; }
.transfer-summary, .addon-form, .addon-section { display: grid; gap: var(--space-4); }
.transfer-summary span, .addon-detail-amount span, .addon-detail-grid span, .addon-detail-note span { display: block; color: var(--color-text-tertiary); font-size: var(--font-caption); }
.transfer-summary strong, .addon-detail-grid strong { display: block; color: var(--color-text-primary); }
.transfer-summary strong { font-size: 24px; }
.transfer-summary p, .addon-detail-note p { margin: var(--space-2) 0 0; color: var(--color-text-tertiary); font-size: var(--font-caption); line-height: 1.7; }
.transfer-form, .addon-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
.transfer-form label, .addon-form-grid label { display: grid; grid-template-rows: auto auto 16px; align-content: start; gap: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-caption); font-weight: 700; }
.transfer-form .wide-field, .addon-form-grid .wide-field { grid-column: 1 / -1; }
.transfer-form label.invalid { color: var(--color-danger); }
.transfer-form label.invalid .n-input,
.transfer-form label.invalid .n-base-selection { border-color: var(--color-danger); box-shadow: 0 0 0 2px rgba(240, 68, 56, 0.08); }
.transfer-form label em { min-height: 16px; color: var(--color-danger); font-style: normal; font-weight: 600; line-height: 16px; }
.transfer-form-error { margin: 16px 32px 0; padding: var(--space-3) var(--space-4); color: var(--color-danger); background: #fff1f0; border: 1px solid #ffccc7; border-radius: var(--radius-lg); font-size: var(--font-caption); font-weight: 700; }
.addon-form-grid label.invalid { color: var(--color-danger); }
.addon-form-grid label.invalid .n-input,
.addon-form-grid label.invalid .n-base-selection { border-color: var(--color-danger); box-shadow: 0 0 0 2px rgba(240, 68, 56, 0.08); }
.addon-form-grid label em { min-height: 16px; color: var(--color-danger); font-style: normal; font-weight: 600; line-height: 16px; }
.form-error { padding: var(--space-3) var(--space-4); color: var(--color-danger); background: #fff1f0; border: 1px solid #ffccc7; border-radius: var(--radius-lg); font-size: var(--font-caption); font-weight: 700; }
.addon-section h3 { margin: 0; font-size: var(--font-card-title); }
.addon-direction-grid, .addon-type-grid { display: grid; gap: var(--space-3); }
.addon-direction-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.addon-type-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.addon-direction-grid button, .addon-type-grid button { display: grid; gap: 4px; min-height: 74px; padding: var(--space-3); color: var(--color-text-secondary); text-align: left; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 14px; cursor: pointer; }
.addon-direction-grid button.active, .addon-type-grid button.active { color: var(--color-primary); background: var(--color-primary-light); border-color: #8cbcff; box-shadow: 0 10px 28px rgba(22, 119, 255, 0.12); }
.addon-direction-grid span, .addon-type-grid span { color: var(--color-text-tertiary); font-size: 11px; }
.addon-rule-card { padding: var(--space-4); background: linear-gradient(135deg, var(--color-bg-hover), #fff); border: 1px solid var(--color-border); border-radius: 14px; }
.addon-rule-card.income-rule { border-color: rgba(20, 184, 166, 0.24); background: linear-gradient(135deg, rgba(20, 184, 166, 0.1), #fff); }
.addon-rule-card p { margin: var(--space-2) 0 0; color: var(--color-text-secondary); font-size: var(--font-caption); }
.addon-switch { display: inline-flex; gap: var(--space-2); align-items: center; color: var(--color-text-primary); }
.addon-switch input { width: 16px; height: 16px; accent-color: var(--color-primary); }
.addon-detail-dialog__body { display: grid; flex: 1 1 auto; min-height: 0; gap: var(--space-4); overflow: visible; padding: 28px 30px; }
.addon-detail-amount { padding: var(--space-5); color: var(--color-primary); background: var(--color-primary-soft); border: 1px solid #bbd5ff; border-radius: 16px; }
.addon-detail-amount strong { display: block; margin-top: var(--space-1); font-size: 28px; }
.addon-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.addon-detail-grid strong { margin-top: var(--space-1); }
</style>
