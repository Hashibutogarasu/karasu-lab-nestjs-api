import z from 'zod';

const baseResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
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
