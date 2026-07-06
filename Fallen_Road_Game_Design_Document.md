# Fallen Road

## Hackathon Game Design and Technical Implementation Document

**Document version:** 1.0  
**Date:** July 3, 2026  
**Status:** Implementation-ready MVP specification  
**Working title:** Fallen Road  
**Tagline:** Your death becomes someone else's enemy.

> The title, names, and balance values in this document are working defaults. The implementation agent should keep them data-driven so they can be changed without editing combat logic.

---

## 1. Executive Summary

Fallen Road is a first-person, paper-diorama roguelike built as an interactive Reddit game. The player travels automatically down a dangerous road toward a distant fortress, fighting real-time melee battles with swipe attacks, directional targeting, blocking, perfect counters, guard stamina, and weapon-specific burst attacks.

Every run produces a different build through weapons and risky upgrades called **Gambits**. Each Gambit grants a meaningful advantage and a corresponding drawback. Players encounter merchants, increasingly skilled enemies, an elite, and a final boss. Death resets the run.

The central Reddit hook is the **Fallen Rival System**. When a player dies, the enemy responsible can inherit the player's weapon and one of their Gambits. That empowered enemy may later invade another Redditor's daily run. Defeating it avenges the fallen player and allows the victor to claim the inherited weapon.

All players face a shared **Daily Road** with the same base seed, route, boss, shops, and environmental modifier. Individual runs diverge through reward choices, player skill, and Fallen Rival encounters. Players compete on daily leaderboards and vote on a modifier that shapes the next day's road.

The hackathon MVP should deliver one polished biome, a complete five-to-eight-minute run, responsive mobile and desktop controls, and a clear social loop. It should not attempt a large campaign, multiple classes, real-time multiplayer, or a complex inventory system.

---

## 2. Product Goals

### 2.1 Primary goals

1. Deliver satisfying real-time melee combat using mouse drags and finger swipes.
2. Make enemies feel reactive through dodges, directional blocks, counters, feints, and player-pattern adaptation.
3. Make every run mechanically distinct through Gambits, elemental weapons, and weapon theft.
4. Make Reddit users materially affect one another's runs through Fallen Rivals and the shared Daily Road.
5. Create a distinct original paper-theater visual identity that is efficient to produce and animate.
6. Complete a polished, stable, submission-ready vertical slice before the hackathon deadline.

### 2.2 Secondary goals

1. Qualify strongly for the Best Use of Phaser category.
2. Support daily retention through shared seeds, leaderboards, records, and community modifiers.
3. Generate shareable run stories, such as avenging another player or stealing a rare weapon.
4. Keep all gameplay understandable within the first 30 seconds.

### 2.3 Non-goals for the MVP

- Real-time player-versus-player combat
- Cooperative synchronous multiplayer
- Multiple playable classes
- Character creation
- Large equipment inventory
- Crafting
- Armor slots
- Permanent stat progression
- Multiple biomes
- Branching narrative campaign
- Voice chat
- External accounts
- Payments
- Generative AI at runtime
- Full server-authoritative combat simulation

---

## 3. Design Pillars

### 3.1 Read, react, punish

Combat should reward observing enemy posture and timing. A player wins by recognizing telegraphs, choosing the correct response, and exploiting a brief opening.

### 3.2 Risk creates identity

Weak-point attacks, perfect counters, weapon theft, and Gambits should always ask the player to accept danger in exchange for power.

### 3.3 Every death feeds the community

A failed run is not wasted. It creates a possible Fallen Rival encounter for another player and a story that can appear in the community activity feed.

### 3.4 Small scope, high polish

The MVP should reuse a compact set of systems in varied combinations. Difficulty should come from behavior combinations, not dozens of unique enemies or inflated health bars.

### 3.5 Paper is part of the mechanics

The paper-diorama presentation is not only decoration. Enemies fold into defensive stances, tear when injured, crumple when guard-broken, and lose visible paper layers when armor is destroyed.

---

## 4. Target Platforms and Session Length

### 4.1 Platforms

- Reddit desktop web
- Reddit mobile webview
- Reddit mobile application webview where supported by Devvit Web

### 4.2 Orientation

- Primary: landscape-style game composition inside an expanded view
- Mobile: responsive portrait-safe layout with the combat viewport above the controls
- The player must not need to rotate the device

### 4.3 Session targets

- Tutorial: 45 to 75 seconds
- Failed run: 1 to 5 minutes
- Successful run: 5 to 8 minutes
- Daily leaderboard review: under 30 seconds

---

## 5. Recommended Technology Stack

### 5.1 Core stack

- **Platform:** Devvit Web
- **Starter:** Official Phaser starter template
- **Game framework:** Phaser 3, using the version included by the current official starter unless a documented upgrade is required
- **Language:** TypeScript with strict mode
- **Client bundler:** Vite
- **Server:** Express from the official starter template
- **Persistence:** Devvit Redis through `@devvit/redis`
- **Reddit integration:** `@devvit/web/client` and `@devvit/web/server`
- **Schema validation:** Zod
- **Unit testing:** Vitest
- **Formatting and linting:** Prettier and ESLint
- **Agent documentation access:** Devvit MCP with `devvit_search`

### 5.2 Intentionally excluded from the MVP

- React
- Redux
- Zustand
- Socket.IO
- External database
- External game server
- Three.js
- Unity WebGL
- Tailwind inside the game canvas
- Third-party physics engines
- External analytics SDKs

### 5.3 Why this stack

Phaser should own game rendering, scene transitions, animation, pointer input, sound, timers, and combat state. Keeping the game in one framework avoids coordinating React state with Phaser state during a short hackathon schedule.

Use ordinary HTML and CSS only for the initial loading shell, unsupported-device messaging, and any accessibility controls that are easier outside the canvas. All persistent game data must go through server endpoints and Redis.

### 5.4 Rendering mode

Configure Phaser with `Phaser.AUTO` so it can select WebGL when available and fall back to Canvas. Do not use WebGPU.

### 5.5 Phaser scale configuration

Use a logical base resolution of `1280 x 720`.

Recommended configuration:

```ts
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: 1280,
  height: 720,
}
```

All interactive controls must remain inside a central safe area. Use responsive breakpoints to enlarge touch targets and reposition the HUD on narrow screens.

---

## 6. High-Level Architecture

```text
Reddit Interactive Post
        |
        v
Devvit Web Client
  - Phaser scenes
  - Input recognition
  - Deterministic encounter simulation
  - UI and animation
  - Audio
        |
        | fetch /api/*
        v
Devvit Web Server
  - Authenticated Reddit context
  - Daily seed generation
  - Run creation and validation
  - Leaderboards
  - Fallen Rival pool
  - Community modifier votes
  - Optional Reddit comment sharing
        |
        v
Devvit Redis
  - Player profiles
  - Run records
  - Daily configuration
  - Sorted-set leaderboards
  - Rival records
  - Votes and aggregate counters
```

