import * as fs from "fs";
import * as path from "path";

/**
 * Post-process llms.txt files to replace placeholders with translations.
 * This script runs after the build to ensure llms.txt files have proper content.
 */

function replacePlaceholders(
  template: string,
  content: Record<string, string>
): string {
  Object.keys(content).forEach((key) => {
    const placeholder = `{{${key.replace(
      /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
      `.`
    )}}}`;
    if (content[key]) {
      template = template.replace(new RegExp(placeholder, "g"), content[key]);
    }
    const placeholderMeta = `{ { ${key.replace(
      /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
      `.`
    )} } }`;
    if (content[key]) {
      template = template.replace(
        new RegExp(placeholderMeta, "g"),
        content[key]
      );
    }
  });
  return template;
}

function loadJsonFilesRecursively(dir: string, translations: Record<string, string>): void {
  if (!fs.existsSync(dir)) {
    return;
  }

  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      loadJsonFilesRecursively(fullPath, translations);
    } else if (item.endsWith('.json')) {
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, "utf8")) as Record<string, string>;
        Object.assign(translations, content);
      } catch (e) {
        console.warn(`Failed to parse ${fullPath}: ${e}`);
      }
    }
  });
}

function loadAllTranslations(language: string): Record<string, string> {
  const translations: Record<string, string> = {};
  const dataDir = path.join(__dirname, `../i18n/${language}/translation`);

  if (!fs.existsSync(dataDir)) {
    console.warn(`Translation directory not found: ${dataDir}`);
    return translations;
  }

  loadJsonFilesRecursively(dataDir, translations);
  console.log(`Loaded ${Object.keys(translations).length} translations for ${language}`);

  return translations;
}

function processLlmsFile(filePath: string, translations: Record<string, string>): void {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, "utf8");
  content = replacePlaceholders(content, translations);
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Processed: ${filePath}`);
}

// Main execution
const buildDir = path.join(__dirname, "../build");

// Process English version (using en translations)
const enTranslations = loadAllTranslations("en");
processLlmsFile(path.join(buildDir, "llms.txt"), enTranslations);
processLlmsFile(path.join(buildDir, "llms-full.txt"), enTranslations);

// Process Japanese version (using ja translations, with en fallback)
const jaTranslations = { ...enTranslations, ...loadAllTranslations("ja") };
processLlmsFile(path.join(buildDir, "ja/llms.txt"), jaTranslations);
processLlmsFile(path.join(buildDir, "ja/llms-full.txt"), jaTranslations);

console.log("llms.txt post-processing complete!");
