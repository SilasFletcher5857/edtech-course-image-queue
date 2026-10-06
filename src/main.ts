import { InfraiClient } from "./infrai_client.js";
import { scheduleCourseImages } from "./queue_worker.js";

const client = new InfraiClient();
const result = await scheduleCourseImages({
  courseId: process.env.COURSE_ID ?? "checkout-photography",
  learnerDeadline: process.env.LEARNER_DEADLINE ?? new Date(Date.now() + 86_400_000).toISOString(),
  images: [{ image: process.env.IMAGE_ID ?? "uploaded-image-id", filename: "lesson-cover.jpg" }]
}, client);
const queued = process.env.PROCESS_QUEUE === "1"
  ? await client.consume({ max_messages: 10, visibility_timeout: 60 })
  : undefined;
console.log(JSON.stringify({ workflow: "course-image-backlog", ...result, consumed: queued?.messages.length ?? 0 }));
