import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { startBlast, type Contact } from '../lib/api';

interface BlastStepProps {
  socket: Socket;
  contacts: Contact[];
  template: string;
  onReset: () => void;
}

interface BlastError {
  number: string;
  name: string;
  error: string;
}

export function BlastStep({ socket, contacts, template, onReset }: BlastStepProps) {
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: contacts.length });
  const [errors, setErrors] = useState<BlastError[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [blastError, setBlastError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const onProgress = (p: typeof progress) => setProgress(p);
    const onError = (e: BlastError) => setErrors((prev) => [...prev, e]);
    const onComplete = (p: typeof progress) => {
      setProgress(p);
      setIsComplete(true);
    };

    socket.on('blast:progress', onProgress);
    socket.on('blast:error', onError);
    socket.on('blast:complete', onComplete);

    if (!startedRef.current) {
      startedRef.current = true;
      startBlast(contacts, template).catch((err) => {
        setBlastError(err instanceof Error ? err.message : 'Failed to start blast');
      });
    }

    return () => {
      socket.off('blast:progress', onProgress);
      socket.off('blast:error', onError);
      socket.off('blast:complete', onComplete);
    };
  }, [socket, contacts, template]);

  const percent = progress.total > 0
    ? Math.round(((progress.sent + progress.failed) / progress.total) * 100)
    : 0;

  if (blastError) {
    return (
      <div className="flex flex-col items-center gap-6">
        <h2 className="text-2xl font-semibold text-red-600">Blast Failed</h2>
        <p className="text-gray-600">{blastError}</p>
        <button
          onClick={onReset}
          className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-semibold text-gray-800">
        {isComplete ? 'Blast Complete' : 'Sending Messages...'}
      </h2>

      {/* Progress bar */}
      <div className="w-full max-w-lg">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>{percent}%</span>
          <span>{progress.sent + progress.failed} / {progress.total}</span>
        </div>
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300 rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-8">
        <div className="text-center">
          <p className="text-3xl font-bold text-green-600">{progress.sent}</p>
          <p className="text-sm text-gray-500">Sent</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-red-500">{progress.failed}</p>
          <p className="text-sm text-gray-500">Failed</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-gray-600">{progress.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="w-full max-w-lg bg-red-50 border border-red-200 rounded-lg p-4 text-left max-h-48 overflow-y-auto">
          <p className="text-red-700 font-medium mb-2">Failed Messages:</p>
          <ul className="text-sm text-red-600 space-y-1">
            {errors.map((e, i) => (
              <li key={i}>
                {e.name} ({e.number}): {e.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isComplete && (
        <button
          onClick={onReset}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          New Blast
        </button>
      )}
    </div>
  );
}
