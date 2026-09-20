export const RECORD_KINDS = ['expense', 'income', 'transfer'] as const;

export type RecordKind = (typeof RECORD_KINDS)[number];

export const RECORD_CLEARING = ['cleared', 'uncleared'] as const;

export type RecordClearing = (typeof RECORD_CLEARING)[number];
