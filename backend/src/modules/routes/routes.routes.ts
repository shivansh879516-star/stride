import { Router } from 'express';
import { getRoutes, getRouteById, createRoute } from './routes.controller';
import { optionalAuthMiddleware, authMiddleware } from '../../middleware/auth';

const router = Router();

router.get('/', optionalAuthMiddleware, getRoutes);
router.get('/:id', optionalAuthMiddleware, getRouteById);
router.post('/', authMiddleware, createRoute);

export default router;
