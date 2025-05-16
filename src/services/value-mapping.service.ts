import { ValueMapping, ValueMappingType, ValueMappingResult } from '../types';
import { DataStore } from '../storage/data-store';

export class ValueMappingService {
  private dataStore: DataStore;
  private cache: Map<string, ValueMapping> = new Map();

  constructor() {
    this.dataStore = new DataStore('./data/value-mappings');
    this.loadCache();
  }

  private async loadCache() {
    const mappings = await this.dataStore.list<ValueMapping>();
    mappings.forEach(mapping => this.cache.set(mapping.id, mapping));
  }

  async create(mapping: Omit<ValueMapping, 'id' | 'createdAt'>): Promise<ValueMapping> {
    const valueMapping: ValueMapping = {
      ...mapping,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };

    await this.dataStore.save(valueMapping);
    this.cache.set(valueMapping.id, valueMapping);
    return valueMapping;
  }

  async update(id: string, updates: Partial<ValueMapping>): Promise<ValueMapping> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Value mapping ${id} not found`);
    }

    const updated: ValueMapping = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };

    await this.dataStore.save(updated);
    this.cache.set(id, updated);
    return updated;
  }

  async getById(id: string): Promise<ValueMapping | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    return this.dataStore.get<ValueMapping>(id);
  }

  async getByEntityId(entityId: string): Promise<ValueMapping[]> {
    const all = await this.dataStore.list<ValueMapping>();
    return all.filter(vm => vm.entityId === entityId);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.dataStore.delete(id);
    this.cache.delete(id);
    return result;
  }

  // Core value mapping functionality
  async mapValue(
    value: any, 
    mappingId: string, 
    context?: { caseSensitive?: boolean }
  ): Promise<ValueMappingResult> {
    const mapping = await this.getById(mappingId);
    if (!mapping) {
      return { matched: false, value };
    }

    const caseSensitive = context?.caseSensitive ?? mapping.caseSensitive;
    
    switch (mapping.type) {
      case 'exact':
        return this.exactMatch(value, mapping, caseSensitive);
      case 'regex':
        return this.regexMatch(value, mapping, caseSensitive);
      case 'range':
        return this.rangeMatch(value, mapping);
      case 'contains':
        return this.containsMatch(value, mapping, caseSensitive);
      case 'prefix':
        return this.prefixMatch(value, mapping, caseSensitive);
      case 'suffix':
        return this.suffixMatch(value, mapping, caseSensitive);
      case 'custom':
        return this.customMatch(value, mapping);
      default:
        return { matched: false, value: mapping.defaultValue ?? value };
    }
  }

  private exactMatch(
    value: any, 
    mapping: ValueMapping, 
    caseSensitive: boolean
  ): ValueMappingResult {
    const normalizedValue = this.normalizeValue(value, caseSensitive);
    
    for (const [pattern, mappedValue] of Object.entries(mapping.mappings)) {
      const normalizedPattern = this.normalizeValue(pattern, caseSensitive);
      if (normalizedValue === normalizedPattern) {
        return {
          matched: true,
          value: mappedValue,
          confidence: 1.0
        };
      }
    }

    return {
      matched: false,
      value: mapping.defaultValue ?? value
    };
  }

  private regexMatch(
    value: any, 
    mapping: ValueMapping, 
    caseSensitive: boolean
  ): ValueMappingResult {
    const stringValue = String(value);
    
    for (const [pattern, mappedValue] of Object.entries(mapping.mappings)) {
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      
      if (regex.test(stringValue)) {
        return {
          matched: true,
          value: mappedValue,
          confidence: 0.9
        };
      }
    }

    return {
      matched: false,
      value: mapping.defaultValue ?? value
    };
  }

  private rangeMatch(value: any, mapping: ValueMapping): ValueMappingResult {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return { matched: false, value: mapping.defaultValue ?? value };
    }

    for (const [rangeStr, mappedValue] of Object.entries(mapping.mappings)) {
      const range = this.parseRange(rangeStr);
      if (range && numValue >= range.min && numValue <= range.max) {
        return {
          matched: true,
          value: mappedValue,
          confidence: 1.0
        };
      }
    }

    return {
      matched: false,
      value: mapping.defaultValue ?? value
    };
  }

  private containsMatch(
    value: any, 
    mapping: ValueMapping, 
    caseSensitive: boolean
  ): ValueMappingResult {
    const stringValue = this.normalizeValue(value, caseSensitive);
    
    for (const [pattern, mappedValue] of Object.entries(mapping.mappings)) {
      const normalizedPattern = this.normalizeValue(pattern, caseSensitive);
      if (stringValue.includes(normalizedPattern)) {
        return {
          matched: true,
          value: mappedValue,
          confidence: 0.8
        };
      }
    }

    return {
      matched: false,
      value: mapping.defaultValue ?? value
    };
  }

  private prefixMatch(
    value: any, 
    mapping: ValueMapping, 
    caseSensitive: boolean
  ): ValueMappingResult {
    const stringValue = this.normalizeValue(value, caseSensitive);
    
    for (const [pattern, mappedValue] of Object.entries(mapping.mappings)) {
      const normalizedPattern = this.normalizeValue(pattern, caseSensitive);
      if (stringValue.startsWith(normalizedPattern)) {
        return {
          matched: true,
          value: mappedValue,
          confidence: 0.9
        };
      }
    }

    return {
      matched: false,
      value: mapping.defaultValue ?? value
    };
  }

  private suffixMatch(
    value: any, 
    mapping: ValueMapping, 
    caseSensitive: boolean
  ): ValueMappingResult {
    const stringValue = this.normalizeValue(value, caseSensitive);
    
    for (const [pattern, mappedValue] of Object.entries(mapping.mappings)) {
      const normalizedPattern = this.normalizeValue(pattern, caseSensitive);
      if (stringValue.endsWith(normalizedPattern)) {
        return {
          matched: true,
          value: mappedValue,
          confidence: 0.9
        };
      }
    }

    return {
      matched: false,
      value: mapping.defaultValue ?? value
    };
  }

  private customMatch(value: any, mapping: ValueMapping): ValueMappingResult {
    // Custom function evaluation - would need sandboxed execution
    // For now, return default
    return {
      matched: false,
      value: mapping.defaultValue ?? value,
      confidence: 0
    };
  }

  private normalizeValue(value: any, caseSensitive: boolean): string {
    const stringValue = String(value);
    return caseSensitive ? stringValue : stringValue.toLowerCase();
  }

  private parseRange(rangeStr: string): { min: number; max: number } | null {
    const match = rangeStr.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
    if (match) {
      return {
        min: parseFloat(match[1]),
        max: parseFloat(match[2])
      };
    }
    return null;
  }

  private generateId(): string {
    return `vm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Bulk operations
  async importMappings(data: any[]): Promise<ValueMapping[]> {
    const mappings: ValueMapping[] = [];
    
    for (const item of data) {
      const mapping = await this.create({
        name: item.name,
        description: item.description,
        mappings: item.mappings,
        defaultValue: item.defaultValue,
        caseSensitive: item.caseSensitive ?? false,
        type: item.type ?? 'exact'
      });
      mappings.push(mapping);
    }

    return mappings;
  }

  // Generate example mappings
  generateExamples(): ValueMapping[] {
    return [
      {
        id: 'vm_country_codes',
        name: 'Country Code Mapping',
        description: 'Map country names to ISO codes',
        mappings: {
          'United States': 'US',
          'USA': 'US',
          'United Kingdom': 'GB',
          'UK': 'GB',
          'Canada': 'CA',
          'Australia': 'AU'
        },
        defaultValue: 'UNKNOWN',
        caseSensitive: false,
        type: 'exact',
        createdAt: new Date().toISOString()
      },
      {
        id: 'vm_status_codes',
        name: 'Status Code Mapping',
        description: 'Map various status values to standard codes',
        mappings: {
          'active|enabled|on': 'ACTIVE',
          'inactive|disabled|off': 'INACTIVE',
          'pending|waiting': 'PENDING',
          'error|failed': 'ERROR'
        },
        defaultValue: 'UNKNOWN',
        caseSensitive: false,
        type: 'regex',
        createdAt: new Date().toISOString()
      },
      {
        id: 'vm_priority_levels',
        name: 'Priority Level Mapping',
        description: 'Map numeric priority to text levels',
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
  }
}
