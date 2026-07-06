# My Fallen Friend Asset Sheet

This file is the art contract for the Devvit + Phaser game. The goal is a lightweight, polished, 2D paper-puppet / pop-up book style that is realistic to implement quickly.

## 1. Asset Pipeline

Drop PNG files here:

```txt
src/client/public/assets/
```

Then add each asset to:

```txt
src/client/public/assets/manifest.json
```

Expected manifest format:

```json
[
  { "key": "sky_painting", "file": "sky_painting.png" },
  { "key": "dark_tower", "file": "dark_tower.png" }
]
```

Rules:

- Use lowercase snake_case filenames.
- Match filenames to keys.
- Use transparent PNGs for characters, body parts, UI, weapons, and VFX.
- Use opaque PNGs for full backgrounds.
- Keep procedural fallbacks active so missing art never crashes the game.

## 2. Visual Direction

Style keywords:

- 2D paper-puppet
- Pop-up book
- Cardboard cutout
- Hand-painted parchment
- Thick ink outlines
- Simple layered shadows
- Limited color palette
- Readable silhouettes
- Slightly rough paper edges
- Charming but dangerous fantasy tone

Avoid:

- Photorealistic rendering
- Dense 3D armor detail
- Overly complex lighting
- Tiny unreadable details
- Paper Mario copycat styling
- Obvious AI slop
- Busy HUD elements

## 3. Core Palette

| Purpose | Hex |
|---|---|
| Parchment base | `#E8D7B5` |
| Paper highlight | `#F5E7C8` |
| Cardboard shadow | `#9C7A4A` |
| Ink outline | `#1B1D22` |
| Deep navy background | `#172332` |
| Forest green | `#43583F` |
| Muted grass | `#6F8051` |
| Road stone | `#8D8170` |
| Blood red | `#B64032` |
| Enemy red telegraph | `#D94038` |
| Guard blue | `#3D74A8` |
| Frost blue | `#75B9D8` |
| Burst gold | `#D8AA3D` |
| Leech purple | `#704C86` |
| Smoke gray | `#4A4D52` |
| UI black panel | `#111318` |
| UI white text | `#F2EBD8` |

## 4. Priority Levels

| Priority | Meaning |
|---|---|
| P0 | Wired now or immediately useful. Biggest visual upgrade. |
| P1 | Core gameplay. Needed for polished combat. |
| P2 | Good feel and clarity. Add after core loop works. |
| P3 | Nice-to-have after main submission is stable. |

## 5. P0 Wired Environment and First-Person Assets

| Key | File | Size | Transparent | Priority | Notes |
|---|---:|---:|---:|---:|---|
| `sky_painting` | `sky_painting.png` | 1280x720 | No | P0 | Muted fantasy sky, parchment clouds, distant paper hills. |
| `dark_tower` | `dark_tower.png` | 512x640 | Yes | P0 | Distant fortress/tower silhouette used at road endpoint. |
| `pine_silhouette` | `pine_silhouette.png` | 256x512 | Yes | P0 | Reusable tree cutout for parallax sides. |
| `fog_band` | `fog_band.png` | 1280x256 | Yes | P0 | Low horizontal mist/fog layer. |
| `fp_sword` | `fp_sword.png` | 512x768 | Yes | P0 | First-person sword on right side. Should angle upward. |
| `round_shield` | `round_shield.png` | 640x640 | Yes | P0 | First-person shield on left side, partially cropped by camera. |
| `grain_tile` | `grain_tile.png` | 256x256 | Yes | P0 | Subtle paper grain overlay tile. |
| `vignette_tile` | `vignette_tile.png` | 1280x720 | Yes | P0 | Very subtle dark edge vignette overlay. |

### P0 Art Prompts

#### `sky_painting`
Simplified 2D paper pop-up fantasy sky background, parchment clouds, muted blue-gray sky, distant layered green hills, light paper texture, thick soft cutout edges, clean game background, no characters, 1280x720.

#### `dark_tower`
Transparent PNG of a distant dark fantasy castle tower made from layered cardboard and parchment, thick ink outline, simple silhouette with small red flags, readable from far away, pop-up book asset, no background.

#### `pine_silhouette`
Transparent PNG of a stylized pine tree cutout, layered green cardboard, thick cream edge outline, simple paper texture, readable silhouette, no background.

