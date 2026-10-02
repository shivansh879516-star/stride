import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { AuthRequest } from '../../middleware/auth';

/**
 * Automatically evaluates whether any achievements are unlocked based on user's newly saved activity
 */
export async function evaluateAchievements(userId: string, activity: any): Promise<any[]> {
  const unlocked = [];

  // Get user's current unlocked achievements
  const existingUserAchievements = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  const existingIds = new Set(existingUserAchievements.map((ua) => ua.achievementId));

  // Get all achievements
  const allAchievements = await prisma.achievement.findMany();

  // Get user total stats
  const totalActivities = await prisma.activity.count({ where: { userId } });
  const totalDistanceAgg = await prisma.activity.aggregate({
    where: { userId },
    _sum: { distanceMeters: true },
  });
  const totalDistanceKm = (totalDistanceAgg._sum.distanceMeters || 0) / 1000;
  const singleDistanceKm = (activity.distanceMeters || 0) / 1000;

  const profile = await prisma.profile.findUnique({ where: { userId } });
  const streakDays = profile?.currentStreak || 1;

  for (const ach of allAchievements) {
    if (existingIds.has(ach.id)) continue;

    let shouldUnlock = false;

    switch (ach.criteriaType) {
      case 'ACTIVITY_COUNT':
        if (totalActivities >= ach.criteriaValue) shouldUnlock = true;
        break;
      case 'SINGLE_DISTANCE':
        if (singleDistanceKm >= ach.criteriaValue) shouldUnlock = true;
        break;
      case 'TOTAL_DISTANCE':
        if (totalDistanceKm >= ach.criteriaValue) shouldUnlock = true;
        break;
      case 'STREAK_DAYS':
        if (streakDays >= ach.criteriaValue) shouldUnlock = true;
        break;
      case 'FAST_PACE':
        // criteriaValue is seconds per km, so averagePaceSec <= criteriaValue
        if (
          singleDistanceKm >= 3 &&
          activity.averagePaceSec > 0 &&
          activity.averagePaceSec <= ach.criteriaValue
        ) {
          shouldUnlock = true;
        }
        break;
    }

    if (shouldUnlock) {
      const userAch = await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: ach.id,
        },
        include: { achievement: true },
      });

      // Bonus XP for achievement
      if (profile && ach.xpReward > 0) {
        await prisma.profile.update({
          where: { userId },
          data: { xp: { increment: ach.xpReward } },
        });
      }

      // Create notification
      await prisma.notification.create({
        data: {
          userId,
          title: `Achievement Unlocked: ${ach.title}!`,
          message: `${ach.description} (+${ach.xpReward} XP)`,
          type: 'ACHIEVEMENT',
          metadataJson: JSON.stringify({ achievementId: ach.id }),
        },
      });

      unlocked.push(userAch);
    }
  }

  // Also update progress on joined challenges
  const activeChallenges = await prisma.userChallenge.findMany({
    where: { userId, isCompleted: false },
    include: { challenge: true },
  });

  for (const uc of activeChallenges) {
    let addValue = 0;
    if (uc.challenge.category === 'DISTANCE') {
      addValue = singleDistanceKm;
    } else if (uc.challenge.category === 'TIME') {
      addValue = activity.durationSec / 3600; // in hours
    } else if (uc.challenge.category === 'CONSISTENCY') {
      addValue = 1;
    }

    const newProgress = uc.progress + addValue;
    const isCompleted = newProgress >= uc.challenge.targetValue;

    await prisma.userChallenge.update({
      where: { id: uc.id },
      data: {
        progress: Math.min(newProgress, uc.challenge.targetValue),
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    if (isCompleted) {
      await prisma.profile.update({
        where: { userId },
        data: { xp: { increment: uc.challenge.xpReward } },
      });

      await prisma.notification.create({
        data: {
          userId,
          title: `Challenge Completed: ${uc.challenge.title}!`,
          message: `You crushed it! Earned +${uc.challenge.xpReward} XP.`,
          type: 'CHALLENGE',
        },
      });
    }
  }

  return unlocked;
}

export async function getAchievements(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const allAchievements = await prisma.achievement.findMany({
      orderBy: { criteriaValue: 'asc' },
    });

    let unlockedSet = new Set<string>();
    if (userId) {
      const userAchs = await prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true, unlockedAt: true },
      });
      userAchs.forEach((ua) => unlockedSet.add(ua.achievementId));
    }

    const result = allAchievements.map((ach) => ({
      ...ach,
      unlocked: unlockedSet.has(ach.id),
    }));

    res.json({ achievements: result });
  } catch (error: any) {
    console.error('Get achievements error:', error);
    res.status(500).json({ error: 'Failed to retrieve achievements.' });
  }
}

