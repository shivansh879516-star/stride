import { Request, Response } from 'express';
import { prisma } from '../../utils/prisma';
import { AuthRequest } from '../../middleware/auth';
import crypto from 'crypto';

// In-memory active live location cache for live sharing sessions
const activeLiveSessions: Map<
  string,
  {
    userId: string;
    username: string;
    latitude: number;
    longitude: number;
    speed: number;
    activityType: string;
    updatedAt: Date;
    expiresAt: Date;
  }
> = new Map();

export async function getSafetyOverview(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const contacts = await prisma.safetyContact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Find any existing active share session for this user
    let userShareToken: string | null = null;
    const now = new Date();
    for (const [token, session] of activeLiveSessions.entries()) {
      if (session.userId === userId && session.expiresAt > now) {
        userShareToken = token;
        break;
      }
    }

    res.json({
      contacts,
      activeShareToken: userShareToken,
      hasEmergencyContacts: contacts.length > 0,
    });
  } catch (error: any) {
    console.error('Get safety overview error:', error);
    res.status(500).json({ error: 'Failed to retrieve safety data.' });
  }
}

export async function addSafetyContact(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { name, phone, email, relationship, notifyOnEmergency = true } = req.body;
    if (!name || (!phone && !email)) {
      res.status(400).json({ error: 'Name and either a phone number or email are required.' });
      return;
    }

    const contact = await prisma.safetyContact.create({
      data: {
        userId,
        name,
        phone: phone || '',
        email: email || null,
        relationship: relationship || 'Emergency Contact',
        notifyOnEmergency: Boolean(notifyOnEmergency),
      },
    });

    res.status(201).json({ message: 'Safety contact saved successfully.', contact });
  } catch (error: any) {
    console.error('Add safety contact error:', error);
    res.status(500).json({ error: 'Failed to save safety contact.' });
  }
}

export async function deleteSafetyContact(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const id = String(req.params.id);

    const contact = await prisma.safetyContact.findUnique({ where: { id } });
    if (!contact || contact.userId !== userId) {
      res.status(404).json({ error: 'Contact not found or unauthorized.' });
      return;
    }

    await prisma.safetyContact.delete({ where: { id } });
    res.json({ message: 'Safety contact removed.' });
  } catch (error: any) {
    console.error('Delete safety contact error:', error);
    res.status(500).json({ error: 'Failed to delete safety contact.' });
  }
}

export async function generateLiveShare(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const username = req.user?.username || 'Athlete';
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { durationHours = 4, activityType = 'RUN' } = req.body;
    const shareToken = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + Math.min(24, Math.max(1, durationHours)));

    activeLiveSessions.set(shareToken, {
      userId,
      username,
      latitude: 0,
      longitude: 0,
      speed: 0,
      activityType,
      updatedAt: new Date(),
      expiresAt,
    });

    res.json({
      message: 'Live tracking link created.',
      shareToken,
      expiresAt,
      shareUrl: `/live-safety/${shareToken}`,
    });
  } catch (error: any) {
    console.error('Generate live share error:', error);
    res.status(500).json({ error: 'Failed to generate live tracking link.' });
  }
}

export async function updateLiveLocation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { shareToken, latitude, longitude, speed } = req.body;

    if (!shareToken || latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'Missing coordinates or shareToken.' });
      return;
    }

    const session = activeLiveSessions.get(shareToken);
    if (!session || session.userId !== userId) {
      res.status(404).json({ error: 'Live session not found or expired.' });
      return;
    }

    session.latitude = parseFloat(latitude);
    session.longitude = parseFloat(longitude);
    session.speed = speed ? parseFloat(speed) : 0;
    session.updatedAt = new Date();

    res.json({ status: 'ok', updatedAt: session.updatedAt });
  } catch (error: any) {
    console.error('Update live location error:', error);
    res.status(500).json({ error: 'Failed to update live coordinates.' });
  }
}

export async function getLiveLocationPublic(req: Request, res: Response): Promise<void> {
  try {
    const shareToken = String(req.params.shareToken);
    const session = activeLiveSessions.get(shareToken);

    if (!session) {
      res.status(404).json({ error: 'Live tracking link has expired or does not exist.' });
      return;
    }

    if (new Date() > session.expiresAt) {
      activeLiveSessions.delete(shareToken);
      res.status(410).json({ error: 'This live tracking session has expired.' });
      return;
    }

    res.json({
      athleteName: session.username,
      activityType: session.activityType,
      latitude: session.latitude,
      longitude: session.longitude,
      speed: session.speed,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
    });
  } catch (error: any) {
    console.error('Get live location public error:', error);
    res.status(500).json({ error: 'Failed to load live tracking stream.' });
  }
}
