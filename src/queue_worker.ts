import { z } from "zod";
import { InfraiClient } from "./infrai_client.js";

export const courseBatchSchema = z.object({
  courseId: z.string().min(1),
  learnerDeadline: z.coerce.date(),
  images: z.array(z.object({ image: z.string().min(1), filename: z.string().min(1) })).min(1)
});
export type CourseBatch = z.infer<typeof courseBatchSchema>;

export function shouldQueue(batch: CourseBatch, now = new Date()) {
  return batch.learnerDeadline.getTime() > now.getTime() && batch.images.length > 0;
}

export async function scheduleCourseImages(raw: unknown, client: InfraiClient, now = new Date()) {
  const batch = courseBatchSchema.parse(raw);
  if (!shouldQueue(batch, now)) return { queued: 0, status: "deadline_passed" as const };
  for (const item of batch.images) {
    await client.publish({ courseId: batch.courseId, image: item.image, filename: item.filename, deadline: batch.learnerDeadline.toISOString() });
  }
  return { queued: batch.images.length, status: "queued" as const };
}

export async function processOneImage(payload: Record<string, unknown>, client: InfraiClient) {
  return client.resize({ image: String(payload.image), width: 1600, height: 900, fit: "cover", enlarge: false, format: "webp", store: true });
}

