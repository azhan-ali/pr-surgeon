const { execSync } = require('child_process');

function runCommand(command) {
    try {
        return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (error) {
        return null;
    }
}

function analyzeHistory(diffFiles) {
    try {
        const commitsCountOutput = runCommand("git rev-list --count HEAD");
        if (!commitsCountOutput) {
            return { godFiles: [], message: "Insufficient history — need 10+ commits" };
        }
        
        const totalCommits = parseInt(commitsCountOutput.trim(), 10);
        if (isNaN(totalCommits) || totalCommits < 10) {
            return { godFiles: [], message: "Insufficient history — need 10+ commits" };
        }

        const limit = Math.min(totalCommits, 50);
        
        const logOutput = runCommand(`git log --name-only --format= -${limit}`);
        if (!logOutput) return { godFiles: [] };

        const lines = logOutput.split('\n');
        const freq = {};
        for (const line of lines) {
            const file = line.trim();
            if (file) {
                freq[file] = (freq[file] || 0) + 1;
            }
        }

        const godFiles = [];
        const threshold = limit * 0.40; // >40%

        let filesToAnalyze = [];
        if (diffFiles && Array.isArray(diffFiles) && diffFiles.length > 0) {
            filesToAnalyze = diffFiles.map(f => typeof f === 'string' ? f : f.file);
        } else {
            filesToAnalyze = Object.keys(freq);
        }

        for (const file of filesToAnalyze) {
            if (!file) continue;
            const touchCount = freq[file] || 0;
            if (touchCount > threshold) {
                const Math = global.Math;
                const percentage = Math.round((touchCount / limit) * 100);
                godFiles.push({
                    file: file,
                    touchFrequency: `${percentage}%`,
                    diagnosis: "Architectural Pressure Point",
                    suggestion: `Consider extracting ${file} into smaller modules`
                });
            }
        }

        return { godFiles };

    } catch (err) {
        return { godFiles: [] };
    }
}

module.exports = { analyzeHistory };
