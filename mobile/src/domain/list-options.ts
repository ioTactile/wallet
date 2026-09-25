export type ListAccountsOptions = {
  includeArchived?: boolean;
};

export type ListRecordsOptions = {
  from: string;
  to: string;
  accountIds?: string[];
};
