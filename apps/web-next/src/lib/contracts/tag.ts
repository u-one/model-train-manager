import { z } from 'zod'

export const tagInputSchema = z.object({
  name: z.string().trim().min(1).max(50),
  category: z.string().trim().min(1).max(30),
  description: z.string().trim().max(1000).nullable().optional()
}).strict()

export const tagUpdateSchema = tagInputSchema.partial().strict().refine(value => Object.keys(value).length > 0)
