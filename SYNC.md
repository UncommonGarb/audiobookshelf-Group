# Upstream & Submodule Synchronization Guide

This guide explains how to pull updates from the official Audiobookshelf server and mobile repositories and sync our updates back into the `progress` branch cleanly.

---

## Remote Setup

The repository is configured with two upstream remotes:

- `upstream-server`: `https://github.com/advplyr/audiobookshelf.git` (Main Server & Web Client)
- `upstream-app`: `https://github.com/advplyr/audiobookshelf-app.git` (Mobile Submodule under `mobile/`)

Verify configured remotes using:
```bash
git remote -v
```

---

## 1. Pulling Upstream Server Updates

To incorporate the latest features and bug fixes from the core `advplyr/audiobookshelf` repository into our `progress` branch:

```bash
# 1. Fetch all branches and tags from official server repo
git fetch upstream-server

# 2. Ensure you are on the progress branch
git checkout progress

# 3. Merge or rebase upstream master into progress
git merge upstream-server/master --no-edit

# 4. If conflict occurs in client or server files, resolve and commit:
# git add <resolved-files>
# git commit -m "Merge upstream-server/master updates"
```

---

## 2. Pulling Upstream Mobile App Updates (`mobile/`)

The mobile app is tracked as a Git Submodule inside `mobile/`. To update the mobile codebase:

```bash
# 1. Navigate to the mobile directory
cd mobile

# 2. Fetch updates from upstream mobile app
git fetch origin

# 3. Merge upstream master into local mobile checkout
git checkout master
git pull origin master

# 4. Return to root repository and record updated submodule commit
cd ..
git add mobile
git commit -m "Sync mobile submodule with latest upstream advplyr/audiobookshelf-app"
```

---

## 3. Pushing Changes & Syncing Back

All development work, mockups, documentation, and feature additions live on the `progress` branch:

```bash
# Push progress branch to origin
git push origin progress
```

When contributing mobile app changes upstream:
1. Make commits inside `mobile/` directory on a feature branch.
2. Push mobile feature branch to your fork of `audiobookshelf-app`.
3. Submit Pull Request to `advplyr/audiobookshelf-app`.