#### `fog_band`
Transparent PNG of a horizontal low fog band, soft blue-gray translucent paper mist, subtle layered strips, designed to sit across the lower background, no hard edges.

#### `fp_sword`
Transparent PNG of a first-person iron sword angled upward from lower-right, simplified paper/cardboard fantasy style, thick outline, gray blade, brown wrapped hilt, slight blue accent, no background.

#### `round_shield`
Transparent PNG of a first-person round shield, lower-left camera view, blue wooden planks, gray rim, central metal boss, simple worn paper texture, thick outline, no background.

#### `grain_tile`
Seamless transparent paper grain overlay tile, subtle tan fibers and tiny speckles, very low opacity feel, 256x256, no strong marks.

#### `vignette_tile`
Transparent PNG full-screen dark vignette, very subtle black/navy faded edges, clear center, 1280x720.

## 6. P1 Enemy Rig Assets

Enemy art should be supplied as separate body-part PNGs. Do not deliver enemies as one flat image.

Each body part should include transparent padding so the agent can rotate around anchor points. Keep the style simple and readable.

### Rig Naming Pattern

```txt
<archetype>_<part>.png
```

Example:

```txt
road_soldier_head.png
road_soldier_torso.png
road_soldier_arm_front.png
road_soldier_weapon.png
```

### Road Soldier Rig

| Key | File | Size | Transparent | Priority | Notes |
|---|---:|---:|---:|---:|---|
| `road_soldier_head` | `road_soldier_head.png` | 192x192 | Yes | P1 | Helmeted head, angry face, clear target area. |
| `road_soldier_torso` | `road_soldier_torso.png` | 256x320 | Yes | P1 | Basic tunic/armor body. |
| `road_soldier_arm_front` | `road_soldier_arm_front.png` | 160x256 | Yes | P1 | Sword arm, shoulder to hand. |
| `road_soldier_arm_back` | `road_soldier_arm_back.png` | 160x256 | Yes | P1 | Shield arm. |
| `road_soldier_leg_front` | `road_soldier_leg_front.png` | 160x256 | Yes | P1 | Front leg. |
| `road_soldier_leg_back` | `road_soldier_leg_back.png` | 160x256 | Yes | P1 | Back leg. |
| `road_soldier_weapon` | `road_soldier_weapon.png` | 320x128 | Yes | P1 | Simple iron sword. |
| `road_soldier_shield` | `road_soldier_shield.png` | 220x220 | Yes | P1 | Small round enemy shield. |

### Fallen Rival Rig

| Key | File | Size | Transparent | Priority | Notes |
|---|---:|---:|---:|---:|---|
| `fallen_rival_head` | `fallen_rival_head.png` | 192x192 | Yes | P1 | Closed helmet, more intimidating than Road Soldier. |
| `fallen_rival_torso` | `fallen_rival_torso.png` | 280x340 | Yes | P1 | Heavier armor with blue/frost accents. |
| `fallen_rival_arm_front` | `fallen_rival_arm_front.png` | 180x280 | Yes | P1 | Spear arm. |
| `fallen_rival_arm_back` | `fallen_rival_arm_back.png` | 180x280 | Yes | P1 | Shield arm. |
| `fallen_rival_leg_front` | `fallen_rival_leg_front.png` | 170x280 | Yes | P1 | Front armored leg. |
| `fallen_rival_leg_back` | `fallen_rival_leg_back.png` | 170x280 | Yes | P1 | Back armored leg. |
| `fallen_rival_weapon_frost_spear` | `fallen_rival_weapon_frost_spear.png` | 420x160 | Yes | P1 | Frost spear with icy tip. |
| `fallen_rival_shield` | `fallen_rival_shield.png` | 240x240 | Yes | P1 | Blue shield with snowflake emblem. |

### Warden King Boss Rig

| Key | File | Size | Transparent | Priority | Notes |
|---|---:|---:|---:|---:|---|
| `warden_king_head` | `warden_king_head.png` | 256x256 | Yes | P1 | Crowned head, readable boss silhouette. |
| `warden_king_torso` | `warden_king_torso.png` | 420x520 | Yes | P1 | Large layered armor body. |
| `warden_king_arm_front` | `warden_king_arm_front.png` | 260x420 | Yes | P1 | Giant weapon arm. |
| `warden_king_arm_back` | `warden_king_arm_back.png` | 260x420 | Yes | P1 | Guarding arm/shield side. |
| `warden_king_leg_front` | `warden_king_leg_front.png` | 220x360 | Yes | P1 | Large front leg. |
| `warden_king_leg_back` | `warden_king_leg_back.png` | 220x360 | Yes | P1 | Large back leg. |
| `warden_king_weapon_hammer` | `warden_king_weapon_hammer.png` | 520x220 | Yes | P1 | Oversized paper hammer/maul. |
| `warden_king_cape` | `warden_king_cape.png` | 480x520 | Yes | P2 | Optional cape layer behind torso. |

