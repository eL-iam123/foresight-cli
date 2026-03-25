import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import {
  createReadStream,
  mkdirSync,
  rmSync,
  watch as watchFile,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseRuntimeDeprecation } from "../parsers/nodeDeprecationParser.js";

export async function scanCommand({
  command,
  source = "node",
  onFinding,
  mirrorOutput = true
}) {
  return new Promise((resolve, reject) => {
    const tempDir = join(tmpdir(), `foresight-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const logPath = join(tempDir, "runtime.log");
    mkdirSync(tempDir, { recursive: true });
    writeFileSync(logPath, "");

    let matches = 0;
    let lastSize = 0;
    let buffer = "";
    let pendingRead = Promise.resolve();

    const processChunk = async (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (mirrorOutput) {
          process.stdout.write(`${line}\n`);
        }
        const finding = parseRuntimeDeprecation(line, {
          source,
          stream: "combined",
          command
        });

        if (!finding) {
          continue;
        }

        matches += 1;
        await onFinding(finding);
      }
    };

    const consumeNewBytes = async () => {
      const stream = createReadStream(logPath, {
        start: lastSize,
        encoding: "utf8"
      });

      for await (const chunk of stream) {
        lastSize += Buffer.byteLength(chunk);
        await processChunk(chunk);
      }
    };

    const watcher = watchFile(logPath, { persistent: true }, () => {
      pendingRead = pendingRead.then(() => consumeNewBytes());
    });

    const escapedLogPath = logPath.replace(/'/g, "'\\''");
    const child = spawn("/bin/bash", ["-lc", `${command} > '${escapedLogPath}' 2>&1`], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["inherit", "ignore", "ignore"]
    });

    child.on("error", (error) => {
      watcher.close();
      rmSync(tempDir, { recursive: true, force: true });
      reject(error);
    });

    child.on("close", async (exitCode) => {
      try {
        await pendingRead;
        await consumeNewBytes();

        if (buffer) {
          if (mirrorOutput) {
            process.stdout.write(`${buffer}\n`);
          }
          const finding = parseRuntimeDeprecation(buffer, {
            source,
            stream: "combined",
            command
          });

          if (finding) {
            matches += 1;
            await onFinding(finding);
          }
        }

        watcher.close();
        rmSync(tempDir, { recursive: true, force: true });
        resolve({
          exitCode: exitCode ?? 0,
          matches
        });
      } catch (error) {
        watcher.close();
        rmSync(tempDir, { recursive: true, force: true });
        reject(error);
      }
    });
  });
}

export async function scanFile({ filePath, follow = false, onFinding }) {
  let matches = 0;
  let lastSize = 0;
  let buffer = "";

  const processChunk = async (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      const finding = parseRuntimeDeprecation(line, {
        source: "log",
        file: filePath
      });

      if (finding) {
        matches += 1;
        await onFinding(finding);
      }
    }
  };

  const initialContent = await readFile(filePath, "utf8");
  lastSize = Buffer.byteLength(initialContent);
  await processChunk(initialContent);

  if (!follow) {
    if (buffer.trim()) {
      const finding = parseRuntimeDeprecation(buffer, {
        source: "log",
        file: filePath
      });
      if (finding) {
        matches += 1;
        await onFinding(finding);
      }
    }

    return { matches };
  }

  return new Promise((resolve, reject) => {
    let closed = false;
    let pendingRead = Promise.resolve();
    const watcher = watchFile(filePath, { persistent: true }, () => {
      pendingRead = pendingRead.then(async () => {
        const stream = createReadStream(filePath, {
          start: lastSize,
          encoding: "utf8"
        });

        for await (const chunk of stream) {
          lastSize += Buffer.byteLength(chunk);
          await processChunk(chunk);
        }
      });
    });

    const shutdown = async () => {
      if (closed) {
        return;
      }

      closed = true;
      watcher.close();
      await pendingRead;

      if (buffer.trim()) {
        const finding = parseRuntimeDeprecation(buffer, {
          source: "log",
          file: filePath
        });
        if (finding) {
          matches += 1;
          await onFinding(finding);
        }
      }

      resolve({ matches, stopped: true });
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);

    watcher.on("error", reject);
  });
}
