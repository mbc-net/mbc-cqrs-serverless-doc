# CLAUDE.md - Project Guidelines for Claude Code

## Translation (i18n) Guidelines

This project uses a placeholder-based translation system for multi-language support.

### Directory Structure

```
docs/                                    # English source documents (with placeholders)
i18n/
  en/translation/                        # English translation JSON files
  ja/translation/                        # Japanese translation JSON files
  ja/docusaurus-plugin-content-docs/current/  # Generated Japanese documents
```

### How Translation Works

1. **English source documents** (`docs/*.md`) use placeholders: `{{text to translate}}`
2. **Translation JSON files** (`i18n/ja/translation/*.json`) map placeholders to translations
3. The `replace-placeholders` script copies English docs and replaces placeholders with translations

### Adding Translations

1. **Add placeholder in English doc** (`docs/example.md`):
   ```markdown
   ---
   description: {{Learn about this feature}}
   ---

   # {{Example Title}}

   {{This is example content.}}
   ```

2. **Add translation to JSON** (`i18n/ja/translation/example.json`):
   ```json
   {
     "Learn about this feature": "この機能について学びます",
     "Example Title": "サンプルタイトル",
     "This is example content.": "これはサンプルコンテンツです。"
   }
   ```

3. **Run translation script**:
   ```bash
   npm run translate:replace-placeholders
   ```

### NPM Scripts

- `npm run translate:extract-placeholder` - Extract placeholders from docs to create/update translation JSON files
- `npm run translate:replace-placeholders` - Generate translated documents by replacing placeholders

### Code Comment Guidelines

Code comments inside code blocks should use placeholders for multi-language support:

- **English version**: Shows English only
- **Japanese version**: Shows `English (日本語)` format

**How to write code comments:**

1. Use placeholders in code comments: `// {{Comment text}}`
2. Add English translation in `i18n/en/translation/*.json`: `"Comment text": "Comment text"`
3. Add Japanese translation in `i18n/ja/translation/*.json`: `"Comment text": "Comment text (日本語説明)"`

**Example in source doc (`docs/example.md`):**
```typescript
const pk = generatePk(tenantCode); // {{Generate partition key}}
```

**Translation JSON files:**
```json
// i18n/en/translation/example.json
{
  "Generate partition key": "Generate partition key"
}

// i18n/ja/translation/example.json
{
  "Generate partition key": "Generate partition key (パーティションキーを生成)"
}
```

**Result after translation:**
```typescript
// English version:
const pk = generatePk(tenantCode); // Generate partition key

// Japanese version:
const pk = generatePk(tenantCode); // Generate partition key (パーティションキーを生成)
```

**For Prisma schema:**
```prisma
// Source:
model Example {
  id         String @id  // {{Primary key}}
  tenantCode String      // {{Tenant code}}
}
```

### Important Notes

- Always use placeholders `{{...}}` in English source documents
- The description in frontmatter should also use placeholders
- English translation JSON (`i18n/en/translation/`) keeps the same text as key and value
- Japanese translation JSON (`i18n/ja/translation/`) maps English text to Japanese translation
- Do NOT directly edit files in `i18n/ja/docusaurus-plugin-content-docs/current/` - they are generated

## Version Change Documentation Guidelines

When documenting breaking changes, bug fixes, or behavior changes in a new version, follow these guidelines:

### 1. Update Changelog (docs/changelog.md)

Add the new version entry at the top of the "Stable Releases" section. **Always add an anchor ID** for cross-linking:

```markdown
## [x.y.z](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/vx.y.z) (YYYY-MM-DD) {#vxyz}

### {{Bug Fixes}}
- **package:** {{Description of the fix}} ([{{See Details}}](./feature.md#section-anchor))

### {{Features}}
- **package:** {{Description of new feature}} ([{{See Details}}](./feature.md#section-anchor))
  - {{Sub-feature 1}}
  - {{Sub-feature 2}}

### {{Security}}
- {{Description of security fix}}

### {{Dependencies}}
- {{Dependency update description}}

### {{Documentation}}
- {{Documentation update description}}
```

**Anchor ID Format:**
- Use `{#vxyz}` format (e.g., `{#v1022}` for v1.0.22)
- This creates a URL like `/docs/changelog#v1022` for cross-linking

### 2. Update Related Documentation

When a behavior change affects an API or feature, update the related documentation file with:

1. **Document Current (Latest) Behavior First**: Always describe the current correct behavior as the main content
2. **Version History Note**: Use appropriate admonition type based on change type
3. **Add Section Anchor**: Add `{#section-name}` for cross-linking from changelog

**Choosing the Right Admonition Type:**

