# Parsers

## Current parser

The MVP ships with a Node.js runtime deprecation parser based on regex rules.

Examples of supported patterns:

```text
(node:1234) [DEP0005] DeprecationWarning: Buffer() is deprecated and will be removed in v2.0
DeprecationWarning: request has been deprecated, use axios instead
```

## Parser output

Normalized parser output contains:

- `type`
- `module`
- `packageName`
- `message`
- `severity`
- `source`
- `metadata`

## Extensibility

The parser layer is isolated from the storage and CLI layers. Additional language parsers can be introduced later without changing the database contract or reporting path.
