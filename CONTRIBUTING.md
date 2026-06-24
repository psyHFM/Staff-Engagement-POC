# Contributing to Staff Engagement POC

Thanks for working on this project! This document describes the Git workflow we follow so collaboration stays predictable and `main` stays releasable.

## TL;DR

```
pull main → branch → commit → push → PR → review → squash-merge → cleanup
```

## Workflow overview

We use a **Feature-Branch workflow**:

- `main` is always deployable. Never commit directly to it.
- All work happens on short-lived branches off `main`.
- Changes land via Pull Request with at least one approval and passing CI.
- PRs are **squash-merged** to keep `main` history clean.

```
main ──────────●────────●
                \      /
feature/x       ●──●──●
```

## Branch naming

| Prefix       | Use for                                   | Example                  |
|--------------|-------------------------------------------|--------------------------|
| `feature/`   | New functionality                          | `feature/login-page`     |
| `bugfix/`    | Non-urgent bug fixes                       | `bugfix/form-validation` |
| `hotfix/`    | Urgent production fixes (branch from `main`) | `hotfix/crash-on-empty` |
| `chore/`     | Tooling, deps, refactors, no behavior change | `chore/update-deps`    |
| `docs/`      | Documentation only                         | `docs/api-reference`     |

Keep names short, kebab-case, and descriptive.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `style`, `ci`.

Examples:
```
feat: add staff engagement survey form
fix: prevent double-submit on survey page
chore: bump dependencies
docs: add API reference
```

> Note: because we squash-merge, your individual commit messages on a feature branch
> don't have to be perfect — the squash-merge title is what lands on `main`. Still,
> try to keep them readable for review.

## Pull Requests

Every change goes through a PR.

1. Push your branch: `git push -u origin <branch-name>`
2. Open a PR against `main` on GitHub.
3. Fill in the PR template (auto-loads from `.github/pull_request_template.md`).
4. Request at least **one reviewer**.
5. CI must pass before merging.

### Merge strategy

- **Squash and merge** by default — collapses your branch into one commit on `main`.
- Use **Create a merge commit** only when you specifically need to preserve the branch history (rare).
- Avoid **Rebase and merge** unless the team agrees on it.

### After merging

```powershell
git checkout main
git pull origin main
git branch -d <branch-name>      # delete local branch
# delete remote branch via GitHub's "Delete branch" button
```

## Hotfixes

For urgent production issues:

```powershell
git checkout main
git pull origin main
git checkout -b hotfix/<short-description>
# fix, commit, push, open PR, review, squash-merge
```

Hotfixes branch from `main` (not a feature branch) and follow the same PR process.

## Keeping branches short-lived

Try to merge feature branches within a few days. Long-lived branches cause painful merges. If a feature is large, break it into smaller PRs.

## CI

GitHub Actions runs on every PR and on pushes to `main` (see `.github/workflows/ci.yml`). A PR cannot be merged until CI is green.

CI runs two jobs:

- **Backend** (`backend/`) — Java 21 + Maven. Builds, runs tests, then runs PIT mutation coverage and uploads the report as an artifact.
- **Frontend** (`frontend/`) — Node 22 + Angular. Installs deps, lints (ESLint), builds (type-check + AOT compile), then runs tests.

The repo is structured as two apps: a `backend/` directory (Maven, `pom.xml`, `mvnw` wrapper) and a `frontend/` directory (Node, `package.json`). All code lives in one of these two folders.

### Run the same checks locally before pushing

Backend:
```powershell
cd backend
./mvnw clean package                                          # build
./mvnw test                                                   # tests
./mvnw test-compile org.pitest:pitest-maven:mutationCoverage  # mutation coverage
```

Frontend:
```powershell
cd frontend
npm ci                                          # install
npm run lint                                    # lint (ESLint)
npm run build -- --configuration production     # build (type-check + AOT)
npm test -- --no-watch --no-progress            # tests (headless)
```

E2E (smoke / vertical-slice acceptance tests with Playwright):
```powershell
docker compose up -d --build                    # start the full stack
npm run e2e:install                             # install e2e deps + browsers (one-time)
npm run e2e                                     # run Playwright tests
```

E2E tests live in `e2e/` and are intentionally thin — they verify key user journeys against the running Docker Compose stack. They do not replace unit tests or mutation testing.

If the local command passes, CI should pass. Fix locally before pushing — CI is a verification gate, not a sandbox.

## Branch protection (enforced on GitHub)

These are configured in **Settings → Branches → Branch protection rules** for `main`:

- Require a pull request before merging
- Require approvals: 1
- Require status checks to pass (CI)
- Require branches to be up to date before merging
- Do not allow direct pushes to `main`

## Questions

If anything here is unclear or doesn't match how the team works, open an issue or raise it in the team channel. This doc should reflect reality — update it when the process changes.