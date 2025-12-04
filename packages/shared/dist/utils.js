"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDuration = formatDuration;
exports.formatFileSize = formatFileSize;
exports.formatDate = formatDate;
exports.generateId = generateId;
exports.slugify = slugify;
exports.validateAudioFile = validateAudioFile;
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
function formatDate(date, locale = 'ko-KR') {
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}
function validateAudioFile(file) {
    const allowedTypes = ['audio/mp3', 'audio/wav', 'audio/webm', 'audio/m4a'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Unsupported file type. Please use MP3, WAV, WebM, or M4A.'
        };
    }
    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'File size too large. Maximum size is 50MB.'
        };
    }
    return { valid: true };
}
//# sourceMappingURL=utils.js.map