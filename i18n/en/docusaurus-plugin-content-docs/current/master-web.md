---
description: Learn about the Master Web package for building master data management UI components.
---

# Master Web

Frontend component library for master data and settings management in MBC CQRS Serverless applications.

## Installation

```bash
npm install @mbc-cqrs-serverless/master-web
```

## Overview

The Master Web package (`@mbc-cqrs-serverless/master-web`) provides a complete set of React components for managing master data and settings. It integrates seamlessly with the backend Master Service and includes pre-built pages, forms, and data tables.

## Features

- **Master Settings Management**: View, create, edit, and delete master settings
- **Master Data Management**: CRUD operations for master data records
- **Rich Text Editor**: Built-in rich text editor for content fields
- **JSON Editor**: JSON editor for structured data fields
- **Data Tables**: Sortable, paginated tables with TanStack Table
- **Real-time Updates**: AWS AppSync integration for real-time data sync
- **Copy Functionality**: Clone master settings and data

## Main Components

### MasterSetting

Displays a list of master settings with search, filter, and pagination capabilities.

```tsx
import { MasterSetting } from "@mbc-cqrs-serverless/master-web/MasterSetting";
import "@mbc-cqrs-serverless/master-web/styles.css";

export default function MasterSettingsPage() {
  return <MasterSetting />;
}
```

### EditMasterSettings

Form component for creating and editing master settings.

```tsx
import { EditMasterSettings } from "@mbc-cqrs-serverless/master-web/EditMasterSettings";

export default function EditMasterSettingsPage({ params }: { params: { id: string } }) {
  return <EditMasterSettings id={params.id} />;
}
```

### MasterData

Displays master data records in a table format with CRUD operations.

```tsx
import { MasterData } from "@mbc-cqrs-serverless/master-web/MasterData";

export default function MasterDataPage() {
  return <MasterData />;
}
```

### EditMasterData

Form component for creating and editing master data records.

```tsx
import { EditMasterData } from "@mbc-cqrs-serverless/master-web/EditMasterData";

export default function EditMasterDataPage({ params }: { params: { id: string } }) {
  return <EditMasterData id={params.id} />;
}
```

## Provider Setup

Wrap your application with the required providers for authentication and API access.

### AppProviders

The `AppProviders` component requires a `user` prop of type `UserContext` containing tenant information.

```tsx
import { AppProviders } from "@mbc-cqrs-serverless/master-web/AppProviders";
import type { UserContext } from "@mbc-cqrs-serverless/master-web";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // UserContext contains tenant information
  const user: UserContext = {
    tenantCode: "your-tenant-code",
    tenantRole: "admin",
  };

  return (
    <AppProviders user={user}>
      {children}
    </AppProviders>
  );
}
```

### AppProviders Props

| Prop | Type | Required | Description |
|----------|----------|--------------|-----------------|
| `user` | `UserContext` | Yes | User context with tenant information |
| `httpClient` | `AxiosInstance` | No | Custom Axios instance for HTTP requests |
| `apolloClient` | `ApolloClient` | No | Custom Apollo Client instance |
| `urlProvider` | `IUrlProvider` | No | Custom URL provider instance |

### UserContext Type

```tsx
type UserContext = {
  tenantCode: string;  // Tenant identifier
  tenantRole: string;  // User role within the tenant
};
```

## URL Provider

The package provides a URL provider system for managing application URLs.

### IUrlProvider Interface

The `IUrlProvider` interface defines the contract for URL generation:

```tsx
interface IUrlProvider {
  // Static URLs
  readonly SETTINGS_PAGE_URL: string;
  readonly ADD_SETTINGS_PAGE_URL: string;
  readonly EDIT_SETTINGS_PAGE_URL: string;
  readonly DATA_PAGE_URL: string;
  readonly ADD_DATA_PAGE_URL: string;
  readonly EDIT_DATA_PAGE_URL: string;
  readonly FAQ_CATEGORY_PAGE_URL: string;
  readonly TOP_URL: string;

  // Dynamic URL generators
  getCopySettingPageUrl(id: string): string;
  getDetailedCopySettingPageUrl(id: string): string;
}
```

