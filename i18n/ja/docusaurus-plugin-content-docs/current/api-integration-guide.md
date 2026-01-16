---
description: MBC CQRS Serverlessアプリケーションで外部APIと統合し、Webhookを受信する方法を学びます。
---

# API統合ガイド

このガイドでは、MBC CQRS Serverlessアプリケーションを外部APIやサービスと統合する方法を説明します。HTTPリクエストの作成、Webhookの処理、リトライロジックの実装、および回復力のある統合を確保するためのパターンを学びます。

## このガイドを使用するタイミング

以下のことが必要な場合にこのガイドを使用してください：

- Lambdaハンドラーやサービスからexternal REST APIを呼び出す
- サードパーティサービスからWebhookを受信する
- 外部API呼び出しのリトライとエラーハンドリングを実装する
- 外部システムとの回復力のある統合を構築する

## このパターンが解決する問題

| 問題 | 解決策 |
|---------|----------|
| 外部API呼び出しが断続的に失敗する | 指数バックオフでリトライを実装 |
| サードパーティサービスがアプリにイベントを送信する | 署名検証付きのWebhookエンドポイントを作成 |
| ネットワークタイムアウトがLambda障害を引き起こす | 適切なタイムアウトを設定し、タイムアウトエラーを処理 |
| 外部APIの問題を把握できない | 構造化ログとモニタリングを追加 |

## 外部APIの呼び出し

### HTTPリクエストにfetchを使用する

フレームワークは内部サービスでHTTPリクエストに`node-fetch`を使用しています。同じアプローチまたはNode.js互換の任意のHTTPクライアントライブラリを使用できます。

#### 基本的なGETリクエスト

```typescript
// external-api.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiBaseUrl = this.configService.get<string>('EXTERNAL_API_URL');
    this.apiKey = this.configService.get<string>('EXTERNAL_API_KEY');
  }

  async getResource(resourceId: string): Promise<any> {
    const url = `${this.apiBaseUrl}/resources/${resourceId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch resource ${resourceId}:`, error);
      throw error;
    }
  }
}
```

#### ペイロード付きPOSTリクエスト

```typescript
async createResource(data: CreateResourceDto): Promise<any> {
  const url = `${this.apiBaseUrl}/resources`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorBody}`);
    }

    return await response.json();
  } catch (error) {
    this.logger.error('Failed to create resource:', error);
    throw error;
  }
}
```

### Axiosの使用

HTTPリクエストにはAxiosまたはNestJS HttpModuleも使用できます：

```bash
npm install axios
```

```typescript
// external-api.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.client = axios.create({
      baseURL: this.configService.get<string>('EXTERNAL_API_URL'),
      timeout: 10000, // 10 second timeout (10秒タイムアウト)
      headers: {
        'Authorization': `Bearer ${this.configService.get<string>('EXTERNAL_API_KEY')}`,
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for logging (ログ用レスポンスインターセプター)
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.logger.error('API request failed:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      },
    );
  }

  async getResource(resourceId: string): Promise<any> {
    const response = await this.client.get(`/resources/${resourceId}`);
    return response.data;
  }

  async createResource(data: CreateResourceDto): Promise<any> {
    const response = await this.client.post('/resources', data);
    return response.data;
  }
}
```

### タイムアウトの設定

LambdaからAPIを呼び出す際は、常に適切なタイムアウトを設定してください：

```typescript
// Recommended: Set timeout less than Lambda timeout (推奨：Lambdaタイムアウトより短いタイムアウトを設定)
const response = await fetch(url, {
  method: 'GET',
  headers: { /* ... */ },
  signal: AbortSignal.timeout(25000), // 25 seconds - Lambda default is 30s (25秒 - Lambdaのデフォルトは30秒)
});
```

Axiosの場合：

```typescript
const client = axios.create({
  baseURL: apiUrl,
  timeout: 25000, // 25 seconds (25秒)
});
```

## Webhookの受信

### Webhookコントローラーパターン

外部サービスからWebhookを受信するコントローラーを作成します：

```typescript
// webhook.controller.ts
import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';

