---
name: git-helper
description: Provides Git workflow guidance for branching, committing, merging, and creating pull requests. Use when creating commits, making PRs, managing branches, resolving conflicts, or asking about Git workflow.
allowed-tools: Bash(git:*)
---

# Git Workflow Assistant

## Reference Documentation

Complete Git workflow guide: @~CLAUDE.md (lines 177-301)

## Branch Strategy

### Main Branches

**main** - Production-ready code, always stable and deployable

### Working Branches

Create feature branches for all work:

```bash
# Feature development
git checkout -b feature/tower-merge-system

# Bug fixes
git checkout -b fix/projectile-null-crash

# Refactoring
git checkout -b refactor/tower-manager

# Documentation
git checkout -b docs/update-readme
```

**Naming Convention:**
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates

---

## Commit Message Convention

Follow **Conventional Commits** format:

```
<type>(<scope>): <short summary>

<detailed explanation (optional)>

<footer - issue references (optional)>
```

### Types

- **feat:** New feature
- **fix:** Bug fix
- **refactor:** Code change that neither fixes bug nor adds feature
- **docs:** Documentation only
- **style:** Code style changes (formatting, semicolons, etc.)
- **perf:** Performance improvements
- **test:** Adding or updating tests
- **chore:** Maintenance tasks

### Examples

```bash
# Simple feature
git commit -m "feat(towers): add Executioner with armor pierce mechanic"

# Bug fix
git commit -m "fix(enemy): correct blood particle color from green to red"

# Refactoring
git commit -m "refactor(buffer): simplify network buff to 2-tile radius"

# Documentation
git commit -m "docs: update CLAUDE.md with git workflow instructions"

# Performance
git commit -m "perf(render): add off-screen culling for particles"

# With body and footer
git commit -m "$(cat <<'EOF'
fix(projectile): add null safety check for target in update()

Prevents crash when projectile targets are removed mid-flight.
Adds check for both null and active state before accessing target.

Fixes #23
EOF
)"
```

---

## Common Workflows

### Starting New Work

```bash
# 1. Ensure you're on main and up to date
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/new-tower-type

# 3. Make changes and commit
git add src/Tower.js
git commit -m "feat(towers): add Ice Tower with slow effect"

# 4. Continue development
git add src/Projectile.js
git commit -m "feat(towers): add frost projectile for Ice Tower"
```

### Committing Changes

**Current Workflow (Used in this project):**

```bash
# 1. Check what changed
git status
git diff

# 2. Stage specific files
git add src/Tower.js src/managers/TowerManager.js

# 3. Commit with message
git commit -m "feat(towers): implement tower merge system with Reuleaux shapes

- Added merge rank system
- Implemented drag-and-drop merging
- Added visual merge indicators

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 4. Push to GitHub
git push origin feature/tower-merge
```

**Using heredoc for multi-line messages:**

```bash
git commit -m "$(cat <<'EOF'
feat: implement complete tower defense game

Comprehensive implementation including:
- 13 enemy types with 8-directional animations
- 6 specialized tower classes
- Manager architecture pattern
- Performance optimizations

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

### Merging Back to Main

```bash
# 1. Ensure feature branch is up to date
git checkout feature/my-feature
git pull origin main  # Get latest from main

# 2. Resolve any conflicts if needed

# 3. Switch to main and merge
git checkout main
git merge feature/my-feature

# 4. Push to remote
git push origin main

# 5. Delete feature branch (cleanup)
git branch -d feature/my-feature
```

### Creating Pull Requests

**Using GitHub CLI (gh):**

```bash
# 1. Ensure branch is pushed
git push -u origin feature/my-feature

# 2. Create PR with description
gh pr create --title "Add tower merging system" --body "$(cat <<'EOF'
## Summary
- Implemented drag-and-drop tower merging
- Added Reuleaux polygon shapes for merge ranks
- Integrated with TowerManager

## Test Plan
- [ ] Drag tower onto another tower
- [ ] Verify merge succeeds if same type
- [ ] Verify visual rank indicator updates
- [ ] Test with all 6 tower types

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

# 3. View PR in browser
gh pr view --web
```

**Manual Process (without gh CLI):**

```bash
# 1. Push branch
git push -u origin feature/my-feature

# 2. Go to GitHub repository in browser
# 3. Click "Compare & pull request" banner
# 4. Fill in title and description
# 5. Click "Create pull request"
```

---

## Resolving Conflicts

```bash
# If merge has conflicts
git merge feature/my-feature
# CONFLICT in src/Tower.js

# 1. Open conflicted files
# Look for <<<<<<< HEAD markers

# Example conflict:
<<<<<<< HEAD
this.damage = 25;
=======
this.damage = 30;
>>>>>>> feature/my-feature

# 2. Edit file to resolve
this.damage = 30;  # Choose one or merge both

# 3. Stage resolved files
git add src/Tower.js

# 4. Complete merge
git commit -m "merge: integrate feature/my-feature

Resolved conflicts in Tower.js damage calculation"
```

---

## Checking Status

```bash
# View current branch and uncommitted changes
git status

# View commit history
git log --oneline --graph --all

# View what changed (not staged)
git diff

# View what's staged for commit
git diff --staged

# View branches
git branch -a

