#!/usr/bin/env node

const { execSync } = require('child_process');
const calculateRisk = require('./risk-scorer');

function runCommand(command) {
    try {
        return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (error) {
        return null;
    }
}

function checkGitInstalled() {
    const output = runCommand('git --version');
    if (!output) {
        console.log("Git not detected. Please install git.");
        process.exit(0);
    }
}

function checkGitRepo() {
    const output = runCommand('git rev-parse --is-inside-work-tree');
    if (!output || output.trim() !== 'true') {
        console.log("Not a git repository. Please run inside a git repository.");
        process.exit(0);
    }
}

function getCommitData() {
    try {
        const logOutput = runCommand('git log --oneline -30');
        if (!logOutput) return [];
        
        return logOutput.trim().split('\n').filter(line => line.length > 0);
    } catch(err) {
        console.log("⚠️  [Commit Data] unavailable — skipping");
        return [];
    }
}

function getDiffData() {
    const diffStat = runCommand('git diff HEAD~1 --numstat');
    if (!diffStat) return { filesChanged: 0, linesAdded: 0, linesRemoved: 0, files: [] };

    const lines = diffStat.trim().split('\n').filter(line => line.length > 0);
    let filesChanged = 0;
    let linesAdded = 0;
    let linesRemoved = 0;
    const files = [];

    for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
            filesChanged++;
            const added = parseInt(parts[0], 10);
            const removed = parseInt(parts[1], 10);
            const file = parts.slice(2).join('\t');
            
            let parsedAdded = 0;
            let parsedRemoved = 0;

            if (!isNaN(added)) {
                linesAdded += added;
                parsedAdded = added;
            }
            if (!isNaN(removed)) {
                linesRemoved += removed;
                parsedRemoved = removed;
            }
            
            files.push({
                file,
                added: parsedAdded,
                removed: parsedRemoved
            });
        }
    }
    
    return { filesChanged, linesAdded, linesRemoved, files };
}

function scan() {
    try {
        checkGitInstalled();
        checkGitRepo();

        // Check if HEAD~1 exists (i.e. at least 2 commits exist)
        const hasHead1 = runCommand('git rev-parse HEAD~1');
        
        let diffData = { filesChanged: 0, linesAdded: 0, linesRemoved: 0, files: [] };
        if (hasHead1) {
            try {
                diffData = getDiffData();
            } catch(e) { console.log("⚠️  [Git Diff] unavailable — skipping"); }
        }
        
        let commits = [];
        try {
            commits = getCommitData();
        } catch(e) { console.log("⚠️  [Commit Data] unavailable — skipping"); }
        
        let risks = [];
        try {
            risks = calculateRisk(diffData.files);
        } catch(e) { console.log("⚠️  [Risk Scorer] unavailable — skipping"); }

        const result = {
            filesChanged: diffData.filesChanged,
            linesAdded: diffData.linesAdded,
            linesRemoved: diffData.linesRemoved,
            commits: commits,
            risks: risks
        };

        try {
            const { renderUI } = require('./terminal-ui');
            renderUI(result);
        } catch(e) {
            console.log("⚠️  [Terminal UI] unavailable — skipping");
        }
    } catch (err) {
        console.log("⚠️  [Scanner] unavailable — skipping");
    }
}

// Ensure no raw stack traces ever bubble up to the user natively
process.on('uncaughtException', (err) => {
    console.log("⚠️  [System] unavailable — skipping");
    process.exit(0);
});
process.on('unhandledRejection', (reason, promise) => {
    console.log("⚠️  [System] unavailable — skipping");
    process.exit(0);
});

const args = process.argv.slice(2);
if (args[0] === 'scan') {
    scan();
} else {
    console.log("Usage: pr-surgeon scan");
    process.exit(0);
}

