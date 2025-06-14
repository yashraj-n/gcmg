export const COMMIT_PROMPT =
  `Your job is to write GitHub commit for this diff. Only send the commit message. Format:

[<type>] <Title>
- Detail 1
- Detail 2
- Detail 3
- Details 4
... [Conclusion]

Do not use markdown. Do not use code blocks.
Make sure to include the type of commit (feat, fix, docs, style, refactor, test, chore etc...) in square brackets.
Make sure you follow format strictly unless told otherwise.
Make sure message is well detailed and has every change mentioned in the diff.
*If no diff is there, send 'No Changed Detected.'*` as const;

export const HELP_PROMPT = `Your job is to help the user with their git commands. Give short answers with Commands. Do not use markdown`;
