import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { AuthRequest } from '../../middleware/auth';

export async function getPrivacySettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    let settings = await prisma.privacySettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.privacySettings.create({
        data: {
          userId,
          profileVisibility: 'PUBLIC',
          activityVisibility: 'PUBLIC',
          hideStartEndRadiusM: 200,
          showMapRoute: true,
          allowLiveTracking: true,
        },
      });
    }

    const zones = await prisma.privacyZone.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ settings, zones });
  } catch (error: any) {
    console.error('Get privacy error:', error);
    res.status(500).json({ error: 'Failed to retrieve privacy settings.' });
  }
}

export async function updatePrivacySettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const {
      profileVisibility,
      activityVisibility,
      hideStartEndRadiusM,
      showMapRoute,
      allowLiveTracking,
    } = req.body;

    const settings = await prisma.privacySettings.upsert({
      where: { userId },
      update: {
        profileVisibility: profileVisibility !== undefined ? profileVisibility : undefined,
        activityVisibility: activityVisibility !== undefined ? activityVisibility : undefined,
        hideStartEndRadiusM:
          hideStartEndRadiusM !== undefined ? parseInt(hideStartEndRadiusM, 10) : undefined,
        showMapRoute: showMapRoute !== undefined ? Boolean(showMapRoute) : undefined,
        allowLiveTracking:
          allowLiveTracking !== undefined ? Boolean(allowLiveTracking) : undefined,
      },
      create: {
        userId,
        profileVisibility: profileVisibility || 'PUBLIC',
        activityVisibility: activityVisibility || 'PUBLIC',
        hideStartEndRadiusM: hideStartEndRadiusM ? parseInt(hideStartEndRadiusM, 10) : 200,
        showMapRoute: showMapRoute !== undefined ? Boolean(showMapRoute) : true,
        allowLiveTracking: allowLiveTracking !== undefined ? Boolean(allowLiveTracking) : true,
      },
    });

    res.json({ message: 'Privacy preferences updated.', settings });
  } catch (error: any) {
    console.error('Update privacy error:', error);
    res.status(500).json({ error: 'Failed to update privacy settings.' });
  }
}

export async function addPrivacyZone(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { name, latitude, longitude, radiusMeters = 500 } = req.body;
    if (!name || latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'Name, latitude, and longitude are required.' });
      return;
    }

    const zone = await prisma.privacyZone.create({
      data: {
        userId,
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusMeters: parseInt(radiusMeters, 10) || 500,
      },
    });

    res.status(201).json({ message: 'Privacy zone added.', zone });
  } catch (error: any) {
    console.error('Add privacy zone error:', error);
    res.status(500).json({ error: 'Failed to create privacy zone.' });
  }
}

export async function deletePrivacyZone(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const id = String(req.params.id);

    const zone = await prisma.privacyZone.findUnique({ where: { id } });
    if (!zone || zone.userId !== userId) {
      res.status(404).json({ error: 'Privacy zone not found or unauthorized.' });
      return;
    }

    await prisma.privacyZone.delete({ where: { id } });
    res.json({ message: 'Privacy zone removed.' });
  } catch (error: any) {
    console.error('Delete privacy zone error:', error);
    res.status(500).json({ error: 'Failed to delete privacy zone.' });
  }
}
