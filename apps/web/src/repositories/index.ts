export type {
  AccountRepository,
  AppDataRepository,
  AppDataSnapshot,
  AssetAddonRepository,
  AssetRepository,
  CategoryRepository,
  CategoryUsage,
  ConvertTransactionToAddonInput,
  CreateAccountInput,
  CreateAddonInput,
  CreateAssetInput,
  CreateCategoryInput,
  CreateTransactionInput,
  ListCategoriesInput,
  MigrateCategoryTransactionsInput,
  RepayDebtInput,
  TransactionRepository,
  TransferAssetInput,
  TransferInput,
  UpdateAccountInput,
  UpdateAddonInput,
  UpdateAssetInput,
  UpdateCategoryInput,
  UpdateTransactionInput,
} from "@/repositories/contracts";

import {
  indexedDbAccountRepository,
  indexedDbAppDataRepository,
  indexedDbAssetAddonRepository,
  indexedDbAssetRepository,
  indexedDbCategoryRepository,
  indexedDbTransactionRepository,
} from "@/repositories/indexedDbRepositories";
import {
  httpAccountRepository,
  httpAppDataRepository,
  httpAssetAddonRepository,
  httpAssetRepository,
  httpCategoryRepository,
  httpTransactionRepository,
} from "@/repositories/httpRepositories";
import { isRemoteDataSource } from "@/services/apiConfig";

const useHttpDataSource = isRemoteDataSource();

export const appDataRepository = useHttpDataSource ? httpAppDataRepository : indexedDbAppDataRepository;
export const assetRepository = useHttpDataSource ? httpAssetRepository : indexedDbAssetRepository;
export const assetAddonRepository = useHttpDataSource ? httpAssetAddonRepository : indexedDbAssetAddonRepository;
export const transactionRepository = useHttpDataSource ? httpTransactionRepository : indexedDbTransactionRepository;
export const accountRepository = useHttpDataSource ? httpAccountRepository : indexedDbAccountRepository;
export const categoryRepository = useHttpDataSource ? httpCategoryRepository : indexedDbCategoryRepository;
