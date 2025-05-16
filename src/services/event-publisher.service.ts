import { ChangeEvent, ChangeEventConfiguration, EntitySchema } from '../types';
import { DataStore } from '../storage/data-store';

export class EventPublisherService {
  private dataStore: DataStore;
  private eventHandlers: Map<string, EventHandler>;

  constructor() {
    this.dataStore = new DataStore('./data/events');
    this.eventHandlers = new Map();
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers() {
    // Console handler (for development)
    this.registerHandler('console', async (event: ChangeEvent) => {
      console.log('Change Event:', JSON.stringify(event, null, 2));
    });

    // File handler (for debugging)
    this.registerHandler('file', async (event: ChangeEvent) => {
      await this.dataStore.save(event);
    });
  }

  registerHandler(id: string, handler: EventHandler) {
    this.eventHandlers.set(id, handler);
  }

  async publishEvent(
    entityId: string,
    newData: any,
    oldData: any | null,
    config: ChangeEventConfiguration
  ): Promise<ChangeEvent> {
    const event: ChangeEvent = {
      id: this.generateEventId(),
      entityId,
      eventType: config.eventType,
      timestamp: new Date().toISOString(),
      data: {
        new: newData,
        ...(config.includeOldValues && oldData ? { old: oldData } : {}),
        ...(config.includeOldValues && oldData ? { changes: this.detectChanges(oldData, newData) } : {})
      },
      ...(config.includeMetadata ? { metadata: config.customProperties } : {})
    };

    // Publish to all configured handlers
    const publishPromises: Promise<void>[] = [];

    if (config.targetQueue) {
      const queueHandler = this.eventHandlers.get(config.targetQueue);
      if (queueHandler) {
        publishPromises.push(queueHandler(event));
      }
    }

    if (config.targetTopic) {
      const topicHandler = this.eventHandlers.get(config.targetTopic);
      if (topicHandler) {
        publishPromises.push(topicHandler(event));
      }
    }

    // Always publish to default handlers
    publishPromises.push(this.eventHandlers.get('console')!(event));
    publishPromises.push(this.eventHandlers.get('file')!(event));

    await Promise.all(publishPromises);

    return event;
  }

  private detectChanges(oldData: any, newData: any): FieldChange[] {
    const changes: FieldChange[] = [];
    
    const detectFieldChanges = (oldObj: any, newObj: any, path: string = '') => {
      const allKeys = new Set([
        ...Object.keys(oldObj || {}),
        ...Object.keys(newObj || {})
      ]);

      for (const key of allKeys) {
        const fieldPath = path ? `${path}.${key}` : key;
        const oldValue = oldObj?.[key];
        const newValue = newObj?.[key];

        if (oldValue === undefined && newValue !== undefined) {
          changes.push({
            field: fieldPath,
            oldValue: null,
            newValue,
            operation: 'add'
          });
        } else if (oldValue !== undefined && newValue === undefined) {
          changes.push({
            field: fieldPath,
            oldValue,
            newValue: null,
            operation: 'delete'
          });
        } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          if (typeof oldValue === 'object' && typeof newValue === 'object') {
            detectFieldChanges(oldValue, newValue, fieldPath);
          } else {
            changes.push({
              field: fieldPath,
              oldValue,
              newValue,
              operation: 'update'
            });
          }
        }
      }
    };

    detectFieldChanges(oldData, newData);
    return changes;
  }

  async publishBatch(
    events: Array<{
      entityId: string;
      newData: any;
      oldData?: any;
    }>,
    config: ChangeEventConfiguration
  ): Promise<ChangeEvent[]> {
    const batchSize = config.batchSize || 100;
    const results: ChangeEvent[] = [];

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchPromises = batch.map(event =>
        this.publishEvent(
          event.entityId,
          event.newData,
          event.oldData || null,
          config
        )
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  formatEvent(event: ChangeEvent, format: 'cloudevents' | 'custom'): any {
    if (format === 'cloudevents') {
      return {
        specversion: '1.0',
        type: event.eventType,
        source: `jsonmapper/entity/${event.entityId}`,
        id: event.id,
        time: event.timestamp,
        datacontenttype: 'application/json',
        data: event.data,
        ...(event.metadata ? { metadata: event.metadata } : {})
      };
    }

    return event; // Custom format is the default
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Event history management
  async getEventHistory(entityId: string, limit: number = 100): Promise<ChangeEvent[]> {
    const allEvents = await this.dataStore.list<ChangeEvent>();
    return allEvents
      .filter(event => event.entityId === entityId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getEventStats(entityId: string): Promise<EventStats> {
    const events = await this.getEventHistory(entityId, 1000);
    
    const stats: EventStats = {
      totalEvents: events.length,
      eventTypes: {},
      recentEvents: events.slice(0, 10),
      firstEvent: events[events.length - 1]?.timestamp,
      lastEvent: events[0]?.timestamp
    };

    events.forEach(event => {
      stats.eventTypes[event.eventType] = (stats.eventTypes[event.eventType] || 0) + 1;
    });

    return stats;
  }
}

// Type definitions
type EventHandler = (event: ChangeEvent) => Promise<void>;

interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  operation: 'add' | 'update' | 'delete';
}

interface EventStats {
  totalEvents: number;
  eventTypes: { [type: string]: number };
  recentEvents: ChangeEvent[];
  firstEvent?: string;
  lastEvent?: string;
}

// Example handlers for different queue types
export class AzureServiceBusHandler {
  constructor(private connectionString: string, private queueName: string) {}

  async handle(event: ChangeEvent): Promise<void> {
    // Azure Service Bus implementation
    console.log(`Publishing to Azure Service Bus queue: ${this.queueName}`);
    // Actual implementation would use @azure/service-bus
  }
}

export class AzureEventHubHandler {
  constructor(private connectionString: string, private hubName: string) {}

  async handle(event: ChangeEvent): Promise<void> {
    // Azure Event Hub implementation
    console.log(`Publishing to Azure Event Hub: ${this.hubName}`);
    // Actual implementation would use @azure/event-hubs
  }
}

export class AzureStorageQueueHandler {
  constructor(private connectionString: string, private queueName: string) {}

  async handle(event: ChangeEvent): Promise<void> {
    // Azure Storage Queue implementation
    console.log(`Publishing to Azure Storage Queue: ${this.queueName}`);
    // Actual implementation would use @azure/storage-queue
  }
}
