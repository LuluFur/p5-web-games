# Contributing to Merge Defence

Thank you for your interest in contributing! This guide covers Git workflows, coding standards, and contribution processes.

## Git Workflow

### Branch Strategy

**Main Branch:**
- `main` - Production-ready code, always stable and deployable

**Working Branches:**
- `feature/feature-name` - New features (merge system, tower unlocking, etc.)
- `fix/bug-description` - Bug fixes
- `refactor/component-name` - Code refactoring without behavior changes
- `docs/update-description` - Documentation updates

### Feature Development Workflow

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/tower-merge-system

# 2. Make changes and commit frequently
git add src/Tower.js src/managers/TowerManager.js
git commit -m "feat: implement merge rank system with Reuleaux shapes"

# 3. Continue development with atomic commits
git add src/managers/InputManager.js sketch.js
git commit -m "feat: add drag-and-drop merging input handling"

git add src/renderers/SpriteRenderer.js
git commit -m "feat: add visual merge indicators and drag transparency"

# 4. When feature is complete, merge back to main
git checkout main
git pull origin main  # Get latest changes
git merge feature/tower-merge-system
git push origin main

# 5. Delete feature branch (cleanup)
git branch -d feature/tower-merge-system
```

### Bug Fix Workflow

```bash
# 1. Create fix branch
git checkout main
git checkout -b fix/projectile-null-crash

# 2. Fix the bug with descriptive commit
git add src/Projectile.js
git commit -m "fix: add null safety check for target in Projectile.update()

Prevents crash when projectile targets are removed mid-flight.
Adds check for both null and active state before accessing target.

Fixes #23"

# 3. Merge back to main
git checkout main
git merge fix/projectile-null-crash
git push origin main
git branch -d fix/projectile-null-crash
```

### Commit Message Convention

Follow **Conventional Commits** format:

```
<type>(<scope>): <short summary>

<body - detailed explanation (optional)>

<footer - references to issues (optional)>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `docs:` Documentation only changes
- `style:` Code style changes (formatting, missing semicolons, etc.)
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Maintenance tasks (dependencies, build config, etc.)

**Examples:**
```bash
git commit -m "feat(towers): add Executioner with armor pierce mechanic"
git commit -m "fix(enemy): correct blood particle color from green to red"
git commit -m "refactor(buffer): simplify network buff to 2-tile radius"
git commit -m "docs: update CLAUDE.md with git workflow instructions"
git commit -m "perf(render): add off-screen culling for particles"
```

### Merging Strategies

**Fast-Forward Merge (Preferred for simple features):**
```bash
git checkout main
git merge --ff-only feature/simple-feature  # Only if no conflicts
```

**Merge Commit (For complex features):**
```bash
git checkout main
git merge --no-ff feature/complex-feature
# Creates merge commit even if fast-forward is possible
# Preserves feature branch history
```

**Squash Merge (Clean history for experimental work):**
```bash
git checkout main
git merge --squash feature/experimental
git commit -m "feat: add experimental tower merging system

- Implemented drag-and-drop
- Added Reuleaux polygon shapes
- Integrated with TowerManager"
```

### Handling Conflicts

```bash
# If merge has conflicts
git merge feature/my-feature
# CONFLICT in src/Tower.js

# 1. Open conflicted files and resolve manually
# Look for <<<<<<< HEAD markers

# 2. Stage resolved files
git add src/Tower.js

# 3. Complete merge
git commit -m "merge: integrate feature/my-feature

Resolved conflicts in Tower.js merge rank system"
```

### Checking Status

```bash
# View current branch and uncommitted changes
git status

# View commit history
git log --oneline --graph --all

# View changes not yet staged
git diff

# View changes staged for commit
git diff --staged

# View branches
git branch -a
```

### Undoing Changes

```bash
# Discard local changes (CAREFUL!)
git checkout -- src/Tower.js

# Unstage file (keep changes)
git reset HEAD src/Tower.js

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes - DANGEROUS!)
git reset --hard HEAD~1

# Revert a commit (creates new commit)
git revert abc123
```

### Best Practices

1. **Commit Early, Commit Often** - Small, atomic commits are easier to review and revert
2. **Write Descriptive Messages** - Future you will thank present you
3. **Test Before Committing** - Ensure code runs without errors
4. **Pull Before Push** - Always get latest changes before pushing
5. **One Feature Per Branch** - Keep branches focused and short-lived
6. **Delete Merged Branches** - Keep repository clean
7. **Never Commit Secrets** - Use .gitignore for API keys, credentials
8. **Review Diffs** - Use `git diff` before committing to catch mistakes

### Common Workflows

**Quick Fix During Development:**
```bash
# Working on feature, need to quickly fix bug
git stash                      # Save work in progress
git checkout -b fix/urgent-bug
# ... make fix ...
git commit -m "fix: urgent bug"
git checkout main
git merge fix/urgent-bug
git checkout feature/my-feature
git stash pop                  # Restore work in progress
```

**Updating Feature Branch with Main:**
```bash
# Keep feature branch up to date with main
git checkout feature/my-feature
git merge main  # Or: git rebase main (rewrites history)
```

**Creating Release Tag:**
```bash
git tag -a v1.0.0 -m "Release version 1.0.0 - Merge Defence with tower merging"
git push origin v1.0.0
```

## Coding Standards

### File Loading Order

**CRITICAL:** Scripts must load in this exact order (see index.html:14-62):
1. GameConstants.js - Required by all other files
2. Utilities (GameMath.js, etc.)
3. Core classes (Grid, Pathfinder, Tower, Enemy, Particle, Projectile)
4. Managers (depend on core classes)
5. Renderers (depend on managers)
6. Game.js (depends on everything)
7. sketch.js (p5.js entry point, creates Game instance)

**Why:** No module system (ES6 imports), scripts execute top-to-bottom. Dependencies must exist before use.

### Architecture Patterns

See `.claude/docs/architectural_patterns.md` for detailed explanations of:
- Manager Pattern
- Singleton Pattern
- Object Pooling
- Factory Pattern
- State Machine Pattern
- Event-Driven Updates

### Code Style

- Use descriptive variable names
- Keep functions focused (single responsibility)
- Comment non-obvious logic
- Avoid p5.js global name conflicts (text, color, image, etc.)
- Use constants from GameConstants.js (no magic numbers)

## Testing

### Manual Test Procedures

1. **Tower Placement:**
   - Build towers, verify cost deduction
   - Test insufficient gold rejection
   - Test path-blocking validation

2. **Wave Spawning:**
   - Start wave, verify enemies spawn correctly
   - Check pathfinding to base
   - Verify wave completion rewards

3. **Combat:**
   - Towers target and damage enemies
   - Projectiles hit targets
   - Particles spawn on hits/deaths

4. **Performance:**
   - FPS stays above 50 on wave 15+
   - Particle count caps at 500
   - No memory leaks during long sessions

### Performance Profiling

```javascript
// In browser console (F12):
// 1. Check debug overlay (top-left) for FPS and entity counts
// 2. Chrome DevTools → Performance → Record during wave 15+
// 3. Look for:
//    - Frame drops (target: 60 FPS, acceptable: 50+ FPS)
//    - Long GC pauses (should be <10ms with object pooling)
//    - Draw call count (should drop with off-screen culling)
```

## Questions?

- Check [CLAUDE.md](CLAUDE.md) for project overview and quick reference
- See [ERROR_GUIDE.md](ERROR_GUIDE.md) for common errors and solutions
- Review `.claude/docs/architectural_patterns.md` for design patterns
- Use `/git-helper` skill for Git workflow assistance
