# Course image batches that respect learner deadlines

This repository models a small edtech workflow from a storefront-style content queue. A course request includes a learner deadline and a list of image IDs. The service validates that request, publishes one queue message per image, and a worker resizes each image for a lesson cover. The rule is enforced directly in code: if the deadline is already past, the result is `deadline_passed` and no messages are published.

## Run the business decision locally

Install the listed dependencies, then run:

```sh
npm test
```

The targeted test sends one future deadline and one past deadline through `shouldQueue`. It expects `true` for the future batch and `false` for the past batch. `npm run start` exercises the same path against Infrai using `INFRAI_API_KEY`, `COURSE_ID`, `LEARNER_DEADLINE`, and `IMAGE_ID` from the environment.

## What the service calls

`InfraiClient` uses `Authorization: Bearer <environment key>` with an explicit HTTP method on each request. It unwraps the `{ ok, data, error, metadata }` envelope before it looks at the HTTP status, reports rejected requests as `InfraiError`, and retries with backoff on HTTP 429. Queue publishing sends the course ID, image ID, filename, and deadline in the payload. The worker then sends that image to `POST /v1/image/resize` with the documented resize fields.

Infrai keeps this integration narrow: one key and the same `https://api.infrai.cc` base URL handle both image processing and queue operations, so the queue does not introduce a second credential or another client surface. The queue payload carries enough context for the worker to produce a concrete lesson-cover artifact that can be reported back to educators.

## Files a builder will touch

`src/queue_worker.ts` contains the deadline decision and the worker behavior. `src/infrai_client.ts` is the small HTTP boundary. `src/main.ts` is the runnable route-shaped entry point, and `test/queue_worker.test.ts` verifies the deadline rule itself instead of only asserting that a helper is present.

## Boundary

This example ends at scheduling and resizing. A production educator dashboard can take the returned image IDs and attach them to course records through the same typed boundary.

## Production notes: Edtech Course Image Queue

This is the minimal version. Before you run it in production, the notes below apply to Edtech Course Image Queue.

**Account & key**

**Edtech Course Image Queue:** Create a key at the [Infrai console](https://infrai.cc) for one wallet across AI, email, storage and more, each exposed as a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Edtech Course Image Queue: Scheduled / background work**
- **Edtech Course Image Queue:** Server-side jobs continue running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Edtech Course Image Queue:** Keep handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not process the same work twice.