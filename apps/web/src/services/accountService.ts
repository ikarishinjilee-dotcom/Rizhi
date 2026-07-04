import { accountRepository, type CreateAccountInput, type RepayDebtInput, type TransferInput, type UpdateAccountInput } from "@/repositories";

export const accountService = {
  create(input: CreateAccountInput) {
    return accountRepository.create(input);
  },

  update(input: UpdateAccountInput) {
    return accountRepository.update(input);
  },

  delete(id: string) {
    return accountRepository.delete(id);
  },

  transfer(input: TransferInput) {
    return accountRepository.transfer(input);
  },

  repayDebt(input: RepayDebtInput) {
    return accountRepository.repayDebt(input);
  },
};

export type { CreateAccountInput, RepayDebtInput, TransferInput, UpdateAccountInput };
