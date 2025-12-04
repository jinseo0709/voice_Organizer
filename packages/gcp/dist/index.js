"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.languageAnalysisService = exports.speechToTextService = exports.VoiceMemoCategory = exports.LanguageAnalysisService = exports.SpeechToTextService = void 0;
// Speech-to-Text 서비스
var speech_1 = require("./speech");
Object.defineProperty(exports, "SpeechToTextService", { enumerable: true, get: function () { return speech_1.SpeechToTextService; } });
// Natural Language 서비스
var language_1 = require("./language");
Object.defineProperty(exports, "LanguageAnalysisService", { enumerable: true, get: function () { return language_1.LanguageAnalysisService; } });
Object.defineProperty(exports, "VoiceMemoCategory", { enumerable: true, get: function () { return language_1.VoiceMemoCategory; } });
// 서비스 클래스 import
const speech_2 = require("./speech");
const language_2 = require("./language");
// 기본 서비스 인스턴스 생성
const speechToTextService = new speech_2.SpeechToTextService();
exports.speechToTextService = speechToTextService;
const languageAnalysisService = new language_2.LanguageAnalysisService();
exports.languageAnalysisService = languageAnalysisService;
const gcpServices = {
    speechToTextService,
    languageAnalysisService,
};
exports.default = gcpServices;
//# sourceMappingURL=index.js.map