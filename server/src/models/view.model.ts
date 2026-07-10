import type { PrismaClient, View } from '@prisma/client';
import type { CreateViewInput } from '../schemas/view.schema';

export function createView(
  prisma: PrismaClient,
  ownerId: string,
  input: CreateViewInput,
): Promise<View> {
  return prisma.view.create({
    data: { name: input.name, description: input.description ?? null, ownerId },
  });
}

export function listOwnedViews(prisma: PrismaClient, ownerId: string): Promise<View[]> {
  return prisma.view.findMany({
    where: { ownerId, archivedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

// Active views shared with the user via a ViewAccess grant (Phase 6 adds grants).
export function listSharedViews(prisma: PrismaClient, userId: string): Promise<View[]> {
  return prisma.view.findMany({
    where: { archivedAt: null, access: { some: { userId } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function findViewById(prisma: PrismaClient, id: string): Promise<View | null> {
  return prisma.view.findUnique({ where: { id } });
}

export function updateView(
  prisma: PrismaClient,
  id: string,
  data: { name?: string; description?: string | null },
): Promise<View> {
  return prisma.view.update({ where: { id }, data });
}

export function setViewArchived(
  prisma: PrismaClient,
  id: string,
  archivedAt: Date | null,
): Promise<View> {
  return prisma.view.update({ where: { id }, data: { archivedAt } });
}

export function deleteView(prisma: PrismaClient, id: string): Promise<View> {
  return prisma.view.delete({ where: { id } });
}

// Whether the user has a Viewer grant on the view (owner is separate).
export async function hasViewGrant(
  prisma: PrismaClient,
  viewId: string,
  userId: string,
): Promise<boolean> {
  const grant = await prisma.viewAccess.findUnique({
    where: { viewId_userId: { viewId, userId } },
  });
  return grant !== null;
}
