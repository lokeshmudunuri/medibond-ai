import { NativeNotificationService } from './NativeNotificationService';
import { MedicineEntity } from '../types';

export interface ScheduledReminderEntry {
  id: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  timeSlot: string; // e.g., '09:00', '21:00', '10:00', '22:00'
  displayTime: string; // e.g. '9:00 AM'
  isActive: boolean;
}

export class MedicationReminderService {
  private static instance: MedicationReminderService;
  private notificationService = NativeNotificationService.getInstance();
  private scheduledReminders: Map<string, ScheduledReminderEntry> = new Map();

  public static readonly ALLOWED_TIME_SLOTS = [
    { slot: '09:00', display: '9:00 AM', hour: 9, minute: 0 },
    { slot: '21:00', display: '9:00 PM', hour: 21, minute: 0 },
    { slot: '10:00', display: '10:00 AM', hour: 10, minute: 0 },
    { slot: '22:00', display: '10:00 PM', hour: 22, minute: 0 },
  ];

  private constructor() {}

  public static getInstance(): MedicationReminderService {
    if (!MedicationReminderService.instance) {
      MedicationReminderService.instance = new MedicationReminderService();
    }
    return MedicationReminderService.instance;
  }

  /**
   * Schedules a confirmed medication reminder for a specific time slot
   */
  public async scheduleReminderForMedicine(
    medicine: MedicineEntity,
    timeSlot: string
  ): Promise<ScheduledReminderEntry> {
    if (!medicine.isConfirmedByUser) {
      throw new Error('Cannot schedule reminder for unconfirmed medication. Please verify with patient first.');
    }

    const slotInfo = MedicationReminderService.ALLOWED_TIME_SLOTS.find((s) => s.slot === timeSlot) || {
      slot: timeSlot,
      display: timeSlot,
      hour: parseInt(timeSlot.split(':')[0], 10) || 9,
      minute: parseInt(timeSlot.split(':')[1], 10) || 0,
    };

    const reminderId = `rem_${medicine.id}_${slotInfo.slot.replace(':', '')}`;
    const title = `Medication Reminder: ${medicine.name}`;
    const body = `Take ${medicine.dosage} as prescribed (${medicine.timing}).`;

    await this.notificationService.scheduleMedicationReminder(
      reminderId,
      title,
      body,
      slotInfo.hour,
      slotInfo.minute
    );

    const entry: ScheduledReminderEntry = {
      id: reminderId,
      medicineId: medicine.id,
      medicineName: medicine.name,
      dosage: medicine.dosage,
      timeSlot: slotInfo.slot,
      displayTime: slotInfo.display,
      isActive: true,
    };

    this.scheduledReminders.set(reminderId, entry);
    return entry;
  }

  public async cancelReminder(reminderId: string): Promise<boolean> {
    await this.notificationService.cancelReminder(reminderId);
    return this.scheduledReminders.delete(reminderId);
  }

  public getRemindersForMedicine(medicineId: string): ScheduledReminderEntry[] {
    return Array.from(this.scheduledReminders.values()).filter((r) => r.medicineId === medicineId);
  }

  public getAllReminders(): ScheduledReminderEntry[] {
    return Array.from(this.scheduledReminders.values());
  }
}
