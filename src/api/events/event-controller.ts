import { Request, Response } from 'express';
import { EventPublisherService } from '../../services/event-publisher.service';
import { EntityService } from '../../services/entity.service';
import { MappingService } from '../../services/mapping.service';

export class EventController {
  private eventPublisher: EventPublisherService;
  private entityService: EntityService;
  private mappingService: MappingService;

  constructor() {
    this.eventPublisher = new EventPublisherService();
    this.entityService = new EntityService();
    this.mappingService = new MappingService();
  }

  async getEventHistory(req: Request, res: Response) {
    try {
      const { entityId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const events = await this.eventPublisher.getEventHistory(entityId, limit);
      res.json({ events });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getEventStats(req: Request, res: Response) {
    try {
      const { entityId } = req.params;

      const stats = await this.eventPublisher.getEventStats(entityId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async publishEvent(req: Request, res: Response) {
    try {
      const { entityId } = req.params;
      const { newData, oldData } = req.body;

      const entity = await this.entityService.getById(entityId);
      if (!entity) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      if (!entity.outputConfig?.changeEventConfig?.enabled) {
        return res.status(400).json({ error: 'Change events not enabled for this entity' });
      }

      const event = await this.eventPublisher.publishEvent(
        entityId,
        newData,
        oldData,
        entity.outputConfig.changeEventConfig
      );

      res.json({ event });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async testEventPublishing(req: Request, res: Response) {
    try {
      const { entityId } = req.params;
      const { inputData } = req.body;

      const entity = await this.entityService.getById(entityId);
      if (!entity) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      // Get mappings and apply transformation
      const mappings = await this.mappingService.getByEntityId(entityId);
      const result = await this.entityService.testTransformation(entity, mappings, inputData);

      // Create test event
      const testEvent = await this.entityService.generateChangeEvent(
        entity,
        null,
        result.output,
        'insert'
      );

      res.json({
        transformedData: result.output,
        event: testEvent,
        eventConfig: entity.outputConfig?.changeEventConfig
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async registerEventHandler(req: Request, res: Response) {
    try {
      const { handlerId, type, config } = req.body;

      // This would typically register custom event handlers
      // For now, we'll just acknowledge the request
      res.json({
        message: `Handler ${handlerId} registered`,
        type,
        config
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
