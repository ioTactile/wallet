# Wallet

Application de suivi de dépenses (PFM) — pas un wallet de paiement.

Plusieurs comptes par utilisateur : `cash` (Espèces, saisie manuelle) et `bank` (agrégation AIS en lecture seule). Aucun virement, PIS ni écriture sur un compte bancaire réel.

## Structure

```
wallet/
├── api/      # API Fastify — hexagone + TDD
├── mobile/   # App Expo (SDK 57)
└── shared/   # Contrat commun (@wallet/shared) — Zod, catégories, i18n
```

| Package | Rôle |
|---|---|
| `@wallet/api` | Accounts, records, auth JWT, sync banque (adapter AIS) |
| `wallet-react-native` | UI native, coffre PIN local, client API |
| `@wallet/shared` | Schémas Zod, catalogue de catégories, libellés FR/EN |

## Prérequis

- Node.js 22+
- [pnpm](https://pnpm.io/)
- Docker (PostgreSQL pour l’API)

## Démarrage

```bash
# Dépendances (chaque package a son propre lockfile)
pnpm --dir shared install
pnpm --dir api install
pnpm --dir mobile install
pnpm install   # husky / lint-staged à la racine
```

### API

```bash
cp api/.env.example api/.env
pnpm --dir api db:up    # PostgreSQL sur :5432
pnpm --dir api dev      # http://127.0.0.1:3000
```

### Mobile

```bash
cp mobile/.env.example mobile/.env
pnpm --dir mobile start
```

`EXPO_PUBLIC_API_URL` pointe par défaut vers `http://127.0.0.1:3000`.

## Scripts utiles

| Commande | Description |
|---|---|
| `pnpm --dir api test` | Tests Vitest (domain + adapters) |
| `pnpm --dir mobile test` | Tests Jest |
| `pnpm --dir shared test` | Tests du contrat partagé |
| `pnpm lint` | ESLint sur les trois packages |
| `pnpm format` | Prettier sur les trois packages |

## Architecture

Les deux apps suivent une architecture hexagonale / clean :

- **domain** — entités, value objects, ports (zéro framework)
- **application** — use cases
- **infrastructure** — HTTP, persistence, SecureStore, horloge…

L’argent est toujours en centimes (integer), jamais en `number` flottant. Le domaine ne connaît ni Fastify, ni Drizzle, ni React Native.

## Auth

Deux couches distinctes :

1. **Coffre local** — PIN à 4 chiffres (hash + sel dans SecureStore). Obligatoire pour ouvrir l’app.
2. **Compte API** — email + mot de passe, JWT access court + refresh rotatif.

## Licence

Privé — usage interne.
