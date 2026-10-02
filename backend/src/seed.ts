import bcrypt from 'bcryptjs';
import { prisma } from './utils/prisma';

async function seed() {
  console.log('🌱 Seeding STRIDE database...');

  // 1. Achievements
  const achievements = [
    {
      code: 'FIRST_STRIDE',
      title: 'First Stride',
      description: 'Recorded your very first activity on STRIDE.',
      category: 'MILESTONE',
      icon: 'zap',
      xpReward: 100,
      criteriaType: 'ACTIVITY_COUNT',
      criteriaValue: 1,
    },
    {
      code: 'DIST_5K',
      title: '5K Conqueror',
      description: 'Completed a 5 km activity in a single session.',
      category: 'DISTANCE',
      icon: 'award',
      xpReward: 150,
      criteriaType: 'SINGLE_DISTANCE',
      criteriaValue: 5.0,
    },
    {
      code: 'DIST_10K',
      title: '10K Beast',
      description: 'Crushed a 10 km distance in one stride.',
      category: 'DISTANCE',
      icon: 'flame',
      xpReward: 300,
      criteriaType: 'SINGLE_DISTANCE',
      criteriaValue: 10.0,
    },
    {
      code: 'DIST_21K',
      title: 'Half Marathon Stride',
      description: 'Completed 21.1 km in a single epic session.',
      category: 'DISTANCE',
      icon: 'medal',
      xpReward: 600,
      criteriaType: 'SINGLE_DISTANCE',
      criteriaValue: 21.1,
    },
    {
      code: 'STREAK_7',
      title: 'Consistency King',
      description: 'Maintained a 7-day daily activity streak.',
      category: 'STREAK',
      icon: 'sparkles',
      xpReward: 250,
      criteriaType: 'STREAK_DAYS',
      criteriaValue: 7,
    },
    {
      code: 'TOTAL_100K',
      title: 'Century Club',
      description: 'Accumulated over 100 km of total distance on STRIDE.',
      category: 'DISTANCE',
      icon: 'trophy',
      xpReward: 500,
      criteriaType: 'TOTAL_DISTANCE',
      criteriaValue: 100,
    },
    {
      code: 'SPEED_DEMON',
      title: 'Speed Demon',
      description: 'Clocked an average pace below 4:30 min/km over at least 3km.',
      category: 'SPEED',
      icon: 'gauge',
      xpReward: 200,
      criteriaType: 'FAST_PACE',
      criteriaValue: 270, // 270 sec = 4:30
    },
  ];

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      update: ach,
      create: ach,
    });
  }
  console.log(`✅ Seeded ${achievements.length} achievements.`);

  // 2. Challenges
  const challenges = [
    {
      code: 'MONTHLY_50K',
      title: '50K March Endurance Blitz',
      description: 'Cover 50 km total across running, walking, or cycling this month.',
      category: 'DISTANCE',
      targetValue: 50.0,
      targetUnit: 'KM',
      startDate: new Date('2025-03-01T00:00:00Z'),
      endDate: new Date('2025-03-31T23:59:59Z'),
      xpReward: 750,
      badgeIcon: 'flame',
    },
    {
      code: 'WEEKLY_CONSISTENCY',
      title: '5-Day Habit Builder',
      description: 'Log at least one activity on 5 different days this week.',
      category: 'CONSISTENCY',
      targetValue: 5.0,
      targetUnit: 'DAYS',
      startDate: new Date('2025-03-24T00:00:00Z'),
      endDate: new Date('2025-03-30T23:59:59Z'),
      xpReward: 350,
      badgeIcon: 'sparkles',
    },
    {
      code: 'WEEKEND_10K',
      title: 'Weekend 10K Push',
      description: 'Complete 10 km in a single session over the weekend.',
      category: 'DISTANCE',
      targetValue: 10.0,
      targetUnit: 'KM',
      startDate: new Date('2025-03-29T00:00:00Z'),
      endDate: new Date('2025-03-30T23:59:59Z'),
      xpReward: 400,
      badgeIcon: 'zap',
    },
  ];

  for (const ch of challenges) {
    await prisma.challenge.upsert({
      where: { code: ch.code },
      update: ch,
      create: ch,
    });
  }
  console.log(`✅ Seeded ${challenges.length} active challenges.`);
  console.log('🎉 Database seeding completed with zero fake accounts.');
}

seed()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
