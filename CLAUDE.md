# CLAUDE.md — jest-performance-matchers

## Project overview

TypeScript library providing Jest matchers for performance testing (e.g., `toCompleteWithin`, `toResolveWithin`, quantile-based matchers). Zero production dependencies — all math/statistics implemented in-house. Volta-pinned Node 18, TypeScript ~4.7, Jest ~27.
## Creating and Managing issues
Use the `/writing-issues-in-github` skill to create issue for work that should be planned in the future. This includes bugs, features, refactors, and any other work that should be tracked in GitHub.

When creating a PR for an issue, make sure to link the PR to the issue by including "Closes #issue_number" in the PR description. This will automatically close the issue when the PR is merged.

Make sure you reference the issue in the commit message as well, by including "Ref: #issue_number" in the commit message footer. 

## Common commands

- `npm test` — run tests with coverage
- `npm run lint` — ESLint
- `npm run build` — clean + compile
- `npm run prepare-dist` — build + copy to dist/ for publishing

## Git workflow

- **Always create a feature branch and open a PR** — never commit directly to main
- Use conventional commit messages (e.g., `feat:`, `fix:`, `docs:`)

## Quality gates (before every commit)

1. `npm test` — all tests pass, 100% statement + branch coverage
2. `npm run lint` — zero errors
3. `npm run build` — compiles cleanly
4. SonarCloud analysis via `mcp__sonarqube__analyze_code_snippet`:
   - Project key: `ApostolosBenisis_jest-performance-matchers`
   - Source files: language `ts`, scope `MAIN`
   - Test files: language `ts`, scope `TEST`
   - Fix all bugs, vulnerabilities, and code smells before committing
5. Zero production dependencies maintained

## Verification plan (for every feature/change)

1. All existing tests pass
2. New code has tests covering: pass, fail, `.not` negation, input validation, edge cases
3. 100% statement + branch coverage
4. SonarCloud: 0 bugs, 0 vulnerabilities, 0 code smells
5. Type definitions compile cleanly
6. Zero production dependencies

## Unit test skill

- Use the `/writing-unit-tests` skill when writing or reviewing unit tests
- Tests live in `test/` directory, named `*.test.ts`

## Project structure

```
src/main.ts      — Jest matchers (toCompleteWithin, toResolveWithin, etc.)
src/metrics.ts   — Statistics utilities (calcQuantile, calcStats, removeOutliers)
test/main.test.ts
test/metrics.test.ts
```

## Architecture conventions

- Exported functions are the public API — keep them stable
- Private/internal helpers are not exported
- `Stats` interface fields use `number | null` for values that may be uncomputable
- All statistical math is implemented in-house (no dependencies)

## SonarCloud workflow

```
1. Make code changes
2. npm test (pass?)
3. npm run lint (pass?)
4. mcp__sonarqube__analyze_code_snippet for each changed src/ file (language: ts, scope: MAIN)
5. mcp__sonarqube__analyze_code_snippet for each changed test/ file (language: ts, scope: TEST)
6. Fix any issues → repeat from step 2
7. Commit only when all gates pass
```

## Release process

1. `git log <previous-tag>..main --oneline` — list commits since last release (use git tags to find the boundary)
2. Update `CHANGELOG.md` with a new version section following Keep a Changelog format
3. Bump `version` in `package.json`
4. Commit on a `release/vX.Y.Z` branch, open PR to main
5. After PR merge: create a GitHub release with tag `vX.Y.Z` targeting main — this triggers `npm-publish.yml` which publishes to npm

## CI/CD

- GitHub Actions CI runs on Node 18.x, 20.x, 22.x
- Publishing happens via `npm-publish.yml` on GitHub release creation
- SonarCloud scan runs as part of CI