### BaseUrlProvider Class

The `BaseUrlProvider` class provides a default implementation:

```tsx
import { BaseUrlProvider, IUrlProvider } from "@mbc-cqrs-serverless/master-web/UrlProvider";

// Create a URL provider with a base segment
const urlProvider = new BaseUrlProvider("my-tenant");

// Access static URLs
console.log(urlProvider.SETTINGS_PAGE_URL);  // "/my-tenant/master-setting"
console.log(urlProvider.DATA_PAGE_URL);      // "/my-tenant/master-data"

// Generate dynamic URLs
console.log(urlProvider.getCopySettingPageUrl("123"));  // "/my-tenant/master-setting/123/copy/new"
```

### Custom URL Provider

You can create a custom URL provider by implementing the `IUrlProvider` interface or extending `BaseUrlProvider`:

```tsx
import { BaseUrlProvider } from "@mbc-cqrs-serverless/master-web/UrlProvider";
import { AppProviders } from "@mbc-cqrs-serverless/master-web/AppProviders";

class CustomUrlProvider extends BaseUrlProvider {
  constructor(tenantCode: string) {
    super(`members/${tenantCode}`);
  }
}

// Use custom URL provider with AppProviders
const customUrlProvider = new CustomUrlProvider("my-tenant");

<AppProviders user={user} urlProvider={customUrlProvider}>
  {children}
</AppProviders>
```

## Custom Hooks

### useApolloClient

Access the Apollo Client for GraphQL operations.

```tsx
import { useApolloClient } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const client = useApolloClient();
  // Use client for custom GraphQL queries
}
```

### useHttpClient

Access the HTTP client for REST API calls.

```tsx
import { useHttpClient } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const httpClient = useHttpClient();
  // Use httpClient for custom API requests
}
```

### useUserContext

Access the current user context with tenant information.

```tsx
import { useUserContext } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { tenantCode, tenantRole } = useUserContext();
  // Access tenant information
  console.log(`Tenant: ${tenantCode}, Role: ${tenantRole}`);
}
```

### useLoadingStore

Manage global loading state across components.

```tsx
import { useLoadingStore } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { isLoading, setLoading, closeLoading } = useLoadingStore();

  // Show loading indicator
  setLoading();

  // Hide loading indicator
  closeLoading();
}
```

### useUrlProvider

Access the URL provider for generating application URLs.

```tsx
import { useUrlProvider } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const urlProvider = useUrlProvider();

  // Use static URLs
  const settingsUrl = urlProvider.SETTINGS_PAGE_URL;

  // Generate dynamic URLs
  const copyUrl = urlProvider.getCopySettingPageUrl("item-123");
}
```

### useAppServices

Access all application services at once. Returns the HTTP client, Apollo client, user context, and URL provider.

```tsx
import { useAppServices } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { httpClient, apolloClient, user, urlProvider } = useAppServices();

  // Use multiple services in one component
  const fetchData = async () => {
    const response = await httpClient.get("/api/data");
    // ...
  };
}
```

**Return Value:**

| Property | Type | Description |
|----------|------|-------------|
| `httpClient` | `AxiosInstance` | HTTP client for REST API calls |
| `apolloClient` | `ApolloClient` | Apollo client for GraphQL operations |
| `user` | `UserContext` | Current user context and authentication state |
| `urlProvider` | `IUrlProvider` | URL provider for generating URLs |

### useSubscribeCommandStatus

:::warning Internal API
This hook is not exported from the main package and is for internal use only. It may change without notice.
:::

Subscribe to AppSync command status updates. Used to track the progress and completion of backend commands.

