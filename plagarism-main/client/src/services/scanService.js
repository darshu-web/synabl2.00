// Local storage key for scan history
const STORAGE_KEY = 'synabl_scan_history';

const getStoredScans = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Failed to load history', e);
        return [];
    }
};

const saveScans = (scans) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
};

export const scanService = {
    async getScanHistory() {
        return getStoredScans().sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    async getScanDetails(id) {
        const scans = getStoredScans();
        const scan = scans.find(s => s.id === id);
        if (!scan) throw new Error('Scan not found');
        return scan;
    },

    async getLatestScan() {
        const scans = getStoredScans();
        if (scans.length === 0) return null;
        return scans.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    },

    async uploadDocument(file, onProgress) {
        if (onProgress) onProgress(10);

        const formData = new FormData();
        formData.append('file', file);

        try {
            if (onProgress) onProgress(30);

            // 1. Run Plagiarism Check
            const plagiarismResponse = await fetch('/api/plagiarism-check-pdf', {
                method: 'POST',
                body: formData
            });

            if (!plagiarismResponse.ok) {
                throw new Error('Plagiarism check failed');
            }

            if (onProgress) onProgress(60);

            const plagiarismResult = await plagiarismResponse.json();

            // 2. Run AI Content Check (Reuse the same file)
            const aiResponse = await fetch('/api/ai-content-check-pdf', {
                method: 'POST',
                body: formData
            });

            let aiResult = { aiProbability: 0 };
            if (aiResponse.ok) {
                aiResult = await aiResponse.json();
            }

            if (onProgress) onProgress(90);

            const newScan = {
                id: Date.now().toString(),
                filename: file.name,
                date: new Date().toISOString(),
                similarity: plagiarismResult.plagiarismPercentage,
                aiScore: aiResult.aiProbability,
                status: 'completed',
                words: Math.round(plagiarismResult.extractedCharacters / 6) || 0, // Approx word count
                plagiarismResult: plagiarismResult,
                aiResult: aiResult,
                sources: (plagiarismResult.results || []).flatMap(r => r.sources || []).map(s => ({
                    name: s.url ? new URL(s.url).hostname : 'Unknown',
                    match: s.similarity,
                    link: s.url,
                    title: s.title
                })).slice(0, 10)
            };

            const history = getStoredScans();
            history.push(newScan);
            saveScans(history);

            if (onProgress) onProgress(100);
            return newScan;
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }
};
