import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from './schema.js';

export type AppDatabase = PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>;
