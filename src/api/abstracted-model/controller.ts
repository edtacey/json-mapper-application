import { Router, Request, Response } from 'express';
import { EntityService } from '../../services/entity.service';
import { UniquenessConstraint } from '../../types';

const router = Router();
const entityService = new EntityService();

// Set entity as abstracted model
router.post('/entities/:entityId/abstracted-model', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { constraints } = req.body;

    const entity = await entityService.setAsAbstractedModel(entityId, constraints);
    res.json(entity);
  } catch (error: any) {
    console.error('Error setting abstracted model:', error);
    res.status(400).json({ error: error.message });
  }
});

// Add uniqueness constraint
router.post('/entities/:entityId/constraints', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const constraint = req.body;

    const entity = await entityService.addUniquenessConstraint(entityId, constraint);
    res.json(entity);
  } catch (error: any) {
    console.error('Error adding constraint:', error);
    res.status(400).json({ error: error.message });
  }
});

// Remove uniqueness constraint
router.delete('/entities/:entityId/constraints/:constraintId', async (req: Request, res: Response) => {
  try {
    const { entityId, constraintId } = req.params;

    const entity = await entityService.removeUniquenessConstraint(entityId, constraintId);
    res.json(entity);
  } catch (error: any) {
    console.error('Error removing constraint:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all abstracted models
router.get('/abstracted-models', async (req: Request, res: Response) => {
  try {
    const models = await entityService.getAbstractedModels();
    res.json(models);
  } catch (error: any) {
    console.error('Error fetching abstracted models:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate abstracted model
router.post('/entities/:entityId/validate-abstracted', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const entity = await entityService.getById(entityId);
    
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const validation = await entityService.validateAbstractedModel(entity);
    res.json(validation);
  } catch (error: any) {
    console.error('Error validating abstracted model:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
