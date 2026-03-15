// Local storage key for scan history
const STORAGE_KEY = 'synabl_scan_history';

export const scanService = {
    async getScanHistory() {
        try {
            const token = localStorage.getItem('synabl_token');
            const response = await fetch('/api/scans', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch history');
            return await response.json();
        } catch (error) {
            console.error('Failed to load history', error);
            return [];
        }
    },

    async getScanDetails(id) {
        const token = localStorage.getItem('synabl_token');
        const response = await fetch(`/api/scans/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Scan not found');
        return await response.json();
    },

    async getLatestScan() {
        const history = await this.getScanHistory();
        return history.length > 0 ? history[0] : null;
    },

    async uploadDocument(file, onProgress) {
        if (onProgress) onProgress(10);

        const formData = new FormData();
        formData.append('file', file);

        try {
            if (onProgress) onProgress(30);

            // 1. Run Plagiarism Check
            const token = localStorage.getItem('synabl_token');
            const response = await fetch('/api/plagiarism-check-pdf', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Plagiarism check failed');
            }

            if (onProgress) onProgress(60);

            const plagiarismResult = await response.json();
            const scanId = plagiarismResult.id;

            // 2. Run AI Content Check
            const aiResponse = await fetch(`/api/ai-content-check-pdf?scanId=${scanId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            let aiResult = { aiProbability: 0 };
            if (aiResponse.ok) {
                aiResult = await aiResponse.json();
            }

            if (onProgress) onProgress(90);

            const newScan = {
                id: scanId || Date.now().toString(),
                filename: file.name,
                date: new Date().toISOString(),
                similarity: plagiarismResult.overallScore || plagiarismResult.plagiarismPercentage,
                aiScore: aiResult.aiProbability * 100,
                status: 'completed',
                words: Math.round(plagiarismResult.extractedCharacters / 6) || 0,
                plagiarismResult: plagiarismResult,
                aiResult: aiResult,
                sources: (plagiarismResult.results || []).flatMap(r => r.sources || []).map(s => ({
                    name: s.url ? new URL(s.url).hostname : 'Unknown',
                    match: s.similarity,
                    link: s.url,
                    title: s.title
                })).slice(0, 10)
            };

            if (onProgress) onProgress(100);
            return newScan;
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }
};
