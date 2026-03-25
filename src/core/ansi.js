import { stdout } from "node:process";

const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

export function bold(value) {
  return applyStyle(value, "1");
}

export function dim(value) {
  return applyStyle(value, "2");
}

export function cyan(value) {
  return applyStyle(value, "36");
}

export function blue(value) {
  return applyStyle(value, "34");
}

export function green(value) {
  return applyStyle(value, "32");
}

export function yellow(value) {
  return applyStyle(value, "33");
}

export function red(value) {
  return applyStyle(value, "31");
}

export function orange(value) {
  return applyStyle(value, "38;5;214");
}

export function magenta(value) {
  return applyStyle(value, "35");
}

export function stripAnsi(value) {
  return String(value).replace(ANSI_PATTERN, "");
}

export function isColorEnabled() {
  return stdout.isTTY && !("NO_COLOR" in process.env);
}

function applyStyle(value, code) {
  const text = String(value);

  if (!isColorEnabled()) {
    return text;
  }

  return `\x1b[${code}m${text}\x1b[0m`;
}
