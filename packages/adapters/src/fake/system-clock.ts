import { Clock } from "../ports";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
  isoNow(): string {
    return new Date().toISOString();
  }
}

export class FakeClock implements Clock {
  private currentTime: Date;

  constructor(initialTime: Date = new Date("2025-01-01T00:00:00Z")) {
    this.currentTime = initialTime;
  }

  now(): Date {
    return this.currentTime;
  }

  isoNow(): string {
    return this.currentTime.toISOString();
  }

  advance(ms: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + ms);
  }

  setTo(date: Date): void {
    this.currentTime = date;
  }
}