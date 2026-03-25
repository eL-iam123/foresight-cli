import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createReadStream, watch as watchFile } from "node:fs";
import readline from "node:readline";
import { parseRuntimeDeprecation } from "../parsers/nodeDeprecationParser.js";

export async function scanCommand({ command, source = "node", onFinding }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: process.cwd(),
      env: process.env,
      shell: true,
      stdio: ["inherit", "pipe", "pipe"]
    });

    let matches = 0;
    let queue = Promise.resolve();

    const processLine = (line, stream) => {
      const finding = parseRuntimeDeprecation(line, {
        source,
        stream,
        command
      });

      if (!finding) {
        return;
      }

      matches += 1;
      queue = queue.then(() => onFinding(finding));
    };

    attachLineReader(child.stdout, "stdout", process.stdout, processLine);
    attachLineReader(child.stderr, "stderr", process.stderr, processLine);

    child.on("error", reject);

    child.on("close", async (exitCode) => {
      await queue;
      resolve({
        exitCode: exitCode ?? 0,
        matches
      });
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

function attachLineReader(stream, streamName, destination, onLine) {
  let buffer = "";

  stream.on("data", (chunk) => {
    const text = chunk.toString("utf8");
    destination.write(chunk);
    buffer += text;

    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      onLine(line, streamName);
    }
  });

  stream.on("end", () => {
    if (buffer) {
      onLine(buffer, streamName);
    }
  });
}
