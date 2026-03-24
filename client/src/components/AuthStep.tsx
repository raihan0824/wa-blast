import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

interface AuthStepProps {
  socket: Socket;
  onNext: () => void;
}

export function AuthStep({ socket, onNext }: AuthStepProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [contactsSynced, setContactsSynced] = useState(0);
  const [contactsBuffered, setContactsBuffered] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    socket.emit('connect-wa');

    const onQr = (url: string) => {
      setQrUrl(url);
      setError(null);
    };
    const onStatus = (s: string) => {
      setStatus(s);
      if (s !== 'error') setError(null);
    };
    const onError = (msg: string) => setError(msg);
    const onContactsCount = (data: { synced: number; buffered: number }) => {
      setContactsSynced(data.synced);
      setContactsBuffered(data.buffered);
      setSyncing(false);
    };

    socket.on('qr', onQr);
    socket.on('status', onStatus);
    socket.on('wa:error', onError);
    socket.on('contacts:count', onContactsCount);

    // Request current count in case we missed the initial emit
    socket.emit('get-contacts-count');

    return () => {
      socket.off('qr', onQr);
      socket.off('status', onStatus);
      socket.off('wa:error', onError);
      socket.off('contacts:count', onContactsCount);
    };
  }, [socket]);

  const isConnected = status === 'connected';
  const isError = status === 'error';

  const handleRetry = () => {
    setError(null);
    setQrUrl(null);
    setStatus('disconnected');
    socket.emit('connect-wa');
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-gray-500">Scan the QR code with your WhatsApp to get started</p>

      <div className="w-72 h-72 border border-gray-200 rounded-xl flex items-center justify-center bg-white shadow-sm">
        {isConnected ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-700 font-semibold text-lg">Connected</p>
            <p className="text-green-600/70 text-sm mt-1">WhatsApp is ready</p>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-gray-500 text-sm">
                {contactsSynced > 0
                  ? `${contactsSynced.toLocaleString()} contacts synced`
                  : 'No contacts synced yet'}
                {contactsBuffered > 0 && (
                  <span className="text-green-600 ml-1">
                    ({contactsBuffered.toLocaleString()} available)
                  </span>
                )}
              </p>
              <button
                onClick={() => {
                  setSyncing(true);
                  socket.emit('sync-contacts');
                }}
                disabled={syncing || contactsBuffered === 0}
                className="mt-2 px-4 py-1.5 bg-green-100 text-green-700 text-sm rounded-lg font-medium hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {syncing ? 'Syncing...' : contactsBuffered > 0
                  ? `Sync ${contactsBuffered.toLocaleString()} Contacts`
                  : 'Waiting for contacts...'}
              </button>
            </div>
          </div>
        ) : isError ? (
          <div className="text-center px-4">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            </div>
            <p className="text-red-600 font-medium text-sm mb-1">Connection failed</p>
            <p className="text-gray-400 text-xs leading-relaxed">{error || 'Unable to connect to WhatsApp'}</p>
          </div>
        ) : qrUrl ? (
          <img src={qrUrl} alt="WhatsApp QR Code" className="w-64 h-64 rounded-lg" />
        ) : (
          <div className="text-center">
            <div className="w-44 h-44 mx-auto mb-4 rounded-lg bg-gray-100 relative overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                  animation: 'shimmer 1.8s ease-in-out infinite',
                }}
              />
              <style>{`
                @keyframes shimmer {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
                }
              `}</style>
            </div>
            <p className="text-sm text-gray-400 font-medium">Generating QR code...</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {isError && (
          <button
            onClick={handleRetry}
            className="px-6 py-2.5 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-colors"
          >
            Try Again
          </button>
        )}
        {isConnected && (
          <button
            onClick={onNext}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Next →
          </button>
        )}
        {isConnected && (
          <button
            onClick={() => socket.emit('disconnect-wa')}
            className="px-6 py-2.5 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
