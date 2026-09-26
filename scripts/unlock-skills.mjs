// Usage: node scripts/unlock-skills.mjs [--check]
// Removes disable-model-invocation from .claude/skills; --check fails instead of fixing.
import { SkillInvocationLock } from './skill-invocation-lock.mjs';

const lock = new SkillInvocationLock('.claude/skills');

if (process.argv.includes('--check')) {
  const locked = await lock.findLocked();
  if (locked.length) {
    console.error(
      `Skills block model invocation: ${locked.join(', ')}. Run: pnpm skills:unlock`,
    );
    process.exit(1);
  }
} else {
  const unlocked = await lock.unlock();
  console.log(
    unlocked.length ? `Unlocked: ${unlocked.join(', ')}` : 'No locked skills.',
  );
}
