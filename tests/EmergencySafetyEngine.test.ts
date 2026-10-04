import { EmergencySafetyEngine } from '../src/safety/EmergencySafetyEngine';
import { EmergencyStatus } from '../src/types/chat';

describe('EmergencySafetyEngine (Deterministic Red Flag Gating)', () => {
  test('should detect potential acute coronary emergency with chest pain', () => {
    const result = EmergencySafetyEngine.evaluateRedFlags('I have crushing chest pain radiating to left arm');
    expect(result.isEmergency).toBe(true);
    expect(result.status).toBe(EmergencyStatus.CriticalEmergency);
    expect(result.title).toContain('Cardiac Emergency');
    expect(result.immediateAction).toContain('112 / 911 / 108');
  });

  test('should detect suspected acute stroke FAST symptoms', () => {
    const result = EmergencySafetyEngine.evaluateRedFlags('My mother has sudden face drooping and slurred speech');
    expect(result.isEmergency).toBe(true);
    expect(result.status).toBe(EmergencyStatus.CriticalEmergency);
    expect(result.title).toContain('Acute Stroke');
  });

  test('should detect post-operative wound infection warning', () => {
    const result = EmergencySafetyEngine.evaluateRedFlags('My surgical wound is opening and pus leaking with fever 103');
    expect(result.isEmergency).toBe(true);
    expect(result.status).toBe(EmergencyStatus.UrgentWarning);
    expect(result.title).toContain('Surgical Site Infection');
  });

  test('should detect severe anaphylactic reaction', () => {
    const result = EmergencySafetyEngine.evaluateRedFlags('My throat swelling and difficulty swallowing hives');
    expect(result.isEmergency).toBe(true);
    expect(result.status).toBe(EmergencyStatus.CriticalEmergency);
    expect(result.immediateAction).toContain('EpiPen');
  });

  test('should return normal status for non-emergency routine question', () => {
    const result = EmergencySafetyEngine.evaluateRedFlags('When should I take my Telmisartan 40mg?');
    expect(result.isEmergency).toBe(false);
    expect(result.status).toBe(EmergencyStatus.Normal);
  });
});
