import {
  transactionRepository,
  type ConvertTransactionToAddonInput,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from "@/repositories";
import type { ID } from "@/domain/models";

export const transactionService = {
  create(input: CreateTransactionInput) {
    return transactionRepository.create(input);
  },

  update(input: UpdateTransactionInput) {
    return transactionRepository.update(input);
  },

  convertToAssetAddon(input: ConvertTransactionToAddonInput) {
    return transactionRepository.convertToAssetAddon(input);
  },

  delete(id: ID) {
    return transactionRepository.delete(id);
  },
};

export type { ConvertTransactionToAddonInput, CreateTransactionInput, UpdateTransactionInput };
