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
| shadcn/ui Form | フォームUIコンポーネント |

## インストール

```bash
npm install react-hook-form zod @hookform/resolvers
```

## フォームコンポーネントアーキテクチャ

フォームシステムは階層化されたコンポーネントアーキテクチャを使用します：

| コンポーネント | 役割 |
|-----------|------|
| `Form` | フォーム全体をラップするコンテキストプロバイダー（react-hook-formのFormProviderを使用） |
| `FormField` | Controllerを使用してフィールドをフォーム状態に接続 |
| `FormItem` | 単一フォームフィールドのコンテナ（ラベル、入力、エラー） |
| `FormLabel` | フィールドに自動接続し、エラー状態を表示するラベル |
| `FormControl` | フォームフィールドのpropsを入力要素に渡す |
| `FormMessage` | バリデーションエラーメッセージを表示 |
| `FormDescription` | フィールドのオプションヘルプテキスト |

## 基本的なフォーム構造

### ユースケース: 製品作成フォーム

シナリオ: ユーザーがコード、名前、価格、ステータスを持つ新しい製品を作成する必要がある。

解決策: バリデーションルール付きのスキーマを定義し、一貫したエラー表示のためにFormコンポーネントを使用する。

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

// オプションフィールドとバージョンを含む更新スキーマ
export const updateProductSchema = createProductSchema.partial().extend({
  version: z.number().int().positive(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
```

### フォームコンポーネント

Formコンポーネントを使用してスキーマをReact Hook Formに接続します：

```typescript
// src/components/forms/ProductForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createProductSchema,
  CreateProductInput,
} from '@/schemas/product.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const form = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      status: 'DRAFT',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          loading={form.formState.isSubmitting || isLoading}
          disabled={form.formState.isSubmitting || isLoading}
        >
          Save
        </Button>
      </form>
    </Form>
  );
}
```

## 再利用可能なフォームコンポーネント

### ユースケース: 一貫したフォームフィールドスタイリング

シナリオ: すべてのフォームフィールドは一貫したラベル、エラー表示、必須インジケーターを持つべき。

解決策: shadcn/ui Formコンポーネントを使用するカスタムラッパーコンポーネントを作成する。

```typescript
// src/components/form/CustomFormItem.tsx
'use client';

import * as React from 'react';
import { FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';

export default function CustomFormItem({
  className,
  label,
  required,
  children,
}: {
  className?: string;
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <FormItem className={cn('flex w-full flex-col gap-2', className)}>
      <FormLabel className="font-semibold">
        <span className="text-[hsl(var(--foreground))]">{label}</span>
        {required && <span className="text-destructive ml-1">*</span>}
      </FormLabel>
      <div className="relative flex-col">
        {children}
        <FormMessage className="mt-2 text-xs font-semibold" />
      </div>
    </FormItem>
  );
}
```

### CustomFormItemの使用方法

```typescript
<FormField
  control={form.control}
  name="code"
  render={({ field }) => (
    <CustomFormItem label="Code" required>
      <FormControl>
        <Input {...field} />
      </FormControl>
    </CustomFormItem>
  )}
/>
```

### Inputコンポーネント（シンプル、error propなし）

注意: Inputコンポーネントにはerrorプロパティがありません。エラー表示はFormMessageによって処理されます。

```typescript
// src/components/ui/input.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm ring-offset-[hsl(var(--background))] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
```

## フォームコンポーネント実装

shadcn/uiのFormコンポーネントはコンテキストベースのエラー処理を提供します：

```typescript
// src/components/ui/form.tsx
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Label } from './label';

// FormはFormProviderを再エクスポートしたもの
const Form = FormProvider;

// {{Context type for FormField}}
type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

// FormFieldはControllerをラップし、フィールドコンテキストを提供
const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

// useFormFieldフックはコンテキストからフィールド状態を取得
const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>');
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

// {{Context type for FormItem}}
type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
);

// {{FormItem provides unique ID via context}}
const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn('space-y-2', className)} {...props} />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = 'FormItem';

// {{FormLabel shows error state via color}}
const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(error && 'text-[hsl(var(--destructive))]', className)}
      htmlFor={formItemId}
      {...props}
    />
  );
});
FormLabel.displayName = 'FormLabel';

// FormControlはアクセシビリティのためにaria属性を渡す
const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = 'FormControl';

// {{FormDescription provides help text}}
const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn('text-sm text-[hsl(var(--muted-foreground))]', className)}
      {...props}
    />
  );
});
FormDescription.displayName = 'FormDescription';

// FormMessageはコンテキストからエラーを自動表示
const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message) : children;

  if (!body) {
    return null;
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn(
        'text-sm font-medium text-[hsl(var(--destructive))]',
        className
      )}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

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
  const form = useForm<OrderInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      items: [{ productId: '', quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3>Order Items</h3>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-4 items-end">
              <FormField
                control={form.control}
                name={`items.${index}.productId`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} placeholder="Product ID" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`items.${index}.quantity`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        placeholder="Qty"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="button" variant="destructive" onClick={() => remove(index)}>
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
    </Form>
  );
}
```

### ユースケース: 条件付きフィールドを持つ支払いフォーム

シナリオ: フォームが支払い方法の選択に基づいて異なるフィールドを表示する。

問題: フィールド値を監視し、条件に応じて他のフィールドをレンダリングする必要がある。

解決策: useWatchがフォーム全体の再レンダリングを起こさずにフィールド変更を監視する。

```typescript
import { useForm, useWatch } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

function PaymentForm() {
  const form = useForm({
    defaultValues: {
      paymentMethod: 'credit_card',
      cardNumber: '',
      bankAccount: '',
    },
  });

  const paymentMethod = useWatch({
    control: form.control,
    name: 'paymentMethod',
  });

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {paymentMethod === 'credit_card' && (
          <FormField
            control={form.control}
            name="cardNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Card Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Card Number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {paymentMethod === 'bank_transfer' && (
          <FormField
            control={form.control}
            name="bankAccount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank Account</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Bank Account" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </form>
    </Form>
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
import { toast } from '@/components/ui/toast';

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
import { toast } from '@/components/ui/toast';

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

// フォーム内
const form = useForm({
  resolver: zodResolver(uniqueCodeSchema),
  mode: 'onBlur', // 非同期バリデーションのためにonBlurで検証
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
// 送信時に検証（デフォルト） - シンプルなフォームに最適
useForm({ mode: 'onSubmit' });

// フォーカスアウト時に検証 - 非同期バリデーションを持つフォームに最適
useForm({ mode: 'onBlur' });

// 変更時に検証 - リアルタイムフィードバックに最適
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
  const form = useForm();

  const onSubmit = async (data) => {
    try {
      await api.create(data);
    } catch (error) {
      if (error.details) {
        // サーバーからのフィールドレベルエラーを設定
        Object.entries(error.details).forEach(([field, messages]) => {
          form.setError(field, { message: messages[0] });
        });
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>...</form>
    </Form>
  );
}
```
