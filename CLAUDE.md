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

Add the new version entry at the top of the "Stable Releases" section:

```markdown
## [x.y.z](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/vx.y.z) (YYYY-MM-DD)

### {{Bug Fixes}}
- **package:** {{Description of the fix}}

### {{Features}}
- {{Description of new feature}}

### {{Security}}
- {{Description of security fix}}

### {{Dependencies}}
- {{Dependency update description}}

### {{Documentation}}
- {{Documentation update description}}
```

### 2. Update Related Documentation

When a behavior change affects an API or feature, update the related documentation file with:

1. **Document Current (Latest) Behavior First**: Always describe the current correct behavior as the main content
2. **Version History Note**: Use `:::info` or `:::warning` admonition to mention historical bugs or behavior changes
3. **Focus on "What Was Fixed"**: Explain the previous issue/bug, not the old behavior as a feature

**Best Practice Format:**

```markdown
#### `methodName(param: Type): ReturnType`

{{Current behavior description - this is how it works now}}

\`\`\`ts
// {{Example showing current correct behavior}}
\`\`\`

:::warning {{Known Issue (Fixed in vX.Y.Z)}}
{{In versions prior to vX.Y.Z, there was a bug/issue where...}}

{{Example of the problematic behavior or impact}}
:::
```

**Example - Bug Fix Documentation:**

```markdown
| `settingCode` | `string` | {{Exact match}} | {{Filter by master type code}} |

:::warning {{Known Issue (Fixed in v1.0.17)}}
{{In versions prior to v1.0.17, the `settingCode` parameter used partial matching (`contains`) instead of exact matching. This caused unintended results when searching - for example, searching for "PRODUCT" would also return "PRODUCT_TYPE" and "MY_PRODUCT".}}

{{If you are using v1.0.16 or earlier and need exact matching, upgrade to v1.0.17 or later.}}
:::
```

**Key Principles:**
- **Latest behavior is the truth**: Document the current, correct behavior as the main content
- **Historical issues are notes**: Past bugs/issues go in admonition blocks, not as primary documentation
- **Upgrade guidance**: When mentioning past issues, provide guidance on which version to upgrade to
- **Cross-linking**: Always create bidirectional links between changelog and feature documentation

### 2.5 Cross-Linking Between Changelog and Documentation

Always create bidirectional links between the changelog and the related feature documentation:

**In Changelog (`docs/changelog.md`):**
```markdown
- **package:** {{Description of the fix}} ([{{See Details}}](./feature.md#section-anchor))
```

**In Feature Documentation (`docs/feature.md`):**
```markdown
:::warning {{Known Issue (Fixed in vX.Y.Z)}}
{{Description of the issue...}}

{{See also:}} [{{Changelog vX.Y.Z}}](./changelog.md#xyz)
:::
```

**Link Format:**
- Changelog to feature: `(./feature.md#section-anchor)` - links to the specific section
- Feature to changelog: `(./changelog.md#xyz)` - links to the version heading (e.g., `#1017` for v1.0.17)

### 3. Add Japanese Translations

For each new entry, add translations to:
- `i18n/ja/translation/changelog.json` for changelog entries
- `i18n/ja/translation/<feature>.json` for feature documentation

### 4. Checklist for Version Change Documentation

- [ ] Add entry to `docs/changelog.md` with all changes categorized
- [ ] Update related feature documentation with version history note (:::warning block)
- [ ] Create cross-links between changelog and feature documentation
  - [ ] Changelog → Feature doc: Add `([{{See Details}}](./feature.md#section))` link
  - [ ] Feature doc → Changelog: Add `{{See also:}} [{{Changelog vX.Y.Z}}](./changelog.md#xyz)` link
- [ ] Add Japanese translations to changelog.json
- [ ] Add Japanese translations to related feature translation files
- [ ] Run `npm run translate:replace-placeholders` to generate Japanese docs
- [ ] Verify generated Japanese documentation is correct
- [ ] Verify all cross-links work correctly in both languages
