import { Injectable } from '@angular/core';
import { ModRunEvent, ParsedModDump } from '../models/mod-events.model';
import { normalizeStake } from '../../utils/stake.utils';

@Injectable({ providedIn: 'root' })
export class ModEventsService {
  parseJsonLines(input: string): ParsedModDump {
    const events: ModRunEvent[] = [];
    const errors: string[] = [];

    const lines = input.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!line) {
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        errors.push(`Line ${index + 1}: invalid JSON`);
        continue;
      }

      const event = this.toEvent(parsed, index + 1);
      if (typeof event === 'string') {
        errors.push(event);
        continue;
      }

      events.push(event);
    }

    events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return { events, errors };
  }

  private toEvent(value: unknown, lineNumber: number): ModRunEvent | string {
    if (!value || typeof value !== 'object') {
      return `Line ${lineNumber}: event must be an object`;
    }

    const raw = value as Record<string, unknown>;
    const runId = typeof raw['run_id'] === 'string' ? raw['run_id'].trim() : '';
    const eventType = typeof raw['event_type'] === 'string' ? raw['event_type'].trim() : '';
    const timestamp = typeof raw['timestamp'] === 'string' ? raw['timestamp'].trim() : '';
    const deck = typeof raw['deck'] === 'string' ? raw['deck'].trim() : '';

    if (!runId) {
      return `Line ${lineNumber}: missing run_id`;
    }
    if (eventType !== 'run_started' && eventType !== 'run_finished') {
      return `Line ${lineNumber}: event_type must be run_started or run_finished`;
    }
    if (!timestamp || Number.isNaN(Date.parse(timestamp))) {
      return `Line ${lineNumber}: invalid timestamp`;
    }
    if (!deck) {
      return `Line ${lineNumber}: missing deck`;
    }

    const stake = normalizeStake(raw['stake']);

    if (eventType === 'run_finished') {
      const result = typeof raw['result'] === 'string' ? raw['result'].trim().toLowerCase() : '';
      if (result !== 'win' && result !== 'loss') {
        return `Line ${lineNumber}: result must be win or loss for run_finished`;
      }

      return {
        runId,
        eventType,
        timestamp,
        deck,
        stake,
        result
      };
    }

    return {
      runId,
      eventType,
      timestamp,
      deck,
      stake
    };
  }
}
