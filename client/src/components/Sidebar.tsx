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
  blastActive?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ currentPage, onNavigate, onLogout, onCollapse, collapsed, socket, blastActive, mobileOpen, onMobileClose }: SidebarProps) {
  const [waStatus, setWaStatus] = useState<string>('disconnected');
  const [blastOpen, setBlastOpen] = useState(true);
  const [contactsSynced, setContactsSynced] = useState(0);
  const [contactsBuffered, setContactsBuffered] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const onStatus = (s: string) => setWaStatus(s);
    const onContactsCount = (data: { synced: number; buffered: number }) => {
      setContactsSynced(data.synced);
      setContactsBuffered(data.buffered);
      setSyncing(false);
    };
    socket.on('status', onStatus);
    socket.on('contacts:count', onContactsCount);
    return () => {
      socket.off('status', onStatus);
      socket.off('contacts:count', onContactsCount);
    };
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

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    onMobileClose?.();
  };

  // Collapsed sidebar (desktop only — hidden on mobile)
  if (collapsed) {
    return (
      <aside className="hidden md:flex w-16 bg-white border-r border-gray-200 flex-col min-h-screen items-center py-4">
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
            onClick={() => handleNavigate('connect')}
            className={`p-2 rounded-lg transition-colors ${currentPage === 'connect' ? 'bg-green-50 text-green-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
            title="Connect"
          >
            <span className={`block w-2 h-2 rounded-full ${statusColor}`} />
          </button>

          {BLAST_PAGES.map((p) => {
            const disabled = (p.requiresWA && !isConnected) || (p.id === 'send' && !!blastActive);
            const isActive = currentPage === p.id;
            return (
              <button
                key={p.id}
                onClick={() => !disabled && handleNavigate(p.id as Page)}
                disabled={disabled}
                className={`p-2 rounded-lg transition-colors ${
                  isActive ? 'bg-green-50 text-green-700' :
                  disabled ? 'text-gray-300 cursor-not-allowed' :
                  'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                }`}
                title={disabled ? (p.id === 'send' && blastActive ? 'Blast already sent' : `${p.label} (connect first)`) : p.label}
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

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">WA Blast</h1>
          <p className="text-xs text-gray-400 mt-1">Message blaster</p>
        </div>
        <button
          onClick={() => {
            onMobileClose?.();
            onCollapse();
          }}
          className="hidden md:block p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Close menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* WA Status */}
      <div className={`mx-3 mt-4 rounded-lg border ${
        currentPage === 'connect'
          ? 'bg-green-50 border-green-200'
          : 'bg-gray-50 border-gray-100'
      }`}>
        <button
          onClick={() => handleNavigate('connect')}
          className={`w-full px-4 py-3 text-left transition-colors rounded-lg ${
            currentPage !== 'connect' ? 'hover:bg-gray-100' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusColor}`} />
            <span className={`text-xs font-medium ${currentPage === 'connect' ? 'text-green-800' : 'text-gray-600'}`}>
              WhatsApp
            </span>
          </div>
          <p className={`text-xs mt-1 ml-4 ${currentPage === 'connect' ? 'text-green-600' : 'text-gray-400'}`}>
            {statusLabel}
            {isConnected && contactsSynced > 0 && ` · ${contactsSynced.toLocaleString()} contacts`}
          </p>
        </button>
        {isConnected && (
          <div className="px-4 pb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSyncing(true);
                socket.emit('sync-contacts');
              }}
              disabled={syncing || contactsBuffered === 0}
              className="w-full text-xs py-1.5 rounded-md font-medium transition-colors bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {syncing ? 'Syncing...' : contactsBuffered > 0
                ? `Sync ${contactsBuffered.toLocaleString()} contacts`
                : contactsSynced > 0 ? 'Contacts synced' : 'No contacts available'}
            </button>
          </div>
        )}
      </div>

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
              const disabled = (p.requiresWA && !isConnected) || (p.id === 'send' && !!blastActive);
              const isActive = currentPage === p.id;

              return (
                <li key={p.id}>
                  <button
                    onClick={() => !disabled && handleNavigate(p.id as Page)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-green-50 text-green-800'
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
          onClick={() => handleNavigate('connect')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            currentPage === 'connect' ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-100'
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
    </>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Desktop sidebar — always visible */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col min-h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar — slide-in drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ease-in-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
