# Frontend UI Components for Output Schema Extension

This document outlines the UI components needed to implement the output schema extension features in the React frontend.

## 1. OutputSchemaTab Component

Location: `frontend/src/components/entity/OutputSchemaTab.tsx`

```tsx
interface OutputSchemaTabProps {
  entity: EntitySchema;
  onUpdate: (updates: Partial<EntitySchema>) => void;
}

// Features:
// - Schema source selector (Manual/API)
// - API configuration form
// - Schema editor (Monaco)
// - Schema version history
// - Refresh button for API schemas
```

## 2. UpsertConfigPanel Component

Location: `frontend/src/components/entity/UpsertConfigPanel.tsx`

```tsx
interface UpsertConfigPanelProps {
  config: UpsertConfiguration;
  schemaFields: string[];
  onChange: (config: UpsertConfiguration) => void;
}

// Features:
// - Enable/disable toggle
// - Unique fields multi-select
// - Conflict resolution dropdown
// - Merge strategy options
// - Field validation display
```

## 3. EventPublishingSettings Component

Location: `frontend/src/components/entity/EventPublishingSettings.tsx`

```tsx
interface EventPublishingSettingsProps {
  config: ChangeEventConfiguration;
  onChange: (config: ChangeEventConfiguration) => void;
}

// Features:
// - Enable/disable toggle
// - Event type input
// - Queue/topic configuration
// - Format selector (CloudEvents/Custom)
// - Metadata options
// - Custom properties editor
```

## 4. EventHistoryViewer Component

Location: `frontend/src/components/events/EventHistoryViewer.tsx`

```tsx
interface EventHistoryViewerProps {
  entityId: string;
}

// Features:
// - Event list with pagination
// - Event details modal
// - Event statistics display
// - Filter by date/type
// - Export functionality
```

## 5. SchemaVersionComparison Component

Location: `frontend/src/components/schema/SchemaVersionComparison.tsx`

```tsx
interface SchemaVersionComparisonProps {
  versions: SchemaVersion[];
  currentVersion: string;
}

// Features:
// - Version dropdown selectors
// - Side-by-side diff viewer
// - Restore previous version
// - Version metadata display
```

## 6. Enhanced Entity Editor Page

Update: `frontend/src/pages/EntityEditor.tsx`

```tsx
// Add new tabs:
// - Output Schema
// - Upsert Config
// - Event Publishing
// - Event History

const tabs = [
  { id: 'details', label: 'Details', icon: FileTextIcon },
  { id: 'mappings', label: 'Mappings', icon: GitBranchIcon },
  { id: 'output-schema', label: 'Output Schema', icon: CodeIcon },
  { id: 'upsert', label: 'Upsert Config', icon: RefreshIcon },
  { id: 'events', label: 'Event Publishing', icon: BellIcon },
  { id: 'history', label: 'Event History', icon: ClockIcon },
  { id: 'generate', label: 'Generate Code', icon: DownloadIcon }
];
```

## 7. API Client Updates

Update: `frontend/src/services/api.ts`

```typescript
// New API methods
export const outputSchemaApi = {
  fetchFromApi: async (entityId: string, config: OutputSchemaSource) => {
    return request.post(`/entities/${entityId}/output-schema/fetch`, config);
  },
  
  refresh: async (entityId: string) => {
    return request.post(`/entities/${entityId}/output-schema/refresh`);
  },
  
  update: async (entityId: string, schema: JsonSchema) => {
    return request.put(`/entities/${entityId}/output-schema`, { schema });
  },
  
  getVersions: async (entityId: string) => {
    return request.get(`/entities/${entityId}/output-schema/versions`);
  }
};

export const upsertConfigApi = {
  update: async (entityId: string, config: UpsertConfiguration) => {
    return request.post(`/entities/${entityId}/upsert-config`, config);
  },
  
  validateFields: async (entityId: string, fields: string[]) => {
    return request.post(`/entities/${entityId}/upsert-config/validate`, { fields });
  }
};

export const eventApi = {
  getHistory: async (entityId: string, limit?: number) => {
    return request.get(`/entities/${entityId}/change-events`, { params: { limit } });
  },
  
  getStats: async (entityId: string) => {
    return request.get(`/entities/${entityId}/change-events/stats`);
  },
  
  publishTest: async (entityId: string, data: any) => {
    return request.post(`/entities/${entityId}/test-event`, { inputData: data });
  },
  
  updateConfig: async (entityId: string, config: ChangeEventConfiguration) => {
    return request.post(`/entities/${entityId}/change-event-config`, config);
  }
};
```

