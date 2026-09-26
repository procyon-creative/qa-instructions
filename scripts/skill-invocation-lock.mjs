import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;
const FLAG = /^disable-model-invocation:\s*true\s*\n/m;

/**
 * Finds and removes `disable-model-invocation: true` from installed skills so the
 * agent can start them itself. Upstream skill packs set it, and reinstalling or
 * updating them (`npx skills update`) brings it back.
 */
export class SkillInvocationLock {
  constructor(skillsDir) {
    this.skillsDir = skillsDir;
  }

  async findLocked() {
    const locked = [];
    for (const name of await this.skillNames()) {
      if (FLAG.test(this.frontmatter(await this.read(name)))) locked.push(name);
    }
    return locked;
  }

  async unlock() {
    const locked = await this.findLocked();
    for (const name of locked) {
      const content = await this.read(name);
      const frontmatter = this.frontmatter(content);
      await writeFile(
        this.file(name),
        content.replace(frontmatter, frontmatter.replace(FLAG, '')),
      );
    }
    return locked;
  }

  async skillNames() {
    const entries = await readdir(this.skillsDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() || e.isSymbolicLink())
      .map((e) => e.name)
      .sort();
  }

  frontmatter(content) {
    return content.match(FRONTMATTER)?.[0] ?? '';
  }

  file(name) {
    return path.join(this.skillsDir, name, 'SKILL.md');
  }

  read(name) {
    return readFile(this.file(name), 'utf8');
  }
}
