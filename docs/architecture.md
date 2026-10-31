# Game design

The web workspace owns rendering, transient selection state, and API requests. The API owns validation, round timing, and scores. Prisma provides persistence with PostgreSQL.

Scene has many Targets and Rounds. Round has many Finds (unique round + target) and at most one Score. Target bounds are private normalized rectangles. Public target portraits use separate SVG symbols, not answer crops with embedded scene positions.

Lifecycle: image loaded → explicit Start creates round → guesses add finds → final find writes completion timestamp → optional score submission → replay. A random bearer credential stays in sessionStorage and travels only in the Authorization header. HTTPS and exact CORS origins are required in production. Credentials are not cookies, so cross-site cookie settings are unnecessary. Never log Authorization headers. A lost credential means starting again.

Coordinates are fractions of the rendered SVG image rectangle, independent of page or scroll position. Markers use percentages. Keyboard players move a visible cursor with arrows (Shift for finer steps), then Enter opens selection. Bounds include a small visual margin (roughly 6–10 SVG pixels); there is no extra client-controlled tolerance.

Round writes serialize with a PostgreSQL row lock inside a transaction. Unique constraints also protect finds and scores. Rounds expire after two hours. Server timestamps alone determine elapsed time. This prevents client timing manipulation, but does not prevent automated play or inspection of the illustration.
