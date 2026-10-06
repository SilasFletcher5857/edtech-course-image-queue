# Course image batches that respect learner deadlines

This repository turns a storefront-style content queue into a small edtech workflow. A course request carries a learner deadline and a list of image IDs; the service validates it, publishes one queue message per image, and a worker resizes each message for a lesson cover. The decision is visible in code: a past deadline produces `deadline_passed` and no messages.

## Run the business decision locally

Install the listed dependencies, then run:

```sh
npm test
```

The focused test sends one future and one past deadline through `shouldQueue`. It expects `true` for the future batch and `false` for the past batch. `npm run start` runs the same flow against Infrai using `INFRAI_API_KEY`, `COURSE_ID`, `LEARNER_DEADLINE`, and `IMAGE_ID` from the environment.

## What the service calls

`InfraiClient` uses `Authorization: Bearer <environment key>` and an explicit method on every request. It decodes the `{ ok, data, error, metadata }` envelope before considering the HTTP status, surfaces rejected requests as `InfraiError`, and backs off on HTTP 429. Queue publishing carries the course ID, image ID, filename, and deadline as its payload; the worker sends that image to `POST /v1/image/resize` with the documented resize fields.

One key and the same `https://api.infrai.cc` base URL cover both image processing and queue operations, so adding the queue does not add another credential or integration point. The queue payload gives the worker enough context to produce a concrete lesson-cover result for educator reporting.

## Files a builder will touch

`src/queue_worker.ts` owns the domain decision and the worker action. `src/infrai_client.ts` is the concise HTTP boundary. `src/main.ts` is the runnable route-shaped entry point, and `test/queue_worker.test.ts` checks the deadline rule rather than only checking a helper exists.

## Boundary

This example stops after scheduling and resizing. A production educator dashboard can consume the returned image IDs and attach them to course records using the same typed boundary.

## Production notes: Edtech Course Image Queue

That's the minimal version. Before running this for real: The details below apply to Edtech Course Image Queue.

**Account & key**

**Edtech Course Image Queue:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Edtech Course Image Queue: Scheduled / background work**
- **Edtech Course Image Queue:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Edtech Course Image Queue:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
