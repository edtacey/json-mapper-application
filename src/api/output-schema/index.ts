import { Router } from 'express';
import { OutputSchemaController } from './output-schema-controller';

export function createOutputSchemaRouter(): Router {
  const router = Router();
  const controller = new OutputSchemaController();

  // Schema management
  router.post('/:entityId/output-schema/fetch', controller.fetchFromAPI.bind(controller));
  router.post('/:entityId/output-schema/refresh', controller.refreshSchema.bind(controller));
  router.put('/:entityId/output-schema', controller.updateSchema.bind(controller));
  router.get('/:entityId/output-schema/versions', controller.getSchemaVersions.bind(controller));

  // Upsert configuration
  router.post('/:entityId/upsert-config', controller.updateUpsertConfig.bind(controller));
  router.post('/:entityId/upsert-config/validate', controller.validateUpsertFields.bind(controller));

  // Change event configuration
  router.post('/:entityId/change-event-config', controller.updateChangeEventConfig.bind(controller));

  return router;
}
