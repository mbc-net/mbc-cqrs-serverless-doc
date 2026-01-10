---
sidebar_position: 100
description: {{Track all notable changes, new features, and bug fixes in MBC CQRS Serverless releases.}}
---

# {{Changelog}}

{{All notable changes to MBC CQRS Serverless are documented here. This project follows [Semantic Versioning](https://semver.org/) and [Conventional Commits](https://conventionalcommits.org/).}}

## {{Version Scheme}}

- `x.y.z` - {{Production releases}}
- `x.y.z-beta.n` - {{Beta releases for testing}}
- `x.y.z-alpha.n` - {{Alpha releases for early access}}

---

## {{Stable Releases (1.x)}}

## [1.0.18](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.18) {#v1018}

### {{Bug Fixes}}

- **import:** {{Add `SendTaskFailure` support to `ImportStatusHandler` for proper Step Functions error handling}}
  - {{Previously, when an import job failed, the Step Function would wait indefinitely because only `SendTaskSuccess` was implemented}}
  - {{Now the handler properly sends `SendTaskFailure` when a job fails, allowing Step Functions to handle errors correctly}}
  - {{Added `sendTaskFailure()` method to send `SendTaskFailureCommand`}}
  - {{Handler now processes both `COMPLETED` and `FAILED` statuses for CSV import jobs}}
  - {{See [ImportStatusHandler API](./import-export-patterns#importstatushandler-api) for details}}

---

## [1.0.17](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.17) (2026-01-08) {#v1017}

### {{Bug Fixes}}

- **master:** {{Fix `masterTypeCode` comparison in `MasterDataService.search()` - Changed from partial match (`contains`) to exact match for `settingCode` search parameter}} ([{{See Details}}](./master.md#search-parameters))
- **cli:** {{Stabilize AbstractRunner tests by removing setTimeout to fix flaky CI failures}}

### {{Security}}

- {{Fix security vulnerabilities in dependencies: jws (HMAC signature verification issue), nodemailer (DoS vulnerability)}}

### {{Dependencies}}

- {{Bump validator from 13.15.20 to 13.15.26}}
- {{Bump @modelcontextprotocol/sdk from 1.25.1 to 1.25.2}}

### {{Documentation}}

- {{Update README files for all packages with comprehensive API references and usage examples}}
- {{Fix `createTenantGroup` parameter name in tenant package README}}
- {{Update Japanese guide links to official documentation}}

---

## [1.0.16](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.16) (2025-12-31)

### {{Bug Fixes}}

- **cli:** {{Add cleanup for test-generated files and update .gitignore}}
- **master, directory, task, cli:** {{Improve error messages for better clarity}}

### {{Features}}

- {{Include __s3Key in attributes for import creation}}
- {{Zip mode provide table name}}
- {{Add optional s3Key to CreateImportDto}}

---

## [1.0.15](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.15) (2025-12-31)

### {{Bug Fixes}}

- **ui-setting:** {{Improve error messages for better clarity}}
- **mcp-server:** {{Use MBC_PROJECT_PATH for ERROR_CATALOG.md lookup}}

---

## [1.0.14](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.14) (2025-12-29)

### {{Features}}

- **mcp-server:** {{Add MCP server package for AI tool integration}}

### {{Documentation}}

- {{Add comprehensive error message catalog}}
- {{Add JSDoc comments to core interfaces}}
- {{Add operational documentation (FAQ, troubleshooting, security)}}
- {{Add AI-friendly documentation files}}

---

## [1.0.13](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.13) (2025-12-26)

### {{Features}}

- {{Enhance CreateZipImportDto and ZipImportQueueEventHandler}}

---

## [1.0.12](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.12) (2025-12-23)

### {{Bug Fixes}}

- {{Merge tenant attributes in TenantService}}

---

## [1.0.11](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.11) (2025-12-22)

### {{Bug Fixes}}

- {{Handle unknown source IP in SequencesService}}

---

## [1.0.10](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.10) (2025-11-28)

### {{Bug Fixes}}

- {{Fix createTenantGroup method in TenantService}}

---

## [1.0.9](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.9) (2025-11-26)

### {{Bug Fixes}}

- {{Remove callback parameter from Lambda handler for Node.js 24 compatibility}}

---

## [1.0.8](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.8) (2025-11-17)

### {{Security}}

- {{Bump jws dependency for security fix}}

---

## [1.0.7](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.7) (2025-11-07)

### {{Security}}

- {{Bump validator dependency in examples}}
- {{Bump js-yaml dependency for security fix}}

---

## [1.0.0](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.0) (2025-09-18)

### {{Highlights}}

- {{First stable production release}}
- {{Based on beta version 0.1.74}}

---

## {{Beta Releases (0.1.x)}}

## [0.1.75-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.74-beta.0...v0.1.75-beta.0)

### {{Bug Fixes}}

- **import:** {{Add `SendTaskFailure` support to `ImportStatusHandler` for proper Step Functions error handling}}
  - {{Previously, when an import job failed, the Step Function would wait indefinitely because only `SendTaskSuccess` was implemented}}
  - {{Now the handler properly sends `SendTaskFailure` when a job fails, allowing Step Functions to handle errors correctly}}
  - {{Added `sendTaskFailure()` method to send `SendTaskFailureCommand`}}
  - {{Handler now processes both `COMPLETED` and `FAILED` statuses for CSV import jobs}}
  - {{See [ImportStatusHandler API](#importstatushandler-api) for details}}

---

## [0.1.74-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.73-beta.0...v0.1.74-beta.0) (2025-08-25)

### {{Features}}

- {{Import module implementation}}
- {{Infrastructure updates for import module}}
- {{Local infrastructure updates for import module}}

---

## [0.1.73-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.72-beta.0...v0.1.73-beta.0) (2025-07-31)

### {{Bug Fixes}}

- **master:** {{Fixed package installation issue}}

---

## [0.1.72-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.71-beta.0...v0.1.72-beta.0) (2025-07-24)

### {{Features}}

- {{Added case-insensitive search for master data and settings}}

---

## [0.1.71-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.70-beta.0...v0.1.71-beta.0) (2025-07-18)

### {{Bug Fixes}}

- {{Fixed core package test failures blocking CI}}
- {{Fixed GitHub workflow issues}}
- {{Handle Step Function name length limit}}
- {{StepFunctionService execution name length validation}}

### {{Features}}

- {{CLI package comprehensive test enhancement}}
- {{Core package service unit test enhancement}}
- {{Implemented comprehensive unit tests for controllers}}
- {{Master package service unit test enhancement}}
- {{Sequence service test enhancement}}
- {{Task service unit test enhancement}}
- {{Implemented missing service unit tests}}
- {{Implemented unit tests for high-priority packages}}

---

## [0.1.70-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.69-beta.0...v0.1.70-beta.0) (2025-07-14)

### {{Bug Fixes}}

- **master:** {{Fixed master-setting unit test}}
- {{Updated package version}}

### {{Features}}

- **master:** {{Added copy to tenant functionality}}

---

## [0.1.69-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.68-beta.0...v0.1.69-beta.0) (2025-07-07)

### {{Bug Fixes}}

- **master:** {{Updated unit test}}

### {{Features}}

- **master:** {{Added Prisma option}}

---

## [0.1.68-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.67-beta.0...v0.1.68-beta.0) (2025-07-01)

### {{Bug Fixes}}

- {{Fixed build lib CI}}
- {{Updated import template master data module}}

### {{Features}}

- {{Added template master API}}

---

## [0.1.67-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.66-beta.0...v0.1.67-beta.0) (2025-06-10)

### {{Features}}

- {{Enhanced EmailService to support attachments}}

---

## [0.1.65-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.64-beta.0...v0.1.65-beta.0) (2025-05-19)

### {{Bug Fixes}}

- {{Fixed empty AppSync URL issue}}
- {{Fixed test AppSync URL}}

### {{Features}}

- {{Added second AppSync support}}

---

## [0.1.58-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.57-beta.0...v0.1.58-beta.0) (2025-04-24)

### {{Bug Fixes}}

- {{Fixed get format sequence from master data item}}

---

## [0.1.55-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.54-beta.0...v0.1.55-beta.0) (2025-02-14)

### {{Features}}

- {{Updated template to use Node 20 runtime}}

---

## [0.1.53-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.52-beta.0...v0.1.53-beta.0) (2025-02-12)

### {{Features}}

- {{Added queue and Step Function for task processing}}
- {{Task processing by Step Function}}

---

## [0.1.51-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.50-beta.0...v0.1.51-beta.0) (2025-01-17)

### {{Bug Fixes}}

- {{Corrected description text}}

### {{Features}}

- {{Added logger}}
- {{Added schematic description}}
- {{Added schematic for generating controllers}}
- {{Added schematic for generating dto, service, entity}}
- {{Added schematic for generating module}}

---

## [0.1.50-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.49-beta.0...v0.1.50-beta.0) (2025-01-14)

### {{Bug Fixes}}

- {{Fixed serialize helper entity field processing}}

### {{Features}}

- {{Added serialize helper functions for internal/external structure conversion}}

---

## {{Related Links}}

- [GitHub Releases](https://github.com/mbc-net/mbc-cqrs-serverless/releases)
- [npm Package](https://www.npmjs.com/package/@mbc-cqrs-serverless/core)
