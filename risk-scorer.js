const { execSync } = require('child_process');

function runCommand(command) {
    try {
        return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (error) {
        return null;
    }
}

function getFileFrequencies() {
    const logOutput = runCommand('git log --name-only --format= -30');
    if (!logOutput) return {};
    const lines = logOutput.split('\n');
    const freq = {};
    for (const line of lines) {
        const file = line.trim();
        if (file) {
            freq[file] = (freq[file] || 0) + 1;
        }
    }
    return freq;
}

function calculateRisk(diffFiles) {
    try {
        if (!diffFiles || !Array.isArray(diffFiles)) {
            return [];
        }

        const frequencies = getFileFrequencies();
        const results = [];

        for (const fileData of diffFiles) {
            const file = fileData.file;
            const linesChanged = (fileData.added || 0) + (fileData.removed || 0);

            // 1. Frequency Score (Weight: 40%)
            // max frequency is 30.
            const freq = frequencies[file] || 0;
            let freqScore = (freq / 30) * 100;
            if (freqScore > 100) freqScore = 100;

            // 2. Lines Changed Score (Weight: 30%)
            // Assuming 500 lines changed = 100 score
            let linesScore = (linesChanged / 500) * 100;
            if (linesScore > 100) linesScore = 100;

            // 3. File Path Pattern Score (Weight: 30%)
            let pathScore = 50; // default medium risk
            const lowerFile = file.toLowerCase();
            if (lowerFile.includes('test/') || lowerFile.includes('tests/') || lowerFile.includes('.test.') || lowerFile.includes('.spec.')) {
                pathScore = 0;
            } else if (lowerFile.includes('auth') || lowerFile.includes('payment') || lowerFile.includes('core')) {
                pathScore = 100;
            }

            const totalScore = (freqScore * 0.4) + (linesScore * 0.3) + (pathScore * 0.3);
            const riskScore = Math.round(totalScore);

            let riskLevel = 'LOW';
            if (riskScore >= 75) {
                riskLevel = 'CRITICAL';
            } else if (riskScore >= 50) {
                riskLevel = 'HIGH';
            } else if (riskScore >= 25) {
                riskLevel = 'MED';
            }

            results.push({
                file,
                riskScore,
                riskLevel
            });
        }

        return results;
    } catch (err) {
        throw err;
    }
}

module.exports = calculateRisk;
