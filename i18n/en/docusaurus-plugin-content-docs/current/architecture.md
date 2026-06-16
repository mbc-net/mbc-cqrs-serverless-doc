---
sidebar_position: 2
description: Comprehensive overview of MBC CQRS Serverless framework architecture including system overview, CQRS pattern flow, event sourcing, Step Functions, and CDK infrastructure.
---

# Architecture

This section provides a comprehensive overview of the MBC CQRS Serverless framework architecture.

## Overview {#overview}

The framework is built on AWS serverless services and implements the CQRS pattern with Event Sourcing for scalable, event-driven applications.

## Architecture Sections {#architecture-sections}

- [System Overview](/docs/architecture/system-overview) - AWS infrastructure components and their interactions.
- [CQRS Pattern Flow](/docs/architecture/cqrs-flow) - How commands and queries are separated and processed.
- [Event Sourcing](/docs/architecture/event-sourcing) - Event storage, replay, and projection mechanisms.
- [Step Functions](/docs/architecture/step-functions) - Workflow orchestration for async task processing.
- [CDK Infrastructure](/docs/architecture/cdk-infrastructure) - AWS CDK infrastructure provisioning and configuration.

## Key Concepts {#key-concepts}

### CQRS

Separating read and write operations for optimized data handling.

### Event Sourcing

Storing all changes as a sequence of events.

### Serverless

Leveraging AWS Lambda, DynamoDB, and other managed services.


## Related Documentation

- [Getting Started](/docs/getting-started) - Introduction to the framework
- [Installation](/docs/installation) - Set up your local environment
- [Backend Development](/docs/backend-development) - Implement features using these patterns
- [Key Patterns](/docs/key-patterns) - PK/SK design in DynamoDB
- [Glossary](/docs/glossary) - Framework terminology reference
