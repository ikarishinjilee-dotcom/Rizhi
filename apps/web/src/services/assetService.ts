import { assetRepository, type CreateAssetInput, type TransferAssetInput, type UpdateAssetInput } from "@/repositories";
import type { ID } from "@/domain/models";

export const assetService = {
  create(input: CreateAssetInput) {
    return assetRepository.create(input);
  },

  update(input: UpdateAssetInput) {
    return assetRepository.update(input);
  },

  delete(id: ID) {
    return assetRepository.delete(id);
  },

  transfer(input: TransferAssetInput) {
    return assetRepository.transfer(input);
  },

  revokeTransfer(assetId: ID) {
    return assetRepository.revokeTransfer(assetId);
  },
};

export type { CreateAssetInput, TransferAssetInput, UpdateAssetInput };
