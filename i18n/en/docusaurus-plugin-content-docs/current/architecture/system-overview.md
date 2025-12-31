---
sidebar_position: 1
---

# System Architecture Overview

This document provides an overview of the MBC CQRS Serverless framework architecture.

## AWS Infrastructure

```mermaid
flowchart TB
    subgraph Clients
        WebApp[Web Application]
        MobileApp[Mobile Application]
        External[External Systems]
    end

    subgraph AWS
        subgraph API
            APIGW[API Gateway]
            AppSync[AppSync]
            WSGateway[WebSocket API]
        end

        subgraph Auth
            Cognito[Amazon Cognito]
        end

        subgraph Compute
            Lambda[AWS Lambda]
        end

        subgraph Storage
            DynamoDB[(DynamoDB)]
            RDS[(RDS Aurora)]
            S3[(S3)]
        end

        subgraph Messaging
            SNS[SNS]
            SQS[SQS]
        end

        subgraph Orchestration
            StepFunctions[Step Functions]
        end

        subgraph Notifications
            SES[SES]
        end
    end

    WebApp --> APIGW
    WebApp --> AppSync
    WebApp --> WSGateway
    MobileApp --> APIGW
    MobileApp --> AppSync
    External --> APIGW

    APIGW --> Cognito
    AppSync --> Cognito
    WSGateway --> Cognito

    APIGW --> Lambda
    AppSync --> Lambda
    WSGateway --> Lambda

    Lambda --> DynamoDB
    Lambda --> RDS
    Lambda --> S3
    Lambda --> SNS
    Lambda --> SES
    Lambda --> StepFunctions

    SNS --> SQS
    SQS --> Lambda
    StepFunctions --> Lambda
```

## Component Description

### API Layer

The entry point for receiving client requests.

- **API Gateway**: REST API endpoints for CRUD operations
- **AppSync**: GraphQL API for flexible queries and subscriptions
- **WebSocket API**: Real-time bidirectional communication

### Authentication

- **Amazon Cognito**: User authentication, JWT tokens, and user pools

### Compute

- **AWS Lambda**: Serverless execution of NestJS applications

### Data Storage

- **DynamoDB**: Primary event store for CQRS data persistence
- **RDS Aurora**: Optional relational data for complex queries
- **S3**: File and document storage

### Messaging

- **SNS**: Event fan-out and topic-based publishing
- **SQS**: Reliable message queuing and async processing

### Orchestration

- **Step Functions**: Long-running workflows and saga patterns

### Notifications

- **SES**: Transactional email delivery

## Data Flow

How requests flow through the system.

1. **Client Request**: Client sends request via API Gateway, AppSync, or WebSocket
2. **Authentication**: Cognito validates JWT tokens
3. **Command Execution**: Lambda processes command and persists to DynamoDB
4. **Event Publishing**: Events are published to SNS
5. **Event Processing**: SQS queues trigger Lambda handlers for async processing
6. **Read Model Update**: Projections update RDS for complex queries

## Multi-Tenant Architecture

```mermaid
flowchart LR
    subgraph TenantIsolation
        Request[Incoming Request]
        Auth[Authentication]
        TenantResolver[Tenant Resolver]

        subgraph DataPartition
            T1[Tenant A Data]
            T2[Tenant B Data]
            T3[Tenant C Data]
        end
    end

    Request --> Auth
    Auth --> TenantResolver
    TenantResolver --> T1
    TenantResolver --> T2
    TenantResolver --> T3
```

Tenant isolation is achieved through:

- **Partition Key Prefix**: Each tenant's data is prefixed with the tenant code
- **Request Context**: Tenant information is extracted from JWT tokens
- **Query Filtering**: All queries are automatically scoped to the tenant
