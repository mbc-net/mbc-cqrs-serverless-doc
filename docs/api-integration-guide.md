---
description: {{Learn how to integrate with external APIs and receive webhooks in MBC CQRS Serverless applications.}}
---

# {{API Integration Guide}}

{{This guide explains how to integrate your MBC CQRS Serverless application with external APIs and services. Learn patterns for making HTTP requests, handling webhooks, implementing retry logic, and ensuring resilient integrations.}}

## {{When to Use This Guide}}

{{Use this guide when you need to:}}

- {{Call external REST APIs from your Lambda handlers or services}}
- {{Receive webhooks from third-party services}}
- {{Implement retry and error handling for external API calls}}
- {{Build resilient integrations with external systems}}

## {{Problems This Pattern Solves}}

| {{Problem}} | {{Solution}} |
|---------|----------|
| {{External API calls fail intermittently}} | {{Implement retry with exponential backoff}} |
| {{Third-party service sends events to your app}} | {{Create webhook endpoints with signature verification}} |
| {{Network timeouts cause Lambda failures}} | {{Set appropriate timeouts and handle timeout errors}} |
| {{No visibility into external API issues}} | {{Add structured logging and monitoring}} |

## {{Calling External APIs}}

### {{Using fetch for HTTP Requests}}

{{The framework uses `node-fetch` for HTTP requests in its internal services. You can use the same approach or any HTTP client library compatible with Node.js.}}

#### {{Basic GET Request}}

```typescript
// {{external-api.service.ts}}
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

#### {{POST Request with Payload}}

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

### {{Using Axios}}

{{You can also use Axios or NestJS HttpModule for HTTP requests:}}

```bash
npm install axios
```

```typescript
// {{external-api.service.ts}}
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
      timeout: 10000, // {{10 second timeout}}
      headers: {
        'Authorization': `Bearer ${this.configService.get<string>('EXTERNAL_API_KEY')}`,
        'Content-Type': 'application/json',
      },
    });

    // {{Response interceptor for logging}}
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

### {{Timeout Configuration}}

{{When calling external APIs from Lambda, always set appropriate timeouts:}}

```typescript
// {{Recommended: Set timeout less than Lambda timeout}}
const response = await fetch(url, {
  method: 'GET',
  headers: { /* ... */ },
  signal: AbortSignal.timeout(25000), // {{25 seconds - Lambda default is 30s}}
});
```

{{For Axios:}}

```typescript
const client = axios.create({
  baseURL: apiUrl,
  timeout: 25000, // {{25 seconds}}
});
```

## {{Consuming Webhooks}}

### {{Webhook Controller Pattern}}

{{Create a controller to receive webhooks from external services:}}

```typescript
// {{webhook.controller.ts}}
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

    // {{Verify webhook signature}}
    const isValid = await this.webhookService.verifySignature(
      payload,
      signature,
      timestamp,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // {{Process the webhook event}}
    await this.webhookService.processPaymentEvent(payload);

    return { received: true };
  }
}
```

### {{Webhook Signature Verification}}

{{Always verify webhook signatures to ensure requests are from trusted sources:}}

```typescript
// {{webhook.service.ts}}
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
   * {{Verify webhook signature using HMAC}}
   */
  async verifySignature(
    payload: any,
    signature: string,
    timestamp: string,
  ): Promise<boolean> {
    if (!signature || !timestamp) {
      return false;
    }

    // {{Check timestamp to prevent replay attacks}}
    const now = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp, 10);
    const tolerance = 300; // {{5 minutes}}

    if (Math.abs(now - webhookTime) > tolerance) {
      this.logger.warn('Webhook timestamp is too old');
      return false;
    }

    // {{Calculate expected signature}}
    const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(signedPayload)
      .digest('hex');

    // {{Use timing-safe comparison}}
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
   * {{Process payment event based on type}}
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
    // {{Update order status, trigger notifications, etc.}}
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

### {{Idempotent Webhook Processing}}

{{Webhooks may be delivered multiple times. Use idempotency keys to prevent duplicate processing:}}

```typescript
// {{webhook.service.ts}}
import { PrismaService } from 'src/prisma';

@Injectable()
export class WebhookService {
  constructor(
    private readonly prismaService: PrismaService,
    // ...
  ) {}

