export interface LogEntry {
  timestamp: string;
  user: string;
  action: string;
  module: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  details: Record<string, any>;
}

export interface LogFilters {
  user?: string;
  action?: string;
  module?: string;
  level?: string;
}
