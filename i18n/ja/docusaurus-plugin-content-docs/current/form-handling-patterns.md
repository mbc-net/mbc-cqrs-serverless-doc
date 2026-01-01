---
description: React Hook FormとZodバリデーションを使用したフォームの効果的な処理方法を学びます。
---

# フォーム処理パターン

このガイドでは、React Hook FormとZodを使用した型安全なフォームとバリデーションの構築方法を説明します。これらのパターンはAPIに送信する前にデータの整合性を確保し、ユーザーに明確なフィードバックを提供します。

## このガイドを使用するタイミング

以下が必要な場合にこのガイドを使用してください：

- エンティティ（製品、ユーザー、注文）の作成・編集用フォームを構築する
- APIに送信する前にユーザー入力を検証する
- フィールドレベルのエラーメッセージをユーザーに表示する
- 動的フィールド（注文アイテム、タグ）を持つ複雑なフォームを処理する
- 他のフォーム値に基づいて条件付きフィールドを表示する

## このパターンが解決する問題

| 問題 | 解決策 |
|---------|----------|
| 無効なデータがAPIに送信される | Zodが送信前に検証する |
| フォームとAPIの型が一致しない | ZodスキーマからTypeScript型を推論する |
| キー入力ごとにフォームが再レンダリングされる | React Hook Formは非制御入力を使用する |
| バリデーションエラーを表示しにくい | フィールドごとの自動エラー状態 |
| 動的フィールドの管理が複雑 | useFieldArrayが追加/削除を処理する |

## 技術スタック

| ライブラリ | 目的 |
|---------|---------|
| React Hook Form | フォーム状態管理 |
| Zod | スキーマバリデーション |
| @hookform/resolvers | Zod統合 |

## インストール

```bash
npm install react-hook-form zod @hookform/resolvers
```

## 基本的なフォーム構造

### ユースケース: 製品作成フォーム

シナリオ: ユーザーがコード、名前、価格、ステータスを持つ新しい製品を作成する必要がある。

解決策: バリデーションルール付きのスキーマを定義し、エラーを表示するフォームコンポーネントを作成する。

### Zodスキーマ定義

API要件に合致するバリデーションルールを定義します：

```typescript
// src/schemas/product.schema.ts
import { z } from 'zod';

export const createProductSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50, 'Code must be 50 characters or less')
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with hyphens'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be 200 characters or less'),
  price: z
    .number()
    .min(0, 'Price must be positive')
    .max(999999999, 'Price exceeds maximum'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional(),
  categoryId: z.string().min(1, 'Category is required'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT']),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// Update schema with optional fields and version
export const updateProductSchema = createProductSchema.partial().extend({
  version: z.number().int().positive(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
```

### フォームコンポーネント

スキーマをReact Hook Formに接続します：

```typescript
// src/components/forms/ProductForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createProductSchema,
  CreateProductInput,
} from '@/schemas/product.schema';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface ProductFormProps {
  onSubmit: (data: CreateProductInput) => Promise<void>;
  defaultValues?: Partial<CreateProductInput>;
  isLoading?: boolean;
}

export function ProductForm({
  onSubmit,
  defaultValues,
  isLoading,
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      status: 'DRAFT',
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="code" className="block text-sm font-medium">
          Code
        </label>
        <Input
          id="code"
          {...register('code')}
          error={errors.code?.message}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <Input
          id="name"
          {...register('name')}
          error={errors.name?.message}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium">
          Price
        </label>
        <Input
          id="price"
          type="number"
          {...register('price', { valueAsNumber: true })}
          error={errors.price?.message}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium">
          Status
        </label>
        <Select
          id="status"
          {...register('status')}
          options={[
            { value: 'DRAFT', label: 'Draft' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
          ]}
          error={errors.status?.message}
          disabled={isLoading}
        />
      </div>

      <Button
        type="submit"
        loading={isSubmitting || isLoading}
        disabled={isSubmitting || isLoading}
      >
        Save
      </Button>
    </form>
  );
}
```

