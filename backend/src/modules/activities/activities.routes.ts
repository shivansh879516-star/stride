import { Router } from 'express';
import {
  createActivity,
  getActivities,
  getActivityById,
  deleteActivity,
  batchSyncActivities,
  exportActivityGpx,
} from './activities.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', createActivity);
router.get('/', getActivities);
router.get('/:id', getActivityById);
router.get('/:id/gpx', exportActivityGpx);
router.delete('/:id', deleteActivity);
router.post('/sync', batchSyncActivities);

export default router;
