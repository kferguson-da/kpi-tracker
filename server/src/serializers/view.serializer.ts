import type { View } from '@prisma/client';

// API shape of a View. `role` is relative to the caller: the owner sees "owner",
// anyone reaching it through a share sees "viewer". Grouped KPIs + roll-up are
// added with membership in Phase 5b.
export function serializeView(view: View, callerId: string) {
  return {
    id: view.id,
    name: view.name,
    description: view.description,
    ownerId: view.ownerId,
    archivedAt: view.archivedAt,
    createdAt: view.createdAt,
    role: view.ownerId === callerId ? 'owner' : 'viewer',
  };
}