## 8. State Management Updates

Update: `frontend/src/store/entitySlice.ts`

```typescript
interface EntityState {
  // ... existing state
  outputSchemaVersions: SchemaVersion[];
  eventHistory: ChangeEvent[];
  eventStats: EventStats;
  isLoadingSchema: boolean;
  isLoadingEvents: boolean;
}

// New actions
export const fetchOutputSchemaFromApi = createAsyncThunk(
  'entities/fetchOutputSchema',
  async ({ entityId, config }: { entityId: string; config: OutputSchemaSource }) => {
    const response = await outputSchemaApi.fetchFromApi(entityId, config);
    return response.data;
  }
);

export const fetchEventHistory = createAsyncThunk(
  'entities/fetchEventHistory',
  async ({ entityId, limit }: { entityId: string; limit?: number }) => {
    const response = await eventApi.getHistory(entityId, limit);
    return response.data;
  }
);
```

## 9. Form Components

### OutputSchemaForm

```tsx
const OutputSchemaForm: React.FC<OutputSchemaFormProps> = ({ 
  schemaSource, 
  onChange 
}) => {
  return (
    <div className="space-y-4">
      <RadioGroup value={schemaSource.type} onChange={(type) => onChange({ ...schemaSource, type })}>
        <RadioGroup.Option value="manual">Manual</RadioGroup.Option>
        <RadioGroup.Option value="api">External API</RadioGroup.Option>
      </RadioGroup>
      
      {schemaSource.type === 'api' && (
        <>
          <Input
            label="API Endpoint"
            value={schemaSource.endpoint}
            onChange={(e) => onChange({ ...schemaSource, endpoint: e.target.value })}
          />
          
          <KeyValueEditor
            label="Headers"
            value={schemaSource.headers || {}}
            onChange={(headers) => onChange({ ...schemaSource, headers })}
          />
          
          <Input
            label="Schema Path (JSONPath)"
            value={schemaSource.schemaPath}
            onChange={(e) => onChange({ ...schemaSource, schemaPath: e.target.value })}
            placeholder="data.schema"
          />
          
          <Input
            label="Refresh Interval (minutes)"
            type="number"
            value={schemaSource.refreshInterval}
            onChange={(e) => onChange({ ...schemaSource, refreshInterval: parseInt(e.target.value) })}
          />
        </>
      )}
    </div>
  );
};
```

### UpsertConfigForm

```tsx
const UpsertConfigForm: React.FC<UpsertConfigFormProps> = ({ 
  config, 
  schemaFields,
  onChange 
}) => {
  return (
    <div className="space-y-4">
      <Switch
        label="Enable Upsert"
        checked={config.enabled}
        onChange={(enabled) => onChange({ ...config, enabled })}
      />
      
      {config.enabled && (
        <>
          <MultiSelect
            label="Unique Fields"
            options={schemaFields.map(f => ({ value: f, label: f }))}
            value={config.uniqueFields}
            onChange={(uniqueFields) => onChange({ ...config, uniqueFields })}
          />
          
          <Select
            label="Conflict Resolution"
            value={config.conflictResolution}
            onChange={(conflictResolution) => onChange({ ...config, conflictResolution })}
            options={[
              { value: 'update', label: 'Update existing record' },
              { value: 'merge', label: 'Merge with existing' },
              { value: 'skip', label: 'Skip if exists' },
              { value: 'error', label: 'Throw error' }
            ]}
          />
          
          {config.conflictResolution === 'merge' && (
            <RadioGroup
              label="Merge Strategy"
              value={config.mergeStrategy}
              onChange={(mergeStrategy) => onChange({ ...config, mergeStrategy })}
            >
              <RadioGroup.Option value="shallow">Shallow Merge</RadioGroup.Option>
              <RadioGroup.Option value="deep">Deep Merge</RadioGroup.Option>
            </RadioGroup>
          )}
        </>
      )}
    </div>
  );
};
```

## 10. Visual Components

### EventTimeline