### Enemy Rig Art Prompt Template

```txt
Transparent PNG game asset for "My Fallen Friend", simplified 2D paper-puppet fantasy style, pop-up book cardboard cutout, thick ink outline, limited palette, parchment texture, readable silhouette, no background. Asset: [BODY PART DESCRIPTION]. Designed as a separate articulated sprite for Phaser tween animation, with transparent padding around the part.
```

## 7. P1 Weapons and Item Assets

| Key | File | Size | Transparent | Priority | Notes |
|---|---:|---:|---:|---:|---|
| `weapon_iron_sword` | `weapon_iron_sword.png` | 320x128 | Yes | P1 | Basic balanced sword. |
| `weapon_fire_sword` | `weapon_fire_sword.png` | 320x128 | Yes | P2 | Sword with paper flame accent. |
| `weapon_frost_spear` | `weapon_frost_spear.png` | 420x160 | Yes | P1 | Spear with icy blue tip. |
| `weapon_leech_dagger` | `weapon_leech_dagger.png` | 260x128 | Yes | P2 | Purple leech dagger. |
| `weapon_hammer` | `weapon_hammer.png` | 420x180 | Yes | P2 | Heavy guard-breaking hammer. |
| `item_health_potion` | `item_health_potion.png` | 128x128 | Yes | P2 | Parchment bottle, red liquid. |
| `item_gambit_card_back` | `item_gambit_card_back.png` | 256x360 | Yes | P2 | Back of reward card. |
| `item_gambit_card_frame` | `item_gambit_card_frame.png` | 256x360 | Yes | P2 | Empty frame for Gambit rewards. |

## 8. P1 UI Assets

| Key | File | Size | Transparent | Priority | Notes |
|---|---:|---:|---:|---:|---|
| `ui_heart_full` | `ui_heart_full.png` | 64x64 | Yes | P1 | Red paper heart. |
| `ui_heart_empty` | `ui_heart_empty.png` | 64x64 | Yes | P1 | Dark torn heart. |
| `ui_guard_icon` | `ui_guard_icon.png` | 64x64 | Yes | P1 | Blue shield icon. |
| `ui_burst_icon` | `ui_burst_icon.png` | 64x64 | Yes | P1 | Gold starburst icon. |
| `ui_button_guard` | `ui_button_guard.png` | 160x160 | Yes | P2 | Round mobile guard button. |
| `ui_button_dodge` | `ui_button_dodge.png` | 160x160 | Yes | P2 | Round mobile dodge button. |
| `ui_panel_parchment` | `ui_panel_parchment.png` | 512x256 | Yes | P2 | Stretchable parchment panel. |
| `ui_banner_dark` | `ui_banner_dark.png` | 768x160 | Yes | P2 | Dark feedback banner. |
| `ui_crosshair_weakpoint` | `ui_crosshair_weakpoint.png` | 96x96 | Yes | P1 | Red weak-point target marker. |
| `ui_status_frost` | `ui_status_frost.png` | 64x64 | Yes | P2 | Frost status icon. |
| `ui_status_fire` | `ui_status_fire.png` | 64x64 | Yes | P2 | Fire status icon. |
| `ui_status_leech` | `ui_status_leech.png` | 64x64 | Yes | P2 | Leech status icon. |

## 9. P2 VFX Assets

