---
description: Learn about the Master Web package for building master data management UI components.
---

# Master Web

Frontend component library for master data and settings management in MBC CQRS Serverless applications.

## Installation

```bash
npm install @mbc-cqrs-serverless/master-web
```

## {{Quick Start (Recommended Setup)}}

:::tip {{Start Here}}
{{**This is the recommended way to integrate master-web with Next.js App Router.** Following this pattern will help you avoid common issues like `httpClient.get is not a function` errors.}}
:::

{{When using this library with Next.js App Router (v14+/v15), use the **Layout-based Provider Pattern**. Set up `AppProviders` in a `layout.tsx` file, and use dynamic imports for components in `page.tsx` files.}}

### {{Step 1: Create layout.tsx}}

{{Create a layout file that sets up the providers. This ensures the context is properly initialized before child components mount.}}

```tsx
// app/admin/[tenant]/master/layout.tsx
'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'
import type { IUrlProvider } from '@mbc-cqrs-serverless/master-web/UrlProvider'

// Dynamic import of AppProviders (SSR disabled)
const AppProviders = dynamic(
  () =>
    import('@mbc-cqrs-serverless/master-web/AppProviders').then(
      (mod) => mod.AppProviders
    ),
  { ssr: false }
)

// {{Custom URL provider for your application's routing}}
class MasterUrlProvider implements IUrlProvider {
  protected readonly baseUrl: string
  public readonly SETTINGS_PAGE_URL: string
  public readonly ADD_SETTINGS_PAGE_URL: string
  public readonly EDIT_SETTINGS_PAGE_URL: string
  public readonly DATA_PAGE_URL: string
  public readonly ADD_DATA_PAGE_URL: string
  public readonly EDIT_DATA_PAGE_URL: string
  public readonly FAQ_CATEGORY_PAGE_URL: string
  public readonly TOP_URL: string

  constructor(tenantCode: string) {
    this.baseUrl = `/admin/${tenantCode}/master`
    this.SETTINGS_PAGE_URL = `${this.baseUrl}/master-setting`
    this.ADD_SETTINGS_PAGE_URL = `${this.baseUrl}/master-setting/new`
    this.EDIT_SETTINGS_PAGE_URL = this.SETTINGS_PAGE_URL
    this.DATA_PAGE_URL = `${this.baseUrl}/master-data`
    this.ADD_DATA_PAGE_URL = `${this.baseUrl}/master-data/new`
    this.EDIT_DATA_PAGE_URL = this.DATA_PAGE_URL
    this.FAQ_CATEGORY_PAGE_URL = `${this.baseUrl}/faq-category`
    this.TOP_URL = `/admin/${tenantCode}`
  }

  public getCopySettingPageUrl(id: string): string {
    return `${this.baseUrl}/master-setting/${id}/copy/new`
  }
  public getDetailedCopySettingPageUrl(id: string): string {
    return `${this.baseUrl}/master-setting/${id}/copy`
  }
}

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ tenant: string }>()
  const tenantCode = params?.tenant || 'common'

  const urlProvider = useMemo(() => new MasterUrlProvider(tenantCode), [tenantCode])

  // {{Create httpClient with Axios interceptor for automatic auth token injection}}
  const httpClient = useMemo(() => {
    const baseEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:3010'
    const instance = axios.create({
      baseURL: `${baseEndpoint}/api`,
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-code': tenantCode,
      },
    })

    instance.interceptors.request.use(async (config) => {
      try {
        const session = await fetchAuthSession()
        const token = session.tokens?.idToken?.toString()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch {
        // Ignore auth errors
      }
      return config
    })

    return instance
  }, [tenantCode])

  const user = useMemo(() => ({ tenantCode, tenantRole: 'admin' }), [tenantCode])

  return (
    <AppProviders user={user} urlProvider={urlProvider} httpClient={httpClient}>
      <div className="p-6">{children}</div>
    </AppProviders>
  )
}
```

### {{Step 2: Create page.tsx}}

{{After setting up providers in the layout, each page component is simple:}}

```tsx
// app/admin/[tenant]/master/master-setting/page.tsx
'use client'

import dynamic from 'next/dynamic'
import MsLayout from '@mbc-cqrs-serverless/master-web/MsLayout'
import '@mbc-cqrs-serverless/master-web/styles.css'

const MasterSetting = dynamic(
  () => import('@mbc-cqrs-serverless/master-web/MasterSetting').then((mod) => mod.default),
  { ssr: false }
)

export default function MasterSettingPage() {
  return (
    <main>
      <MsLayout useLoading>
        <MasterSetting />
      </MsLayout>
    </main>
  )
}
```

