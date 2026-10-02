import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { AuthRequest } from '../../middleware/auth';

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, email: true, username: true, createdAt: true },
        },
      },
    });

    if (!profile) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    // Weekly summary (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyActivities = await prisma.activity.findMany({
      where: {
        userId,
        startTime: { gte: sevenDaysAgo },
      },
    });

    const weeklyDistanceMeters = weeklyActivities.reduce((sum, a) => sum + a.distanceMeters, 0);
    const weeklyDurationSec = weeklyActivities.reduce((sum, a) => sum + a.durationSec, 0);
    const weeklyCount = weeklyActivities.length;

    // All time totals
    const allActivities = await prisma.activity.findMany({
      where: { userId },
      select: { distanceMeters: true, durationSec: true, calories: true },
    });

    const allTimeDistanceKm = allActivities.reduce((s, a) => s + a.distanceMeters, 0) / 1000;
    const allTimeDurationSec = allActivities.reduce((s, a) => s + a.durationSec, 0);
    const allTimeCalories = allActivities.reduce((s, a) => s + a.calories, 0);

    res.json({
      profile,
      weekly: {
        distanceKm: Math.round((weeklyDistanceMeters / 1000) * 10) / 10,
        durationSec: weeklyDurationSec,
        count: weeklyCount,
        progressPercent: Math.min(
          100,
          Math.round(((weeklyDistanceMeters / 1000) / (profile.weeklyGoalKm || 20)) * 100)
        ),
      },
      allTime: {
        activitiesCount: allActivities.length,
        distanceKm: Math.round(allTimeDistanceKm * 10) / 10,
        durationSec: allTimeDurationSec,
        calories: allTimeCalories,
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { firstName, lastName, bio, avatarUrl, city, country, heightCm, weightKg, weeklyGoalKm } = req.body;

    const updated = await prisma.profile.update({
      where: { userId },
      data: {
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        bio: bio !== undefined ? bio : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        city: city !== undefined ? city : undefined,
        country: country !== undefined ? country : undefined,
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        weeklyGoalKm: weeklyGoalKm ? parseFloat(weeklyGoalKm) : undefined,
      },
    });

    res.json({ message: 'Profile updated successfully.', profile: updated });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
}

export async function getAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { timeframe = 'weekly' } = req.query; // weekly, monthly, yearly
    const now = new Date();
    let startDate = new Date();

    if (timeframe === 'monthly') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeframe === 'yearly') {
      startDate.setDate(startDate.getDate() - 365);
    } else {
      // weekly: default last 7 days
      startDate.setDate(startDate.getDate() - 7);
    }

    const activities = await prisma.activity.findMany({
      where: {
        userId,
        startTime: { gte: startDate },
      },
      orderBy: { startTime: 'asc' },
    });

    const totalDistanceMeters = activities.reduce((sum, a) => sum + a.distanceMeters, 0);
    const totalDurationSec = activities.reduce((sum, a) => sum + a.durationSec, 0);
    const totalCalories = activities.reduce((sum, a) => sum + a.calories, 0);
    const totalElevationGain = activities.reduce((sum, a) => sum + a.elevationGainM, 0);

    const distanceKm = totalDistanceMeters / 1000;
    const avgPaceSec = distanceKm > 0 ? totalDurationSec / distanceKm : 0;

    // Daily breakdown for charts
    const dailyMap: { [key: string]: number } = {};
    // Pre-populate last 7 days for weekly
    if (timeframe === 'weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayName = days[d.getDay()];
        dailyMap[dayName] = 0;
      }
      activities.forEach((act) => {
        const dayName = days[new Date(act.startTime).getDay()];
        if (dailyMap[dayName] !== undefined) {
          dailyMap[dayName] += act.distanceMeters / 1000;
        }
      });
    }

    const chartData = Object.keys(dailyMap).map((label) => ({
      label,
      distanceKm: Math.round(dailyMap[label] * 10) / 10,
    }));

    res.json({
      timeframe,
      totals: {
        distanceKm: Math.round(distanceKm * 10) / 10,
        durationSec: totalDurationSec,
        count: activities.length,
        avgPaceSec: Math.round(avgPaceSec),
        calories: totalCalories,
        elevationGainM: Math.round(totalElevationGain),
      },
      chartData,
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics.' });
  }
}

export async function getPersonalRecords(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const activities = await prisma.activity.findMany({
      where: { userId },
      orderBy: { distanceMeters: 'desc' },
    });

    if (activities.length === 0) {
      res.json({ records: [] });
      return;
    }

    // Longest distance
    const longest = activities[0];

    // Longest duration
    const longestDuration = [...activities].sort((a, b) => b.durationSec - a.durationSec)[0];

    // Fastest pace (with minimum 1km distance)
    const eligibleForPace = activities.filter((a) => a.distanceMeters >= 1000 && a.averagePaceSec > 0);
    const fastestPace = eligibleForPace.sort((a, b) => a.averagePaceSec - b.averagePaceSec)[0];

    // Highest elevation gain
    const highestElevation = [...activities].sort((a, b) => b.elevationGainM - a.elevationGainM)[0];

    // Max speed
    const highestSpeed = [...activities].sort((a, b) => b.maxSpeedKmh - a.maxSpeedKmh)[0];

    const records = [
      {
        id: 'longest_dist',
        title: 'Longest Stride',
        value: `${(longest.distanceMeters / 1000).toFixed(2)} km`,
        activityTitle: longest.title,
        date: longest.startTime,
        icon: 'mountain',
      },
      {
        id: 'fastest_pace',
        title: 'Fastest Pace',
        value: fastestPace
          ? `${Math.floor(fastestPace.averagePaceSec / 60)}:${(fastestPace.averagePaceSec % 60) < 10 ? '0' : ''}${Math.floor(fastestPace.averagePaceSec % 60)} /km`
          : '--:--',
        activityTitle: fastestPace?.title || 'None',
        date: fastestPace?.startTime,
        icon: 'zap',
      },
      {
        id: 'longest_time',
        title: 'Longest Duration',
        value: `${Math.floor(longestDuration.durationSec / 60)} mins`,
        activityTitle: longestDuration.title,
        date: longestDuration.startTime,
        icon: 'clock',
      },
      {
        id: 'highest_climb',
        title: 'Most Elevation',
        value: `${Math.round(highestElevation.elevationGainM)} m`,
        activityTitle: highestElevation.title,
        date: highestElevation.startTime,
        icon: 'trending-up',
      },
      {
        id: 'max_speed',
        title: 'Max Speed',
        value: `${highestSpeed.maxSpeedKmh.toFixed(1)} km/h`,
        activityTitle: highestSpeed.title,
        date: highestSpeed.startTime,
        icon: 'gauge',
      },
    ];

    res.json({ records });
  } catch (error: any) {
    console.error('Personal records error:', error);
    res.status(500).json({ error: 'Failed to retrieve personal records.' });
  }
}

export async function deleteAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    // Cascade deletes user and all associated records (Profile, Activities, Points, etc.)
    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'Account and all associated athlete data permanently deleted.' });
  } catch (error: any) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
}
