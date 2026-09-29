#!/usr/bin/env node
import { RenderCommand } from './render.js';

const USAGE = `Usage: ${RenderCommand.USAGE}`;

async function main() {
  const [, , command, ...args] = process.argv;

  if (command === 'render') {
    await new RenderCommand().run(args);
  } else {
    console.error(USAGE);
    process.exit(1);
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
