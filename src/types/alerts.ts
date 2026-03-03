export type AlertTriggerType = 'cii_threshold' | 'keyword_match' | 'geo_convergence' | 'oref_siren';

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AlertTriggerType;
  /**
   * Conditions specific to the trigger type.
   * e.g., { country: 'IR', threshold: 75, condition: '>' }
   * e.g., { keyword: 'cyberattack' }
   */
  conditions: Record<string, any>;
  channels: ('browser_push' | 'desktop_native' | 'webhook')[];
  webhookUrl?: string; // Required if 'webhook' is in channels
  cooldownMs: number; // Time to wait before firing again for the same rule/target
}

export interface AlertEvent {
  id: string; // Unique ID for the specific event instance
  ruleId: string;
  title: string;
  body: string;
  timestamp: Date;
  data?: any; // Raw event data (e.g., the news item or CII reading)
}
