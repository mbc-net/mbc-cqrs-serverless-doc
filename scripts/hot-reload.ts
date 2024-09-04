import concurrently from "concurrently";
import config from "../docusaurus.config";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

const fallbackLanguage = "en";
const rootDir = path.resolve(__dirname, "..");

const runCommand = function (cmd: string) {
  console.log(cmd);
  const ret = execSync(cmd, { cwd: rootDir });
  console.log(ret.toString());
};

// Get the language from the command-line arguments
const args = process.argv.slice(2);
let language = args[0];

if (!language) {
  language = fallbackLanguage;
}

if (config.i18n.locales.find((lng) => lng === language) === undefined) {
  console.error("Please correct the support language");
  process.exit(1);
}

const outputDir = path.join(
  __dirname,
  `../i18n/${language}/docusaurus-plugin-content-docs/current`
);

if (!fs.existsSync(outputDir)) {
  // We need to replace placeholder into i18n folder before serve content.
  runCommand(`npm run translate:extract-placeholder`);
  runCommand("npm run translate:replace-placeholders");
}

const { result } = concurrently(
  [
    { command: "nodemon", name: "watch", prefixColor: "green" },
    {
      command: `docusaurus start --locale ${language}`,
      name: "serve",
      prefixColor: "blue",
    },
  ],
  {
    prefix: "name",
    killOthers: ["failure", "success"],
    restartTries: 3,
    cwd: rootDir,
  }
);

result.then(
  function onSuccess() {
    process.exit();
  },
  function onFailure(msg) {
    console.error("abc", msg);
    process.exit();
  }
);
