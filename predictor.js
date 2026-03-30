const { execSync } = require('child_process');

function runCommand(command) {
    try {
        return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (error) {
        return null;
    }
}

function parseShortStat(statLine) {
    let lines = 0;
    const insertsMatch = statLine.match(/(\d+)\s+insertion/);
    const deletesMatch = statLine.match(/(\d+)\s+deletion/);
    if (insertsMatch) lines += parseInt(insertsMatch[1], 10);
    if (deletesMatch) lines += parseInt(deletesMatch[1], 10);
    return lines;
}

function extractHistory() {
    const output = runCommand('git log -200 --format="COMMIT|%at|%ct" --shortstat');
    if (!output) return [];

    const lines = output.trim().split('\n');
    const records = [];
    
    let currentRecord = null;
    
    for (const line of lines) {
        if (line.startsWith('COMMIT|')) {
            const parts = line.replace('COMMIT|', '').split('|');
            const authorTime = parseInt(parts[0], 10);
            const commitTime = parseInt(parts[1], 10);
            
            currentRecord = { authorTime, commitTime, linesChanged: 0 };
            records.push(currentRecord);
        } else if (line.includes(' changed') && currentRecord) {
            currentRecord.linesChanged = parseShortStat(line);
        }
    }
    
    return records;
}

function predictMergeTime(totalLinesAdded, totalLinesRemoved, splitGroups) {
    try {
        const records = extractHistory();
        
        // Define PR merge as a commit where Committer Time comes after Author Time by at least 5 mins
        const validRecords = records.filter(r => {
            const diffDays = (r.commitTime - r.authorTime) / 86400;
            return diffDays > 0.003 && diffDays < 100 && r.linesChanged > 0;
        });

        const buckets = { small: [], medium: [], large: [] };
        
        for (const r of validRecords) {
            const diffDays = (r.commitTime - r.authorTime) / 86400;
            if (r.linesChanged < 200) buckets.small.push(diffDays);
            else if (r.linesChanged <= 500) buckets.medium.push(diffDays);
            else buckets.large.push(diffDays);
        }
        
        const count = buckets.small.length + buckets.medium.length + buckets.large.length;
        
        if (count < 5) {
            return { status: 'insufficient', message: 'Not enough history for prediction' };
        }
        
        const getAvg = (arr, fallback) => arr.length > 0 ? arr.reduce((a,b)=>a+b,0)/arr.length : fallback;
        
        const overallAvg = validRecords.reduce((sum, r) => sum + ((r.commitTime - r.authorTime)/86400), 0) / validRecords.length;
        
        const smallAvg = getAvg(buckets.small, overallAvg * 0.5);
        const mediumAvg = getAvg(buckets.medium, overallAvg);
        const largeAvg = getAvg(buckets.large, overallAvg * 1.5);

        const activeLines = (parseInt(totalLinesAdded) || 0) + (parseInt(totalLinesRemoved) || 0);

        let currentPredict = smallAvg;
        if (activeLines >= 500) currentPredict = largeAvg;
        else if (activeLines >= 200) currentPredict = mediumAvg;

        let afterSplitPredict = currentPredict;
        let savedPercent = 0;

        if (splitGroups && splitGroups.length > 1) {
            let splitTotalDays = 0;
            for (const pr of splitGroups) {
                const prSize = activeLines / splitGroups.length; 
                let prDays = smallAvg;
                if (prSize >= 500) prDays = largeAvg;
                else if (prSize >= 200) prDays = mediumAvg;
                splitTotalDays += prDays;
            }
            
            // Evaluates PR overhead when chunked parallel
            afterSplitPredict = Math.max(splitTotalDays * 0.7, smallAvg); 
            
            if (afterSplitPredict > currentPredict) {
                afterSplitPredict = currentPredict * 0.8; 
            }

            savedPercent = Math.round(((currentPredict - afterSplitPredict) / currentPredict) * 100);
        }
        
        return {
            status: 'success',
            currentDays: Math.max(0.1, currentPredict).toFixed(1),
            afterSplitDays: Math.max(0.1, afterSplitPredict).toFixed(1),
            savedPercent: savedPercent > 0 ? savedPercent : 0
        };
    } catch(err) {
        return { status: 'insufficient', message: 'Not enough history for prediction' };
    }
}

module.exports = { predictMergeTime };
