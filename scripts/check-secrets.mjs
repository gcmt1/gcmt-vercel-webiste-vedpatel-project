import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const findings = [];
for (const file of files) {
  if (!existsSync(file)) continue;
  if (/(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith(".example")) {
    findings.push(`${file}: private environment file is tracked`);
    continue;
  }
  if (!/\.(?:js|jsx|ts|tsx|json|toml|ya?ml|md|example)$/.test(file)) continue;
  const text = readFileSync(file, "utf8");
  if (
    /\bre_[A-Za-z0-9_-]{20,}/.test(text) ||
    /\bsb_secret_[A-Za-z0-9_-]{10,}/.test(text)
  )
    findings.push(`${file}: private key pattern`);
  for (const token of text.match(/eyJ[A-Za-z0-9_.-]+/g) || []) {
    try {
      const role = JSON.parse(
        Buffer.from(token.split(".")[1], "base64url").toString(),
      ).role;
      if (role && role !== "anon")
        findings.push(`${file}: privileged token pattern`);
    } catch {}
  }
}
if (findings.length) {
  console.error(findings.join("\n"));
  process.exit(1);
}
console.log(
  "No tracked private environment files or recognized private key patterns.",
);
