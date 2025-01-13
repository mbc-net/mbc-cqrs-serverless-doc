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
  // By default, Docusaurus generates a sidebar from the docs folder structure
  // tutorialSidebar: [{type: 'autogenerated', dirName: '.'}],

  // But you can create a sidebar manually

  tutorialSidebar: [
    {
      type: "category",
      label: "Getting Started",
      link: {
        type: "doc",
        id: "getting-started",
      },
      items: ["installation", "project-structure"],
    },
    {
      type: "category",
      label: "Build your application",
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
          label: "Handle event",
          link: {
            type: "doc",
            id: "handle-event",
          },
          items: ["custom-event", "data-sync-event"],
        },
        {
          type: "category",
          label: "Configuring",
          link: {
            type: "doc",
            id: "configuring",
          },
          items: [
            "environment-variables",
            "absolute_imports_and_module_path_aliases",
          ],
        },
        {
          type: "category",
          label: "Testing",
          link: {
            type: "doc",
            id: "testing",
          },
          items: ["unit-test", "e2e-test", "version-rules"],
        },
      ],
    },
    "cli",
    {
      type: "category",
      label: "Packages",
      items: ["tenant-service", "master-service"],
    },
    {
      type: "category",
      label: "Recipes",
      link: {
        type: "doc",
        id: "recipes",
      },
      items: ["prisma", "dynamodb", "sequence"],
    },
    {
      type: "category",
      label: "API reference",
      link: {
        type: "doc",
        id: "api-reference",
      },
      items: [
        {
          type: "category",
          label: "CommandModule",
          link: {
            type: "doc",
            id: "command-module",
          },
          items: ["command-service", "data-service", "serialization", "version-rules"],
        },
        {
          type: "category",
          label: "NotificationModule",
          link: {
            type: "doc",
            id: "notification-module",
          },
          items: ["email-service"],
        },
        "interfaces",
      ],
    },
    "glossary",
  ],
};

export default sidebars;
