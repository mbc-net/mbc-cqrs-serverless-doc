---
description: {{Learn how to handle forms effectively using React Hook Form with Zod validation.}}
---

# {{Form Handling Patterns}}

{{This guide explains how to build type-safe forms with validation using React Hook Form and Zod. These patterns ensure data integrity before sending to the API and provide clear feedback to users.}}

## {{When to Use This Guide}}

{{Use this guide when you need to:}}

- {{Build forms for creating and editing entities (products, users, orders)}}
- {{Validate user input before submitting to the API}}
- {{Display field-level error messages to users}}
- {{Handle complex forms with dynamic fields (order items, tags)}}
- {{Show conditional fields based on other form values}}

## {{Problems This Pattern Solves}}

| {{Problem}} | {{Solution}} |
|---------|----------|
| {{Invalid data sent to API}} | {{Zod validates before submission}} |
| {{Type mismatch between form and API}} | {{Infer TypeScript types from Zod schema}} |
| {{Form re-renders on every keystroke}} | {{React Hook Form uses uncontrolled inputs}} |
| {{Hard to show validation errors}} | {{Automatic error state per field}} |
| {{Dynamic fields are complex to manage}} | {{useFieldArray handles add/remove}} |

## {{Technology Stack}}

| {{Library}} | {{Purpose}} |
|---------|---------|
| React Hook Form | {{Form state management}} |
| Zod | {{Schema validation}} |
| @hookform/resolvers | {{Zod integration}} |
| shadcn/ui Form | {{Form UI components}} |

## {{Installation}}

```bash
npm install react-hook-form zod @hookform/resolvers
```

## {{Form Component Architecture}}

{{The form system uses a layered component architecture:}}

| {{Component}} | {{Role}} |
|-----------|------|
| `Form` | {{Context provider that wraps the entire form (uses FormProvider from react-hook-form)}} |
| `FormField` | {{Connects a field to form state using Controller}} |
| `FormItem` | {{Container for a single form field (label, input, error)}} |
| `FormLabel` | {{Label that auto-connects to the field and shows error state}} |
| `FormControl` | {{Passes form field props to the input element}} |
| `FormMessage` | {{Displays validation error message}} |
| `FormDescription` | {{Optional help text for the field}} |

## {{Basic Form Structure}}

### {{Use Case: Product Create Form}}

{{Scenario: User needs to create a new product with code, name, price, and status.}}

{{Solution: Define schema with validation rules, use Form components for consistent error display.}}

### {{Zod Schema Definition}}

{{Define validation rules that match your API requirements:}}

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

// {{Update schema with optional fields and version}}
export const updateProductSchema = createProductSchema.partial().extend({
  version: z.number().int().positive(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
```

### {{Form Component}}

{{Connect the schema to React Hook Form using Form components:}}

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

## {{Reusable Form Components}}

### {{Use Case: Consistent Form Field Styling}}

{{Scenario: All form fields should have consistent label, error display, and required indicator.}}

{{Solution: Create a custom wrapper component that uses shadcn/ui Form components.}}

```typescript
// src/components/form/CustomFormItem.tsx
'use client';

import * as React from 'react';
import { FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';

interface CustomFormItemProps {
  className?: string;
  label: string;
  children: React.ReactNode;
  required?: boolean;
}

export default function CustomFormItem({
  className,
  label,
  required,
  children,
}: CustomFormItemProps) {
  return (
    <FormItem className={cn('flex w-full flex-col gap-2', className)}>
      <FormLabel className="font-semibold">
        <span>{label}</span>
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

### {{Using CustomFormItem}}

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

### {{Input Component (Simple, No Error Prop)}}

{{Note: The Input component does NOT have an error prop. Error display is handled by FormMessage.}}

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
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          'ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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

## {{Form Component Implementation}}

{{The Form components from shadcn/ui provide context-based error handling:}}

```typescript
// src/components/ui/form.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form';

// {{Form is just FormProvider re-exported}}
const Form = FormProvider;

// {{FormField wraps Controller and provides field context}}
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

// {{useFormField hook retrieves field state from context}}
const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  return {
    id: itemContext.id,
    name: fieldContext.name,
    formItemId: `${itemContext.id}-form-item`,
    formDescriptionId: `${itemContext.id}-form-item-description`,
    formMessageId: `${itemContext.id}-form-item-message`,
    ...fieldState,
  };
};

// {{FormControl passes aria attributes for accessibility}}
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

// {{FormMessage automatically displays error from context}}
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
      className={cn('text-sm font-medium text-destructive', className)}
      {...props}
    >
      {body}
    </p>
  );
});
```

## {{Advanced Form Patterns}}

### {{Use Case: Order Form with Multiple Items}}

{{Scenario: User creates an order with multiple line items. Items can be added or removed.}}

{{Problem: Managing array of fields with validation is complex.}}

{{Solution: useFieldArray provides add, remove, and update methods with proper validation.}}

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

### {{Use Case: Payment Form with Conditional Fields}}

{{Scenario: Form shows different fields based on payment method selection.}}

{{Problem: Need to watch a field value and conditionally render other fields.}}

{{Solution: useWatch subscribes to field changes without causing full form re-render.}}

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

## {{Form with React Query}}

### {{Use Case: Create Product with API Integration}}

{{Scenario: Submit form data to API and handle success/error states.}}

{{Solution: Container component combines form with React Query mutation.}}

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

### {{Use Case: Edit Product with Pre-populated Data}}

{{Scenario: Load existing product data into form for editing.}}

{{Problem: Need to fetch data before rendering form with default values.}}

{{Solution: Container fetches data, passes to form as defaultValues.}}

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

## {{Complex Validation Patterns}}

### {{Use Case: Date Range Validation}}

{{Scenario: End date must be after start date.}}

{{Solution: Use Zod refine to validate across multiple fields.}}

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

### {{Use Case: Unique Code Validation}}

{{Scenario: Product code must not already exist in database.}}

{{Problem: Need to call API to check uniqueness.}}

{{Solution: Use async refine to validate against API.}}

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

// {{In the form}}
const form = useForm({
  resolver: zodResolver(uniqueCodeSchema),
  mode: 'onBlur', // {{Validate on blur for async validation}}
});
```

## {{Best Practices}}

### {{1. Colocate Schemas with Forms}}

{{Why: Keeps validation logic close to the form that uses it.}}

```text
src/
├── components/forms/
│   └── ProductForm/
│       ├── ProductForm.tsx
│       ├── ProductForm.schema.ts
│       └── index.ts
```

### {{2. Use Mode Appropriately}}

{{Choose validation timing based on form complexity:}}

```typescript
// {{Validate on submit (default) - best for simple forms}}
useForm({ mode: 'onSubmit' });

// {{Validate on blur - best for forms with async validation}}
useForm({ mode: 'onBlur' });

// {{Validate on change - best for real-time feedback}}
useForm({ mode: 'onChange' });
```

### {{3. Extract Common Schemas}}

{{Why: Reuse validation rules across multiple forms.}}

```typescript
// src/schemas/common.ts
export const requiredString = z.string().min(1, 'This field is required');
export const email = z.string().email('Invalid email address');
export const positiveNumber = z.number().positive('Must be positive');
```

### {{4. Handle Server Errors}}

{{Scenario: Server returns field-level validation errors.}}

{{Solution: Use setError to display server errors on specific fields.}}

```typescript
function FormWithServerErrors() {
  const form = useForm();

  const onSubmit = async (data) => {
    try {
      await api.create(data);
    } catch (error) {
      if (error.details) {
        // {{Set field-level errors from server}}
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
