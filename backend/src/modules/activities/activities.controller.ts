import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { AuthRequest } from '../../middleware/auth';
import {
  computeSplits,
  calculateTotalDistanceMeters,
  calculateElevation,
  LatLngPoint,
} from '../../utils/geo';
import { fetchActivityWeather } from '../../utils/weather';
import { evaluateAchievements } from '../gamification/gamification.controller';

export async function createActivity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const {
      title,
      description,
      activityType = 'RUN',
      startTime,
      endTime,
      durationSec,
      movingDurationSec,
      distanceMeters,
      averagePaceSec,
      averageSpeedKmh,
      maxSpeedKmh,
      calories,
      elevationGainM = 0,
      elevationLossM = 0,
      visibility = 'PUBLIC',
      clientSyncId,
      points = [],
    } = req.body;

    if (!title || durationSec === undefined) {
      res.status(400).json({ error: 'Title and duration are required.' });
      return;
    }

    // Check if duplicate sync id
    if (clientSyncId) {
      const existing = await prisma.activity.findUnique({
        where: { clientSyncId },
      });
      if (existing) {
        res.status(200).json({
          message: 'Activity already synchronized.',
          activity: existing,
          alreadySynced: true,
        });
        return;
      }
    }

    // If points are provided, verify / compute splits and elevation
    let computedSplits: any[] = [];
    let calcDist = distanceMeters;
    let calcGain = elevationGainM;
    let calcLoss = elevationLossM;

    if (points && points.length > 0) {
      if (!calcDist || calcDist <= 0) {
        calcDist = calculateTotalDistanceMeters(points);
      }
      computedSplits = computeSplits(points);
      if (!calcGain && !calcLoss) {
        const elev = calculateElevation(points);
        calcGain = elev.gain;
        calcLoss = elev.loss;
      }
    }

    const start = startTime ? new Date(startTime) : new Date();
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + durationSec * 1000);

    // Compute XP earned: 10 XP per km + 1 XP per minute active + 20 baseline
    const km = (calcDist || 0) / 1000;
    const mins = Math.floor(durationSec / 60);
    const earnedXp = Math.round(km * 12 + mins * 2 + 25);

    // Create activity in database
    const activity = await prisma.activity.create({
      data: {
        userId,
        title,
        description: description || '',
        activityType: activityType.toUpperCase(),
        startTime: start,
        endTime: end,
        durationSec,
        movingDurationSec: movingDurationSec || durationSec,
        distanceMeters: Math.round((calcDist || 0) * 10) / 10,
        averagePaceSec: averagePaceSec || (km > 0 ? durationSec / km : 0),
        averageSpeedKmh:
          averageSpeedKmh || (durationSec > 0 ? ((calcDist || 0) / 1000 / (durationSec / 3600)) : 0),
        maxSpeedKmh: maxSpeedKmh || 0,
        calories: calories || Math.round(km * 65), // baseline run calories
        elevationGainM: calcGain,
        elevationLossM: calcLoss,
        visibility,
        clientSyncId,
        statistics: {
          create: {
            splitsJson: JSON.stringify(computedSplits),
            paceSamples: JSON.stringify(
              points.slice(0, 100).map((p: LatLngPoint, idx: number) => ({
                idx,
                speed: p.speed || 0,
                altitude: p.altitude || 0,
              }))
            ),
          },
        },
        points: {
          create: points.map((p: LatLngPoint, index: number) => ({
            latitude: p.latitude,
            longitude: p.longitude,
            altitude: p.altitude || null,
            accuracy: p.accuracy || null,
            speed: p.speed || null,
            timestamp: new Date(p.timestamp || start),
            sequenceOrder: index,
          })),
        },
      },
      include: {
        statistics: true,
      },
    });

    // Update user profile XP and Level
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (profile) {
      const newXp = profile.xp + earnedXp;
      // Level formula: Level = floor(sqrt(XP / 100)) + 1
      const newLevel = Math.max(1, Math.floor(Math.sqrt(newXp / 80)) + 1);

      // Streak calculation
      const now = new Date();
      const lastUpdated = new Date(profile.updatedAt);
      const isNextDay =
        now.getDate() !== lastUpdated.getDate() ||
        now.getMonth() !== lastUpdated.getMonth() ||
        now.getFullYear() !== lastUpdated.getFullYear();

      const newStreak = isNextDay ? profile.currentStreak + 1 : profile.currentStreak;
      const longest = Math.max(newStreak, profile.longestStreak);

      await prisma.profile.update({
        where: { userId },
        data: {
          xp: newXp,
          level: newLevel,
          currentStreak: newStreak,
          longestStreak: longest,
        },
      });
    }

    // Evaluate Achievements
    const unlockedAchievements = await evaluateAchievements(userId, activity);

    res.status(201).json({
      message: 'Activity saved successfully.',
      activity,
      earnedXp,
      unlockedAchievements,
    });
  } catch (error: any) {
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Failed to record activity.' });
  }
}

