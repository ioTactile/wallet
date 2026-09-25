export type StartBankConnectionResult = {
  id: string;
  authorizationUrl: string;
};

export type SyncBankAccountResult = {
  importedCount: number;
};
