export const COMMIT_PROMPT = `Your job is to write a GitHub commit message for this diff. Follow the Conventional Commits format.

## Format

The commit message should be structured as follows:

<type>[<scope]>: <description>

[optional body]

[optional footer(s)]

## Structural elements

- **fix:** patches a bug (PATCH in Semantic Versioning).
- **feat:** introduces a new feature (MINOR in Semantic Versioning).
- **BREAKING CHANGE:** in footer, or \`!\` after type/scope, indicates a breaking API change (MAJOR in Semantic Versioning). Can be part of any type.
- Other types are allowed: build:, chore:, ci:, docs:, style:, refactor:, perf:, test:, etc. (e.g. @commitlint/config-conventional).
- A scope may follow the type in parentheses, e.g. feat(parser): add ability to parse arrays.
- Footers other than BREAKING CHANGE may follow git trailer format.

## Examples

1. Description and breaking change footer:

feat: allow provided config object to extend other configs

BREAKING CHANGE: "extends" key in config file is now used for extending other config files

2. Using ! for breaking change:

feat!: send an email to the customer when a product is shipped

3. Scope with !:

feat(api)!: send an email to the customer when a product is shipped

4. Both ! and BREAKING CHANGE footer:

chore!: drop support for Node 6

BREAKING CHANGE: use JavaScript features not available in Node 6.

5. No body:

docs: correct spelling of CHANGELOG

6. With scope:

feat(lang): add Polish language

7. Multi-paragraph body and multiple footers:

fix: prevent racing of requests

Introduce a request id and a reference to latest request. Dismiss
incoming responses other than from latest request.

Remove timeouts which were used to mitigate the racing issue but are
obsolete now.

## Specification (RFC 2119 keywords)

- Commits MUST be prefixed with a type (noun: feat, fix, etc.), optional scope, optional \`!\`, and REQUIRED \`: \`.
- feat MUST be used when adding a new feature; fix MUST be used for bug fixes.
- A scope MAY follow the type in parentheses, e.g. fix(parser):.
- A short description MUST follow the type/scope. A longer body MAY follow after a blank line.
- One or more footers MAY follow the body. Each footer: word token, then \`: \` or \` #\`, then value (git trailer style).
- Footer tokens use - for spaces (e.g. Acked-by). Exception: BREAKING CHANGE.
- Breaking changes: use \`!\` in prefix and/or BREAKING CHANGE: in footer. If \`!\` is used, BREAKING CHANGE in footer is optional.
- Other types (e.g. docs:) MAY be used. Implementations MUST NOT treat units as case-sensitive except BREAKING CHANGE (MUST be uppercase). BREAKING-CHANGE is synonymous with BREAKING CHANGE in footers.

## Output

Only send the commit message. Do not use markdown. Do not use code blocks. Do not add any other text.
`;

export const GIT_HELP_PROMPT =
  "Your job is to help the user with their git commands. Give short answers with Commands. Do not use markdown";
