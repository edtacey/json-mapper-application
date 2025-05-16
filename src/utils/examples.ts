import { EntitySchema, Mapping, ValueMapping } from '../types';

export const createExampleData = () => {
  // Example Order Entity
  const orderEntity: EntitySchema = {
    id: 'entity_order_example',
    name: 'Order',
    description: 'E-commerce order entity',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    inboundSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', pattern: '^ORD-[0-9]+$' },
        customerInfo: {
          type: 'object',
          properties: {
            customerId: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            country: { type: 'string' }
          },
          required: ['customerId', 'name', 'email']
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              quantity: { type: 'number', minimum: 1 },
              price: { type: 'number', minimum: 0 }
            },
            required: ['productId', 'quantity', 'price']
          }
        },
        status: { type: 'string', enum: ['pending', 'processing', 'shipped', 'delivered'] },
        orderDate: { type: 'string', format: 'date-time' },
        paymentMethod: { type: 'string' }
      },
      required: ['orderId', 'customerInfo', 'items', 'status', 'orderDate']
    },
    outboundSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        customerId: { type: 'string' },
        customerEmail: { type: 'string' },
        countryCode: { type: 'string' },
        totalAmount: { type: 'number' },
        itemCount: { type: 'number' },
        status: { type: 'string' },
        paymentType: { type: 'string' },
        processedAt: { type: 'string', format: 'date-time' },
        eventType: { type: 'string', enum: ['OrderCreated', 'OrderUpdated'] }
      },
      required: ['id', 'customerId', 'customerEmail', 'totalAmount', 'status', 'processedAt', 'eventType']
    },
    metadata: {
      source: 'example',
      sampleData: {
        orderId: 'ORD-12345',
        customerInfo: {
          customerId: 'CUST-789',
          name: 'John Doe',
          email: 'john@example.com',
          country: 'United States'
        },
        items: [
          { productId: 'PROD-1', quantity: 2, price: 29.99 },
          { productId: 'PROD-2', quantity: 1, price: 49.99 }
        ],
        status: 'pending',
        orderDate: '2024-01-15T10:30:00Z',
        paymentMethod: 'credit_card'
      }
    }
  };

  // Example Mappings
  const orderMappings: Mapping[] = [
    {
      id: 'mapping_1',
      entityId: orderEntity.id,
      source: '$.orderId',
      target: 'id',
      transformation: 'direct',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mapping_2',
      entityId: orderEntity.id,
      source: '$.customerInfo.customerId',
      target: 'customerId',
      transformation: 'direct',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mapping_3',
      entityId: orderEntity.id,
      source: '$.customerInfo.email',
      target: 'customerEmail',
      transformation: 'direct',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mapping_4',
      entityId: orderEntity.id,
      source: '$.customerInfo.country',
      target: 'countryCode',
      transformation: 'value-mapping',
      valueMapId: 'vm_country_codes',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mapping_5',
      entityId: orderEntity.id,
      source: '$.items',
      target: 'totalAmount',
      transformation: 'aggregate',
      template: 'sum',
      customFunction: 'return value.reduce((sum, item) => sum + (item.price * item.quantity), 0)',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mapping_6',
      entityId: orderEntity.id,
      source: '$.items',
      target: 'itemCount',
      transformation: 'aggregate',
      template: 'count',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mapping_7',
      entityId: orderEntity.id,
      source: '$.status',
      target: 'status',
      transformation: 'value-mapping',
      valueMapId: 'vm_order_status',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mapping_8',
      entityId: orderEntity.id,
      source: '$.paymentMethod',
      target: 'paymentType',
      transformation: 'value-mapping',
      valueMapId: 'vm_payment_types',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mapping_9',
      entityId: orderEntity.id,
      source: '_system.timestamp',
      target: 'processedAt',
      transformation: 'function',
      customFunction: 'return new Date().toISOString()',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mapping_10',
      entityId: orderEntity.id,
      source: '_system.entityName',
      target: 'eventType',
      transformation: 'template',
      template: '${entityName}Created',
      active: true,
      createdAt: new Date().toISOString()
    }
  ];

  // Example Value Mappings
  const valueMappings: ValueMapping[] = [
    {
      id: 'vm_country_codes',
      name: 'Country Code Mapping',
      description: 'Map country names to ISO codes',
      entityId: orderEntity.id,
      mappings: {
        'United States': 'US',
        'USA': 'US',
        'United Kingdom': 'GB',
        'UK': 'GB',
        'Canada': 'CA',
        'Australia': 'AU',
        'Germany': 'DE',
        'France': 'FR',
        'Spain': 'ES',
        'Italy': 'IT',
        'Japan': 'JP',
        'China': 'CN'
      },
      defaultValue: 'UNKNOWN',
      caseSensitive: false,
      type: 'exact',
      createdAt: new Date().toISOString()
    },
    {
      id: 'vm_order_status',
      name: 'Order Status Mapping',
      description: 'Map order status values to standard codes',
      entityId: orderEntity.id,
      mappings: {
        'pending|waiting': 'PENDING',
        'processing|in_progress': 'PROCESSING',
        'shipped|in_transit': 'SHIPPED',
        'delivered|completed': 'DELIVERED',
        'cancelled|canceled': 'CANCELLED',
        'refunded': 'REFUNDED'
      },
      defaultValue: 'UNKNOWN',
      caseSensitive: false,
      type: 'regex',
      createdAt: new Date().toISOString()
    },
    {
      id: 'vm_payment_types',
      name: 'Payment Type Mapping',
      description: 'Map payment methods to standard types',
      entityId: orderEntity.id,
      mappings: {
        'credit_card': 'CARD',
        'debit_card': 'CARD',
        'visa': 'CARD',
        'mastercard': 'CARD',
        'amex': 'CARD',
        'paypal': 'DIGITAL_WALLET',
        'apple_pay': 'DIGITAL_WALLET',
        'google_pay': 'DIGITAL_WALLET',
        'bank_transfer': 'BANK_TRANSFER',
        'wire': 'BANK_TRANSFER',
        'cash': 'CASH',
        'cash_on_delivery': 'COD',
        'cod': 'COD'
      },
      defaultValue: 'OTHER',
      caseSensitive: false,
      type: 'exact',
      createdAt: new Date().toISOString()
    },
    {
      id: 'vm_priority_levels',
      name: 'Priority Level Mapping',
      description: 'Map numeric priorities to text levels',
      mappings: {
        '1-3': 'HIGH',
        '4-6': 'MEDIUM',
        '7-10': 'LOW'
      },
      defaultValue: 'NORMAL',
      caseSensitive: false,
      type: 'range',
      createdAt: new Date().toISOString()
    }
  ];

  return {
    entities: [orderEntity],
    mappings: orderMappings,
    valueMappings
  };
};

