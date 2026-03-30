const chalk = require('chalk');

function drawBar(score) {
    // 15 blocks length for a wider, more premium bar
    const totalBlocks = 15;
    const filledBlocks = Math.round((score / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
}

function getColor(level) {
    switch(level) {
        case 'LOW': return chalk.hex('#10B981'); // Emerald Green
        case 'MED': return chalk.hex('#F59E0B'); // Amber/Orange
        case 'HIGH': return chalk.hex('#EF4444'); // Red
        case 'CRITICAL': return chalk.hex('#8B5CF6'); // Purple/Magenta
        default: return chalk.white;
    }
}

function getIcon(level) {
    switch(level) {
        case 'LOW': return '✅';
        case 'MED': return '⚠️ ';
        case 'HIGH': return '🔥';
        case 'CRITICAL': return '💀';
        default: return '📄';
    }
}

function renderUI(data) {
    try {
        console.log('');
        
        // ----------------- HEADER -----------------
        const brandColor = chalk.hex('#0EA5E9'); // Sky Blue
        const accent = chalk.hex('#38BDF8');
        
        console.log(brandColor('╭────────────────────────────────────────────────────────────╮'));
        console.log(brandColor('│') + ' ' + chalk.bold.white(' 🔬 PR-SURGEON ') + accent('⚡ Code Review X-Ray') + ' '.repeat(20) + brandColor('│'));
        console.log(brandColor('│') + chalk.gray('   "Operate on your code with precision."') + ' '.repeat(16) + brandColor('│'));
        console.log(brandColor('╰────────────────────────────────────────────────────────────╯'));
        console.log('');
        
        // ----------------- SUMMARY -----------------
        const changesStr = chalk.bold(data.filesChanged.toString());
        const addedStr = chalk.bold.hex('#10B981')('+' + data.linesAdded);
        const removedStr = chalk.bold.hex('#EF4444')('-' + data.linesRemoved);
        
        console.log(chalk.bold(' 📊 OVERVIEW'));
        console.log(chalk.gray(' ─────────────────────────────────────'));
        console.log(`  📂 Files Changed : ${changesStr}`);
        console.log(`  📈 Lines Added   : ${addedStr}`);
        console.log(`  📉 Lines Removed : ${removedStr}`);
        console.log('');        // ----------------- RECENT COMMITS -----------------
        if (data.commits && data.commits.length > 0) {
            console.log(chalk.bold(' 📝 RECENT COMMITS'));
            console.log(chalk.gray(' ─────────────────────────────────────'));
            
            const displayCommits = data.commits.slice(0, 5); 
            for (const commit of displayCommits) {
                const parts = commit.split(' ');
                if(parts.length >= 2) {
                    const hash = parts.shift();
                    const msg = parts.join(' ');
                    console.log(`  ${chalk.hex('#0EA5E9')(hash)} ${chalk.white(msg)}`);
                } else {
                    console.log(`  ${chalk.white(commit)}`);
                }
            }
            
            if (data.commits.length > 5) {
                console.log(`  ${chalk.gray.italic(`...and ${data.commits.length - 5} more commits evaluated.`)}`);
            }
            console.log('');
        }

        // ----------------- HEATMAP -----------------
        if (data.risks && data.risks.length > 0) {
            console.log(chalk.bold(' 🎯 RISK HEATMAP'));
            console.log(chalk.gray(' ────────────────────────────────────────────────────────────'));
            
            let maxFileLen = 20; // Establish a minimum width to keep alignment clean
            for (const r of data.risks) {
                if (r.file.length > maxFileLen) {
                    maxFileLen = r.file.length;
                }
            }
            
            // Format column headers
            const headerFile = 'FILE'.padEnd(maxFileLen);
            const headerBar = 'RISK METER'.padEnd(15);
            const headerScore = 'SCORE'.padEnd(5);
            // Additional styling for level cell
            
            console.log('  ' + 
                chalk.gray.bold(headerFile) + '   ' + 
                chalk.gray.bold(headerBar) + '   ' + 
                chalk.gray.bold(headerScore) + '   ' + 
                chalk.gray.bold('LEVEL')
            );
            console.log('  ' + chalk.gray('-'.repeat(maxFileLen + 15 + 5 + 13)));
            
            // Sort risks dynamically from highest score to lowest securely
            const sortedRisks = [...data.risks].sort((a, b) => b.riskScore - a.riskScore);

            for (const r of sortedRisks) {
                const colorFn = getColor(r.riskLevel);
                const icon = getIcon(r.riskLevel);
                const barStr = drawBar(r.riskScore);
                
                // Colorize to match the threat level contextually
                const coloredBarStr = colorFn(barStr);
                
                // Pad variables elegantly
                const fileStr = chalk.white(r.file.padEnd(maxFileLen));
                const scoreStr = colorFn(r.riskScore.toString().padEnd(5));
                
                // For level, factor in the icon size so it balances layout 
                const levelDisplay = `${icon} ${r.riskLevel}`;
                // Emoji padding calculations can be tricky, so we rely on explicit tabs/spacing
                const levelStr = colorFn(levelDisplay);
                
                console.log(`  ${fileStr}   ${coloredBarStr}   ${scoreStr}   ${levelStr}`);
                
                if (data.analyzerDetails && data.analyzerDetails.reviewers && data.analyzerDetails.reviewers[r.file]) {
                    console.log(`      ↳ ${chalk.cyan(data.analyzerDetails.reviewers[r.file])}`);
                }
            }
            console.log('  ' + chalk.gray('────────────────────────────────────────────────────────────'));
            
            // Value-added insights context ("Surgeon's Advice" - very sleek)
            const highRiskFiles = data.risks.filter(r => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH');
            if(highRiskFiles.length > 0) {
                console.log('');
                console.log(chalk.hex('#F43F5E').bold(' 💡 SURGEON\'S ADVICE:'));
                console.log(chalk.gray(`  Focus your immediate review on the ${chalk.white.bold(highRiskFiles.length)} high-risk file(s).`));
            } else {
                console.log('');
                console.log(chalk.hex('#10B981').bold(' 💡 SURGEON\'S ADVICE:'));
                console.log(chalk.gray('  Looking healthy! No high-risk code changes detected.'));
            }

        } else {
            console.log(chalk.gray('  No files to analyze for risks.'));
        }
        console.log('');

        // ----------------- ARCHITECTURE DIAGNOSIS -----------------
        if (data.analyzerDetails) {
            console.log(chalk.bold(' 🏛️  ARCHITECTURE DIAGNOSIS'));
            console.log(chalk.gray(' ────────────────────────────────────────────────────────────'));
            
            if (data.analyzerDetails.message) {
                console.log(`  ${chalk.gray.italic(data.analyzerDetails.message)}`);
            } else if (data.analyzerDetails.godFiles && data.analyzerDetails.godFiles.length > 0) {
                for (const g of data.analyzerDetails.godFiles) {
                    console.log(`  🚨 ${chalk.bold.red(g.file)} ${chalk.red(`(${g.touchFrequency} Churn)`)}`);
                    console.log(`     ${chalk.yellow('Diagnosis:')} ${chalk.white(g.diagnosis)}`);
                    console.log(`     ${chalk.cyan('Treatment:')} ${chalk.gray(g.suggestion)}`);
                    console.log('');
                }
            } else {
                console.log(`  ${chalk.green('✅ Stable architecture. No God Files detected in this PR.')}`);
            }
            console.log('');
        }

        // ----------------- SPLIT STRATEGY -----------------
        if (data.splitStrategy) {
            console.log(chalk.bold(' ✂️  PR SPLIT STRATEGY'));
            console.log(chalk.gray(' ────────────────────────────────────────────────────────────'));
            
            if (data.splitStrategy.status === 'skipped') {
                const msg = data.splitStrategy.message || "PR size looks good 👍";
                const colorFn = msg.includes('⚠️') ? chalk.yellow : chalk.green;
                console.log(`  ${colorFn(msg)}`);
            } else if (data.splitStrategy.suggestedPRs && data.splitStrategy.suggestedPRs.length > 0) {
                if (data.splitStrategy.suggestedPRs.length === 1) {
                    console.log(`  ${chalk.green("PR size is optimally chunked as 1 discrete unit 👍")}`);
                } else {
                    console.log(`  ${chalk.yellow(`Recommended dividing into ${chalk.bold(data.splitStrategy.suggestedPRs.length)} targeted PRs:`)}`);
                    console.log('');
                    
                    for (const pr of data.splitStrategy.suggestedPRs) {
                        let riskColor = chalk.green;
                        if (pr.riskScore >= 75) riskColor = chalk.magenta;
                        else if (pr.riskScore >= 50) riskColor = chalk.red;
                        else if (pr.riskScore >= 25) riskColor = chalk.yellow;
                        
                        console.log(`  📦 ${chalk.bold.white(`PR #${pr.prNumber}: ${pr.title}`)}`);
                        console.log(`     ${chalk.gray('Files:')} ${chalk.cyan(pr.files.join(', '))}`);
                        console.log(`     ${chalk.gray('Avg Risk:')} ${riskColor(pr.riskScore)}  |  ${chalk.gray('ETA:')} ${chalk.bold(pr.estimatedReviewTime)} min`);
                        console.log('');
                    }
                }
            }
            console.log('');
        }

        // ----------------- PREDICTOR -----------------
        if (data.predictorDetails) {
            console.log(chalk.bold(' 🔮 MERGE TIME PREDICTOR'));
            console.log(chalk.gray(' ────────────────────────────────────────────────────────────'));
            
            if (data.predictorDetails.status === 'insufficient') {
                console.log(`  ${chalk.gray.italic(data.predictorDetails.message || "Not enough history for prediction")}`);
            } else if (data.predictorDetails.status === 'success') {
                const cur = chalk.red(`~${data.predictorDetails.currentDays} days`);
                const aft = chalk.green(`~${data.predictorDetails.afterSplitDays} days`);
                const save = chalk.bold.cyan(`${data.predictorDetails.savedPercent}%`);
                console.log(`  ${chalk.white('Current PR:')} ${cur}  |  ${chalk.white('After split:')} ${aft}  |  ${chalk.white('You save:')} ${save}`);
            }
            console.log('');
        }
    } catch (err) {
        console.log("⚠️  [Terminal UI] — Failed to render statistics safely. Display aborted.");
    }
}

module.exports = { renderUI };