| Change Type | Admonition | Use Case |
|-------------|------------|----------|
| New Feature | `:::info {{Version Note}}` | Feature added in a specific version |
| Bug Fix | `:::warning {{Known Issue (Fixed in vX.Y.Z)}}` | Historical bug that was fixed |
| Breaking Change | `:::danger {{Breaking Change (vX.Y.Z)}}` | API changes requiring code updates |

#### Format for New Features (:::info)

Use this when documenting a new feature that was added in a specific version:

```markdown
## {{Feature Section}} {#feature-section}

{{Description of the feature...}}

:::info {{Version Note}}
{{Feature name (`tool1`, `tool2`, `tool3`) were added in [version X.Y.Z](./changelog#vxyz).}}
:::
```

**Example - New Feature Documentation (v1.0.22):**

```markdown
## {{Code Analysis Tools}} {#code-analysis-tools}

:::info {{Version Note}}
{{Code analysis tools (`mbc_check_anti_patterns`, `mbc_health_check`, `mbc_explain_code`) were added in [version 1.0.22](./changelog#v1022).}}
:::

### {{Anti-Pattern Detection}}

{{The `mbc_check_anti_patterns` tool detects common code issues:}}
...
```

#### Format for Bug Fixes (:::warning)

Use this when documenting a bug that was fixed:

```markdown
#### `methodName(param: Type): ReturnType`

{{Current behavior description - this is how it works now}}

\`\`\`ts
// {{Example showing current correct behavior}}
\`\`\`

:::warning {{Known Issue (Fixed in vX.Y.Z)}}
{{In versions prior to vX.Y.Z, there was a bug/issue where...}}

{{Example of the problematic behavior or impact}}

{{See also:}} [{{Changelog vX.Y.Z}}](./changelog#vxyz)
:::
```

**Example - Bug Fix Documentation:**

```markdown
| `settingCode` | `string` | {{Exact match}} | {{Filter by master type code}} |

:::warning {{Known Issue (Fixed in v1.0.17)}}
{{In versions prior to v1.0.17, the `settingCode` parameter used partial matching (`contains`) instead of exact matching. This caused unintended results when searching - for example, searching for "PRODUCT" would also return "PRODUCT_TYPE" and "MY_PRODUCT".}}

{{If you are using v1.0.16 or earlier and need exact matching, upgrade to v1.0.17 or later.}}

{{See also:}} [{{Changelog v1.0.17}}](./changelog#v1017)
:::
```

**Key Principles:**
- **Latest behavior is the truth**: Document the current, correct behavior as the main content
- **Historical issues are notes**: Past bugs/issues go in admonition blocks, not as primary documentation
- **Upgrade guidance**: When mentioning past issues, provide guidance on which version to upgrade to
- **Cross-linking**: Always create bidirectional links between changelog and feature documentation
- **Anchor IDs**: Add `{#section-name}` to section headings for cross-linking

### 2.5 Cross-Linking Between Changelog and Documentation

Always create bidirectional links between the changelog and the related feature documentation:

**In Changelog (`docs/changelog.md`):**
```markdown
## [1.0.22](...) (2026-01-16) {#v1022}

### {{Features}}
- **mcp-server:** {{Add code analysis tools}} ([{{See Details}}](./mcp-server#code-analysis-tools))
```

**In Feature Documentation (e.g., `docs/mcp-server.md`):**
```markdown
## {{Code Analysis Tools}} {#code-analysis-tools}

:::info {{Version Note}}
{{Code analysis tools were added in [version 1.0.22](./changelog#v1022).}}
:::
```

**Link Format:**
- Changelog to feature: `(./feature#section-anchor)` - links to the specific section (no `.md` extension)
- Feature to changelog: `(./changelog#vxyz)` - links to the version heading (e.g., `#v1022` for v1.0.22)

**Anchor Naming Convention:**
- Changelog: `{#v1022}` (version number without dots)
- Feature sections: `{#feature-name}` (kebab-case, descriptive)

### 3. Add Japanese Translations

For each new entry, add translations to:
- `i18n/ja/translation/changelog.json` for changelog entries
- `i18n/ja/translation/<feature>.json` for feature documentation

### 4. Checklist for Version Change Documentation

- [ ] Add entry to `docs/changelog.md` with anchor ID (e.g., `{#v1022}`)
- [ ] Update related feature documentation:
  - [ ] Add section anchor (e.g., `{#code-analysis-tools}`)
  - [ ] Add version note: `:::info` for new features, `:::warning` for bug fixes
- [ ] Create bidirectional cross-links:
  - [ ] Changelog → Feature: `([{{See Details}}](./feature#section-anchor))`
  - [ ] Feature → Changelog: `[version X.Y.Z](./changelog#vxyz)`
