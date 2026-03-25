import { useState, useEffect } from 'react';
import { getHistory, getHistoryDetail, type BlastHistorySummary, type BlastRecipientDetail } from '../lib/api';

export function HistoryPage() {
  const [history, setHistory] = useState<BlastHistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlast, setSelectedBlast] = useState<BlastHistorySummary | null>(null);
  const [recipients, setRecipients] = useState<BlastRecipientDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    getHistory()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const viewDetail = async (blast: BlastHistorySummary) => {
    if (selectedBlast?.id === blast.id) {
      setSelectedBlast(null);
      setRecipients([]);
      return;
    }
    setSelectedBlast(blast);
    setDetailLoading(true);
    try {
      const data = await getHistoryDetail(blast.id);
      setRecipients(data.recipients);
    } catch {
      setRecipients([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors = {
      running: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      error: 'bg-red-100 text-red-700',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const recipientBadge = (status: string) => {
    const colors = {
      pending: 'text-gray-500',
      sent: 'text-green-600',
      failed: 'text-red-600',
    };
    return colors[status as keyof typeof colors] || 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-400">Loading history...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>No blast history yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {history.map((blast) => (
        <div key={blast.id} className="border rounded-lg overflow-hidden">
          <button
            onClick={() => viewDetail(blast)}
            className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 hover:bg-gray-50 transition-colors text-left gap-2"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge(blast.status)}`}>
                  {blast.status}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(blast.started_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 truncate">
                {blast.template.slice(0, 80)}{blast.template.length > 80 ? '...' : ''}
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 sm:ml-4 shrink-0">
              <div className="text-center">
                <p className="text-sm font-semibold text-green-600">{blast.sent}</p>
                <p className="text-xs text-gray-400">Sent</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-red-500">{blast.failed}</p>
                <p className="text-xs text-gray-400">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-600">{blast.total}</p>
                <p className="text-xs text-gray-400">Total</p>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${selectedBlast?.id === blast.id ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {selectedBlast?.id === blast.id && (
            <div className="border-t bg-gray-50 p-3 md:p-4">
              {detailLoading ? (
                <p className="text-gray-400 text-sm text-center py-4">Loading details...</p>
              ) : recipients.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No recipient data available.</p>
              ) : (
                <div className="max-h-64 overflow-auto -mx-3 md:mx-0">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-gray-500 text-xs">Number</th>
                        <th className="px-3 py-2 text-gray-500 text-xs hidden sm:table-cell">Name</th>
                        <th className="px-3 py-2 text-gray-500 text-xs">Status</th>
                        <th className="px-3 py-2 text-gray-500 text-xs hidden md:table-cell">Message</th>
                        <th className="px-3 py-2 text-gray-500 text-xs">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipients.map((r) => (
                        <tr key={r.id} className="border-t border-gray-100">
                          <td className="px-3 py-1.5 font-mono text-xs">{r.number}</td>
                          <td className="px-3 py-1.5 hidden sm:table-cell">{r.variables.name || '-'}</td>
                          <td className={`px-3 py-1.5 font-medium text-xs ${recipientBadge(r.status)}`}>
                            {r.status}
                          </td>
                          <td className="px-3 py-1.5 text-gray-600 max-w-xs truncate hidden md:table-cell">
                            {r.rendered_message || '-'}
                          </td>
                          <td className="px-3 py-1.5 text-red-500 text-xs max-w-[150px] md:max-w-xs truncate">
                            {r.error || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
