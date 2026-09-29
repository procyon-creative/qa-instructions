#!/usr/bin/env node
import { RenderCommand } from './render.js';
import { ShowReportCommand } from './show-report.js';

const USAGE = `Usage:
  qa-instructions show-report [folder]
  ${RenderCommand.USAGE}`;

async function main() {
  const [, , command, ...args] = process.argv;

  if (command === 'show-report') {
    await new ShowReportCommand().run(args[0]);
  } else if (command === 'render') {
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
