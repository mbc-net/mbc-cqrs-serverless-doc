import * as fs from "fs";
import * as path from "path";

/**
 * Generate comprehensive llms.txt and llms-full.txt files from translated docs.
 * This script runs after the build to create AI-friendly documentation indexes.
 */

interface DocInfo {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  url: string;
}

const BASE_URL = "https://mbc-cqrs-serverless.mbc-net.com";

// Document categories based on sidebars.ts
const CATEGORIES: Record<string, string[]> = {
  "Getting Started": ["getting-started", "installation", "project-structure", "cli"],
  "Tutorials": ["quickstart-tutorial", "build-todo-app"],
  "Core Concepts": [
    "architecture",
    "architecture/system-overview",
    "architecture/cqrs-flow",
    "architecture/event-sourcing",
    "key-patterns",
    "entity-patterns",
  ],
  "Backend Development": [
    "backend-development",
    "build-your-application",
    "controllers",
    "modules",
    "event-handling-patterns",
    "data-sync-handler-examples",
    "service-patterns",
    "multi-tenant-patterns",
    "import-export-patterns",
  ],
  "Modules": [
    "api-reference",
    "command-service",
    "data-service",
    "serialization",
    "version-rules",
    "sequence",
    "tasks",
    "tenant",
    "master",
    "directory",
    "notification-module",
    "email-service",
    "ui-setting",
  ],
  "Infrastructure": [
    "architecture/cdk-infrastructure",
    "architecture/step-functions",
    "dynamodb",
    "prisma",
  ],
  "Frontend Development": [
    "frontend-project-structure",
    "state-management-patterns",
    "api-integration-patterns",
    "form-handling-patterns",
    "master-web",
    "survey-web",
  ],
  "Security": ["security-best-practices", "authentication"],
  "Deployment & Operations": ["deployment-guide", "codepipeline-cicd", "monitoring-logging"],
  "Configuration": ["configuring", "environment-variables", "absolute_imports_and_module_path_aliases"],
  "Testing": ["testing", "unit-test", "e2e-test"],
  "Troubleshooting": ["common-issues", "debugging-guide"],
  "Examples": ["recipes", "ecommerce-example", "saas-example", "survey-template"],
  "AI Integration": ["ai-integration", "mcp-server", "ai-prompts"],
  "Reference": ["helpers", "interfaces", "error-catalog", "anti-patterns", "glossary"],
  "Changelog": ["changelog"],
};

function extractTitle(content: string): string {
  // Try to extract title from frontmatter or first heading
  const frontmatterMatch = content.match(/^---[\s\S]*?title:\s*["']?(.+?)["']?\s*[\n\r]/m);
  if (frontmatterMatch) {
    return frontmatterMatch[1].trim();
  }

  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  return "Untitled";
}

function extractDescription(content: string): string {
  // Remove frontmatter
  let body = content.replace(/^---[\s\S]*?---\s*/, "");

  // Remove title heading
  body = body.replace(/^#\s+.+\n+/, "");

  // Find first paragraph (non-empty, non-heading, non-code block)
  const lines = body.split("\n");
  let paragraph = "";
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const trimmed = line.trim();
    if (!trimmed) {
      if (paragraph) break;
      continue;
    }
    if (trimmed.startsWith("#") || trimmed.startsWith("|") || trimmed.startsWith("-") || trimmed.startsWith(":::")) {
      if (paragraph) break;
      continue;
    }

    paragraph += (paragraph ? " " : "") + trimmed;
  }

  // Clean up and truncate
  paragraph = paragraph
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove markdown links
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
    .replace(/\*([^*]+)\*/g, "$1") // Remove italic
    .replace(/`([^`]+)`/g, "$1") // Remove inline code
    .trim();

  if (paragraph.length > 300) {
    paragraph = paragraph.substring(0, 297) + "...";
  }

  return paragraph || "Documentation page for MBC CQRS Serverless framework.";
}

function getCategoryForDoc(docId: string): string {
  for (const [category, docs] of Object.entries(CATEGORIES)) {
    if (docs.includes(docId)) {
      return category;
    }
  }
  return "Other";
}

function processDocsDirectory(docsDir: string, locale: string): DocInfo[] {
  const docs: DocInfo[] = [];

  function processDir(dir: string, prefix: string = "") {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        processDir(fullPath, prefix ? `${prefix}/${item}` : item);
      } else if (item.endsWith(".md") || item.endsWith(".mdx")) {
        const docId = prefix ? `${prefix}/${item.replace(/\.mdx?$/, "")}` : item.replace(/\.mdx?$/, "");
        const content = fs.readFileSync(fullPath, "utf8");
        const title = extractTitle(content);
        const description = extractDescription(content);
        const category = getCategoryForDoc(docId);
        const urlPath = locale === "en" ? `/docs/${docId}` : `/${locale}/docs/${docId}`;

        docs.push({
          id: docId,
          title,
          description,
          content,
          category,
          url: `${BASE_URL}${urlPath}`,
        });
      }
    }
  }

  processDir(docsDir);
  return docs;
}

function generateLlmsTxt(docs: DocInfo[], locale: string): string {
  const title = locale === "ja"
    ? "MBC CQRS サーバーレス フレームワーク"
    : "MBC CQRS Serverless Framework";

  const description = locale === "ja"
    ? "AWS上でNestJS、DynamoDB、その他のAWSサービスを使用してサーバーレスアプリケーションを構築するための本番対応CQRSおよびイベントソーシングフレームワーク。"
    : "Production-ready CQRS and Event Sourcing framework for building serverless applications on AWS with NestJS, DynamoDB, and other AWS services.";

  let output = `# ${title}

> ${description}

This file contains links to documentation sections following the llmstxt.org standard.

`;

  // Group by category
  const byCategory: Record<string, DocInfo[]> = {};
  for (const doc of docs) {
    if (!byCategory[doc.category]) {
      byCategory[doc.category] = [];
    }
    byCategory[doc.category].push(doc);
  }

  // Output by category in order
  const categoryOrder = Object.keys(CATEGORIES);
  for (const category of categoryOrder) {
    if (byCategory[category] && byCategory[category].length > 0) {
      output += `## ${category}\n\n`;
      for (const doc of byCategory[category]) {
        output += `- [${doc.title}](${doc.url}): ${doc.description}\n`;
      }
      output += "\n";
    }
  }

  // Add any remaining categories
  for (const category of Object.keys(byCategory)) {
    if (!categoryOrder.includes(category)) {
      output += `## ${category}\n\n`;
      for (const doc of byCategory[category]) {
        output += `- [${doc.title}](${doc.url}): ${doc.description}\n`;
      }
      output += "\n";
    }
  }

  return output;
}

