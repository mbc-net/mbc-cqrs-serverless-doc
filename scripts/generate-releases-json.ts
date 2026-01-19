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

function parseChangelog(content: string): Release[] {
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

  // Parse each release section
  for (let i = 0; i < matches.length && i < 5; i++) {
    const current = matches[i];
    const nextIndex = matches[i + 1]?.index || content.length;
    const section = content.substring(current.index, nextIndex);

    const features: string[] = [];
    const bugFixes: string[] = [];
    const security: string[] = [];

    // Parse features
    const featuresMatch = section.match(/### \{\{Features\}\}([\s\S]*?)(?=###|\n---|\n## |$)/);
    if (featuresMatch) {
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

    // Parse bug fixes
    const bugFixesMatch = section.match(/### \{\{Bug Fixes\}\}([\s\S]*?)(?=###|\n---|\n## |$)/);
    if (bugFixesMatch) {
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

    // Parse security
    const securityMatch = section.match(/### \{\{Security\}\}([\s\S]*?)(?=###|\n---|\n## |$)/);
    if (securityMatch) {
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

function main() {
  const changelogPath = path.join(__dirname, '..', 'docs', 'changelog.md');
  const outputPath = path.join(__dirname, '..', 'static', 'api', 'releases.json');

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read and parse changelog
  const content = fs.readFileSync(changelogPath, 'utf-8');
  const releases = parseChangelog(content);

  if (releases.length === 0) {
    console.error('No releases found in changelog');
    process.exit(1);
  }

  const data: ReleasesData = {
    latest: releases[0],
    recent: releases.slice(0, 4),
    generated: new Date().toISOString()
  };

  // Write JSON with CORS-friendly format
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`Generated: ${outputPath}`);
  console.log(`Latest release: v${data.latest.version} (${data.latest.date})`);
  console.log(`Total releases included: ${data.recent.length}`);
}

main();
