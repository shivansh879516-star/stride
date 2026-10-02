import { Router } from 'express';
import {
  getPrivacySettings,
  updatePrivacySettings,
  addPrivacyZone,
  deletePrivacyZone,
} from './privacy.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getPrivacySettings);
router.put('/', updatePrivacySettings);
router.post('/zones', addPrivacyZone);
router.delete('/zones/:id', deletePrivacyZone);

export default router;
