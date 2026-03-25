# Contributing

## Local development

```bash
npm install
npm test
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

## Contribution priorities

- Add parsers without coupling them to CLI logic.
- Preserve the normalized data contract.
- Add tests for parsing, persistence, and command behavior.
- Avoid alert spam by keeping notification rules explicit.
