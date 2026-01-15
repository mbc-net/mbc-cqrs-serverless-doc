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

{{Create environment-specific configuration files in `infra/config/{env}/index.ts`:}}

```typescript
// infra/config/dev/index.ts
import { ApplicationLogLevel, SystemLogLevel } from 'aws-cdk-lib/aws-lambda';
import { Config } from '../type';

const config: Config = {
  env: 'dev',
  appName: 'your-app',

  // {{Domain configuration}}
  domain: {
    http: 'dev-api.your-domain.com',
    appsync: 'dev-appsync.your-domain.com',
  },

  // {{Existing Cognito User Pool (optional)}}
  userPoolId: 'ap-northeast-1_xxxxxxx',

  // {{VPC Configuration}}
  vpc: {
    id: 'vpc-xxxxxxxxx',
    subnetIds: ['subnet-xxx1', 'subnet-xxx2'],
    securityGroupIds: ['sg-xxxxxxxxx'],
  },

  // {{RDS Configuration}}
  rds: {
    accountSsmKey: '/your-app/dev/rds/account',
    endpoint: 'your-rds-endpoint.ap-northeast-1.rds.amazonaws.com',
    dbName: 'your_app_dev',
  },

  // {{Log Level Configuration}}
  logLevel: {
    lambdaSystem: SystemLogLevel.DEBUG,
    lambdaApplication: ApplicationLogLevel.TRACE,
    level: 'verbose',
  },

  frontBaseUrl: 'https://dev.your-domain.com',
  fromEmailAddress: 'noreply@your-domain.com',

  // {{WAF Configuration (optional)}}
  // wafArn: 'arn:aws:wafv2:ap-northeast-1:YOUR_ACCOUNT:regional/webacl/xxx',
};

export default config;
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
├── bin/
│   └── infra.ts              # {{CDK app entry point}}
├── cdk.json                  # {{CDK configuration}}
├── config/
│   ├── index.ts              # {{Config exports and getConfig function}}
│   ├── type.ts               # {{Config type definitions}}
│   ├── constant.ts           # {{Constants (e.g., PIPELINE_NAME)}}
│   ├── dev/
│   │   └── index.ts          # {{Development config}}
│   ├── stg/
│   │   └── index.ts          # {{Staging config}}
│   └── prod/
│       └── index.ts          # {{Production config}}
└── libs/
    ├── infra-stack.ts        # {{Main infrastructure stack}}
    ├── pipeline-stack.ts     # {{CI/CD pipeline stack}}
    └── pipeline-infra-stage.ts # {{Pipeline infrastructure stage}}
```

## {{Deploying with CDK}}

### {{Configure Target Environments}}

{{The environments to deploy are configured in `infra/bin/infra.ts` by modifying the `envs` array:}}

```typescript
// infra/bin/infra.ts
const envs: Env[] = ['dev'];  // {{Add 'stg' or 'prod' as needed}}
```

{{To deploy multiple environments, add them to the array:}}

```typescript
const envs: Env[] = ['dev', 'stg', 'prod'];
```

### {{Synthesize CloudFormation Template}}

{{First, synthesize the CloudFormation template to verify your configuration:}}

```bash
cd infra
cdk synth
```

### {{Deploy Stacks}}

{{Deploy all configured environment stacks:}}

```bash
cdk deploy --all
```

{{Or deploy a specific environment stack:}}

```bash
cdk deploy dev-your-app-pipeline-stack
```

### {{Deploy with Approval}}

{{For deployments that require approval:}}

```bash
cdk deploy --all --require-approval broadening
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
| {{Log Level}} | {{verbose/debug}} | {{info}} | {{warn/error}} |

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
cdk deploy --all
```

## {{Cleanup}}

### {{Destroy Stack}}

{{To remove all resources:}}

```bash
cdk destroy --all
```

{{Or destroy a specific environment stack:}}

```bash
cdk destroy dev-your-app-pipeline-stack
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
