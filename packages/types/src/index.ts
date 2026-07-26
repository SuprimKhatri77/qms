import { z } from "zod";

export const user = z.object({
  id: z.number(),
  name: z.string(),
  email: z.email(),
  password: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof user>;
