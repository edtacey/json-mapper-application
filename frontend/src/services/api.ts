import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  entities: {
    list: async () => {
      const response = await axiosInstance.get('/entities');
      return response.data.entities;
    },
    
    getById: async (id: string) => {
      const response = await axiosInstance.get(`/entities/${id}`);
      return response.data.entity;
    },
    
    create: async (data: any) => {
      const response = await axiosInstance.post('/entities/generate', data);
      return response.data;
    },
    
    update: async (id: string, data: any) => {
      const response = await axiosInstance.put(`/entities/${id}`, data);
      return response.data.entity;
    },
    
    updateSchemas: async (id: string, data: { inboundSchema: any; outboundSchema: any }) => {
      const response = await axiosInstance.put(`/entities/${id}/schemas`, data);
      return response.data.entity;
    },
    
    delete: async (id: string) => {
      const response = await axiosInstance.delete(`/entities/${id}`);
      return response.data.success;
    },
    
    import: async (data: any) => {
      const response = await axiosInstance.post('/entities/import', data);
      return response.data;
    },
    
    importOutputSchema: async (data: any) => {
      const response = await axiosInstance.post('/entities/import-output-schema', data);
      return response.data;
    },
    
    test: async (id: string, inputData: any) => {
      const response = await axiosInstance.post(`/entities/${id}/test`, { inputData });
      return response.data.result;
    },
    
    testUpsert: async (id: string, inputData: any, existingData?: any) => {
      const response = await axiosInstance.post(`/entities/${id}/test-upsert`, { inputData, existingData });
      return response.data.result;
    },
    
    generateChangeEvent: async (id: string, data: any) => {
      const response = await axiosInstance.post(`/entities/${id}/change-event`, data);
      return response.data.event;
    },
    
    export: async (id: string) => {
      const response = await axiosInstance.get(`/entities/${id}/export`);
      return response.data.data;
    },
    
    // Abstracted Model endpoints
    setAsAbstractedModel: async (id: string, constraints: any[]) => {
      const response = await axiosInstance.post(`/entities/${id}/abstracted-model`, { constraints });
      return response.data;
    },
    
    addConstraint: async (id: string, constraint: any) => {
      const response = await axiosInstance.post(`/entities/${id}/constraints`, constraint);
      return response.data;
    },
    
    removeConstraint: async (id: string, constraintId: string) => {
      const response = await axiosInstance.delete(`/entities/${id}/constraints/${constraintId}`);
      return response.data;
    },
    
    validateAbstractedModel: async (id: string) => {
      const response = await axiosInstance.post(`/entities/${id}/validate-abstracted`);
      return response.data;
    },
    
    // Schema format and abstraction endpoints
    updateSchemaFormat: async (id: string, data: { schemaFormat: 'json' | 'yaml', inboundAbstracted?: boolean, outboundAbstracted?: boolean }) => {
      const response = await axiosInstance.put(`/entities/${id}/schema-format`, data);
      return response.data.entity;
    },
    
    // Upsert configuration
    updateUpsertConfig: async (id: string, config: any) => {
      const response = await axiosInstance.put(`/entities/${id}/upsert-config`, { upsertConfig: config });
      return response.data.entity;
    },
    
    // Entity linking endpoints
    linkEntity: async (id: string, data: { targetEntityId: string, direction: 'inbound' | 'outbound', linkType: 'reference' | 'inheritance', mappingId?: string }) => {
      const response = await axiosInstance.post(`/entities/${id}/link`, data);
      return response.data.entity;
    },
    
    unlinkEntity: async (id: string, targetId: string, direction: 'inbound' | 'outbound') => {
      const response = await axiosInstance.delete(`/entities/${id}/link/${targetId}/${direction}`);
      return response.data.entity;
    },
    
    getLinks: async (id: string, direction?: 'inbound' | 'outbound') => {
      const url = direction ? `/entities/${id}/links?direction=${direction}` : `/entities/${id}/links`;
      const response = await axiosInstance.get(url);
      return response.data.linkedEntities;
    }
  },

  abstractedModels: {
    list: async () => {
      const response = await axiosInstance.get('/abstracted-models');
      return response.data;
    }
  },

  mappings: {
    getByEntityId: async (entityId: string) => {
      const response = await axiosInstance.get(`/mappings/entity/${entityId}`);
      return response.data.mappings;
    },
    
    create: async (mapping: any) => {
      const response = await axiosInstance.post('/mappings', mapping);
      return response.data.mapping;
    },
    
    update: async (id: string, updates: any) => {
      const response = await axiosInstance.put(`/mappings/${id}`, updates);
      return response.data.mapping;
    },
    
    delete: async (id: string) => {
      const response = await axiosInstance.delete(`/mappings/${id}`);
      return response.data.success;
    },
    
    deleteAllForEntity: async (entityId: string) => {
      const response = await axiosInstance.delete(`/mappings/entity/${entityId}`);
      return response.data.success;
    },
    
    generateDefaults: async (entityId: string) => {
      const response = await axiosInstance.post(`/mappings/generate-defaults/${entityId}`);
      return response.data.mappings;
    },
    
    refresh: async (entityId: string, context?: string) => {
      const response = await axiosInstance.post(`/mappings/refresh/${entityId}`, { context });
      return response.data;
    },
    
    test: async (data: { mapping: any; input: any }) => {
      const response = await axiosInstance.post('/mappings/test', data);
      return response.data;
    },
    
    validate: async (mappings: any[], entityId: string) => {
      const response = await axiosInstance.post('/mappings/validate', { mappings, entityId });
      return response.data.brokenMappings;
    },
    
    suggest: async (data: any) => {
      const response = await axiosInstance.post('/mappings/suggest', data);
      return response.data.suggestions;
    }
  },

  valueMappings: {
    getByEntityId: async (entityId: string) => {
      const response = await axiosInstance.get(`/value-mappings/entity/${entityId}`);
      return response.data.mappings;
    },
    
    create: async (mapping: any) => {
      const response = await axiosInstance.post('/value-mappings', mapping);
      return response.data.mapping;
    },
    
    update: async (id: string, updates: any) => {
      const response = await axiosInstance.put(`/value-mappings/${id}`, updates);
      return response.data.mapping;
    },
    
    delete: async (id: string) => {
      const response = await axiosInstance.delete(`/value-mappings/${id}`);
      return response.data.success;
    },
    
    test: async (id: string, value: any, context?: any) => {
      const response = await axiosInstance.post(`/value-mappings/${id}/test`, { value, context });
      return response.data.result;
    },
    
    getExamples: async () => {
      const response = await axiosInstance.get('/value-mappings/examples/all');
      return response.data.examples;
    }
  },

  generation: {
    generateEntity: async (data: any) => {
      const response = await axiosInstance.post('/generate/entity', data);
      return response.data.files;
    },
    
    generateAzureFunction: async (entityId: string) => {
      const response = await axiosInstance.post('/generate/azure-function', { entityId });
      return response.data;
    },
    
    generateNodeRedFlow: async (entityId: string) => {
      const response = await axiosInstance.post('/generate/node-red-flow', { entityId });
      return response.data;
    },
    
    generateTests: async (entityId: string, framework?: string) => {
      const response = await axiosInstance.post('/generate/tests', { entityId, framework });
      return response.data;
    },
    
    generateDocumentation: async (entityId: string, format?: string) => {
      const response = await axiosInstance.post('/generate/documentation', { entityId, format });
      return response.data;
    },
    
    preview: async (data: any) => {
      const response = await axiosInstance.post('/generate/preview', data);
      return response.data;
    }
  },

  health: {
    check: async () => {
      const response = await axiosInstance.get('/health');
      return response.data;
    }
  }
};

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
