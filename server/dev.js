import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const node = process.execPath;

const commands = [
  {
    name: "api",
    args: [path.join(projectRoot, "server", "index.js")],
  },
  {
    name: "web",
    args: [path.join(projectRoot, "node_modules", "vite", "bin", "vite.js"), "--host", "0.0.0.0"],
  },
];

const children = commands.map((command) => {
  const child = spawn(node, command.args, {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal === "SIGTERM") {
      return;
    }

    console.error(`${command.name} exited with code ${code ?? "unknown"}`);
    stopAll();
    process.exit(code || 1);
  });

  return child;
});

function stopAll() {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopAll();
  process.exit(0);
});
