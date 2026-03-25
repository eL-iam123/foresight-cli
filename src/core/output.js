export function formatTable(columns, rows) {
  if (rows.length === 0) {
    return "No records found.";
  }

  const widths = columns.map((column) => column.label.length);

  for (const row of rows) {
    columns.forEach((column, index) => {
      const cell = stringifyCell(row[column.key]);
      widths[index] = Math.max(widths[index], cell.length);
    });
  }

  const header = columns
    .map((column, index) => column.label.padEnd(widths[index]))
    .join("  ");

  const separator = widths.map((width) => "-".repeat(width)).join("  ");

  const body = rows.map((row) =>
    columns
      .map((column, index) => stringifyCell(row[column.key]).padEnd(widths[index]))
      .join("  ")
  );

  return [header, separator, ...body].join("\n");
}

export function printJson(data) {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

export function truncate(value, maxLength = 72) {
  const input = stringifyCell(value);
  return input.length > maxLength ? `${input.slice(0, maxLength - 3)}...` : input;
}

export function formatTimestamp(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().replace("T", " ").slice(0, 19);
}

function stringifyCell(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}
