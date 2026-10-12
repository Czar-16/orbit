import "server-only";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { readResume } from "@/lib/resume-storage";
import { InputError } from "@/lib/action-result";
export async function extractResumeText(resume: {
  storageKey: string;
  mimeType: string;
}) {
  const bytes = await readResume(resume.storageKey);
  if (resume.mimeType === "text/plain") {
    const text = bytes.toString("utf8");
    if (text.length > 100000)
      throw new InputError(
        "Extracted text exceeds the review limit. Reconstruct the source manually alongside the original; no text is silently truncated.",
      );
    return text;
  }
  try {
    return await new Promise<string>((resolveText, reject) => {
      const child = spawn(
        process.execPath,
        [
          "--max-old-space-size=128",
          resolve(process.cwd(), "scripts/extract-resume.mjs"),
        ],
        { stdio: ["pipe", "pipe", "ignore"], env: { NODE_ENV: "production" } },
      );
      let output = "";
      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error("Timeout"));
      }, 15000);
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        output += chunk;
        if (output.length > 100000) {
          child.kill("SIGKILL");
          reject(new Error("Limit"));
        }
      });
      child.on("error", reject);
      child.stdin.on("error", reject);
      child.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0 && output.trim()) resolveText(output);
        else reject(new Error("Extraction failed"));
      });
      child.stdin.end(bytes);
    });
  } catch {
    throw new InputError(
      "Text extraction failed. Use a readable PDF/TXT (up to 30 pages), or review and enter your profile manually. The original file is preserved.",
    );
  }
}
