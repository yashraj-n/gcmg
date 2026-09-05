import { spawn } from "child_process";

/**
 * Copy text to the system clipboard.
 * Platform-native first (most reliable on Windows), then clipboardy fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1) Platform-native
  try {
    if (process.platform === "win32") {
      // clip.exe reads UTF-16LE from stdin on Windows — most reliable
      await writeToProcess("clip", [], text, true);
      return true;
    }

    if (process.platform === "darwin") {
      await writeToProcess("pbcopy", [], text, false);
      return true;
    }

    // Linux
    try {
      await writeToProcess("xclip", ["-selection", "clipboard"], text, false);
      return true;
    } catch {
      await writeToProcess("xsel", ["--clipboard", "--input"], text, false);
      return true;
    }
  } catch {
    // fall through
  }

  // 2) clipboardy fallback
  try {
    const { default: clipboardy } = await import("clipboardy");
    await clipboardy.write(text);
    return true;
  } catch {
    return false;
  }
}

function writeToProcess(
  cmd: string,
  args: string[],
  text: string,
  windowsHide: boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ["pipe", "ignore", "ignore"],
      windowsHide,
      shell: false,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
    // Windows clip.exe expects UTF-16LE
    if (process.platform === "win32" && cmd === "clip") {
      const buf = Buffer.from(text, "utf16le");
      child.stdin.write(buf);
    } else {
      child.stdin.write(text, "utf-8");
    }
    child.stdin.end();
  });
}
