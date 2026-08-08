import { z } from "zod";

export const paginationMetaSchema = z.object({
  total: z.number(),
  totalPages: z.number(),
  page: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
