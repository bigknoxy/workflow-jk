import { NotificationProvider } from "../ports";

export class FakeNotificationProvider implements NotificationProvider {
  private notifications: Array<{ userId: string; type: string; payload: unknown; timestamp: Date }> = [];

  async notify(userId: string, type: string, payload: unknown): Promise<void> {
    this.notifications.push({ userId, type, payload, timestamp: new Date() });
  }

  getNotifications() { return [...this.notifications]; }
  clear() { this.notifications = []; }
}