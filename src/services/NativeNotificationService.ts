let NativeNotificationModule: any = null;

try {
  const RN = require('react-native');
  NativeNotificationModule = RN.NativeModules?.NativeNotificationModule || null;
} catch (e) {
  NativeNotificationModule = null;
}

export class NativeNotificationService {
  private static instance: NativeNotificationService;

  private constructor() {}

  public static getInstance(): NativeNotificationService {
    if (!NativeNotificationService.instance) {
      NativeNotificationService.instance = new NativeNotificationService();
    }
    return NativeNotificationService.instance;
  }

  public async showInstantNotification(title: string, body: string): Promise<number> {
    if (NativeNotificationModule?.showInstantNotification) {
      return await NativeNotificationModule.showInstantNotification(title, body);
    }
    console.log(`[NotificationService] Simulated instant notification: ${title} - ${body}`);
    return 101;
  }

  public async scheduleMedicationReminder(
    reminderId: string,
    title: string,
    body: string,
    hour: number,
    minute: number
  ): Promise<boolean> {
    if (NativeNotificationModule?.scheduleMedicationReminder) {
      return await NativeNotificationModule.scheduleMedicationReminder(
        reminderId,
        title,
        body,
        hour,
        minute
      );
    }
    console.log(`[NotificationService] Simulated schedule reminder: ${reminderId} at ${hour}:${minute}`);
    return true;
  }

  public async cancelReminder(reminderId: string): Promise<boolean> {
    if (NativeNotificationModule?.cancelReminder) {
      return await NativeNotificationModule.cancelReminder(reminderId);
    }
    return true;
  }

  public async getScheduledReminders(): Promise<string[]> {
    if (NativeNotificationModule?.getScheduledReminders) {
      return await NativeNotificationModule.getScheduledReminders();
    }
    return [];
  }
}
