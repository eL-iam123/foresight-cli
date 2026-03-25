# Publishing

## Before publishing

Run:

```bash
npm test
npm run pack:check
```

`npm run pack:check` uses `npm pack --dry-run` so you can confirm which files will be included in the published tarball.

## Package name

This package currently uses the unscoped npm name:

```text
foresight-cli
```

The repository metadata currently points to:

```text
https://github.com/el-iam213/foresight-cli
```

## Publish

```bash
npm login
npm publish
```

## Recommended follow-up

- tag releases so npm versions map cleanly to source history
