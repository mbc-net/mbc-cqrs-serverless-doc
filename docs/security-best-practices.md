---
sidebar_position: 20
description: {{Security best practices for building secure applications with MBC CQRS Serverless.}}
---

# {{Security Best Practices}}

{{This guide covers security best practices for building secure applications with MBC CQRS Serverless, including input validation, authentication, authorization, and data protection.}}

## {{Input Validation}}

### {{Validate All Input}}

{{Always validate input at the API boundary using class-validator decorators.}}

```typescript
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9\s\-]+$/, {
    message: 'Name contains invalid characters',
  })
  name: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z0-9\-]+$/, {
    message: 'Code must be uppercase alphanumeric with hyphens',
  })
  @MaxLength(50)
  code: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsNumber()
  @Min(0)
  @Max(1000000)
  amount: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];
}
```

### {{Sanitize String Input}}

{{Prevent XSS and injection attacks by sanitizing string input.}}

```typescript
import { Transform } from 'class-transformer';
import * as sanitizeHtml from 'sanitize-html';

export class CommentDto {
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => sanitizeHtml(value, {
    allowedTags: [],  // Strip all HTML
    allowedAttributes: {},
  }))
  content: string;

  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => sanitizeHtml(value, {
    allowedTags: ['b', 'i', 'em', 'strong'],  // Allow basic formatting
    allowedAttributes: {},
  }))
  description: string;
}
```

### {{Validate File Uploads}}

{{Restrict file types, sizes, and scan for malware.}}

```typescript
// Validate file type and size
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'text/csv',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function validateUpload(file: Express.Multer.File): Promise<void> {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException('File type not allowed');
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException('File too large');
  }

  // Verify file signature (magic bytes)
  const fileType = await FileType.fromBuffer(file.buffer);
  if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    throw new BadRequestException('Invalid file content');
  }
}
```

## {{Authentication}}

### {{Configure Cognito Securely}}

{{Use strong password policies and MFA.}}

```typescript
// CDK configuration for Cognito User Pool
const userPool = new cognito.UserPool(this, 'UserPool', {
  selfSignUpEnabled: false,  // Disable self-registration if not needed
  signInAliases: {
    email: true,
    username: false,
  },
  passwordPolicy: {
    minLength: 12,
    requireLowercase: true,
    requireUppercase: true,
    requireDigits: true,
    requireSymbols: true,
    tempPasswordValidity: Duration.days(7),
  },
  mfa: cognito.Mfa.REQUIRED,
  mfaSecondFactor: {
    sms: true,
    otp: true,
  },
  accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
  advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
});
```

### {{Validate JWT Tokens}}

{{Always validate JWT tokens on the server side.}}

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private verifier: CognitoJwtVerifier;

  constructor() {
    this.verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.COGNITO_CLIENT_ID,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      const payload = await this.verifier.verify(token);
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}
```

### {{Token Refresh Strategy}}

{{Implement secure token refresh without storing refresh tokens on client.}}

```typescript
// Frontend token refresh
async function refreshTokenIfNeeded(): Promise<string> {
  try {
    const session = await Auth.currentSession();
    return session.getAccessToken().getJwtToken();
  } catch (error) {
    if (error.name === 'NotAuthorizedException') {
      // Redirect to login
      await Auth.signOut();
      throw new Error('Session expired');
    }
    throw error;
  }
}
```

## {{Authorization}}

### {{Implement Role-Based Access Control}}

{{Use Cognito groups for role-based authorization.}}

```typescript
import { SetMetadata, CanActivate, ExecutionContext } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const userGroups = user['cognito:groups'] || [];

    return requiredRoles.some(role => userGroups.includes(role));
  }
}