### 6.1 Authority model

Use a **server-issued, client-simulated, server-validated** model.

The server issues:

- Run ID
- User ID and display name from authenticated context
- Daily seed
- Content version
- Route definition
- Selected Fallen Rival, if any
- Run expiration time

The client simulates combat and records a compact action summary. At completion or death, the server validates that the submitted outcome is plausible and that all referenced content IDs are valid for that run.

This is sufficient for a hackathon leaderboard. Do not spend the schedule building frame-by-frame server simulation.

---

## 7. Game Presentation

### 7.1 Perspective

The player sees through the hero's eyes. The bottom of the screen shows the hero's shield on the left and weapon on the right. The road extends toward a distant fortress.

Between encounters, the camera moves forward automatically through layered parallax scenery. The player does not control walking.

### 7.2 Paper-theater style

Use an original storybook diorama style:

- Layered paper backgrounds
- Visible folded edges
- Cardboard shadows
- Ink outlines
- Slight paper texture
- Characters assembled from separate flat body pieces
- Enemies rotate slightly as if mounted on paper stands
- Damage creates tears, creases, scorch marks, frost cracks, and missing paper fragments

Do not reproduce Paper Mario characters, logos, UI, sound effects, environments, or exact visual assets.

### 7.3 Camera feedback

Use restrained effects:

- Short camera shake on heavy impacts
- Tiny zoom on perfect counter
- Hit-stop of 40 to 80 milliseconds on critical hits
- Paper fragments on guard break
- Directional vignette when damaged
- Reduced-motion mode that disables camera shake and large zooms

---

## 8. Core Gameplay Loop

1. Open the Daily Road post.
2. View today's boss, modifier, personal best, and community activity.
3. Start a run.
4. Travel to an encounter.
5. Fight using attacks, blocking, counters, and burst.
6. Receive a Gambit, weapon opportunity, coins, or healing.
7. Visit a merchant or event.
8. Face an elite or Fallen Rival.
9. Fight the final boss.
10. Win or die.
11. Submit the score.
12. View leaderboard placement and run summary.
13. Vote on tomorrow's modifier.
14. Optionally share the run as a Reddit comment.
15. Return the next day for a new seed and community outcome.

---

## 9. MVP Run Structure

A complete run contains six nodes.

| Node | Encounter             | Purpose                                           |
| ---- | --------------------- | ------------------------------------------------- |
| 1    | Basic enemy           | Teach current enemy behavior and establish rhythm |
| 2    | Basic enemy or event  | Introduce movement, blocking, or status effects   |
| 3    | Reward choice         | Select one of three Gambits                       |
| 4    | Merchant              | Heal, buy weapon, or modify build                 |
| 5    | Elite or Fallen Rival | High-risk build test and weapon theft opportunity |
| 6    | Final boss            | Multi-phase final examination                     |

A run may include short travel animations between nodes, but the player must be able to skip or accelerate them after the first viewing.

### 9.1 Post-launch extension

The original longer concept with four or five miniboss rounds can become an Endless Road or Expedition mode after the hackathon. It should not be required for the MVP.

---

## 10. Player Stats

Default starting values are tuneable data, not hard-coded constants.

| Stat            | Starting value | Purpose                               |
| --------------- | -------------: | ------------------------------------- |
| Maximum health  |            100 | Damage capacity                       |
| Current health  |            100 | Current survival state                |
| Maximum guard   |            100 | Blocking stamina                      |
| Current guard   |            100 | Remaining block capacity              |
| Base attack     |             10 | Standard torso hit damage             |
| Attack recovery |         420 ms | Delay before another attack can begin |
| Block reduction |            75% | Damage prevented by normal block      |
| Counter window  |         240 ms | Default perfect-counter timing        |
| Burst maximum   |            100 | Charge required for special attack    |
| Starting coins  |              0 | Merchant currency                     |
| Gambit slots    |              5 | Maximum active Gambits                |

### 10.1 Guard regeneration

- Guard regenerates only when not blocking and not being hit.
- Regeneration delay after blocking: 800 ms
- Base regeneration: 18 guard per second
- Guard break duration: 1.4 seconds
- Guard break cancels the block state and temporarily disables counters.

---

## 11. Input Model

### 11.1 Pointer abstraction

Treat mouse and touch as Phaser pointer input. Capture:

- Pointer down position
- Pointer path samples
- Pointer up position
- Gesture duration
- Gesture distance
- Average velocity
- Dominant direction

### 11.2 Attack gesture

An attack occurs when:

- Pointer starts inside the combat viewport
- Drag distance exceeds the minimum threshold
- Gesture duration is below the maximum attack duration
- Player is not guard-broken, stunned, or inside attack recovery

Recommended initial thresholds:

- Minimum drag distance: 70 logical pixels
- Maximum gesture duration: 650 ms
- Minimum average velocity: 180 logical pixels per second

### 11.3 Attack directions

Classify attacks into:

- Left to right
- Right to left
- Top to bottom
- Bottom to top
- Down-left diagonal
- Down-right diagonal
- Up-left diagonal
- Up-right diagonal

Enemy guards and vulnerabilities can react to direction classes.

### 11.4 Defensive controls

Mobile:

- Hold shield button: block
- Tap shield during the counter window: perfect counter attempt
- Tap burst button when full: burst attack

Desktop:

- Hold Space or right mouse: block
- Press Space or right mouse during the counter window: perfect counter attempt
- Press Q or click burst button: burst attack

The same shield control supports block and counter. A press that begins outside the counter window becomes a normal block.

### 11.5 Accessibility alternative

Provide an optional **Tap Attack Mode**:

- Tap a visible body zone to attack it
- Swipe direction is selected automatically based on the exposed angle
- Damage is slightly reduced compared with manual swipes

This mode supports players who cannot perform fast drag gestures.

---

## 12. Hit Detection and Weak Points

### 12.1 Principle

A weak-point strike succeeds because the gesture intersects the moving hitbox. Do not add a hidden random miss after a visibly accurate hit.

### 12.2 Gesture collision

Simplify the captured pointer path into line segments. Test each segment against active polygon or ellipse hit zones attached to enemy body parts.

Select the highest-priority intersected zone:

1. Exposed wound
2. Weapon hand
3. Head
4. Shield arm
5. Legs
6. Torso

### 12.3 Hit zones

