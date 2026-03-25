import { useState } from 'react';
import { getToken, clearAuth } from './lib/auth';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import type { Page } from './components/Sidebar';
import { useSocket } from './hooks/useSocket';
import { AuthStep } from './components/AuthStep';
import { UploadStep } from './components/UploadStep';
import { TemplateStep } from './components/TemplateStep';
import { PreviewStep } from './components/PreviewStep';
import { BlastStep } from './components/BlastStep';
import { HistoryPage } from './components/HistoryPage';
import type { Contact } from './lib/api';

const PAGE_TITLES: Record<Page, string> = {
  connect: 'Connect WhatsApp',
  upload: 'Upload Contacts',
  template: 'Message Template',
  preview: 'Preview Messages',
  send: 'Send Messages',
  history: 'Blast History',
};

function Dashboard() {
  const socket = useSocket();
  const [page, setPage] = useState<Page>('connect');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [columns, setColumns] = useState<string[]>(['name']);
  const [template, setTemplate] = useState('');
  const [blastActive, setBlastActive] = useState(false);

  const handleLogout = () => {
    clearAuth();
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        currentPage={page}
        onNavigate={setPage}
        onLogout={handleLogout}
        onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        collapsed={sidebarCollapsed}
        socket={socket}
        blastActive={blastActive}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-gray-800">{PAGE_TITLES[page]}</h1>
          <div className="w-9" /> {/* spacer for centering */}
        </div>

        <div className="p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="hidden md:block text-2xl font-bold text-gray-800 mb-6">{PAGE_TITLES[page]}</h2>

            <div className="bg-white rounded-xl shadow-sm border p-4 md:p-8">
              {page === 'connect' && (
                <AuthStep socket={socket} onNext={() => setPage('upload')} />
              )}
              {page === 'upload' && (
                <UploadStep
                  initialContacts={contacts}
                  initialColumns={columns}
                  onChange={(c, cols) => { setContacts(c); setColumns(cols); }}
                  onNext={(c, cols) => {
                    setContacts(c);
                    setColumns(cols);
                    setPage('template');
                  }}
                  onBack={() => setPage('connect')}
                />
              )}
              {page === 'template' && (
                <TemplateStep
                  contacts={contacts}
                  columns={columns}
                  initialTemplate={template}
                  onTemplateChange={setTemplate}
                  onNext={(t) => {
                    setTemplate(t);
                    setPage('preview');
                  }}
                  onBack={() => setPage('upload')}
                />
              )}
              {page === 'preview' && (
                <PreviewStep
                  contacts={contacts}
                  columns={columns}
                  template={template}
                  onConfirm={() => { setBlastActive(true); setPage('send'); }}
                  onBack={() => setPage('template')}
                />
              )}
              {page === 'send' && (
                <BlastStep
                  socket={socket}
                  contacts={contacts}
                  template={template}
                  onReset={() => {
                    setBlastActive(false);
                    setContacts([]);
                    setColumns(['name']);
                    setTemplate('');
                    setPage('upload');
                  }}
                />
              )}
              {page === 'history' && (
                <HistoryPage />
              )}
            </div>

            <footer className="text-center text-gray-400 text-sm mt-8 pb-4">
              Created by Raihan Afiandi
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [authed, setAuthed] = useState(!!getToken());

  if (!authed) {
    return <LoginPage onAuth={() => setAuthed(true)} />;
  }

  return <Dashboard />;
}

export default App;