// Usage in controller
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('users')
  @Roles('admin', 'super-admin')
  findAllUsers() {
    // Only admin or super-admin can access
  }
}
```

### {{Enforce Tenant Isolation}}

{{Always verify tenant access in multi-tenant applications.}}

```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const requestedTenant = request.params.tenantCode || request.body?.tenantCode;

    if (!requestedTenant) {
      return true;  // No tenant context required
    }

    const userTenants = user['custom:tenantCodes']?.split(',') || [];

    if (!userTenants.includes(requestedTenant)) {
      throw new ForbiddenException('Access denied to this tenant');
    }

    return true;
  }
}

// Always include tenant in queries
async function getOrdersByTenant(tenantCode: string, userId: string) {
  // Verify user has access to tenant first
  const user = await this.userService.getUser(userId);
  if (!user.tenantCodes.includes(tenantCode)) {
    throw new ForbiddenException('Access denied');
  }

  // Tenant is always part of the partition key
  return this.dataService.listItemsByPk(`ORDER#${tenantCode}`);
}
```

### {{Resource-Level Authorization}}

{{Check ownership before allowing operations.}}

```typescript
async function updateOrder(
  orderId: string,
  updates: UpdateOrderDto,
  userId: string,
): Promise<Order> {
  const order = await this.dataService.getItem({ pk, sk });

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  // Check ownership
  if (order.createdBy !== userId && !this.isAdmin(userId)) {
    throw new ForbiddenException('Not authorized to update this order');
  }

  return this.commandService.publishPartialUpdateSync({
    pk: order.pk,
    sk: order.sk,
    version: order.version,
    ...updates,
  }, options);
}
```

## {{Data Protection}}

### {{Encrypt Sensitive Data}}

{{Encrypt sensitive data before storing.}}

```typescript
import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes for AES-256
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv,
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex'),
  );

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Usage
const sensitiveData = {
  ssn: encrypt('123-45-6789'),
  creditCard: encrypt('4111111111111111'),
};
```

### {{Mask Sensitive Data in Logs}}

{{Never log sensitive information.}}

```typescript
// Create a logger that masks sensitive fields
const SENSITIVE_FIELDS = ['password', 'token', 'ssn', 'creditCard', 'secret'];

function maskSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const masked = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key of Object.keys(masked)) {
    if (SENSITIVE_FIELDS.some(field =>
      key.toLowerCase().includes(field.toLowerCase())
    )) {
      masked[key] = '***MASKED***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
}

// Usage
console.log('Request:', maskSensitiveData(requestBody));
```

### {{Secure Environment Variables}}

{{Use AWS Secrets Manager for sensitive configuration.}}

```typescript
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({});

async function getSecret(secretName: string): Promise<Record<string, string>> {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await secretsClient.send(command);

  if (response.SecretString) {
    return JSON.parse(response.SecretString);
  }

  throw new Error('Secret not found');
}

// Cache secrets to avoid repeated API calls
let cachedSecrets: Record<string, string> | null = null;

async function getDatabasePassword(): Promise<string> {
  if (!cachedSecrets) {
    cachedSecrets = await getSecret('myapp/database');
  }
  return cachedSecrets.password;
}
```

## {{API Security}}

### {{Rate Limiting}}

{{Implement rate limiting to prevent abuse.}}

```typescript
// API Gateway throttling in serverless.yml
provider:
  apiGateway:
    throttling:
      burstLimit: 200
      rateLimit: 100

// Per-function throttling
functions:
  createOrder:
    handler: handler.createOrder
    events:
      - http:
          path: orders
          method: post
          throttling:
            burstLimit: 10
            rateLimit: 5
```

### {{CORS Configuration}}

{{Configure CORS strictly.}}

```typescript
// serverless.yml
provider:
  httpApi:
    cors:
      allowedOrigins:
        - https://myapp.example.com
        - https://admin.example.com
      allowedHeaders:
        - Content-Type
        - Authorization
        - X-Request-Id
      allowedMethods:
        - GET
        - POST
        - PUT
        - DELETE
        - OPTIONS
      maxAge: 3600
```

### {{Request Size Limits}}

{{Limit request payload size to prevent DoS.}}

```typescript
// API Gateway payload limit in serverless.yml
provider:
  apiGateway:
    binaryMediaTypes:
      - 'application/octet-stream'
    maximumPayloadSize: 10485760  # 10MB

// Application-level validation
@Post('upload')
@UseInterceptors(
  FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024,  // 10MB
    },
  }),
)
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  // Process file
}
```

## {{Infrastructure Security}}

### {{Least Privilege IAM Policies}}

{{Grant only necessary permissions to Lambda functions.}}

```yaml
# serverless.yml
provider:
  iam:
    role:
      statements:
        # DynamoDB access - specific tables only
        - Effect: Allow
          Action:
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:Query
          Resource:
            - !GetAtt OrderTable.Arn
            - !Sub '${OrderTable.Arn}/index/*'

        # S3 access - specific bucket and prefix
        - Effect: Allow
          Action:
            - s3:GetObject
            - s3:PutObject
          Resource:
            - !Sub 'arn:aws:s3:::${UploadBucket}/uploads/*'

        # Secrets Manager - specific secrets only
        - Effect: Allow
          Action:
            - secretsmanager:GetSecretValue
          Resource:
            - !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:myapp/*'
```

### {{VPC Configuration}}

{{Deploy Lambda functions in VPC for database access.}}

```yaml
# serverless.yml
provider:
  vpc:
    securityGroupIds:
      - !Ref LambdaSecurityGroup
    subnetIds:
      - !Ref PrivateSubnet1
      - !Ref PrivateSubnet2

resources:
  Resources:
    LambdaSecurityGroup:
      Type: AWS::EC2::SecurityGroup
      Properties:
        GroupDescription: Lambda security group
        VpcId: !Ref VPC
        SecurityGroupEgress:
          - IpProtocol: tcp
            FromPort: 443
            ToPort: 443
            CidrIp: 0.0.0.0/0  # HTTPS outbound only
          - IpProtocol: tcp
            FromPort: 5432
            ToPort: 5432
            DestinationSecurityGroupId: !Ref RDSSecurityGroup
```

### {{Enable AWS CloudTrail}}

{{Log all API calls for audit.}}

```typescript
// CDK configuration
const trail = new cloudtrail.Trail(this, 'AuditTrail', {
  bucket: auditBucket,
  sendToCloudWatchLogs: true,
  cloudWatchLogsRetention: logs.RetentionDays.ONE_YEAR,
  includeGlobalServiceEvents: true,
  isMultiRegionTrail: true,
});

// Log specific events
trail.addEventSelector(cloudtrail.DataResourceType.DYNAMODB_TABLE, [
  `arn:aws:dynamodb:${this.region}:${this.account}:table/*`,
]);
```

## {{Security Checklist}}

### {{Pre-Deployment}}

- [ ] {{All input is validated with class-validator}}
- [ ] {{Sensitive data is encrypted at rest}}
- [ ] {{JWT token validation is implemented}}
- [ ] {{Role-based access control is configured}}
- [ ] {{Tenant isolation is enforced}}
- [ ] {{Rate limiting is configured}}
- [ ] {{CORS is configured strictly}}
- [ ] {{IAM policies follow least privilege}}
- [ ] {{Secrets are stored in Secrets Manager}}
- [ ] {{VPC is configured for database access}}

### {{Post-Deployment}}

- [ ] {{CloudTrail is enabled}}
- [ ] {{CloudWatch alarms are configured}}
- [ ] {{Security groups are reviewed}}
- [ ] {{API Gateway throttling is verified}}
- [ ] {{Penetration testing is completed}}

## {{See Also}}

- {{[Authentication](./authentication) - Authentication setup}}
- {{[Error Catalog](./error-catalog) - Security-related errors}}
- {{[Monitoring and Logging](./monitoring-logging) - Security monitoring}}
- {{[Deployment Guide](./deployment-guide) - Secure deployment}}
