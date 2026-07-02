import { assetAddonRepository, type CreateAddonInput, type UpdateAddonInput } from "@/repositories";
import type { ID } from "@/domain/models";

export const assetAddonService = {
  create(input: CreateAddonInput) {
    return assetAddonRepository.create(input);
  },

  update(input: UpdateAddonInput) {
    return assetAddonRepository.update(input);
  },

  delete(id: ID) {
    return assetAddonRepository.delete(id);
  },
};

export type { CreateAddonInput, UpdateAddonInput };
