import { Panel } from './Panel';
import { escapeHtml } from '@/utils/sanitize';
import { t } from '@/services/i18n';
import type { ArchivedEvent, GetEventArchiveRequest } from '@/generated/server/worldmonitor/intelligence/v1/service_server';

export class EventArchivePanel extends Panel {
  private events: ArchivedEvent[] = [];
  private currentTypes: string[] = [];
  private startAt: number = Date.now() - 7 * 24 * 60 * 60 * 1000; // Default 7d
  private endAt: number = Date.now();
  private isLoading: boolean = false;

  constructor() {
    super({
      id: 'event-archive',
      title: t('panels.eventArchive') || 'Event Archive',
      showCount: true,
      trackActivity: true,
      infoTooltip: t('components.eventArchive.infoTooltip') || 'Historical cross-domain events',
    });
    this.fetchEvents();
  }

  public async fetchEvents(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;
    this.showLoading(t('common.loadingArchive') || 'Loading archive...');

    try {
      const request: GetEventArchiveRequest = {
        startAt: this.startAt,
        endAt: this.endAt,
        countryCode: '',
        eventTypes: this.currentTypes,
        limit: 100,
        offset: 0
      };

      const response = await fetch('/api/intelligence/v1/get-event-archive', {
        method: 'POST', // Gateway supports POST
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.events = data.events || [];
      this.setCount(this.events.length);
      this.renderContent();
    } catch (err) {
      console.error('[Archive] Fetch error:', err);
      this.setContent(`<div class="panel-error">${t('common.errorLoadingArchive') || 'Failed to load archive'}</div>`);
    } finally {
      this.isLoading = false;
    }
  }

  private renderContent(): void {
    if (this.events.length === 0) {
      this.setContent(`<div class="panel-empty">${t('common.noEventsFound') || 'No historical events found'}</div>`);
      return;
    }

    const rows = this.events.map(event => {
      const date = new Date(event.occurredAt).toLocaleString();
      let details = '';
      const typeLabel = event.type.toUpperCase();
      let colorClass = 'archive-type-default';

      if (event.conflict) {
        details = `${escapeHtml(event.conflict.sideA)} vs ${escapeHtml(event.conflict.sideB)} (${event.conflict.deathsBest} deaths)`;
        colorClass = 'archive-type-conflict';
      } else if (event.unrest) {
        details = escapeHtml(event.unrest.title);
        colorClass = 'archive-type-unrest';
      } else if (event.earthquake) {
        details = `M${event.earthquake.magnitude} - ${escapeHtml(event.earthquake.place)}`;
        colorClass = 'archive-type-seismology';
      } else if ((event as any).maritime) {
        // Handle AisDisruption (though not in proto yet, we added it to implementation)
        // Note: Field names might vary if proto was updated
        const m = (event as any).maritime;
        details = `${escapeHtml(m.name)}: ${escapeHtml(m.description || m.type)}`;
        colorClass = 'archive-type-maritime';
      }

      return `
        <tr class="archive-row">
          <td class="archive-type"><span class="archive-badge ${colorClass}">${typeLabel}</span></td>
          <td class="archive-date">${date}</td>
          <td class="archive-details">${details}</td>
        </tr>
      `;
    }).join('');

    this.setContent(`
      <div class="archive-panel-content">
        <table class="archive-table">
          <thead>
            <tr>
              <th>${t('common.type') || 'Type'}</th>
              <th>${t('common.date') || 'Date'}</th>
              <th>${t('common.details') || 'Details'}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `);
  }
}
