import { promises as fs } from 'fs';
import * as path from 'path';

export class DataStore {
  private basePath: string;
  private cache: Map<string, any> = new Map();
  private initialized: boolean = false;

  constructor(basePath: string) {
    this.basePath = basePath;
    this.initialize();
  }

  private async initialize() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      this.initialized = true;
      console.log(`Data store initialized at: ${this.basePath}`);
    } catch (error) {
      console.error('Failed to initialize data store:', error);
    }
  }

  async save<T extends { id: string }>(data: T): Promise<T> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const filePath = path.join(this.basePath, `${data.id}.json`);
      
      // Add metadata
      const enrichedData = {
        ...data,
        updatedAt: new Date().toISOString(),
        version: await this.getNextVersion(data.id)
      };

      // Save to file
      await fs.writeFile(
        filePath,
        JSON.stringify(enrichedData, null, 2),
        'utf-8'
      );

      // Update cache
      this.cache.set(data.id, enrichedData);

      // Save to history
      await this.saveHistory(enrichedData);

      return enrichedData as T;
    } catch (error) {
      console.error(`Error saving item ${data.id}:`, error);
      throw new Error(`Failed to save ${data.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async get<T>(id: string): Promise<T | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }

    const filePath = path.join(this.basePath, `${id}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      this.cache.set(id, data);
      return data;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async list<T>(): Promise<T[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const files = await fs.readdir(this.basePath);
      const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('history'));
      
      const items = await Promise.all(
        jsonFiles.map(async file => {
          const id = path.basename(file, '.json');
          return this.get<T>(id);
        })
      );

      return items.filter(item => item !== null) as T[];
    } catch (error) {
      console.error('Error listing items:', error);
      return [];
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    const filePath = path.join(this.basePath, `${id}.json`);
    
    try {
      await fs.unlink(filePath);
      this.cache.delete(id);
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async search<T>(predicate: (item: T) => boolean): Promise<T[]> {
    const allItems = await this.list<T>();
    return allItems.filter(predicate);
  }

  private async saveHistory(data: any): Promise<void> {
    const historyDir = path.join(this.basePath, 'history', data.id);
    
    try {
      await fs.mkdir(historyDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const historyFile = path.join(historyDir, `${timestamp}.json`);
      
      await fs.writeFile(historyFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      // Just log the error but don't fail the save operation
      console.error('Error saving history:', error);
    }
  }

  private async getNextVersion(id: string): Promise<number> {
    const current = await this.get<{ version?: number }>(id);
    return (current?.version || 0) + 1;
  }

  async backup(): Promise<string> {
    const backupDir = path.join(this.basePath, '..', 'backups', new Date().toISOString().replace(/[:.]/g, '-'));
    
    try {
      await fs.mkdir(backupDir, { recursive: true });
      
      const files = await fs.readdir(this.basePath);
      for (const file of files) {
        if (file.endsWith('.json') && !file.includes('history')) {
          const source = path.join(this.basePath, file);
          const dest = path.join(backupDir, file);
          await fs.copyFile(source, dest);
        }
      }
      
      return backupDir;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async restore(backupPath: string): Promise<void> {
    try {
      const files = await fs.readdir(backupPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const source = path.join(backupPath, file);
          const dest = path.join(this.basePath, file);
          await fs.copyFile(source, dest);
        }
      }
      
      // Clear cache to force reload
      this.cache.clear();
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw error;
    }
  }

  async getHistory(id: string): Promise<any[]> {
    const historyDir = path.join(this.basePath, 'history', id);
    
    try {
      const files = await fs.readdir(historyDir);
      const history = await Promise.all(
        files.map(async file => {
          const content = await fs.readFile(path.join(historyDir, file), 'utf-8');
          return JSON.parse(content);
        })
      );
      
      return history.sort((a, b) => 
        new Date(b.updatedAt || b.createdAt).getTime() - 
        new Date(a.updatedAt || a.createdAt).getTime()
      );
    } catch (error) {
      return [];
    }
  }

  // Export and import functionality
  async exportAll(): Promise<any> {
    const items = await this.list();
    return {
      exportedAt: new Date().toISOString(),
      dataType: path.basename(this.basePath),
      items
    };
  }

  async importAll(data: any): Promise<number> {
    let imported = 0;
    
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        if (item.id) {
          await this.save(item);
          imported++;
        }
      }
    }
    
    return imported;
  }

  // Utility methods
  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  async exists(id: string): Promise<boolean> {
    const filePath = path.join(this.basePath, `${id}.json`);
    
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
