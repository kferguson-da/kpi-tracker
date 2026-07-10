import { z } from 'zod';

export const createViewBody = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
});

export type CreateViewInput = z.infer<typeof createViewBody>;

export const updateViewBody = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
});

export type UpdateViewInput = z.infer<typeof updateViewBody>;