@ApiTags('webhooks')
@Controller('api/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('payment-provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive payment provider webhooks' })
  async handlePaymentWebhook(
    @Body() payload: any,
    @Headers('x-signature') signature: string,
    @Headers('x-timestamp') timestamp: string,
  ) {
    this.logger.log(`Received payment webhook: ${payload.event}`);

    // Verify webhook signature (Webhook署名を検証)
    const isValid = await this.webhookService.verifySignature(
      payload,
      signature,
      timestamp,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Process the webhook event (Webhookイベントを処理)
    await this.webhookService.processPaymentEvent(payload);

    return { received: true };
  }
}
```

### Webhook署名の検証

リクエストが信頼できるソースからであることを確認するため、常にWebhook署名を検証してください：

```typescript
// webhook.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>('WEBHOOK_SECRET');
  }

  /**
   * Verify webhook signature using HMAC (HMACを使用してWebhook署名を検証)
   */
  async verifySignature(
    payload: any,
    signature: string,
    timestamp: string,
  ): Promise<boolean> {
    if (!signature || !timestamp) {
      return false;
    }

    // Check timestamp to prevent replay attacks (リプレイ攻撃を防ぐためタイムスタンプを確認)
    const now = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp, 10);
    const tolerance = 300; // 5 minutes (5分)

    if (Math.abs(now - webhookTime) > tolerance) {
      this.logger.warn('Webhook timestamp is too old');
      return false;
    }

    // Calculate expected signature (期待される署名を計算)
    const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(signedPayload)
      .digest('hex');

    // Use timing-safe comparison (タイミングセーフな比較を使用)
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch {
      return false;
    }
  }

  /**
   * Process payment event based on type (タイプに基づいて決済イベントを処理)
   */
  async processPaymentEvent(payload: any): Promise<void> {
    const { event, data } = payload;

    switch (event) {
      case 'payment.completed':
        await this.handlePaymentCompleted(data);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(data);
        break;
      case 'refund.created':
        await this.handleRefundCreated(data);
        break;
      default:
        this.logger.warn(`Unhandled webhook event: ${event}`);
    }
  }

  private async handlePaymentCompleted(data: any): Promise<void> {
    // Update order status, trigger notifications, etc. (注文ステータスの更新、通知のトリガーなど)
    this.logger.log(`Payment completed: ${data.paymentId}`);
  }

  private async handlePaymentFailed(data: any): Promise<void> {
    this.logger.log(`Payment failed: ${data.paymentId}`);
  }

  private async handleRefundCreated(data: any): Promise<void> {
    this.logger.log(`Refund created: ${data.refundId}`);
  }
}
```

### 冪等なWebhook処理

Webhookは複数回配信される可能性があります。重複処理を防ぐために冪等性キーを使用してください：

```typescript
// webhook.service.ts
import { PrismaService } from 'src/prisma';

@Injectable()
export class WebhookService {
  constructor(
    private readonly prismaService: PrismaService,
    // ...
  ) {}

  async processPaymentEvent(payload: any): Promise<void> {
    const webhookId = payload.id;

    // Check if already processed (既に処理済みか確認)
    const existing = await this.prismaService.processedWebhook.findUnique({
      where: { webhookId },
    });

    if (existing) {
      this.logger.log(`Webhook ${webhookId} already processed, skipping`);
      return;
    }

    // Process the webhook (Webhookを処理)
    await this.handleEvent(payload);

    // Mark as processed (処理済みとしてマーク)
    await this.prismaService.processedWebhook.create({
      data: {
        webhookId,
        eventType: payload.event,
        processedAt: new Date(),
      },
    });
  }
}
```

## リトライとエラーハンドリング

### 指数バックオフでリトライ

一時的な障害に対するリトライロジックを実装します：

```typescript
// retry.utils.ts
import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Execute a function with exponential backoff retry (指数バックオフリトライで関数を実行)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  logger?: Logger,
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx) (クライアントエラー(4xx)ではリトライしない)
      if (isClientError(error)) {
        throw error;
      }

      if (attempt < opts.maxRetries) {
        const delay = Math.min(
          opts.baseDelayMs * Math.pow(2, attempt - 1),
          opts.maxDelayMs,
        );

        logger?.warn(
          `Attempt ${attempt}/${opts.maxRetries} failed, retrying in ${delay}ms: ${lastError.message}`,
        );

        await sleep(delay);
      }
    }
  }

  logger?.error(`All ${opts.maxRetries} attempts failed`);
  throw lastError!;
}

