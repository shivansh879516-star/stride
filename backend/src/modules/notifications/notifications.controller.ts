import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { AuthRequest } from '../../middleware/auth';

export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });

    res.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
}

export async function markAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const id = String(req.params.id);

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json({ message: 'Marked as read.' });
  } catch (error: any) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
}

export async function markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    res.json({ message: 'All notifications marked as read.' });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
}

export async function deleteNotification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const id = String(req.params.id);

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }

    await prisma.notification.delete({ where: { id } });
    res.json({ message: 'Notification deleted.' });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification.' });
  }
}
