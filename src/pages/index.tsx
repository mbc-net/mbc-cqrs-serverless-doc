import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./index.module.css";
import { translate } from "@docusaurus/Translate";

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description={translate({
        id: "layout.description",
        message:
          "Unleash the power of scalable, resilient serverless applications with CQRS on AWS",
        description: "Layout description",
      })}
    >
      <main className={clsx(styles.fullScreen)}>
        <div className={clsx(styles.container)}>
          <Heading as="h1" className={clsx(styles.textCenter)}>
            {translate({
              id: "home.welcome",
              message:
                "Welcome to the MBC CQRS serverless framework documentation!",
            })}
          </Heading>
          <p className={clsx(styles.textCenter)}>
            {translate({
              id: "home.description",
              message:
                "This framework provides core functionalities for implementing the Command Query Responsibility Segregation (CQRS) pattern within AWS serverless architectures, powered by the incredible NestJS framework. It simplifies the development of highly scalable and decoupled systems that can handle complex business logic and high-volume data processing.",
            })}
          </p>
          <div className={styles.buttons}>
            <Link
              className="button button--secondary button--lg"
              to="/docs/intro"
            >
              {translate({
                id: "home.button.getStarted",
                message: "Getting Started",
              })}
            </Link>
          </div>
        </div>
      </main>
    </Layout>
  );
}
