import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  type DocumentData,
  type QuerySnapshot,
  type DocumentReference,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import firebase from './config';
import type { VoiceMemo, CreateVoiceMemo, UpdateVoiceMemo } from '@voice-organizer/shared';

export interface FirestoreVoiceMemo extends Omit<VoiceMemo, 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class FirestoreService {
  private readonly COLLECTIONS = {
    MEMOS: 'voice_memos',
    USERS: 'users',
  } as const;

  // 음성 메모 생성
  async createMemo(memo: CreateVoiceMemo): Promise<string> {
    try {
      const firestoreMemo: Omit<FirestoreVoiceMemo, 'id'> = {
        ...memo,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(
        collection(firebase.getFirestore(), this.COLLECTIONS.MEMOS),
        firestoreMemo
      );

      return docRef.id;
    } catch (error) {
      console.error('Failed to create memo:', error);
      throw error;
    }
  }

  // 음성 메모 조회
  async getMemo(id: string): Promise<VoiceMemo | null> {
    try {
      const docRef = doc(firebase.getFirestore(), this.COLLECTIONS.MEMOS, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return this.mapFirestoreToVoiceMemo(id, docSnap.data() as FirestoreVoiceMemo);
      }

      return null;
    } catch (error) {
      console.error('Failed to get memo:', error);
      throw error;
    }
  }

  // 사용자의 음성 메모 목록 조회
  async getUserMemos(userId: string, limitCount = 50): Promise<VoiceMemo[]> {
    try {
      const q = query(
        collection(firebase.getFirestore(), this.COLLECTIONS.MEMOS),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return this.mapQuerySnapshotToMemos(querySnapshot);
    } catch (error) {
      console.error('Failed to get user memos:', error);
      throw error;
    }
  }

  // 음성 메모 업데이트
  async updateMemo(id: string, updates: UpdateVoiceMemo): Promise<void> {
    try {
      const docRef = doc(firebase.getFirestore(), this.COLLECTIONS.MEMOS, id);
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Failed to update memo:', error);
      throw error;
    }
  }

  // 음성 메모 삭제
  async deleteMemo(id: string): Promise<void> {
    try {
      const docRef = doc(firebase.getFirestore(), this.COLLECTIONS.MEMOS, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Failed to delete memo:', error);
      throw error;
    }
  }

  // 실시간 메모 목록 구독
  subscribeToUserMemos(
    userId: string,
    callback: (memos: VoiceMemo[]) => void,
    limitCount = 50
  ): Unsubscribe {
    const q = query(
      collection(firebase.getFirestore(), this.COLLECTIONS.MEMOS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (querySnapshot) => {
      const memos = this.mapQuerySnapshotToMemos(querySnapshot);
      callback(memos);
    });
  }

  // 범용 문서 생성 메서드
  async create(collectionPath: string, data: any): Promise<string> {
    try {
      const docRef = await addDoc(
        collection(firebase.getFirestore(), collectionPath),
        {
          ...data,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }
      );
      return docRef.id;
    } catch (error) {
      console.error(`Failed to create document in ${collectionPath}:`, error);
      throw error;
    }
  }

  // 범용 문서 조회 메서드
  async get(collectionPath: string, docId: string): Promise<any> {
    try {
      const docRef = doc(firebase.getFirestore(), collectionPath, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Failed to get document ${docId} from ${collectionPath}:`, error);
      throw error;
    }
  }

  // 범용 컬렉션 조회 메서드
  async getAll(collectionPath: string, options?: {
    where?: { field: string; operator: any; value: any }[];
    orderBy?: { field: string; direction: 'asc' | 'desc' }[];
    limit?: number;
  }): Promise<any[]> {
    try {
      const collectionRef = collection(firebase.getFirestore(), collectionPath);
      let constraints: any[] = [];
      
      if (options?.where) {
        options.where.forEach(condition => {
          constraints.push(where(condition.field, condition.operator, condition.value));
        });
      }
      
      if (options?.orderBy) {
        options.orderBy.forEach(order => {
          constraints.push(orderBy(order.field, order.direction));
        });
      }
      
      if (options?.limit) {
        constraints.push(limit(options.limit));
      }
      
      const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        };
      });
    } catch (error) {
      console.error(`Failed to get documents from ${collectionPath}:`, error);
      throw error;
    }
  }

  // 태그별 메모 검색
  async searchMemosByTag(userId: string, tag: string): Promise<VoiceMemo[]> {
    try {
      const q = query(
        collection(firebase.getFirestore(), this.COLLECTIONS.MEMOS),
        where('userId', '==', userId),
        where('tags', 'array-contains', tag),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return this.mapQuerySnapshotToMemos(querySnapshot);
    } catch (error) {
      console.error('Failed to search memos by tag:', error);
      throw error;
    }
  }

  // 카테고리별 메모 조회
  async getMemosByCategory(userId: string, category: string): Promise<VoiceMemo[]> {
    try {
      const q = query(
        collection(firebase.getFirestore(), this.COLLECTIONS.MEMOS),
        where('userId', '==', userId),
        where('category', '==', category),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return this.mapQuerySnapshotToMemos(querySnapshot);
    } catch (error) {
      console.error('Failed to get memos by category:', error);
      throw error;
    }
  }

  private mapFirestoreToVoiceMemo(id: string, data: FirestoreVoiceMemo): VoiceMemo {
    return {
      ...data,
      id,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  }

  private mapQuerySnapshotToMemos(querySnapshot: QuerySnapshot<DocumentData>): VoiceMemo[] {
    return querySnapshot.docs.map((doc) => 
      this.mapFirestoreToVoiceMemo(doc.id, doc.data() as FirestoreVoiceMemo)
    );
  }
}

export const firestoreService = new FirestoreService();
export default firestoreService;