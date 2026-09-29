# Changelog

## [4.0.0](https://github.com/procyon-creative/qa-instructions/compare/v3.0.0...v4.0.0) (2026-09-29)


### ⚠ BREAKING CHANGES

* render no longer writes one format into a separate directory; --out is rejected, and <folder> must be a QA Report folder.
* the outputDir option is replaced by outputFolder, and the default folder moves from qa-runs/ to qa-report/, resolved relative to the config file. Every test always gets qa-steps.html and qa-steps.txt; formats defaults to none extra instead of ['qa-steps'].

### Features

* every test run writes a QA Report ([45035d1](https://github.com/procyon-creative/qa-instructions/commit/45035d1e4680c5cc28907d7ed50a997322008f22))
* open and reopen the QA Report like Playwright's HTML report ([5ed6330](https://github.com/procyon-creative/qa-instructions/commit/5ed633028cc95c8a6a92e35894539d48b7d5dce5))
* open and reopen the QA Report like Playwright's HTML report ([8fe68e8](https://github.com/procyon-creative/qa-instructions/commit/8fe68e866da5bbcfdedaf24e42e063d79454c785))
* render regenerates the QA Report from its saved data ([b0aa4b1](https://github.com/procyon-creative/qa-instructions/commit/b0aa4b15aefa54d7b602c5900421c22abcca6d5d))
* Result Screenshots on Playwright 1.53–1.62 ([9b13d81](https://github.com/procyon-creative/qa-instructions/commit/9b13d819d5fad862358afc49d64cf03c4d294154))
* Result Screenshots on Playwright 1.63+ ([1dffeec](https://github.com/procyon-creative/qa-instructions/commit/1dffeecdff7577ca58f24e9f09157bd7cc0df34d))
* show a Result Screenshot of what the last QA Step's Expected Result describes ([a6e2ee9](https://github.com/procyon-creative/qa-instructions/commit/a6e2ee9de1fddc19b0a69f8465483abc346520e9))
* take Result Screenshots from the screen recording on Playwright 1.53–1.62 ([ae542c5](https://github.com/procyon-creative/qa-instructions/commit/ae542c526bda32e8430827398e3532d56f3a43e3))


### Bug Fixes

* write the CLI bin path in the form npm publishes as-is ([020ef34](https://github.com/procyon-creative/qa-instructions/commit/020ef341f9c2838633ee7f732915c0122a6cc4a0))
* write the CLI bin path in the form npm publishes as-is ([8a1558b](https://github.com/procyon-creative/qa-instructions/commit/8a1558b90d50616cbed184f94f18338425ac2ceb))

## [3.0.0](https://github.com/procyon-creative/qa-instructions/compare/v2.0.0...v3.0.0) (2026-09-28)


### ⚠ BREAKING CHANGES

* @qa-instructions/core, @qa-instructions/playwright, and @qa-instructions/cli are replaced by @procyon-creative/qa-instructions. Import the reporter from '@procyon-creative/qa-instructions/playwright' instead of '@qa-instructions/playwright/reporter'.

### Code Refactoring

* ship one package, @procyon-creative/qa-instructions ([f1c29d6](https://github.com/procyon-creative/qa-instructions/commit/f1c29d660801c2ac6d0281baf460c80e09c8454b))
