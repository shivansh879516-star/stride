import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import activitiesRoutes from './modules/activities/activities.routes';
import gamificationRoutes from './modules/gamification/gamification.routes';
import privacyRoutes from './modules/privacy/privacy.routes';
import safetyRoutes from './modules/safety/safety.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import routesRoutes from './modules/routes/routes.routes';

const app = express();
const PORT = process.env.PORT || 4000;

// Security and middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    app: 'STRIDE Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/routes', routesRoutes);

// Global 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Path ${req.originalUrl} not found on STRIDE API.` });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error occurred.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`⚡ STRIDE API running on http://localhost:${PORT}`);
    console.log(`📍 Health check ready at http://localhost:${PORT}/api/health`);
  });
}

export default app;
