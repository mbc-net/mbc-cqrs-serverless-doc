import * as fs from "fs";
import * as path from "path";

// Utility function to extract placeholders from the markdown template
function extractPlaceholders(
  template: string,
  currentPlaceholder: any
): Record<string, string> {
  const regex = /\{\s*\{\s*(.*?)\s*\}\s*\}/g;
  const placeholders: Record<string, string> = {};
  let match;

  while ((match = regex.exec(template)) !== null) {
    const placeholder = match[1].trim();
    if (currentPlaceholder[placeholder]) {
      placeholders[placeholder] = currentPlaceholder[placeholder];
    } else {
      placeholders[placeholder] = "";
    }
  }

  return placeholders;
}

// Get the language from the command-line arguments
const args = process.argv.slice(2);
const language = args[0];

if (!language) {
  console.error("Please specify a language, e.g., 'en' or 'ja'.");
  process.exit(1);
}

// Define the directory for markdown templates and the output directory for JSON files
const templatesDir = path.join(__dirname, "../docs");
const outputDir = path.join(__dirname, `../i18n/${language}/translation`);

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Get all markdown template files in the templates directory
const markdownFiles = fs
  .readdirSync(templatesDir)
  .filter((file) => file.endsWith(".md"));

markdownFiles.forEach((markdownFile) => {
  // Load the markdown template
  const templateFile = path.join(templatesDir, markdownFile);
  const template = fs.readFileSync(templateFile, "utf8");

  // Generate the corresponding JSON output file
  const outputFile = path.join(outputDir, markdownFile.replace(".md", ".json"));

  let currentPlaceholder = {};

  if (fs.existsSync(outputFile)) {
    currentPlaceholder = JSON.parse(fs.readFileSync(outputFile, "utf8"));
  }

  // Extract placeholders from the template
  const placeholders = extractPlaceholders(template, currentPlaceholder);

  // Save the placeholders to the JSON file
  fs.writeFileSync(outputFile, JSON.stringify(placeholders, null, 2), "utf8");

  console.log(
    `Extracted placeholders from ${markdownFile} and saved to ${outputFile}`
  );
});
