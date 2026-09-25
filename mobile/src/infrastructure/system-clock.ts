import type { Clock } from '@/domain/ports';

export class SystemClock implements Clock {
  nowIso(): string {
    return new Date().toISOString();
  }
}