### {{Step 3: Configure Environment Variables}}

```bash
# .env.local
NEXT_PUBLIC_API_ENDPOINT=http://localhost:3010
NEXT_PUBLIC_MASTER_APPSYNC_URL=https://xxxxxxxx.appsync-api.ap-northeast-1.amazonaws.com/graphql
NEXT_PUBLIC_MASTER_APPSYNC_APIKEY=da2-xxxxxxxxxxxxxxxxx
NEXT_PUBLIC_MASTER_APPSYNC_REGION=ap-northeast-1
```

### {{Why This Pattern?}}

| {{Benefit}} | Description |
|-------------|-----------------|
| {{**Avoids Context Isolation**}} | {{React Context in npm packages can become isolated. Layout ensures context is initialized first.}} |
| {{**Synchronous Initialization**}} | {{Using `useMemo` creates httpClient synchronously, avoiding race conditions.}} |
| {{**Automatic Auth Tokens**}} | {{Axios interceptors inject the latest auth token on every request.}} |
| {{**Simple Page Components**}} | {{Pages only need dynamic imports and component rendering.}} |

:::info {{For More Details}}
{{See [Next.js App Router Integration](#nextjs-app-router-integration) for alternative patterns, troubleshooting, and detailed explanations.}}
:::

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

:::info Import Options
Components can be imported from the main package or via sub-path imports:
```tsx
// Main package import
import { MasterSetting } from "@mbc-cqrs-serverless/master-web";

// Sub-path import
import MasterSetting from "@mbc-cqrs-serverless/master-web/MasterSetting";
```
:::

### MasterSetting

Displays a list of master settings with search, filter, and pagination capabilities.

```tsx
import { MasterSetting } from "@mbc-cqrs-serverless/master-web";
import "@mbc-cqrs-serverless/master-web/styles.css";

export default function MasterSettingsPage() {
  return <MasterSetting />;
}
```

### EditMasterSettings

Form component for creating and editing master settings.

```tsx
import { EditMasterSettings } from "@mbc-cqrs-serverless/master-web";

export default function EditMasterSettingsPage({ params }: { params: { id: string } }) {
  return <EditMasterSettings id={params.id} />;
}
```

### CopyMasterSettings

Component for copying master settings to create new settings based on existing ones.

```tsx
import { CopyMasterSettings } from "@mbc-cqrs-serverless/master-web";

export default function CopyMasterSettingsPage({ params }: { params: { id: string } }) {
  return <CopyMasterSettings id={params.id} />;
}
```

### NewCopyMasterSettings

Component for creating a new copy of master settings with a new identifier.

```tsx
import { NewCopyMasterSettings } from "@mbc-cqrs-serverless/master-web";

export default function NewCopyMasterSettingsPage({ params }: { params: { id: string } }) {
  return <NewCopyMasterSettings id={params.id} />;
}
```

### DetailCopy

Component for viewing detailed copy information of master settings.

```tsx
import { DetailCopy } from "@mbc-cqrs-serverless/master-web";

export default function DetailCopyPage({ params }: { params: { id: string } }) {
  return <DetailCopy id={params.id} />;
}
```

### MasterData

Displays master data records in a table format with CRUD operations.

```tsx
import { MasterData } from "@mbc-cqrs-serverless/master-web";

export default function MasterDataPage() {
  return <MasterData />;
}
```

### EditMasterData

Form component for creating and editing master data records.

```tsx
import { EditMasterData } from "@mbc-cqrs-serverless/master-web";

export default function EditMasterDataPage({ params }: { params: { id: string } }) {
  return <EditMasterData id={params.id} />;
}
```

## Provider Setup

Wrap your application with the required providers for authentication and API access.

### AppProviders

The `AppProviders` component requires a `user` prop of type `UserContext` containing tenant information.

```tsx
import { AppProviders } from "@mbc-cqrs-serverless/master-web";
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

The `UserContext` type defines the shape of the user object. You can use the `useUserContext` hook's return type or define a compatible type:

```tsx
type UserContext = {
  tenantCode: string;  // Tenant identifier
  tenantRole: string;  // User role within the tenant
};
```

:::info Type Usage
While `UserContext` is used internally, you can create a compatible object type for the `user` prop.
:::

## URL Provider

The package provides a URL provider system for managing application URLs.

### IUrlProvider Interface

The `IUrlProvider` interface defines the contract for URL generation:

```tsx
import type { IUrlProvider } from "@mbc-cqrs-serverless/master-web";

// Interface definition
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

The `BaseUrlProvider` class provides a default implementation that can be extended:

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

:::info Sub-path Import
The `BaseUrlProvider` and `IUrlProvider` are available via the sub-path import `@mbc-cqrs-serverless/master-web/UrlProvider`. The `IUrlProvider` type is also exported from the main package.
:::

### Custom URL Provider

You can create a custom URL provider by extending `BaseUrlProvider` or implementing the `IUrlProvider` interface:

```tsx
import { AppProviders } from "@mbc-cqrs-serverless/master-web";
import { BaseUrlProvider } from "@mbc-cqrs-serverless/master-web/UrlProvider";

// Extend BaseUrlProvider for custom path structure
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
| `convertSearchProps` | `(props) => SearchProps` | Optional function to convert search props before executing search |
| `convertChangeQueries` | `(props) => SearchProps` | Optional function to convert query parameters before URL change |

**Return Value:**

| Property | Type | Description |
|----------|------|-------------|
| `searchProps` | `SearchProps` | Current search parameters |
| `queries` | `SearchProps` | URL query parameters |
| `setQueries` | `(props) => Promise<void>` | Update URL query parameters directly |
| `paginate` | `Paginate<T>` | Paginated results with count and data |
| `setPaginate` | `(paginate) => void` | Manually set paginate state |
| `setPaginateClient` | `(items, page?) => void` | Set paginate for client-side data |
| `getPaginateClient` | `(items) => Paginate` | Convert array to paginate object |
| `isCalledSearch` | `boolean` | Whether search has been triggered |
| `onSubmitSearch` | `(props) => Promise<void>` | Submit search with new parameters |
| `executeSearch` | `() => Promise<object>` | Execute search with current parameters |
| `searchUsingTableView` | `(props, tableView) => Promise<void>` | Search using a predefined table view |
| `getSearchQuery` | `() => SearchProps \| null` | Get current search query from URL or storage |
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
| `setError` | `UseFormSetError<T>` | Set form error manually |
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

A JSON editor component for editing structured data. Uses the jsoneditor library with tree mode.

```tsx
import { JsonEditor } from "@mbc-cqrs-serverless/master-web";

function MyForm() {
  const [jsonData, setJsonData] = useState({ key: "value" });

  return (
    <JsonEditor
      json={jsonData}
      onChange={setJsonData}
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

A rich text editor for content fields. Built on React Quill with customizable toolbar.

```tsx
import { RichTextEditor } from "@mbc-cqrs-serverless/master-web";

function MyForm() {
  const [content, setContent] = useState("");

  return (
    <RichTextEditor
      value={content}
      onChange={setContent}
      placeholder="Enter your content here..."
    />
  );
}
```

#### RichTextEditor Props

| Prop | Type | Required | Description |
|----------|----------|--------------|-----------------|
| `value` | `string` | No | The HTML content for the editor (defaults to empty string) |
| `onChange` | `(value: string) => void` | Yes | Callback when content changes |
| `placeholder` | `string` | No | Placeholder text when editor is empty (defaults to empty string) |

### MsLayout

Layout component for master management pages. Provides loading overlay and toast notifications.

```tsx
import { MsLayout } from "@mbc-cqrs-serverless/master-web";

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
// Note: Internal import path - may change without notice
import ConfirmButton from "@mbc-cqrs-serverless/master-web/dist/components/buttons/ConfirmButton";

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
// Note: Internal import path - may change without notice
import { BackButton } from "@mbc-cqrs-serverless/master-web/dist/components/buttons/back-button";
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
// Note: Internal import path - may change without notice
import DatePicker from "@mbc-cqrs-serverless/master-web/dist/components/form/DatePicker";
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
// Note: Internal import path - may change without notice
import FormSubmitButton from "@mbc-cqrs-serverless/master-web/dist/components/form/FormSubmitButton";
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
| `onPaginationChange` | `(pagination: PaginationState) => void` | - | Callback when pagination changes |
| `sorting` | `SortingState` | - | Current sorting state |
| `onSortingChange` | `(sorting: SortingState) => void` | - | Callback when sorting changes |
| `onClickRow` | `(row: TData) => void` | - | Callback when a row is clicked |
| `rowKey` | `keyof TData \| ((row: TData) => string)` | - | Key extractor for row identification |
| `rowSelection` | `RowSelectionState` | - | Current row selection state |
| `onRowSelectionChange` | `(state: RowSelectionState) => void` | - | Callback when row selection changes |

:::info State Types
`PaginationState`, `SortingState`, and `RowSelectionState` are TanStack Table types. `PaginationState` contains `pageIndex` and `pageSize` properties.
:::

#### DataTable Features

- Server-side pagination with page size options (10, 20, 50, 100)
- Jump to specific page functionality
- Column sorting
- Row selection
- Click handler for row navigation
- Empty state display
- Custom column widths via column meta

```tsx
// Note: Internal import path - may change without notice
import { DataTable } from "@mbc-cqrs-serverless/master-web/dist/components/table/data-table";
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
// Note: Internal import path - may change without notice
import LoadingOverlay from "@mbc-cqrs-serverless/master-web/dist/components/LoadingOverlay";
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

## Next.js App Router Integration

When using master-web components with Next.js App Router (v14+/v15), there are important considerations for handling Server-Side Rendering (SSR) and client-side state.

### SSR Compatibility Issue

The JsonEditor component uses the `jsoneditor` library internally, which requires browser APIs (`self`, `window`) that are not available during SSR. This causes errors like:

```
ReferenceError: self is not defined
```

### Solution: Dynamic Import with SSR Disabled

Use Next.js dynamic imports with `ssr: false` to load master-web components only on the client side:

```tsx
'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'

// Create wrapper component that handles dynamic import
function MasterSettingWrapper({ httpClient, urlProvider, user }) {
  // Dynamic import inside component for proper context handling
  const MasterSetting = useMemo(
    () =>
      dynamic(() => import('@mbc-cqrs-serverless/master-web/MasterSetting'), {
        ssr: false,
        loading: () => <div>Loading...</div>,
      }),
    []
  )

  return (
    <AppProviders user={user} httpClient={httpClient} urlProvider={urlProvider}>
      <MasterSetting />
    </AppProviders>
  )
}
```

:::warning Important
Define the dynamic import inside a wrapper component (using `useMemo`) rather than at the module level. This ensures the AppProviders context is properly available when the component mounts.
:::

### Recommended Pattern: Layout-based Provider Pattern

**The most recommended implementation pattern** is to use Next.js App Router's `layout.tsx` to set up AppProviders. This pattern reliably avoids the `httpClient.get is not a function` error.

#### Why Layout Pattern is Recommended

1. **Solves React Context Isolation Issues**: React Context bundled in npm packages can become isolated from the application's context. By setting up providers in the Layout, the Context is guaranteed to be initialized before child components mount.

2. **Synchronous httpClient Initialization**: By using `useMemo`, the httpClient is created synchronously without async state management (useState + useEffect).

3. **Automatic Auth Token Injection**: Using Axios interceptors, the latest auth token is automatically retrieved for each request.

#### Implementation Example: layout.tsx

```tsx
// app/admin/[tenant]/master/layout.tsx
'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'
import type { IUrlProvider } from '@mbc-cqrs-serverless/master-web/UrlProvider'
import '@/modules/common/components/ConfigureAmplifyClientSide'

// Dynamic import of AppProviders (SSR disabled)
const AppProviders = dynamic(
  () =>
    import('@mbc-cqrs-serverless/master-web/AppProviders').then(
      (mod) => mod.AppProviders
    ),
  { ssr: false }
)

// Multi-tenant URL provider
class MasterUrlProvider implements IUrlProvider {
  protected readonly baseUrl: string

  public readonly SETTINGS_PAGE_URL: string
  public readonly ADD_SETTINGS_PAGE_URL: string
  public readonly EDIT_SETTINGS_PAGE_URL: string
  public readonly DATA_PAGE_URL: string
  public readonly ADD_DATA_PAGE_URL: string
  public readonly EDIT_DATA_PAGE_URL: string
  public readonly FAQ_CATEGORY_PAGE_URL: string
  public readonly TOP_URL: string

  constructor(tenantCode: string) {
    this.baseUrl = `/admin/${tenantCode}/master`

    this.SETTINGS_PAGE_URL = `${this.baseUrl}/master-setting`
    this.ADD_SETTINGS_PAGE_URL = `${this.baseUrl}/master-setting/new`
    this.EDIT_SETTINGS_PAGE_URL = this.SETTINGS_PAGE_URL
    this.DATA_PAGE_URL = `${this.baseUrl}/master-data`
    this.ADD_DATA_PAGE_URL = `${this.baseUrl}/master-data/new`
    this.EDIT_DATA_PAGE_URL = this.DATA_PAGE_URL
    this.FAQ_CATEGORY_PAGE_URL = `${this.baseUrl}/faq-category`
    this.TOP_URL = `/admin/${tenantCode}`
  }

  public getCopySettingPageUrl(id: string): string {
    return `${this.baseUrl}/master-setting/${id}/copy/new`
  }

  public getDetailedCopySettingPageUrl(id: string): string {
    return `${this.baseUrl}/master-setting/${id}/copy`
  }
}

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams<{ tenant: string }>()
  const tenantCode = params?.tenant || 'common'

  // Create URL provider synchronously with useMemo
  const urlProvider = useMemo(() => new MasterUrlProvider(tenantCode), [tenantCode])

  // Create httpClient synchronously with useMemo (interceptor auto-injects auth token)
  const httpClient = useMemo(() => {
    const baseEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:3010'
    const instance = axios.create({
      baseURL: `${baseEndpoint}/api`,
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-code': tenantCode,
      },
    })

    // Interceptor to get auth token
    instance.interceptors.request.use(async (config) => {
      try {
        const session = await fetchAuthSession()
        const token = session.tokens?.idToken?.toString()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch {
        // Ignore auth errors
      }
      return config
    })

    return instance
  }, [tenantCode])

  const user = useMemo(
    () => ({
      tenantCode,
      tenantRole: 'admin',
    }),
    [tenantCode]
  )

  return (
    <AppProviders user={user} urlProvider={urlProvider} httpClient={httpClient}>
      <div className="p-6">{children}</div>
    </AppProviders>
  )
}
```

#### Page Component Implementation

After setting up providers in the Layout, each page component becomes simple:

```tsx
// app/admin/[tenant]/master/master-setting/page.tsx
'use client'

import dynamic from 'next/dynamic'
import MsLayout from '@mbc-cqrs-serverless/master-web/MsLayout'

const MasterSetting = dynamic(
  () => import('@mbc-cqrs-serverless/master-web/MasterSetting').then((mod) => mod.default),
  { ssr: false }
)

export default function MasterSettingPage() {
  return (
    <main>
      <MsLayout useLoading>
        <MasterSetting />
      </MsLayout>
    </main>
  )
}
```

```tsx
// app/admin/[tenant]/master/master-setting/new/page.tsx
'use client'

import dynamic from 'next/dynamic'
import MsLayout from '@mbc-cqrs-serverless/master-web/MsLayout'

const EditMasterSettings = dynamic(
  () => import('@mbc-cqrs-serverless/master-web/EditMasterSettings').then((mod) => mod.default),
  { ssr: false }
)

export default function NewMasterSettingPage() {
  return (
    <main>
      <MsLayout useLoading>
        <EditMasterSettings />
      </MsLayout>
    </main>
  )
}
```

:::tip Key Points
- **layout.tsx**: Set up AppProviders, httpClient, and urlProvider
- **page.tsx**: Simply render components with dynamic imports
- **MsLayout**: Provides loading overlay and toast notifications
:::

### AWS Amplify v6 Integration

The default httpClient in master-web uses AWS Amplify v5 APIs (`Auth.currentSession()`). If your project uses AWS Amplify v6, you must provide a custom httpClient.

The Layout-based Provider Pattern example above uses Amplify v6's `fetchAuthSession` with Axios interceptors. This is the recommended approach.

#### Alternative Pattern: Configuration in Page Component

Alternative implementation if you don't use the Layout pattern:

```tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import axios, { AxiosInstance } from 'axios'
import * as Auth from 'aws-amplify/auth'  // Amplify v6 import
import { AppProviders } from '@mbc-cqrs-serverless/master-web/AppProviders'
import { BaseUrlProvider } from '@mbc-cqrs-serverless/master-web/UrlProvider'
import dynamic from 'next/dynamic'

interface MasterTemplateProps {
  tenantCode: string
}

// Custom URL provider for multi-tenant routing
class MasterUrlProvider extends BaseUrlProvider {
  constructor(tenantCode: string) {
    // BaseUrlProvider adds leading slash, so omit it here
    super(`admin/${tenantCode}/master`)
  }
}

// Wrapper component for proper context handling
function MasterSettingWrapper({
  httpClient,
  urlProvider,
  user,
}: {
  httpClient: AxiosInstance
  urlProvider: MasterUrlProvider
  user: { tenantCode: string; tenantRole: string }
}) {
  const MasterSetting = useMemo(
    () =>
      dynamic(() => import('@mbc-cqrs-serverless/master-web/MasterSetting'), {
        ssr: false,
        loading: () => <div>Loading component...</div>,
      }),
    []
  )

  return (
    <AppProviders user={user} httpClient={httpClient} urlProvider={urlProvider}>
      <MasterSetting />
    </AppProviders>
  )
}

export function MasterTemplate({ tenantCode }: MasterTemplateProps) {
  const [httpClient, setHttpClient] = useState<AxiosInstance | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Setup httpClient with Amplify v6 authentication
  const setupHttpClient = useCallback(async () => {
    let authToken = ''
    try {
      // Amplify v6 API for fetching auth session
      const session = await Auth.fetchAuthSession()
      authToken = session.tokens?.idToken?.toString() || ''
    } catch {
      // Handle unauthenticated state
    }

    const client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:3010',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-code': tenantCode,
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
    })

    setHttpClient(client)
    setIsReady(true)
  }, [tenantCode])

  useEffect(() => {
    setupHttpClient()
  }, [setupHttpClient])

  const urlProvider = useMemo(() => new MasterUrlProvider(tenantCode), [tenantCode])

  const user = useMemo(
    () => ({
      tenantCode,
      tenantRole: 'admin',
    }),
    [tenantCode]
  )

  // Wait for httpClient to be ready before rendering
  if (!isReady || !httpClient) {
    return <div>Loading...</div>
  }

  return (
    <MasterSettingWrapper
      httpClient={httpClient}
      urlProvider={urlProvider}
      user={user}
    />
  )
}
```

### Multi-Tenant Routing Setup

For multi-tenant applications, set up dynamic routes with tenant code in the URL:

#### Directory Structure

```
app/
└── admin/
    └── [tenant]/
        └── master/
            ├── layout.tsx                      # AppProviders setup (recommended)
            ├── page.tsx                        # Master top page
            ├── master-setting/
            │   ├── page.tsx                    # Settings list
            │   ├── new/
            │   │   └── page.tsx                # Create new setting
            │   └── [pk]/
            │       └── [sk]/
            │           └── page.tsx            # Edit setting
            └── master-data/
                ├── page.tsx                    # Data list
                ├── new/
                │   └── page.tsx                # Create new data
                └── [pk]/
                    └── [sk]/
                        └── page.tsx            # Edit data
```

#### Page Component Example

```tsx
// app/admin/[tenant]/master/master-setting/page.tsx
import { MasterTemplate } from '@/modules/master/templates/MasterTemplate'

export default async function MasterSettingPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params

  return <MasterTemplate tenantCode={tenant} />
}
```

### Common Issues and Solutions

#### `httpClient.get is not a function` Error

This error occurs when the httpClient is not properly initialized before the component tries to use it.

**Causes**:
- React Context in npm packages becomes isolated from the application's context
- httpClient is initialized asynchronously and not ready when the component mounts

**Solutions**:

1. **Use Layout-based Provider Pattern (Recommended)**: See the recommended pattern above
2. **Use a wrapper component pattern**: Ensure httpClient is ready
3. **Add explicit `isReady` state check**: Check before rendering AppProviders
4. **Define dynamic imports inside the wrapper component**: Not at module level

#### URL Routing Issues

If URLs are generated incorrectly (e.g., `//admin/...` instead of `/admin/...`), check the BaseUrlProvider configuration:

```tsx
// ❌ Wrong - double slash issue
class MasterUrlProvider extends BaseUrlProvider {
  constructor(tenantCode: string) {
    super(`/admin/${tenantCode}/master`)  // Leading slash causes issue
  }
}

// ✅ Correct - no leading slash
class MasterUrlProvider extends BaseUrlProvider {
  constructor(tenantCode: string) {
    super(`admin/${tenantCode}/master`)  // BaseUrlProvider adds the slash
  }
}
```

#### Implementing IUrlProvider Directly

When implementing the `IUrlProvider` interface directly without extending `BaseUrlProvider`, you need to explicitly define all URL properties. See the Layout-based Provider Pattern example above for reference.

## Dependencies

Key dependencies used by this package:

- React 18.x
- Next.js 14.x / 15.x
- TanStack React Table 8.x
- Apollo Client
- Radix UI components
- Tailwind CSS 3.x
- react-hook-form
- Zod for validation
