---
description: {{Set up continuous integration and deployment with AWS CodePipeline.}}
---

# {{CI/CD with CodePipeline}}

{{This guide explains how to set up a CI/CD pipeline using AWS CodePipeline for your MBC CQRS Serverless application.}}

## {{Overview}}

{{AWS CodePipeline automates your build, test, and deployment workflow. A typical pipeline consists of:}}

1. **{{Source Stage}}**: {{Pulls code from your repository}}
2. **{{Build Stage}}**: {{Runs tests and builds the application}}
3. **{{Deploy Stage}}**: {{Deploys to AWS using CDK/CloudFormation}}

```mermaid
graph LR
    A[{{Source}}] --> B[{{Build}}]
    B --> C[{{Test}}]
    C --> D[{{Deploy Dev}}]
    D --> E[{{Approval}}]
    E --> F[{{Deploy Prod}}]
```

## {{Prerequisites}}

- {{AWS account with CodePipeline, CodeBuild permissions}}
- {{Source repository (GitHub, CodeCommit, or Bitbucket)}}
- {{AWS CDK project configured}}

## {{Pipeline Stack with CDK}}

### {{Create Pipeline Stack}}

{{Create a CDK stack for your pipeline in `infra/libs/pipeline-stack.ts`:}}

```typescript
import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { Construct } from 'constructs';

export interface PipelineStackProps extends cdk.StackProps {
  repositoryName: string;
  branchName: string;
  connectionArn: string;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    // Source artifact
    const sourceOutput = new codepipeline.Artifact();

    // Build artifact
    const buildOutput = new codepipeline.Artifact();

    // CodeBuild project
    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.MEDIUM,
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
    });

    // Pipeline
    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: `${props.repositoryName}-pipeline`,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.CodeStarConnectionsSourceAction({
              actionName: 'GitHub_Source',
              owner: 'your-org',
              repo: props.repositoryName,
              branch: props.branchName,
              connectionArn: props.connectionArn,
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Build',
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'Deploy',
              stackName: `${props.repositoryName}-app`,
              templatePath: buildOutput.atPath('cdk.out/AppStack.template.json'),
              adminPermissions: true,
            }),
          ],
        },
      ],
    });
  }
}
```

## {{BuildSpec Configuration}}

### {{Basic buildspec.yml}}

{{Create a `buildspec.yml` file in your project root:}}

```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 18
    commands:
      - npm ci

  pre_build:
    commands:
      - echo "Running tests..."
      - npm run test
      - npm run lint

  build:
    commands:
      - echo "Building application..."
      - npm run build
      - echo "Synthesizing CDK..."
      - cd infra && npm ci && npx cdk synth

  post_build:
    commands:
      - echo "Build completed on $(date)"

artifacts:
  files:
    - '**/*'
  base-directory: infra

cache:
  paths:
    - node_modules/**/*
    - infra/node_modules/**/*
```

### {{BuildSpec with Environment Variables}}

{{For builds that require environment-specific configuration:}}

```yaml
version: 0.2

env:
  variables:
    NODE_ENV: production
  parameter-store:
    DATABASE_URL: /your-app/database-url
  secrets-manager:
    API_KEY: your-app-secrets:api-key

phases:
  install:
    runtime-versions:
      nodejs: 18
    commands:
      - npm ci

  build:
    commands:
      - npm run build
      - cd infra && npx cdk synth --context env=$ENVIRONMENT

artifacts:
  files:
    - 'infra/cdk.out/**/*'
```

## {{Multi-Environment Pipeline}}

### {{Development and Production Stages}}

{{Create a pipeline with separate stages for each environment:}}

```typescript
const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
  stages: [
    // Source stage
    { stageName: 'Source', actions: [sourceAction] },

    // Build stage
    { stageName: 'Build', actions: [buildAction] },

    // Deploy to Development
    {
      stageName: 'Deploy_Dev',
      actions: [
        new codepipeline_actions.CloudFormationCreateUpdateStackAction({
          actionName: 'Deploy_Dev',
          stackName: 'myapp-dev',
          templatePath: buildOutput.atPath('cdk.out/DevStack.template.json'),
          adminPermissions: true,
        }),
      ],
    },

    // Manual Approval for Production
    {
      stageName: 'Approval',
      actions: [
        new codepipeline_actions.ManualApprovalAction({
          actionName: 'Approve_Production',
          notifyEmails: ['team@your-company.com'],
        }),
      ],
    },

    // Deploy to Production
    {
      stageName: 'Deploy_Prod',
      actions: [
        new codepipeline_actions.CloudFormationCreateUpdateStackAction({
          actionName: 'Deploy_Prod',
          stackName: 'myapp-prod',
          templatePath: buildOutput.atPath('cdk.out/ProdStack.template.json'),
          adminPermissions: true,
        }),
      ],
    },
  ],
});
```