```tsx
import { useSubscribeCommandStatus } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { isListening, message, start } = useSubscribeCommandStatus(
    tenantCode,
    async (msg) => {
      if (msg) {
        // Command completed successfully
        console.log("Command finished:", msg);
      } else {
        // Command timed out
        console.log("Command timed out");
      }
    },
    true // Show processing toast
  );

  const handleSubmit = async () => {
    const requestId = await submitCommand();
    start(requestId, 30000); // Start listening with 30s timeout
  };
}
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `xTenantCode` | `string` | Tenant code for the subscription |
| `doneCallback` | `(msg: DecodedMessage \| null) => void` | Callback when command completes or times out |
| `isShowProcess` | `boolean` | Whether to show processing toast (default: true) |

**Return Value:**

| Property | Type | Description |
|----------|------|-------------|
| `isListening` | `boolean` | Whether actively listening for updates |
| `message` | `DecodedMessage \| null` | Latest received message |
| `start` | `(reqId: string, timeoutMs?: number) => void` | Start listening for a request ID |

### useSubscribeBulkCommandStatus

:::warning Internal API
This hook is not exported from the main package and is for internal use only. It may change without notice.
:::

Subscribe to bulk command status updates. Used when processing multiple items where each receives its own completion message.

```tsx
import { useSubscribeBulkCommandStatus } from "@mbc-cqrs-serverless/master-web";

function BulkOperationComponent() {
  const { isListening, messages, finishedCount, start, stop } =
    useSubscribeBulkCommandStatus(
      tenantCode,
      () => {
        // Handle timeout
        console.log("Bulk operation timed out");
      }
    );

  const handleBulkSubmit = async (items: Item[]) => {
    const requestId = await submitBulkCommand(items);
    start(requestId, 60000); // 60s timeout
  };

  // Check if all items are processed
  useEffect(() => {
    if (finishedCount === expectedCount) {
      stop();
      // All items processed
    }
  }, [finishedCount]);
}
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `xTenantCode` | `string` | Tenant code for the subscription |
| `onTimeout` | `() => void` | Optional callback when operation times out |

**Return Value:**

| Property | Type | Description |
|----------|------|-------------|
| `isListening` | `boolean` | Whether actively listening for updates |
| `messages` | `DecodedMessage[]` | All received messages |
| `finishedCount` | `number` | Number of completed items |
| `start` | `(reqId: string, timeoutMs?: number) => void` | Start listening for a request ID |
| `stop` | `() => void` | Manually stop listening |

### useHealthCheck

:::warning Internal API
This hook is not exported from the main package and is for internal use only. It may change without notice.
:::

Performs a health check API call on component mount. Controlled by the `NEXT_PUBLIC_ENABLE_HEALTH_CHECK` environment variable.

```tsx
import { useHealthCheck } from "@mbc-cqrs-serverless/master-web";

function App() {
  // Automatically calls health check endpoint on mount
  useHealthCheck();

  return <div>Application content</div>;
}
```

**Environment Variable:**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_ENABLE_HEALTH_CHECK` | Set to "true" to enable health check calls |

### usePagination

:::warning Internal API
This hook is not exported from the main package and is for internal use only. It may change without notice.
:::

Comprehensive hook for handling pagination with search, sorting, and table views. Integrates with URL query parameters for persistent state.

```tsx
import { usePagination } from "@mbc-cqrs-serverless/master-web";
import { parseAsString } from "next-usequerystate";

interface SearchProps extends SearchPropsBase {
  name?: string;
  status?: string;
}

