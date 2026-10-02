import { Router } from 'express';
import {
  getAchievements,
  getChallenges,
  joinChallenge,
  getLeaderboard,
} from './gamification.controller';
import { optionalAuthMiddleware, authMiddleware } from '../../middleware/auth';

const router = Router();

router.get('/achievements', optionalAuthMiddleware, getAchievements);
router.get('/challenges', optionalAuthMiddleware, getChallenges);
router.post('/challenges/join', authMiddleware, joinChallenge);
router.get('/leaderboard', optionalAuthMiddleware, getLeaderboard);

export default router;
