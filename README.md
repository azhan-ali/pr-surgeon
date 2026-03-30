# 🔬 PR-Surgeon — Code Review X-Ray

One line: "Diagnoses why your PRs are too big — and surgically fixes it."

## Install
git clone https://github.com/azhan-ali/pr-surgeon
cd pr-surgeon
./setup.sh        # Mac/Linux
setup.bat         # Windows

## Usage
cd your-project
pr-surgeon scan

## What It Does
- 🗺️ Risk Heatmap — scores every changed file 0-100
- 🏛️ God File Detection — finds architectural pressure points
- ✂️ Smart Split — dependency-aware PR splitting
- 🔮 Merge Predictor — shows exact time saved
- 👥 Reviewer Suggester — matches experts to risky files

## Why PR-Surgeon
"Your PRs aren't too big. Your architecture is in pain."
Most tools tell you a PR is large. PR-Surgeon tells you WHY
and proves the fix with real merge time data.

## License
MIT
