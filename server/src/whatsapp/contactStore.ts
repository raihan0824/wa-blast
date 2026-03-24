export interface WAContact {
  jid: string;
  name: string;
  number: string;
}

const contacts = new Map<string, WAContact>();

export function upsertContacts(
  items: { id: string; name?: string; notify?: string }[]
): void {
  for (const item of items) {
    if (!item.id || !item.id.endsWith('@s.whatsapp.net')) continue;
    const number = item.id.replace('@s.whatsapp.net', '');
    const name = item.notify || item.name || '';
    contacts.set(item.id, { jid: item.id, name, number });
  }
}

export function searchContacts(query: string, limit = 20): WAContact[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const results: WAContact[] = [];

  for (const contact of contacts.values()) {
    if (
      contact.name.toLowerCase().includes(q) ||
      contact.number.includes(q)
    ) {
      results.push(contact);
      if (results.length >= limit) break;
    }
  }

  return results;
}

export function clearContacts(): void {
  contacts.clear();
}

export function getContactCount(): number {
  return contacts.size;
}
