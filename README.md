# Midnight Market

A little search after dark. Find four peculiar regulars in an original lantern-lit market, then optionally put your time on the leaderboard.

Built for [The Odin Project’s Where’s Waldo assignment](https://www.theodinproject.com/lessons/nodejs-where-s-waldo-a-photo-tagging-app).

## Play

Study the four visual references, start a round, and click or tap a spot in the illustration. Choose the regular you spotted. Correct guesses leave a permanent check marker; the final discovery stops the server clock. Publish a display name or start another round without publishing.

The illustration scrolls horizontally on small screens. Keyboard players can focus the scene, move the cursor with arrow keys (Shift for finer steps), and press Enter to choose a target. Escape closes the selection menu. The leaderboard and selection menu support keyboard focus.

## Stack and structure

- React, Vite, and plain CSS in `apps/web`.
- Express, Prisma 7 with the PostgreSQL driver adapter, and PostgreSQL in `apps/api`.
- npm workspaces with one lockfile; ESLint, Prettier, Node test runner, SuperTest, Vitest, and React Testing Library.

Scene → targets and rounds; round → unique finds and one optional score. [Architecture](docs/architecture.md) explains the lifecycle and persistence rules.

## Local setup

Use Node **24 LTS**, npm 11, and a running PostgreSQL instance. The examples assume a local `jc` role with peer authentication. Substitute your own role without changing global authentication settings.

```sh
npm ci
createdb odin_wheres_waldo
createdb odin_wheres_waldo_test
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.example apps/api/.env.test
```

In `.env.test`, change **only the database name** to `odin_wheres_waldo_test`. The development connection is:

```dotenv
DATABASE_URL="postgresql://jc@localhost/odin_wheres_waldo?host=/var/run/postgresql"
# Optional hosted migration URL; leave unset locally
# DIRECT_DATABASE_URL=
PORT=3001
CORS_ORIGINS=http://localhost:5173
```

Generate the client, apply committed migrations, and seed:

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to port 3001. Seeds update the scene and targets without erasing rounds or scores.

Prepare the separate test database:

```sh
cd apps/api
DATABASE_URL='postgresql://jc@localhost/odin_wheres_waldo_test?host=/var/run/postgresql' npx prisma migrate deploy
node --env-file=.env.test prisma/seed.js
cd ../..
npm test
```

Integration tests refuse any database other than the exact local test database and delete **its** rounds, finds, and scores. Do not point test configuration at shared data.

| Command                | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| `npm run dev`          | Run API and web development servers                   |
| `npm test`             | Sequential PostgreSQL API tests, then component tests |
| `npm run lint`         | Check JavaScript and React hooks                      |
| `npm run format:check` | Check formatting                                      |
| `npm run format`       | Format source and documentation                       |
| `npm run build`        | Build the frontend into `apps/web/dist`               |
| `npm start`            | Start API using environment supplied by the host      |
| `npm run db:generate`  | Generate the Prisma JavaScript client                 |
| `npm run db:migrate`   | Apply committed SQL migrations                        |
| `npm run db:seed`      | Repeatable development seed                           |

For a local production preview, run the API with `npm run dev -w apps/api`, then `npm run build` and `npm run preview -w apps/web -- --port 5173`. The preview uses the same API proxy as development.

## Coordinates and scoring

Pointer positions are fractions of the rendered image rectangle, including its current scroll offset. Keyboard selection uses the same normalized space. Percentage-based markers remain anchored after resizing. Private target rectangles include small margins around the artwork; see [asset measurements and licensing](docs/assets.md).

The API never returns unrevealed coordinates. A random anonymous credential is hashed in PostgreSQL and sent in the Authorization header. It stays in tab-scoped session storage, allowing a refresh to resume a round. HTTPS is required outside local development. No credential cookies or credential-bearing URLs are used.

The server records start and completion timestamps and validates every find. Database transactions lock each round; uniqueness constraints prevent duplicate finds and scores. A round expires after two hours. Displayed live timing is approximate; published time always comes from the server. Scores are optional, names are validated, and the fastest 20 entries have stable tie ordering.

## Deployment preparation

See [deployment configuration](docs/deployment.md) for the Neon / Render / Vercel setup.

## Assets and limitations

The market and portraits are original SVG artwork under [MIT](LICENSE). Barlow Condensed and DM Sans are loaded from Google Fonts under the SIL Open Font License, with system fallbacks. No copyrighted Waldo illustration is used.

One scene and four targets are implemented. This is a casual search game: inspecting SVG source or automating requests can still reveal or solve the puzzle. Bearer credentials in browser storage are exposed to any script running on the same origin, so keep that origin trusted. Rate limiting is in-memory per API instance; multi-instance deployments need a shared limiter. Anonymous rounds accumulate; production operation should add a retention policy. Display names are public and have no moderation system.