| Zone          | Base result                                           |
| ------------- | ----------------------------------------------------- |
| Torso         | 1.0x damage                                           |
| Head          | 1.5x damage and increased burst                       |
| Weapon hand   | 1.1x damage, attack interrupt chance, disarm progress |
| Shield arm    | 1.0x damage and high guard damage                     |
| Legs          | 1.2x damage and temporary slow                        |
| Exposed wound | 2.0x damage                                           |

### 12.4 Movement and evasion

Hit zones move with enemy body-part sprites. During a dodge, the enemy must begin moving before the gesture reaches the original hitbox. Never visually allow a completed strike to pass through a hit zone and then report a dodge.

### 12.5 Directional guard

Each defensive stance blocks a set of attack directions and body zones.

Examples:

- High guard blocks head and downward strikes but exposes legs.
- Left shield guard blocks left-side and horizontal strikes but exposes the right shoulder.
- Center guard protects torso but can be broken by repeated heavy downward strikes.
- Counter stance punishes any attack during its active window but has a visible startup tell.

---

## 13. Player Combat Actions

### 13.1 Normal attack

- Triggered by a valid swipe
- Damage depends on weapon, target zone, direction, Gambits, and status effects
- Applies attack recovery
- Builds a small amount of burst on hit

### 13.2 Heavy attack

A swipe with high distance and deliberate duration can become a heavy attack.

Recommended detection:

- Distance above 220 logical pixels
- Duration between 260 and 600 ms

Effects:

- 1.25x base damage
- 1.6x guard damage
- Longer recovery
- Easier for agile enemies to dodge

### 13.3 Block

- Reduces incoming damage
- Converts part of the prevented damage into guard damage
- Cannot prevent designated unblockable attacks
- Can be direction-sensitive for boss attacks if the UI remains readable

### 13.4 Perfect counter

A shield press inside the final portion of an enemy telegraph produces a perfect counter.

Effects:

- Negates damage
- Deals guard damage to the enemy
- Briefly staggers normal enemies
- Builds a large amount of burst
- Can expose a weak point

Failure states:

- Early press becomes normal block
- Late press takes full or partial damage
- Countering a feint wastes timing and may expose the player

### 13.5 Burst attack

Burst is weapon-specific and should feel visually dramatic without lasting longer than 1.5 seconds.

Burst charge sources:

| Action          | Charge |
| --------------- | -----: |
| Torso hit       |      5 |
| Weak-point hit  |      9 |
| Heavy hit       |      8 |
| Normal block    |      2 |
| Perfect counter |     18 |
| Taking damage   |      0 |
| Kill            |     10 |

Base weapon bursts:

- Sword: five-hit paper-rending combination
- Spear: armor-piercing thrust that ignores guard
- Hammer: massive guard break and stagger

Elemental modifiers alter the burst:

- Fire: applies a strong burn
- Frost: freezes or heavily slows
- Leech: heals a percentage of damage dealt

---

## 14. Enemy Combat AI

### 14.1 Goals

Enemies must feel active and readable, not static. Difficulty should come from timing, movement, and behavioral combinations.

### 14.2 Finite state machine

Each enemy uses these states as applicable:

- Spawn
- Idle
- Observe
- Telegraph
- Attack
- ComboFollowUp
- Recover
- Block
- CounterStance
- DodgeLeft
- DodgeRight
- Duck
- Backstep
- GuardBroken
- Staggered
- StatusReaction
- Enraged
- Defeated

### 14.3 Decision loop

Every decision cycle considers:

- Distance abstraction
- Current health percentage
- Current guard percentage
- Player's last five attack directions
- Player's recent target zones
- Player block frequency
- Player counter success rate
- Enemy archetype weights
- Current cooldowns
- Daily difficulty modifier
- Active status effects

Use weighted decisions with cooldowns. Do not let the enemy spam one behavior repeatedly.

### 14.4 Player-pattern adaptation

Maintain a rolling memory of the player's last five meaningful actions.

Examples:

- Frequent head attacks increase high-guard and duck weights.
- Repeated horizontal swipes increase duck and counter weights.
- Frequent blocking increases guard-break attack weight.
- Frequent perfect counters increase feint weight.
- Repeated torso attacks increase center-block weight.
- Rapid attack spam increases dodge and counter weights.

Adaptation must be capped so the enemy remains beatable. The system should suggest intelligence, not perfectly counter the player.

### 14.5 Telegraph language

Every attack family must have a consistent readable tell.

- Normal slash: weapon pulls back and flashes white
- Heavy attack: larger wind-up, red edge, low sound cue
- Unblockable attack: broken-shield icon and red pulse
- Feint: smaller incomplete flash and distinct foot movement
- Counter stance: blue ring around weapon or shield
- Dodge preparation: weight shifts to the opposite foot

Do not rely on color alone. Use icons, pose, sound, and motion.

### 14.6 Enemy behavior rules

- Enemies cannot dodge during hit-stop.
- Enemies cannot counter while staggered.
- Normal enemies must have at least 500 ms between defensive actions.
- Elites may chain one defensive action into one attack.
- Bosses may chain actions according to phase scripts.
- No enemy should execute more than one feint in a row.
- Repeated counter stances require a cooldown.

---

## 15. Enemy Archetypes

### 15.1 Road Soldier

Purpose: introductory opponent.

Behaviors:

- Slow slash
- Basic block
- Occasional head movement
- No feints
- No counter stance on the first encounter

### 15.2 Shield Bearer

Purpose: teaches directional attacks and guard damage.

Behaviors:

- Strong frontal block
- Shield bash
- High and center guard changes
- Low mobility
- Vulnerable weapon hand and legs

### 15.3 Duelist

Purpose: punishes predictable attacks.

Behaviors:

- Bob and weave
- Sidestep
- Counter stance
- Fast recovery
- Low guard capacity

### 15.4 Elemental Raider

Purpose: introduces weapon theft and status pressure.

Behaviors:

- Carries fire, frost, or leech weapon
- Uses one status-specific attack
- Protects weapon hand after the player targets it repeatedly
- Can be disarmed

### 15.5 Fallen Rival

Purpose: social elite encounter.

Behaviors:

- Uses a base archetype
- Carries a deceased player's weapon
- Inherits one compatible Gambit
- Displays the fallen player's Reddit name and cause of death
- Has one enhanced behavior based on the inherited build

### 15.6 Final Boss: The Gatekeeper

Purpose: tests the full combat system.

Phase 1:

- Sword and shield
- Directional guards
- Standard attacks
- One feint

Phase 2 at 60% health:

- Tears away shield covering
- Gains faster combinations
- Uses a guard-break attack
- Exposes weapon arm after missed heavy attacks

Phase 3 at 25% health:

- Weapon gains today's elemental modifier
- Shorter recovery
- One desperation unblockable attack
- Burst finish should be possible but not mandatory

---

## 16. Difficulty Model

### 16.1 Difficulty dimensions

