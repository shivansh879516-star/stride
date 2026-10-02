import { Router } from 'express';
import {
  getSafetyOverview,
  addSafetyContact,
  deleteSafetyContact,
  generateLiveShare,
  updateLiveLocation,
  getLiveLocationPublic,
} from './safety.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// Public route for emergency contacts to view live location
router.get('/live/:shareToken', getLiveLocationPublic);

// Authenticated routes
router.use(authMiddleware);
router.get('/', getSafetyOverview);
router.post('/contacts', addSafetyContact);
router.delete('/contacts/:id', deleteSafetyContact);
router.post('/live-share', generateLiveShare);
router.post('/live-update', updateLiveLocation);

export default router;
