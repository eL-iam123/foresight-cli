import readlinePromises from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";
import { blue, bold, cyan, dim, orange } from "./ansi.js";

export function createPromptSession() {
  const rl = readlinePromises.createInterface({
    input: stdin,
    output: stdout
  });

  emitKeypressEvents(stdin, rl);

  return {
    async text(question, { defaultValue = "", allowEmpty = false } = {}) {
      while (true) {
        const suffix = defaultValue ? ` ${dim(`(${defaultValue})`)}` : "";
        const answer = (
          await rl.question(`${bold(cyan(question))}${suffix}${blue(":")} `)
        ).trim();
        const resolved = answer || defaultValue;

        if (resolved || allowEmpty) {
          return resolved;
        }

        stdout.write(`${orange("Please enter a value.")}\n`);
      }
    },

    async confirm(question, defaultValue = true) {
      const hint = defaultValue ? "Y/n" : "y/N";

      while (true) {
        const answer = (
          await rl.question(
            `${bold(cyan(question))} ${orange(`(${hint})`)}${blue(":")} `
          )
        )
          .trim()
          .toLowerCase();

        if (!answer) {
          return defaultValue;
        }

        if (["y", "yes"].includes(answer)) {
          return true;
        }

        if (["n", "no"].includes(answer)) {
          return false;
        }

        stdout.write(`${orange("Please answer yes or no.")}\n`);
      }
    },

    async select(question, options, { helpText = "" } = {}) {
      if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function") {
        return fallbackSelect(rl, question, options);
      }

      let index = 0;

      return new Promise((resolve, reject) => {
        const wasRaw = Boolean(stdin.isRaw);

        const cleanup = () => {
          stdin.off("keypress", onKeypress);
          if (!wasRaw) {
            stdin.setRawMode(false);
          }
          stdout.write("\x1b[?25h");
        };

        const render = () => {
          stdout.write("\x1b[2J\x1b[H");
          stdout.write(`${bold(cyan("Foresight CLI"))}\n`);
          stdout.write(`${dim("Use arrow keys and press Enter.")}\n\n`);
          stdout.write(`${bold(question)}\n\n`);

          options.forEach((option, optionIndex) => {
            const isSelected = optionIndex === index;
            const prefix = isSelected ? orange("›") : dim("·");
            const label = isSelected ? bold(cyan(option.label)) : option.label;
            stdout.write(` ${prefix} ${label}\n`);

            if (isSelected && option.description) {
              stdout.write(`   ${orange(option.description)}\n`);
            }
          });

          if (helpText) {
            stdout.write(`\n${dim(orange(helpText))}\n`);
          }
        };

        const onKeypress = (_, key) => {
          if (!key) {
            return;
          }

          if (key.ctrl && key.name === "c") {
            cleanup();
            reject(new Error("Prompt cancelled"));
            return;
          }

          if (key.name === "up" || key.name === "k") {
            index = index === 0 ? options.length - 1 : index - 1;
            render();
            return;
          }

          if (key.name === "down" || key.name === "j") {
            index = index === options.length - 1 ? 0 : index + 1;
            render();
            return;
          }

          if (key.name === "return") {
            const value = options[index].value;
            cleanup();
            stdout.write("\n");
            resolve(value);
          }
        };

        if (!wasRaw) {
          stdin.setRawMode(true);
        }

        stdout.write("\x1b[?25l");
        stdin.on("keypress", onKeypress);
        render();
      });
    },

    async pause(message = "Press Enter to continue") {
      await rl.question(`\n${message}`);
    },

    close() {
      rl.close();
    }
  };
}

async function fallbackSelect(rl, question, options) {
  stdout.write(`\n${bold(question)}\n`);
  options.forEach((option, index) => {
    stdout.write(`  ${orange(index + 1)}. ${option.label}\n`);
  });

  while (true) {
    const answer = (
      await rl.question(`\n${bold(cyan("Choose a number"))}${blue(":")} `)
    ).trim();
    const numericChoice = Number(answer);

    if (
      Number.isInteger(numericChoice) &&
      numericChoice >= 1 &&
      numericChoice <= options.length
    ) {
      return options[numericChoice - 1].value;
    }

    stdout.write(`${orange("Please choose one of the listed numbers.")}\n`);
  }
}