Scale difficulty through:

- Telegraph speed
- Attack combination length
- Defensive behavior frequency
- Feint frequency
- Guard capacity
- Status pressure
- Recovery duration
- Adaptation strength

Avoid using health increases as the primary scaler.

### 16.2 Encounter tiers

| Tier     | Features                                           |
| -------- | -------------------------------------------------- |
| Basic    | One attack family, occasional block, slow movement |
| Advanced | Two attack families, dodge, directional guard      |
| Elite    | Feint, counter, status weapon, adaptive defense    |
| Boss     | Scripted phases, mixed timing, unblockable attack  |

### 16.3 Dynamic assistance

For the first two runs only:

- Slightly extend counter windows after repeated failures
- Reduce enemy combo length after the player falls below 30% health
- Display a contextual hint after two identical mistakes

Do not change leaderboard scoring for assisted tutorial runs. Mark them as unranked until the tutorial is completed once.

---

## 17. Weapons

The player carries exactly one weapon. Replacing a weapon discards the previous weapon unless a merchant specifically offers a trade.

### 17.1 Base weapon archetypes

| Weapon | Base damage | Recovery | Guard damage | Trait                           | Burst            |
| ------ | ----------: | -------: | -----------: | ------------------------------- | ---------------- |
| Sword  |          10 |   420 ms |           10 | Balanced                        | Five-hit combo   |
| Spear  |           9 |   500 ms |            8 | Larger weak-point hit allowance | Piercing thrust  |
| Hammer |          14 |   690 ms |           18 | Heavy stagger                   | Full guard break |

### 17.2 Elemental affixes

| Affix | Effect                                                                     |
| ----- | -------------------------------------------------------------------------- |
| Fire  | Builds burn stacks that deal damage over time                              |
| Frost | Builds chill stacks that slow enemy actions; maximum stacks briefly freeze |
| Leech | Heals a small percentage of direct damage, reduced against bosses          |

### 17.3 Status rules

- Burn: maximum 5 stacks
- Chill: maximum 4 stacks
- Freeze: triggered at maximum chill, then clears chill
- Leech: cannot heal above maximum health
- Bosses have reduced freeze duration
- Status effect icons must show stack count and remaining duration

### 17.4 Weapon theft

An enemy weapon becomes claimable when one of these conditions is met:

- The enemy is defeated and the drop roll succeeds
- The player fills the disarm meter by attacking the weapon hand
- A Gambit guarantees theft after a perfect-counter kill
- The enemy is a Fallen Rival, which guarantees the inherited weapon after victory

For the MVP, weapon theft should use a clear choice screen after battle rather than dropping an interactive object during combat.

---

## 18. Gambits

### 18.1 Definition

Gambits are run-specific upgrades with both a benefit and a drawback. They are the primary build system.

### 18.2 Rules

- Player can hold up to five Gambits.
- Reward screens present three choices.
- Gambits are selected from a deterministic pool tied to the run seed.
- Incompatible Gambits must not appear together unless explicitly designed as a combo.
- A merchant can remove or replace one Gambit.

### 18.3 MVP Gambit set

| Gambit            | Benefit                                              | Drawback                                  |
| ----------------- | ---------------------------------------------------- | ----------------------------------------- |
| Glass Counter     | Perfect counters deal 2x guard damage                | Failed counters cause guard break         |
| Blood Edge        | Direct hits heal 3% of damage dealt                  | Blocking costs 2 health per second        |
| Brittle Giant     | Heavy attacks deal 60% more guard damage             | Maximum guard reduced by 25               |
| Frozen Rhythm     | Every third hit applies 2 chill                      | Attack recovery increased by 12%          |
| Last Stand        | Burst gain doubled below 30% health                  | Healing received reduced by 35%           |
| Reckless Focus    | Head hits deal an additional 35% damage              | Torso hits deal 15% less damage           |
| Iron Patience     | Guard regenerates 50% faster                         | Burst gain from normal attacks reduced    |
| Ember Debt        | Fire stacks last twice as long                       | Player takes minor burn after using burst |
| Thief's Oath      | Disarm progress doubled                              | Merchant prices increased by 25%          |
| Open Guard        | Attacks deal 20% more damage                         | Normal blocks reduce less damage          |
| Second Wind       | First guard break per battle restores 25 health      | Maximum health reduced by 15              |
| Duelist's Pride   | Consecutive unique attack directions gain damage     | Repeating a direction loses burst         |
| Cold Bargain      | Frozen enemies take increased damage                 | Chill decays faster                       |
| Collector's Curse | Stolen weapons gain one rarity tier                  | Elites gain 15% health                    |
| Final Word        | Burst below 20% enemy health executes normal enemies | Burst meter starts each fight empty       |

### 18.4 Build readability

The HUD shows up to five compact Gambit icons. Holding or tapping an icon opens its benefit and drawback text. Reward choices must show both effects without hiding the drawback.

---

## 19. Merchant

### 19.1 Merchant flow

The merchant presents exactly three large options. The player chooses one or leaves.

Possible inventory:

- Restore 35 health
- Restore all guard and gain a small temporary maximum-guard bonus
- Buy one displayed weapon
- Add one displayed Gambit
- Remove one Gambit
- Reroll the next reward

### 19.2 Currency

- Basic enemy: 8 to 12 coins
- Elite: 18 to 25 coins
- Weak-point execution bonus: 3 coins
- No-hit victory bonus: 5 coins

Initial prices:

- Heal: 18 coins
- Weapon: 28 coins
- Gambit: 24 coins
- Remove Gambit: 20 coins

Keep prices data-driven.

### 19.3 Merchant personality

Use a recurring paper puppet merchant with short lines that react to the player's condition and build. Limit dialogue to one sentence so it does not slow the run.

---

## 20. Daily Road

### 20.1 Shared elements

All players in the same subreddit receive the same daily:

- Base seed
- Route node types
- Base enemy archetypes
- Merchant inventory seed
- Boss modifier
- Two candidate community modifiers for tomorrow

### 20.2 Divergent elements

Runs differ because of:

- Gambit choices
- Weapon theft
- Player performance
- Selected Fallen Rival
- Optional reward rerolls

### 20.3 Daily reset

Use a single documented time zone for the game. Recommended MVP rule: reset at 00:00 UTC. Display the countdown clearly in the player's local time where possible.

### 20.4 Daily modifier examples

- Ash Road: all fire effects are stronger, healing is reduced
- Frozen Mile: chill builds faster for players and enemies
- Broken Shields: guard regeneration is slower, counter burst is increased
- Rich Caravan: merchants offer better weapons, elites are stronger
- Duelist's Day: repeated attack directions are easier to counter

---

## 21. Fallen Rival System

### 21.1 Creation

