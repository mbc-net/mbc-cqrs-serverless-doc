---
sidebar_position: 101
sidebar_label: "Frontend (Web)"
description: {{Track all notable changes, new features, and bug fixes in MBC CQRS Serverless Web packages.}}
---

# {{Web Packages Changelog}}

{{All notable changes to the Web packages (`@mbc-cqrs-serverless/master-web`, `@mbc-cqrs-serverless/survey-web`) are documented here.}}

{{For backend framework changes, see [Changelog](/docs/changelog).}}

---

## [0.0.42](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.41...v0.0.42) (2026-02-11) {#v0042}

### {{master-web}}

#### {{Bug Fixes}}

- {{Externalize React/Next.js peer dependencies to resolve Context isolation issue}} ([{{See Details}}](/docs/master-web#nextjs-app-router-integration)) ([PR #23](https://github.com/mbc-net/mbc-cqrs-serverless-web/pull/23))
  - {{React, React DOM, and Next.js are now listed as `peerDependencies` instead of bundled dependencies}}
  - {{This ensures the host application's React instance is shared, preventing duplicate React contexts}}
  - {{Resolves `httpClient.get is not a function` errors caused by context isolation in npm packages}}
- {{Fix `useSubscribeBulkCommandStatus` infinite re-render loop}}
  - {{Stabilized hook dependencies to prevent unnecessary re-renders when listening for bulk command status updates}}
- {{Fix DragResizeModal and AddJsonData layout issues}}
  - {{Corrected layout rendering for modal resize handles and JSON data import form}}

#### {{Tests}}

- {{Migrate test framework from Vitest to Jest (87 tests)}}
  - {{All existing tests converted to Jest syntax and passing}}
  - {{Added comprehensive test coverage for hooks and components}}

### {{survey-web}}

#### {{Bug Fixes}}

- {{Externalize React and React DOM peer dependencies to resolve Context isolation issue}} ([PR #23](https://github.com/mbc-net/mbc-cqrs-serverless-web/pull/23))
  - {{Same fix as master-web: ensures shared React instance with host application}}

#### {{Tests}}

- {{Migrate test framework from Vitest to Jest}}
  - {{Test infrastructure aligned with master-web for consistency}}

---

## [0.0.41](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.40...v0.0.41) (2026-02-10) {#v0041}

### {{Features}}

- **master-web:** {{Update RichTextEditor and field-editor with enhanced toolbar options and color palette}}

---

## [0.0.40](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.39...v0.0.40) (2026-01-27) {#v0040}

### {{Features}}

- **master-web:** {{Enhance ReactQuill integration with custom block registration}}

---

## [0.0.39](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.38...v0.0.39) (2025-12-18) {#v0039}

### {{Bug Fixes}}

- **survey-web:** {{Fix Japanese text display issues}}

### {{Features}}

- **survey-web:** {{Add regex validation logic for survey questions}}

---

## [0.0.38](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.37...v0.0.38) (2025-12-18) {#v0038}

### {{Features}}

- **survey-web:** {{Show confirmation modal when navigating away with unsaved schema changes}}

---

## [0.0.37](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.36...v0.0.37) (2025-12-17) {#v0037}

### {{Features}}

- **survey-web:** {{Implement type-specific field clearing in QuestionCreator}}
- **survey-web:** {{Add Japanese text localization, "Other" option support, and CSS improvements}}

---

## [0.0.36](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.35...v0.0.36) (2025-12-15) {#v0036}

### {{Bug Fixes}}

- **survey-web:** {{Set default validation rule for short text and long text question creators}}

---

## [0.0.35](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.34...v0.0.35) (2025-12-14) {#v0035}

### {{Features}}

- **survey-web:** {{Add number validation rule for short text questions}}

---

## [0.0.34](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.33...v0.0.34) (2025-12-12) {#v0034}

### {{Bug Fixes}}

- **survey-web:** {{Fix value number handling and survey creator export}}

### {{Features}}

- **survey-web:** {{Export survey creator component for external use}}

---

## [0.0.33](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.32...v0.0.33) (2025-12-08) {#v0033}

### {{Features}}

- **survey-web:** {{Localize long text, short text, date, and linear scale validation options and placeholders in Japanese}}

---

## [0.0.32](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.31...v0.0.32) (2025-11-25) {#v0032}

### {{Features}}

- **survey-web:** {{Synchronize question ID with label and update routing paths to admin section}}

---

## [0.0.31](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.30...v0.0.31) (2025-11-19) {#v0031}

### {{Bug Fixes}}

- **master-web:** {{Update error messages for regex validation to be more user-friendly in EditMasterData component}}

---

## [0.0.30](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.29...v0.0.30) (2025-11-14) {#v0030}

### {{Features}}

- **master-web:** {{Implement helper function to build attributes object for master data form}}

---

## [0.0.29](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.28...v0.0.29) (2025-11-12) {#v0029}

### {{Features}}

- **master-web:** {{Add clear button functionality to MasterData and MasterSetting components}}

---

## [0.0.28](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.27...v0.0.28) (2025-11-11) {#v0028}

### {{Features}}

- **master-web:** {{Add regex pattern validation and input field for string data type in AddFieldsForm}}

---

## [0.0.27](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.26...v0.0.27) (2025-11-10) {#v0027}

### {{Features}}

- **master-web:** {{Add error handling for API responses in AddJsonData component}}
- **master-web:** {{Improve ImportJSONButton to handle file reading errors and allow re-selection of the same file}}

---

## [0.0.26](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.25...v0.0.26) (2025-11-10) {#v0026}

### {{Features}}

- **survey-web:** {{Enhance SurveyForm component with children support and disabled state handling}}

---

## [0.0.25](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.24...v0.0.25) (2025-11-06) {#v0025}

### {{Features}}

- **survey-web:** {{Update Japanese placeholder text in dropdown and long-text components}}

---

## [0.0.24](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.23...v0.0.24) (2025-11-06) {#v0024}

### {{Features}}

- **survey-web:** {{Update options handling in OptionsCreator to synchronize label and value fields}}

---

## [0.0.23](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.22...v0.0.23) (2025-11-04) {#v0023}

### {{Features}}

- **master-web:** {{Enhance AddJsonData component with mapping functionality and validation for bulk data import}}

---

## [0.0.22](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.21...v0.0.22) (2025-10-31) {#v0022}

### {{Features}}

- **master-web:** {{Enhance master setting import data and setting functionality}}

---

## [0.0.21](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.20...v0.0.21) (2025-10-29) {#v0021}

### {{Features}}

- **master-web:** {{Enhance master settings with bulk import support}}
- **master-web:** {{Implement bulk command status hook and update components for bulk data import}}

---

## [0.0.17](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.15...v0.0.17) (2025-10-16) {#v0017}

### {{Features}}

- {{Initial monorepo setup with master-web and survey-web packages}}
- **master-web:** {{Migrate to new monorepo file structure}}
- **survey-web:** {{Initial survey library implementation}}

### {{Bug Fixes}}

- {{Resolve dependency conflicts in package-lock.json}}
- {{Resolve picomatch dependency conflicts using npm overrides}}
- {{Correct version numbering and improve Lerna workflow}}

---

## {{Related Links}}

- [GitHub Repository](https://github.com/mbc-net/mbc-cqrs-serverless-web)
- [master-web npm Package](https://www.npmjs.com/package/@mbc-cqrs-serverless/master-web)
- [survey-web npm Package](https://www.npmjs.com/package/@mbc-cqrs-serverless/survey-web)
- [{{Master Web Documentation}}](/docs/master-web)
- [{{Survey Web Documentation}}](/docs/survey-web)
