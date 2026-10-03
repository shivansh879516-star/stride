import { registerPlugin } from '@capacitor/core';

export interface StepData {
  steps: number;
  goal: number;
  distanceKm: number;
  calories: number;
  activeMinutes: number;
  hasHardwareSensor: boolean;
  isLive: boolean;
}

interface NativeStepPlugin {
  getTodaySteps(): Promise<{
    steps: number;
    hasSensor: boolean;
    distanceKm: number;
    calories: number;
    date: string;
  }>;
  checkSensor(): Promise<{ hasSensor: boolean }>;
}

const NativeStepCounter = registerPlugin<NativeStepPlugin>('StepCounter');

class StepTrackerService {
  private dailyGoal = 10000;
  private currentSteps = 0;
  private hasHardwareSensor = false;
  private listeners: Array<(data: StepData) => void> = [];
  private pollInterval: any = null;
  private motionMagnitudeHistory: number[] = [];
  private lastStepTimestamp = 0;

  constructor() {
    this.init();
  }

  private init() {
    // 1. Read cached steps for today from localStorage
    try {
      const todayKey = new Date().toISOString().split('T')[0];
      const savedDate = localStorage.getItem('stride_steps_date');
      const savedSteps = localStorage.getItem('stride_steps_count');
      const savedGoal = localStorage.getItem('stride_daily_step_goal');

      if (savedGoal) {
        this.dailyGoal = parseInt(savedGoal, 10) || 10000;
      }

      if (savedDate === todayKey && savedSteps) {
        this.currentSteps = parseInt(savedSteps, 10) || 0;
      } else if (savedDate !== todayKey) {
        // New day
        this.currentSteps = 0;
        localStorage.setItem('stride_steps_date', todayKey);
        localStorage.setItem('stride_steps_count', '0');
      }
    } catch {}

    // 2. Poll Native Hardware Step Counter every 3 seconds
    this.syncNativeSteps();
    this.pollInterval = setInterval(() => {
      this.syncNativeSteps();
    }, 3500);

    // 3. Fallback Web Motion Step Sensor (when active in hand/pocket)
    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', this.handleDeviceMotion, { passive: true });
    }
  }

  public async syncNativeSteps(): Promise<StepData> {
    try {
      const res = await NativeStepCounter.getTodaySteps();
      if (res && typeof res.steps === 'number') {
        this.hasHardwareSensor = !!res.hasSensor;
        // Hardware sensor takes precedence if greater
        if (res.steps >= this.currentSteps || res.hasSensor) {
          this.currentSteps = res.steps;
          this.persistSteps();
        }
      }
    } catch {
      // Running in browser or native plugin not yet attached
    }

    const data = this.getSnapshot();
    this.notifyListeners(data);
    return data;
  }

  private handleDeviceMotion = (e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    this.motionMagnitudeHistory.push(mag);
    if (this.motionMagnitudeHistory.length > 5) {
      this.motionMagnitudeHistory.shift();
    }

    // Step detection: peak acceleration threshold ~11.8 m/s^2 (above normal 9.8g) with min 320ms refractory period
    const now = Date.now();
    if (mag > 12.2 && (now - this.lastStepTimestamp) > 340) {
      this.lastStepTimestamp = now;
      this.currentSteps += 1;
      this.persistSteps();
      this.notifyListeners(this.getSnapshot());
    }
  };

  private persistSteps() {
    try {
      const todayKey = new Date().toISOString().split('T')[0];
      localStorage.setItem('stride_steps_date', todayKey);
      localStorage.setItem('stride_steps_count', String(this.currentSteps));
    } catch {}
  }

  public getSnapshot(): StepData {
    const distanceKm = Math.round(this.currentSteps * 0.00076 * 100) / 100;
    const calories = Math.round(this.currentSteps * 0.04);
    const activeMinutes = Math.round(this.currentSteps / 110);

    return {
      steps: this.currentSteps,
      goal: this.dailyGoal,
      distanceKm,
      calories,
      activeMinutes,
      hasHardwareSensor: this.hasHardwareSensor,
      isLive: true,
    };
  }

  public subscribe(cb: (data: StepData) => void): () => void {
    this.listeners.push(cb);
    cb(this.getSnapshot());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners(data: StepData) {
    this.listeners.forEach((cb) => {
      try {
        cb(data);
      } catch {}
    });
  }

  public setDailyGoal(goal: number) {
    this.dailyGoal = goal;
    try {
      localStorage.setItem('stride_daily_step_goal', String(goal));
    } catch {}
    this.notifyListeners(this.getSnapshot());
  }

  public addManualSteps(n: number) {
    this.currentSteps += n;
    this.persistSteps();
    this.notifyListeners(this.getSnapshot());
  }
}

export const stepTracker = new StepTrackerService();
