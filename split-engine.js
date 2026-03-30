const fs = require('fs');
const path = require('path');

function getBaseName(filePath) {
    const ext = path.extname(filePath);
    return path.basename(filePath, ext);
}

function shareImports(fileA, fileB) {
    try {
        const contentA = fs.existsSync(fileA) ? fs.readFileSync(fileA, 'utf8') : '';
        const contentB = fs.existsSync(fileB) ? fs.readFileSync(fileB, 'utf8') : '';
        
        const baseA = getBaseName(fileA);
        const baseB = getBaseName(fileB);
        
        const regexA = new RegExp(`(import|require).*['"\`]\\.?\\.?\\/.*${baseB}['"\`]`, 'i');
        const regexB = new RegExp(`(import|require).*['"\`]\\.?\\.?\\/.*${baseA}['"\`]`, 'i');
        
        if (regexA.test(contentA) || regexB.test(contentB)) {
            return true;
        }
        return false;
    } catch (err) {
        return false;
    }
}

function buildDependencyGroups(filesData) {
    const groups = [];
    const used = new Set();
    
    for (let i = 0; i < filesData.length; i++) {
        if (used.has(i)) continue;
        
        const group = [filesData[i]];
        used.add(i);
        
        for (let j = 0; j < filesData.length; j++) {
            if (used.has(j)) continue;
            
            let connected = false;
            for (const f of group) {
                if (shareImports(f.file, filesData[j].file)) {
                    connected = true;
                    break;
                }
            }
            if (connected) {
                group.push(filesData[j]);
                used.add(j);
            }
        }
        groups.push(group);
    }
    return groups;
}

function splitPR(diffFiles, risks) {
    try {
        if (!diffFiles || diffFiles.length === 0) return { status: 'skipped', message: "No files to split" };
        if (diffFiles.length === 1) return { status: 'skipped', message: "PR looks healthy" };
        if (diffFiles.length === 2) return { status: 'skipped', message: "PR size looks good 👍" };
        
        const metricsMap = {};
        for (const fileObj of diffFiles) {
            metricsMap[fileObj.file] = { added: fileObj.added, removed: fileObj.removed };
        }
        
        const filesData = risks.map(r => ({
            file: r.file,
            riskScore: r.riskScore,
            riskLevel: r.riskLevel,
            added: (metricsMap[r.file] || {}).added || 0,
            removed: (metricsMap[r.file] || {}).removed || 0
        }));
        
        const highRiskLevel = ['HIGH', 'CRITICAL'];
        const normalFiles = [];
        const highRiskFiles = [];
        
        for (const f of filesData) {
             if(highRiskLevel.includes(f.riskLevel)) {
                 highRiskFiles.push(f);
             } else {
                 normalFiles.push(f);
             }
        }
        
        const groupedHigh = buildDependencyGroups(highRiskFiles);
        const groupedNormal = buildDependencyGroups(normalFiles);
        
        const splitGroups = [];
        
        const chunkGroup = (group, isHighRisk) => {
            for (let i = 0; i < group.length; i += 5) {
                splitGroups.push({
                    files: group.slice(i, i + 5),
                    isHighRisk
                });
            }
        };
        
        for (const g of groupedHigh) chunkGroup(g, true);
        for (const g of groupedNormal) chunkGroup(g, false);
        
        const suggestedPRs = splitGroups.map((groupObj, index) => {
            const filesList = groupObj.files;
            
            let totalLines = 0;
            let totalRisk = 0;
            
            for(const f of filesList) {
                totalLines += (f.added + f.removed);
                totalRisk += f.riskScore;
            }
            
            const avgRiskScore = filesList.length > 0 ? totalRisk / filesList.length : 0;
            let reviewTimeMinutes = Math.round((totalLines / 50) + (avgRiskScore * 0.1));
            if (reviewTimeMinutes < 1) reviewTimeMinutes = 1;

            const isHighRisk = groupObj.isHighRisk;
            const primaryDir = filesList.length > 0 ? path.dirname(filesList[0].file) : 'root';
            
            let title = `Refactor: ${primaryDir} updates`;
            if (isHighRisk) {
                title = `Critical Isolation: ${primaryDir} logic`;
            } else if (filesList.length === 1) {
                title = `Update: ${getBaseName(filesList[0].file)} features`;
            }

            return {
                prNumber: index + 1,
                title: title,
                files: filesList.map(f => f.file),
                riskScore: Math.round(avgRiskScore),
                estimatedReviewTime: reviewTimeMinutes
            };
        });

        return { status: 'success', suggestedPRs };

    } catch(err) {
        return { status: 'skipped', message: "⚠️  [Split Engine] — Error resolving code dependencies. Split preview aborted." };
    }
}

module.exports = { splitPR };