When a ranked player dies to an eligible enemy, create a Fallen Rival record containing:

- Rival ID
- Fallen player's Reddit user ID
- Display name
- Date created
- Enemy archetype that killed the player
- Weapon ID and affix
- One compatible Gambit ID
- Cause of death
- Run depth
- Difficulty score
- Times the rival has defeated other players
- Times the rival has been avenged
- Expiration date

Do not create a rival from tutorial runs, abandoned runs, or obviously invalid submissions.

### 21.2 Selection

At run start, the server may assign one rival from the active pool.

Selection rules:

- Maximum one Fallen Rival per run
- Prefer rivals near the player's expected difficulty
- Avoid selecting the same rival for the same player repeatedly
- Do not select the player's own rival
- Expire rivals after seven days or after a configured number of defeats

### 21.3 Encounter presentation

Before the battle:

```text
FALLEN RIVAL
The Ashen Duelist
Carrying u/ExamplePlayer's Frost Spear
Cause of death: Guard broken by a counter
```

The rival's paper body includes a small banner fragment with the fallen player's name.

### 21.4 Outcome

If the player wins:

- Rival is marked avenged
- Player receives the inherited weapon
- Fallen player receives an in-game notification on next launch
- Community activity feed records the event

If the rival wins:

- Rival's defeat count increases
- Rival gains a small capped difficulty increase
- The newly defeated player may create a separate rival, not merge into the existing one

### 21.5 Privacy and safety

Use only the Reddit display name supplied by authenticated context. Do not accept arbitrary user-entered names. Provide a neutral fallback such as `a fallen traveler` if display is unavailable.

---

## 22. Community Systems

### 22.1 Daily leaderboards

Track separate daily boards:

- Highest score
- Fastest boss victory
- Most perfect counters
- Most Fallen Rivals avenged
- No-hit completions

The main screen should emphasize one primary board, with tabs for the others.

### 22.2 Score formula

```text
Score =
  enemiesDefeated * 1,000
  + bossDefeated * 5,000
  + weakPointHits * 40
  + perfectCounters * 120
  + rivalsAvenged * 1,500
  + remainingHealth * 20
  + unusedCoins * 5
  - damageTaken * 12
  - runDurationSeconds * 2
```

All values are initial tuning defaults.

### 22.3 Community modifier vote

After the run, each player may vote once between two modifiers. The winning modifier becomes part of the next Daily Road.

Show:

- Current vote totals
- Time remaining
- Short mechanical explanation
- A visual preview

### 22.4 Activity feed

Show the five most recent meaningful events:

- Player defeated today's boss
- Player avenged another Redditor
- Fallen Rival defeated another traveler
- Player achieved a no-hit victory

Use Devvit Realtime only if the base implementation is stable. A normal refresh-based feed is sufficient for MVP.

### 22.5 Comment sharing

At the result screen, provide an explicit **Share Run** button. It may post a concise comment under the game post containing:

- Score
- Weapon
- Gambits
- Cause of death or victory
- Rival avenged, if any
- Daily seed identifier

Never post automatically. The player must initiate the action.

Suggested format:

```text
I reached the Gatekeeper with a Frost Spear and Glass Counter.
Score: 12,480 | Perfect counters: 7 | Rival avenged: u/ExamplePlayer
The road ended when my guard broke during phase three.
```

Comment sharing is a P1 feature. Do not delay core gameplay to implement it.

---

## 23. Scene Flow

### 23.1 Phaser scenes

1. `BootScene`
   - Minimal configuration
   - Device and reduced-motion detection

2. `PreloadScene`
   - Load atlases, audio, fonts, and configuration
   - Display progress

3. `HomeScene`
   - Today's modifier and boss
   - Start button
   - Personal best
   - Community activity
   - Leaderboard shortcut

4. `TutorialScene`
   - First-run attack, block, and counter tutorial

5. `TravelScene`
   - Parallax road transition
   - Next encounter preview

6. `BattleScene`
   - Combat runtime
   - Enemy FSM
   - Player input
   - HUD

7. `RewardScene`
   - Three Gambit choices or weapon claim

8. `MerchantScene`
   - Three purchase choices

9. `BossIntroScene`
   - Short boss reveal

10. `ResultsScene`
    - Score breakdown
    - Leaderboard placement
    - Vote
    - Share option

11. `LeaderboardScene`
    - Ranked tabs
    - Player highlight

12. `SettingsScene`
    - Audio
    - Reduced motion
    - Tap Attack Mode
    - Tutorial replay

### 23.2 Scene-state rule

Persistent run state lives in a plain TypeScript `RunSession` object managed by a `GameSessionService`, not inside individual scenes. Scenes receive immutable snapshots or call explicit methods.

---

## 24. Client Code Organization

```text
src/client/
  index.html
  main.ts
  styles.css
  game/
    config.ts
    GameRoot.ts
    scenes/
      BootScene.ts
      PreloadScene.ts
      HomeScene.ts
      TutorialScene.ts
      TravelScene.ts
      BattleScene.ts
      RewardScene.ts
      MerchantScene.ts
      BossIntroScene.ts
      ResultsScene.ts
      LeaderboardScene.ts
      SettingsScene.ts
    combat/
      CombatEngine.ts
      DamageCalculator.ts
      GestureRecognizer.ts
      HitZoneResolver.ts
      GuardSystem.ts
      BurstSystem.ts
      StatusSystem.ts
      EnemyBrain.ts
      EnemyStateMachine.ts
      TelegraphController.ts
    entities/
      PlayerController.ts
      EnemyController.ts
      WeaponController.ts
    systems/
      GameSessionService.ts
      DailyRoadService.ts
      ApiClient.ts
      AudioService.ts
      AccessibilityService.ts
      EventBus.ts
    content/
      weapons.ts
      gambits.ts
      enemies.ts
      encounters.ts
      modifiers.ts
      bosses.ts
    ui/
      Hud.ts
      ChoiceCard.ts
      Tooltip.ts
      Toast.ts
    effects/
      PaperTearEffect.ts
      HitStop.ts
      CameraFeedback.ts
  shared/
    types.ts
    schemas.ts
    constants.ts
```

---

## 25. Server Code Organization

```text
src/server/
  index.ts
  routes/
    bootstrap.ts
    runs.ts
    leaderboards.ts
    rivals.ts
    votes.ts
    sharing.ts
  services/
    DailySeedService.ts
    RunService.ts
    RunValidationService.ts
    LeaderboardService.ts
    RivalService.ts
    VoteService.ts
    RedditShareService.ts
  repositories/
    PlayerRepository.ts
    RunRepository.ts
    RivalRepository.ts
    DailyRepository.ts
  shared/
    types.ts
    schemas.ts
    constants.ts
```

