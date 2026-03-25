# Contributing

Thanks for helping improve Foresight CLI. Beginner-friendly contributions are welcome, including docs fixes, test coverage, parser improvements, and bug reports.

## Local development

```bash
npm install
npm test
```

Useful commands:

```bash
npm run scan:sample
npm run pack:check
```

## Project layout

```text
src/
├── cli.js
├── commands/
├── core/
├── parsers/
└── services/
```

## Good first contributions

- improve onboarding docs
- add parser test cases
- improve CLI output wording
- add support for more deprecation message formats

## Contribution priorities

- Add parsers without coupling them to CLI logic.
- Preserve the normalized data contract.
- Add tests for parsing, persistence, and command behavior.
- Avoid alert spam by keeping notification rules explicit.

## Before opening a PR

- run `npm test`
- run `npm run pack:check`
- keep docs updated when command behavior changes