  async processPaymentEvent(payload: any): Promise<void> {
    const webhookId = payload.id;

    // {{Check if already processed}}
    const existing = await this.prismaService.processedWebhook.findUnique({
      where: { webhookId },
    });

    if (existing) {
      this.logger.log(`Webhook ${webhookId} already processed, skipping`);
      return;
    }

    // {{Process the webhook}}
    await this.handleEvent(payload);

    // {{Mark as processed}}
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

## {{Retry and Error Handling}}

### {{Retry with Exponential Backoff}}

{{Implement retry logic for transient failures:}}

```typescript
// {{retry.utils.ts}}
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
 * {{Execute a function with exponential backoff retry}}
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

      // {{Don't retry on client errors (4xx)}}
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

### {{Using the Retry Utility}}

```typescript
// {{external-api.service.ts}}
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

### {{AWS Native Retry Mechanisms}}

{{For production workloads, consider using AWS-native retry mechanisms:}}

- **{{SQS + Lambda}}**: {{Configure SQS to retry failed messages with configurable `maxReceiveCount`}}
- **{{Step Functions}}**: {{Use the built-in Retry and Catch blocks in state machine definitions}}
- **{{Lambda Destinations}}**: {{Route failed invocations to SQS or SNS for reprocessing}}

#### {{Example: SQS Retry Configuration}}

```yaml
# {{serverless.yml}}
resources:
  Resources:
    ExternalApiQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: external-api-requests
        VisibilityTimeout: 60
        RedrivePolicy:
          deadLetterTargetArn: !GetAtt DeadLetterQueue.Arn
          maxReceiveCount: 3  # {{Retry 3 times before moving to DLQ}}

    DeadLetterQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: external-api-dlq
```

## {{Circuit Breaker Pattern}}

:::info {{Recommendation}}
{{The circuit breaker pattern is not built into the framework. For production applications with high API call volumes, consider implementing a circuit breaker or using a library like `cockatiel` or `opossum`.}}
:::

### {{Simple Circuit Breaker Implementation}}

```typescript
// {{circuit-breaker.ts}}
export enum CircuitState {
  CLOSED = 'CLOSED',     // {{Normal operation}}
  OPEN = 'OPEN',         // {{Failing fast}}
  HALF_OPEN = 'HALF_OPEN', // {{Testing recovery}}
}

export interface CircuitBreakerOptions {
  failureThreshold: number;  // {{Number of failures before opening}}
  resetTimeoutMs: number;    // {{Time before trying again}}
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

### {{Using the Circuit Breaker}}

```typescript
// {{external-api.service.ts}}
import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreaker } from './circuit-breaker';

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);
  private readonly circuitBreaker: CircuitBreaker;

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 30000, // {{30 seconds}}
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
    // {{Actual API call}}
    const response = await fetch(`${this.apiUrl}/resources/${resourceId}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }

  private getFallbackResource(resourceId: string): any {
    // {{Return cached data or default response}}
    return { id: resourceId, status: 'unavailable' };
  }
}
```

## {{Practical Example: Payment Gateway Integration}}

{{This example shows a complete integration with an external payment gateway:}}

```typescript
// {{payment-gateway.service.ts}}
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
   * {{Process payment with retry and error handling}}
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

      // {{Record successful payment in command store}}
      await this.recordPaymentResult(request, result, opts);

      return result;
    } catch (error) {
      this.logger.error(`Payment failed for order ${request.orderId}:`, error);

      // {{Record failed payment attempt}}
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
        'Idempotency-Key': request.orderId, // {{Prevent duplicate charges}}
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency,
        customer_id: request.customerId,
        metadata: { order_id: request.orderId },
      }),
      signal: AbortSignal.timeout(15000), // {{15 second timeout}}
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
    // {{Record payment result using CommandService}}
    // {{Implementation depends on your data model}}
  }
}
```

## {{Best Practices}}

### {{1. Always Set Timeouts}}

```typescript
// {{Set timeout shorter than Lambda timeout}}
const response = await fetch(url, {
  signal: AbortSignal.timeout(25000), // {{Lambda default is 30s}}
});
```

### {{2. Use Idempotency Keys}}

```typescript
// {{Prevent duplicate API calls}}
headers: {
  'Idempotency-Key': `${orderId}-${operationType}`,
}
```

### {{3. Log External API Interactions}}

```typescript
this.logger.log({
  message: 'External API call',
  url: endpoint,
  method: 'POST',
  duration: endTime - startTime,
  status: response.status,
});
```

### {{4. Handle Partial Failures Gracefully}}

```typescript
// {{Continue processing even if some external calls fail}}
const results = await Promise.allSettled(
  items.map((item) => this.callExternalApi(item)),
);

const succeeded = results.filter((r) => r.status === 'fulfilled');
const failed = results.filter((r) => r.status === 'rejected');

if (failed.length > 0) {
  this.logger.warn(`${failed.length} API calls failed`);
}
```

### {{5. Store Webhook Secrets Securely}}

```bash
# {{Use AWS Secrets Manager or SSM Parameter Store}}
WEBHOOK_SECRET=${ssm:/myapp/webhook-secret}
```

## {{See Also}}

- [{{Service Implementation Patterns}}](./service-patterns) - {{Core service patterns}}
- [{{Event Handling Patterns}}](./event-handling-patterns) - {{Event-driven architecture}}
- [{{Monitoring and Logging}}](./monitoring-logging) - {{Observability best practices}}
- [{{Error Catalog}}](./error-catalog) - {{Error handling reference}}
