import { categoryRepository, type CategoryDefaultsBackup, type CreateCategoryInput, type ListCategoriesInput, type MigrateCategoryTransactionsInput, type UpdateCategoryInput } from "@/repositories";
import type { ID } from "@/domain/models";

export const categoryService = {
  list(input?: ListCategoriesInput) {
    return categoryRepository.list(input);
  },

  create(input: CreateCategoryInput) {
    return categoryRepository.create(input);
  },

  update(input: UpdateCategoryInput) {
    return categoryRepository.update(input);
  },

  delete(id: ID) {
    return categoryRepository.delete(id);
  },

  usage(id: ID) {
    return categoryRepository.usage(id);
  },

  migrateTransactions(input: MigrateCategoryTransactionsInput) {
    return categoryRepository.migrateTransactions(input);
  },

  exportDefaults() {
    return categoryRepository.exportDefaults();
  },

  getBuiltinDefaults() {
    return categoryRepository.getBuiltinDefaults();
  },

  importDefaults(backup: CategoryDefaultsBackup) {
    return categoryRepository.importDefaults(backup);
  },
};

export type { CategoryDefaultsBackup, CreateCategoryInput, ListCategoriesInput, MigrateCategoryTransactionsInput, UpdateCategoryInput };
