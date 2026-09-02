import { MatchResult } from './stats.model';
import { StakeKey } from './stake.utils';

export type ModEventType = 'run_started' | 'run_finished';

export interface ModRunEvent {
  runId: string;
  eventType: ModEventType;
  timestamp: string;
  deck: string;
  stake: StakeKey;
  result?: MatchResult;
}

export interface ParsedModDump {
  events: ModRunEvent[];
  errors: string[];
}

export interface ModImportResult {
  imported: number;
  skipped: number;
  currentUpdated: boolean;
}