- [ ] Add Japanese translations:
  - [ ] `i18n/ja/translation/changelog.json`
  - [ ] `i18n/ja/translation/<feature>.json`
  - [ ] `i18n/en/translation/*.json` (English keys = values)
- [ ] Run `npm run translate:replace-placeholders` to generate Japanese docs
- [ ] Build and verify (`npm run build`):
  - [ ] Cross-links work in English version
  - [ ] Cross-links work in Japanese version
  - [ ] Anchors scroll to correct sections
- [ ] Create WordPress blog post (see [WordPress Blog Posting Guidelines](#wordpress-blog-posting-guidelines))

## WordPress Blog Posting Guidelines

When releasing a new version, create a blog post on the MBC WordPress site to announce the release.

### WordPress API Configuration

The WordPress credentials are stored in `wordpress-sites.json` at the project root:

```json
{
  "sites": [
    {
      "name": "MBC Net",
      "url": "https://www.mbc-net.com",
      "username": "mbc-net",
      "password": "APPLICATION_PASSWORD"
    }
  ]
}
```

### Posting via REST API

Use the WordPress REST API to create posts:

```javascript
const https = require('https');

const postData = JSON.stringify({
  title: '[Update] MBC CQRS サーバーレス フレームワーク vX.Y.Z をリリース',
  content: '<!-- wp:paragraph -->\n<p>Content here...</p>\n<!-- /wp:paragraph -->',
  status: 'publish',
  categories: [1],  // Uncategorized or appropriate category
  tags: [37, 27, 29, 30, 31, 73],  // mbc-cqrs-serverless, cqrs, framework, aws, npm, 更新情報
  featured_media: 404  // MBC-CQRS-サーバーレス フレームワーク
});

const options = {
  hostname: 'www.mbc-net.com',
  port: 443,
  path: '/wp-json/wp/v2/posts',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + Buffer.from('username:password').toString('base64')
  }
};
```

### Blog Post Template

Use this format for release announcements:

```html
<!-- wp:paragraph -->
<p>MBC CQRS サーバーレス フレームワーク vX.Y.Z をリリースしました。</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">主な変更点</h2>
<!-- /wp:heading -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">バグ修正</h3>
<!-- /wp:heading -->

<!-- wp:list -->
<ul class="wp-block-list">
<li><strong>package:</strong> Description of fix</li>
</ul>
<!-- /wp:list -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">セキュリティ</h3>
<!-- /wp:heading -->

<!-- wp:list -->
<ul class="wp-block-list">
<li>Security fix description</li>
</ul>
<!-- /wp:list -->

<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">アップグレード方法</h2>
<!-- /wp:heading -->

<!-- wp:code -->
<pre class="wp-block-code"><code>npm install @mbc-cqrs-serverless/core@X.Y.Z</code></pre>
<!-- /wp:code -->

<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">関連リンク</h2>
<!-- /wp:heading -->

<!-- wp:list -->
<ul class="wp-block-list">
<li><a href="https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/vX.Y.Z">GitHub Release</a></li>
<li><a href="https://mbc-cqrs-serverless.mbc-net.com/docs/changelog">変更履歴</a></li>
<li><a href="https://www.npmjs.com/package/@mbc-cqrs-serverless/core">npm パッケージ</a></li>
</ul>
<!-- /wp:list -->
```

### Available Tags and Media

**Common Tags for MBC CQRS Serverless:**
| ID | Tag Name |
|----|----------|
| 37 | mbc-cqrs-serverless |
| 27 | cqrs |
| 29 | framework |
| 30 | aws |
| 31 | npm |
| 73 | 更新情報 |

**Featured Image for Release Posts:**
| ID | Image Name | Description |
|----|------------|-------------|
| 404 | MBC-CQRS-サーバーレス フレームワーク | Standard release announcement image |

**Other Available Images:**
| ID | Image Name | Description |
|----|------------|-------------|
| 1001 | serverless-architecture | Architecture diagram |
| 1002 | package-structure | Package structure diagram |
| 1005 | three-steps-v2 | Three steps illustration |

To list all tags: `curl -s "https://www.mbc-net.com/wp-json/wp/v2/tags?per_page=50&_fields=id,name"`

To list all media: `curl -s "https://www.mbc-net.com/wp-json/wp/v2/media?per_page=20&_fields=id,title,source_url"`

### Blog Post Checklist

- [ ] Create blog post with version number in title
- [ ] Include all major changes from changelog
- [ ] Add upgrade instructions with correct version
- [ ] Include links to GitHub release, changelog, and npm
- [ ] Set tags (mbc-cqrs-serverless, cqrs, framework, aws, npm, 更新情報)
- [ ] Set featured image (アイキャッチ画像)
- [ ] Verify post is published and accessible
