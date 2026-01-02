---
description: {{Learn how to deploy your MBC CQRS Serverless application to AWS.}}
---

# {{Deployment Guide}}

{{This guide covers deploying your MBC CQRS Serverless application to AWS using AWS CDK.}}

## {{Prerequisites}}

{{Before deploying, ensure you have:}}

- {{AWS CLI installed and configured with appropriate credentials}}
- {{Node.js 18.x or later}}
- {{AWS CDK CLI installed (`npm install -g aws-cdk`)}}
- {{An AWS account with necessary permissions}}

## {{AWS Account Preparation}}

### {{Required AWS Services}}

{{Your application will use the following AWS services:}}

- {{API Gateway - HTTP API endpoints}}
- {{Lambda - Serverless compute}}
- {{DynamoDB - NoSQL database}}
- {{RDS (PostgreSQL) - Relational database (optional)}}
- {{Cognito - User authentication}}
- {{S3 - File storage}}
- {{SQS/SNS - Message queuing}}
- {{Step Functions - Workflow orchestration}}
- {{CloudWatch - Logging and monitoring}}

### {{IAM Permissions}}

{{The deploying user/role needs permissions for:}}

- {{CloudFormation (full access)}}
- {{Lambda, API Gateway, DynamoDB, S3, SQS, SNS, Step Functions}}
- {{IAM (for creating roles)}}
- {{CloudWatch Logs}}
- {{VPC (if using RDS)}}

## {{CDK Bootstrap}}

{{Before your first deployment, bootstrap CDK in your AWS account:}}

```bash
cdk bootstrap aws://YOUR_ACCOUNT_ID/YOUR_REGION
```

{{Example:}}

```bash
cdk bootstrap aws://123456789012/ap-northeast-1
```

## {{Environment Configuration}}

### {{Create Environment Config}}

{{Create environment-specific configuration files in `infra/config/`:}}

```typescript
// infra/config/dev.ts
import { IConfig } from './type';

export const config: IConfig = {
  envName: 'dev',
  region: 'ap-northeast-1',

  // VPC Configuration
  vpcId: 'vpc-xxxxxxxxx',

  // Domain Configuration (optional)
  domainName: 'dev-api.your-domain.com',
  certificateArn: 'arn:aws:acm:ap-northeast-1:YOUR_ACCOUNT:certificate/xxx',

  // Database Configuration
  database: {
    name: 'your_app_dev',
    instanceType: 't3.micro',
  },

  // API Gateway Configuration
  apiGateway: {
    throttlingRateLimit: 1000,
    throttlingBurstLimit: 500,
  },
};
```

### {{Environment Variables}}

{{Set up environment variables in `.env` or through your CI/CD pipeline:}}

```bash
# AWS Configuration
AWS_REGION=ap-northeast-1
AWS_ACCOUNT_ID=123456789012

# Application Configuration
APP_NAME=your-app
ENVIRONMENT=dev

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Cognito
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxx
```

## {{CDK Stack Structure}}

{{A typical MBC CQRS Serverless CDK project has the following structure:}}

```
infra/
├── app.ts                    # CDK app entry point
├── cdk.json                  # CDK configuration
├── config/
│   ├── type.ts              # Config type definitions
│   ├── dev.ts               # Development config
│   ├── stg.ts               # Staging config
│   └── prod.ts              # Production config
└── libs/
    ├── infra-stack.ts       # Main infrastructure stack
    └── pipeline-stack.ts    # CI/CD pipeline stack
```

## {{Deploying with CDK}}

### {{Synthesize CloudFormation Template}}

{{First, synthesize the CloudFormation template to verify your configuration:}}

```bash
cd infra
cdk synth
```

### {{Deploy to Development}}

```bash
cdk deploy --context env=dev
```

### {{Deploy to Staging}}

```bash
cdk deploy --context env=stg
```

### {{Deploy to Production}}

```bash
cdk deploy --context env=prod
```

### {{Deploy with Approval}}

{{For production deployments, you may want to require approval:}}

```bash
cdk deploy --context env=prod --require-approval broadening
```

## {{Post-Deployment Verification}}

### {{Check Stack Status}}

```bash
aws cloudformation describe-stacks --stack-name YourStackName-dev
```

### {{Verify API Gateway}}

{{Get the API endpoint from the CloudFormation outputs:}}

```bash
aws cloudformation describe-stacks \
  --stack-name YourStackName-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text
```

### {{Test the Health Endpoint}}

```bash
curl https://your-api-endpoint.execute-api.ap-northeast-1.amazonaws.com/health
```

## {{Multi-Environment Strategy}}

### {{Environment Isolation}}

{{Best practices for managing multiple environments:}}

| {{Aspect}} | {{Development}} | {{Staging}} | {{Production}} |
|------------|-----------------|-------------|----------------|
| {{AWS Account}} | {{Shared or dedicated}} | {{Dedicated}} | {{Dedicated}} |
| {{VPC}} | {{Shared}} | {{Dedicated}} | {{Dedicated}} |
| {{Database}} | {{Shared RDS}} | {{Dedicated RDS}} | {{Multi-AZ RDS}} |
| {{Lambda Memory}} | {{512 MB}} | {{1024 MB}} | {{2048 MB}} |
| {{API Throttling}} | {{Low}} | {{Medium}} | {{High}} |

### {{Resource Naming Convention}}

{{Use consistent naming for resources:}}

```
{app-name}-{environment}-{resource-type}
```

{{Example:}}
- `myapp-dev-api`
- `myapp-dev-dynamodb-command`
- `myapp-prod-lambda-handler`

## {{Rollback}}

### {{Automatic Rollback}}

{{CloudFormation automatically rolls back if deployment fails. To manually rollback:}}

```bash
aws cloudformation rollback-stack --stack-name YourStackName-dev
```

### {{Deploy Previous Version}}

{{To deploy a previous version, use Git to checkout the desired commit and redeploy:}}

```bash
git checkout <previous-commit>
cdk deploy --context env=dev
```

## {{Cleanup}}

### {{Destroy Stack}}

{{To remove all resources:}}

```bash
cdk destroy --context env=dev
```

{{Note: This will delete all resources including data. Use with caution.}}

### {{Selective Cleanup}}

{{Some resources may have deletion protection. Disable before destroying:}}

- {{DynamoDB tables with deletion protection}}
- {{RDS instances with deletion protection}}
- {{S3 buckets (must be emptied first)}}

## {{Next Steps}}

- {{[CI/CD with CodePipeline](./codepipeline-cicd) - Automate your deployments}}
- {{[Monitoring and Logging](./monitoring-logging) - Set up observability}}
- {{[Troubleshooting](./common-issues) - Common deployment issues}}
