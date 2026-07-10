import type { FastifyReply, FastifyRequest } from 'fastify';
import { currentUser } from '../plugins/auth';
import { currentView } from '../hooks/authz';
import { createViewBody, updateViewBody } from '../schemas/view.schema';
import { HttpError } from '../utils/httpError';
import { serializeView } from '../serializers/view.serializer';
import * as viewModel from '../models/view.model';

export async function createView(request: FastifyRequest, reply: FastifyReply) {
  const user = currentUser(request);
  const input = createViewBody.parse(request.body);
  const view = await viewModel.createView(request.server.prisma, user.id, input);
  reply.code(201);
  return serializeView(view, user.id);
}

export async function listViews(request: FastifyRequest) {
  const user = currentUser(request);
  const { filter } = request.query as { filter?: string };
  const views =
    filter === 'shared'
      ? await viewModel.listSharedViews(request.server.prisma, user.id)
      : await viewModel.listOwnedViews(request.server.prisma, user.id);
  return views.map((v) => serializeView(v, user.id));
}

export async function getView(request: FastifyRequest) {
  return serializeView(currentView(request), currentUser(request).id);
}

export async function updateView(request: FastifyRequest) {
  const user = currentUser(request);
  const view = currentView(request);
  if (view.archivedAt !== null) {
    throw new HttpError(409, 'Cannot edit an archived view');
  }
  const patch = updateViewBody.parse(request.body);
  const updated = await viewModel.updateView(request.server.prisma, view.id, {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
  });
  return serializeView(updated, user.id);
}

export async function archiveView(request: FastifyRequest) {
  const user = currentUser(request);
  const view = currentView(request);
  if (view.archivedAt !== null) {
    throw new HttpError(409, 'View is already archived');
  }
  const updated = await viewModel.setViewArchived(request.server.prisma, view.id, new Date());
  return serializeView(updated, user.id);
}

export async function restoreView(request: FastifyRequest) {
  const user = currentUser(request);
  const view = currentView(request);
  if (view.archivedAt === null) {
    throw new HttpError(409, 'View is not archived');
  }
  const updated = await viewModel.setViewArchived(request.server.prisma, view.id, null);
  return serializeView(updated, user.id);
}

export async function deleteView(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const view = await viewModel.findViewById(request.server.prisma, id);
  if (!view) {
    throw new HttpError(404, 'View not found');
  }
  await viewModel.deleteView(request.server.prisma, id);
  return reply.code(204).send();
}
