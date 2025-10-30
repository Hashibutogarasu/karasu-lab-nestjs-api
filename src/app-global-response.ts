import z from 'zod';

const baseResponseSchema = z.object({
  success: z.boolean().default(true),
  message: z.string(),
  sessionId: z.string().optional(),
});

export const createGlobalResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T,
) => {
  return baseResponseSchema.extend({
    data: dataSchema,
  });
};

export type GlobalResponseType<T extends z.ZodTypeAny> = z.infer<
  ReturnType<typeof createGlobalResponseSchema<T>>
>;
