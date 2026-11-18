import { z } from "zod";

export const RecordActionInputSchema = z.object({
  actorId: z.string().min(1),
  action: z.string().regex(/^[a-z]+(\.[a-z_]+)+$/, "รูปแบบ action ต้องเป็น module.verb เช่น auth.login"),
  targetType: z.string().min(1),
  targetId: z.string().min(1),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export type RecordActionInput = z.input<typeof RecordActionInputSchema>;
