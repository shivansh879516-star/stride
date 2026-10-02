/**
 * STRIDE Local Notification Engine (100% Free, Zero Cloud Cost, GenZ & Hinglish Motivation)
 */
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface StrideNotification {
  id: number;
  title: string;
  body: string;
  hour: number;
  minute: number;
}

export const DAILY_MEME_NOTIFICATIONS: StrideNotification[] = [
  {
    id: 101,
    title: 'Bhai uth ja! 🏃‍♂️🔥',
    body: 'Subah ki taazi hawa aur 5k stride wait kar rahi hai. Bed chhod aur warm up shuru kar!',
    hour: 7,
    minute: 0,
  },
  {
    id: 102,
    title: 'Hydration & Mindset Check 💧',
    body: 'Screen chhod, paani pi athlete! Aur bata, aaj kitne km ka target set kiya hai?',
    hour: 10,
    minute: 30,
  },
  {
    id: 103,
    title: 'Afternoon Slump? Naah! 😂👟',
    body: 'Khana kha ke aalas aa raha hai na? 10 min brisk walk maar, instant dopamine boost milega!',
    hour: 14,
    minute: 0,
  },
  {
    id: 104,
    title: 'Golden Hour Stride ⚡🔥',
    body: 'Chai sutta baad me, pehle 3km ki stride maar ke aate hain! Your streak is on the line.',
    hour: 17,
    minute: 30,
  },
  {
    id: 105,
    title: 'Bed pe pade pade abs nahi bante 🦾',
    body: 'Instagram reels baad me scroll karna, pehle dinner se pehle 20 min cardio log kar lo!',
    hour: 20,
    minute: 15,
  },
  {
    id: 106,
    title: 'Leaderboard Pe Kalesh Chal Raha Hai 👀',
    body: 'Friends tumse aage nikal rahe hain! Check your weekly stats & plan tomorrow’s morning comeback.',
    hour: 22,
    minute: 30,
  },
];

export async function initLocalNotifications() {
  if (!Capacitor.isPluginAvailable('LocalNotifications')) {
    return;
  }

  try {
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    // Cancel existing scheduled daily notifications and re-schedule fresh ones
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const scheduledList = DAILY_MEME_NOTIFICATIONS.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      schedule: {
        on: {
          hour: item.hour,
          minute: item.minute,
        },
        repeats: true,
        allowWhileIdle: true,
      },
      sound: undefined,
      smallIcon: 'ic_launcher',
    }));

    await LocalNotifications.schedule({ notifications: scheduledList });
    console.log('STRIDE: 6 Daily GenZ Hinglish Notifications successfully scheduled!');
  } catch (err) {
    console.warn('STRIDE Notification Init Error:', err);
  }
}
