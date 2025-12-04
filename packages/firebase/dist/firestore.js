"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.firestoreService = exports.FirestoreService = void 0;
const firestore_1 = require("firebase/firestore");
const config_1 = __importDefault(require("./config"));
class FirestoreService {
    COLLECTIONS = {
        MEMOS: 'voice_memos',
        USERS: 'users',
    };
    // 음성 메모 생성
    async createMemo(memo) {
        try {
            const firestoreMemo = {
                ...memo,
                createdAt: firestore_1.Timestamp.now(),
                updatedAt: firestore_1.Timestamp.now(),
            };
            const docRef = await (0, firestore_1.addDoc)((0, firestore_1.collection)(config_1.default.getFirestore(), this.COLLECTIONS.MEMOS), firestoreMemo);
            return docRef.id;
        }
        catch (error) {
            console.error('Failed to create memo:', error);
            throw error;
        }
    }
    // 음성 메모 조회
    async getMemo(id) {
        try {
            const docRef = (0, firestore_1.doc)(config_1.default.getFirestore(), this.COLLECTIONS.MEMOS, id);
            const docSnap = await (0, firestore_1.getDoc)(docRef);
            if (docSnap.exists()) {
                return this.mapFirestoreToVoiceMemo(id, docSnap.data());
            }
            return null;
        }
        catch (error) {
            console.error('Failed to get memo:', error);
            throw error;
        }
    }
    // 사용자의 음성 메모 목록 조회
    async getUserMemos(userId, limitCount = 50) {
        try {
            const q = (0, firestore_1.query)((0, firestore_1.collection)(config_1.default.getFirestore(), this.COLLECTIONS.MEMOS), (0, firestore_1.where)('userId', '==', userId), (0, firestore_1.orderBy)('createdAt', 'desc'), (0, firestore_1.limit)(limitCount));
            const querySnapshot = await (0, firestore_1.getDocs)(q);
            return this.mapQuerySnapshotToMemos(querySnapshot);
        }
        catch (error) {
            console.error('Failed to get user memos:', error);
            throw error;
        }
    }
    // 음성 메모 업데이트
    async updateMemo(id, updates) {
        try {
            const docRef = (0, firestore_1.doc)(config_1.default.getFirestore(), this.COLLECTIONS.MEMOS, id);
            const updateData = {
                ...updates,
                updatedAt: firestore_1.Timestamp.now(),
            };
            await (0, firestore_1.updateDoc)(docRef, updateData);
        }
        catch (error) {
            console.error('Failed to update memo:', error);
            throw error;
        }
    }
    // 음성 메모 삭제
    async deleteMemo(id) {
        try {
            const docRef = (0, firestore_1.doc)(config_1.default.getFirestore(), this.COLLECTIONS.MEMOS, id);
            await (0, firestore_1.deleteDoc)(docRef);
        }
        catch (error) {
            console.error('Failed to delete memo:', error);
            throw error;
        }
    }
    // 실시간 메모 목록 구독
    subscribeToUserMemos(userId, callback, limitCount = 50) {
        const q = (0, firestore_1.query)((0, firestore_1.collection)(config_1.default.getFirestore(), this.COLLECTIONS.MEMOS), (0, firestore_1.where)('userId', '==', userId), (0, firestore_1.orderBy)('createdAt', 'desc'), (0, firestore_1.limit)(limitCount));
        return (0, firestore_1.onSnapshot)(q, (querySnapshot) => {
            const memos = this.mapQuerySnapshotToMemos(querySnapshot);
            callback(memos);
        });
    }
    // 범용 문서 생성 메서드
    async create(collectionPath, data) {
        try {
            const docRef = await (0, firestore_1.addDoc)((0, firestore_1.collection)(config_1.default.getFirestore(), collectionPath), {
                ...data,
                createdAt: firestore_1.Timestamp.now(),
                updatedAt: firestore_1.Timestamp.now(),
            });
            return docRef.id;
        }
        catch (error) {
            console.error(`Failed to create document in ${collectionPath}:`, error);
            throw error;
        }
    }
    // 범용 문서 조회 메서드
    async get(collectionPath, docId) {
        try {
            const docRef = (0, firestore_1.doc)(config_1.default.getFirestore(), collectionPath, docId);
            const docSnap = await (0, firestore_1.getDoc)(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            else {
                return null;
            }
        }
        catch (error) {
            console.error(`Failed to get document ${docId} from ${collectionPath}:`, error);
            throw error;
        }
    }
    // 범용 컬렉션 조회 메서드
    async getAll(collectionPath, options) {
        try {
            const collectionRef = (0, firestore_1.collection)(config_1.default.getFirestore(), collectionPath);
            let constraints = [];
            if (options?.where) {
                options.where.forEach(condition => {
                    constraints.push((0, firestore_1.where)(condition.field, condition.operator, condition.value));
                });
            }
            if (options?.orderBy) {
                options.orderBy.forEach(order => {
                    constraints.push((0, firestore_1.orderBy)(order.field, order.direction));
                });
            }
            if (options?.limit) {
                constraints.push((0, firestore_1.limit)(options.limit));
            }
            const q = constraints.length > 0 ? (0, firestore_1.query)(collectionRef, ...constraints) : collectionRef;
            const querySnapshot = await (0, firestore_1.getDocs)(q);
            return querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data
                };
            });
        }
        catch (error) {
            console.error(`Failed to get documents from ${collectionPath}:`, error);
            throw error;
        }
    }
    // 태그별 메모 검색
    async searchMemosByTag(userId, tag) {
        try {
            const q = (0, firestore_1.query)((0, firestore_1.collection)(config_1.default.getFirestore(), this.COLLECTIONS.MEMOS), (0, firestore_1.where)('userId', '==', userId), (0, firestore_1.where)('tags', 'array-contains', tag), (0, firestore_1.orderBy)('createdAt', 'desc'));
            const querySnapshot = await (0, firestore_1.getDocs)(q);
            return this.mapQuerySnapshotToMemos(querySnapshot);
        }
        catch (error) {
            console.error('Failed to search memos by tag:', error);
            throw error;
        }
    }
    // 카테고리별 메모 조회
    async getMemosByCategory(userId, category) {
        try {
            const q = (0, firestore_1.query)((0, firestore_1.collection)(config_1.default.getFirestore(), this.COLLECTIONS.MEMOS), (0, firestore_1.where)('userId', '==', userId), (0, firestore_1.where)('category', '==', category), (0, firestore_1.orderBy)('createdAt', 'desc'));
            const querySnapshot = await (0, firestore_1.getDocs)(q);
            return this.mapQuerySnapshotToMemos(querySnapshot);
        }
        catch (error) {
            console.error('Failed to get memos by category:', error);
            throw error;
        }
    }
    mapFirestoreToVoiceMemo(id, data) {
        return {
            ...data,
            id,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
        };
    }
    mapQuerySnapshotToMemos(querySnapshot) {
        return querySnapshot.docs.map((doc) => this.mapFirestoreToVoiceMemo(doc.id, doc.data()));
    }
}
exports.FirestoreService = FirestoreService;
exports.firestoreService = new FirestoreService();
exports.default = exports.firestoreService;
//# sourceMappingURL=firestore.js.map