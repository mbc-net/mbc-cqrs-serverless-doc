---
description: Learn how to handle forms effectively using React Hook Form with Zod validation.
---

# Form Handling Patterns

This guide explains how to build type-safe forms with validation using React Hook Form and Zod. These patterns ensure data integrity before sending to the API and provide clear feedback to users.

## When to Use This Guide

Use this guide when you need to:

- Build forms for creating and editing entities (products, users, orders)
- Validate user input before submitting to the API
- Display field-level error messages to users
- Handle complex forms with dynamic fields (order items, tags)
- Show conditional fields based on other form values

## Problems This Pattern Solves

| Problem | Solution |
|---------|----------|
| Invalid data sent to API | Zod validates before submission |
| Type mismatch between form and API | Infer TypeScript types from Zod schema |
| Form re-renders on every keystroke | React Hook Form uses uncontrolled inputs |
| Hard to show validation errors | Automatic error state per field |
| Dynamic fields are complex to manage | useFieldArray handles add/remove |

## Technology Stack

| Library | Purpose |
|---------|---------|
| React Hook Form | Form state management |
| Zod | Schema validation |
| @hookform/resolvers | Zod integration |

## Installation

```bash
npm install react-hook-form zod @hookform/resolvers
```

## Basic Form Structure

### Use Case: Product Create Form

Scenario: User needs to create a new product with code, name, price, and status.

Solution: Define schema with validation rules, create form component that displays errors.

### Zod Schema Definition

Define validation rules that match your API requirements:

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

### Form Component

Connect the schema to React Hook Form:

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

## Reusable Form Components

### Use Case: Consistent Form Field Styling

Scenario: All form fields should have consistent label, error display, and required indicator.

Solution: Create a wrapper component that handles common field UI.

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

### Use Case: Input with Error State

Scenario: Input should visually indicate validation errors.

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

## Advanced Form Patterns

### Use Case: Order Form with Multiple Items

Scenario: User creates an order with multiple line items. Items can be added or removed.

Problem: Managing array of fields with validation is complex.

Solution: useFieldArray provides add, remove, and update methods with proper validation.

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

### Use Case: Payment Form with Conditional Fields

Scenario: Form shows different fields based on payment method selection.

Problem: Need to watch a field value and conditionally render other fields.

Solution: useWatch subscribes to field changes without causing full form re-render.

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

## Form with React Query

### Use Case: Create Product with API Integration

Scenario: Submit form data to API and handle success/error states.

Solution: Container component combines form with React Query mutation.

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

### Use Case: Edit Product with Pre-populated Data

Scenario: Load existing product data into form for editing.

Problem: Need to fetch data before rendering form with default values.

Solution: Container fetches data, passes to form as defaultValues.

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

## Complex Validation Patterns

### Use Case: Date Range Validation

Scenario: End date must be after start date.

Solution: Use Zod refine to validate across multiple fields.

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

### Use Case: Unique Code Validation

Scenario: Product code must not already exist in database.

Problem: Need to call API to check uniqueness.

Solution: Use async refine to validate against API.

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

## Best Practices

### 1. Colocate Schemas with Forms

Why: Keeps validation logic close to the form that uses it.

```text
src/
├── components/forms/
│   └── ProductForm/
│       ├── ProductForm.tsx
│       ├── ProductForm.schema.ts
│       └── index.ts
```

### 2. Use Mode Appropriately

Choose validation timing based on form complexity:

```typescript
// Validate on submit (default) - best for simple forms
useForm({ mode: 'onSubmit' });

// Validate on blur - best for forms with async validation
useForm({ mode: 'onBlur' });

// Validate on change - best for real-time feedback
useForm({ mode: 'onChange' });
```

### 3. Extract Common Schemas

Why: Reuse validation rules across multiple forms.

```typescript
// src/schemas/common.ts
export const requiredString = z.string().min(1, 'This field is required');
export const email = z.string().email('Invalid email address');
export const positiveNumber = z.number().positive('Must be positive');
```

### 4. Handle Server Errors

Scenario: Server returns field-level validation errors.

Solution: Use setError to display server errors on specific fields.

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
