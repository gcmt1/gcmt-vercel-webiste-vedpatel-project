import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
if (process.argv.includes("--build")) {
  if (!existsSync("build/index.html")) throw new Error("Build first.");
  for (const path of readdirSync("build", {
    recursive: true,
    withFileTypes: true,
  }))
    if (path.isFile()) files.push(path.parentPath + "/" + path.name);
}
const findings = [];
for (const file of files) {
  if (!existsSync(file)) continue;
  if (/(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith(".example")) {
    findings.push(`${file}: private environment file is tracked`);
    continue;
  }
  if (
    !/\.(?:mjs|js|jsx|ts|tsx|json|toml|ya?ml|md|example|sql|css|html)$/.test(
      file,
    )
  )
    continue;
  const text = readFileSync(file, "utf8");
  if (
    /\bre_[A-Za-z0-9_-]{20,}/.test(text) ||
    /\bsb_secret_[A-Za-z0-9_-]{10,}/.test(text)
  )
    findings.push(`${file}: private key pattern`);
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text) ||
    /\b(?:working_?key|cca_working_key|cca_access_code|service_role_key)\s*[:=]\s*["'][a-z0-9/+_=.-]{12,}["']/i.test(
      text,
    )
  )
    findings.push(file + ": confidential assignment");
  if (
    file.startsWith("build/") &&
    /\b(?:CCA_WORKING_KEY|SUPABASE_SERVICE_ROLE_KEY)\b/.test(text)
  )
    findings.push(file + ": server configuration in browser artifact");
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
  "No candidate private environment files or recognized private key patterns.",
);