function generateLlmsFullTxt(docs: DocInfo[], locale: string): string {
  const title = locale === "ja"
    ? "MBC CQRS サーバーレス フレームワーク - 完全ドキュメント"
    : "MBC CQRS Serverless Framework - Full Documentation";

  const description = locale === "ja"
    ? "AWS上でNestJS、DynamoDB、その他のAWSサービスを使用してサーバーレスアプリケーションを構築するための本番対応CQRSおよびイベントソーシングフレームワーク。"
    : "Production-ready CQRS and Event Sourcing framework for building serverless applications on AWS with NestJS, DynamoDB, and other AWS services.";

  let output = `# ${title}

> ${description}

This file contains the full documentation content following the llmstxt.org standard.

---

`;

  // Group by category
  const byCategory: Record<string, DocInfo[]> = {};
  for (const doc of docs) {
    if (!byCategory[doc.category]) {
      byCategory[doc.category] = [];
    }
    byCategory[doc.category].push(doc);
  }

  // Output by category in order
  const categoryOrder = Object.keys(CATEGORIES);
  for (const category of categoryOrder) {
    if (byCategory[category] && byCategory[category].length > 0) {
      output += `# ${category}\n\n`;
      for (const doc of byCategory[category]) {
        // Clean content: remove frontmatter
        let cleanContent = doc.content.replace(/^---[\s\S]*?---\s*/, "");
        output += `## ${doc.title}\n\n`;
        output += `URL: ${doc.url}\n\n`;
        output += cleanContent;
        output += "\n\n---\n\n";
      }
    }
  }

  return output;
}

// Main execution
const projectRoot = path.join(__dirname, "..");
const buildDir = path.join(projectRoot, "build");

// Process English docs
const enDocsDir = path.join(projectRoot, "i18n/en/docusaurus-plugin-content-docs/current");
if (fs.existsSync(enDocsDir)) {
  console.log("Processing English docs...");
  const enDocs = processDocsDirectory(enDocsDir, "en");
  console.log(`Found ${enDocs.length} English documents`);

  const enLlmsTxt = generateLlmsTxt(enDocs, "en");
  const enLlmsFullTxt = generateLlmsFullTxt(enDocs, "en");

  fs.writeFileSync(path.join(buildDir, "llms.txt"), enLlmsTxt);
  fs.writeFileSync(path.join(buildDir, "llms-full.txt"), enLlmsFullTxt);
  console.log("Generated: build/llms.txt, build/llms-full.txt");
} else {
  console.warn("English docs directory not found:", enDocsDir);
}

// Process Japanese docs
const jaDocsDir = path.join(projectRoot, "i18n/ja/docusaurus-plugin-content-docs/current");
if (fs.existsSync(jaDocsDir)) {
  console.log("Processing Japanese docs...");
  const jaDocs = processDocsDirectory(jaDocsDir, "ja");
  console.log(`Found ${jaDocs.length} Japanese documents`);

  const jaLlmsTxt = generateLlmsTxt(jaDocs, "ja");
  const jaLlmsFullTxt = generateLlmsFullTxt(jaDocs, "ja");

  const jaBuildDir = path.join(buildDir, "ja");
  if (!fs.existsSync(jaBuildDir)) {
    fs.mkdirSync(jaBuildDir, { recursive: true });
  }

  fs.writeFileSync(path.join(jaBuildDir, "llms.txt"), jaLlmsTxt);
  fs.writeFileSync(path.join(jaBuildDir, "llms-full.txt"), jaLlmsFullTxt);
  console.log("Generated: build/ja/llms.txt, build/ja/llms-full.txt");
} else {
  console.warn("Japanese docs directory not found:", jaDocsDir);
}

console.log("llms.txt generation complete!");
