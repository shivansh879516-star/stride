/**
 * STRIDE API Client & Offline Sync Engine
 */

export const API_BASE =
  ((import.meta as any).env?.VITE_API_URL as string) ||
  ((import.meta as any).env?.PROD ||
  (typeof window !== 'undefined' && (window as any).Capacitor !== undefined)
    ? 'https://stride-backendd.onrender.com/api'
    : '/api');

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  bio: string;
  avatarUrl: string;
  city: string;
  country: string;
  heightCm: number;
  weightKg: number;
  level: number;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  weeklyGoalKm: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  profile?: UserProfile;
}

export interface ActivitySummary {
  id: string;
  userId: string;
  title: string;
  description?: string;
  activityType: 'RUN' | 'WALK' | 'JOG' | 'CYCLE' | 'HIKE';
  startTime: string;
  endTime: string;
  durationSec: number;
  movingDurationSec: number;
  distanceMeters: number;
  averagePaceSec: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  calories: number;
  elevationGainM: number;
  elevationLossM: number;
  visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
  points?: Array<{ latitude: number; longitude: number; sequenceOrder: number }>;
  statistics?: {
    splitsJson?: string;
  };
}

export interface AchievementItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  xpReward: number;
  criteriaType: string;
  criteriaValue: number;
  unlocked: boolean;
}

export interface ChallengeItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  targetUnit: string;
  startDate: string;
  endDate: string;
  xpReward: number;
  badgeIcon: string;
  isJoined: boolean;
  progress: number;
  isCompleted: boolean;
}

// Token handling
export const getToken = (): string | null => localStorage.getItem('stride_auth_token');
export const setToken = (token: string) => localStorage.setItem('stride_auth_token', token);
export const removeToken = () => localStorage.removeItem('stride_auth_token');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const rawText = await response.text();

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const data = JSON.parse(rawText);
      errorMsg = data.error || data.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new Error('Server connection error. Please try again.');
  }
}

export const api = {
  // Auth
  register: (body: any) => request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request<{ user: User }>('/auth/me'),

  // Activities
  getActivities: (params?: { type?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.type) q.append('type', params.type);
    if (params?.limit) q.append('limit', params.limit.toString());
    return request<{ activities: ActivitySummary[] }>(`/activities?${q.toString()}`);
  },
  getActivityById: (id: string) => request<{ activity: any }>(`/activities/${id}`),
  createActivity: (body: any) => request<{ activity: any; earnedXp: number; unlockedAchievements: any[] }>('/activities', { method: 'POST', body: JSON.stringify(body) }),
  deleteActivity: (id: string) => request<{ message: string }>(`/activities/${id}`, { method: 'DELETE' }),
  syncOfflineActivities: (activities: any[]) => request<{ results: any[] }>('/activities/sync', { method: 'POST', body: JSON.stringify({ activities }) }),

  // User Profile & Analytics
  getProfile: () => request<{ profile: UserProfile; weekly: any; allTime: any }>('/users/profile'),
  updateProfile: (data: Partial<UserProfile>) => request<{ profile: UserProfile }>('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getAnalytics: (timeframe: 'weekly' | 'monthly' | 'yearly') => request<any>(`/users/analytics?timeframe=${timeframe}`),
  getPersonalRecords: () => request<{ records: any[] }>('/users/records'),
  deleteAccount: () => request<{ message: string }>('/users/account', { method: 'DELETE' }),

  // Gamification
  getAchievements: () => request<{ achievements: AchievementItem[] }>('/gamification/achievements'),
  getChallenges: () => request<{ challenges: ChallengeItem[] }>('/gamification/challenges'),
  joinChallenge: (challengeId: string) => request<any>('/gamification/challenges/join', { method: 'POST', body: JSON.stringify({ challengeId }) }),
  getLeaderboard: (type: 'distance' | 'xp') => request<{ leaderboard: any[] }>(`/gamification/leaderboard?type=${type}`),

  // Privacy
  getPrivacySettings: () => request<{ settings: any; zones: any[] }>('/privacy'),
  updatePrivacySettings: (data: any) => request<{ settings: any }>('/privacy', { method: 'PUT', body: JSON.stringify(data) }),
  addPrivacyZone: (data: any) => request<{ zone: any }>('/privacy/zones', { method: 'POST', body: JSON.stringify(data) }),
  deletePrivacyZone: (id: string) => request<any>(`/privacy/zones/${id}`, { method: 'DELETE' }),

  // Safety
  getSafetyOverview: () => request<{ contacts: any[]; activeShareToken: string | null; hasEmergencyContacts: boolean }>('/safety'),
  addSafetyContact: (data: any) => request<{ contact: any }>('/safety/contacts', { method: 'POST', body: JSON.stringify(data) }),
  deleteSafetyContact: (id: string) => request<any>(`/safety/contacts/${id}`, { method: 'DELETE' }),
  generateLiveShare: (data?: any) => request<{ shareToken: string; expiresAt: string; shareUrl: string }>('/safety/live-share', { method: 'POST', body: JSON.stringify(data || {}) }),
  updateLiveLocation: (data: any) => request<any>('/safety/live-update', { method: 'POST', body: JSON.stringify(data) }),

  // Routes
  getRoutes: (activityType?: string) => request<{ routes: any[] }>(`/routes${activityType ? `?activityType=${activityType}` : ''}`),
  getRouteById: (id: string) => request<{ route: any }>(`/routes/${id}`),
  createRoute: (body: any) => request<{ route: any }>('/routes', { method: 'POST', body: JSON.stringify(body) }),

  // Notifications
  getNotifications: () => request<{ notifications: any[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request<any>('/notifications/read-all', { method: 'PUT' }),
};

// Offline Activity Queue Management
export const offlineStorage = {
  getQueue: (): any[] => {
    try {
      const q = localStorage.getItem('stride_offline_queue');
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  },
  enqueue: (activity: any) => {
    const q = offlineStorage.getQueue();
    q.push(activity);
    localStorage.setItem('stride_offline_queue', JSON.stringify(q));
  },
  clear: () => {
    localStorage.removeItem('stride_offline_queue');
  },
};
