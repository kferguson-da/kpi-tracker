import { z } from 'zod';
import { goalRuleError } from '../utils/goalRule';

// Request body for creating a KPI. Shape is validated by zod; the cross-field
// goal-rule check is delegated to the pure goalRuleError helper.
export const createKpiBody = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(1000).optional(),
    unit: z.enum(['NUMBER', 'PERCENT', 'DOLLARS']),
    comparator: z.enum(['EQ', 'GT', 'GTE', 'LT', 'LTE', 'BETWEEN']),
    goal: z.number().finite(),
    goalUpper: z.number().finite().nullish(),
    cadence: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY']),
  })
  .superRefine((val, ctx) => {
    const error = goalRuleError(val.comparator, val.goal, val.goalUpper ?? null);
    if (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: error, path: ['goalUpper'] });
    }
  });

export type CreateKpiInput = z.infer<typeof createKpiBody>;

// Request body for updating a KPI. All fields optional; the goal-rule validity of
// the merged result is checked in the controller (it needs the current values).
export const updateKpiBody = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  unit: z.enum(['NUMBER', 'PERCENT', 'DOLLARS']).optional(),
  comparator: z.enum(['EQ', 'GT', 'GTE', 'LT', 'LTE', 'BETWEEN']).optional(),
  goal: z.number().finite().optional(),
  goalUpper: z.number().finite().nullable().optional(),
  cadence: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY']).optional(),
});

export type UpdateKpiInput = z.infer<typeof updateKpiBody>;
