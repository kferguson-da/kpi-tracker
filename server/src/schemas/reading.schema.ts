import { z } from 'zod';

// Request body for recording a value. periodKey format is checked against the
// KPI's cadence in the controller (see utils/period).
export const createReadingBody = z.object({
  periodKey: z.string().trim().min(1),
  value: z.number().finite(),
});

export type CreateReadingInput = z.infer<typeof createReadingBody>;
