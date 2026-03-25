process.emitWarning(
  "Buffer() is deprecated and will be removed in v2.0",
  {
    type: "DeprecationWarning",
    code: "DEP0005"
  }
);

setTimeout(() => {
  process.stderr.write("application shutdown\n");
}, 25);
