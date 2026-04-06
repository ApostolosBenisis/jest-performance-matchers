# Contributing to jest-performance-matchers

Contributions from the community are highly appreciated!

This is a **minimal, zero-dependency library** — all statistics and math are implemented in-house, and we intend to keep it that way.

Here are ways you can contribute:

1. **Reporting Issues** — if you find bugs or have suggestions, [open an issue](https://github.com/ApostolosBenisis/jest-performance-matchers/issues).
2. **Code Contributions** — submit code changes through pull requests.
3. **Documentation** — improve project documentation through pull requests.
4. **Support** — simply give the project a star; your support is greatly appreciated!

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18.0.0 (the project uses [Volta](https://volta.sh/) to pin Node 18)
- npm (bundled with Node.js)

## Getting Started

1. Fork the repository and clone it to your local environment.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a new branch for your changes:
   ```bash
   git checkout -b feat/my-feature
   ```

## Building

```bash
npm run build
```

This cleans the `dist/` directory and compiles the TypeScript source.

## Running Tests

```bash
npm test
```

Tests run with coverage enabled. All tests must pass and the project maintains 100% statement and branch coverage.

## Linting

```bash
npm run lint
```

All lint errors must be resolved before submitting a pull request.

## Commit Message Format

This project follows [Conventional Commits](https://www.conventionalcommits.org/). These messages drive the changelog and help reviewers understand the intent of each change. Each commit message should be structured as:

```
<type>: <short description>
```

Common types:

| Type     | When to use                                  |
|----------|----------------------------------------------|
| `feat`   | A new feature                                |
| `fix`    | A bug fix                                    |
| `docs`   | Documentation-only changes                   |
| `test`   | Adding or updating tests                     |
| `refactor` | Code changes that neither fix a bug nor add a feature |
| `chore`  | Maintenance tasks (dependencies, CI, etc.)   |
| `build`  | Changes to the build system or tooling       |
| `ci`     | Changes to CI configuration                  |

## Submitting a Pull Request

Before opening a PR, make sure:

- All existing tests pass (`npm test`)
- New code has tests covering pass, fail, `.not` negation, and edge cases
- 100% statement and branch coverage is maintained
- Linting passes (`npm run lint`)
- The build succeeds (`npm run build`)

Then:

1. Commit your changes following the conventional commit format.
2. Push to your forked repository.
3. Create a **Pull Request** (PR) from your branch to the `main` branch of this repository.
4. Ensure CI checks pass on your PR.

## Adding a New Matcher

This is the most common type of contribution. Here's the workflow:

1. **Implement the matcher** in `src/main.ts` — follow the pattern of the existing matchers (e.g., `toCompleteWithin`, `toResolveWithin`).
2. **Add tests** in `test/main.test.ts` — cover the pass case, the fail case, the `.not` negation, and input validation / edge cases. Tests follow the **BDD Given-When-Then** pattern with `// GIVEN`, `// WHEN`, `// THEN` comments — see [`.claude/skills/writing-unit-tests/SKILL.md`](.claude/skills/writing-unit-tests/SKILL.md) for the full convention (worth reading even outside of Claude).
3. **Export the matcher** — ensure it is registered via `expect.extend` and its type is declared in the `jest.Matchers` interface.
4. **Update the README** — add the matcher to the API reference table and include a usage example.
5. If your matcher needs new statistical utilities, add them to `src/metrics.ts` with corresponding tests in `test/metrics.test.ts`. Remember: no external dependencies — implement the math in-house.

## AI-Assisted Development

Using [Claude Code](https://docs.anthropic.com/en/docs/claude-code) is highly recommended and advised for contributing to this project. Other AI development tools may also be used.

The repository includes a [`CLAUDE.md`](./CLAUDE.md) file and skill definitions under [`.claude/skills/`](.claude/skills/) that describe the agentic workflows, quality gates, and conventions used in this project. Contributors — human and AI alike — are encouraged to read these files:

- [`.claude/skills/writing-unit-tests/SKILL.md`](.claude/skills/writing-unit-tests/SKILL.md) — explains the BDD test pattern, naming conventions, and coverage expectations used across the project.
- [`.claude/skills/writing-issues-in-github/SKILL.md`](.claude/skills/writing-issues-in-github/SKILL.md) — explains how to write clear, well-structured GitHub issues.

## Versioning

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **Major** (X.0.0) — incompatible API changes
- **Minor** (0.X.0) — new functionality in a backwards-compatible manner
- **Patch** (0.0.X) — backwards-compatible bug fixes

---

If you have any questions, feel free to reach out. Happy coding!