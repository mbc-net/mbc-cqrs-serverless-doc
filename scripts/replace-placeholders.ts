import * as fs from "fs";
import * as path from "path";

const fallbackLanguage = "en";

function replacePlaceholders(
  template: string,
  content: Record<string, string>
): string {
  Object.keys(content).forEach((key) => {
    const placeholder = `{{${key}}}`;
    if (content[key]) {
      template = template.replace(new RegExp(placeholder, "g"), content[key]);
    }
    const placeholderMeta = `{ { ${key} } }`;
    if (content[key]) {
      template = template.replace(
        new RegExp(placeholderMeta, "g"),
        content[key]
      );
    }
  });
  return template;
}

function replace(language: string, isFallback: boolean = false) {
  // Define the directories for markdown files and JSON data
  const outputDir = path.join(
    __dirname,
    `../i18n/${language}/docusaurus-plugin-content-docs/current`
  );
  const dataDir = path.join(
    __dirname,
    `../i18n/${isFallback ? fallbackLanguage : language}/translation`
  );

  // Get all markdown files in the docs directory
  const markdownFiles = fs
    .readdirSync(outputDir)
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
      const templateFile = path.join(outputDir, markdownFile);
      let template = fs.readFileSync(templateFile, "utf8");

      // Replace placeholders with corresponding content from JSON
      template = replacePlaceholders(template, content);

      // Save the output back to the markdown file or a new one
      const outputFile = path.join(outputDir, markdownFile);
      fs.writeFileSync(outputFile, template, "utf8");

      console.log(`Processed ${language}/${markdownFile} successfully`);
    } else {
      console.log(
        `JSON file not found for ${language}/${markdownFile}, skipping...`
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

const templateDir = path.join(__dirname, `../docs`);

const outputDir = path.join(
  __dirname,
  `../i18n/${language}/docusaurus-plugin-content-docs/current`
);

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.cpSync(templateDir, outputDir, { recursive: true });

console.log(`Update content for ${language} language`);
replace(language);

if (language !== fallbackLanguage) {
  console.log(
    `Fallback content for ${language} language. Using ${fallbackLanguage} `
  );
  replace(language, true);
}