export async function getActivities(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { limit = '20', type, visibility } = req.query;

    const where: any = { userId };
    if (type && typeof type === 'string' && type !== 'ALL') {
      where.activityType = type.toUpperCase();
    }
    if (visibility && typeof visibility === 'string') {
      where.visibility = visibility;
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: Math.min(100, parseInt(limit as string, 10) || 20),
      include: {
        statistics: true,
        points: {
          take: 50, // Overview points for polyline preview
          orderBy: { sequenceOrder: 'asc' },
          select: {
            latitude: true,
            longitude: true,
            sequenceOrder: true,
          },
        },
      },
    });

    res.json({ activities });
  } catch (error: any) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Failed to retrieve activities.' });
  }
}

export async function getActivityById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const userId = req.user?.userId;

    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        statistics: true,
        points: {
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });

    if (!activity) {
      res.status(404).json({ error: 'Activity not found.' });
      return;
    }

    // Check visibility
    if (activity.visibility === 'PRIVATE' && activity.userId !== userId) {
      res.status(403).json({ error: 'This activity is private.' });
      return;
    }

    res.json({ activity });
  } catch (error: any) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to retrieve activity details.' });
  }
}

export async function deleteActivity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const userId = req.user?.userId;

    const activity = await prisma.activity.findUnique({ where: { id } });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found.' });
      return;
    }

    if (activity.userId !== userId) {
      res.status(403).json({ error: 'You are not authorized to delete this activity.' });
      return;
    }

    await prisma.activity.delete({ where: { id } });
    res.json({ message: 'Activity deleted successfully.' });
  } catch (error: any) {
    console.error('Delete activity error:', error);
    res.status(500).json({ error: 'Failed to delete activity.' });
  }
}

export async function batchSyncActivities(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { activities = [] } = req.body;
    const results = [];

    for (const act of activities) {
      if (!act.title || !act.durationSec) continue;

      if (act.clientSyncId) {
        const existing = await prisma.activity.findUnique({
          where: { clientSyncId: act.clientSyncId },
        });
        if (existing) {
          results.push({ clientSyncId: act.clientSyncId, status: 'already_synced', id: existing.id });
          continue;
        }
      }

      const km = (act.distanceMeters || 0) / 1000;
      const created = await prisma.activity.create({
        data: {
          userId,
          title: act.title,
          description: act.description || '',
          activityType: (act.activityType || 'RUN').toUpperCase(),
          startTime: new Date(act.startTime),
          endTime: new Date(act.endTime),
          durationSec: act.durationSec,
          movingDurationSec: act.movingDurationSec || act.durationSec,
          distanceMeters: act.distanceMeters || 0,
          averagePaceSec: act.averagePaceSec || (km > 0 ? act.durationSec / km : 0),
          averageSpeedKmh: act.averageSpeedKmh || 0,
          maxSpeedKmh: act.maxSpeedKmh || 0,
          calories: act.calories || Math.round(km * 65),
          elevationGainM: act.elevationGainM || 0,
          elevationLossM: act.elevationLossM || 0,
          visibility: act.visibility || 'PUBLIC',
          clientSyncId: act.clientSyncId,
          statistics: {
            create: {
              splitsJson: JSON.stringify(act.splits || []),
            },
          },
        },
      });

      results.push({ clientSyncId: act.clientSyncId, status: 'synced', id: created.id });
    }

    res.json({ message: 'Batch sync complete', results });
  } catch (error: any) {
    console.error('Batch sync error:', error);
    res.status(500).json({ error: 'Failed to synchronize offline activities.' });
  }
}

export async function exportActivityGpx(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        points: { orderBy: { sequenceOrder: 'asc' } },
      },
    });

    if (!activity) {
      res.status(404).json({ error: 'Activity not found.' });
      return;
    }

    const gpxPoints = activity.points
      .map(
        (p) => `      <trkpt lat="${p.latitude}" lon="${p.longitude}">
        <ele>${p.altitude || 0}</ele>
        <time>${p.timestamp.toISOString()}</time>
        ${p.speed ? `<speed>${p.speed}</speed>` : ''}
      </trkpt>`
      )
      .join('\n');

    const gpxXml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="STRIDE Fitness Platform" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${activity.title.replace(/&/g, '&amp;')}</name>
    <time>${activity.startTime.toISOString()}</time>
  </metadata>
  <trk>
    <name>${activity.title.replace(/&/g, '&amp;')}</name>
    <type>${activity.activityType}</type>
    <trkseg>
${gpxPoints}
    </trkseg>
  </trk>
</gpx>`;

    res.setHeader('Content-Type', 'application/gpx+xml');
    res.setHeader('Content-Disposition', `attachment; filename="stride_${activity.id}.gpx"`);
    res.send(gpxXml);
  } catch (error: any) {
    console.error('GPX export error:', error);
    res.status(500).json({ error: 'Failed to generate GPX file.' });
  }
}
