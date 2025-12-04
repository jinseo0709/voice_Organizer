export interface LanguageConfig {
    projectId?: string;
    keyFilename?: string;
    credentials?: object;
    [key: string]: any;
}
export interface AnalysisOptions {
    enableEntityAnalysis?: boolean;
    enableSentimentAnalysis?: boolean;
    enableSyntaxAnalysis?: boolean;
    enableClassification?: boolean;
    languageCode?: string;
}
export interface EntityAnalysisResult {
    name: string;
    type: string;
    salience: number;
    sentiment?: {
        magnitude: number;
        score: number;
    };
}
export interface SentimentAnalysisResult {
    documentSentiment: {
        magnitude: number;
        score: number;
    };
    sentences?: Array<{
        text: string;
        sentiment: {
            magnitude: number;
            score: number;
        };
    }>;
}
export interface ClassificationResult {
    name: string;
    confidence: number;
}
export interface AnalysisResult {
    entities?: EntityAnalysisResult[];
    sentiment?: SentimentAnalysisResult;
    classifications?: ClassificationResult[];
    language?: string;
}
export declare enum VoiceMemoCategory {
    SHOPPING = "\uC1FC\uD551\uB9AC\uC2A4\uD2B8",
    TODO = "\uD22C\uB450\uB9AC\uC2A4\uD2B8",
    APPOINTMENT = "\uC57D\uC18D \uC77C\uC815",
    HOMEWORK = "\uD559\uAD50 \uC218\uC5C5 \uACFC\uC81C \uC77C\uC815",
    IDEA = "\uC544\uC774\uB514\uC5B4",
    OTHER = "\uAE30\uD0C0"
}
export interface CategorizedSummary {
    category: VoiceMemoCategory;
    summary: string;
    keywords: string[];
    confidence: number;
    actionItems?: string[];
    priority?: 'high' | 'medium' | 'low';
}
export declare class LanguageAnalysisService {
    private client;
    constructor();
    analyzeText(text: string, options?: AnalysisOptions): Promise<AnalysisResult>;
    private mockAnalyzeText;
    generateCategorizedSummary(text: string): Promise<CategorizedSummary>;
    private categorizeAndSummarize;
    private mockGenerateCategorizedSummary;
    private determineCategory;
    private generateSummaryForCategory;
    private extractKeywords;
    private extractActionItems;
    private determinePriority;
    private mockDeterminePriority;
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=language.d.ts.map