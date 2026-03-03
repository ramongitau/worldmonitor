import { getAlertRules, saveAlertRule, deleteAlertRule } from '@/services/alert-engine';
import { NotificationService } from '@/services/notification-service';
import type { AlertTriggerType } from '@/types/alerts';
import { escapeHtml } from '@/utils/sanitize';

export class AlertSettingsPanel {
  private container: HTMLElement;

  constructor(container?: HTMLElement) {
    this.container = container || document.createElement('div');
    if (!container) {
      this.container.className = 'alert-settings-panel';
    }
    
    // Bind event delegation for the panel
    this.container.addEventListener('click', this.handleClick.bind(this));
    this.container.addEventListener('change', this.handleChange.bind(this));
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public render(): void {
    const rules = getAlertRules();
    
    let html = `
      <div class="us-status-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div class="us-status-section-title">Notification Permissions</div>
        </div>
        <div class="status-row">
          <button id="btn-req-browser" class="ai-flow-cta-link" style="padding: 4px 8px; font-size: 0.9em;">Request Browser Push</button>
          <button id="btn-req-desktop" class="ai-flow-cta-link" style="padding: 4px 8px; font-size: 0.9em; margin-left: 8px;">Request Desktop Push</button>
        </div>
      </div>
      
      <div class="us-status-section" style="margin-top: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div class="us-status-section-title">Active Alert Rules</div>
          <button id="btn-add-rule" class="sources-select-all" style="padding: 4px 8px;">+ Add Rule</button>
        </div>
    `;

    if (rules.length === 0) {
      html += `<div style="padding:16px;color:var(--text-dim)">No alert rules configured. Ensure permissions are granted before adding alerts.</div>`;
    } else {
      for (const rule of rules) {
        let conditionText = '';
        if (rule.trigger === 'cii_threshold') conditionText = `CII > ${rule.conditions.threshold} for ${rule.conditions.country || 'Global'}`;
        else if (rule.trigger === 'keyword_match') conditionText = `Keyword: "${rule.conditions.keyword}"`;
        else if (rule.trigger === 'oref_siren') conditionText = `OREF sirens${rule.conditions.area ? ` in ${rule.conditions.area}` : ''}`;
        
        html += `
          <div class="status-row" role="listitem" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 12px;">
            <div style="flex: 1;">
              <div style="font-weight: 500; font-size: 1.1em; margin-bottom: 4px;">${escapeHtml(rule.name)}</div>
              <div style="font-size: 0.9em; color: var(--text-dim); margin-bottom: 4px;">Trigger: ${rule.trigger} | ${conditionText}</div>
              <div style="font-size: 0.8em; color: var(--text-dim);">Channels: ${rule.channels.join(', ')}</div>
            </div>
            
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
               <label class="ai-flow-switch" aria-label="Toggle ${escapeHtml(rule.name)}">
                <input type="checkbox" class="toggle-rule" data-id="${rule.id}" ${rule.enabled ? 'checked' : ''} aria-checked="${rule.enabled}">
                <span class="ai-flow-slider"></span>
              </label>
              <button class="delete-rule" data-id="${rule.id}" aria-label="Delete ${escapeHtml(rule.name)}" style="background: transparent; border: none; color: #ff4444; cursor: pointer; font-size: 0.9em;">[Delete]</button>
            </div>
          </div>
        `;
      }
    }
    html += `</div>`;
    
    // Add rule modal logic
    html += `
      <div id="add-rule-form" style="display: none; border: 1px solid var(--border); padding: 16px; border-radius: 8px; margin-top: 16px; background: rgba(0,0,0,0.1);">
        <h3>Create New Rule</h3>
        <div style="margin-bottom: 12px;">
          <label style="display:block; margin-bottom: 4px; font-size: 0.9em;">Rule Name</label>
          <input type="text" id="new-rule-name" placeholder="E.g., High CII Alert" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-hover); color: var(--text);">
        </div>
        
        <div style="margin-bottom: 12px;">
          <label style="display:block; margin-bottom: 4px; font-size: 0.9em;">Trigger Type</label>
          <select id="new-rule-trigger" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-hover); color: var(--text);">
            <option value="cii_threshold">CII Threshold</option>
            <option value="keyword_match">Breaking News Keyword</option>
            <option value="oref_siren">OREF Siren</option>
          </select>
        </div>
        
        <div id="cfg-cii" class="cfg-section" style="margin-bottom: 12px;">
          <label style="display:block; margin-bottom: 4px; font-size: 0.9em;">Country Code (ISO 2-letter or * for all)</label>
          <input type="text" id="cfg-cii-country" placeholder="*" value="*" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-hover); color: var(--text);">
          <label style="display:block; margin-top: 8px; margin-bottom: 4px; font-size: 0.9em;">Score Threshold</label>
          <input type="number" id="cfg-cii-threshold" placeholder="70" value="70" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-hover); color: var(--text);">
        </div>
        
        <div id="cfg-keyword" class="cfg-section" style="display: none; margin-bottom: 12px;">
          <label style="display:block; margin-bottom: 4px; font-size: 0.9em;">Keyword Pattern</label>
          <input type="text" id="cfg-keyword-val" placeholder="cyberattack" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-hover); color: var(--text);">
        </div>
        
        <div id="cfg-oref" class="cfg-section" style="display: none; margin-bottom: 12px;">
          <label style="display:block; margin-bottom: 4px; font-size: 0.9em;">Target Area (Optional)</label>
          <input type="text" id="cfg-oref-area" placeholder="Tel Aviv" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-hover); color: var(--text);">
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display:block; margin-bottom: 4px; font-size: 0.9em;">Delivery Channels</label>
          <label><input type="checkbox" id="chk-browser" checked> Browser Push</label><br>
          <label><input type="checkbox" id="chk-desktop"> Desktop Native</label>
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="btn-cancel-rule" style="padding: 6px 12px; background: var(--bg-hover); border: 1px solid var(--border); color: var(--text); border-radius: 4px; cursor: pointer;">Cancel</button>
          <button id="btn-save-rule" style="padding: 6px 12px; background: var(--accent); border: none; color: white; border-radius: 4px; cursor: pointer;">Save Rule</button>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  private async handleClick(e: MouseEvent): Promise<void> {
    const target = e.target as HTMLElement;

    if (target.id === 'btn-req-browser') {
      await NotificationService.requestPermission('browser_push');
      alert('Browser notification permission requested.');
      return;
    }

    if (target.id === 'btn-req-desktop') {
      await NotificationService.requestPermission('desktop_native');
      alert('Desktop notification permission requested.');
      return;
    }

    if (target.id === 'btn-add-rule') {
      const form = this.container.querySelector('#add-rule-form') as HTMLElement;
      if (form) form.style.display = 'block';
      target.style.display = 'none';
      return;
    }

    if (target.id === 'btn-cancel-rule') {
      const form = this.container.querySelector('#add-rule-form') as HTMLElement;
      if (form) form.style.display = 'none';
      const btnAdd = this.container.querySelector('#btn-add-rule') as HTMLElement;
      if (btnAdd) btnAdd.style.display = 'block';
      return;
    }

    if (target.id === 'btn-save-rule') {
      const name = (this.container.querySelector('#new-rule-name') as HTMLInputElement)?.value;
      const trigger = (this.container.querySelector('#new-rule-trigger') as HTMLSelectElement)?.value as AlertTriggerType;
      const enableBrowser = (this.container.querySelector('#chk-browser') as HTMLInputElement)?.checked;
      const enableDesktop = (this.container.querySelector('#chk-desktop') as HTMLInputElement)?.checked;
      
      const channels: ('browser_push' | 'desktop_native' | 'webhook')[] = [];
      if (enableBrowser) channels.push('browser_push');
      if (enableDesktop) channels.push('desktop_native');
      
      const conditions: Record<string, string | number | undefined> = {};
      if (trigger === 'cii_threshold') {
        conditions.country = (this.container.querySelector('#cfg-cii-country') as HTMLInputElement)?.value;
        conditions.threshold = parseFloat((this.container.querySelector('#cfg-cii-threshold') as HTMLInputElement)?.value || '70');
      } else if (trigger === 'keyword_match') {
        conditions.keyword = (this.container.querySelector('#cfg-keyword-val') as HTMLInputElement)?.value;
      } else if (trigger === 'oref_siren') {
        conditions.area = (this.container.querySelector('#cfg-oref-area') as HTMLInputElement)?.value;
      }
      
      if (name && channels.length > 0) {
        saveAlertRule({ name, trigger, conditions, channels, enabled: true });
        this.render();
      } else {
        alert('Please provide a rule name and select at least one channel.');
      }
      return;
    }

    if (target.classList.contains('delete-rule')) {
      const id = target.dataset.id;
      if (id) {
        deleteAlertRule(id);
        this.render();
      }
      return;
    }
  }

  private handleChange(e: Event): void {
    const target = e.target as HTMLElement;

    if (target.id === 'new-rule-trigger') {
      const val = (target as HTMLSelectElement).value;
      this.container.querySelectorAll('.cfg-section').forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });
      const section = this.container.querySelector(`#cfg-${val.split('_')[0]}`);
      if (section) (section as HTMLElement).style.display = 'block';
      return;
    }

    if (target.classList.contains('toggle-rule')) {
      const id = target.dataset.id;
      const checked = (target as HTMLInputElement).checked;
      if (id) {
        const rules = getAlertRules();
        const rule = rules.find(r => r.id === id);
        if (rule) {
          rule.enabled = checked;
          saveAlertRule(rule);
        }
      }
    }
  }
}
