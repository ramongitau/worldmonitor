import type { AlertRule, AlertEvent, AlertTriggerType } from '@/types/alerts';
import { NotificationService } from './notification-service';
import { generateId, loadFromStorage, saveToStorage } from '@/utils';
// AppContext imported removed
import type { OrefAlert } from '@/services/oref-alerts';
import type { NewsItem } from '@/types';
import type { CountryScore } from '@/services/country-instability';

const ALERTS_STORAGE_KEY = 'wm-alert-rules-v1';

let cachedRules: AlertRule[] | null = null;
const cooldownMap = new Map<string, number>();

/**
 * Get all configured alert rules
 */
export function getAlertRules(): AlertRule[] {
  if (cachedRules) return cachedRules;
  cachedRules = loadFromStorage<AlertRule[]>(ALERTS_STORAGE_KEY, []);
  return cachedRules;
}

/**
 * Add or update an alert rule
 */
export function saveAlertRule(rule: Partial<AlertRule> & { name: string, trigger: AlertTriggerType }): AlertRule {
  const rules = getAlertRules();
  const existingIndex = rules.findIndex(r => r.id === rule.id);
  
  const newRule: AlertRule = {
    id: rule.id || generateId(),
    enabled: rule.enabled ?? true,
    channels: rule.channels || ['browser_push'],
    conditions: rule.conditions || {},
    cooldownMs: rule.cooldownMs || 15 * 60 * 1000, // Default 15 min cooldown
    ...rule
  } as AlertRule;

  if (existingIndex >= 0) {
    rules[existingIndex] = newRule;
  } else {
    rules.push(newRule);
  }

  cachedRules = rules;
  saveToStorage(ALERTS_STORAGE_KEY, rules);
  return newRule;
}

/**
 * Delete an alert rule
 */
export function deleteAlertRule(id: string): void {
  const rules = getAlertRules();
  cachedRules = rules.filter(r => r.id !== id);
  saveToStorage(ALERTS_STORAGE_KEY, cachedRules);
  
  // Clean up cooldowns for this rule
  for (const key of cooldownMap.keys()) {
    if (key.startsWith(`${id}:`)) {
      cooldownMap.delete(key);
    }
  }
}

/**
 * Check if a rule is on cooldown for a specific target
 */
function isRuleOnCooldown(ruleId: string, targetKey: string, cooldownMs: number): boolean {
  const key = `${ruleId}:${targetKey}`;
  const lastFired = cooldownMap.get(key);
  if (!lastFired) return false;
  
  return (Date.now() - lastFired) < cooldownMs;
}

/**
 * Mark a rule as fired for a specific target
 */
function setRuleCooldown(ruleId: string, targetKey: string): void {
  // Prune old cooldowns periodically
  if (cooldownMap.size > 1000) {
    const now = Date.now();
    for (const [k, ts] of cooldownMap) {
      if (now - ts > 24 * 60 * 60 * 1000) cooldownMap.delete(k); // remove > 24h
    }
  }
  
  cooldownMap.set(`${ruleId}:${targetKey}`, Date.now());
}

/**
 * Evaluate Country Instability Index (CII) thresholds
 */
export async function evaluateCiiAlerts(scores: CountryScore[]): Promise<void> {
  const rules = getAlertRules().filter(r => r.enabled && r.trigger === 'cii_threshold');
  if (rules.length === 0) return;

  for (const rule of rules) {
    const targetCountry = rule.conditions.country;
    const threshold = rule.conditions.threshold;
    const operator = rule.conditions.operator || '>';
    
    // Check all countries if targetCountry is '*' or check specific
    const targetsToCheck = targetCountry === '*' || !targetCountry ? scores : scores.filter(s => s.code === targetCountry);
    
    for (const scoreObj of targetsToCheck) {
      const iso = scoreObj.code;
      const score = scoreObj.score;
      if (score === null) continue;
      
      let isTriggered = false;
      if (operator === '>') isTriggered = score > threshold;
      else if (operator === '>=') isTriggered = score >= threshold;
      else if (operator === '<') isTriggered = score < threshold;
      else if (operator === '<=') isTriggered = score <= threshold;

      if (isTriggered) {
        if (isRuleOnCooldown(rule.id, iso, rule.cooldownMs)) continue;
        
        const event: AlertEvent = {
          id: generateId(),
          ruleId: rule.id,
          title: `CII Alert: ${iso} crossed ${threshold}`,
          body: `Country Instability Index for ${iso} is currently at ${score.toFixed(1)}`,
          timestamp: new Date(),
          data: { iso, score, threshold }
        };
        
        await NotificationService.dispatch(rule, event);
        setRuleCooldown(rule.id, iso);
      }
    }
  }
}