## {{GitHub Connection}}

### {{Create CodeStar Connection}}

{{To connect GitHub to CodePipeline:}}

1. {{Go to AWS Console → Developer Tools → Settings → Connections}}
2. {{Click "Create connection"}}
3. {{Select "GitHub" as provider}}
4. {{Authorize AWS Connector for GitHub}}
5. {{Copy the Connection ARN}}

### {{Use Connection in CDK}}

```typescript
const connectionArn = 'arn:aws:codestar-connections:REGION:ACCOUNT:connection/CONNECTION_ID';

new codepipeline_actions.CodeStarConnectionsSourceAction({
  actionName: 'GitHub_Source',
  owner: 'your-org',
  repo: 'your-repo',
  branch: 'main',
  connectionArn: connectionArn,
  output: sourceOutput,
});
```

## {{Branch-Based Pipelines}}

### {{Feature Branch Strategy}}

{{Create separate pipelines for different branches:}}

| {{Branch}} | {{Environment}} | {{Auto Deploy}} |
|------------|-----------------|-----------------|
| `main` | {{Production}} | {{No (approval required)}} |
| `develop` | {{Staging}} | {{Yes}} |
| `feature/*` | {{Development}} | {{Yes}} |

### {{CDK Pipeline with Branches}}

```typescript
// Development pipeline (auto-deploy)
new PipelineStack(app, 'DevPipeline', {
  repositoryName: 'your-app',
  branchName: 'develop',
  connectionArn: connectionArn,
  autoApprove: true,
});

// Production pipeline (manual approval)
new PipelineStack(app, 'ProdPipeline', {
  repositoryName: 'your-app',
  branchName: 'main',
  connectionArn: connectionArn,
  autoApprove: false,
});
```

## {{Notifications}}

### {{SNS Notifications}}

{{Add pipeline notifications:}}

```typescript
import * as sns from 'aws-cdk-lib/aws-sns';
import * as notifications from 'aws-cdk-lib/aws-codestarnotifications';

const topic = new sns.Topic(this, 'PipelineNotifications');

new notifications.NotificationRule(this, 'PipelineNotificationRule', {
  source: pipeline,
  events: [
    'codepipeline-pipeline-pipeline-execution-failed',
    'codepipeline-pipeline-pipeline-execution-succeeded',
  ],
  targets: [topic],
});
```

## {{Best Practices}}

### {{Security}}

- {{Use IAM roles with least privilege}}
- {{Store secrets in Secrets Manager or Parameter Store}}
- {{Enable encryption for artifacts}}
- {{Use VPC for CodeBuild if accessing private resources}}

### {{Performance}}

- {{Cache dependencies in CodeBuild}}
- {{Use appropriate compute types}}
- {{Parallelize independent actions}}

### {{Reliability}}

- {{Add health checks after deployment}}
- {{Implement rollback strategies}}
- {{Use blue-green or canary deployments for production}}

## {{Troubleshooting}}

### {{Common Issues}}

| {{Issue}} | {{Solution}} |
|-----------|--------------|
| {{Source connection failed}} | {{Verify CodeStar connection is in "Available" status}} |
| {{Build timeout}} | {{Increase timeout in CodeBuild project settings}} |
| {{Permission denied}} | {{Check IAM roles have required permissions}} |
| {{Artifact not found}} | {{Verify buildspec artifacts configuration}} |

### {{Viewing Logs}}

{{CodeBuild logs are available in CloudWatch Logs:}}

```bash
aws logs tail /aws/codebuild/your-build-project --follow
```

## {{Next Steps}}

- {{[Monitoring and Logging](./monitoring-logging) - Set up observability}}
- {{[Deployment Guide](./deployment-guide) - Manual deployment options}}
- {{[Troubleshooting](./common-issues) - Common deployment issues}}
