---
description: {{Testing}}
---

# {{Testing}}

{{Automated testing is considered an essential part of any serious software development effort. Automation makes it easy to repeat individual tests or test suites quickly and easily during development. This helps ensure that releases meet quality and performance goals. Automation helps increase coverage and provides a faster feedback loop to developers. Automation both increases the productivity of individual developers and ensures that tests are run at critical development lifecycle junctures, such as source code control check-in, feature integration, and version release.}}

{{Such tests often span a variety of types, including unit tests, end-to-end (e2e) tests, integration tests, and so on. While the benefits are unquestionable, it can be tedious to set them up. MBC CQRS serverless strives to promote development best practices, including effective testing, so it includes features such as the following to help developers and teams build and automate tests. MBC CQRS serverless:}}

- {{provides default tooling (such as a test runner that builds an isolated module/application loader)}}
- {{provides integration with [Jest](https://github.com/facebook/jest) and [Supertest](https://github.com/ladjs/supertest) out-of-the-box, while remaining agnostic to testing tools}}
- {{makes the Nest dependency injection system available in the testing environment for easily mocking components}}
- {{effortlessly mock AWS services}}

{{See the guides below to learn how to write test:}}

```mdx-code-block
import DocCardList from '@theme/DocCardList';

<DocCardList />
```
