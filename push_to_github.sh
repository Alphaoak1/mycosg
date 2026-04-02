#!/bin/bash
# ═══════════════════════════════════════════════════════════
# MycoSG — Push to GitHub
# Run this once on your local machine or any machine with internet
# Usage: bash push_to_github.sh
# ═══════════════════════════════════════════════════════════

set -e

REPO="https://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@github.com/Alphaoak1/mycosg.git"
BRANCH="main"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MycoSG → GitHub Push"
echo "  Repo: github.com/Alphaoak1/mycosg"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check git installed
if ! command -v git &> /dev/null; then
  echo "✗ git not found. Install from https://git-scm.com"
  exit 1
fi

# Check files exist
for f in index.html mycosg_supabase_setup.sql mycosg_edge_function.ts README.md; do
  if [ ! -f "$f" ]; then
    echo "✗ Missing: $f — run this script from the folder containing all 4 files"
    exit 1
  fi
done

echo "✓ All files present"

# Init repo if not already
if [ ! -d ".git" ]; then
  git init
  git branch -M main
  echo "✓ Git repo initialised"
else
  echo "✓ Git repo already exists"
fi

# Configure git identity
git config user.email "mycosg@deploy.sh"
git config user.name "MycoSG Deploy"

# Create .gitignore if missing
if [ ! -f ".gitignore" ]; then
cat > .gitignore << 'EOF'
.DS_Store
*.log
node_modules/
.env
EOF
fi

# Set remote
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO"

# Stage and commit
git add -A

# Only commit if there are changes
if git diff --cached --quiet; then
  echo "✓ No changes to commit — files already up to date"
else
  git commit -m "🍄 MycoSG v1.0 — full website launch

- index.html: complete single-file website (131KB)
- 7 Supabase backend forms wired to htxlvfzbjiozjzumywev.supabase.co
- 19 modals, ROI calculator, SFA compliance copy
- mycosg_supabase_setup.sql: 7 tables + RLS + admin view
- mycosg_edge_function.ts: branded email notifications
- Passes 177/178 audit checks"
  echo "✓ Committed"
fi

# Push
echo ""
echo "Pushing to github.com/Alphaoak1/mycosg..."
git push -u origin "$BRANCH" --force

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  DONE"
echo "  https://github.com/Alphaoak1/mycosg"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Enable GitHub Pages:"
echo "  Settings → Pages → Branch: main → / (root) → Save"
echo "  Site will be live at: https://alphaoak1.github.io/mycosg/"
