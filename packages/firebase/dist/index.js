"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = exports.storageService = exports.FirestoreService = exports.firestoreService = exports.AuthService = exports.authService = exports.firebase = void 0;
// Firebase 설정
var config_1 = require("./config");
Object.defineProperty(exports, "firebase", { enumerable: true, get: function () { return config_1.firebase; } });
// 인증 서비스
var auth_1 = require("./auth");
Object.defineProperty(exports, "authService", { enumerable: true, get: function () { return auth_1.authService; } });
Object.defineProperty(exports, "AuthService", { enumerable: true, get: function () { return auth_1.AuthService; } });
// Firestore 서비스
var firestore_1 = require("./firestore");
Object.defineProperty(exports, "firestoreService", { enumerable: true, get: function () { return firestore_1.firestoreService; } });
Object.defineProperty(exports, "FirestoreService", { enumerable: true, get: function () { return firestore_1.FirestoreService; } });
// Storage 서비스
var storage_1 = require("./storage");
Object.defineProperty(exports, "storageService", { enumerable: true, get: function () { return storage_1.storageService; } });
Object.defineProperty(exports, "StorageService", { enumerable: true, get: function () { return storage_1.StorageService; } });
// 기본 내보내기용 import
const config_2 = require("./config");
const auth_2 = require("./auth");
const firestore_2 = require("./firestore");
const storage_2 = require("./storage");
const firebaseServices = {
    firebase: config_2.firebase,
    authService: auth_2.authService,
    firestoreService: firestore_2.firestoreService,
    storageService: storage_2.storageService,
};
exports.default = firebaseServices;
//# sourceMappingURL=index.js.map