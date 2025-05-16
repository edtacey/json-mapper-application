import { Request, Response } from 'express';
import { EntityService } from '../../services/entity.service';
import { OutputSchemaSource, UpsertConfiguration, ChangeEventConfiguration } from '../../types';

export class OutputSchemaController {
  private entityService: EntityService;

  constructor() {
    this.entityService = new EntityService();
  }

  async fetchFromAPI(req: Request, res: Response) {
    try {
      const { entityId } = req.params;
      const config: OutputSchemaSource = req.body;

      const schema = await this.entityService.fetchOutputSchemaFromAPI(entityId, config);
      res.json({ schema });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async refreshSchema(req: Request, res: Response) {
    try {
      const { entityId } = req.params;
      
      const schema = await this.entityService.refreshOutputSchema(entityId);
      res.json({ schema });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateSchema(req: Request, res: Response) {
    try {
      const { entityId } = req.params;
      const { schema } = req.body;

      const entity = await this.entityService.updateOutputSchema(entityId, schema);
      res.json(entity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getSchemaVersions(req: Request, res: Response) {
    try {
      const { entityId } = req.params;
      
      const versions = await this.entityService.getSchemaVersions(entityId);
      res.json({ versions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateUpsertConfig(req: Request, res: Response) {
    try {
      const { entityId } = req.params;
      const config: UpsertConfiguration = req.body;

      const entity = await this.entityService.updateUpsertConfig(entityId, config);
      res.json(entity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async validateUpsertFields(req: Request, res: Response) {
    try {
      const { entityId } = req.params;
      const { fields } = req.body;

      const validation = await this.entityService.validateUpsertFields(entityId, fields);
      res.json(validation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateChangeEventConfig(req: Request, res: Response) {
    try {
      const { entityId } = req.params;
      const config: ChangeEventConfiguration = req.body;

      const entity = await this.entityService.updateChangeEventConfig(entityId, config);
      res.json(entity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