export async function getChallenges(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const challenges = await prisma.challenge.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        users: userId ? { where: { userId } } : false,
      },
    });

    const formatted = challenges.map((c) => {
      const userProgress = c.users && c.users.length > 0 ? c.users[0] : null;
      return {
        id: c.id,
        code: c.code,
        title: c.title,
        description: c.description,
        category: c.category,
        targetValue: c.targetValue,
        targetUnit: c.targetUnit,
        startDate: c.startDate,
        endDate: c.endDate,
        xpReward: c.xpReward,
        badgeIcon: c.badgeIcon,
        isJoined: !!userProgress,
        progress: userProgress?.progress || 0,
        isCompleted: userProgress?.isCompleted || false,
      };
    });

    res.json({ challenges: formatted });
  } catch (error: any) {
    console.error('Get challenges error:', error);
    res.status(500).json({ error: 'Failed to load challenges.' });
  }
}

export async function joinChallenge(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { challengeId } = req.body;
    if (!userId || !challengeId) {
      res.status(400).json({ error: 'Challenge ID is required.' });
      return;
    }

    const existing = await prisma.userChallenge.findUnique({
      where: {
        userId_challengeId: { userId, challengeId },
      },
    });

    if (existing) {
      res.status(200).json({ message: 'Already joined this challenge.', userChallenge: existing });
      return;
    }

    const joined = await prisma.userChallenge.create({
      data: {
        userId,
        challengeId,
        progress: 0,
      },
    });

    res.status(201).json({ message: 'Successfully joined challenge!', userChallenge: joined });
  } catch (error: any) {
    console.error('Join challenge error:', error);
    res.status(500).json({ error: 'Failed to join challenge.' });
  }
}

export async function getLeaderboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { type = 'distance' } = req.query;

    if (type === 'xp') {
      const profiles = await prisma.profile.findMany({
        take: 25,
        orderBy: { xp: 'desc' },
        include: {
          user: {
            select: { id: true, username: true },
          },
        },
      });

      const leaderboard = profiles.map((p, idx) => ({
        rank: idx + 1,
        userId: p.userId,
        username: p.user.username,
        firstName: p.firstName,
        lastName: p.lastName,
        avatarUrl: p.avatarUrl,
        level: p.level,
        score: p.xp,
        unit: 'XP',
        streak: p.currentStreak,
      }));

      res.json({ leaderboard });
      return;
    }

    // Default: Distance leaderboard
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        activities: {
          select: { distanceMeters: true },
        },
      },
    });

    const calculated = users
      .map((u) => {
        const totalDistKm =
          u.activities.reduce((sum, act) => sum + act.distanceMeters, 0) / 1000;
        return {
          userId: u.id,
          username: u.username,
          firstName: u.profile?.firstName || '',
          lastName: u.profile?.lastName || '',
          avatarUrl: u.profile?.avatarUrl || '',
          level: u.profile?.level || 1,
          score: Math.round(totalDistKm * 10) / 10,
          unit: 'KM',
          streak: u.profile?.currentStreak || 0,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 25)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    res.json({ leaderboard: calculated });
  } catch (error: any) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to retrieve leaderboard.' });
  }
}
