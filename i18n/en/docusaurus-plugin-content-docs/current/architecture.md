---
sidebar_position: 2
---

# Architecture

This section provides a comprehensive overview of the MBC CQRS Serverless framework architecture.

## Overview

The framework is built on AWS serverless services and implements the CQRS pattern with Event Sourcing for scalable, event-driven applications.

## Architecture Sections

- [System Overview](./architecture/system-overview) - AWS infrastructure components and their interactions.
- [CQRS Pattern Flow](./architecture/cqrs-flow) - How commands and queries are separated and processed.
- [Event Sourcing](./architecture/event-sourcing) - Event storage, replay, and projection mechanisms.

## Key Concepts

### CQRS

Separating read and write operations for optimized data handling.

### Event Sourcing

Storing all changes as a sequence of events.

### Serverless

Leveraging AWS Lambda, DynamoDB, and other managed services.
