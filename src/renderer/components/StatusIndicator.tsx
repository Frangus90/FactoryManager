import React from 'react';
import type { ServerStatus } from '../../shared/types';

const STATUS_CONFIG: Record<ServerStatus, { color: string; label: string; pulse: boolean }> = {
  stopped: { color: 'bg-gray-500', label: 'Stopped', pulse: false },
  starting: { color: 'bg-yellow-500', label: 'Starting', pulse: true },
  running: { color: 'bg-green-500', label: 'Running', pulse: false },
  stopping: { color: 'bg-yellow-500', label: 'Stopping', pulse: true },
  errored: { color: 'bg-red-500', label: 'Error', pulse: false },
};

interface Props {
  status: ServerStatus;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusIndicator({ status, size = 'md' }: Props) {
  const config = STATUS_CONFIG[status];
  const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  return (
    <div className="flex items-center gap-2">
      <span className={`${dotSize} rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span className={`${textSize} font-medium`}>{config.label}</span>
    </div>
  );
}
