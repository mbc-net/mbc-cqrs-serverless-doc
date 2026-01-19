/**
 * Generate releases.json from changelog.md
 * This script parses the changelog and outputs a JSON file with release information
 * that can be fetched by external sites (e.g., WordPress service page)
 */

import * as fs from 'fs';
import * as path from 'path';

interface Release {
  version: string;
  date: string;
  url: string;
  features: string[];
  bugFixes: string[];
  security: string[];
}

interface ReleasesData {
  latest: Release;
  recent: Release[];
  generated: string;
}

function parseChangelog(content: string, isJapanese: boolean = false): Release[] {
  const releases: Release[] = [];

  // Match release headers: ## [1.0.25](url) (2026-01-19) {#v1025}
  const releaseRegex = /## \[(\d+\.\d+\.\d+)\]\((https:\/\/[^)]+)\) \((\d{4}-\d{2}-\d{2})\)/g;

  let match;
  const matches: { version: string; url: string; date: string; index: number }[] = [];

  while ((match = releaseRegex.exec(content)) !== null) {
    matches.push({
      version: match[1],
      url: match[2],
      date: match[3],
      index: match.index
    });
  }

  // Section headers differ between English (placeholder) and Japanese (translated)
  const featuresHeader = isJapanese ? '### 新機能' : '### \\{\\{Features\\}\\}';
  const bugFixesHeader = isJapanese ? '### バグ修正' : '### \\{\\{Bug Fixes\\}\\}';
  const securityHeader = isJapanese ? '### セキュリティ' : '### \\{\\{Security\\}\\}';

  // Parse each release section
  for (let i = 0; i < matches.length && i < 5; i++) {
    const current = matches[i];
    const nextIndex = matches[i + 1]?.index || content.length;
    const section = content.substring(current.index, nextIndex);

    const features: string[] = [];
    const bugFixes: string[] = [];
    const security: string[] = [];

    // Parse features
    const featuresRegex = new RegExp(featuresHeader + '([\\s\\S]*?)(?=###|\\n---|\\n## |$)');
    const featuresMatch = section.match(featuresRegex);
    if (featuresMatch) {
      if (isJapanese) {
        // Japanese: - **package:** Description ([link])
        const featureLines = featuresMatch[1].match(/^- \*\*[^:]+:\*\* ([^\n]+)/gm);
        if (featureLines) {
          featureLines.forEach(line => {
            const textMatch = line.match(/^- \*\*[^:]+:\*\* (.+?)(?:\s*\(\[|$)/);
            if (textMatch) {
              features.push(textMatch[1].trim());
            }
          });
        }
      } else {
        // English with placeholders
        const featureLines = featuresMatch[1].match(/^- \*\*[^:]+:\*\* \{\{([^}]+)\}\}/gm);
        if (featureLines) {
          featureLines.forEach(line => {
            const textMatch = line.match(/\{\{([^}]+)\}\}/);
            if (textMatch) {
              features.push(textMatch[1]);
            }
          });
        }
      }
    }

    // Parse bug fixes
    const bugFixesRegex = new RegExp(bugFixesHeader + '([\\s\\S]*?)(?=###|\\n---|\\n## |$)');
    const bugFixesMatch = section.match(bugFixesRegex);
    if (bugFixesMatch) {
      if (isJapanese) {
        const bugLines = bugFixesMatch[1].match(/^- \*\*[^:]+:\*\* ([^\n]+)/gm);
        if (bugLines) {
          bugLines.forEach(line => {
            const textMatch = line.match(/^- \*\*[^:]+:\*\* (.+?)(?:\s*\(\[|$)/);
            if (textMatch) {
              bugFixes.push(textMatch[1].trim());
            }
          });
        }
      } else {
        const bugLines = bugFixesMatch[1].match(/^- \*\*[^:]+:\*\* \{\{([^}]+)\}\}/gm);
        if (bugLines) {
          bugLines.forEach(line => {
            const textMatch = line.match(/\{\{([^}]+)\}\}/);
            if (textMatch) {
              bugFixes.push(textMatch[1]);
            }
          });
        }
      }
    }

    // Parse security
    const securityRegex = new RegExp(securityHeader + '([\\s\\S]*?)(?=###|\\n---|\\n## |$)');
    const securityMatch = section.match(securityRegex);
    if (securityMatch) {
      if (isJapanese) {
        const secLines = securityMatch[1].match(/^- ([^\n]+)/gm);
        if (secLines) {
          secLines.forEach(line => {
            const textMatch = line.match(/^- (.+)/);
            if (textMatch) {
              security.push(textMatch[1].trim());
            }
          });
        }
      } else {
        const secLines = securityMatch[1].match(/^- \{\{([^}]+)\}\}/gm);
        if (secLines) {
          secLines.forEach(line => {
            const textMatch = line.match(/\{\{([^}]+)\}\}/);
            if (textMatch) {
              security.push(textMatch[1]);
            }
          });
        }
      }
    }

    releases.push({
      version: current.version,
      date: current.date,
      url: current.url,
      features,
      bugFixes,
      security
    });
  }

  return releases;
}

function generateReleasesJson(changelogPath: string, outputPath: string, isJapanese: boolean, label: string) {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read and parse changelog
  const content = fs.readFileSync(changelogPath, 'utf-8');
  const releases = parseChangelog(content, isJapanese);

  if (releases.length === 0) {
    console.error(`No releases found in ${label} changelog`);
    return false;
  }

  const data: ReleasesData = {
    latest: releases[0],
    recent: releases.slice(0, 4),
    generated: new Date().toISOString()
  };

  // Write JSON
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`Generated: ${outputPath}`);
  console.log(`  Latest release: v${data.latest.version} (${data.latest.date})`);
  console.log(`  Total releases: ${data.recent.length}`);
  return true;
}

function main() {
  // English version
  const enChangelogPath = path.join(__dirname, '..', 'docs', 'changelog.md');
  const enOutputPath = path.join(__dirname, '..', 'static', 'api', 'releases.json');
  generateReleasesJson(enChangelogPath, enOutputPath, false, 'English');

  // Japanese version
  const jaChangelogPath = path.join(__dirname, '..', 'i18n', 'ja', 'docusaurus-plugin-content-docs', 'current', 'changelog.md');
  const jaOutputPath = path.join(__dirname, '..', 'static', 'api', 'releases-ja.json');

  if (fs.existsSync(jaChangelogPath)) {
    generateReleasesJson(jaChangelogPath, jaOutputPath, true, 'Japanese');
  } else {
    console.log('Japanese changelog not found, skipping...');
  }
}

main();
