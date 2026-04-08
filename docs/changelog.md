---
sidebar_position: 100
sidebar_label: "Backend (Framework)"
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

## [1.2.2](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.2.2) (2026-04-08) {#v122}

### {{Bug Fixes}}

- **import:** {{Fix Head-of-Line Blocking (Poison Pill) in `CsvBatchProcessor` by implementing Smart Retry pattern}} ([{{See Details}}](/docs/import#csv-batch-error-handling)) ([PR #394](https://github.com/mbc-net/mbc-cqrs-serverless/pull/394))
  - {{Previously, a persistent validation error on the first row caused the entire batch to crash immediately}}
  - {{Now, each row is processed independently; errors are collected and a single aggregated error is thrown after the full batch is processed}}
  - {{Valid rows are saved successfully; failed rows trigger SQS retry; already-succeeded rows are skipped on retry via EQUAL comparison (idempotency maintained)}}
- **import:** {{Fix `ImportQueueEventHandler` passing raw SQS payload instead of parsed `importEvent` to `SingleImportProcessor`}} ([PR #394](https://github.com/mbc-net/mbc-cqrs-serverless/pull/394))
  - {{`singleImportProcessor.process()` now receives `event.importEvent` (parsed, rich object) instead of `event.payload` (raw SQS payload)}}

---

## [1.2.1](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.2.1) (2026-04-06) {#v121}

### {{Features}}

- **core:** {{Add `SqsService` and `SqsClientFactory` for SQS message operations}} ([{{See Details}}](/docs/queue#sqs-service)) ([PR #383](https://github.com/mbc-net/mbc-cqrs-serverless/pull/383))
  - {{`sendMessage()` — send a single message to an SQS queue}}
  - {{`sendMessageBatch()` — send up to 10 messages in a single API call}}
  - {{`receiveMessages()` — receive messages with configurable `MaxNumberOfMessages` (default: 10) and `WaitTimeSeconds` (default: 0)}}
  - {{`deleteMessage()` — acknowledge and delete a single processed message}}
  - {{`deleteMessageBatch()` — delete up to 10 messages in a single API call}}
  - {{`SqsService` is registered in `QueueModule` (global) and injectable across the application}}
  - {{Supports `MessageSystemAttributeNames` for receiving system attributes (deprecated `AttributeNames` not exposed)}}
- **core:** {{Refactor `SnsClientFactory` to use a singleton `SNSClient` instance}} ([PR #383](https://github.com/mbc-net/mbc-cqrs-serverless/pull/383))
  - {{Previously cached a separate client per topic ARN; now a single instance is shared across all publish calls}}
  - {{`getClient()` signature changed from `getClient(topicArn: string)` to `getClient()`}}

---

## [1.2.0](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.2.0) (2026-04-02) {#v120}

### {{Breaking Changes}}

- **core:** {{`publishSync()` and `publishPartialUpdateSync()` now return `null` when the command is not dirty (no-op)}} ([{{See Details}}](/docs/command-service#publishsync-null-return)) ([PR #375](https://github.com/mbc-net/mbc-cqrs-serverless/pull/375))
  - {{Return type changes from `Promise<CommandModel>` to `Promise<CommandModel | null>`}}
  - {{Matches the existing behavior of `publishAsync()` and `publishPartialUpdateAsync()`}}
  - {{Migration: add a null check before accessing any property on the result}}
- **sequence:** {{`SequenceService.genNewSequence()` has been removed}} ([{{See Details}}](/docs/sequence#gen-new-sequence-removed)) ([PR #375](https://github.com/mbc-net/mbc-cqrs-serverless/pull/375))
  - {{Use `generateSequenceItem()` or `generateSequenceItemWithProvideSetting()` instead}}

### {{Features}}

- **core:** {{Add Read-Your-Writes (RYW) consistency via `SessionService` and `Repository`}} ([{{See Details}}](/docs/command-service#read-your-writes)) ([PR #375](https://github.com/mbc-net/mbc-cqrs-serverless/pull/375))
  - {{After `publishAsync`, subsequent reads by the same user now return pending command data before the DynamoDB Stream sync completes}}
  - {{Opt-in: set `RYW_SESSION_TTL_MINUTES` environment variable to enable (e.g. `5`)}}
  - {{New `Repository` class exported from `CommandModule` / `@mbc-cqrs-serverless/core` — wraps `DataService` with RYW merge for `getItem`, `listItemsByPk`, `listItems`}}
  - {{Session table `{NODE_ENV}-{APP_NAME}-session` must be created (see `dynamodbs/session.json`)}}
  - {{No effect when `RYW_SESSION_TTL_MINUTES` is unset — zero impact on existing projects}}
- **mcp-server:** {{Add AP013 and AP014 anti-pattern detectors for v1.2.0 breaking changes}} ([PR #377](https://github.com/mbc-net/mbc-cqrs-serverless/pull/377))
  - {{AP013: detects `publishSync`/`publishPartialUpdateSync` result used without null check}}
  - {{AP014: detects deprecated `genNewSequence()` usage}}
  - {{`migration_guide` prompt updated with v1.2.0 sections}}

### {{Bug Fixes}}

- **import:** {{Fix import status handling for ZIP orchestrator}} ([PR #370](https://github.com/mbc-net/mbc-cqrs-serverless/pull/370))
  - {{`ImportStatusHandler` now sends task success with `importJobStatus` when the job fails}}
  - {{`ZipImportSfnEventHandler` aggregates CSV task failure counts and adjusts final job status}}

---

## [1.1.5](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.1.5) (2026-03-28) {#v115}

### {{Features}}

- **import:** {{Implement v2 batch processing architecture for high-throughput CSV imports}} ([{{See Details}}](/docs/import-export-patterns#v2-batch-processing)) ([PR #366](https://github.com/mbc-net/mbc-cqrs-serverless/pull/366))
  - {{Replace per-row `import_tmp` writes with direct in-Lambda command publishing, eliminating Hot Partition bottlenecks}}
  - {{Distributed Map now configured with `MaxItemsPerBatch: 100` and `MaxConcurrency: 50` for significantly higher throughput}}
  - {{New `finalize_parent_job` state aggregates batch summaries and writes final job status in a single DynamoDB `UpdateItem` call}}
  - {{Remove per-row atomic counter updates from `CommandFinishedHandler`, eliminating DynamoDB throttling at scale}}
  - {{Add `ImportPublishMode` enum (`SYNC` / `ASYNC`) to `ImportEntityProfile` for per-entity publish mode configuration}}
  - {{Add empty `processingResults` guard: job is marked `FAILED` if no batch results are received}}

### {{Breaking Changes}}

- **import:** {{CSV import no longer provides real-time row-level progress tracking}} ([{{See Details}}](/docs/import-export-patterns#v2-batch-processing-breaking-changes))
  - {{`processedRows`, `succeededRows`, `failedRows` counters are now aggregated once when Step Functions execution completes}}
  - {{Individual CSV rows are no longer written to the `import_tmp` DynamoDB table}}
  - {{The `import-csv` state machine requires a new `finalize_parent_job` state and `resultPath: '$.processingResults'` — CDK and `serverless.yml` must be updated together with this package}}

### {{Tests}}

- {{Add SYNC/ASYNC routing tests for `ImportQueueEventHandler` (6 test cases covering EQUAL/NOT_EXIST/CHANGED × SYNC/ASYNC + fallback)}}
- {{Add empty `processingResults` guard test for `CsvImportSfnEventHandler`}}
- {{Add batch aggregation tests (1,000 + 500 rows, COMPLETED and FAILED scenarios)}}

---

## [1.1.4](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.1.4) (2026-03-27) {#v114}

### {{Features}}

- **core:** {{Restore audit trail and history parity for `publishSync`}} ([{{See Details}}](/docs/command-service#publishsync-audit-trail)) ([PR #363](https://github.com/mbc-net/mbc-cqrs-serverless/pull/363))
  - {{`publishSync` now writes an immutable event to the Command table with `status: 'publish_sync:STARTED'` and `syncMode: 'SYNC'`}}
  - {{History table is now populated by `publishSync`, matching the async Step Functions pipeline}}
  - {{Command lifecycle follows `publish_sync:STARTED` → `finish:FINISHED` (or `publish_sync:FAILED` on error)}}
  - {{Ported `isNotCommandDirty` early-return optimization from `publishAsync` — returns `null` when no changes detected}}
  - {{DynamoDB Stream filter updated to exclude `syncMode=SYNC` records, preventing Step Functions double-execution}}
  - {{`DefaultEventFactory` also filters `syncMode=SYNC` records for local development environments}}

### {{Tests}}

- {{Add comprehensive tests for `publishSync` audit trail and history parity}}

---

## [1.1.3](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.1.3) (2026-03-24) {#v113}

### {{Bug Fixes}}

- **import:** {{Fix CSV import Distributed Map state result exceeding 256KB limit}} ([{{See Details}}](/docs/import-export-patterns#csv-total-row-counting)) ([PR #348](https://github.com/mbc-net/mbc-cqrs-serverless/pull/348))
  - {{Set `resultPath: DISCARD` on Distributed Map to prevent child execution results from being aggregated into state data}}
  - {{Remove `MapResult` dependency from `CsvImportSfnEventHandler`, use `countCsvRows()` from S3 instead}}
  - {{Add error handling for cases where the S3 stream is not readable}}

### {{CI/CD}}

- {{Switch to npm OIDC trusted publishing, removing dependency on `NPM_TOKEN` secret}} ([PR #357](https://github.com/mbc-net/mbc-cqrs-serverless/pull/357))
  - {{Upgrade lerna from v8 to v9 for built-in OIDC support}}
  - {{Add `id-token: write` permission to publish job}}
  - {{Add lockfile sync step for Node 22+ compatibility}}

### {{Tests}}

- {{Add comprehensive tests for `CsvImportSfnEventHandler` finalize_parent_job logic}}
  - {{Test FAILED status when failedRows > 0}}
  - {{Test COMPLETED status when all rows succeed}}
  - {{Test no status update when processing is incomplete}}
  - {{Test error handling when S3 stream is not readable}}

---

## [1.1.2](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.1.2) (2026-02-25) {#v112}

### {{Features}}

- **master:** {{Add built-in upsert methods for master settings and data}} ([{{See Details}}](/docs/master#upsert-pattern))
  - {{`upsertTenantSetting()`, `upsertSetting()`, `upsertBulk()` for MasterSettingService}}
  - {{`upsert()`, `upsertSetting()`, `upsertBulk()` for MasterDataService}}
  - {{Automatically creates new records, updates changed records, and skips unchanged records}}
  - {{Supports recreating soft-deleted records}}
- **master:** {{Add unified bulk upsert API (`/api/master-bulk/`)}} ([{{See Details}}](/docs/master#unified-bulk-upsert))
  - {{Single endpoint that handles both settings and data items}}
  - {{Items routed by presence of `settingCode` field}}
  - {{Preserves original input order in response}}
  - {{Tenant code validation enforced}}
- **master:** {{Add `@ArrayMaxSize(100)` validation to all bulk DTOs}}
- **master:** {{Add tenant code validation to individual bulk endpoints (`/api/master-setting/bulk`, `/api/master-data/bulk`)}}

### {{Bug Fixes}}

- **core:** {{Fix `checkVersion` error message using hardcoded value instead of actual `commandVersion`}} ([PR #331](https://github.com/mbc-net/mbc-cqrs-serverless/pull/331))
- **master:** {{Fix `seq === 0` being treated as falsy in `createSetting` by changing to null check (`seq == null`)}}
- **master:** {{Fix DTO mutation in `createSetting` by cloning attributes before modifying seq}}

### {{Tests}}

- {{Add comprehensive unit tests for MasterBulkController (8 test cases)}}
- {{Add unit tests for MasterDataService upsert and upsertBulk methods}}
- {{Add unit tests for MasterSettingService upsertTenantSetting and upsertBulk methods}}
- {{Add integration tests for master data and setting upsert scenarios}}

---

## [1.1.1](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.1.1) (2026-02-07) {#v111}

### {{Bug Fixes}}

- **cli:** {{Add missing `import_tmp.json` DynamoDB table template}} ([{{See Details}}](/docs/dynamodb#system-table-definitions)) ([PR #323](https://github.com/mbc-net/mbc-cqrs-serverless/pull/323))
  - {{The `import_tmp` table definition was missing from CLI templates, causing `npm run offline:sls` to fail}}
  - {{The `serverless.yml` references `LOCAL_DDB_IMPORT_TMP_STREAM` environment variable, which requires the table to be created during migration}}
  - {{See [Common Issues](/docs/common-issues#missing-import-tmp-table) for workaround if using older versions}}

---

## [1.1.0](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.1.0) (2026-02-03) {#v110}

### {{Breaking Changes}}

- **tenant:** {{Change `TENANT_COMMON` enum value from `'COMMON'` to `'common'` (lowercase)}}
  - {{This change affects partition key format: `TENANT#COMMON` → `TENANT#common`}}
  - {{**Migration required:** Existing data with `TENANT#COMMON` partition keys needs to be migrated}}
  - {{See [Migration Guide](/docs/migration/v1.1.0) for detailed instructions}}
- **core:** {{Remove deprecated `CommandService.publish()` method}} ([{{See Details}}](/docs/migration/v1.1.0#breaking-change-3-deprecated-methods-removed))
  - {{Use `CommandService.publishAsync()` instead}}
- **core:** {{Remove deprecated `CommandService.publishPartialUpdate()` method}}
  - {{Use `CommandService.publishPartialUpdateAsync()` instead}}
- **sequence:** {{Remove deprecated `SequencesService.genNewSequence()` method}}
  - {{Use `SequencesService.generateSequenceItem()` instead}}

### {{Features}}

- **core:** {{Add tenant code normalization for case-insensitive matching}} ([{{See Details}}](/docs/data-migration-patterns#tenant-code-normalization-migration))
  - {{Tenant codes are now automatically normalized to lowercase}}
  - {{`getUserContext()` returns normalized tenant code}}
  - {{All DynamoDB operations use normalized tenant codes for consistency}}
- **core:** {{Add `normalizeTenantCode()` utility function for explicit normalization}}
- **core:** {{Add `isCommonTenant()` utility function for common tenant detection}}
- **core:** {{Add EmailTags support for AWS SES email categorization and filtering}} ([{{See Details}}](/docs/notification-module#email-tags))
  - {{New `emailTags` option in `EmailNotification` interface}}
  - {{Tags are passed to SES for email categorization and tracking}}
- **core:** {{Add extensible tenant verification in RolesGuard}} ([{{See Details}}](/docs/authentication#tenant-verification))
  - {{`isHeaderOverride()`: Detect header-based tenant override}}
  - {{`canOverrideTenant()`: Check permission for cross-tenant access}}
  - {{`getCommonTenantCodes()`: Configurable common tenant list}}
  - {{`getCrossTenantRoles()`: Configurable cross-tenant roles (default: 'system_admin')}}
- **cli:** {{Add npm registry version check for skill updates}}
  - {{Fetch latest version from npm registry instead of local package.json}}
  - {{24-hour cache to reduce network requests}}
  - {{Offline fallback to cached version}}

### {{Security}}

- **core:** {{Restrict tenant code header override to system admin only}}
  - {{Previously, users without `custom:tenant` Cognito attribute could specify any tenant via header}}
  - {{Now only users with global `system_admin` role can override tenant code via `x-tenant-code` header}}
  - {{Regular users must have `custom:tenant` set in Cognito}}

### {{Bug Fixes}}

- **master:** {{Fix `TENANT_COMMON` constant usage in MasterSettingService and MasterDataService}}
  - {{Previously hardcoded `'COMMON'` strings are now using `SettingTypeEnum.TENANT_COMMON`}}
  - {{Ensures consistent partition key generation across the framework}}

### {{Tests}}

- **tenant:** {{Add comprehensive tests for TenantService methods}}
  - {{`getTenant()`: Retrieval tests}}
  - {{`updateTenant()`: Update and attribute merge tests}}
  - {{`deleteTenant()`: Soft delete tests}}
  - {{`addTenantGroup()`: Group management tests}}
  - {{`customizeSettingGroups()`: Setting customization tests}}
  - {{`createTenantGroup()`: Tenant group creation tests}}
- **tenant:** {{Add SettingTypeEnum validation tests}}
  - {{Verify `TENANT_COMMON = 'common'` (lowercase)}}
  - {{Ensure enum completeness and consistency}}
- **core:** {{Add tenant code normalization tests (70+ test cases)}}
- **core:** {{Add tenant normalization command tests (30+ test cases)}}
- **core:** {{Add comprehensive dependency integration tests (3400+ tests)}}
  - {{AWS SDK integration tests (DynamoDB, S3, SNS, SQS, Step Functions, SES)}}
  - {{NestJS behavior tests (decorators, config, DI, Swagger)}}
  - {{Third-party library tests (class-transformer, class-validator, RxJS)}}

### {{Documentation}}

- {{Add migration guide for v1.1.0 tenant code changes}}

---

## [1.0.26](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.26) (2026-01-26) {#v1026}

### {{Features}}

- **cli:** {{Add configurable local service ports via environment variables}} ([{{See Details}}](/docs/installation#configuring-local-ports)) ([PR #300](https://github.com/mbc-net/mbc-cqrs-serverless/pull/300))
  - {{Support for `LOCAL_HTTP_PORT`, `LOCAL_DYNAMODB_PORT`, `LOCAL_RDS_PORT`, and other port variables}}
  - {{Allows users to resolve port conflicts with other services}}
  - {{Configuration is automatically applied to Docker Compose, Serverless Offline, and trigger scripts}}

### {{Security}}

- {{Update `diff` package from 4.0.2 to 4.0.4 for security fix}} ([PR #297](https://github.com/mbc-net/mbc-cqrs-serverless/pull/297), [PR #299](https://github.com/mbc-net/mbc-cqrs-serverless/pull/299))
- {{Update `lodash` package from 4.17.21 to 4.17.23 for prototype pollution fix}} ([PR #298](https://github.com/mbc-net/mbc-cqrs-serverless/pull/298))

---

## [1.0.25](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.25) (2026-01-19) {#v1025}

### {{Features}}

- **core:** {{Enhanced inline template email with advanced variable substitution}} ([{{See Details}}](/docs/notification-module#advanced-template-features))
  - {{Support for nested property access (e.g., `{{user.profile.name}}`)}}
  - {{Support for Unicode/Japanese keys in template variables}}
  - {{Whitespace trimming inside placeholders (e.g., `{{ name }}` equals `{{name}}`)}}
  - {{Improved local development fallback for template compilation}}

---

## [1.0.24](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.24) (2026-01-17) {#v1024}

### {{Features}}

- **mcp-server:** {{Add Claude Code Skills for guided development assistance}} ([{{See Details}}](/docs/mcp-server#claude-code-skills))
  - {{`/mbc-generate`: Generate boilerplate code (modules, services, controllers, DTOs, handlers)}}
  - {{`/mbc-review`: Review code for best practices and anti-patterns (20 patterns)}}
  - {{`/mbc-migrate`: Guide version migrations and breaking changes}}
  - {{`/mbc-debug`: Debug and troubleshoot common issues}}
  - {{Skills are distributed via npm package and can be installed to `~/.claude/skills/` or `.claude/skills/`}}
- **cli:** {{Add `mbc install-skills` command for easy skills installation}} ([{{See Details}}](/docs/cli#install-skills))
  - {{Install skills to personal directory (`~/.claude/skills/`) or project directory (`.claude/skills/`)}}
  - {{Options: `--project`, `--force`, `--list`}}

### {{Bug Fixes}}

- **core:** {{Fix typo in parameter name `skExpession` to `skExpression`}}
  - {{Affected packages: core, directory, master, task, ui-setting}}
  - {{This was a breaking change for TypeScript users who referenced the old parameter name}}

---

## [1.0.23](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.23) (2026-01-16) {#v1023}

### {{Features}}

- **core:** {{Add inline template email support with `sendInlineTemplateEmail()` method}} ([{{See Details}}](/docs/notification-module#inline-template-emails))
  - {{New `sendInlineTemplateEmail(msg: TemplatedEmailNotification)` method in EmailService}}
  - {{Support for inline HTML/text templates with dynamic data substitution}}
  - {{Local development fallback with manual template compilation when SES is unavailable}}
  - {{New interfaces: `InlineTemplateContent`, `TemplatedEmailNotification`}}

---

## [1.0.22](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.22) (2026-01-16) {#v1022}

### {{Features}}

- **mcp-server:** {{Add code analysis tools for AI-assisted development}} ([{{See Details}}](./mcp-server#code-analysis-tools))
  - {{`mbc_check_anti_patterns`: Detect common anti-patterns in code with severity levels}}
  - {{`mbc_health_check`: Project health check (dependencies, structure, configuration)}}
  - {{`mbc_explain_code`: Analyze and explain code in MBC CQRS context}}

### {{Bug Fixes}}

- **mcp-server:** {{Improve code analysis tools robustness}}
  - {{Renumber anti-patterns sequentially (AP001-AP010)}}
  - {{Limit regex match range to prevent false positives}}
  - {{Add error handling for file reading and JSON parsing}}
  - {{Add 18 unit tests for analyze tools}}

### {{Security}}

- {{Fix security vulnerabilities in dependencies: qs, express, body-parser}}

### {{Dependencies}}

- {{Bump qs from 6.13.0 to 6.14.1}}
- {{Bump @nestjs/platform-express from 10.4.20 to 10.4.22}}
- {{Bump express from 4.21.2 to 4.22.1}}
- {{Bump body-parser from 1.20.3 to 1.20.4}}

---

## [1.0.21](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.21) (2026-01-15) {#v1021}

### {{Features}}

- **import:** {{Add ZIP finalization hooks support to ImportModule}}
  - {{New `IZipFinalizationHook` interface for custom post-import processing}}
  - {{Register hooks via `zipFinalizationHooks` option in `ImportModule.register()`}}
  - {{Hooks receive `ZipFinalizationContext` with results, status, and execution input}}

---

## [1.0.20](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.20) (2026-01-11) {#v1020}

### {{Bug Fixes}}

- **import:** {{Fix Step Functions CSV handler always setting COMPLETED status regardless of child job failures}}
  - {{Fixed `CsvImportSfnEventHandler.finalizeParentJob()` to correctly set status to FAILED when any child job fails}}
  - {{Fixed `CsvImportSfnEventHandler` in `csv_loader` state to correctly set status when early finalization occurs with failures}}
  - {{Previously, the ternary operator was incorrectly returning COMPLETED for both cases: `failedRows > 0 ? COMPLETED : COMPLETED`}}
  - {{Now correctly returns FAILED when failedRows > 0: `failedRows > 0 ? FAILED : COMPLETED`}}
  - {{This bug caused Step Functions to report SUCCESS even when child import jobs failed}}
  - {{See [CsvImportSfnEventHandler](./import-export-patterns#csvimportsfneventhandler) for details}}

---

## [1.0.19](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.19) (2026-01-11) {#v1019}

### {{Bug Fixes}}

- **import:** {{Fix master job status not updating to FAILED when child import jobs fail}}
  - {{Previously, when a child import job failed with errors like `ConditionalCheckFailedException`, the master job status remained `PROCESSING` indefinitely}}
  - {{Fixed `incrementParentJobCounters` to correctly set master job status to `FAILED` when any child job fails (was always setting to `COMPLETED`)}}
  - {{Fixed `ImportQueueEventHandler.handleImport` to call `incrementParentJobCounters` on error, ensuring parent counters are updated}}
  - {{Removed `throw error` in error handler to prevent Lambda crashes and allow proper status propagation}}
  - {{This fix completes the Step Functions error handling started in v1.0.18, ensuring `SendTaskFailure` is properly triggered}}
  - {{See [ImportQueueEventHandler Error Handling](./import-export-patterns#import-error-handling) for details}}

---

## [1.0.18](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.18) (2026-01-10) {#v1018}

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

- **master:** {{Fix `masterTypeCode` comparison in `MasterDataService.search()` - Changed from partial match (`contains`) to exact match for `settingCode` search parameter}} ([{{See Details}}](./master#search-parameters))
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

## [1.0.6](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.6) (2025-11-05) {#v106}

### {{Features}}

- **master:** {{Add tenantCode support to MasterDataCreateDto and update service logic}}

---

## [1.0.5](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.5) (2025-11-04) {#v105}

### {{Features}}

- **master:** {{Enhance master settings with tenantCode support in DTOs and service logic}}

---

## [1.0.4](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.4) (2025-10-29) {#v104}

### {{Features}}

- **core:** {{Add configurable request body size limit to bootstrap and environment validation}}
- **master:** {{Add bulk creation endpoints for master data and settings}}

### {{Dependencies}}

- {{Bump validator from 13.11.0/13.12.0 to 13.15.20}}
- {{Bump multer from 1.4.4-lts.1 to 2.0.2 and @nestjs/platform-express from 10.4.4 to 10.4.20}}
- {{Bump axios from 1.7.7 to 1.13.1 in CLI templates}}

---

## [1.0.3](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.3) (2025-10-23) {#v103}

### {{Features}}

- **master:** {{Add bulk creation endpoints for master data and settings, enabling batch operations for improved efficiency}}

---

## [1.0.2](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.2) (2025-10-16) {#v102}

### {{Features}}

- **survey:** {{Add survey template API for managing survey templates}}

### {{Dependencies}}

- {{Bump @nestjs/common from 10.3.0 to 10.4.16 in /examples/master}}
- {{Bump multer from 1.4.4-lts.1 to 2.0.2 and @nestjs/platform-express from 10.4.15 to 10.4.20 in /examples/seq}}
- {{Bump @nestjs/cli from 10.4.5 to 11.0.10 and inquirer from 8.2.6 to 8.2.7}}

---

## [1.0.1](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.1) (2025-09-19) {#v101}

### {{Features}}

- **import:** {{Add zip mode support for import module, enabling compressed file imports}}

---

## [1.0.0](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.0) (2025-09-18) {#v100}

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
  - {{See [ImportStatusHandler API](./import-export-patterns#importstatushandler-api) for details}}

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
