import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    // 1. Getting Started - 最初に読むべき導入セクション
    {
      type: "category",
      label: "Getting Started",
      link: {
        type: "doc",
        id: "getting-started",
      },
      items: ["installation", "project-structure", "cli"],
    },

    // 2. Tutorials - 実践的なチュートリアル
    {
      type: "category",
      label: "Tutorials",
      items: ["quickstart-tutorial", "build-todo-app"],
    },

    // 3. Core Concepts - アーキテクチャの基本概念
    {
      type: "category",
      label: "Core Concepts",
      link: {
        type: "doc",
        id: "architecture",
      },
      items: [
        "architecture/system-overview",
        "architecture/cqrs-flow",
        "architecture/event-sourcing",
        "key-patterns",
        "entity-patterns",
        "version-conflict-guide",
      ],
    },

    // 4. Backend Development - バックエンド開発の総合ガイド
    {
      type: "category",
      label: "Backend Development",
      link: {
        type: "doc",
        id: "backend-development",
      },
      items: [
        "build-your-application",
        "controllers",
        "modules",
        "event-handling-patterns",
        "data-sync-handler-examples",
        "service-patterns",
        "multi-tenant-patterns",
        "import-export-patterns",
        "api-integration-guide",
        "data-migration-patterns",
      ],
    },

    // 5. Modules - 提供モジュールのAPIリファレンス
    {
      type: "category",
      label: "Modules",
      link: {
        type: "doc",
        id: "api-reference",
      },
      items: [
        {
          type: "category",
          label: "Command Module",
          link: {
            type: "doc",
            id: "command-service",
          },
          items: [
            "data-service",
            "serialization",
            "version-rules",
          ],
        },
        "sequence",
        "tasks",
        "tenant",
        "master",
        "directory",
        {
          type: "category",
          label: "Notification Module",
          link: {
            type: "doc",
            id: "notification-module",
          },
          items: ["email-service"],
        },
        "ui-setting",
      ],
    },

    // 6. Infrastructure - インフラストラクチャ設定
    {
      type: "category",
      label: "Infrastructure",
      items: [
        "architecture/cdk-infrastructure",
        "architecture/step-functions",
        "dynamodb",
        "database-selection-guide",
        "prisma",
      ],
    },

    // 7. Frontend Development - フロントエンド開発ガイド
    {
      type: "category",
      label: "Frontend Development",
      items: [
        "frontend-project-structure",
        "state-management-patterns",
        "api-integration-patterns",
        "form-handling-patterns",
        "master-web",
        "survey-web",
      ],
    },

    // 8. Security - セキュリティガイド
    {
      type: "category",
      label: "Security",
      items: ["security-best-practices", "authentication"],
    },

    // 9. Deployment & Operations - デプロイと運用
    {
      type: "category",
      label: "Deployment & Operations",
      items: ["deployment-guide", "codepipeline-cicd", "monitoring-logging"],
    },

    // 9. Configuration - 設定ガイド
    {
      type: "category",
      label: "Configuration",
      link: {
        type: "doc",
        id: "configuring",
      },
      items: [
        "environment-variables",
        "absolute_imports_and_module_path_aliases",
      ],
    },

    // 10. Testing - テストガイド
    {
      type: "category",
      label: "Testing",
      link: {
        type: "doc",
        id: "testing",
      },
      items: ["unit-test", "e2e-test"],
    },

    // 11. Troubleshooting - トラブルシューティング
    {
      type: "category",
      label: "Troubleshooting",
      items: ["common-issues", "debugging-guide"],
    },

    // 12. Examples - 実践的なサンプル
    {
      type: "category",
      label: "Examples",
      link: {
        type: "doc",
        id: "recipes",
      },
      items: ["ecommerce-example", "saas-example", "survey-template"],
    },

    // 13. AI Integration - AI統合機能
    {
      type: "category",
      label: "AI Integration",
      link: {
        type: "doc",
        id: "ai-integration",
      },
      items: ["mcp-server", "ai-prompts"],
    },

    // 14. Reference - リファレンス
    {
      type: "category",
      label: "Reference",
      items: ["helpers", "interfaces", "error-catalog", "anti-patterns", "glossary"],
    },

    // 15. Migration Guides - バージョン別マイグレーションガイド
    {
      type: "category",
      label: "Migration Guides",
      items: [
        "migration/v1.1.0",
      ],
    },

    // 16. Changelog - 変更履歴（トップレベル）
    "changelog",
  ],
};

export default sidebars;