| Key | File | Size | Transparent | Priority | Notes |
|---|---:|---:|---:|---:|---|
| `vfx_red_telegraph_arc` | `vfx_red_telegraph_arc.png` | 768x256 | Yes | P1 | Enemy attack warning arc. |
| `vfx_white_swipe_arc` | `vfx_white_swipe_arc.png` | 768x256 | Yes | P1 | Player swipe trail. |
| `vfx_guard_spark` | `vfx_guard_spark.png` | 256x256 | Yes | P2 | Block/counter impact burst. |
| `vfx_guard_break` | `vfx_guard_break.png` | 384x384 | Yes | P2 | Cracked paper explosion. |
| `vfx_burst_slash` | `vfx_burst_slash.png` | 1024x512 | Yes | P2 | Large gold/white burst strike. |
| `vfx_frost_overlay` | `vfx_frost_overlay.png` | 384x384 | Yes | P2 | Blue ice shards around target. |
| `vfx_fire_overlay` | `vfx_fire_overlay.png` | 384x384 | Yes | P2 | Red/orange paper flame overlay. |
| `vfx_leech_overlay` | `vfx_leech_overlay.png` | 384x384 | Yes | P3 | Purple drain effect. |
| `vfx_paper_fragments` | `vfx_paper_fragments.png` | 512x512 | Yes | P2 | Small torn paper debris particles. |

## 10. P2 Environment Props

| Key | File | Size | Transparent | Priority | Notes |
|---|---:|---:|---:|---:|---|
| `road_tile` | `road_tile.png` | 512x512 | No | P2 | Repeatable stone/paper road tile. |
| `road_side_grass` | `road_side_grass.png` | 512x256 | Yes | P2 | Grass edge layer. |
| `grave_marker` | `grave_marker.png` | 192x256 | Yes | P2 | Fallen Rival area prop. |
| `wood_sign_kingdom` | `wood_sign_kingdom.png` | 320x240 | Yes | P2 | Sign reading "The Kingdom Lies Ahead". |
| `banner_wolf` | `banner_wolf.png` | 192x320 | Yes | P2 | Red banner with simple wolf emblem. |
| `merchant_cart` | `merchant_cart.png` | 640x480 | Yes | P3 | Merchant stop prop. |
| `castle_gate` | `castle_gate.png` | 960x720 | Yes | P2 | Final boss background gate. |

## 11. Audio Shopping List

Audio is not wired yet, but should be prepared early.

Format recommendation:

- Music: `.ogg` loop, optionally `.mp3` fallback
- SFX: `.ogg`, short and compressed
- Keep files small
- Audio must start only after a user gesture
- Include a mute button

| Key | File | Duration | Priority | Notes |
|---|---:|---:|---:|---|
| `music_road_loop` | `music_road_loop.ogg` | 45-75 sec | P2 | Light tension, fantasy paper adventure. |
| `sfx_swipe` | `sfx_swipe.ogg` | <1 sec | P2 | Sword swipe. |
| `sfx_hit` | `sfx_hit.ogg` | <1 sec | P2 | Normal hit. |
| `sfx_weakpoint` | `sfx_weakpoint.ogg` | <1 sec | P2 | Weak-point hit. |
| `sfx_block` | `sfx_block.ogg` | <1 sec | P2 | Shield block. |
| `sfx_perfect_counter` | `sfx_perfect_counter.ogg` | <1.5 sec | P2 | Rewarding counter sound. |
| `sfx_guard_break` | `sfx_guard_break.ogg` | <1.5 sec | P2 | Paper crack/break. |
| `sfx_burst_ready` | `sfx_burst_ready.ogg` | <1 sec | P2 | Meter full notification. |
| `sfx_burst_strike` | `sfx_burst_strike.ogg` | <2 sec | P2 | Big special attack. |
| `sfx_enemy_defeated` | `sfx_enemy_defeated.ogg` | <1.5 sec | P2 | Paper collapse/death. |

## 12. Minimum Asset Set for a Strong MVP

The fastest path to visual polish:

1. `sky_painting`
2. `dark_tower`
3. `pine_silhouette`
4. `fog_band`
5. `fp_sword`
6. `round_shield`
7. `road_soldier_*` rig
8. `fallen_rival_*` rig
9. `warden_king_*` rig
10. `ui_crosshair_weakpoint`
11. `vfx_red_telegraph_arc`
12. `vfx_white_swipe_arc`
13. `vfx_guard_spark`
14. `vfx_burst_slash`
15. One music loop
16. Core combat SFX

If time is tight, skip props and make the background layers do the work.

## 13. Notes for the AI Coding Agent

- Always keep procedural fallbacks active.
- Missing assets should never crash the game.
- Use asset availability checks before adding sprites.
- Every rig part should have a default anchor point.
- Body parts should be individually tweened, not frame-animated at first.
- Prioritize silhouette clarity over detail.
- UI must remain readable on mobile.
- Audio must be gesture-gated and mutable.
- Add one asset category at a time, then verify build.
