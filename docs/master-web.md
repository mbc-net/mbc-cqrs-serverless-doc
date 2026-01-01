---
description: {{Learn about the Master Web package for building master data management UI components.}}
---

# {{Master Web}}

{{Frontend component library for master data and settings management in MBC CQRS Serverless applications.}}

## {{Installation}}

```bash
npm install @mbc-cqrs-serverless/master-web
```

## {{Overview}}

{{The Master Web package (`@mbc-cqrs-serverless/master-web`) provides a complete set of React components for managing master data and settings. It integrates seamlessly with the backend Master Service and includes pre-built pages, forms, and data tables.}}

## {{Features}}

- **{{Master Settings Management}}**: {{View, create, edit, and delete master settings}}
- **{{Master Data Management}}**: {{CRUD operations for master data records}}
- **{{Rich Text Editor}}**: {{Built-in rich text editor for content fields}}
- **{{JSON Editor}}**: {{JSON editor for structured data fields}}
- **{{Data Tables}}**: {{Sortable, paginated tables with TanStack Table}}
- **{{Real-time Updates}}**: {{AWS AppSync integration for real-time data sync}}
- **{{Copy Functionality}}**: {{Clone master settings and data}}

## {{Main Components}}

### {{MasterSetting}}

{{Displays a list of master settings with search, filter, and pagination capabilities.}}

```tsx
import { MasterSetting } from "@mbc-cqrs-serverless/master-web/MasterSetting";
import "@mbc-cqrs-serverless/master-web/styles.css";

export default function MasterSettingsPage() {
  return <MasterSetting />;
}
```

### {{EditMasterSettings}}

{{Form component for creating and editing master settings.}}

```tsx
import { EditMasterSettings } from "@mbc-cqrs-serverless/master-web/EditMasterSettings";

export default function EditMasterSettingsPage({ params }: { params: { id: string } }) {
  return <EditMasterSettings id={params.id} />;
}
```

### {{MasterData}}

{{Displays master data records in a table format with CRUD operations.}}

```tsx
import { MasterData } from "@mbc-cqrs-serverless/master-web/MasterData";

export default function MasterDataPage() {
  return <MasterData />;
}
```

### {{EditMasterData}}

{{Form component for creating and editing master data records.}}

```tsx
import { EditMasterData } from "@mbc-cqrs-serverless/master-web/EditMasterData";

export default function EditMasterDataPage({ params }: { params: { id: string } }) {
  return <EditMasterData id={params.id} />;
}
```

## {{Provider Setup}}

{{Wrap your application with the required providers for authentication and API access.}}

```tsx
import { AppProviders } from "@mbc-cqrs-serverless/master-web/AppProviders";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      {children}
    </AppProviders>
  );
}
```

## {{URL Configuration}}

{{Configure API endpoints using the URL provider.}}

```tsx
import { UrlProvider } from "@mbc-cqrs-serverless/master-web/UrlProvider";

const urlConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL,
  graphqlEndpoint: process.env.NEXT_PUBLIC_AWS_APPSYNC_GRAPHQLENDPOINT,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <UrlProvider config={urlConfig}>
      {children}
    </UrlProvider>
  );
}
```

## {{Custom Hooks}}

### {{useApolloClient}}

{{Access the Apollo Client for GraphQL operations.}}

```tsx
import { useApolloClient } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const client = useApolloClient();
  // Use client for custom GraphQL queries
}
```

### {{useHttpClient}}

{{Access the HTTP client for REST API calls.}}

```tsx
import { useHttpClient } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const httpClient = useHttpClient();
  // Use httpClient for custom API requests
}
```

### {{useUserContext}}

{{Access the current user context and authentication state.}}

```tsx
import { useUserContext } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { user, isAuthenticated } = useUserContext();
  // Access user information
}
```

### {{useLoadingStore}}

{{Manage global loading state across components.}}

```tsx
import { useLoadingStore } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { isLoading, setLoading } = useLoadingStore();
  // Control loading state
}
```

## {{UI Components}}

{{The package includes several reusable UI components:}}

### {{JsonEditor}}

{{A JSON editor component for editing structured data.}}

```tsx
import { JsonEditor } from "@mbc-cqrs-serverless/master-web";

function MyForm() {
  return (
    <JsonEditor
      value={jsonData}
      onChange={handleChange}
      readOnly={false}
    />
  );
}
```

### {{RichTextEditor}}

{{A rich text editor for content fields.}}

```tsx
import { RichTextEditor } from "@mbc-cqrs-serverless/master-web";

function MyForm() {
  return (
    <RichTextEditor
      value={content}
      onChange={handleChange}
    />
  );
}
```

### {{MsLayout}}

{{Layout component for master management pages.}}

```tsx
import { MsLayout } from "@mbc-cqrs-serverless/master-web/MsLayout";

function MasterPage() {
  return (
    <MsLayout>
      <MasterSetting />
    </MsLayout>
  );
}
```

## {{Environment Variables}}

{{Configure the following environment variables for the Master Web package:}}

| {{Variable}} | {{Description}} |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | {{Base URL for REST API endpoints}} |
| `NEXT_PUBLIC_AWS_APPSYNC_GRAPHQLENDPOINT` | {{AWS AppSync GraphQL endpoint}} |
| `NEXT_PUBLIC_AWS_APPSYNC_REGION` | {{AWS region for AppSync}} |
| `NEXT_PUBLIC_AWS_APPSYNC_AUTHTYPE` | {{AppSync authentication type}} |

## {{Styling}}

{{Import the package styles in your application:}}

```tsx
import "@mbc-cqrs-serverless/master-web/styles.css";
```

{{The components use Tailwind CSS for styling. Ensure your project has Tailwind CSS configured.}}

## {{Dependencies}}

{{Key dependencies used by this package:}}

- {{React 18.x}}
- {{Next.js 14.x}}
- {{TanStack React Table 8.x}}
- {{Apollo Client}}
- {{Radix UI components}}
- {{Tailwind CSS 3.x}}
- {{react-hook-form}}
- {{Zod for validation}}
