import { escapeHtml } from '@/utils/sanitize';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

let convexClient: ConvexHttpClient | null = null;
if (import.meta.env.VITE_CONVEX_URL) {
  convexClient = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);
}

export class ApiSettingsPanel {
  private container: HTMLElement;
  private apiKeys: Array<{ _id: Id<"apiKeys">, name: string, key: string, createdAt: number, isActive: boolean }> = [];
  private webhooks: Array<{ _id: Id<"webhooks">, url: string, secret: string, events: string[], isActive: boolean, createdAt: number }> = [];
  
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'api-settings-panel';
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public async render(): Promise<void> {
    if (!convexClient) {
      this.container.innerHTML = `
        <div class="api-settings-error">
          <p>Convex client not initialized. Ensure VITE_CONVEX_URL is set.</p>
        </div>
      `;
      return;
    }

    try {
      this.container.innerHTML = `<div class="api-settings-loading">Loading API configuration...</div>`;
      
      this.apiKeys = await convexClient.query(api.apikeys.list);
      this.webhooks = await convexClient.query(api.webhooks.list);
      
      this.renderContent();
    } catch (err) {
      console.error('Failed to load API settings:', err);
      this.container.innerHTML = `
        <div class="api-settings-error">
          <p>Failed to load API settings. Please try again later.</p>
        </div>
      `;
    }
  }

