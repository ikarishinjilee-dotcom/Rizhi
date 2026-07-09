import type { CategoryRecord, CategoryScope, TransactionType } from "@/domain/models";

const categoryScopeOrder: Record<CategoryScope, number> = {
  asset: 1,
  expense: 2,
  income: 3,
};

export function categoryScopes(category: Pick<CategoryRecord, "domain" | "type" | "scopes">): CategoryScope[] {
  if (category.scopes?.length) {
    return [...new Set(category.scopes)].sort((left, right) => categoryScopeOrder[left] - categoryScopeOrder[right]);
  }

  if (category.domain === "asset") return ["asset", "expense"];
  if (category.domain === "transaction" && category.type === "expense") return ["expense"];
  if (category.domain === "transaction" && category.type === "income") return ["income"];
  if (category.domain === "transaction" && category.type === "asset_purchase") return ["expense"];
  if (category.domain === "transaction" && category.type === "refund") return ["income"];
  return [];
}

export function categoryHasScope(category: Pick<CategoryRecord, "domain" | "type" | "scopes">, scope: CategoryScope) {
  return categoryScopes(category).includes(scope);
}

export function transactionTypeToScope(type: TransactionType): CategoryScope | undefined {
  if (type === "expense" || type === "asset_purchase") return "expense";
  if (type === "income" || type === "refund") return "income";
  return undefined;
}

export function isBusinessCategory(category: Pick<CategoryRecord, "domain" | "type" | "scopes">) {
  return categoryHasScope(category, "asset") || categoryHasScope(category, "expense") || categoryHasScope(category, "income");
}

