import type { Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';
import { getUser } from '../lib/auth';

const BLAST_PAGES = [
  { id: 'upload', label: 'Upload Contacts', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', requiresWA: true },
  { id: 'template', label: 'Template', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', requiresWA: true },
  { id: 'preview', label: 'Preview', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z', requiresWA: true },
  { id: 'send', label: 'Send', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8', requiresWA: true },
  { id: 'history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', requiresWA: false },
];

export type Page = 'connect' | 'upload' | 'template' | 'preview' | 'send' | 'history';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  onCollapse: () => void;
  collapsed: boolean;
  socket: Socket;
}

export function Sidebar({ currentPage, onNavigate, onLogout, onCollapse, collapsed, socket }: SidebarProps) {
  const [waStatus, setWaStatus] = useState<string>('disconnected');
  const [blastOpen, setBlastOpen] = useState(true);

  useEffect(() => {
    const onStatus = (s: string) => setWaStatus(s);
    socket.on('status', onStatus);
    return () => { socket.off('status', onStatus); };
  }, [socket]);

  const isConnected = waStatus === 'connected';

  const statusColor =
    waStatus === 'connected' ? 'bg-green-500' :
    waStatus === 'qr_pending' ? 'bg-yellow-500' :
    waStatus === 'error' ? 'bg-red-500' :
    'bg-gray-400';

  const statusLabel =
    waStatus === 'connected' ? 'Connected' :
    waStatus === 'qr_pending' ? 'Waiting for QR' :
    waStatus === 'error' ? 'Error' :
    'Disconnected';

  if (collapsed) {
    return (
      <aside className="w-16 bg-white border-r border-gray-200 flex flex-col min-h-screen items-center py-4">
        <button
          onClick={onCollapse}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors mb-4"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        <div className="flex-1 flex flex-col items-center gap-2">
          <button
            onClick={() => onNavigate('connect')}
            className={`p-2 rounded-lg transition-colors ${currentPage === 'connect' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
            title="Connect"
          >
            <span className={`block w-2 h-2 rounded-full ${statusColor}`} />
          </button>

          {BLAST_PAGES.map((p) => {
            const disabled = p.requiresWA && !isConnected;
            const isActive = currentPage === p.id;
            return (
              <button
                key={p.id}
                onClick={() => !disabled && onNavigate(p.id as Page)}
                disabled={disabled}
                className={`p-2 rounded-lg transition-colors ${
                  isActive ? 'bg-gray-900 text-white' :
                  disabled ? 'text-gray-300 cursor-not-allowed' :
                  'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                }`}
                title={disabled ? `${p.label} (connect first)` : p.label}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                </svg>
              </button>
            );
          })}
        </div>

        <button
          onClick={onLogout}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          title="Logout"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">WA Blast</h1>
          <p className="text-xs text-gray-400 mt-1">Message blaster</p>
        </div>
        <button
          onClick={onCollapse}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* WA Status */}
      <button
        onClick={() => onNavigate('connect')}
        className={`mx-3 mt-4 px-4 py-3 rounded-lg border text-left transition-colors ${
          currentPage === 'connect'
            ? 'bg-gray-900 border-gray-900'
            : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className={`text-xs font-medium ${currentPage === 'connect' ? 'text-white' : 'text-gray-600'}`}>
            WhatsApp
          </span>
        </div>
        <p className={`text-xs mt-1 ml-4 ${currentPage === 'connect' ? 'text-gray-400' : 'text-gray-400'}`}>
          {statusLabel}
        </p>
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-6">
        {/* Blast dropdown */}
        <button
          onClick={() => setBlastOpen(!blastOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
        >
          <span>Blast</span>
          <svg
            className={`w-3 h-3 transition-transform ${blastOpen ? 'rotate-0' : '-rotate-90'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {blastOpen && (
          <ul className="space-y-1 mt-1">
            {BLAST_PAGES.map((p) => {
              const disabled = p.requiresWA && !isConnected;
              const isActive = currentPage === p.id;

              return (
                <li key={p.id}>
                  <button
                    onClick={() => !disabled && onNavigate(p.id as Page)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : disabled
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                    </svg>
                    <span>{p.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* Settings */}
      <div className="px-3 mb-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Settings</p>
        <button
          onClick={() => onNavigate('connect')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            currentPage === 'connect' ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>WA Connection</span>
        </button>
      </div>

      {/* User */}
      <div className="border-t border-gray-100 p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
          {(getUser() || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">{getUser()}</p>
        </div>
        <button
          onClick={onLogout}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="Logout"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