All public client endpoints must begin with `/api/`.

---

## 26. API Contracts

All requests and responses must be validated with Zod on the server. The client should parse responses defensively.

### 26.1 `GET /api/bootstrap`

Returns:

- Authenticated player summary
- Current date key
- Daily modifier
- Boss preview
- Countdown to reset
- Personal best
- Top leaderboard entries
- Recent activity
- Whether tutorial is required

### 26.2 `POST /api/runs/start`

Request:

```ts
{
  mode: 'daily';
}
```

Response:

```ts
{
  runId: string;
  runToken: string;
  expiresAt: number;
  seed: number;
  contentVersion: string;
  route: RouteNodeDefinition[];
  playerStart: PlayerRunState;
  assignedRival?: FallenRivalPublic;
}
```

### 26.3 `POST /api/runs/complete`

Request:

```ts
{
  runId: string;
  runToken: string;
  result: RunResultSubmission;
}
```

Response:

```ts
{
  accepted: boolean;
  ranked: boolean;
  score: number;
  personalBest: boolean;
  leaderboardRank?: number;
  notifications: RunNotification[];
}
```

### 26.4 `POST /api/runs/fail`

Same base payload as completion, plus:

- Killer enemy ID
- Cause of death
- Final weapon
- Active Gambits
- Encounter index

Response indicates whether a Fallen Rival was created.

### 26.5 `GET /api/leaderboards?board=score&limit=25`

Returns ranked entries and the current player's nearby position.

### 26.6 `POST /api/votes`

Request:

```ts
{
  optionId: string;
  dailyKey: string;
}
```

Server enforces one vote per authenticated user per day.

### 26.7 `POST /api/share`

P1 endpoint. Validates that the run belongs to the current player and posts a sanitized run summary only after explicit user action.

---

## 27. Shared Type Model

Core interfaces:

```ts
interface PlayerRunState {
  health: number;
  maxHealth: number;
  guard: number;
  maxGuard: number;
  burst: number;
  coins: number;
  weapon: WeaponInstance;
  gambitIds: string[];
  encounterIndex: number;
  statusEffects: StatusInstance[];
}

interface WeaponDefinition {
  id: string;
  name: string;
  archetype: 'sword' | 'spear' | 'hammer';
  baseDamage: number;
  recoveryMs: number;
  guardDamage: number;
  burstId: string;
}

interface WeaponInstance {
  definitionId: string;
  affix: 'none' | 'fire' | 'frost' | 'leech';
  rarity: 1 | 2 | 3;
}

interface GambitDefinition {
  id: string;
  name: string;
  benefitText: string;
  drawbackText: string;
  tags: string[];
  incompatibleWith: string[];
}

interface RunResultSubmission {
  outcome: 'victory' | 'death' | 'abandoned';
  durationMs: number;
  enemiesDefeated: number;
  bossDefeated: boolean;
  damageTaken: number;
  weakPointHits: number;
  perfectCounters: number;
  rivalsAvenged: number;
  remainingHealth: number;
  remainingCoins: number;
  finalWeapon: WeaponInstance;
  gambitIds: string[];
  eventDigest: string;
}
```

---

## 28. Redis Data Model

Prefix all keys with the app namespace and subreddit ID.

```text
fr:{subredditId}:player:{userId}
fr:{subredditId}:daily:{dailyKey}:config
fr:{subredditId}:daily:{dailyKey}:leaderboard:score
fr:{subredditId}:daily:{dailyKey}:leaderboard:time
fr:{subredditId}:daily:{dailyKey}:leaderboard:counters
fr:{subredditId}:daily:{dailyKey}:leaderboard:rivals
fr:{subredditId}:daily:{dailyKey}:vote:counts
fr:{subredditId}:daily:{dailyKey}:vote:users
fr:{subredditId}:daily:{dailyKey}:activity
fr:{subredditId}:run:{runId}
fr:{subredditId}:rival:{rivalId}
fr:{subredditId}:rivals:active
fr:{subredditId}:player:{userId}:recent-rivals
```

### 28.1 Suggested Redis structures

- Player profile: hash or JSON string
- Daily configuration: JSON string
- Leaderboards: sorted sets
- Vote counts: hash
- Voters: set
- Activity feed: capped list
- Run records: JSON string with expiration
- Rival records: JSON string
- Active rivals: sorted set scored by creation time or difficulty
- Recent rival IDs: capped list or set with expiration

### 28.2 Retention

- Active run record: 2 hours
- Completed run details: 7 days
- Daily leaderboards: 30 days
- Fallen Rival: 7 days
- Activity feed: latest 50 events
- Player profile and aggregate statistics: persistent

Do not use browser local storage for authoritative progress. It may store only non-critical preferences such as audio volume until the server preference system is available.

---

## 29. Daily Seed Generation

### 29.1 Requirements

- Same subreddit and daily key produce the same base route.
- Different subreddits may have independent roads.
- Content changes must not corrupt existing daily runs.
- The server is the source of the seed.

### 29.2 Seed inputs

```text
subredditId + dailyKey + contentVersion + serverSalt
```

Hash the input and convert part of the digest to a 32-bit integer. The client uses a small deterministic PRNG such as Mulberry32.

### 29.3 Deterministic content

Use the seed for:

- Route node sequence
- Base enemy selection
- Merchant inventory
- Gambit reward pools
- Boss affix

Select a Fallen Rival separately at run start and include it in the run payload.

---

## 30. Validation and Basic Anti-Cheat

### 30.1 Server checks

- Run exists and belongs to the authenticated user
- Run token matches
- Run has not expired or already been submitted
- Content version matches
- Duration is within plausible minimum and maximum bounds
- Referenced weapon and Gambit IDs were available in the issued run
- Counters, damage, coins, and kill counts stay within calculated bounds
- Boss victory is impossible before required encounters
- Only the best accepted daily score is stored

### 30.2 Event digest

The client maintains a compact ordered event log containing event type, timestamp delta, target zone, damage, and state transitions. Hash the normalized log and submit the digest plus summary statistics.

For MVP, the server does not replay every event. It uses the log metadata for plausibility checks and debugging.

### 30.3 Failure handling

If validation fails:

- Save an internal rejection reason
- Return an unranked result without exposing security details
- Still allow the player to view the local result summary
- Do not create a Fallen Rival

---

## 31. UI Layout

### 31.1 Combat viewport

Top-left:

- Player health
- Player guard
- Active status effects

Top-center:

- Enemy name
- Enemy health
- Enemy guard
- Fallen player attribution when applicable

Top-right:

- Pause/settings
- Encounter progress

Bottom-left:

- Shield button on touch devices

Bottom-center:

- Burst meter and button

Bottom-right:

