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

/**
 * Parse web-changelog.md which uses a different format:
 * - Sub-package headers: ### {{master-web}} / ### {{survey-web}}
 * - 4th-level section headers: #### {{Bug Fixes}}, #### {{Features}}, #### {{Tests}}, #### {{CI/CD}}, #### {{Documentation}}
 * - Items without package prefix: - {{text}} or - {{text}} ([PR #N](url))
 */
function parseWebChangelog(content: string, isJapanese: boolean = false): Release[] {
  const releases: Release[] = [];

  // Match release headers: ## [0.0.43](url) (2026-02-26) {#v0043}
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

  // Section headers for web changelog (uses #### for sub-sections)
  const featuresHeader = isJapanese ? '#{3,4} 機能' : '#{3,4} \\{\\{Features\\}\\}';
  const bugFixesHeader = isJapanese ? '#{3,4} バグ修正' : '#{3,4} \\{\\{Bug Fixes\\}\\}';
  const testsHeader = isJapanese ? '#{3,4} テスト' : '#{3,4} \\{\\{Tests\\}\\}';
  const cicdHeader = isJapanese ? '#{3,4} CI/CD' : '#{3,4} \\{\\{CI/CD\\}\\}';
  const docHeader = isJapanese ? '#{3,4} ドキュメント' : '#{3,4} \\{\\{Documentation\\}\\}';

  for (let i = 0; i < matches.length && i < 5; i++) {
    const current = matches[i];
    const nextIndex = matches[i + 1]?.index || content.length;
    const section = content.substring(current.index, nextIndex);

    const features: string[] = [];
    const bugFixes: string[] = [];
    const security: string[] = []; // Web packages don't typically have security fixes, kept for interface compatibility

    // Helper to extract items from a section
    const extractItems = (headerPattern: string): string[] => {
      const items: string[] = [];
      const regex = new RegExp(headerPattern + '([\\s\\S]*?)(?=#{3,4} |\\n---|\\n## |$)');
      const sectionMatch = section.match(regex);
      if (!sectionMatch) return items;

      const sectionContent = sectionMatch[1];
      if (isJapanese) {
        // Japanese: top-level items only (- text), skip sub-items (  - text)
        const lines = sectionContent.match(/^- ([^\n]+)/gm);
        if (lines) {
          lines.forEach(line => {
            const textMatch = line.match(/^- (.+?)(?:\s*\(\[|$)/);
            if (textMatch) {
              items.push(textMatch[1].trim());
            }
          });
        }
      } else {
        // English with placeholders: - {{text}} or - **pkg:** {{text}}
        const lines = sectionContent.match(/^- (?:\*\*[^:]+:\*\* )?\{\{([^}]+)\}\}/gm);
        if (lines) {
          lines.forEach(line => {
            const textMatch = line.match(/\{\{([^}]+)\}\}/);
            if (textMatch) {
              items.push(textMatch[1]);
            }
          });
        }
      }
      return items;
    };

    // Parse each section type
    features.push(...extractItems(featuresHeader));
    bugFixes.push(...extractItems(bugFixesHeader));

    // Tests, CI/CD, Documentation go into features for display purposes
    const tests = extractItems(testsHeader);
    const cicd = extractItems(cicdHeader);
    const docs = extractItems(docHeader);

    if (tests.length > 0) features.push(...tests);
    if (cicd.length > 0) features.push(...cicd);
    if (docs.length > 0) features.push(...docs);

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

function generateWebReleasesJson(changelogPath: string, outputPath: string, isJapanese: boolean, label: string) {
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const content = fs.readFileSync(changelogPath, 'utf-8');
  const releases = parseWebChangelog(content, isJapanese);

  if (releases.length === 0) {
    console.error(`No releases found in ${label} web changelog`);
    return false;
  }

  const data: ReleasesData = {
    latest: releases[0],
    recent: releases.slice(0, 4),
    generated: new Date().toISOString()
  };

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`Generated: ${outputPath}`);
  console.log(`  Latest web release: v${data.latest.version} (${data.latest.date})`);
  console.log(`  Total web releases: ${data.recent.length}`);
  return true;
}

function main() {
  // === Backend Framework Releases ===
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

  // === Web Package Releases ===
  // English version
  const webEnChangelogPath = path.join(__dirname, '..', 'docs', 'web-changelog.md');
  const webEnOutputPath = path.join(__dirname, '..', 'static', 'api', 'web-releases.json');

  if (fs.existsSync(webEnChangelogPath)) {
    generateWebReleasesJson(webEnChangelogPath, webEnOutputPath, false, 'Web English');
  } else {
    console.log('Web English changelog not found, skipping...');
  }

  // Japanese version
  const webJaChangelogPath = path.join(__dirname, '..', 'i18n', 'ja', 'docusaurus-plugin-content-docs', 'current', 'web-changelog.md');
  const webJaOutputPath = path.join(__dirname, '..', 'static', 'api', 'web-releases-ja.json');

  if (fs.existsSync(webJaChangelogPath)) {
    generateWebReleasesJson(webJaChangelogPath, webJaOutputPath, true, 'Web Japanese');
  } else {
    console.log('Web Japanese changelog not found, skipping...');
  }
}

main();
