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

    // 2. Core Concepts
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

    // 3. Backend Development
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

    // 4. Modules
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

    // 5. Infrastructure
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

    // 6. Frontend Development
    {
      type: "category",
      label: "Frontend Development",
      items: [
        "frontend-project-structure",
        "state-management-patterns",
        "api-integration-patterns",
        "form-handling-patterns",
      ],
    },

    // 7. Configuration
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

    // 8. Testing
    {
      type: "category",
      label: "Testing",
      link: {
        type: "doc",
        id: "testing",
      },
      items: ["unit-test", "e2e-test"],
    },

    // 9. Examples
    {
      type: "category",
      label: "Examples",
      link: {
        type: "doc",
        id: "recipes",
      },
      items: ["directory", "survey-template"],
    },

    // 10. AI Integration
    {
      type: "category",
      label: "AI Integration",
      link: {
        type: "doc",
        id: "ai-integration",
      },
      items: ["mcp-server"],
    },

    // 11. Reference
    {
      type: "category",
      label: "Reference",
      items: ["interfaces", "error-catalog", "glossary"],
    },
  ],
};

export default sidebars;