// Sample payloads for different entity types
export const samplePayloads = {
  order: {
    orderId: 'ORD-12345',
    customerInfo: {
      customerId: 'CUST-789',
      name: 'John Doe',
      email: 'john@example.com',
      country: 'United States'
    },
    items: [
      { productId: 'PROD-1', quantity: 2, price: 29.99 },
      { productId: 'PROD-2', quantity: 1, price: 49.99 }
    ],
    status: 'pending',
    orderDate: '2024-01-15T10:30:00Z',
    paymentMethod: 'credit_card'
  },
  
  user: {
    userId: 'USR-456',
    username: 'johndoe',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0123',
      dateOfBirth: '1990-05-15'
    },
    preferences: {
      language: 'en',
      timezone: 'America/New_York',
      notifications: {
        email: true,
        sms: false,
        push: true
      }
    },
    registeredAt: '2023-01-01T00:00:00Z',
    lastLoginAt: '2024-01-15T09:00:00Z',
    accountStatus: 'active'
  },
  
  product: {
    productId: 'PROD-789',
    sku: 'SKU-12345',
    name: 'Wireless Bluetooth Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    category: 'Electronics',
    subcategory: 'Audio',
    price: {
      amount: 149.99,
      currency: 'USD'
    },
    stock: {
      available: 52,
      reserved: 5,
      warehouse: 'WH-01'
    },
    specifications: {
      brand: 'TechBrand',
      model: 'WH-1000XM4',
      color: 'Black',
      weight: '250g',
      batteryLife: '30 hours'
    },
    images: [
      { url: 'https://example.com/image1.jpg', isPrimary: true },
      { url: 'https://example.com/image2.jpg', isPrimary: false }
    ],
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2024-01-10T15:30:00Z'
  },
  
  transaction: {
    transactionId: 'TXN-98765',
    accountFrom: 'ACC-123',
    accountTo: 'ACC-456',
    amount: 500.00,
    currency: 'USD',
    type: 'transfer',
    status: 'completed',
    metadata: {
      description: 'Monthly rent payment',
      reference: 'RENT-202401',
      category: 'housing'
    },
    fees: {
      amount: 2.50,
      currency: 'USD'
    },
    timestamps: {
      initiated: '2024-01-15T10:00:00Z',
      completed: '2024-01-15T10:00:15Z'
    }
  }
};
