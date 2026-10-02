import {
  haversineDistanceMeters,
  calculateTotalDistanceMeters,
  formatPace,
  computeSplits,
  applyPrivacyMask,
} from '../utils/geo';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('🧪 Starting STRIDE Automated Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Geodesic & GPS calculations
  console.log('📌 Test Suite 1: Geodesic & GPS Engine');
  // Distance between SF (37.7749, -122.4194) and Oakland (37.8044, -122.2712) is ~13.5 km
  const dist = haversineDistanceMeters(37.7749, -122.4194, 37.8044, -122.2712);
  assert(dist > 13000 && dist < 14000, `Haversine SF-Oakland distance (~13.5km, got ${(dist / 1000).toFixed(2)}km)`);

  const paceStr = formatPace(300); // 300s = 5:00 min/km
  assert(paceStr === '5:00 /km', `Format pace 300 sec -> "5:00 /km" (got "${paceStr}")`);

  const paceStr2 = formatPace(325); // 325s = 5:25 min/km
  assert(paceStr2 === '5:25 /km', `Format pace 325 sec -> "5:25 /km" (got "${paceStr2}")`);

  // 2. Splits Computation
  console.log('\n📌 Test Suite 2: Kilometer Splits Engine');
  // Synthetic trackpoints for a 2.5 km run
  const testTrack = [];
  const startT = new Date('2025-01-01T10:00:00Z');
  // Approx 0.009 degrees latitude is ~1 km
  for (let i = 0; i <= 25; i++) {
    testTrack.push({
      latitude: 37.0 + i * (0.009 / 10),
      longitude: -122.0,
      altitude: 10 + i * 2,
      timestamp: new Date(startT.getTime() + i * 30 * 1000),
    });
  }
  const splits = computeSplits(testTrack);
  assert(splits.length >= 2, `Computed ${splits.length} splits for 2.5km track`);
  assert(splits[0].splitNumber === 1, `Split 1 has splitNumber 1`);
  assert(splits[0].paceFormatted.includes('/km'), `Split 1 pace formatted correctly`);

  // 3. Privacy Masking
  console.log('\n📌 Test Suite 3: Privacy Zone Masking');
  const points = [
    { latitude: 37.7749, longitude: -122.4194, timestamp: new Date() }, // Start (Home)
    { latitude: 37.7800, longitude: -122.4150, timestamp: new Date() }, // Middle
    { latitude: 37.7850, longitude: -122.4100, timestamp: new Date() }, // Far
    { latitude: 37.7749, longitude: -122.4194, timestamp: new Date() }, // End (Home)
  ];
  const masked = applyPrivacyMask(points, [], 200);
  assert(masked.length < points.length, `Start/End 200m masking successfully filtered out sensitive end-points`);

  // 4. Database Integrity & Authentication
  console.log('\n📌 Test Suite 4: Database & User Auth Verification');
  const user = await prisma.user.findUnique({
    where: { email: 'alex@stride.fit' },
    include: { profile: true, privacySettings: true, safetyContacts: true },
  });
  assert(!!user, `Demo user alex@stride.fit exists in database`);
  if (user) {
    const isPwValid = await bcrypt.compare('stride2025', user.passwordHash);
    assert(isPwValid, `Password hash verifies correctly with bcrypt`);
    assert(user.profile?.level !== undefined, `User has profile with level ${user.profile?.level}`);
    assert(user.safetyContacts.length > 0, `User has configured safety emergency contacts`);
  }

  // 5. Activity Recording & Gamification
  console.log('\n📌 Test Suite 5: Activity Analytics & Achievements');
  const acts = await prisma.activity.findMany({ take: 5 });
  assert(acts.length > 0, `Database contains saved activities`);
  const achs = await prisma.achievement.findMany();
  assert(achs.length >= 7, `Database contains at least 7 gamification achievements (found ${achs.length})`);
  const challenges = await prisma.challenge.findMany();
  assert(challenges.length >= 3, `Database contains active challenges (found ${challenges.length})`);

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
