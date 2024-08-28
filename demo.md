Demo:

1. Base support EN language

- Write markdown with placeholder
- Extract placeholder to json (EN language)
  - command: npm run translate:extract-placeholder en
- Replace placeholder in markdown with EN content
  - command: npm run translate:replace-placeholders en
- Build and serve (Only EN language)
  - command: npm run build + npm run serve

2. Support JA language: We does not translate and the content will fallback to EN

- Add ja to docusaurus.config.ts
- Replace placeholder with command:
  - command: npm run translate:replace-placeholders ja
- Build and serve (Only EN language)
  - command: npm run build + npm run serve

3. Support JA language: translate file does not complete (if miss -> use EN language)

- Extract placeholder to json (JA language) -> translate
  - command: npm run translate:extract-placeholder ja
- Replace placeholder in markdown with EN content
  - command: npm run translate:replace-placeholders ja
- Build and serve
  - command: npm run build + npm run serve

4. Fully translate to JA

5. Add update new content. If other language does not translate, the content will fallback to EN language

- Update markdown with placeholder
- Extract placeholder to json (EN language)
  - command: npm run translate:extract-placeholder en
- Replace placeholder in markdown with EN content
  - command: npm run translate:replace-placeholders en
- Also, replace placeholder with other language
  - command: npm run translate:replace-placeholders ja
- Build and serve
  - command: npm run build + npm run serve











{
"title": "Introduction to MBC CQRS Framework",
"description": "This is the original content in English."
}

{
"title": "Installation",
"description": "This is content!!"
}

{
"title": "MBC CQRS フレームワークの紹介",
"description": "これは英語のオリジナル コンテンツです。"
}

{
"title": "インストール",
"description": "これはコンテンツです!!"
}