## 再利用可能なフォームコンポーネント

### ユースケース: 一貫したフォームフィールドスタイリング

シナリオ: すべてのフォームフィールドは一貫したラベル、エラー表示、必須インジケーターを持つべき。

解決策: 共通フィールドUIを処理するラッパーコンポーネントを作成する。

```typescript
// src/components/ui/FormField.tsx
import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function FormField({
  label,
  error,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

### ユースケース: エラー状態付きの入力

シナリオ: 入力はバリデーションエラーを視覚的に示すべき。

```typescript
// src/components/ui/Input.tsx
import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'block w-full rounded-md border px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-blue-500',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
```

## 高度なフォームパターン

### ユースケース: 複数アイテムを持つ注文フォーム

シナリオ: ユーザーが複数の明細を持つ注文を作成する。アイテムは追加・削除可能。

問題: バリデーション付きのフィールド配列の管理が複雑。

解決策: useFieldArrayが適切なバリデーションと共に追加、削除、更新メソッドを提供する。

```typescript
// src/components/forms/OrderForm.tsx
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0),
});

const orderSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

type OrderInput = z.infer<typeof orderSchema>;

export function OrderForm({
  onSubmit,
}: {
  onSubmit: (data: OrderInput) => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      items: [{ productId: '', quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Customer</label>
        <Input {...register('customerId')} error={errors.customerId?.message} />
      </div>

      <div className="space-y-4">
        <h3>Order Items</h3>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-4 items-end">
            <Input
              {...register(`items.${index}.productId`)}
              placeholder="Product ID"
            />
            <Input
              type="number"
              {...register(`items.${index}.quantity`, { valueAsNumber: true })}
              placeholder="Qty"
            />
            <Button type="button" variant="danger" onClick={() => remove(index)}>
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => append({ productId: '', quantity: 1, price: 0 })}
        >
          Add Item
        </Button>
      </div>

      <Button type="submit">Create Order</Button>
    </form>
  );
}
```

### ユースケース: 条件付きフィールドを持つ支払いフォーム

シナリオ: フォームが支払い方法の選択に基づいて異なるフィールドを表示する。

問題: フィールド値を監視し、条件に応じて他のフィールドをレンダリングする必要がある。

解決策: useWatchがフォーム全体の再レンダリングを起こさずにフィールド変更を監視する。

```typescript
import { useForm, useWatch } from 'react-hook-form';

function PaymentForm() {
  const { control, register } = useForm({
    defaultValues: {
      paymentMethod: 'credit_card',
      cardNumber: '',
      bankAccount: '',
    },
  });

  const paymentMethod = useWatch({
    control,
    name: 'paymentMethod',
  });

  return (
    <form>
      <Select
        {...register('paymentMethod')}
        options={[
          { value: 'credit_card', label: 'Credit Card' },
          { value: 'bank_transfer', label: 'Bank Transfer' },
        ]}
      />

      {paymentMethod === 'credit_card' && (
        <Input {...register('cardNumber')} placeholder="Card Number" />
      )}

      {paymentMethod === 'bank_transfer' && (
        <Input {...register('bankAccount')} placeholder="Bank Account" />
      )}
    </form>
  );
}
```

## React Query付きフォーム

### ユースケース: API統合による製品作成

シナリオ: フォームデータをAPIに送信し、成功/エラー状態を処理する。

解決策: コンテナコンポーネントがフォームとReact Queryミューテーションを組み合わせる。

```typescript
// src/containers/products/CreateProductForm.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useCreateProduct } from '@/hooks/useProducts';
import { ProductForm } from '@/components/forms/ProductForm';
import { CreateProductInput } from '@/schemas/product.schema';
import { toast } from '@/components/ui/Toast';

export function CreateProductForm() {
  const router = useRouter();
  const createProduct = useCreateProduct();

  const handleSubmit = async (data: CreateProductInput) => {
    try {
      await createProduct.mutateAsync(data);
      toast.success('Product created successfully');
      router.push('/products');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create product'
      );
    }
  };

  return (
    <ProductForm onSubmit={handleSubmit} isLoading={createProduct.isPending} />
  );
}
```

### ユースケース: 事前入力データによる製品編集

シナリオ: 編集のために既存の製品データをフォームに読み込む。

問題: デフォルト値を持つフォームをレンダリングする前にデータを取得する必要がある。

解決策: コンテナがデータを取得し、defaultValuesとしてフォームに渡す。

```typescript
// src/containers/products/EditProductForm.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useProduct, useUpdateProduct } from '@/hooks/useProducts';
import { ProductForm } from '@/components/forms/ProductForm';
import { UpdateProductInput } from '@/schemas/product.schema';
import { toast } from '@/components/ui/Toast';

