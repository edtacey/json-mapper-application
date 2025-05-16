import { Router } from 'express';
import { EventController } from './event-controller';

export function createEventRouter(): Router {
  const router = Router();
  const controller = new EventController();

  // Event history and stats
  router.get('/:entityId/change-events', controller.getEventHistory.bind(controller));
  router.get('/:entityId/change-events/stats', controller.getEventStats.bind(controller));

  // Event publishing
  router.post('/:entityId/publish-event', controller.publishEvent.bind(controller));
  router.post('/:entityId/test-event', controller.testEventPublishing.bind(controller));

  // Event handler management
  router.post('/handlers/register', controller.registerEventHandler.bind(controller));

  return router;
}
