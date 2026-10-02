import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../utils/prisma';
import { AuthRequest } from '../../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'stride_dev_secret_key_2025_gym_run_stride';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, username, firstName, lastName } = req.body;

    if (!email || !password || !username) {
      res.status(400).json({ error: 'Email, password, and username are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
      },
    });

    if (existing) {
      if (existing.email.toLowerCase() === email.toLowerCase()) {
        res.status(400).json({ error: 'An athlete account with this email already exists.' });
        return;
      }
      res.status(400).json({ error: 'This username is already taken. Please pick another.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        profile: {
          create: {
            firstName: firstName || '',
            lastName: lastName || '',
            bio: 'Ready to break personal records with STRIDE.',
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
            level: 1,
            xp: 50, // Welcome XP
            currentStreak: 1,
            longestStreak: 1,
            weeklyGoalKm: 20.0,
          },
        },
        privacySettings: {
          create: {
            profileVisibility: 'PUBLIC',
            activityVisibility: 'PUBLIC',
            hideStartEndRadiusM: 200,
            showMapRoute: true,
            allowLiveTracking: true,
          },
        },
      },
      include: {
        profile: true,
        privacySettings: true,
      },
    });

    // Create a welcome notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Welcome to STRIDE!',
        message: 'Your athlete profile is initialized. Lace up your shoes and record your first stride.',
        type: 'SYSTEM',
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        profile: user.profile,
        privacySettings: user.privacySettings,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create user account. Please try again.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      res.status(400).json({ error: 'Email/username and password are required.' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername.toLowerCase() },
        ],
      },
      include: {
        profile: true,
        privacySettings: true,
        safetyContacts: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials. User not found.' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        profile: user.profile,
        privacySettings: user.privacySettings,
        safetyContacts: user.safetyContacts,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        privacySettings: true,
        safetyContacts: true,
        privacyZones: true,
        _count: {
          select: {
            activities: true,
            achievements: true,
            notifications: { where: { read: false } },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        profile: user.profile,
        privacySettings: user.privacySettings,
        safetyContacts: user.safetyContacts,
        privacyZones: user.privacyZones,
        statsCount: user._count,
      },
    });
  } catch (error: any) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
}