interface EditProductFormProps {
  pk: string;
  sk: string;
}

export function EditProductForm({ pk, sk }: EditProductFormProps) {
  const router = useRouter();
  const { data: product, isLoading } = useProduct(pk, sk);
  const updateProduct = useUpdateProduct();

  const handleSubmit = async (data: UpdateProductInput) => {
    try {
      await updateProduct.mutateAsync({
        pk,
        sk,
        dto: { ...data, version: product!.version },
      });
      toast.success('Product updated successfully');
      router.push('/products');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update product'
      );
    }
  };

  if (isLoading) return <Skeleton />;
  if (!product) return <NotFound />;

  return (
    <ProductForm
      defaultValues={product}
      onSubmit={handleSubmit}
      isLoading={updateProduct.isPending}
    />
  );
}
```

## 複雑なバリデーションパターン

### ユースケース: 日付範囲バリデーション

シナリオ: 終了日は開始日より後でなければならない。

解決策: Zod refineを使用して複数フィールドにわたるバリデーションを行う。

```typescript
const dateRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });
```

### ユースケース: 一意コードバリデーション

シナリオ: 製品コードはデータベースに既に存在してはならない。

問題: 一意性を確認するためにAPIを呼び出す必要がある。

解決策: async refineを使用してAPIに対してバリデーションを行う。

```typescript
const uniqueCodeSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .refine(
      async (code) => {
        const exists = await checkCodeExists(code);
        return !exists;
      },
      { message: 'This code is already in use' }
    ),
});

// In the form
const form = useForm({
  resolver: zodResolver(uniqueCodeSchema),
  mode: 'onBlur', // Validate on blur for async validation
});
```

## ベストプラクティス

### 1. スキーマをフォームと同じ場所に配置する

理由: バリデーションロジックをそれを使用するフォームの近くに保つ。

```text
src/
├── components/forms/
│   └── ProductForm/
│       ├── ProductForm.tsx
│       ├── ProductForm.schema.ts
│       └── index.ts
```

### 2. モードを適切に使用する

フォームの複雑さに基づいてバリデーションのタイミングを選択します：

```typescript
// Validate on submit (default) - best for simple forms
useForm({ mode: 'onSubmit' });

// Validate on blur - best for forms with async validation
useForm({ mode: 'onBlur' });

// Validate on change - best for real-time feedback
useForm({ mode: 'onChange' });
```

### 3. 共通スキーマを抽出する

理由: 複数のフォームでバリデーションルールを再利用する。

```typescript
// src/schemas/common.ts
export const requiredString = z.string().min(1, 'This field is required');
export const email = z.string().email('Invalid email address');
export const positiveNumber = z.number().positive('Must be positive');
```

### 4. サーバーエラーを処理する

シナリオ: サーバーがフィールドレベルのバリデーションエラーを返す。

解決策: setErrorを使用してサーバーエラーを特定のフィールドに表示する。

```typescript
function FormWithServerErrors() {
  const { setError, handleSubmit } = useForm();

  const onSubmit = async (data) => {
    try {
      await api.create(data);
    } catch (error) {
      if (error.details) {
        // Set field-level errors from server
        Object.entries(error.details).forEach(([field, messages]) => {
          setError(field, { message: messages[0] });
        });
      }
    }
  };

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
}
```