- Weapon icon and current affix

Side or expandable strip:

- Gambit icons

### 31.2 Touch targets

- Minimum visual and interactive size: 48 logical pixels
- Shield and burst buttons: at least 72 logical pixels on narrow screens
- Buttons must not overlap Reddit or browser safe areas

### 31.3 First screen

The first screen must communicate:

1. What the player does: swipe to attack, block and counter.
2. Today's goal: reach and defeat the Gatekeeper.
3. The social hook: fallen Redditors can become enemies.
4. The primary action: Begin Today's Road.

---

## 32. Tutorial

The tutorial uses a paper training dummy and one harmless soldier.

Steps:

1. Swipe through the torso.
2. Hit the moving head weak point.
3. Hold shield to block.
4. Tap shield at the flash to counter.
5. Fill a shortened burst meter and activate burst.

The tutorial ends with a simple statement:

> On the real road, enemies dodge, block, feint, and remember your habits.

Tutorial completion is stored in the player profile.

---

## 33. Art Asset Plan

### 33.1 Required MVP assets

Environment:

- Road background with three parallax depth layers
- Fortress destination
- Sky variants for daily modifiers
- Merchant stall
- Battle ground plane

Player:

- Sword foreground sprite
- Spear foreground sprite
- Hammer foreground sprite
- Shield foreground sprite
- Block and counter poses
- Burst effects

Enemies:

- Road Soldier body-part set
- Shield Bearer body-part set
- Duelist body-part set
- Elemental Raider variation
- Gatekeeper boss body-part set
- Paper damage overlays

Effects:

- Slash trails
- Paper fragments
- Fire
- Frost
- Leech
- Guard break
- Counter flash
- Hit markers

UI:

- Health, guard, and burst frames
- Gambit icons
- Weapon icons
- Status icons
- Merchant cards
- Leaderboard frame

### 33.2 Animation method

Use separate sprites for head, torso, arms, weapon, shield, and legs. Animate primarily with Phaser tweens and small sprite-frame changes.

This supports:

- Bobbing
- Weaving
- Guard changes
- Dodges
- Feints
- Weapon wind-ups
- Paper folding
- Damage reactions

Avoid expensive full-frame animation sheets for every action.

### 33.3 Asset format

- WebP or optimized PNG for raster assets
- Texture atlases for combat sprites and effects
- OGG and MP3 fallback where required for audio
- Bundle all runtime-critical assets with the app

---

## 34. Audio Design

Required sound families:

- Paper swish
- Weapon impact
- Shield block
- Perfect counter chime
- Guard break tear
- Weak-point critical
- Fire, frost, and leech effects
- Merchant interaction
- Boss phase transition
- Victory and death stingers

Music:

- One low-intensity travel loop
- One combat loop with layered intensity
- One boss loop

Audio must remain optional and muted until user interaction if required by browser autoplay policies.

---

## 35. Accessibility

Required:

- Reduced-motion mode
- Master, music, and sound volume controls
- Color plus icon telegraphs
- Tap Attack Mode
- Large touch controls
- Tutorial replay
- Readable font at mobile scale
- Avoid rapid full-screen flashes
- Pause gameplay when the app loses focus

Recommended:

- Left-handed mobile layout option
- Counter timing difficulty option for unranked practice mode
- Screen-shake toggle separate from reduced motion

---

## 36. Performance Targets

Internal targets:

- 60 frames per second on a typical modern desktop
- 30 frames per second minimum on a mid-range mobile device
- No gameplay-critical external client requests
- Initial interactive screen visible quickly with progressive asset loading
- One texture atlas per major asset family where practical
- Object pools for paper particles and hit effects
- Maximum simultaneous particles capped by device tier

Do not add dynamic lighting, complex physics, or post-processing that materially harms mobile performance.

---

## 37. Testing Strategy

### 37.1 Unit tests

Test pure logic for:

- Seed generation
- Deterministic reward generation
- Damage calculations
- Guard calculations
- Burst gain
- Status stacking
- Gambit compatibility
- Score calculation
- Rival selection eligibility
- Submission validation bounds

### 37.2 Integration tests

Test:

- Start run to Redis record creation
- Complete run to leaderboard update
- Failed run to Rival creation
- Vote enforcement
- Expired run rejection
- Duplicate submission rejection
- Different subreddit key isolation

### 37.3 Manual device matrix

- Desktop Chrome
- Desktop Firefox
- Desktop Safari if available
- iPhone-sized viewport
- Android-sized viewport
- Reddit web post
- Reddit expanded view

### 37.4 Combat test cases

- Swipe intersects moving head
- Enemy dodges before swipe arrives
- Enemy cannot dodge after confirmed collision
- Counter succeeds inside window
- Early counter becomes block
- Guard break disables shield
- Burst changes with weapon
- Freeze does not permanently lock boss
- Rival weapon is granted after victory

---

## 38. Telemetry and Debugging

Store lightweight counters in Redis:

- Runs started
- Runs completed
- Tutorial completion rate
- Average run duration
- Deaths by enemy and attack
- Gambit selection frequency
- Weapon selection frequency
- Counter success rate
- Mobile versus desktop sessions
- Rival creation and avenging rates

Include a development-only debug overlay showing:

- FPS
- Current enemy state
- Current AI weights
- Active hit zones
- Gesture direction and velocity
- Run seed
- Current content version

The debug overlay must be disabled in production.

---

## 39. Error Handling

### 39.1 Network failure during run

- Continue current client battle
- Queue final submission in memory
- Retry with bounded backoff when connection returns
- Show a non-blocking offline indicator
- Do not promise ranking until server acceptance

### 39.2 Run start failure

- Show retry button
- Preserve loaded assets
- Provide a clear error message without stack traces

### 39.3 Invalid or expired run

- Mark result unranked
- Explain that the road expired or could not be verified
- Let player return to the current Daily Road

### 39.4 Asset failure

- Fail gracefully to simplified shapes or a reload screen
- Log the missing asset key

---

## 40. Security and Content Safety

- Never trust client-provided user identity.
- Sanitize all text rendered from server responses.
- Do not render arbitrary player-authored text inside the game.
- Use only authenticated Reddit display names for rival attribution.
- Enforce request size limits and strict schemas.
- Rate-limit share and vote endpoints per user.
- Do not automatically create posts or comments without explicit action.
- Use only original or properly licensed game assets, fonts, and audio.

---

## 41. Implementation Priorities

### P0: Required for submission

- Devvit Web app runs in a public Reddit post
- Phaser client loads in expanded view
- Responsive first screen
- Tutorial
- Swipe attack and moving hit zones
- Block, counter, guard break, and burst
- Three player weapons
- Three enemy archetypes plus boss
- Enemy dodge, block, counter, and feint behavior
- Twelve or more Gambits
- Merchant
- Complete run flow
- Daily server-issued seed
- Redis-backed score leaderboard
- Fallen Rival creation and encounter
- Results screen
- Detailed README

