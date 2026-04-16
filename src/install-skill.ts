import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function installSkill(targetDir: string): void {
  const skillSource = resolve(__dirname, "..", "skill", "SKILL.md");
  if (!existsSync(skillSource)) {
    console.error("Error: SKILL.md not found in package. Reinstall @sonicgarden/bugsnag-cli.");
    process.exit(1);
  }

  const skillDir = resolve(targetDir, ".claude", "skills", "bugsnag");
  mkdirSync(skillDir, { recursive: true });

  const content = readFileSync(skillSource, "utf-8");
  const dest = resolve(skillDir, "SKILL.md");
  writeFileSync(dest, content);

  console.log(`Installed bugsnag skill to ${dest}`);
}
