import { splitDiffByFile } from "./ignore";

export interface SecretWarning {
  file: string;
  reason: string;
}

const SENSITIVE_FILENAME_PATTERNS: RegExp[] = [
  /(^|\/)\.env(\..+)?$/i,
  /(^|\/)id_rsa$/i,
  /(^|\/)id_ed25519$/i,
  /\.pem$/i,
  /\.pfx$/i,
  /\.p12$/i,
  /(^|\/)credentials(\.json)?$/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)secrets?\.(ya?ml|json)$/i,
];

const SECRET_CONTENT_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
  { label: "AWS secret key", re: /aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{20,}/i },
  { label: "Private key block", re: /-----BEGIN (RSA|EC|DSA|OPENSSH|PGP) PRIVATE KEY-----/ },
  { label: "OpenAI API key", re: /sk-[A-Za-z0-9]{20,}/ },
  { label: "Anthropic API key", re: /sk-ant-[A-Za-z0-9-]{20,}/ },
  { label: "GitHub token", re: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { label: "Slack token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { label: "Generic API key assignment", re: /(api[_-]?key|secret|token|password)\s*[:=]\s*["'][A-Za-z0-9_\-/+=]{12,}["']/i },
  { label: "Google API key", re: /AIza[0-9A-Za-z_-]{35}/ },
];

/**
 * Scans a diff for sensitive files and likely secrets in *added* lines.
 * This is a heuristic, not a guarantee — it exists to prompt a second
 * look before committing, not to replace a real secrets scanner.
 */
export function scanForSecrets(diff: string): SecretWarning[] {
  const warnings: SecretWarning[] = [];
  const blocks = splitDiffByFile(diff);

  for (const block of blocks) {
    if (!block.file) continue;

    if (SENSITIVE_FILENAME_PATTERNS.some((re) => re.test(block.file))) {
      warnings.push({ file: block.file, reason: "sensitive file type" });
      continue;
    }

    const addedLines = block.content
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"));

    for (const line of addedLines) {
      const hit = SECRET_CONTENT_PATTERNS.find((p) => p.re.test(line));
      if (hit) {
        warnings.push({ file: block.file, reason: hit.label });
        break;
      }
    }
  }

  return warnings;
}
