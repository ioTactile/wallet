import type { RecordKind } from '../record.js';

export type CategoryId = string;

export type Category = {
  id: CategoryId;
  parentId: CategoryId | null;
  kind: Exclude<RecordKind, 'transfer'>;
  color: string;
};

const FOOD = '#F44336';
const SHOPPING = '#42A5F5';
const HOUSING = '#FFA726';
const TRANSPORT = '#90A4AE';
const VEHICLE = '#AB47BC';
const LIFE = '#66BB6A';
const COMM = '#5C6BC0';
const FINANCIAL = '#26A69A';
const INVEST = '#EC407A';
const INCOME = '#FFCA28';
const OTHERS = '#757575';

function root(
  id: CategoryId,
  kind: Category['kind'],
  color: string,
  children: string[],
): Category[] {
  return [
    { id, parentId: null, kind, color },
    ...children.map((child) => ({
      id: `${id}.${child}`,
      parentId: id,
      kind,
      color,
    })),
  ];
}

export const CATEGORIES: readonly Category[] = [
  ...root('food_drinks', 'expense', FOOD, ['bar_cafe', 'groceries', 'restaurant_fast_food']),
  ...root('shopping', 'expense', SHOPPING, [
    'clothes_shoes',
    'drugstore_chemist',
    'electronics_accessories',
    'free_time',
    'gifts_joy',
    'health_beauty',
    'home_garden',
    'jewels_accessories',
    'kids',
    'pets_animals',
    'stationery_tools',
  ]),
  ...root('housing', 'expense', HOUSING, [
    'energy_utilities',
    'maintenance_repairs',
    'mortgage',
    'property_insurance',
    'rent',
    'services',
  ]),
  ...root('transportation', 'expense', TRANSPORT, [
    'business_trips',
    'long_distance',
    'public_transport',
    'taxi',
  ]),
  ...root('vehicle', 'expense', VEHICLE, [
    'fuel',
    'leasing',
    'parking',
    'rentals',
    'vehicle_insurance',
    'vehicle_maintenance',
  ]),
  ...root('life_entertainment', 'expense', LIFE, [
    'active_sport_fitness',
    'alcohol_tobacco',
    'books_audio_subscriptions',
    'charity_gifts',
    'culture_sport_events',
    'education_development',
    'healthcare_doctor',
    'hobbies',
    'holiday_trips_hotels',
    'life_events',
    'lottery_gambling',
    'tv_streaming',
    'wellness_beauty',
  ]),
  ...root('communication_pc', 'expense', COMM, [
    'internet',
    'phone_cellphone',
    'postal_services',
    'software_apps_games',
  ]),
  ...root('financial_expenses', 'expense', FINANCIAL, [
    'advisory',
    'charges_fees',
    'child_support',
    'fines',
    'insurances',
    'loan_interests',
    'taxes',
  ]),
  ...root('investments', 'expense', INVEST, [
    'collections',
    'financial_investments',
    'realty',
    'savings',
    'vehicles_chattels',
  ]),
  ...root('income', 'income', INCOME, [
    'checks_coupons',
    'child_support',
    'dues_grants',
    'gifts',
    'interests_dividends',
    'lending_renting',
    'lottery_gambling',
    'refunds',
    'rental_income',
    'sale',
    'wage_invoices',
  ]),
  ...root('others', 'expense', OTHERS, ['missing']),
];

export function getCategory(id: CategoryId): Category | undefined {
  return CATEGORIES.find((category) => category.id === id);
}

export function listRoots(): Category[] {
  return CATEGORIES.filter((category) => category.parentId === null);
}

export function listChildren(parentId: CategoryId): Category[] {
  return CATEGORIES.filter((category) => category.parentId === parentId);
}

export function categoriesFor(kind: RecordKind): Category[] {
  if (kind === 'transfer') return [];
  return CATEGORIES.filter((category) => category.kind === kind);
}
