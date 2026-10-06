import assert from "node:assert/strict";
import { shouldQueue, courseBatchSchema } from "../src/queue_worker.js";

const now = new Date("2026-09-13T00:00:00.000Z");
const batch = courseBatchSchema.parse({ courseId: "cart-basics", learnerDeadline: "2026-09-14T00:00:00.000Z", images: [{ image: "img_1", filename: "hero.jpg" }] });
assert.equal(shouldQueue(batch, now), true);
assert.equal(shouldQueue({ ...batch, learnerDeadline: new Date("2026-09-12T00:00:00.000Z") }, now), false);
console.log("queue decision test passed");
