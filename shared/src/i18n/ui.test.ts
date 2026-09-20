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
      'account.bankStubTitle',
      'account.bankStubMessage',
      'account.bankStubBack',
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
    ] as const;

    for (const key of keys) {
      expect(UI_MESSAGES.fr[key].length).toBeGreaterThan(0);
      expect(UI_MESSAGES.en[key].length).toBeGreaterThan(0);
    }
  });
});
