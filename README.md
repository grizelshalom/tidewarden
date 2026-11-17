[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/grizelshalom/tidewarden/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/grizelshalom/tidewarden/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# TIDEWARDEN — Hold the line against the sea

Play the bounty: https://make.fun/bounty/best-game-01

A tide-control defense game. The sea sends crabs, gulls, turtles — and on
wave 10, the Tide King himself — marching on your lighthouse village. You
have towers, and you have **one mechanic: the tide**.

## The one mechanic

Hold **SPACE** (or hold the big **TIDE** button) to raise the tide; release
to let it ebb. Water drowns whatever marches in it — but it also floods
your own towers (submerged towers cannot fire) and above **85%** the village
**leaks** a heart every 3 seconds. The whole game is timing the tide: surge
it to wash a wave away, drop it so your towers can shoot.

## Towers (buy with shells earned from kills)

- **Harpoon Tower** (40 🐚) — fast harpoons, the only tower that hits gulls.
- **Tidepool** (30 🐚) — slows everything nearby by 45%.
- **Pearl Mortar** (60 🐚) — heavy splash damage, ground targets only.

Click a tower card, then a sand plot to build. Click a built tower to sell
it for half its cost.

## Enemies

- 🦀 **Crab** — drowns like everything else.
- 🕊 **Gull** — flies over the water, immune to drowning. Shoot it.
- 🐢 **Turtle** — tough, drowns at half rate, costs 2 hearts if it lands.
- 👑 **Tide King** (wave 10) — cannot drown at all. Drop the tide and shoot.

## Win / lose

Survive all **10 waves** to win. Lose if the village's 12 hearts reach zero.
Score comes from kills, wave-clear bonuses and hearts left at victory. Your
best score is saved on this machine.

## Controls

- **SPACE (hold)** / hold the TIDE button — raise the tide
- **Mouse** — build and sell towers
- **1 / 2 / 3** — select a tower · **N** — send the next wave early
- **P** pause · **M** mute · **R** restart · **Enter** start / play again

## Tech

Plain static files, no build step, no network, no external assets. Canvas 2D
with a tiny WebAudio synth for surf, harpoons, coins and jingles. Source is
split by job: `config.js` (tuning), `world.js` (rules), `render.js`
(drawing), `input.js`, `audio.js`, `random.js`, `storage.js`, `shots.js`
(deterministic screenshot scenes), `main.js` (loop).

Serve locally with `node serve.ts` and open http://localhost:8080.
