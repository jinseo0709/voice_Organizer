export * from './types';
export * from './utils';
import type { VoiceMemo } from './types';
export type CreateVoiceMemo = Omit<VoiceMemo, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateVoiceMemo = Partial<Omit<VoiceMemo, 'id' | 'userId' | 'createdAt'>>;
//# sourceMappingURL=index.d.ts.map