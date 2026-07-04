import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { appDataRepository } from "@/repositories";
import type {
  AccountFlowRecord,
  AssetAddonRecord,
  AssetRecord,
  CategoryRecord,
  MoneyAccountRecord,
  TransactionRecord,
} from "@/domain/models";

export const useAppDataStore = defineStore("appData", () => {
  const initialized = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const assets = ref<AssetRecord[]>([]);
  const assetAddons = ref<AssetAddonRecord[]>([]);
  const accounts = ref<MoneyAccountRecord[]>([]);
  const transactions = ref<TransactionRecord[]>([]);
  const accountFlows = ref<AccountFlowRecord[]>([]);
  const categories = ref<CategoryRecord[]>([]);
  let initPromise: Promise<void> | null = null;

  const activeAccounts = computed(() => accounts.value.filter((account) => account.enabled !== false));
  const assetAccounts = computed(() => activeAccounts.value.filter((account) => account.direction === "asset"));
  const liabilityAccounts = computed(() => activeAccounts.value.filter((account) => account.direction === "liability"));
  const totalAssetBalance = computed(() => assetAccounts.value.reduce((sum, account) => sum + account.balance, 0));
  const totalLiabilityBalance = computed(() => liabilityAccounts.value.reduce((sum, account) => sum + account.balance, 0));
  const netWorth = computed(() => totalAssetBalance.value - totalLiabilityBalance.value);

  async function refresh() {
    const snapshot = await appDataRepository.getSnapshot();

    assets.value = snapshot.assets;
    assetAddons.value = snapshot.assetAddons;
    accounts.value = snapshot.accounts;
    transactions.value = snapshot.transactions;
    accountFlows.value = snapshot.accountFlows;
    categories.value = snapshot.categories;
  }

  async function init() {
    if (initialized.value) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      loading.value = true;
      error.value = null;
      try {
        await appDataRepository.initialize();
        await refresh();
        initialized.value = true;
      } catch (err) {
        error.value = err instanceof Error ? err.message : "本地数据库初始化失败";
        throw err;
      } finally {
        loading.value = false;
      }
    })();

    try {
      await initPromise;
    } finally {
      initPromise = null;
    }
  }

  async function resetLocalData() {
    loading.value = true;
    error.value = null;
    try {
      await appDataRepository.reset();
      await refresh();
      initialized.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "本地数据重置失败";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearSessionData() {
    assets.value = [];
    assetAddons.value = [];
    accounts.value = [];
    transactions.value = [];
    accountFlows.value = [];
    categories.value = [];
    initialized.value = false;
    loading.value = false;
    error.value = null;
    initPromise = null;
  }

  return {
    initialized,
    loading,
    error,
    assets,
    assetAddons,
    accounts,
    activeAccounts,
    transactions,
    accountFlows,
    categories,
    assetAccounts,
    liabilityAccounts,
    totalAssetBalance,
    totalLiabilityBalance,
    netWorth,
    init,
    refresh,
    resetLocalData,
    clearSessionData,
  };
});
