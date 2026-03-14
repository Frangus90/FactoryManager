import React, { useState, useRef, useEffect } from 'react';
import { useRcon } from '../hooks/useRcon';
import { useProfile } from '../context/ProfileContext';

export default function RconConsole() {
  const { activeProfile } = useProfile();
  const {
    rconStatus,
    history,
    connect,
    disconnect,
    send,
    clearHistory,
    getPreviousCommand,
    getNextCommand,
  } = useRcon();

  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('');
  const [password, setPassword] = useState('');
  const [input, setInput] = useState('');

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isConnected = rconStatus === 'connected';
  const isConnecting = rconStatus === 'connecting';

  const QUICK_COMMANDS = [
    { label: 'Players', command: '/players' },
    { label: 'Time', command: '/time' },
    { label: 'Evolution', command: '/evolution' },
    { label: 'Seed', command: '/seed' },
    { label: 'Save', command: '/server-save' },
  ];

  // Populate port and password from active profile when it changes
  useEffect(() => {
    if (activeProfile) {
      setPort(String(activeProfile.rconPort));
      setPassword(activeProfile.rconPassword);
    }
  }, [activeProfile]);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const handleConnect = async () => {
    try {
      await connect(host, Number(port), password);
    } catch (err) {
      // Connection error is reflected in rconStatus
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err) {
      // Disconnect error is reflected in rconStatus
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !isConnected) return;
    setInput('');
    try {
      await send(trimmed);
    } catch (err) {
      // Send errors are shown in the response
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = getPreviousCommand();
      if (prev !== null) setInput(prev);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = getNextCommand();
      if (next !== null) setInput(next);
    }
  };

  const statusColor: Record<string, string> = {
    disconnected: 'bg-gray-500',
    connecting: 'bg-yellow-500',
    connected: 'bg-green-500',
    error: 'bg-red-500',
  };

  const statusLabel: Record<string, string> = {
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    connected: 'Connected',
    error: 'Error',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with connection status */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-factorio-text">RCON Console</h2>
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${statusColor[rconStatus]} ${
              isConnecting ? 'animate-pulse' : ''
            }`}
          />
          <span className="text-sm font-medium text-factorio-muted">
            {statusLabel[rconStatus]}
          </span>
        </div>
      </div>

      {/* Connection form when disconnected */}
      {!isConnected && (
        <div className="card mb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label">Host</label>
              <input
                type="text"
                className="input w-40"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                disabled={isConnecting}
                placeholder="127.0.0.1"
              />
            </div>
            <div>
              <label className="label">Port</label>
              <input
                type="number"
                className="input w-28"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                disabled={isConnecting}
                placeholder="27015"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input w-44"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isConnecting}
                placeholder="RCON password"
              />
            </div>
            <button
              className="btn-primary"
              onClick={handleConnect}
              disabled={isConnecting || !port || !password}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {/* Disconnect button when connected */}
      {isConnected && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-factorio-muted">
            Connected to {host}:{port}
          </span>
          <button className="btn-danger" onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
      )}

      {/* Quick commands */}
      {isConnected && (
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_COMMANDS.map((qc) => (
            <button
              key={qc.command}
              className="btn-secondary text-xs !px-2.5 !py-1"
              onClick={() => send(qc.command)}
            >
              {qc.label}
            </button>
          ))}
        </div>
      )}

      {/* Output area */}
      <div
        ref={outputRef}
        className="flex-1 min-h-0 overflow-y-auto bg-factorio-darker border border-factorio-border p-4 font-mono text-sm mb-4"
      >
        {history.length === 0 ? (
          <p className="text-factorio-muted italic">
            {isConnected
              ? 'Type a command below and press Enter.'
              : 'Connect to the RCON server to begin.'}
          </p>
        ) : (
          history.map((entry, idx) => (
            <div key={idx} className="mb-2">
              <div className="text-factorio-orange">
                &gt; /{entry.command.replace(/^\//, '')}
              </div>
              {entry.response && (
                <div className="text-factorio-text whitespace-pre-wrap pl-2">
                  {entry.response}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          className="input flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!isConnected}
          placeholder={isConnected ? 'Enter command...' : 'Not connected'}
        />
        <button
          className="btn-primary"
          onClick={handleSend}
          disabled={!isConnected || !input.trim()}
        >
          Send
        </button>
        <button
          className="btn-secondary"
          onClick={clearHistory}
          disabled={history.length === 0}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
