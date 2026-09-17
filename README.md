# Red Seat

A private cinema booking workflow with OTP access, fixed seats, checkout, and a durable SQLite confirmation record.

## Setup

Install dependencies in each tier, then start them in separate terminals:

```sh
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

Backend configuration is in `backend/.env` (copy the documented values from `backend/.env.example` if needed). The frontend uses same-origin `/api` in production; its development proxy forwards that path to the backend.

## Demo journey

1. Visit `/login`, enter any mobile number, and verify demo OTP `1234`.
2. Select a movie at `/movies`, a mapped theatre at `/theatres`, then choose the deterministic seats at `/seats`.
3. At `/checkout`, select Card or UPI and pay. Payment-form values stay in the browser and are never sent or stored.
4. After two seconds, the backend creates a booking and `/confirmation` displays only its backend confirmation DTO.

## Environment

Backend requires `DATABASE_PATH`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `PORT`, and `CORS_ORIGIN`. Frontend may set `NEXT_PUBLIC_API_BASE_URL`; leave it empty for same-origin deployment. No secrets are included in this repository.

SQLite is file-backed and persistent when `DATABASE_PATH` points to persistent storage. The compose deployment mounts a named volume. SQLite is suitable for this small workflow; for multi-node write-heavy deployments, use a managed database with appropriate concurrency controls.

## Tests and build

```sh
cd backend && node node_modules/vitest/vitest.mjs run tests/booking.api.test.ts
cd backend && node node_modules/vitest/vitest.mjs run tests/booking.integration.test.ts
cd frontend && node node_modules/vitest/vitest.mjs run tests/checkout.test.tsx
cd backend && npm run build
cd frontend && npm run build
```

## Deployment

```sh
docker compose up --build
```

The frontend and backend are separate services; the `booking-data` named volume preserves SQLite records across container recreation.

## License

Private and proprietary. All rights reserved.