function isClientError(error: any): boolean {
  const status = error?.response?.status || error?.status;
  return status >= 400 && status < 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### リトライユーティリティの使用

```typescript
// external-api.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { withRetry } from './retry.utils';

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);

  async getResourceWithRetry(resourceId: string): Promise<any> {
    return withRetry(
      () => this.getResource(resourceId),
      { maxRetries: 3, baseDelayMs: 500 },
      this.logger,
    );
  }

  private async getResource(resourceId: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}/resources/${resourceId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      const error = new Error(`API error: ${response.status}`);
      (error as any).status = response.status;
      throw error;
    }

    return response.json();
  }
}
```

### AWSネイティブのリトライメカニズム

本番ワークロードでは、AWSネイティブのリトライメカニズムの使用を検討してください：

- **SQS + Lambda**: 設定可能な`maxReceiveCount`で失敗したメッセージをリトライするようにSQSを設定
- **Step Functions**: ステートマシン定義で組み込みのRetryとCatchブロックを使用
- **Lambda Destinations**: 失敗した呼び出しを再処理のためにSQSまたはSNSにルーティング

#### 例：SQSリトライ設定

```yaml
# serverless.yml
resources:
  Resources:
    ExternalApiQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: external-api-requests
        VisibilityTimeout: 60
        RedrivePolicy:
          deadLetterTargetArn: !GetAtt DeadLetterQueue.Arn
          maxReceiveCount: 3  # Retry 3 times before moving to DLQ (DLQに移動する前に3回リトライ)

    DeadLetterQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: external-api-dlq
```

## サーキットブレーカーパターン

:::info 推奨事項
サーキットブレーカーパターンはフレームワークに組み込まれていません。API呼び出し量が多い本番アプリケーションでは、サーキットブレーカーの実装、または`cockatiel`や`opossum`などのライブラリの使用を検討してください。
:::

### シンプルなサーキットブレーカー実装

```typescript
// circuit-breaker.ts
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation (通常動作)
  OPEN = 'OPEN',         // Failing fast (高速失敗)
  HALF_OPEN = 'HALF_OPEN', // Testing recovery (回復テスト)
}

export interface CircuitBreakerOptions {
  failureThreshold: number;  // Number of failures before opening (オープンするまでの失敗回数)
  resetTimeoutMs: number;    // Time before trying again (再試行までの時間)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private lastFailureTime = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
```

### サーキットブレーカーの使用

```typescript
// external-api.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreaker } from './circuit-breaker';

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);
  private readonly circuitBreaker: CircuitBreaker;

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 30000, // 30 seconds (30秒)
    });
  }

  async getResource(resourceId: string): Promise<any> {
    try {
      return await this.circuitBreaker.execute(() =>
        this.fetchResource(resourceId),
      );
    } catch (error) {
      if ((error as Error).message === 'Circuit breaker is open') {
        this.logger.warn('Circuit breaker open, using fallback');
        return this.getFallbackResource(resourceId);
      }
      throw error;
    }
  }

  private async fetchResource(resourceId: string): Promise<any> {
    // Actual API call (実際のAPI呼び出し)
    const response = await fetch(`${this.apiUrl}/resources/${resourceId}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }

  private getFallbackResource(resourceId: string): any {
    // Return cached data or default response (キャッシュされたデータまたはデフォルトレスポンスを返す)
    return { id: resourceId, status: 'unavailable' };
  }
}
```

## 実践例：決済ゲートウェイ統合

この例は、外部決済ゲートウェイとの完全な統合を示しています：

```typescript
// payment-gateway.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CommandService,
  IInvoke,
  getUserContext,
} from '@mbc-cqrs-serverless/core';
import { withRetry } from './retry.utils';

interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  customerId: string;
}

