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
