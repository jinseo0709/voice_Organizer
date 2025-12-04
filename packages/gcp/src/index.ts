// Speech-to-Text 서비스
export {
  SpeechToTextService,
  type SpeechConfig,
  type TranscriptionOptions,
  type TranscriptionResult
} from './speech';

// Natural Language 서비스
export {
  LanguageAnalysisService,
  VoiceMemoCategory,
  type LanguageConfig,
  type AnalysisOptions,
  type EntityAnalysisResult,
  type SentimentAnalysisResult,
  type ClassificationResult,
  type AnalysisResult,
  type CategorizedSummary
} from './language';

// 서비스 클래스 import
import { SpeechToTextService } from './speech';
import { LanguageAnalysisService } from './language';

// 기본 서비스 인스턴스 생성
const speechToTextService = new SpeechToTextService();
const languageAnalysisService = new LanguageAnalysisService();

const gcpServices = {
  speechToTextService,
  languageAnalysisService,
};

export { speechToTextService, languageAnalysisService };
export default gcpServices;