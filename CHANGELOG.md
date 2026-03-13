## Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- _No unreleased changes yet._

## [3.0.1] - 2026-03-13

- **Refactor**: Dynamically load CLI metadata from `package.json`. (`bffe49b`)
- **Fix**: Improve commit command robustness and update LLM models. (`23de56f`)

## [3.0.0] - 2026-03-01

- **Refactor (breaking)**: Migrate from Vercel AI SDK to LangChain. (`c34d6e3`)
- **CI/Workflows**: Add and refine publish/build workflows and permissions. (`bbacf5b`, `a737e8a`, `c1beaf5`)

## [2.1.0] - 2025-12-08

- **Feature**: Update provider models and bump package version from `2.0.4` to `2.1.0`. (`a421255`)
- **Feature**: Add OpenRouter support and improve user experience (new provider, `git-msg` alias, jokes, improved model selection, docs cleanup). (`1a03ac4`)
- **Fix**: Improve temporary file handling and confirmation prompts. (`d4da50f`)

## [2.0.4] - 2025-10-24

- **Chore**: Bump version from `2.0.3` to `2.0.4`. (`0b55b2c`)
- **Fix**: Commit message file path and generation timestamp. (`09348be`)
- **Chore**: Update dependencies and generated models. (`14bd503`)

## [2.0.3] - 2025-08-15

- **Chore**: Bump package version to `2.0.3`. (`c3ac0c2`)
- **Chore**: Bump deps, regenerate lockfile & models, and tweak LLM token handling. (`f571128`)

## [2.0.2] - 2025-07-20

- **Chore**: Update package version from `2.0.1` to `2.0.2`. (`f309a16`)
- **Chore**: Update dependencies and regenerate models; improve commit message handling. (`a818cd1`)

## [2.0.1] - 2025-06-16

- **Chore**: Bump version to `2.0.1` and enhance git diff handling. (`12b9d43`)
- **Chore**: Update build script to use `tsx`. (`75b5b14`)
- **Fix**: Commit message quoting, push command execution, and logging; regenerate models. (`818f4d9`, `599ecf1`, `0c172f4`, `fa5fd8e`, `82881a0`)
- **Feature**: Refactor codebase and enhance features. (`b04ad45`)

## [1.0.1] - 2024-12-21

- **Chore**: Release `v1.0.1`. (`77e9637`)
- **Chore**: Add repository link to `package.json`. (`e6314a9`)

## [1.0.0] - 2024-12-21

- **Initial release**. (`21c5d9f`)