/**
 * Evaluate Keyword occurrences in the News stream
 */
export async function evaluateKeywordAlerts(items: NewsItem[]): Promise<void> {
  const rules = getAlertRules().filter(r => r.enabled && r.trigger === 'keyword_match');
  if (rules.length === 0 || items.length === 0) return;

  for (const rule of rules) {
    const keyword = rule.conditions.keyword?.toLowerCase();
    if (!keyword) continue;

    for (const item of items) {
      // Only check relatively recent items (last 1 hour to avoid firing on old data on full reload)
      if (Date.now() - item.pubDate.getTime() > 60 * 60 * 1000) continue;

      const titleLower = item.title.toLowerCase();
      if (titleLower.includes(keyword)) {
        // Use the news item's link or title hash as the target key (to avoid firing twice for the exact same article)
        const targetKey = item.link || item.title;
        
        if (isRuleOnCooldown(rule.id, targetKey, rule.cooldownMs)) continue;
        
        const event: AlertEvent = {
          id: generateId(),
          ruleId: rule.id,
          title: `Keyword Alert: "${keyword}"`,
          body: item.title,
          timestamp: new Date(),
          data: item
        };
        
        await NotificationService.dispatch(rule, event);
        setRuleCooldown(rule.id, targetKey);
      }
    }
  }
}

/**
 * Evaluate OREF Siren events
 */
export async function evaluateOrefAlerts(alerts: OrefAlert[]): Promise<void> {
  const rules = getAlertRules().filter(r => r.enabled && r.trigger === 'oref_siren');
  if (rules.length === 0 || alerts.length === 0) return;

  for (const rule of rules) {
    const targetArea = rule.conditions.area?.toLowerCase(); // optional specific area

    for (const alert of alerts) {
      // Create a composite key to dedupe exact alerts within cooldown
      const alertKey = alert.id || `${alert.cat}|${alert.title}|${alert.alertDate}`;
      
      if (targetArea) {
        // Check if any location matches the target area
        const locations = alert.data.map(d => d.toLowerCase());
        const hasMatch = locations.some(loc => loc.includes(targetArea));
        if (!hasMatch) continue;
      }
      
      if (isRuleOnCooldown(rule.id, alertKey, rule.cooldownMs)) continue;

      const event: AlertEvent = {
        id: generateId(),
        ruleId: rule.id,
        title: alert.title || 'Siren Alert',
        body: alert.data.join(', '),
        timestamp: new Date(),
        data: alert
      };
      
      await NotificationService.dispatch(rule, event);
    }
  }
}

/**
 * Auto-creates a default test rule if no rules exist.
 * Called during application initialization.
 */
export function initializeDefaultRules(): void {
  const rules = getAlertRules();
  if (rules.length > 0) return;

  saveAlertRule({
    name: "High Global Instability Monitor",
    trigger: "cii_threshold",
    conditions: { country: "*", threshold: 65 },
    channels: ["browser_push"],
    enabled: true
  });
  
  saveAlertRule({
    name: "Cyber Attack Watch",
    trigger: "keyword_match",
    conditions: { keyword: "cyber" },
    channels: ["browser_push"],
    enabled: true
  });

  console.log('[AlertEngine] Initialized default alert rules');
}
