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
    // 1. Getting Started
    {
      type: "category",
      label: "Getting Started",
      link: {
        type: "doc",
        id: "getting-started",
      },
      items: ["installation", "project-structure", "cli"],
    },

    // 2. Tutorials
    {
      type: "category",
      label: "Tutorials",
      items: ["quickstart-tutorial", "build-todo-app"],
    },

    // 3. Core Concepts
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
      ],
    },

    // 4. Backend Development
    {
      type: "category",
      label: "Backend Development",
      link: {
        type: "doc",
        id: "build-your-application",
      },
      items: [
        "authentication",
        "controllers",
        "modules",
        {
          type: "category",
          label: "Event Handling",
          link: {
            type: "doc",
            id: "handle-event",
          },
          items: ["custom-event", "data-sync-event", "data-sync-handler-examples"],
        },
        "service-patterns",
      ],
    },

    // 5. Modules
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
            id: "command-module",
          },
          items: [
            "command-service",
            "data-service",
            "serialization",
            "version-rules",
          ],
        },
        "sequence",
        "tenant",
        "tasks",
        "master",
        "import",
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

    // 6. Infrastructure
    {
      type: "category",
      label: "Infrastructure",
      items: [
        "architecture/cdk-infrastructure",
        "architecture/step-functions",
        "dynamodb",
        "prisma",
      ],
    },

    // 7. Frontend Development
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

    // 8. Deployment & Operations
    {
      type: "category",
      label: "Deployment & Operations",
      items: [
        "deployment-guide",
        "codepipeline-cicd",
        "monitoring-logging",
      ],
    },

    // 9. Configuration
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

    // 10. Testing
    {
      type: "category",
      label: "Testing",
      link: {
        type: "doc",
        id: "testing",
      },
      items: ["unit-test", "e2e-test"],
    },

    // 11. Troubleshooting
    {
      type: "category",
      label: "Troubleshooting",
      items: ["common-issues", "debugging-guide"],
    },

    // 12. Examples
    {
      type: "category",
      label: "Examples",
      link: {
        type: "doc",
        id: "recipes",
      },
      items: ["survey-template"],
    },

    // 13. AI Integration
    {
      type: "category",
      label: "AI Integration",
      link: {
        type: "doc",
        id: "ai-integration",
      },
      items: ["mcp-server"],
    },

    // 14. Reference
    {
      type: "category",
      label: "Reference",
      items: ["interfaces", "error-catalog", "glossary"],
    },
  ],
};

export default sidebars;
