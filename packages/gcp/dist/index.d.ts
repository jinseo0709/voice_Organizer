export { SpeechToTextService, type SpeechConfig, type TranscriptionOptions, type TranscriptionResult } from './speech';
export { LanguageAnalysisService, VoiceMemoCategory, type LanguageConfig, type AnalysisOptions, type EntityAnalysisResult, type SentimentAnalysisResult, type ClassificationResult, type AnalysisResult, type CategorizedSummary } from './language';
import { SpeechToTextService } from './speech';
import { LanguageAnalysisService } from './language';
declare const speechToTextService: SpeechToTextService;
declare const languageAnalysisService: LanguageAnalysisService;
declare const gcpServices: {
    speechToTextService: SpeechToTextService;
    languageAnalysisService: LanguageAnalysisService;
};
export { speechToTextService, languageAnalysisService };
export default gcpServices;
//# sourceMappingURL=index.d.ts.map