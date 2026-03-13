import React, { useState, useEffect, useRef, useMemo, useCallback, type MouseEvent } from 'react';
import type { LogEntry } from '../../shared/types';
import { useLogs } from '../hooks/useLogs';

const COPY_LINE_COUNT = 50;

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return [
    d.getHours().toString().padStart(2, '0'),
    d.getMinutes().toString().padStart(2, '0'),
    d.getSeconds().toString().padStart(2, '0'),
  ].join(':');
}

export default function LogViewer() {
  const { logs, clearLogs } = useLogs();
  const [autoScroll, setAutoScroll] = useState(true);
  const [search, setSearch] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ---- Filtered logs ----
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const term = search.toLowerCase();
    return logs.filter((entry) => entry.text.toLowerCase().includes(term));
  }, [logs, search]);

  // ---- Auto-scroll on new logs ----
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [filteredLogs.length, autoScroll]);

  // ---- Detect manual scroll to pause auto-scroll ----
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32;

    // Only auto-resume when user scrolls back to the bottom
    if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  }, [autoScroll]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [],
  );

  const toggleAutoScroll = useCallback(() => {
    setAutoScroll((prev) => !prev);
  }, []);

  const [copyLabel, setCopyLabel] = useState('Copy Last 50');

  const handleCopyLogs = useCallback(async () => {
    const source = search.trim() ? filteredLogs : logs;
    const tail = source.slice(-COPY_LINE_COUNT);
    const text = tail
      .map((e) => `[${formatTimestamp(e.timestamp)}] ${e.text}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy Last 50'), 2000);
    } catch {
      // Fallback should never be needed in Electron, but just in case
    }
  }, [logs, filteredLogs, search]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold text-factorio-text">Logs</h2>
        <span className="text-sm text-factorio-muted">
          {filteredLogs.length}
          {search.trim() ? ` / ${logs.length}` : ''} line
          {filteredLogs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-factorio-muted pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
          <input
            type="text"
            className="input w-full pl-9"
            placeholder="Filter logs..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        {/* Auto-scroll toggle */}
        <button
          className={autoScroll ? 'btn-primary' : 'btn-secondary'}
          onClick={toggleAutoScroll}
        >
          Auto-scroll
        </button>

        {/* Copy last 50 lines */}
        <button
          className="btn-secondary"
          onClick={handleCopyLogs}
          disabled={logs.length === 0}
        >
          {copyLabel}
        </button>

        {/* Clear */}
        <button className="btn-danger" onClick={clearLogs}>
          Clear
        </button>
      </div>

      {/* Log container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 bg-factorio-darker border border-factorio-border rounded p-3 overflow-y-auto font-mono text-xs leading-relaxed select-text"
      >
        {filteredLogs.length === 0 ? (
          <p className="text-factorio-muted italic">
            {search.trim()
              ? 'No log lines match the current filter.'
              : 'No log output yet.'}
          </p>
        ) : (
          filteredLogs.map((entry: LogEntry, i: number) => (
            <div key={i} className="flex gap-2 whitespace-pre-wrap break-all">
              <span className="text-factorio-muted shrink-0 select-none">
                {formatTimestamp(entry.timestamp)}
              </span>
              <span
                className={
                  entry.stream === 'stderr'
                    ? 'text-red-400'
                    : 'text-factorio-text'
                }
              >
                {entry.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
