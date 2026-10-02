import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getAnalytics,
  getPersonalRecords,
  deleteAccount,
} from './users.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/analytics', getAnalytics);
router.get('/records', getPersonalRecords);
router.delete('/account', deleteAccount);

export default router;