function DataListPage() {
  const {
    searchProps,
    paginate,
    onSubmitSearch,
    executeSearch,
    handlePaginationChange,
    handleSortChange,
  } = usePagination<DataRecord, SearchProps, Paginate<DataRecord>>({
    searchPropDefinitions: {
      name: parseAsString,
      status: parseAsString,
    },
    getData: async (queries) => {
      return await fetchData(queries);
    },
    rootPath: "/data-list",
    isSearchInit: true,
  });

  useEffect(() => {
    executeSearch();
  }, []);

  return (
    <DataTable
      data={paginate?.results ?? []}
      onPaginationChange={handlePaginationChange}
      onSortChange={handleSortChange}
    />
  );
}
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `searchPropDefinitions` | `UseQueryStatesKeysMap` | Query parameter definitions using next-usequerystate |
| `getData` | `(queries) => Promise<Paginate>` | Function to fetch paginated data from server |
| `getDataClient` | `(queries) => Promise<Array>` | Function for client-side data filtering |
| `isSearchInit` | `boolean` | Whether to search on initial load (default: true) |
| `rootPath` | `string` | Root path for the page (used for path validation) |
| `tableViews` | `TableView[]` | Optional predefined table view configurations |
| `getStorage` | `() => SearchProps` | Function to retrieve saved search conditions |
| `setStorage` | `(props) => void` | Function to save search conditions |
| `reset` | `UseFormReset` | Form reset function from react-hook-form |
| `setValue` | `UseFormSetValue` | Form setValue function from react-hook-form |

**Return Value:**

| Property | Type | Description |
|----------|------|-------------|
| `searchProps` | `SearchProps` | Current search parameters |
| `queries` | `SearchProps` | URL query parameters |
| `paginate` | `Paginate<T>` | Paginated results with count and data |
| `onSubmitSearch` | `(props) => Promise<void>` | Submit search with new parameters |
| `executeSearch` | `() => Promise<object>` | Execute search with current parameters |
| `handlePaginationChange` | `OnChangeFn<PaginationState>` | Handler for page/size changes |
| `handleSortChange` | `OnChangeFn<SortingState>` | Handler for sort changes |
| `onResetSearchForm` | `() => Promise<void>` | Reset search form to empty values |

### usePaginationRange

:::warning Internal API
This hook and the `DOTS` constant are not exported from the main package and are for internal use only. They may change without notice.
:::

Calculates the page number range for pagination UI, including ellipsis for large page counts.

```tsx
import { usePaginationRange, DOTS } from "@mbc-cqrs-serverless/master-web";

function PaginationUI({ totalPages, currentPage }: Props) {
  const range = usePaginationRange({
    totalPageCount: totalPages,
    currentPage: currentPage,
    siblingCount: 1,
  });

  return (
    <nav>
      {range.map((item, index) => (
        item === DOTS ? (
          <span key={index}>...</span>
        ) : (
          <button key={index} onClick={() => goToPage(item as number)}>
            {item}
          </button>
        )
      ))}
    </nav>
  );
}
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `totalPageCount` | `number` | Total number of pages |
| `currentPage` | `number` | Current active page number |
| `siblingCount` | `number` | Number of page buttons to show on each side (default: 1) |

**Return Value:**

`(number | string)[]` - Array of page numbers and DOTS ("...") for ellipsis

### useLoadingForm

:::warning Internal API
This hook is not exported from the main package and is for internal use only. It may change without notice.
:::

Combines react-hook-form with global loading state. Provides form utilities along with loading state management.

```tsx
import { useLoadingForm } from "@mbc-cqrs-serverless/master-web";

interface FormData {
  name: string;
  email: string;
}

