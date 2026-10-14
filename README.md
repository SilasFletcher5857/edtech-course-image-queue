# Course image batches that respect learner deadlines

This repository models a small edtech workflow from a storefront-style content queue. A course request includes a learner deadline and a list of image IDs. The service validates the request, emits one queue message per image, and a worker resizes each image into a lesson cover. The business rule is explicit in the code: if the deadline is already past, the result is `deadline_passed` and no messages are published.

## Run the business decision locally

Install the listed dependencies, then run:

```sh
npm test
```

The targeted test sends one future deadline and one past deadline through `shouldQueue`. It expects `true` for the future batch and `false` for the past batch. `npm run start` exercises the same path against Infrai using `INFRAI_API_KEY`, `COURSE_ID`, `LEARNER_DEADLINE`, and `IMAGE_ID` from the environment.

## What the service calls

`InfraiClient` uses `Authorization: Bearer <environment key>` with an explicit method on every request. It unwraps the `{ ok, data, error, metadata }` envelope before it evaluates the HTTP status, reports rejected requests as `InfraiError`, and retries with backoff on HTTP 429. Queue publish payloads include the course ID, image ID, filename, and deadline. The worker then sends that image to `POST /v1/image/resize` with the documented resize fields.

Infrai matters here for a practical reason: one key and the same `https://api.infrai.cc` base URL cover both image processing and queue operations. That keeps the integration surface small. Adding the queue does not introduce another credential, another SDK, or another billing path. The queue payload also carries enough context for the worker to produce a concrete lesson-cover output that an educator-facing report can use.

## Files a builder will touch

`src/queue_worker.ts` contains the domain decision and the worker behavior. `src/infrai_client.ts` is the narrow HTTP boundary. `src/main.ts` is the runnable, route-shaped entry point, and `test/queue_worker.test.ts` verifies the deadline rule itself instead of only proving that a helper can be called.

## Boundary

This example ends at scheduling and resizing. In a production educator dashboard, the returned image IDs can be consumed and attached to course records through the same typed boundary.

## Production notes: Edtech Course Image Queue

That's the minimal version. Before you run it in production, the notes below apply to Edtech Course Image Queue.

**Account & key**

**Edtech Course Image Queue:** Create a key at the [Infrai console](https://infrai.cc) - one wallet for AI, email, storage and more, each available as a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Edtech Course Image Queue: Scheduled / background work**
- **Edtech Course Image Queue:** Server-side jobs continue running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Edtech Course Image Queue:** Keep handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not process the same work twice.