interface PaymentResponse {
  transactionId: string;
  status: 'success' | 'failed' | 'pending';
  message?: string;
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly gatewayUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly commandService: CommandService,
  ) {
    this.gatewayUrl = this.configService.get<string>('PAYMENT_GATEWAY_URL');
    this.apiKey = this.configService.get<string>('PAYMENT_GATEWAY_API_KEY');
  }

  /**
   * Process payment with retry and error handling (リトライとエラーハンドリングで決済を処理)
   */
  async processPayment(
    request: PaymentRequest,
    opts: { invokeContext: IInvoke },
  ): Promise<PaymentResponse> {
    const { tenantCode } = getUserContext(opts.invokeContext);

    this.logger.log(`Processing payment for order ${request.orderId}`);

    try {
      const result = await withRetry(
        () => this.callPaymentGateway(request),
        { maxRetries: 3, baseDelayMs: 1000 },
        this.logger,
      );

      // Record successful payment in command store (コマンドストアに成功した決済を記録)
      await this.recordPaymentResult(request, result, opts);

      return result;
    } catch (error) {
      this.logger.error(`Payment failed for order ${request.orderId}:`, error);

      // Record failed payment attempt (失敗した決済試行を記録)
      await this.recordPaymentResult(
        request,
        { transactionId: '', status: 'failed', message: (error as Error).message },
        opts,
      );

      throw error;
    }
  }

  private async callPaymentGateway(
    request: PaymentRequest,
  ): Promise<PaymentResponse> {
    const response = await fetch(`${this.gatewayUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': request.orderId, // Prevent duplicate charges (重複課金を防止)
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency,
        customer_id: request.customerId,
        metadata: { order_id: request.orderId },
      }),
      signal: AbortSignal.timeout(15000), // 15 second timeout (15秒タイムアウト)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Payment gateway error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();

    return {
      transactionId: data.id,
      status: data.status === 'succeeded' ? 'success' : data.status,
      message: data.message,
    };
  }

  private async recordPaymentResult(
    request: PaymentRequest,
    result: PaymentResponse,
    opts: { invokeContext: IInvoke },
  ): Promise<void> {
    // Record payment result using CommandService (CommandServiceを使用して決済結果を記録)
    // Implementation depends on your data model (実装はデータモデルに依存)
  }
}
```

## ベストプラクティス

### 1. 常にタイムアウトを設定する

```typescript
// Set timeout shorter than Lambda timeout (Lambdaタイムアウトより短いタイムアウトを設定)
const response = await fetch(url, {
  signal: AbortSignal.timeout(25000), // Lambda default is 30s (Lambdaのデフォルトは30秒)
});
```

### 2. 冪等性キーを使用する

```typescript
// Prevent duplicate API calls (重複API呼び出しを防止)
headers: {
  'Idempotency-Key': `${orderId}-${operationType}`,
}
```

### 3. 外部APIとのやり取りをログに記録する

```typescript
this.logger.log({
  message: 'External API call',
  url: endpoint,
  method: 'POST',
  duration: endTime - startTime,
  status: response.status,
});
```

### 4. 部分的な障害を適切に処理する

```typescript
// Continue processing even if some external calls fail (一部の外部呼び出しが失敗しても処理を継続)
const results = await Promise.allSettled(
  items.map((item) => this.callExternalApi(item)),
);

const succeeded = results.filter((r) => r.status === 'fulfilled');
const failed = results.filter((r) => r.status === 'rejected');

if (failed.length > 0) {
  this.logger.warn(`${failed.length} API calls failed`);
}
```

### 5. Webhookシークレットを安全に保存する

```bash
# Use AWS Secrets Manager or SSM Parameter Store (AWS Secrets ManagerまたはSSM Parameter Storeを使用)
WEBHOOK_SECRET=${ssm:/myapp/webhook-secret}
```

## 関連情報

- [サービス実装パターン](./service-patterns) - コアサービスパターン
- [イベントハンドリングパターン](./event-handling-patterns) - イベント駆動アーキテクチャ
- [モニタリングとログ](./monitoring-logging) - オブザーバビリティのベストプラクティス
- [エラーカタログ](./error-catalog) - エラーハンドリングリファレンス
