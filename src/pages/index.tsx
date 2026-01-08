import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./index.module.css";
import { translate } from "@docusaurus/Translate";
import useBaseUrl from "@docusaurus/useBaseUrl";

const features = [
  {
    title: "Zero to API in 5 Minutes",
    titleId: "home.feature.quickStart.title",
    description:
      "CLI generates complete project structure with best practices. Start building immediately.",
    descriptionId: "home.feature.quickStart.description",
  },
  {
    title: "Built-in Multi-tenancy",
    titleId: "home.feature.multiTenancy.title",
    description:
      "Data isolation, tenant settings, and RBAC out of the box for SaaS applications.",
    descriptionId: "home.feature.multiTenancy.description",
  },
  {
    title: "Event Sourcing",
    titleId: "home.feature.eventSourcing.title",
    description:
      "Full audit trail with DynamoDB Streams and automatic RDS synchronization.",
    descriptionId: "home.feature.eventSourcing.description",
  },
  {
    title: "Local Development",
    titleId: "home.feature.localDev.title",
    description:
      "Complete offline mode with Docker. No AWS costs during development.",
    descriptionId: "home.feature.localDev.description",
  },
];

function Feature({
  title,
  titleId,
  description,
  descriptionId,
}: {
  title: string;
  titleId: string;
  description: string;
  descriptionId: string;
}) {
  return (
    <div className={styles.featureCard}>
      <Heading as="h3">
        {translate({ id: titleId, message: title })}
      </Heading>
      <p>{translate({ id: descriptionId, message: description })}</p>
    </div>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description={translate({
        id: "layout.description",
        message:
          "Build production-ready serverless applications on AWS in minutes, not months. CQRS, Event Sourcing, Multi-tenancy out of the box.",
        description: "Layout description",
      })}
    >
      <main className={clsx(styles.main)}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <img
              src={useBaseUrl("/img/mbc-cqrs-serverless.png")}
              alt="MBC CQRS Serverless"
              className={styles.heroLogo}
            />
            <Heading as="h1" className={styles.heroTitle}>
              {translate({
                id: "home.title",
                message: "MBC CQRS Serverless Framework",
              })}
            </Heading>
            <p className={styles.heroTagline}>
              {translate({
                id: "home.tagline",
                message:
                  "Build production-ready serverless applications on AWS in minutes, not months.",
              })}
            </p>
            <div className={styles.heroButtons}>
              <Link
                className="button button--primary button--lg"
                to="/docs/getting-started"
              >
                {translate({
                  id: "home.button.getStarted",
                  message: "Get Started",
                })}
              </Link>
              <Link
                className="button button--secondary button--lg"
                to="/docs/build-todo-app"
              >
                {translate({
                  id: "home.button.tutorial",
                  message: "Tutorial",
                })}
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.features}>
          <div className={styles.container}>
            <Heading as="h2" className={styles.sectionTitle}>
              {translate({
                id: "home.features.title",
                message: "Why MBC CQRS Serverless?",
              })}
            </Heading>
            <div className={styles.featureGrid}>
              {features.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>

        {/* Quick Start Section */}
        <section className={styles.quickStart}>
          <div className={styles.container}>
            <Heading as="h2" className={styles.sectionTitle}>
              {translate({
                id: "home.quickStart.title",
                message: "Quick Start",
              })}
            </Heading>
            <div className={styles.codeBlock}>
              <pre>
                <code>
{`# Install CLI
npm install -g @mbc-cqrs-serverless/cli

# Create new project
mbc new my-saas-app

# Start development
cd my-saas-app
npm install
npm run offline:docker   # Start local AWS services
npm run offline:sls      # Start API server

# Your API is running at http://localhost:4000`}
                </code>
              </pre>
            </div>
          </div>
        </section>

        {/* Links Section */}
        <section className={styles.links}>
          <div className={styles.container}>
            <div className={styles.linkGrid}>
              <Link to="/docs/architecture" className={styles.linkCard}>
                <Heading as="h3">
                  {translate({
                    id: "home.links.docs.title",
                    message: "Documentation",
                  })}
                </Heading>
                <p>
                  {translate({
                    id: "home.links.docs.description",
                    message: "Learn the concepts and architecture",
                  })}
                </p>
              </Link>
              <Link
                to="https://github.com/mbc-net/mbc-cqrs-serverless-samples"
                className={styles.linkCard}
              >
                <Heading as="h3">
                  {translate({
                    id: "home.links.examples.title",
                    message: "Examples",
                  })}
                </Heading>
                <p>
                  {translate({
                    id: "home.links.examples.description",
                    message: "Step-by-step sample projects",
                  })}
                </p>
              </Link>
              <Link
                to="https://github.com/mbc-net/mbc-cqrs-serverless"
                className={styles.linkCard}
              >
                <Heading as="h3">
                  {translate({
                    id: "home.links.github.title",
                    message: "GitHub",
                  })}
                </Heading>
                <p>
                  {translate({
                    id: "home.links.github.description",
                    message: "Source code and contributions",
                  })}
                </p>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
