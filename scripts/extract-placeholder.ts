import * as fs from "fs";
import * as path from "path";

// Define the directory for markdown templates and the output directory for JSON files
const templatesDir = path.join(__dirname, "../docs");
const outputDir = path.join(__dirname, "../i18n/ja/translation");

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Utility function to extract placeholders from the markdown template
function extractPlaceholders(template: string): Record<string, string> {
  const regex = /{{(.*?)}}/g;
  const placeholders: Record<string, string> = {};
  let match;

  while ((match = regex.exec(template)) !== null) {
    const placeholder = match[1].trim();
    placeholders[placeholder] = ""; // You can also use a default value if needed
  }

  return placeholders;
}

// Get all markdown template files in the templates directory
const markdownFiles = fs
  .readdirSync(templatesDir)
  .filter((file) => file.endsWith(".md"));

markdownFiles.forEach((markdownFile) => {
  // Load the markdown template
  const templateFile = path.join(templatesDir, markdownFile);
  const template = fs.readFileSync(templateFile, "utf8");

  // Extract placeholders from the template
  const placeholders = extractPlaceholders(template);

  // Generate the corresponding JSON output file
  const outputFile = path.join(outputDir, markdownFile.replace(".md", ".json"));

  // Save the placeholders to the JSON file
  fs.writeFileSync(outputFile, JSON.stringify(placeholders, null, 2), "utf8");

  console.log(
    `Extracted placeholders from ${markdownFile} and saved to ${outputFile}`
  );
});