function MyForm() {
  const {
    form,
    control,
    handleSubmit,
    loading,
    loadingStore,
    errors,
  } = useLoadingForm<FormData>({
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    loadingStore.setLoading();
    try {
      await saveData(data);
    } finally {
      loadingStore.closeLoading();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `props` | `UseFormProps<T>` | react-hook-form useForm options |

**Return Value:**

| Property | Type | Description |
|----------|------|-------------|
| `form` | `UseFormReturn<T>` | Full react-hook-form instance |
| `control` | `Control<T>` | Form control for controlled components |
| `handleSubmit` | `UseFormHandleSubmit<T>` | Form submit handler |
| `watch` | `UseFormWatch<T>` | Watch form values |
| `getValues` | `UseFormGetValues<T>` | Get form values |
| `setValue` | `UseFormSetValue<T>` | Set form values |
| `reset` | `UseFormReset<T>` | Reset form |
| `trigger` | `UseFormTrigger<T>` | Trigger validation |
| `errors` | `FieldErrors<T>` | Form validation errors |
| `loading` | `boolean` | Current loading state |
| `loadingStore` | `LoadingState` | Loading store with setLoading/closeLoading |
| `isValid` | `boolean` | Whether form is valid |

### useAsyncAction

:::warning Internal API
This hook is not exported from the main package and is for internal use only. It may change without notice.
:::

Execute async functions with automatic loading overlay. Shows global loading indicator during async operations.

```tsx
import { useAsyncAction } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { performAction, isLoading } = useAsyncAction();

  const handleClick = async () => {
    const result = await performAction(async () => {
      // This runs with loading overlay
      return await fetchData();
    });
    console.log(result);
  };

  return (
    <button onClick={handleClick} disabled={isLoading}>
      Load Data
    </button>
  );
}
```

**Return Value:**

| Property | Type | Description |
|----------|------|-------------|
| `performAction` | `<T>(fn: () => Promise<T>) => Promise<T>` | Execute async function with loading overlay |
| `isLoading` | `boolean` | Current loading state |

### useNavigation

:::warning Internal API
This hook is not exported from the main package and is for internal use only. It may change without notice.
:::

Navigate between pages with automatic loading indicator. Wraps Next.js router with loading state management.

```tsx
import { useNavigation } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { navigate, reload, hardNavigate } = useNavigation();

  return (
    <div>
      <button onClick={() => navigate("/dashboard")}>
        Go to Dashboard
      </button>
      <button onClick={() => reload()}>
        Refresh Page
      </button>
      <button onClick={() => hardNavigate("/external-page")}>
        Full Page Navigation
      </button>
    </div>
  );
}
```

**Return Value:**

| Property | Type | Description |
|----------|------|-------------|
| `navigate` | `(url: string) => void` | Navigate using Next.js router with loading indicator |
| `reload` | `() => void` | Refresh current page with loading indicator |
| `hardNavigate` | `(url: string) => void` | Full browser navigation (window.location) |

## UI Components

The package includes several reusable UI components:

### JsonEditor

A JSON editor component for editing structured data.

```tsx
import { JsonEditor } from "@mbc-cqrs-serverless/master-web";

function MyForm() {
  return (
    <JsonEditor
      json={jsonData}
      onChange={handleChange}
    />
  );
}
```

#### JsonEditor Props

| Prop | Type | Required | Description |
|----------|----------|--------------|-----------------|
| `json` | `object` | Yes | The JSON data to display and edit |
| `onChange` | `(json: object) => void` | No | Callback when JSON content changes |

### RichTextEditor

A rich text editor for content fields.

```tsx
import { RichTextEditor } from "@mbc-cqrs-serverless/master-web";

function MyForm() {
  return (
    <RichTextEditor
      value={content}
      onChange={handleChange}
      placeholder="Enter your content here..."
    />
  );
}
```

#### RichTextEditor Props

| Prop | Type | Required | Description |
|----------|----------|--------------|-----------------|
| `value` | `string` | Yes | The HTML content for the editor |
| `onChange` | `(value: string) => void` | Yes | Callback when content changes |
| `placeholder` | `string` | No | Placeholder text when editor is empty |

### MsLayout

Layout component for master management pages. Provides loading overlay and toast notifications.

```tsx
import { MsLayout } from "@mbc-cqrs-serverless/master-web/MsLayout";

function MasterPage() {
  return (
    <MsLayout useLoading={true}>
      <MasterSetting />
    </MsLayout>
  );
}
```

#### MsLayout Props

| Prop | Type | Required | Description |
|----------|----------|--------------|-----------------|
| `useLoading` | `boolean` | Yes | Enable or disable the loading overlay |
| `children` | `React.ReactNode` | Yes | Child components to render |

### ConfirmButton

:::warning Internal API
This component is not exported from the main package and is for internal use only. It may change without notice.
:::

Button component that displays a confirmation dialog before executing an action. Useful for destructive operations like delete.

#### ConfirmButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'default'` | Button size |
| `triggerBtnText` | `string` | - | Text displayed on the trigger button |
| `title` | `string` | - | Title of the confirmation dialog |
| `cancelText` | `string` | - | Text for the cancel button |
| `confirmText` | `string` | - | Text for the confirm button |
| `loading` | `boolean` | `false` | Shows loading state on the button |
| `onConfirm` | `() => void` | - | Callback function when confirm is clicked |
| `className` | `string` | - | Additional CSS classes |
| `disabled` | `boolean` | `false` | Disables the button |
| `variant` | `string` | - | Button variant style |

```tsx
import ConfirmButton from "@mbc-cqrs-serverless/master-web/components/buttons/ConfirmButton";

function DeleteAction() {
  const handleDelete = () => {
    // Perform delete operation
  };

  return (
    <ConfirmButton
      triggerBtnText="Delete"
      title="Are you sure you want to delete this item?"
      cancelText="Cancel"
      confirmText="Delete"
      variant="destructive"
      onConfirm={handleDelete}
    />
  );
}
```

### BackButton

:::warning Internal API
This component is not exported from the main package and is for internal use only. It may change without notice.
:::

Navigation button component for returning to the previous page or a specified location.

#### BackButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onClickPrev` | `() => void` | - | Callback function when button is clicked |
| `className` | `string` | - | Additional CSS classes |

```tsx
import { BackButton } from "@mbc-cqrs-serverless/master-web/components/buttons";
import { useRouter } from "next/navigation";

function DetailPage() {
  const router = useRouter();

  return (
    <div>
      {/* Page content */}
      <BackButton onClickPrev={() => router.back()} />
    </div>
  );
}
```

### DatePicker

:::warning Internal API
This component is not exported from the main package and is for internal use only. It may change without notice.
:::

Date selection component with calendar popup. Uses date-fns for formatting and Japanese locale support.

#### DatePicker Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Date \| string` | - | Current selected date value |
| `onChange` | `(date?: string) => void` | - | Callback when date is selected (returns ISO string with timezone) |
| `disabled` | `boolean` | `false` | Disables the date picker |

```tsx
import DatePicker from "@mbc-cqrs-serverless/master-web/components/form/DatePicker";
import { useState } from "react";

function DateForm() {
  const [date, setDate] = useState<string>();

  return (
    <DatePicker
      value={date}
      onChange={(newDate) => setDate(newDate)}
    />
  );
}
```

### FormSubmitButton

:::warning Internal API
This component is not exported from the main package and is for internal use only. It may change without notice.
:::

Submit button component designed to work with react-hook-form. Automatically handles form state, validation errors, and loading states.

#### FormSubmitButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Button content |
| `disabled` | `boolean` | `false` | Manually disable the button |
| `loading` | `boolean` | `false` | Shows loading state |
| `className` | `string` | - | Additional CSS classes |
| `disableDirty` | `boolean` | `false` | If true, button is enabled even when form is not dirty |

The button is automatically disabled when:
- There are validation errors in the form
- The form has not been modified (unless `disableDirty` is true)

```tsx
import FormSubmitButton from "@mbc-cqrs-serverless/master-web/components/form/FormSubmitButton";
import { FormProvider, useForm } from "react-hook-form";
import { useState } from "react";

function MyForm() {
  const methods = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {/* Form fields */}
        <FormSubmitButton loading={isSubmitting}>
          Save
        </FormSubmitButton>
      </form>
    </FormProvider>
  );
}
```

### DataTable

:::warning Internal API
This component is not exported from the main package and is for internal use only. It may change without notice.
:::

Full-featured data table component built on TanStack Table. Supports server-side pagination, sorting, row selection, and custom column definitions.

#### DataTable Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `ColumnDef<TData, TValue>[]` | - | Column definitions using TanStack Table format |
| `data` | `TData[]` | - | Array of data to display |
| `pageCount` | `number` | - | Total number of pages |
| `rowCount` | `number` | - | Total number of rows |
| `pagination` | `PaginationState` | - | Current pagination state (pageIndex, pageSize) |
| `onPaginationChange` | `OnChangeFn<PaginationState>` | - | Callback when pagination changes |
| `sorting` | `SortingState` | - | Current sorting state |
| `onSortingChange` | `OnChangeFn<SortingState>` | - | Callback when sorting changes |
| `onClickRow` | `(row: TData) => void` | - | Callback when a row is clicked |
| `rowKey` | `keyof TData \| ((row: TData) => string)` | - | Key extractor for row identification |
| `rowSelection` | `RowSelectionState` | - | Current row selection state |
| `onRowSelectionChange` | `(state: RowSelectionState) => void` | - | Callback when row selection changes |

#### DataTable Features

- Server-side pagination with page size options (10, 20, 50, 100)
- Jump to specific page functionality
- Column sorting
- Row selection
- Click handler for row navigation
- Empty state display
- Custom column widths via column meta

```tsx
import { DataTable } from "@mbc-cqrs-serverless/master-web/components/table/data-table";
import { ColumnDef, OnChangeFn, PaginationState, SortingState } from "@tanstack/react-table";
import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
};

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
    meta: { size: "200px" },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
];

function UserList() {
  const router = useRouter();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // Fetch data based on pagination and sorting
  const { data, pageCount, rowCount } = useUsers(pagination, sorting);

  return (
    <DataTable
      columns={columns}
      data={data}
      pageCount={pageCount}
      rowCount={rowCount}
      pagination={pagination}
      onPaginationChange={setPagination}
      sorting={sorting}
      onSortingChange={setSorting}
      rowKey="id"
      onClickRow={(row) => router.push(`/users/${row.id}`)}
    />
  );
}
```

### LoadingOverlay

:::warning Internal API
This component is not exported from the main package and is for internal use only. It may change without notice.
:::

Full-screen loading overlay component with spinner animation. Useful for indicating loading state during async operations.

#### LoadingOverlay Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isLoading` | `boolean` | - | Controls visibility of the overlay |

```tsx
import LoadingOverlay from "@mbc-cqrs-serverless/master-web/components/LoadingOverlay";
import { useState } from "react";

function MyPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await saveData();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <LoadingOverlay isLoading={isLoading} />
      {/* Page content */}
    </div>
  );
}
```

## Environment Variables

Configure the following environment variables for the Master Web package:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_MASTER_API_BASE` | Base URL for REST API endpoints |
| `NEXT_PUBLIC_MASTER_APPSYNC_URL` | AWS AppSync GraphQL endpoint URL |
| `NEXT_PUBLIC_MASTER_APPSYNC_APIKEY` | AWS AppSync API key for authentication |
| `NEXT_PUBLIC_MASTER_APPSYNC_REGION` | AWS region for AppSync |

### Example .env.local

```bash
NEXT_PUBLIC_MASTER_API_BASE=https://api.example.com
NEXT_PUBLIC_MASTER_APPSYNC_URL=https://xxxxxxxx.appsync-api.ap-northeast-1.amazonaws.com/graphql
NEXT_PUBLIC_MASTER_APPSYNC_APIKEY=da2-xxxxxxxxxxxxxxxxx
NEXT_PUBLIC_MASTER_APPSYNC_REGION=ap-northeast-1
```

## Styling

Import the package styles in your application:

```tsx
import "@mbc-cqrs-serverless/master-web/styles.css";
```

The components use Tailwind CSS for styling. Ensure your project has Tailwind CSS configured.

## Dependencies

Key dependencies used by this package:

- React 18.x
- Next.js 14.x
- TanStack React Table 8.x
- Apollo Client
- Radix UI components
- Tailwind CSS 3.x
- react-hook-form
- Zod for validation