# View remote status
git remote -v
```

---

## Undoing Changes

**Discard local changes (CAREFUL!):**
```bash
git checkout -- src/Tower.js
```

**Unstage file (keep changes):**
```bash
git reset HEAD src/Tower.js
```

**Undo last commit (keep changes):**
```bash
git reset --soft HEAD~1
```

**Undo last commit (discard changes - DANGEROUS!):**
```bash
git reset --hard HEAD~1
```

**Revert a commit (creates new commit):**
```bash
git revert abc123
```

---

## Merge Strategies

### Fast-Forward (Simple)

**When:** No conflicts, linear history
```bash
git merge --ff-only feature/simple-feature
```

**Result:** Moves main pointer forward

### Merge Commit (Default)

**When:** Preserve feature branch history
```bash
git merge --no-ff feature/complex-feature
```

**Result:** Creates merge commit showing branch integration

### Squash Merge (Clean History)

**When:** Want single commit for entire feature
```bash
git merge --squash feature/experimental
git commit -m "feat: add experimental tower merging

- Implemented drag-and-drop
- Added Reuleaux shapes
- Integrated with TowerManager"
```

**Result:** All feature commits compressed into one

---

## Best Practices

### 1. Commit Early, Commit Often
- Small, atomic commits are easier to review and revert
- Each commit should represent one logical change

### 2. Write Descriptive Messages
- Future you will thank present you
- Others can understand your changes
- Use conventional commit format

### 3. Test Before Committing
```bash
# Verify game runs without errors
npx http-server -p 8000 -c-1
# Open http://127.0.0.1:8000 and test

# Then commit
git commit -m "feat: add new feature"
```

### 4. Pull Before Push
```bash
# Always get latest changes first
git pull origin main
git push origin main
```

### 5. One Feature Per Branch
- Keep branches focused and short-lived
- Easier to review and merge
- Reduces conflict risk

### 6. Delete Merged Branches
```bash
# After merging to main
git branch -d feature/my-feature

# Delete remote branch
git push origin --delete feature/my-feature
```

### 7. Never Commit Secrets
- Add sensitive files to .gitignore
- API keys, credentials, .env files
- Check before committing: `git diff --staged`

---

## Common Scenarios

### Quick Fix During Feature Work

```bash
# Working on feature, need to fix urgent bug
git stash  # Save work in progress

git checkout main
git checkout -b fix/urgent-bug
# ... make fix ...
git commit -m "fix: urgent bug"
git checkout main
git merge fix/urgent-bug
git push origin main

git checkout feature/my-feature
git stash pop  # Restore work in progress
```

### Updating Feature Branch with Main

```bash
# Keep feature branch up to date
git checkout feature/my-feature
git merge main  # Or: git rebase main (rewrites history)
```

### Creating Release Tag

```bash
git tag -a v1.0.0 -m "Release version 1.0.0 - Merge Defence with tower merging"
git push origin v1.0.0
```

---

## GitHub CLI (gh) Commands

**View PR comments:**
```bash
gh pr view 123
gh api repos/owner/repo/pulls/123/comments
```

**Merge PR:**
```bash
gh pr merge 123 --squash
```

**List open PRs:**
```bash
gh pr list
```

**Check CI status:**
```bash
gh pr checks
```

---

## Troubleshooting

### "fatal: refusing to merge unrelated histories"

```bash
# Allow merge of unrelated histories
git merge --allow-unrelated-histories origin/main
```

### "Your branch is ahead of 'origin/main' by N commits"

```bash
# Push your commits
git push origin main
```

### "Your branch and 'origin/main' have diverged"

```bash
# Pull with rebase to linearize
git pull --rebase origin main

# Or pull with merge
git pull origin main
```

### Accidentally committed to wrong branch

```bash
# Move commit to correct branch
git checkout correct-branch
git cherry-pick abc123  # Commit hash from wrong branch

git checkout wrong-branch
git reset --hard HEAD~1  # Remove commit from wrong branch
```

---

## Git Configuration

**Set up user info:**
```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

**Useful aliases:**
```bash
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.cm commit
git config --global alias.lg "log --oneline --graph --all"
```

**Set default editor:**
```bash
git config --global core.editor "code --wait"  # VS Code
```

---

## Project-Specific Workflow

**This project uses:**

1. **Main branch only** - No develop branch (simple workflow)
2. **Feature branches** - Created for all new work
3. **Conventional commits** - Structured commit messages
4. **Co-authorship** - Claude Code attribution in commits
5. **GitHub MCP integration** - Can create PRs via claude CLI

**Example session:**

```bash
# Start work
git checkout -b feature/ice-tower
git add src/Tower.js
git commit -m "feat(towers): add Ice Tower with slow effect"

# Complete work
git checkout main
git merge feature/ice-tower
git push origin main
git branch -d feature/ice-tower
```

---

## Key Files

- **CLAUDE.md:177-301** - Complete Git workflow documentation
- **.gitignore** - Files excluded from Git
- **README.md** - Project overview (if exists)

## Output Format

When helping with Git:

1. **Understand Context** - What are they trying to do?
2. **Provide Commands** - Exact bash commands to run
3. **Explain Why** - What each command does
4. **Warn About Risks** - If command is destructive
5. **Reference Docs** - Point to CLAUDE.md for details

Always check current Git status before suggesting commands!
