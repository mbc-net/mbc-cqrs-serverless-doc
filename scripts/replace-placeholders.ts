import * as fs from "fs";
import * as path from "path";
const fallbackLanguage = "en";

function replacePlaceholders(
  template: string,
  content: Record<string, string>
): string {
  Object.keys(content).forEach((key) => {
    const placeholder = `{{${key}}}`;
    template = template.replace(new RegExp(placeholder, "g"), content[key]);
  });
  return template;
}

function saveMarkdownToFile(
  content: string,
  outputDirName: string,
  filename: string
) {
  const outputDir = path.join(__dirname, outputDirName);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(__dirname, outputDirName, filename);

  fs.writeFileSync(outputFile, content, "utf8");
}

function replace(language: string, isFallback: boolean = false) {
  // Define the directories for markdown files and JSON data
  const docsDir = path.join(
    __dirname,
    isFallback
      ? `../i18n/${language}/docusaurus-plugin-content-docs/current`
      : "../docs"
  );
  const dataDir = path.join(
    __dirname,
    `../i18n/${isFallback ? fallbackLanguage : language}/translation`
  );

  // Get all markdown files in the docs directory
  const markdownFiles = fs
    .readdirSync(docsDir)
    .filter((file) => file.endsWith(".md"));

  markdownFiles.forEach((markdownFile) => {
    // Generate the corresponding JSON filename
    const jsonFile = path.join(dataDir, markdownFile.replace(".md", ".json"));

    // Check if the corresponding JSON file exists
    if (fs.existsSync(jsonFile)) {
      // Load the JSON content
      const content = JSON.parse(fs.readFileSync(jsonFile, "utf8")) as Record<
        string,
        string
      >;

      // Load the markdown template
      const templateFile = path.join(docsDir, markdownFile);
      let template = fs.readFileSync(templateFile, "utf8");

      // Replace placeholders with corresponding content from JSON
      template = replacePlaceholders(template, content);

      // Save the output back to the markdown file or a new one
      saveMarkdownToFile(
        template,
        `../i18n/${language}/docusaurus-plugin-content-docs/current`,
        markdownFile
      );

      console.log(`Processed ${markdownFile} successfully`);
    } else {
      console.log(
        `${
          isFallback ? "Fallback" : ""
        }:::JSON file not found for ${markdownFile}, skipping...`
      );
    }
  });
}

// Get the language from the command-line arguments
const args = process.argv.slice(2);
const language = args[0];

if (!language) {
  console.error("Please specify a language, e.g., 'en' or 'ja'.");
  process.exit(1);
}

console.log(`Update content for ${language} language`);
replace(language);

console.log(
  `Fallback content for ${language} language. Using ${fallbackLanguage} `
);
if (language !== fallbackLanguage) {
  replace(language, true);
}
