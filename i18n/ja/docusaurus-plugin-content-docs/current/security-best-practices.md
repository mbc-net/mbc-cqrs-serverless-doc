---
sidebar_position: 20
description: MBC CQRS Serverlessで安全なアプリケーションを構築するためのセキュリティベストプラクティス。
---

# セキュリティベストプラクティス

このガイドでは、入力バリデーション、認証、認可、データ保護など、MBC CQRS Serverlessで安全なアプリケーションを構築するためのセキュリティベストプラクティスについて説明します。

## 入力バリデーション

### すべての入力をバリデーション

class-validatorデコレーターを使用して、API境界で常に入力をバリデーションします。

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

### 文字列入力のサニタイズ

文字列入力をサニタイズしてXSSやインジェクション攻撃を防止します。

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

### ファイルアップロードのバリデーション

ファイルタイプ、サイズを制限し、マルウェアをスキャンします。

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

## 認証

### Cognitoのセキュア設定

強力なパスワードポリシーとMFAを使用します。

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

:::info デフォルト実装に関する注記
デフォルト実装では開発の利便性のため `minLength: 6` を使用しています。本番環境では、上記のように最低12文字以上を設定し、MFAを有効にすることを強く推奨します。
:::

### JWTトークンのバリデーション

サーバー側で常にJWTトークンをバリデーションします。

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

### トークンリフレッシュ戦略

クライアントにリフレッシュトークンを保存せずに、安全なトークンリフレッシュを実装します。

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

## 認可

### ロールベースアクセス制御の実装

ロールベースの認可にCognitoグループを使用します。

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

### テナント分離の強制

マルチテナントアプリケーションでは常にテナントアクセスを検証します。

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

### リソースレベルの認可

操作を許可する前に所有権を確認します。

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

## データ保護

### 機密データの暗号化

保存前に機密データを暗号化します。

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

### ログ内の機密データのマスキング

機密情報をログに記録しないでください。

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

### 環境変数のセキュア管理

機密設定にはAWS Secrets Managerを使用します。

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

## APIセキュリティ

### レート制限

悪用を防止するためにレート制限を実装します。

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

### CORS設定

CORSを厳密に設定します。

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

:::info デフォルト実装に関する注記
デフォルト実装では開発の利便性のため `allowedOrigins: ['*']` を使用しています。本番環境では、クロスサイトリクエストフォージェリ（CSRF）攻撃を防ぐために、上記のように許可するオリジンを特定のドメインに制限する必要があります。
:::

### リクエストサイズ制限

DoSを防止するためにリクエストペイロードサイズを制限します。

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

## インフラストラクチャセキュリティ

### 最小権限IAMポリシー

Lambda関数には必要な権限のみを付与します。

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

### VPC設定

データベースアクセスのためにLambda関数をVPCにデプロイします。

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

### AWS CloudTrailの有効化

監査のためにすべてのAPI呼び出しをログに記録します。

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

## セキュリティチェックリスト

### デプロイ前

- [ ] すべての入力がclass-validatorでバリデーションされている
- [ ] 機密データが保存時に暗号化されている
- [ ] JWTトークンバリデーションが実装されている
- [ ] ロールベースアクセス制御が設定されている
- [ ] テナント分離が強制されている
- [ ] レート制限が設定されている
- [ ] CORSが厳密に設定されている
- [ ] IAMポリシーが最小権限に従っている
- [ ] シークレットがSecrets Managerに保存されている
- [ ] データベースアクセス用にVPCが設定されている

### デプロイ後

- [ ] CloudTrailが有効になっている
- [ ] CloudWatchアラームが設定されている
- [ ] セキュリティグループがレビューされている
- [ ] API Gatewayスロットリングが検証されている
- [ ] ペネトレーションテストが完了している

## 関連情報

- [認証](./authentication) - 認証設定
- [エラーカタログ](./error-catalog) - セキュリティ関連エラー
- [監視とロギング](./monitoring-logging) - セキュリティ監視
- [デプロイガイド](./deployment-guide) - セキュアデプロイ