```tsx
const EventTimeline: React.FC<{ events: ChangeEvent[] }> = ({ events }) => {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
      {events.map((event, index) => (
        <div key={event.id} className="relative flex items-center mb-4">
          <div className="absolute left-3 w-3 h-3 bg-blue-500 rounded-full"></div>
          <div className="ml-8 p-4 bg-white rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{event.eventType}</h4>
                <p className="text-sm text-gray-500">
                  {new Date(event.timestamp).toLocaleString()}
                </p>
              </div>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {event.data.changes?.length || 0} changes
              </span>
            </div>
            {event.metadata && (
              <div className="mt-2 text-sm text-gray-600">
                <span>Correlation ID: {event.metadata.correlationId}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### SchemaDiff

```tsx
const SchemaDiff: React.FC<{ oldSchema: any; newSchema: any }> = ({ 
  oldSchema, 
  newSchema 
}) => {
  const diff = useMemo(() => {
    return generateSchemaDiff(oldSchema, newSchema);
  }, [oldSchema, newSchema]);
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="font-medium mb-2">Previous Version</h3>
        <pre className="bg-gray-50 p-4 rounded overflow-auto">
          {JSON.stringify(oldSchema, null, 2)}
        </pre>
      </div>
      <div>
        <h3 className="font-medium mb-2">Current Version</h3>
        <pre className="bg-gray-50 p-4 rounded overflow-auto">
          {JSON.stringify(newSchema, null, 2)}
        </pre>
      </div>
      <div className="col-span-2">
        <h3 className="font-medium mb-2">Changes</h3>
        <div className="bg-yellow-50 p-4 rounded">
          {diff.map((change, index) => (
            <div key={index} className="mb-2">
              <span className={`font-mono text-sm ${
                change.type === 'added' ? 'text-green-600' : 
                change.type === 'removed' ? 'text-red-600' : 
                'text-blue-600'
              }`}>
                {change.path}: {change.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

## 11. Integration Example

### Enhanced Entity Editor Page

```tsx
const EntityEditor: React.FC = () => {
  const { entityId } = useParams();
  const [activeTab, setActiveTab] = useState('details');
  const entity = useSelector((state) => selectEntityById(state, entityId));
  
  return (
    <div className="container mx-auto p-4">
      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabsList>
          <Tab value="details">Details</Tab>
          <Tab value="mappings">Mappings</Tab>
          <Tab value="output-schema">Output Schema</Tab>
          <Tab value="upsert">Upsert Config</Tab>
          <Tab value="events">Event Publishing</Tab>
          <Tab value="history">Event History</Tab>
          <Tab value="generate">Generate Code</Tab>
        </TabsList>
        
        <TabPanel value="output-schema">
          <OutputSchemaTab
            entity={entity}
            onUpdate={handleEntityUpdate}
          />
        </TabPanel>
        
        <TabPanel value="upsert">
          <UpsertConfigPanel
            config={entity.outputConfig.upsertConfig}
            schemaFields={extractSchemaFields(entity.outboundSchema)}
            onChange={handleUpsertConfigChange}
          />
        </TabPanel>
        
        <TabPanel value="events">
          <EventPublishingSettings
            config={entity.outputConfig.changeEventConfig}
            onChange={handleEventConfigChange}
          />
        </TabPanel>
        
        <TabPanel value="history">
          <EventHistoryViewer entityId={entityId} />
        </TabPanel>
      </Tabs>
    </div>
  );
};
```

## 12. Testing Components

```tsx
// Test event publishing
const TestEventPublisher: React.FC<{ entityId: string }> = ({ entityId }) => {
  const [testData, setTestData] = useState('');
  const [result, setResult] = useState(null);
  
  const handleTest = async () => {
    try {
      const response = await eventApi.publishTest(entityId, JSON.parse(testData));
      setResult(response.data);
    } catch (error) {
      console.error('Test failed:', error);
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="font-medium">Test Event Publishing</h3>
      <CodeEditor
        value={testData}
        onChange={setTestData}
        language="json"
        height="200px"
      />
      <Button onClick={handleTest}>Test Event</Button>
      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h4 className="font-medium mb-2">Result:</h4>
          <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
```

This completes the UI components needed for the output schema extension features. The components are designed to be modular and reusable, following React best practices and the existing codebase patterns.