### P1: Strongly recommended

- Community modifier vote
- Multiple leaderboard categories
- Recent activity feed
- Share Run comment action
- Reduced motion and Tap Attack Mode
- Additional paper damage effects

### P2: Stretch

- Devvit Realtime activity updates
- More daily modifiers
- Extra enemy variation
- Streak badges
- Challenge codes through comments
- Endless Road mode

---

## 42. Cut Order if Schedule Slips

Cut in this order:

1. Realtime activity updates
2. Comment sharing
3. Secondary leaderboard tabs
4. Additional daily modifiers
5. Fourth enemy variation
6. Merchant Gambit removal
7. Tap Attack Mode, only if accessibility cannot be completed safely

Do not cut:

- Core combat readability
- Enemy movement and defense
- Fallen Rival system
- Daily seed
- One leaderboard
- Boss fight
- Mobile responsiveness
- Tutorial
- README and submission materials

---

## 43. Development Schedule

### July 3

- Create Devvit app from official Phaser starter
- Enable Redis permission
- Configure Devvit MCP for the coding agent
- Establish project structure, linting, tests, and CI script
- Build responsive canvas shell

### July 4 to July 5

- Build combat vertical slice
- Implement gestures, hit zones, damage, guard, counter, and burst
- Implement one enemy with telegraphs, block, dodge, and death
- Test on mobile viewport

### July 6

- Implement enemy FSM and player-pattern adaptation
- Add Shield Bearer and Duelist
- Add boss phase framework

### July 7

- Implement weapons, affixes, statuses, and Gambits
- Implement reward and merchant scenes

### July 8

- Implement complete route and run state
- Add tutorial, travel, results, and score calculation

### July 9

- Implement server-issued daily seed, Redis persistence, leaderboards, and run validation
- Implement Fallen Rival creation and selection

### July 10

- Complete first production-quality art and audio pass
- Test full Reddit post flow
- Prepare README and app listing
- Publish the first review candidate before the weekend

### July 11 to July 12

- Mobile polish
- Balance combat
- Fix deployment and review issues
- Add community vote and activity feed if stable

### July 13

- Publish final candidate or required fixes
- Record near-final demo footage
- Complete Devpost submission draft

### July 14

- Regression testing
- Final video edit under one minute
- Verify public test subreddit and demo post
- Freeze non-critical features

### July 15

- Submit well before the 9:00 PM Eastern deadline
- Verify every link from a logged-out or alternate browser session
- Make no high-risk architectural changes

---

## 44. Definition of Done

The MVP is complete when all of the following are true:

1. A new Reddit user can open the post and understand the game without external instructions.
2. The game is playable on desktop and mobile layouts.
3. A player can complete the tutorial using attack, block, counter, and burst.
4. Enemies visibly dodge, block, counter, feint, and expose weak points.
5. A complete run includes combat, a reward, a merchant, an elite or Rival, and a boss.
6. At least three weapons and twelve Gambits function correctly.
7. Death resets the run and can create a valid Fallen Rival.
8. Another player can encounter and avenge a Fallen Rival.
9. The Daily Road seed is shared and server-issued.
10. Valid results appear on a Redis-backed leaderboard.
11. Invalid, expired, and duplicate results do not rank.
12. The app survives refreshes and app updates without relying on local storage for persistent progress.
13. The public demo post is available without payment or access restrictions.
14. The root README explains setup, gameplay, architecture, and testing.
15. The submission video demonstrates gameplay, the Fallen Rival hook, and Reddit community systems in under one minute.
16. All final assets are original or properly licensed.

---

## 45. One-Minute Demo Storyboard

**0 to 5 seconds:** Open the Reddit post. Show the distant fortress and tagline: "Your death becomes someone else's enemy."

**5 to 18 seconds:** Show swipe combat, enemy dodge, directional block, perfect counter, and burst.

**18 to 28 seconds:** Show a Gambit choice with a benefit and drawback, then steal a frost weapon.

**28 to 40 seconds:** Reveal a Fallen Rival carrying another Redditor's weapon. Defeat it and display the avenged notification.

**40 to 50 seconds:** Show the boss phase change and victory.

**50 to 57 seconds:** Show daily leaderboard, community vote, and activity feed.

**57 to 60 seconds:** End card: "Every road is shared. Every death leaves something behind."

---

## 46. AI Implementation Directives

The implementation agent must follow these rules:

1. Begin from the current official Devvit Phaser starter, not an outdated experimental template.
2. Use Devvit MCP `devvit_search` whenever a platform API or configuration detail is uncertain.
3. Build vertical slices. Do not scaffold every scene before combat works.
4. Keep combat formulas, content, timing windows, and rewards in data files.
5. Use strict TypeScript and avoid `any` unless isolated behind a typed adapter.
6. Validate every server request with Zod.
7. Keep all public endpoints under `/api/`.
8. Use Redis for persistent state. Do not rely on local storage for runs, profiles, votes, or rankings.
9. Do not call external services from the client.
10. Do not introduce React, a second game engine, or an external backend without a documented blocker.
11. Write unit tests for deterministic and scoring logic before tuning values.
12. Preserve mobile performance and readable touch controls with every feature.
13. Use placeholder shapes only during development. Replace visible final placeholders before submission.
14. Never copy copyrighted Paper Mario assets or reproduce its exact interface.
15. Treat the Fallen Rival system, responsive combat, and daily leaderboard as core features.
16. Keep P1 and P2 features behind clean interfaces so they can be cut without breaking P0.
17. Update the root README as features become functional, not only at the end.
18. After every milestone, run build, tests, and a local full-run smoke test.
19. Publish a review candidate early enough to absorb Devvit review feedback.
20. Prefer a smaller polished implementation over additional incomplete systems.

---

## 47. Recommended Repository Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "verify": "npm run typecheck && npm run lint && npm run test && npm run build"
  }
}
```

Adapt the exact scripts to the official starter's existing build and Devvit commands rather than deleting working starter configuration.

---

## 48. Final Product Pitch

Fallen Road is a first-person paper-diorama roguelike where every Redditor walks the same dangerous road but creates a different build. Swipe to attack moving weak points, read enemy feints, break guards, counter at the perfect moment, steal elemental weapons, and accept powerful Gambits with dangerous costs. When a player dies, their weapon and build can be inherited by the enemy that defeated them, turning that enemy into a Fallen Rival that invades someone else's run. Defeat the daily boss, avenge the community's fallen travelers, climb the leaderboard, and vote on the curse that shapes tomorrow's road.
