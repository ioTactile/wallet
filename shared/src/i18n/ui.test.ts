import { describe, expect, it } from 'vitest';

import { i18nResources, UI_MESSAGES } from './ui.js';

describe('ui messages', () => {
  it('keeps the same keys in fr and en', () => {
    expect(Object.keys(UI_MESSAGES.fr).sort()).toEqual(Object.keys(UI_MESSAGES.en).sort());
  });

  it('exposes translation, category and accountKind namespaces', () => {
    const resources = i18nResources();
    expect(resources.fr.translation['tabs.home']).toBe('Accueil');
    expect(resources.en.translation['tabs.home']).toBe('Home');
    expect(resources.fr.category.food_drinks).toBe('Alimentation');
    expect(resources.fr.accountKind.cash).toBe('Espèces');
  });

  it('covers account screen copy for list, form, stub, archive and unsaved dialog', () => {
    const keys = [
      'account.listTitle',
      'account.loading',
      'account.error',
      'account.empty',
      'account.retry',
      'account.newTitle',
      'account.chooseKind',
      'account.newCash',
      'account.newBank',
      'account.newCashHint',
      'account.newBankHint',
      'account.createCashTitle',
      'account.editTitle',
      'account.name',
      'account.color',
      'account.currency',
      'account.excludeFromStats',
      'account.minBalance',
      'account.maxBalance',
      'account.iban',
      'account.institutionName',
      'account.save',
      'account.create',
      'account.cancel',
      'account.connectBankTitle',
      'account.connectBank',
      'account.connectBankHint',
      'account.connectBankError',
      'account.connectBankPending',
      'account.connectBankPopupDone',
      'account.sync',
      'account.syncError',
      'account.syncOfflineError',
      'account.lastSynced',
      'account.disconnectError',
      'account.archive',
      'account.unarchive',
      'account.delete',
      'account.disconnect',
      'account.archived',
      'account.showArchived',
      'account.deleteConfirmTitle',
      'account.deleteConfirmMessage',
      'account.disconnectConfirmTitle',
      'account.disconnectConfirmMessage',
      'account.unsavedTitle',
      'account.unsavedMessage',
      'account.unsavedStay',
      'account.unsavedLeave',
      'account.saveError',
      'account.createError',
      'account.deleteError',
      'account.deleteLastCashError',
      'account.archiveError',
      'account.deleteWithRecordsError',
      'record.listTitle',
      'record.loading',
      'record.error',
      'record.empty',
      'record.retry',
      'record.detailTitle',
      'record.new',
      'record.newTransfer',
      'record.amount',
      'record.category',
      'record.account',
      'record.fromAccount',
      'record.toAccount',
      'record.date',
      'record.time',
      'record.note',
      'record.status',
      'record.save',
      'record.create',
      'record.delete',
      'record.deleteConfirmTitle',
      'record.deleteConfirmMessage',
      'record.saveError',
      'record.createError',
      'record.deleteError',
      'record.period.today',
      'record.period.week',
      'record.period.month',
      'record.period.year',
      'record.period.days7',
      'record.period.days30',
      'record.period.weeks12',
      'record.period.months6',
      'record.period.year1',
      'record.period.years5',
      'home.expensesStructure',
      'home.expensesStructureAll',
      'home.expensesStructureEmpty',
      'home.vsPastPeriod',
      'home.goDeeper',
      'home.back',
      'home.cardConfiguration',
      'home.selectPeriod',
      'home.filter',
      'home.filter.none',
      'home.filter.withoutTransfers',
      'home.activeFilter',
      'home.configureCard',
      'record.week',
      'record.selectAccounts',
      'record.allAccounts',
      'record.allCategories',
      'record.selectAccount',
    ] as const;

    for (const key of keys) {
      expect(UI_MESSAGES.fr[key].length).toBeGreaterThan(0);
      expect(UI_MESSAGES.en[key].length).toBeGreaterThan(0);
    }
  });
});
