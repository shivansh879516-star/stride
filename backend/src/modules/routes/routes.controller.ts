import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { AuthRequest } from '../../middleware/auth';

export async function getRoutes(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { activityType } = req.query;
    const where: any = { isPublic: true };
    if (activityType && typeof activityType === 'string') {
      where.activityType = activityType.toUpperCase();
    }

    const routes = await prisma.route.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        user: {
          select: {
            username: true,
            profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    res.json({ routes });
  } catch (error: any) {
    console.error('Get routes error:', error);
    res.status(500).json({ error: 'Failed to retrieve routes.' });
  }
}

export async function getRouteById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            username: true,
            profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!route) {
      res.status(404).json({ error: 'Route not found.' });
      return;
    }

    res.json({ route });
  } catch (error: any) {
    console.error('Get route details error:', error);
    res.status(500).json({ error: 'Failed to retrieve route.' });
  }
}

export async function createRoute(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const {
      name,
      description,
      activityType = 'RUN',
      distanceMeters,
      elevationGainM = 0,
      coordinatesJson,
      isPublic = true,
    } = req.body;

    if (!name || !distanceMeters || !coordinatesJson) {
      res.status(400).json({ error: 'Route name, distance, and coordinates are required.' });
      return;
    }

    const route = await prisma.route.create({
      data: {
        userId,
        name,
        description: description || '',
        activityType: activityType.toUpperCase(),
        distanceMeters: parseFloat(distanceMeters),
        elevationGainM: parseFloat(elevationGainM) || 0,
        coordinatesJson: typeof coordinatesJson === 'string' ? coordinatesJson : JSON.stringify(coordinatesJson),
        isPublic: Boolean(isPublic),
      },
    });

    res.status(201).json({ message: 'Route saved successfully.', route });
  } catch (error: any) {
    console.error('Create route error:', error);
    res.status(500).json({ error: 'Failed to create route.' });
  }
}
