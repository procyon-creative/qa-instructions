import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { SkillInvocationLock } from './skill-invocation-lock.mjs';

const LOCKED =
  '---\nname: grill-with-docs\ndescription: x\ndisable-model-invocation: true\n---\n\nBody\n';
const OPEN = '---\nname: tdd\ndescription: y\n---\n\nBody\n';

async function skillsDir(skills) {
  const dir = await mkdtemp(path.join(tmpdir(), 'skills-'));
  for (const [name, content] of Object.entries(skills)) {
    await mkdir(path.join(dir, name));
    await writeFile(path.join(dir, name, 'SKILL.md'), content);
  }
  return dir;
}

test('findLocked lists only skills that block model invocation', async () => {
  const dir = await skillsDir({ 'grill-with-docs': LOCKED, tdd: OPEN });
  assert.deepEqual(await new SkillInvocationLock(dir).findLocked(), [
    'grill-with-docs',
  ]);
});

test('unlock removes the flag and leaves the rest of the file intact', async () => {
  const dir = await skillsDir({ 'grill-with-docs': LOCKED, tdd: OPEN });
  const lock = new SkillInvocationLock(dir);

  assert.deepEqual(await lock.unlock(), ['grill-with-docs']);
  assert.equal(
    await readFile(path.join(dir, 'grill-with-docs', 'SKILL.md'), 'utf8'),
    '---\nname: grill-with-docs\ndescription: x\n---\n\nBody\n',
  );
  assert.deepEqual(await lock.findLocked(), []);
});

test('a flag outside the frontmatter is left alone', async () => {
  const body = '---\nname: docs\n---\n\ndisable-model-invocation: true\n';
  const dir = await skillsDir({ docs: body });
  assert.deepEqual(await new SkillInvocationLock(dir).findLocked(), []);
});
