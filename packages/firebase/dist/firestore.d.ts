import { Timestamp, type Unsubscribe } from 'firebase/firestore';
import type { VoiceMemo, CreateVoiceMemo, UpdateVoiceMemo } from '@voice-organizer/shared';
export interface FirestoreVoiceMemo extends Omit<VoiceMemo, 'createdAt' | 'updatedAt'> {
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
export declare class FirestoreService {
    private readonly COLLECTIONS;
    createMemo(memo: CreateVoiceMemo): Promise<string>;
    getMemo(id: string): Promise<VoiceMemo | null>;
    getUserMemos(userId: string, limitCount?: number): Promise<VoiceMemo[]>;
    updateMemo(id: string, updates: UpdateVoiceMemo): Promise<void>;
    deleteMemo(id: string): Promise<void>;
    subscribeToUserMemos(userId: string, callback: (memos: VoiceMemo[]) => void, limitCount?: number): Unsubscribe;
    create(collectionPath: string, data: any): Promise<string>;
    get(collectionPath: string, docId: string): Promise<any>;
    getAll(collectionPath: string, options?: {
        where?: {
            field: string;
            operator: any;
            value: any;
        }[];
        orderBy?: {
            field: string;
            direction: 'asc' | 'desc';
        }[];
        limit?: number;
    }): Promise<any[]>;
    searchMemosByTag(userId: string, tag: string): Promise<VoiceMemo[]>;
    getMemosByCategory(userId: string, category: string): Promise<VoiceMemo[]>;
    private mapFirestoreToVoiceMemo;
    private mapQuerySnapshotToMemos;
}
export declare const firestoreService: FirestoreService;
export default firestoreService;
//# sourceMappingURL=firestore.d.ts.map