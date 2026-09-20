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
});
