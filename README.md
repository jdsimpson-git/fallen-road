# Fallen Road

> Your death becomes someone else's enemy.

A first-person, paper-diorama roguelike built as a Reddit interactive post for the Reddit Hackathon. Players swipe to slash, block and perfect-counter enemy attacks, break guards, and unleash weapon bursts. The full design lives in [Fallen_Road_Game_Design_Document.md](Fallen_Road_Game_Design_Document.md).

**Current status: Phase 2+ — the continuous road.** One unbroken run: walk the twilight road toward the dark tower, and enemies step out of the fog one after another — the **Road Soldier** (basic block, slow slash), the **Shield Bearer** (directional center/high guards with gaps, shield bash, vulnerable weapon hand and legs), and the **Duelist** (bob-and-weave, sidesteps, a blue-ring counter stance that parries and ripostes, and an enrage phase below 30% health) — cycling until the road claims you. Health persists between fights (+18 on each kill). All enemies adapt to the player's recent habits with hard caps so they stay beatable; leg hits slow, weapon-hand hits can interrupt telegraphs. The look is a dusk-silhouette diorama: gradient sky, ember horizon, black pine lines, glowing-eyed foes, film grain. Merchants, Gambits, daily seeds, leaderboards, and the Fallen Rival system are intentionally not implemented yet.

## Stack

Built from the official [Devvit Phaser starter](https://github.com/reddit/devvit-template-phaser):

- [Devvit Web](https://developers.reddit.com/) — Reddit app platform (Redis permission enabled)
- [Phaser 4](https://phaser.io/) — game engine, fixed 1280x720 logical resolution, `Scale.FIT`
- [Hono](https://hono.dev/) — server routes under `/api/*`
- [Zod](https://zod.dev/) — request/response validation on server and client
- [Vitest](https://vitest.dev/) — unit tests for all pure combat logic
- TypeScript strict mode, ESLint, Prettier
- Devvit MCP configured in [.mcp.json](.mcp.json) for agent documentation search

## Getting started

```bash
npm install
npm run login    # authenticate the Devvit CLI with your Reddit account
npx devvit init  # bind this project to a new Devvit app (keeps existing code)
npm run dev      # playtest live on Reddit
```

To preview the client without Reddit: `npm run build`, then serve `dist/client`
(e.g. `python3 -m http.server 4173 --directory dist/client`) and open
`game.html`. The `/api` endpoints are unavailable in this mode and fail
gracefully.

## Commands

| Command                             | Purpose                            |
| ----------------------------------- | ---------------------------------- |
| `npm run dev`                       | Devvit playtest on Reddit          |
| `npm run build`                     | Production build (client + server) |
| `npm test`                          | Run unit tests                     |
| `npm run type-check`                | Strict TypeScript build check      |
| `npm run lint`                      | ESLint                             |
| `npm run prettier`                  | Format                             |
| `npm run verify`                    | type-check + lint + test + build   |
| `npm run deploy` / `npm run launch` | Upload / publish the app           |

## How the combat slice plays

- **Attack** — swipe (mouse drag or touch) through the soldier. Direction is
  classified into 8 ways; long, deliberate swipes become **heavy attacks**.
- **Weak point** — the head sways constantly; hitting it deals 1.5x damage and
  extra burst.
- **Block** — hold the shield button (touch), Space, or right mouse.
  Blocks reduce damage by 75% but drain your guard meter.
- **Perfect counter** — press the shield in the final 240 ms of the enemy's
  telegraph (watch for the golden flash on the blade). Negates the hit,
  staggers the soldier, damages his guard, and grants a large burst chunk.
- **Guard break** — both sides. An emptied guard meter means seconds of
  crumpled, defenseless paper.
- **Burst** — fill the meter, then press BURST (or Q) for the five-hit
  Paper-Rending Combo.
- The soldier telegraphs, blocks, side-steps, recovers, and can be
  guard-broken; fell him for victory, or die and rise again.

## Architecture

```text
src/
  shared/            # runs on client AND server, fully unit-tested
    balance/         # ALL tuning data: player, weapons, enemies, gestures,
                     # hit zones, burst gains — no numbers in logic code
    combat/          # pure logic: gesture classifier, segment-vs-zone hit
                     # detection, damage, guard meters, counter timing, burst,
                     # EnemyBrain (time-driven FSM with phases + counter stance),
                     # pattern tracking + capped adaptation, directional guard
    api.ts           # Zod schemas for /api contracts
  client/
    game.ts          # Phaser config (1280x720 FIT)
    scenes/          # Boot -> Preloader -> Home (foe select) -> Battle
    combat/          # SwipeInput (pointer capture)
    entities/        # PaperEnemyView (data-driven cutout builder), PlayerRigView
    ui/              # Hud, backdrop, effects, theme
  server/
    index.ts         # Hono app
    routes/api.ts    # /api/init, /api/victory (Zod-validated, Redis-backed)
```

Design rules enforced in code:

- **Balance lives in data files** (`src/shared/balance/`), never inline.
- **Pure combat logic is shared** so the server can later validate run
  submissions with the same math the client simulates.
- **Hit zones derive from live sprite positions** — a dodge really moves the
  hitbox; there is no hidden miss chance after a visually landed hit.
- The enemy brain is a plain TypeScript FSM with injected time and RNG.

## Testing

`npm test` — 83 tests covering gesture classification (distance / duration /
velocity thresholds, 8-direction classification, heavy detection, taps),
segment-vs-circle/rect hit detection and zone priority, damage and block
math, guard damage / break / regeneration timing, perfect-counter windows,
burst gain/activation, player-pattern tracking and capped weight adaptation,
directional guard resolution, and the full enemy brain lifecycle (attack
cycles, defensive cooldowns, counter stance / riposte / its cooldown,
interrupts, slows, phase transitions, burst lockdown).

## Roadmap (per the design document)

1. ~~Combat vertical slice~~
2. ~~Enemy variety: player-pattern adaptation, Shield Bearer, Duelist, phase framework~~ ← **you are here**
3. Weapons (spear, hammer), elemental affixes, statuses, Gambits, reward & merchant scenes; the Gatekeeper boss on the phase framework
4. Full run structure, tutorial, travel, results & scoring
5. Server-issued daily seed, leaderboards, run validation, **Fallen Rival system**
6. Art & audio pass, mobile polish, submission
