import readlinePromises from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";

export function createPromptSession() {
  const rl = readlinePromises.createInterface({
    input: stdin,
    output: stdout
  });

  emitKeypressEvents(stdin, rl);

  return {
    async text(question, { defaultValue = "", allowEmpty = false } = {}) {
      while (true) {
        const suffix = defaultValue ? ` (${defaultValue})` : "";
        const answer = (await rl.question(`${question}${suffix}: `)).trim();
        const resolved = answer || defaultValue;

        if (resolved || allowEmpty) {
          return resolved;
        }

        stdout.write("Please enter a value.\n");
      }
    },

    async confirm(question, defaultValue = true) {
      const hint = defaultValue ? "Y/n" : "y/N";

      while (true) {
        const answer = (await rl.question(`${question} (${hint}): `))
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

        stdout.write("Please answer yes or no.\n");
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
          stdout.write("Foresight CLI\n");
          stdout.write("Use arrow keys and press Enter.\n\n");
          stdout.write(`${question}\n\n`);

          options.forEach((option, optionIndex) => {
            const isSelected = optionIndex === index;
            const prefix = isSelected ? "›" : " ";
            const label = isSelected ? `\x1b[36m${option.label}\x1b[0m` : option.label;
            stdout.write(` ${prefix} ${label}\n`);

            if (isSelected && option.description) {
              stdout.write(`   ${option.description}\n`);
            }
          });

          if (helpText) {
            stdout.write(`\n${helpText}\n`);
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
  stdout.write(`\n${question}\n`);
  options.forEach((option, index) => {
    stdout.write(`  ${index + 1}. ${option.label}\n`);
  });

  while (true) {
    const answer = (await rl.question("\nChoose a number: ")).trim();
    const numericChoice = Number(answer);

    if (
      Number.isInteger(numericChoice) &&
      numericChoice >= 1 &&
      numericChoice <= options.length
    ) {
      return options[numericChoice - 1].value;
    }

    stdout.write("Please choose one of the listed numbers.\n");
  }
}