  private renderContent(): void {
    let html = `
      <div class="api-settings-section">
        <div class="api-settings-header">
          <h3>API Keys</h3>
          <button class="api-btn-primary" id="btnCreateApiKey">Generate New Key</button>
        </div>
        <p class="api-settings-desc">Manage API keys used to authenticate against the World Monitor API.</p>
        <div class="api-keys-list">
    `;

    if (this.apiKeys.length === 0) {
      html += `<div class="api-empty-state">No API keys generated yet.</div>`;
    } else {
      for (const key of this.apiKeys) {
        html += `
          <div class="api-key-item ${!key.isActive ? 'inactive' : ''}">
            <div class="api-key-info">
              <span class="api-key-name">${escapeHtml(key.name)}</span>
              <code class="api-key-value" title="Click to copy" data-key="${escapeHtml(key.key)}">
                ${key.key.substring(0, 8)}...${key.key.substring(key.key.length - 4)}
              </code>
            </div>
            <div class="api-key-actions">
              <span class="api-key-date">${new Date(key.createdAt).toLocaleDateString()}</span>
              ${key.isActive ? 
                `<button class="api-btn-danger btn-revoke-key" data-id="${key._id}">Revoke</button>` : 
                `<span class="api-badge-revoked">Revoked</span>`
              }
            </div>
          </div>
        `;
      }
    }
    html += `</div></div>`;

    // Webhooks Section
    html += `
      <div class="api-settings-section">
        <div class="api-settings-header">
          <h3>Webhooks</h3>
          <button class="api-btn-primary" id="btnCreateWebhook">Add Webhook</button>
        </div>
        <p class="api-settings-desc">Subscribe to real-time events. Webhooks are sent as POST requests with an HMAC-SHA256 signature.</p>
        <div class="webhooks-list">
    `;

    if (this.webhooks.length === 0) {
      html += `<div class="api-empty-state">No webhooks configured.</div>`;
    } else {
      for (const hook of this.webhooks) {
        html += `
          <div class="webhook-item ${!hook.isActive ? 'inactive' : ''}">
            <div class="webhook-info">
              <div class="webhook-url">${escapeHtml(hook.url)}</div>
              <div class="webhook-events">
                ${hook.events.map(e => `<span class="webhook-event-badge">${escapeHtml(e)}</span>`).join('')}
              </div>
            </div>
            <div class="webhook-actions">
              <label class="ai-flow-switch" title="Toggle active status">
                <input type="checkbox" class="toggle-webhook" data-id="${hook._id}" ${hook.isActive ? 'checked' : ''}>
                <span class="ai-flow-slider"></span>
              </label>
              <button class="api-btn-danger btn-remove-webhook" data-id="${hook._id}">Remove</button>
            </div>
          </div>
        `;
      }
    }
    
    html += `</div></div>`;

    // Documentation Link
    html += `
      <div class="api-settings-footer">
        <a href="/docs/PUBLIC_API.md" target="_blank" class="api-docs-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          View API Documentation
        </a>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    // API Keys
    const btnCreateKey = this.container.querySelector('#btnCreateApiKey');
    if (btnCreateKey) {
      btnCreateKey.addEventListener('click', () => this.handleCreateApiKey());
    }

    const revokeBtns = this.container.querySelectorAll('.btn-revoke-key');
    revokeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id as Id<"apiKeys">;
        this.handleRevokeApiKey(id);
      });
    });

    const keyValues = this.container.querySelectorAll('.api-key-value');
    keyValues.forEach(el => {
      el.addEventListener('click', (e) => {
        const key = (e.currentTarget as HTMLElement).dataset.key;
        if (key) {
          navigator.clipboard.writeText(key).then(() => {
            const originalTitle = el.getAttribute('title');
            el.setAttribute('title', 'Copied!');
            setTimeout(() => el.setAttribute('title', originalTitle!), 2000);
          });
        }
      });
    });

    // Webhooks
    const btnCreateWebhook = this.container.querySelector('#btnCreateWebhook');
    if (btnCreateWebhook) {
      btnCreateWebhook.addEventListener('click', () => this.handleCreateWebhook());
    }

    const removeBtns = this.container.querySelectorAll('.btn-remove-webhook');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id as Id<"webhooks">;
        this.handleRemoveWebhook(id);
      });
    });

    const toggles = this.container.querySelectorAll('.toggle-webhook');
    toggles.forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const input = e.currentTarget as HTMLInputElement;
        const id = input.dataset.id as Id<"webhooks">;
        this.handleToggleWebhook(id, input.checked);
      });
    });
  }

  private async handleCreateApiKey(): Promise<void> {
    const name = prompt('Enter a name for this API key:');
    if (!name || !name.trim()) return;

    if (!convexClient) return;

    try {
      const keyStr = await convexClient.mutation(api.apikeys.create, { name: name.trim() });
      alert(`API Key generated:\n\n${keyStr}\n\nPlease copy this now. You won't be able to see it again.`);
      await this.render();
    } catch (err) {
      console.error('Failed to create API key:', err);
      alert('Failed to create API key. See console for details.');
    }
  }

  private async handleRevokeApiKey(id: Id<"apiKeys">): Promise<void> {
    if (!confirm('Are you sure you want to revoke this API key? Any applications using it will immediately lose access.')) {
      return;
    }

    if (!convexClient) return;

    try {
      await convexClient.mutation(api.apikeys.revoke, { id });
      await this.render();
    } catch (err) {
      console.error('Failed to revoke API key:', err);
      alert('Failed to revoke API key.');
    }
  }

  private async handleCreateWebhook(): Promise<void> {
    const url = prompt('Enter the Webhook URL:');
    if (!url || !url.trim() || !url.startsWith('http')) {
      alert('Please enter a valid HTTP(S) URL.');
      return;
    }

    const eventsStr = prompt('Enter a comma-separated list of events to subscribe to (e.g. intelligence, conflict, cyber):', 'intelligence, cyber');
    if (!eventsStr) return;

    const events = eventsStr.split(',').map(e => e.trim()).filter(e => e.length > 0);
    if (events.length === 0) return;

    if (!convexClient) return;

    try {
      const secret = await convexClient.mutation(api.webhooks.create, { url: url.trim(), events });
      alert(`Webhook created successfully!\n\nYour secret for verifying signatures is:\n${secret}\n\nPlease save this secret securely.`);
      await this.render();
    } catch (err) {
      console.error('Failed to create webhook:', err);
      alert('Failed to create webhook. See console for details.');
    }
  }

  private async handleRemoveWebhook(id: Id<"webhooks">): Promise<void> {
    if (!confirm('Are you sure you want to completely remove this webhook?')) {
      return;
    }

    if (!convexClient) return;

    try {
      await convexClient.mutation(api.webhooks.remove, { id });
      await this.render();
    } catch (err) {
      console.error('Failed to remove webhook:', err);
      alert('Failed to remove webhook.');
    }
  }

  private async handleToggleWebhook(id: Id<"webhooks">, isActive: boolean): Promise<void> {
    if (!convexClient) return;
    try {
      await convexClient.mutation(api.webhooks.toggleActive, { id, isActive });
      // Minor UX edge case where checkbox flips back if render is slow, but convex manages optimistic updates well
    } catch (err) {
      console.error('Failed to toggle webhook:', err);
      alert('Failed to update webhook status.');
      // Re-render UI to revert the checkbox
      await this.render();
    }
  }
}
