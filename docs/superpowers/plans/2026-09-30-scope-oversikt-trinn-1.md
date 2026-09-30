# Scope Oversikt (trinn 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-column Oversikt on `/test` with the approved «Dagen først» dashboard (I dag card with hourly chart, Gjør dette nå, Siste 7 dager) on top of a new shared design system, and delete the CSS it makes obsolete.

**Architecture:** Pure number logic lives in `scope-insights.js` (tested with `node --test`). A new `scope-chart.js` draws the shared bar chart, a new `scope-overview.js` renders Oversikt from a plain model object, and a new `scope-ui.css` holds tokens, `ui-` components and the `ov-` layout. `test.js` keeps owning state: its `renderDash()` only builds the model and wires actions. Dead rules in `test.css` are removed afterwards by a class-usage pruner, guarded by computed-style signatures.

**Tech Stack:** Vanilla ES modules (dynamic `import()` with `?v=` cache tags), plain CSS, Node 20 `node:test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-29-scope-dashboard-redesign-design.md`

## Global Constraints

- UI copy is Norwegian bokmål. Never call a simplified mode «Lett»; the view levels stay Rask / Vanlig / Avansert and still only filter the menu.
- Font stays Inter. Light mode is primary; dark mode must be complete. Green/red only for direction of change.
- Tokens (light): `--paper #ffffff`, `--rail #f7f6f3`, `--line #ebe8e2`, `--line-strong #dcd8d0`, `--ink #171715`, `--muted #6b675f`, `--faint #9a958c`, `--hover #f1efea`, `--active #e7e3db`, `--accent #1f4fe0`, `--accent-soft #eaf0fd`, `--accent-line #b9c9f6`, `--pos #0f8a5f`, `--pos-soft #e5f4ec`, `--neg #cf3a31`, `--neg-soft #fbeceb`. Radius 14 px cards, 9 px controls.
- Oversikt must fit 1440×900 and 1280×720 with no scrolling in `#content-body` (`scrollHeight <= clientHeight`).
- No new dependencies.
- Every change to `test.css`, `scope-ui.css`, `test.js`, `scope-insights.js`, `scope-overview.js` or `scope-chart.js` bumps all `?v=` tags with:
  `V="redesign-$(date +%m%d%H%M%S)"; sed -i '' -E "s/(test\.css|test\.js|scope-ui\.css|scope-insights\.js|scope-overview\.js|scope-chart\.js)\?v=[A-Za-z0-9-]+/\1?v=$V/g" test.html test.js scope-overview.js 2>/dev/null; true`
- `npm test` binds 127.0.0.1 for server tests, which the sandbox blocks (`listen EPERM`). Run it outside the sandbox. Baseline: 132 pass, 0 fail.
- Do not touch unrelated in-progress files in the working tree: `enkel-mork*`, `index.html`, `landing-velger.*`, `landing-enkel-mork.html`, `docs/scope-18-art-direction.md`. Stage files by name, never `git add -A`.
- Commit to `main` after each task (English, imperative, explains why, ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`). Push and deploy only in Task 8.
- Browser checks use the dev server `scope` from `.claude/launch.json` (port 4180): `http://localhost:4180/test?cb=<anything>#oversikt`.

## File Structure

| File | Status | Responsibility |
| --- | --- | --- |
| `scope-insights.js` | modify | Pure demo math: advice with prices, normal day, actuals, forecast, staffing, `buildToday` |
| `scope-chart.js` | create | `niceScale()` and `barChart()` – shared SVG bar chart with keyboard/hover tooltip |
| `scope-overview.js` | create | `change()` and `renderOverview(root, model, actions)` – Oversikt view only |
| `scope-ui.css` | create | Tokens (light/dark), `ui-` components, chart styles, `ov-` layout |
| `test.js` | modify | Imports, task helpers, `hubTasks`, `setTask` focus, new `renderDash`, minute refresh |
| `test.html` | modify | Load `scope-ui.css`, cache tags |
| `test.css` | modify (Task 7) | Remove rules for classes no source uses any more |
| `tests/insights.test.mjs` | modify | Advice pricing + day model tests |
| `tests/overview.test.mjs` | create | `niceScale` and `change` tests |

---

### Task 1: Park the September WIP and price the advice

The working tree holds an unreviewed WIP from 13 Sep in five files. Ole chose to reuse its ideas, not its code. Park it in a named stash (recoverable), keep only its advice function and test, then extend that function with a value per action.

**Files:**
- Modify: `scope-insights.js` (the `buildOperationalAdvice` function at the end of the file)
- Test: `tests/insights.test.mjs`

**Interfaces:**
- Produces: `buildOperationalAdvice(profile, tomorrow, weekRevenue)` → array sorted by priority of `{id: 'cost'|'plan'|'receipts', category, horizon, view, action, title, basis, text, value, valueNote, priority}`. `profile` needs `varekost`, `bilag`; `tomorrow` is `{guests, staff, date}`; `weekRevenue` is kroner for a normal week.

- [ ] **Step 1: Park the WIP and restore the advice function**

```bash
git stash push -m "wip 2026-09-13 overview (pre-redesign)" -- test.js test.css test.html scope-insights.js tests/insights.test.mjs
git checkout 'stash@{0}' -- scope-insights.js tests/insights.test.mjs
git status --short test.js test.css test.html scope-insights.js tests/insights.test.mjs
```

Expected: only `M  scope-insights.js` and `M  tests/insights.test.mjs` are listed; `test.js`, `test.css`, `test.html` are clean (identical to `HEAD`).

- [ ] **Step 2: Write the failing test**

In `tests/insights.test.mjs`, replace the whole test that starts with `test('operational advice uses real gaps, staffing pressure and missing receipt counts'` with:

```js
test('operational advice uses real gaps, staffing pressure and missing receipt counts', async () => {
  const {buildOperationalAdvice} = await import('../scope-insights.js');
  const thursday = new Date(2026, 9, 1);
  const busy = buildOperationalAdvice({varekost: 32, bilag: 3}, {guests: 110, staff: 5, date: thursday}, 500000);
  assert.equal(busy[0].id, 'plan');
  assert.match(busy[0].title, /2 ekstra/);
  assert.match(busy.find(x => x.id === 'receipts').title, /3 manglende kvitteringer/);
  assert.match(busy.find(x => x.id === 'cost').title, /tre største innkjøpene/);
  const quiet = buildOperationalAdvice({varekost: 28, bilag: 0}, {guests: 35, staff: 4, date: thursday}, 500000);
  assert.equal(quiet.length, 2);
  assert.match(quiet.find(x => x.id === 'plan').title, /prep/);
  assert.doesNotMatch(quiet.find(x => x.id === 'cost').title, /prisene/);
  assert.ok(quiet.every(x => !x.text.includes('spar')));
});

test('operational advice prices the cost gap and names tomorrow evening', async () => {
  const {buildOperationalAdvice} = await import('../scope-insights.js');
  const thursday = new Date(2026, 9, 1);
  const busy = buildOperationalAdvice({varekost: 32, bilag: 3}, {guests: 110, staff: 5, date: thursday}, 500000);
  const cost = busy.find(x => x.id === 'cost');
  assert.equal(cost.value.replace(/\s/g, ' '), 'kr 10 000');
  assert.equal(cost.valueNote, 'per uke');
  const plan = busy.find(x => x.id === 'plan');
  assert.equal(plan.value, '+2 på vakt');
  assert.equal(plan.valueNote, 'torsdag kveld');
  assert.equal(busy.find(x => x.id === 'receipts').value, '3 igjen');
  const quiet = buildOperationalAdvice({varekost: 28, bilag: 0}, {guests: 35, staff: 4, date: thursday}, 500000);
  assert.equal(quiet.find(x => x.id === 'plan').value, '35 gjester');
  assert.equal(quiet.find(x => x.id === 'cost').value, 'Lager');
  assert.ok(busy.concat(quiet).every(x => x.value && x.valueNote && x.action));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/insights.test.mjs`
Expected: FAIL in «prices the cost gap» (`cost.value` is undefined → `TypeError: Cannot read properties of undefined (reading 'replace')`).

- [ ] **Step 4: Implement**

In `scope-insights.js`, replace the whole `buildOperationalAdvice` function (from the comment line `// Advice is grounded in the same demo profile` to the end of the file) with:

```js
// Advice is grounded in the same demo profile and evening staffing model as the UI.
// weekRevenue is a normal week for the same places; it prices the cost gap.
export function buildOperationalAdvice(profile, tomorrow, weekRevenue) {
  const format = new Intl.NumberFormat('nb-NO', {maximumFractionDigits: 1});
  const whole = new Intl.NumberFormat('nb-NO', {maximumFractionDigits: 0});
  const evening = new Intl.DateTimeFormat('nb-NO', {weekday: 'long'}).format(tomorrow.date) + ' kveld';
  const costAbove = profile.varekost > 30;
  const costGap = Math.round(weekRevenue * (profile.varekost - 30) / 100 / 100) * 100;
  const ratio = tomorrow.staff > 0 ? tomorrow.guests / tomorrow.staff : 0;
  const extra = Math.max(0, Math.ceil(tomorrow.guests / 18) - tomorrow.staff);
  const advice = [{
    id: 'cost', category: 'Varekost', horizon: 'Denne uken', view: 'varekost', action: 'Se innkjøp',
    title: costAbove ? 'Sjekk prisen på de tre største innkjøpene' : 'Tell de ti dyreste råvarene før neste bestilling',
    basis: 'Varekost '+format.format(profile.varekost)+' % · målet er 30 %',
    text: costAbove ? 'Sammenlign de to siste fakturaene. Avklar prisøkninger før neste bestilling.' : 'Sjekk lageret mot forbruket, og trekk beholdningen fra bestillingen.',
    value: costAbove ? 'kr '+whole.format(costGap) : 'Lager',
    valueNote: costAbove ? 'per uke' : 'før bestilling',
    priority: costAbove ? 3 : 1
  }, {
    id: 'plan', category: 'Bemanning', horizon: 'I morgen', view: 'bemanning', action: 'Se vaktplan',
    title: extra ? 'Avklar '+extra+' ekstra på kveldsvakten i morgen' : ratio < 15 ? 'Gjør prep før kveldsvakten' : 'Bekreft bemanningen før morgendagens kveldsvakt',
    basis: whole.format(Math.round(tomorrow.guests))+' forventede gjester · '+tomorrow.staff+' på vakt',
    text: extra ? 'Anslaget er '+format.format(ratio)+' gjester per ansatt. Sjekk bookingene og avklar ekstrahjelp før du endrer vaktplanen.' : ratio < 15 ? 'Flytt varepåfyll til rolige timer. Behold dekning når gjestene kommer.' : 'Gå gjennom bookingene med vaktleder. Fordel bord og pauser før serveringen starter.',
    value: extra ? '+'+extra+' på vakt' : whole.format(Math.round(tomorrow.guests))+' gjester',
    valueNote: evening,
    priority: extra ? 4 : 1
  }];
  if (profile.bilag > 0) advice.push({
    id: 'receipts', category: 'Regnskap', horizon: 'Før periodeslutt', view: 'resultat', action: 'Se sjekkliste',
    title: 'Hent '+profile.bilag+' manglende '+(profile.bilag===1?'kvittering':'kvitteringer'),
    basis: profile.bilag+' bilag mangler vedlegg',
    text: 'Be kjøperen sende kvitteringene før periodeslutt.',
    value: profile.bilag+' igjen', valueNote: 'før periodeslutt',
    priority: 2
  });
  return advice.sort((a,b)=>b.priority-a.priority);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/insights.test.mjs`
Expected: all tests in the file pass (7 tests, 0 fail).

- [ ] **Step 6: Commit**

```bash
git add scope-insights.js tests/insights.test.mjs
git commit -m "$(printf 'Price each overview action so the list says what it is worth\n\nThe advice now carries a short value and note (kr per week, staff\nneeded tomorrow evening, receipts left) for the new overview rows.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

---

### Task 2: Day model for «I dag»

**Files:**
- Modify: `scope-insights.js` (append)
- Test: `tests/insights.test.mjs` (append)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (all exported from `scope-insights.js`):
  - `OPEN_HOUR` = `11`
  - `normalDay(dayRevenue, dayGuests, hourWeights)` → `[{hour, revenue, guests}]`, one per weight, hours from 11.
  - `seededRandom(text)` → `() => number` in `[0,1)`, same sequence for same text.
  - `dayActuals(normal, seed, now: Date)` → `[{hour, share, revenue, guests}]`; `share` 0…1 is how much of the hour has passed.
  - `forecastDay(normal, actuals)` → `{pace, hours: [{hour, revenue, guests}], revenue, guests}`.
  - `staffAt(plannedStaff, hour)` → integer on the floor that hour (0 outside 11–24).
  - `buildToday({dayRevenue, dayGuests, hourWeights, seed, now, plannedStaff})` → `{phase: 'before'|'open', nowIndex, hours: [{hour, share, actual, normal, forecast, forecastGuests}], revenue, guests, normalRevenue, normalGuests, forecastRevenue, forecastGuests, normalDayRevenue, plannedStaff, staffNow}`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/insights.test.mjs`:

```js
const W13 = [0.03, 0.09, 0.1, 0.05, 0.04, 0.05, 0.09, 0.14, 0.15, 0.12, 0.08, 0.04, 0.02];
const at = (h, m) => new Date(2026, 8, 29, h, m);

test('a normal day spreads the whole day over the opening hours', async () => {
  const {normalDay, OPEN_HOUR} = await import('../scope-insights.js');
  assert.equal(OPEN_HOUR, 11);
  const day = normalDay(10000, 100, [0.25, 0.25, 0.5]);
  assert.deepEqual(day.map(s => s.hour), [11, 12, 13]);
  assert.equal(day.reduce((s, x) => s + x.revenue, 0), 10000);
  assert.equal(day[2].guests, 50);
});

test('demo actuals are stable per seed and a finished hour never changes', async () => {
  const {normalDay, dayActuals} = await import('../scope-insights.js');
  const normal = normalDay(65550, 161, W13);
  const seed = 'Heim Jessheim|2026-9-29';
  const afternoon = dayActuals(normal, seed, at(16, 30));
  const evening = dayActuals(normal, seed, at(20, 0));
  assert.deepEqual(afternoon.slice(0, 5), evening.slice(0, 5));
  assert.equal(afternoon[5].share, 0.5);
  assert.equal(afternoon[6].share, 0);
  assert.equal(afternoon[6].revenue, 0);
  assert.deepEqual(dayActuals(normal, seed, at(20, 0)), evening);
  assert.notDeepEqual(dayActuals(normal, 'Heim Hamar|2026-9-29', at(20, 0)), evening);
});

test('forecast keeps what is sold and adds the rest at a damped pace', async () => {
  const {normalDay, forecastDay} = await import('../scope-insights.js');
  const normal = normalDay(1000, 10, [0.5, 0.5]);
  const f = forecastDay(normal, [{hour: 11, share: 1, revenue: 600, guests: 6}, {hour: 12, share: 0, revenue: 0, guests: 0}]);
  assert.equal(f.pace, 1.2);
  assert.equal(f.hours[0].revenue, 600);
  assert.equal(f.hours[1].revenue, 560);
  assert.equal(f.revenue, 1160);
  assert.equal(f.guests, 12);
  const untouched = forecastDay(normal, [{hour: 11, share: 0, revenue: 0, guests: 0}, {hour: 12, share: 0, revenue: 0, guests: 0}]);
  assert.equal(untouched.pace, 1);
  assert.equal(untouched.revenue, 1000);
});

test('staff on the floor follows the evening shape and is zero when closed', async () => {
  const {staffAt} = await import('../scope-insights.js');
  assert.equal(staffAt(6, 9), 0);
  assert.equal(staffAt(6, 12), 3);
  assert.equal(staffAt(6, 17), 5);
  assert.equal(staffAt(6, 19), 6);
  assert.equal(staffAt(6, 23), 4);
  assert.equal(staffAt(1, 12), 1);
});

test('before opening the day is all forecast; during service it splits at the clock', async () => {
  const {buildToday} = await import('../scope-insights.js');
  const base = {dayRevenue: 65550, dayGuests: 161, hourWeights: W13, seed: 'Heim Jessheim|2026-9-29', plannedStaff: 6};
  const early = buildToday({...base, now: at(9, 0)});
  assert.equal(early.phase, 'before');
  assert.equal(early.nowIndex, -1);
  assert.equal(early.revenue, 0);
  assert.equal(early.staffNow, 0);
  assert.ok(Math.abs(early.forecastRevenue - 65550) <= 7);
  assert.ok(early.hours.every(h => h.actual === 0 && h.forecast > 0));
  const mid = buildToday({...base, now: at(19, 30)});
  assert.equal(mid.phase, 'open');
  assert.equal(mid.nowIndex, 8);
  assert.equal(mid.hours[8].share, 0.5);
  assert.equal(mid.revenue, mid.hours.reduce((s, h) => s + h.actual, 0));
  assert.ok(mid.forecastRevenue > mid.revenue);
  assert.ok(mid.hours.slice(0, 8).every(h => h.forecast === h.actual));
  assert.equal(mid.staffNow, 6);
  assert.equal(buildToday({...base, now: at(23, 59)}).nowIndex, 12);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/insights.test.mjs`
Expected: the five new tests FAIL (`normalDay is not a function` etc.); earlier tests still pass.

- [ ] **Step 3: Implement**

Append to `scope-insights.js`:

```js

// ---- «I dag» on the overview ---------------------------------------------
// The demo has no real till, so today is a normal weekday with a steady,
// seeded swing. Same place + date gives the same day on every reload.
export const OPEN_HOUR = 11;

export function normalDay(dayRevenue, dayGuests, hourWeights) {
  return hourWeights.map((weight, index) => ({hour: OPEN_HOUR + index, revenue: dayRevenue * weight, guests: dayGuests * weight}));
}

export function seededRandom(text) {
  let h = 2166136261;
  for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return function () {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Every factor is drawn in the same order whatever the time, so an hour that
// is finished keeps its number for the rest of the day.
export function dayActuals(normal, seed, now) {
  const random = seededRandom(seed);
  const level = -0.06 + random() * 0.16;
  const clock = now.getHours() + now.getMinutes() / 60;
  return normal.map(slot => {
    const revenueFactor = 1 + level + (random() - 0.5) * 0.24;
    const guestFactor = 1 + level * 0.7 + (random() - 0.5) * 0.16;
    const share = Math.max(0, Math.min(1, clock - slot.hour));
    return {hour: slot.hour, share, revenue: Math.round(slot.revenue * revenueFactor * share), guests: Math.round(slot.guests * guestFactor * share)};
  });
}

// What is sold so far, plus the rest of a normal day at a damped pace, so a
// strong lunch does not get extrapolated over the whole evening.
export function forecastDay(normal, actuals) {
  const normalSoFar = normal.reduce((sum, slot, index) => sum + slot.revenue * actuals[index].share, 0);
  const soFar = actuals.reduce((sum, slot) => sum + slot.revenue, 0);
  const pace = normalSoFar > 0 ? soFar / normalSoFar : 1;
  const damped = 1 + (pace - 1) * 0.6;
  const hours = normal.map((slot, index) => {
    const actual = actuals[index], rest = 1 - actual.share;
    return {hour: slot.hour, revenue: Math.round(actual.revenue + slot.revenue * rest * damped), guests: Math.round(actual.guests + slot.guests * rest * damped)};
  });
  return {pace, hours, revenue: hours.reduce((sum, h) => sum + h.revenue, 0), guests: hours.reduce((sum, h) => sum + h.guests, 0)};
}

// Same shape as the evening staffing model: thin at lunch, full for dinner.
export function staffAt(plannedStaff, hour) {
  if (hour < OPEN_HOUR || hour >= 24) return 0;
  return Math.max(1, Math.round(plannedStaff * (hour < 16 ? 0.55 : hour < 18 ? 0.75 : hour < 22 ? 1 : 0.7)));
}

export function buildToday({dayRevenue, dayGuests, hourWeights, seed, now, plannedStaff}) {
  const normal = normalDay(dayRevenue, dayGuests, hourWeights);
  const actuals = dayActuals(normal, seed, now);
  const forecast = forecastDay(normal, actuals);
  const clock = now.getHours() + now.getMinutes() / 60;
  const nowIndex = clock < OPEN_HOUR ? -1 : Math.min(normal.length - 1, Math.floor(clock) - OPEN_HOUR);
  const normalSoFar = key => normal.reduce((sum, slot, index) => sum + slot[key] * actuals[index].share, 0);
  return {
    phase: nowIndex < 0 ? 'before' : 'open',
    nowIndex,
    hours: normal.map((slot, index) => ({
      hour: slot.hour, share: actuals[index].share, actual: actuals[index].revenue, normal: Math.round(slot.revenue),
      forecast: forecast.hours[index].revenue, forecastGuests: forecast.hours[index].guests
    })),
    revenue: actuals.reduce((sum, slot) => sum + slot.revenue, 0),
    guests: actuals.reduce((sum, slot) => sum + slot.guests, 0),
    normalRevenue: normalSoFar('revenue'),
    normalGuests: normalSoFar('guests'),
    forecastRevenue: forecast.revenue,
    forecastGuests: forecast.guests,
    normalDayRevenue: dayRevenue,
    plannedStaff,
    staffNow: staffAt(plannedStaff, Math.floor(clock))
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/insights.test.mjs`
Expected: PASS, 12 tests, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add scope-insights.js tests/insights.test.mjs
git commit -m "$(printf 'Model today against a normal weekday for the overview\n\nA seeded, stable demo day with a damped forecast and floor staffing,\nso the I dag card can compare so far, normal and expected.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

---

### Task 3: Design system stylesheet

**Files:**
- Create: `scope-ui.css`
- Modify: `test.html:10` (add the stylesheet after `test.css`)

**Interfaces:**
- Produces CSS custom properties on `.app` (names in Global Constraints plus `--bar-neutral`, `--bar-neutral-hover`, `--grid`, `--tip-bg`, `--tip-ink`, `--tip-muted`, `--radius-card`, `--radius-control`) and classes: `ui-card`, `ui-panel-head`, `ui-btn`, `ui-btn-primary`, `ui-link`, `ui-seg` (buttons with `aria-pressed`), `ui-delta` / `ui-chip` with `is-up|is-down|is-flat`, `ui-stat-label`, `ui-stat-value`, `ui-stat-meta`, `ui-row`, `ui-empty`, and chart classes `ui-chart`, `ui-chart-grid` (`is-base`), `ui-chart-axis`, `ui-chart-label` (`is-current`), `ui-chart-bar` (`is-current`), `ui-chart-ghost`, `ui-chart-line`, `ui-chart-now`, `ui-chart-hits`, `ui-tip`; `.ui-chart[data-tone=neutral]` greys non-current bars.

- [ ] **Step 1: Create `scope-ui.css`**

```css
/* ==========================================================================
   Scope UI – felles designsystem for arbeidsflaten (/test).
   Lastes etter test.css. Tokens på .app; mørk modus under [data-theme=dark].
   Grønt og rødt betyr bare opp og ned. Blått er «i dag» / valgt periode.
   ========================================================================== */

.app {
  --paper: #ffffff;
  --rail: #f7f6f3;
  --line: #ebe8e2;
  --line-strong: #dcd8d0;
  --ink: #171715;
  --muted: #6b675f;
  --faint: #9a958c;
  --hover: #f1efea;
  --active: #e7e3db;
  --accent: #1f4fe0;
  --accent-soft: #eaf0fd;
  --accent-line: #b9c9f6;
  --pos: #0f8a5f;
  --pos-soft: #e5f4ec;
  --neg: #cf3a31;
  --neg-soft: #fbeceb;
  --bar-neutral: #e4e0d8;
  --bar-neutral-hover: #cfcac0;
  --grid: #f1eee8;
  --tip-bg: #171715;
  --tip-ink: #ffffff;
  --tip-muted: #bdb8ae;
  --radius-card: 14px;
  --radius-control: 9px;
}

.app[data-theme=dark] {
  --paper: #191918;
  --rail: #211f1e;
  --line: #2f2c29;
  --line-strong: #423e39;
  --ink: #ece9e4;
  --muted: #a49f97;
  --faint: #7d786f;
  --hover: #262422;
  --active: #34302b;
  --accent: #7d9bff;
  --accent-soft: #1d2640;
  --accent-line: #3b4f86;
  --pos: #4fc98f;
  --pos-soft: #1b3128;
  --neg: #f08278;
  --neg-soft: #3a2220;
  --bar-neutral: #3a3632;
  --bar-neutral-hover: #4a4540;
  --grid: #262422;
  --tip-bg: #ece9e4;
  --tip-ink: #171715;
  --tip-muted: #5f5a52;
}

/* --- Byggeklosser -------------------------------------------------------- */

.ui-card { background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius-card); }

.ui-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ui-panel-head h2 { margin: 0; color: var(--ink); font-size: 15px; font-weight: 600; letter-spacing: -.01em; }
.ui-panel-head h2 small { margin-left: 6px; color: var(--muted); font-size: 13px; font-weight: 400; letter-spacing: 0; }

.ui-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px;
  border: 1px solid var(--line-strong); border-radius: var(--radius-control);
  background: var(--paper); color: var(--ink); font: inherit; font-size: 13px; font-weight: 500;
  white-space: nowrap; cursor: pointer;
}
.ui-btn:hover { background: var(--hover); }
.ui-btn-primary { border-color: var(--ink); background: var(--ink); color: var(--paper); }
.ui-btn-primary:hover { border-color: var(--accent); background: var(--accent); color: #fff; }

.ui-link { padding: 4px 6px; border: 0; border-radius: 6px; background: none; color: var(--muted); font: inherit; font-size: 12.5px; cursor: pointer; }
.ui-link:hover { background: var(--hover); color: var(--ink); }

.ui-seg { display: inline-flex; padding: 2px; border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--rail); }
.ui-seg button { padding: 4px 10px; border: 0; border-radius: 7px; background: none; color: var(--muted); font: inherit; font-size: 12.5px; cursor: pointer; }
.ui-seg button:hover { color: var(--ink); }
.ui-seg button[aria-pressed=true] { background: var(--paper); color: var(--ink); font-weight: 500; box-shadow: 0 1px 2px rgb(0 0 0 / 6%); }

.ui-delta { font-size: 12.5px; font-weight: 500; white-space: nowrap; }
.ui-delta.is-up { color: var(--pos); }
.ui-delta.is-down { color: var(--neg); }
.ui-delta.is-flat { color: var(--muted); }

.ui-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 500; white-space: nowrap; }
.ui-chip.is-up { background: var(--pos-soft); color: var(--pos); }
.ui-chip.is-down { background: var(--neg-soft); color: var(--neg); }
.ui-chip.is-flat { background: var(--rail); color: var(--muted); }

.ui-stat-label { display: block; margin: 0 0 6px; color: var(--muted); font-size: 12.5px; }
.ui-stat-value { display: block; color: var(--ink); font-size: 26px; font-weight: 500; line-height: 1.1; letter-spacing: -.025em; font-variant-numeric: tabular-nums; }
.ui-stat-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin-top: 6px; color: var(--muted); font-size: 12.5px; }
.ui-stat-meta b { color: var(--ink); font-weight: 500; }

.ui-row { display: grid; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--line); }
.ui-panel-head + .ui-row { border-top: 0; }

.ui-empty { margin: 0; padding: 18px 0; color: var(--muted); font-size: 13px; }

.app :is(.ui-btn, .ui-link, .ui-seg button):focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* --- Graf (scope-chart.js) ----------------------------------------------- */

.ui-chart { position: relative; min-height: 0; }
.ui-chart > svg { display: block; width: 100%; height: 100%; overflow: visible; }
.ui-chart-grid { stroke: var(--grid); }
.ui-chart-grid.is-base { stroke: var(--line-strong); }
.ui-chart-axis, .ui-chart-label { fill: var(--faint); font-family: inherit; font-size: 11.5px; }
.ui-chart-label.is-current { fill: var(--accent); font-weight: 600; }
.ui-chart-bar { fill: var(--accent); fill-opacity: .74; }
.ui-chart-bar.is-current { fill-opacity: 1; }
.ui-chart[data-tone=neutral] .ui-chart-bar:not(.is-current) { fill: var(--bar-neutral); fill-opacity: 1; }
.ui-chart-ghost { fill: var(--accent-soft); stroke: var(--accent-line); stroke-dasharray: 3 3; }
.ui-chart-line { fill: none; stroke: var(--faint); stroke-width: 1.6; stroke-dasharray: 5 4; stroke-linejoin: round; }
.ui-chart-now { stroke: var(--accent); stroke-opacity: .3; }
.ui-chart-hits { position: absolute; top: 0; right: 0; bottom: 22px; display: flex; }
.ui-chart-hits button { flex: 1; min-width: 0; padding: 0; border: 0; border-radius: 8px; background: none; cursor: pointer; }
.ui-chart-hits button:hover, .ui-chart-hits button:focus-visible { background: color-mix(in srgb, var(--accent) 7%, transparent); outline: none; }
.ui-chart-hits button:focus-visible { box-shadow: inset 0 0 0 2px var(--accent); }
.ui-tip {
  position: absolute; z-index: 5; min-width: 150px; padding: 9px 11px; border-radius: 10px;
  background: var(--tip-bg); color: var(--tip-ink); font-size: 12px; line-height: 1.5;
  pointer-events: none; transform: translate(-50%, -100%); box-shadow: 0 8px 24px rgb(0 0 0 / 14%);
}
.ui-tip[hidden] { display: none; }
.ui-tip b { display: block; font-weight: 600; }
.ui-tip div { display: flex; justify-content: space-between; gap: 14px; font-variant-numeric: tabular-nums; }
.ui-tip span { color: var(--tip-muted); }
```

- [ ] **Step 2: Load it after `test.css`**

In `test.html`, directly after the line `<link rel="stylesheet" href="test.css?v=overview-55">` add:

```html
    <link rel="stylesheet" href="scope-ui.css?v=overview-55">
```

Then bump cache tags:

```bash
V="redesign-$(date +%m%d%H%M%S)"; sed -i '' -E "s/(test\.css|test\.js|scope-ui\.css|scope-insights\.js|scope-overview\.js|scope-chart\.js)\?v=[A-Za-z0-9-]+/\1?v=$V/g" test.html test.js scope-overview.js 2>/dev/null; true
grep -n '?v=' test.html
```

Expected: `test.css`, `scope-ui.css` and `test.js` all show the same `redesign-…` tag.

- [ ] **Step 3: Verify tokens resolve and nothing else moved**

Open `http://localhost:4180/test?cb=t3#oversikt` in the browser pane and run:

```js
(() => { const cs = getComputedStyle(document.body); const a = cs.getPropertyValue('--accent').trim();
  document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  const b = getComputedStyle(document.body).getPropertyValue('--accent').trim();
  document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  return [a, b, [...document.styleSheets].map(s => s.href && s.href.split('/').pop())]; })()
```

Expected: `["#1f4fe0", "#7d9bff", [..., "test.css?v=redesign-…", "scope-ui.css?v=redesign-…"]]` (order light/dark depends on the current theme; both values must appear). A screenshot of Oversikt looks the same as before (no `ui-` classes are used yet). No console errors.

- [ ] **Step 4: Commit**

```bash
git add scope-ui.css test.html
git commit -m "$(printf 'Add a shared design system stylesheet for the workspace\n\nOne set of light/dark tokens and ui- components, so every page of\nthe workspace can be rebuilt on the same parts.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

---

### Task 4: Shared bar chart

**Files:**
- Create: `scope-chart.js`
- Test: `tests/overview.test.mjs` (create)

**Interfaces:**
- Produces:
  - `niceScale(max, steps = 2)` → `{max, ticks}`; friendly axis top, e.g. `9100 → {max: 10000, ticks: [0, 5000, 10000]}`.
  - `barChart(root: HTMLElement, {bars, line = null, format = String, onSelect = null, axis = true, tone = ''})` → `destroy(): void`.
    `bars[i]` = `{label: string, value: number, ghost?: number, current?: boolean, title: string, tip: [label, value][], aria: string}`. `ghost` > `value` draws a dashed forecast bar behind. `line` = comparison values per bar. `onSelect(index)` runs on click/Enter. Arrow keys move between bars (one tab stop).

- [ ] **Step 1: Write the failing test**

Create `tests/overview.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

test('chart axis tops out at a friendly number', async () => {
  const {niceScale} = await import('../scope-chart.js');
  assert.deepEqual(niceScale(9100), {max: 10000, ticks: [0, 5000, 10000]});
  assert.deepEqual(niceScale(139840), {max: 160000, ticks: [0, 80000, 160000]});
  assert.deepEqual(niceScale(0), {max: 1, ticks: [0, 1]});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/overview.test.mjs`
Expected: FAIL with `Cannot find module '…/scope-chart.js'`.

- [ ] **Step 3: Implement `scope-chart.js`**

```js
// Felles søylegraf for arbeidsflaten: SVG-søyler, valgfri sammenligningslinje og
// ekte knapper over hver kolonne, så mus, klikk og tastatur oppfører seg likt.
const SVG_NS = 'http://www.w3.org/2000/svg';

// Round the axis top up to a friendly number: 9 100 → 10 000.
export function niceScale(max, steps = 2) {
  if (!(max > 0)) return {max: 1, ticks: [0, 1]};
  const raw = max / steps, magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(m => m * magnitude).find(s => s >= raw);
  return {max: step * steps, ticks: Array.from({length: steps + 1}, (_, i) => i * step)};
}

const escape = text => String(text).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

export function barChart(root, {bars, line = null, format = String, onSelect = null, axis = true, tone = ''}) {
  root.classList.add('ui-chart');
  if (tone) root.dataset.tone = tone;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const hits = document.createElement('div');
  hits.className = 'ui-chart-hits';
  const tip = document.createElement('div');
  tip.className = 'ui-tip';
  tip.hidden = true;
  root.replaceChildren(svg, hits, tip);

  const scale = niceScale(Math.max(0, ...bars.map(bar => Math.max(bar.value, bar.ghost || 0)), ...(line || [])));
  const left = axis ? 40 : 0, bottom = 22, top = 8;
  const focusStart = Math.max(0, bars.findIndex(bar => bar.current));
  let slot = 0, y = () => 0;
  hits.style.left = left + 'px';

  bars.forEach((bar, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.tabIndex = index === focusStart ? 0 : -1;
    button.setAttribute('aria-label', bar.aria);
    button.addEventListener('mouseenter', () => show(index));
    button.addEventListener('focus', () => show(index));
    button.addEventListener('mouseleave', hide);
    button.addEventListener('blur', hide);
    button.addEventListener('keydown', event => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const next = hits.children[Math.max(0, Math.min(bars.length - 1, index + step))];
      [...hits.children].forEach(other => { other.tabIndex = other === next ? 0 : -1; });
      next.focus();
    });
    if (onSelect) button.addEventListener('click', () => onSelect(index));
    hits.append(button);
  });

  function draw() {
    const width = root.clientWidth, height = root.clientHeight;
    if (!width || !height) return;
    slot = (width - left) / bars.length;
    const barWidth = Math.min(34, slot * 0.56);
    y = value => top + (height - top - bottom) * (1 - value / scale.max);
    let out = '';
    if (axis) scale.ticks.forEach(tick => {
      out += `<line class="ui-chart-grid${tick ? '' : ' is-base'}" x1="${left}" x2="${width}" y1="${y(tick)}" y2="${y(tick)}"/>`;
      out += `<text class="ui-chart-axis" x="${left - 10}" y="${y(tick) + 4}" text-anchor="end">${escape(format(tick))}</text>`;
    });
    bars.forEach((bar, index) => {
      const center = left + slot * index + slot / 2, x = center - barWidth / 2, current = bar.current ? ' is-current' : '';
      if ((bar.ghost || 0) > bar.value) out += `<rect class="ui-chart-ghost" x="${x}" y="${y(bar.ghost)}" width="${barWidth}" height="${y(0) - y(bar.ghost)}" rx="5"/>`;
      if (bar.value > 0) out += `<rect class="ui-chart-bar${current}" x="${x}" y="${y(bar.value)}" width="${barWidth}" height="${y(0) - y(bar.value)}" rx="5"/>`;
      out += `<text class="ui-chart-label${current}" x="${center}" y="${height - 5}" text-anchor="middle">${escape(bar.label)}</text>`;
    });
    if (line) out += `<polyline class="ui-chart-line" points="${line.map((value, index) => `${left + slot * index + slot / 2},${y(value)}`).join(' ')}"/>`;
    const now = bars.findIndex(bar => bar.current);
    if (line && now >= 0) {
      const center = left + slot * now + slot / 2;
      out += `<line class="ui-chart-now" x1="${center}" x2="${center}" y1="${top - 2}" y2="${y(0)}"/>`;
    }
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = out;
  }

  function show(index) {
    const bar = bars[index];
    const title = document.createElement('b');
    title.textContent = bar.title;
    tip.replaceChildren(title, ...bar.tip.map(([label, value]) => {
      const row = document.createElement('div'), name = document.createElement('span');
      name.textContent = label;
      row.append(name, document.createTextNode(value));
      return row;
    }));
    tip.hidden = false;
    const center = left + slot * index + slot / 2, half = tip.offsetWidth / 2;
    tip.style.left = Math.max(half, Math.min(root.clientWidth - half, center)) + 'px';
    tip.style.top = Math.max(0, y(Math.max(bar.value, bar.ghost || 0, line ? line[index] : 0)) - 8) + 'px';
  }

  function hide() { tip.hidden = true; }

  const observer = new ResizeObserver(draw);
  observer.observe(root);
  draw();
  return () => observer.disconnect();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/overview.test.mjs`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add scope-chart.js tests/overview.test.mjs
git commit -m "$(printf 'Add one bar chart that every workspace page can share\n\nSVG bars with a comparison line, forecast ghosts and real buttons per\ncolumn, so hover, click and arrow keys behave the same everywhere.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

---

### Task 5: The new Oversikt

**Files:**
- Create: `scope-overview.js`
- Modify: `scope-ui.css` (append the Oversikt section)
- Modify: `test.js` (import line near line 42; `hubTasks` near line 1948; `setTask` focus line near 1965; `renderDash` 1980–2103; after `stedsLyttere.push(renderDash);` near 2546)
- Test: `tests/overview.test.mjs` (append)

**Interfaces:**
- Consumes: `buildOperationalAdvice(profile, tomorrow, weekRevenue)` and `buildToday({...})` from Tasks 1–2; `barChart`, `niceScale` from Task 4; classes from Task 3.
- Produces:
  - `change(ratio)` → `{text: '▲ 3 %'|'▼ 2 %'|'→ 0 %', tone: 'is-up'|'is-down'|'is-flat'}`.
  - `renderOverview(root, model, actions)`, where
    `model = {dateLabel, updated, weekdayName, today /* buildToday result */, tasks /* ≤3 advice objects with status */, period}` and
    `period = {kind: 'day'|'week'|'month', title, total, change /* ratio */, changeLabel, bars /* barChart bars + offset: number|null */, best: {lead, name, text}}`;
    `actions = {openSales(), openStaff(), toggleTask(id), runTask(id), openAllTasks(), setPeriod(kind), openReport(offset)}`.
  - DOM hooks used by `test.js`: `.ov-task[data-task=<id>] .ov-check` and `[data-period=<kind>]`.

- [ ] **Step 1: Write the failing test for `change`**

Append to `tests/overview.test.mjs`:

```js
test('changes read as up, down or flat, never as noise', async () => {
  const {change} = await import('../scope-overview.js');
  assert.deepEqual(change(0.034), {text: '▲ 3 %', tone: 'is-up'});
  assert.deepEqual(change(-0.021), {text: '▼ 2 %', tone: 'is-down'});
  assert.deepEqual(change(0.004), {text: '→ 0 %', tone: 'is-flat'});
  assert.deepEqual(change(NaN), {text: '→ 0 %', tone: 'is-flat'});
});
```

Run: `node --test tests/overview.test.mjs`
Expected: FAIL with `Cannot find module '…/scope-overview.js'`.

- [ ] **Step 2: Create `scope-overview.js`**

```js
// Oversikt: «Hvordan går det i dag?» – I dag-kortet, neste grep og de siste
// periodene. Bare visning: test.js bygger modellen og eier all tilstand.
import {barChart} from './scope-chart.js?v=redesign-1';

const nf = new Intl.NumberFormat('nb-NO');
const one = new Intl.NumberFormat('nb-NO', {maximumFractionDigits: 1});
const kr = n => 'kr ' + nf.format(Math.round(n));
const axisLabel = n => (n >= 1000 ? one.format(n / 1000) + 'k' : String(Math.round(n)));
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
let cleanups = [];

// Under one percent reads as flat, so the card never shouts about noise.
export function change(ratio) {
  const pct = Math.round(ratio * 100);
  if (!Number.isFinite(pct) || pct === 0) return {text: '→ 0 %', tone: 'is-flat'};
  return pct > 0 ? {text: '▲ ' + pct + ' %', tone: 'is-up'} : {text: '▼ ' + Math.abs(pct) + ' %', tone: 'is-down'};
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className, text, onClick) {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

export function renderOverview(root, model, actions) {
  cleanups.forEach(stop => stop());
  cleanups = [];
  root.className = 'ov';
  root.replaceChildren(head(model), hero(model, actions), bottom(model, actions));
}

function head(model) {
  const header = el('header', 'ov-head');
  const title = el('h2', '', 'I dag');
  title.append(el('span', '', model.dateLabel));
  const before = model.today.phase === 'before';
  header.append(title, el('span', 'ov-live' + (before ? ' is-closed' : ''), (before ? 'Åpner kl. 11' : 'Live fra kassen') + ' · oppdatert ' + model.updated));
  return header;
}

function kpi(spec, onClick) {
  const node = button('ov-kpi' + (spec.main ? ' ov-kpi-main' : ''), undefined, onClick);
  const meta = el('span', 'ui-stat-meta');
  if (spec.chip) meta.append(el('span', 'ui-chip ' + spec.chip.tone, spec.chip.text));
  if (spec.delta) meta.append(el('span', 'ui-delta ' + spec.delta.tone, spec.delta.text));
  meta.append(document.createTextNode(spec.meta));
  if (spec.extra) {
    const divider = el('span', 'ov-sep', '|');
    divider.setAttribute('aria-hidden', 'true');
    meta.append(divider, document.createTextNode(spec.extra[0] + ' '), el('b', '', spec.extra[1]));
  }
  node.append(el('span', 'ui-stat-label', spec.label), el('span', 'ui-stat-value', spec.value), meta);
  return node;
}

function hourBar(h, index, nowIndex, weekdayName) {
  const span = 'kl. ' + h.hour + '–' + (h.hour + 1);
  const normal = ['Vanlig ' + weekdayName, kr(h.normal)];
  let title, tip;
  if (index < nowIndex) { title = span; tip = [['I dag', kr(h.actual)], normal, ['Forskjell', change(h.actual / h.normal - 1).text]]; }
  else if (index === nowIndex) { title = span + ' · pågår'; tip = [['Så langt', kr(h.actual)], ['Hele timen, anslått', kr(h.forecast)], normal]; }
  else { title = span + ' · prognose'; tip = [['Prognose', kr(h.forecast)], normal]; }
  return {label: String(h.hour), value: h.actual, ghost: h.forecast, current: index === nowIndex, title, tip,
    aria: title + ': ' + tip.map(([name, value]) => name + ' ' + value).join(', ')};
}

function hero(model, actions) {
  const {today, weekdayName} = model;
  const before = today.phase === 'before';
  const card = el('section', 'ui-card ov-hero');
  card.setAttribute('aria-label', 'Dagen så langt');
  const ticket = today.guests ? today.revenue / today.guests : 0;
  const normalTicket = today.normalGuests ? today.normalRevenue / today.normalGuests : 0;
  const hour = today.hours[today.nowIndex];
  const perStaff = today.staffNow && hour ? hour.forecastGuests / today.staffNow : 0;
  const kpis = el('div', 'ov-kpis');
  kpis.append(
    kpi(before
      ? {main: true, label: 'Prognose i dag', value: kr(today.forecastRevenue), meta: 'En vanlig ' + weekdayName + ' gir ' + kr(today.normalDayRevenue)}
      : {main: true, label: 'Omsetning så langt', value: kr(today.revenue), chip: change(today.revenue / today.normalRevenue - 1),
        meta: 'mot en vanlig ' + weekdayName, extra: ['Prognose i dag', kr(today.forecastRevenue)]}, actions.openSales),
    kpi(before
      ? {label: 'Forventede gjester', value: nf.format(today.forecastGuests), meta: 'hele dagen'}
      : {label: 'Gjester', value: nf.format(today.guests), delta: change(today.guests / today.normalGuests - 1), meta: 'mot vanlig'}, actions.openSales),
    kpi(before
      ? {label: 'Snitt per gjest', value: kr(today.forecastGuests ? today.forecastRevenue / today.forecastGuests : 0), meta: 'forventet'}
      : {label: 'Snitt per gjest', value: kr(ticket), delta: change(ticket / normalTicket - 1), meta: 'mot vanlig'}, actions.openSales),
    kpi(before
      ? {label: 'På vakt i kveld', value: nf.format(today.plannedStaff), meta: 'planlagt'}
      : {label: 'På vakt nå', value: nf.format(today.staffNow), meta: one.format(perStaff) + ' gjester per ansatt denne timen'}, actions.openStaff)
  );

  const chartHead = el('div', 'ov-chart-head');
  const legend = el('div', 'ov-legend');
  legend.setAttribute('aria-hidden', 'true');
  [['', 'I dag'], ['is-line', 'Vanlig ' + weekdayName], ['is-ghost', 'Prognose']].forEach(([kind, text]) => {
    const item = el('span');
    item.append(el('i', kind), document.createTextNode(text));
    legend.append(item);
  });
  chartHead.append(el('h3', '', 'Omsetning per time'), legend);

  const chart = el('div', 'ov-chart');
  chart.setAttribute('role', 'group');
  chart.setAttribute('aria-label', 'Omsetning per time i dag. Bruk piltastene for å gå mellom timene.');
  cleanups.push(barChart(chart, {
    bars: today.hours.map((h, index) => hourBar(h, index, today.nowIndex, weekdayName)),
    line: today.hours.map(h => h.normal),
    format: axisLabel,
    onSelect: () => actions.openSales()
  }));
  card.append(kpis, chartHead, chart);
  return card;
}

function bottom(model, actions) {
  const row = el('div', 'ov-bottom');
  row.append(tasksPanel(model.tasks, actions), periodPanel(model.period, actions));
  return row;
}

function tasksPanel(tasks, actions) {
  const panel = el('section', 'ui-card ov-panel');
  panel.setAttribute('aria-label', 'Gjør dette nå');
  const open = tasks.filter(task => task.status !== 'done').length;
  const head = el('div', 'ui-panel-head');
  const title = el('h2', '', 'Gjør dette nå');
  title.append(el('small', '', open ? open + (open === 1 ? ' åpen' : ' åpne') : 'Alt gjort'));
  head.append(title, button('ui-link', 'Alle tiltak →', actions.openAllTasks));
  panel.append(head);
  if (!tasks.length) {
    panel.append(el('p', 'ui-empty', 'Ingen tiltak akkurat nå. Scope sier fra når tallene gir grunn til det.'));
    return panel;
  }
  tasks.forEach(task => {
    const done = task.status === 'done';
    const row = el('div', 'ui-row ov-task' + (done ? ' is-done' : ''));
    row.dataset.task = task.id;
    const check = button('ov-check', undefined, () => actions.toggleTask(task.id));
    check.setAttribute('role', 'checkbox');
    check.setAttribute('aria-checked', String(done));
    check.setAttribute('aria-label', task.title);
    check.innerHTML = CHECK;
    const text = el('div', 'ov-task-text');
    text.append(el('div', 'ov-task-title', task.title), el('div', 'ov-task-why', task.basis));
    const value = el('div', 'ov-task-value');
    value.append(el('strong', '', task.value), document.createTextNode(task.valueNote));
    row.append(check, text, value, button('ui-btn', task.action, () => actions.runTask(task.id)));
    panel.append(row);
  });
  return panel;
}

function periodPanel(period, actions) {
  const panel = el('section', 'ui-card ov-panel');
  panel.setAttribute('aria-label', period.title);
  const head = el('div', 'ui-panel-head');
  const seg = el('div', 'ui-seg');
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', 'Periode');
  [['day', 'Dag'], ['week', 'Uke'], ['month', 'Måned']].forEach(([kind, label]) => {
    const option = button('', label, () => actions.setPeriod(kind));
    option.dataset.period = kind;
    option.setAttribute('aria-pressed', String(period.kind === kind));
    seg.append(option);
  });
  head.append(el('h2', '', period.title), seg);

  const sum = el('div', 'ov-sum');
  const delta = change(period.change);
  sum.append(el('span', 'ui-stat-value', kr(period.total)), el('span', 'ui-delta ' + delta.tone, delta.text), el('span', 'ui-stat-label', period.changeLabel));

  const chart = el('div', 'ov-period-chart');
  chart.setAttribute('role', 'group');
  chart.setAttribute('aria-label', period.title + '. Velg en søyle for å åpne rapporten.');
  cleanups.push(barChart(chart, {
    bars: period.bars, axis: false, tone: 'neutral', format: axisLabel,
    onSelect: index => { const offset = period.bars[index].offset; if (offset === null) actions.openSales(); else actions.openReport(offset); }
  }));

  const note = el('p', 'ov-note', period.best.lead + ' ');
  note.append(el('b', '', period.best.name), document.createTextNode(' · ' + period.best.text));
  panel.append(head, sum, chart, note);
  return panel;
}
```

Bump the tags so the `scope-chart.js?v=redesign-1` import above gets the current tag:

```bash
V="redesign-$(date +%m%d%H%M%S)"; sed -i '' -E "s/(test\.css|test\.js|scope-ui\.css|scope-insights\.js|scope-overview\.js|scope-chart\.js)\?v=[A-Za-z0-9-]+/\1?v=$V/g" test.html test.js scope-overview.js 2>/dev/null; true
```

- [ ] **Step 3: Run test to verify it passes**

Run: `node --test tests/overview.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 4: Append the Oversikt styles to `scope-ui.css`**

```css

/* --- Oversikt (scope-overview.js) ---------------------------------------- */

.ov { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: 14px; max-width: 1240px; margin: 0 auto; color: var(--ink); font-feature-settings: "tnum" 1; }
.ov-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 6px 16px; }
.ov-head h2 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -.02em; }
.ov-head h2 span { margin-left: 8px; color: var(--muted); font-size: 15px; font-weight: 400; letter-spacing: 0; }
.ov-live { display: inline-flex; align-items: center; gap: 7px; color: var(--muted); font-size: 12.5px; }
.ov-live::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--pos); box-shadow: 0 0 0 3px var(--pos-soft); }
.ov-live.is-closed::before { background: var(--faint); box-shadow: 0 0 0 3px var(--rail); }

.ov-hero { display: flex; flex-direction: column; min-height: 0; padding: 20px 22px 14px; }
.ov-kpis { display: grid; grid-template-columns: 1.5fr repeat(3, minmax(0, 1fr)); align-items: end; }
.ov-kpi { min-width: 0; padding: 0 20px; border: 0; border-left: 1px solid var(--line); background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.ov-kpi:first-child { padding-left: 0; border-left: 0; }
.ov-kpi:hover .ui-stat-value { color: var(--accent); }
.ov .ui-stat-value { font-size: 26px; }
.ov-kpi-main .ui-stat-value { font-size: 44px; letter-spacing: -.035em; }
.ov-sep { color: var(--line-strong); }

.ov-chart-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; margin: 18px 0 4px; }
.ov-chart-head h3 { margin: 0; font-size: 13px; font-weight: 500; }
.ov-legend { display: flex; gap: 16px; color: var(--muted); font-size: 12px; }
.ov-legend span { display: inline-flex; align-items: center; gap: 6px; }
.ov-legend i { width: 10px; height: 10px; border-radius: 3px; background: var(--accent); }
.ov-legend i.is-line { width: 16px; height: 0; border-top: 2px dashed var(--faint); border-radius: 0; background: none; }
.ov-legend i.is-ghost { background: var(--accent-soft); outline: 1px dashed var(--accent-line); outline-offset: -1px; }
.ov-chart { flex: 1; min-height: 120px; }

.ov-bottom { display: grid; grid-template-columns: 1.45fr 1fr; gap: 14px; }
.ov-panel { display: flex; flex-direction: column; min-width: 0; padding: 16px 18px 10px; }
.ov-panel > .ui-panel-head { margin-bottom: 6px; }

.ov-task { grid-template-columns: 22px minmax(0, 1fr) auto auto; }
.ov-check { display: grid; place-items: center; width: 20px; height: 20px; padding: 0; border: 1.5px solid var(--line-strong); border-radius: 50%; background: none; cursor: pointer; transition: background .15s, border-color .15s; }
.ov-check:hover { border-color: var(--pos); }
.ov-check svg { width: 12px; height: 12px; fill: none; stroke: #fff; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; opacity: 0; }
.ov-task.is-done .ov-check { border-color: var(--pos); background: var(--pos); }
.ov-task.is-done .ov-check svg { opacity: 1; }
.ov-task-text { min-width: 0; }
.ov-task-title { font-size: 14px; font-weight: 500; line-height: 1.35; }
.ov-task.is-done .ov-task-title { color: var(--faint); text-decoration: line-through; }
.ov-task-why { margin-top: 2px; overflow: hidden; color: var(--muted); font-size: 12.5px; text-overflow: ellipsis; white-space: nowrap; }
.ov-task-value { color: var(--muted); font-size: 12.5px; text-align: right; white-space: nowrap; }
.ov-task-value strong { display: block; color: var(--ink); font-size: 13.5px; font-weight: 500; }

.ov-sum { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; margin: 6px 0 10px; }
.ov .ov-sum .ui-stat-value { font-size: 24px; }
.ov-sum .ui-stat-label { margin: 0; }
.ov-period-chart { height: 108px; }
.ov-note { margin: 8px 0 0; color: var(--muted); font-size: 12.5px; }
.ov-note b { color: var(--ink); font-weight: 500; }

.app :is(.ov-kpi, .ov-check):focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* På en laptop fyller oversikten skjermen; bare grafen gir seg i høyden. */
@media (min-width: 1100px) and (min-height: 640px) {
  .content-body:has(.view[data-view=oversikt]:not([hidden])) { padding: 18px 24px; }
  .view[data-view=oversikt], .ov { height: 100%; }
}
@media (min-width: 1100px) and (max-height: 800px) {
  .content-body:has(.view[data-view=oversikt]:not([hidden])) { padding-top: 14px; padding-bottom: 14px; }
  .ov { gap: 12px; }
  .ov-hero { padding: 16px 20px 10px; }
  .ov .ui-stat-value { font-size: 23px; }
  .ov-kpi-main .ui-stat-value { font-size: 36px; }
  .ov .ov-sum .ui-stat-value { font-size: 21px; }
  .ov-chart-head { margin: 12px 0 2px; }
  .ov-panel { padding: 12px 16px 6px; }
  .ov-task { padding: 8px 0; }
  .ov-sum { margin: 2px 0 6px; }
  .ov-period-chart { height: 84px; }
}
@media (max-width: 1099px), (max-height: 639px) {
  .ov-chart { flex: none; height: 200px; }
}
@media (max-width: 860px) {
  .ov-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 16px; }
  .ov-kpi-main { grid-column: 1 / -1; }
  .ov-kpi:nth-child(even) { padding-left: 0; border-left: 0; }
  .ov-kpi-main .ui-stat-value { font-size: 36px; }
  .ov-bottom { grid-template-columns: minmax(0, 1fr); }
  .ov-task { grid-template-columns: 22px minmax(0, 1fr) auto; }
  .ov-task .ui-btn { grid-column: 2 / -1; justify-self: start; }
}
@media (prefers-reduced-motion: reduce) {
  .ov *, .ui-chart * { transition: none !important; }
}
```

- [ ] **Step 5: Wire `test.js` – imports**

Replace the line

```js
    const { buildReport, improvementEffect, buildDayTimeline } = await import("./scope-insights.js?v=day-overview-11");
```

with

```js
    const { buildReport, improvementEffect, buildOperationalAdvice, buildToday } = await import("./scope-insights.js?v=redesign-1");
    const { renderOverview } = await import("./scope-overview.js?v=redesign-1");
```

- [ ] **Step 6: Wire `test.js` – task helpers and `hubTasks`**

Write the new block to a temp file, then splice it over the old `hubTasks` (from `    function hubTasks() {` up to, not including, `    function setTask(task,status) {`):

```bash
cat > "$TMPDIR/hubtasks.js" <<'EOF'
    // Kvelden for ett eller flere steder, fra samme modell som bemanningssiden.
    function eveningPlan(place,date) {
      const entries=stederI(place).map(name=>kveldsTall(STED_PROFIL[name],dagIndeks(date)));
      return {date,guests:Math.round(entries.reduce((sum,x)=>sum+x.gjester,0)),booked:entries.reduce((sum,x)=>sum+x.booket,0),staff:entries.reduce((sum,x)=>sum+x.vakt,0)};
    }
    function tomorrowDate(){return new Date(NÅ.getFullYear(),NÅ.getMonth(),NÅ.getDate()+1);}
    function openTomorrow(){opsState.staffDay=dagIndeks(tomorrowDate());opsState.staffWeek=dagIndeks(NÅ)===6?1:0;opsState.extra=0;staffView();hubGo("bemanning");}
    // Knappen på et tiltak tar deg dit jobben gjøres.
    function runTask(task){
      if(task.id==="plan")openTomorrow();
      else if(task.id==="cost"){costUI.tab="invoices";costUI.supplier="Alle";costUI.invoiceFilter="Alle";costView();hubGo("varekost");}
      else opsDetail("Hent manglende kvitteringer",[["Mangler vedlegg",profil(placeName.textContent).bilag+" bilag"],["1. Finn kjøpene","Filtrer på bilag uten vedlegg i regnskapet"],["2. Be om kvittering","Kontakt den som gjorde hvert kjøp"],["3. Legg ved","Last opp kvitteringen på riktig bilag"]],"Antallet er fra demomodellen. De enkelte kvitteringene er ikke tilgjengelige her.");
    }
    function hubTasks() {
      const place=placeName.textContent,p=profil(place);
      const weekRevenue=p.oms*DAGVEKT.reduce((sum,w)=>sum+w,0)/DAGVEKT[TORSDAG];
      return buildOperationalAdvice(p,eveningPlan(place,tomorrowDate()),weekRevenue).map(task=>{const saved=taskProgress[hubKey()+"/"+task.id];return {...task,...saved,status:["active","done"].includes(saved?.status)?saved.status:"suggested"};});
    }
EOF
python3 - <<'EOF'
import os
from pathlib import Path
p = Path('test.js'); s = p.read_text()
start = s.index('    function hubTasks() {'); end = s.index('    function setTask(task,status) {')
s = s[:start] + Path(os.environ['TMPDIR'], 'hubtasks.js').read_text() + s[end:]
p.write_text(s)
EOF
grep -n 'function eveningPlan\|function runTask\|function hubTasks' test.js
```

Expected: three matching lines, in that order.

- [ ] **Step 7: Wire `test.js` – focus after a task toggles**

In `setTask`, replace

```js
const target=synlig('.kol-tiltak [data-task="'+task.id+'"] button')||
```

with

```js
const target=synlig('.ov-task[data-task="'+task.id+'"] .ov-check')||
```

- [ ] **Step 8: Wire `test.js` – new `renderDash` and period model**

```bash
cat > "$TMPDIR/renderdash.js" <<'EOF'
    // Dag = sju hele dager + i dag, Uke = åtte hele uker, Måned = seks hele måneder.
    // Endringen er den samme demo-endringen som Salg bruker for stedet.
    function overviewPeriod(p,today,place){
      const kind=hubState.report,count={day:7,week:8,month:6}[kind];
      const reports=Array.from({length:count},(_,i)=>buildReport(p,kind,count-1-i,NÅ,DAGVEKT));
      const dayName=new Intl.DateTimeFormat("nb-NO",{weekday:"long",day:"numeric",month:"short"});
      const monthShort=new Intl.DateTimeFormat("nb-NO",{month:"short"}),monthLong=new Intl.DateTimeFormat("nb-NO",{month:"long"});
      const label=r=>kind==="day"?DAGNAVN[dagIndeks(r.start)].slice(0,2).toLowerCase():kind==="week"?"u"+ukenummer(r.start):monthShort.format(r.start).replace(".","");
      const name=r=>kind==="day"?dayName.format(r.start):kind==="week"?"uke "+ukenummer(r.start):monthLong.format(r.start);
      const bars=reports.map((r,i)=>({label:label(r),value:r.revenue,offset:count-1-i,title:stor(name(r)),tip:[["Omsetning",kr(r.revenue)],["Gjester",nf.format(r.guests)]],aria:stor(name(r))+": "+kr(r.revenue)+", "+nf.format(r.guests)+" gjester. Åpne rapport."}));
      if(kind==="day")bars.push({label:"i dag",value:today.revenue,ghost:today.forecastRevenue,current:true,offset:null,title:"I dag så langt",tip:[["Så langt",kr(today.revenue)],["Prognose",kr(today.forecastRevenue)]],aria:"I dag så langt: "+kr(today.revenue)+", prognose "+kr(today.forecastRevenue)+". Åpne salg."});
      const best=reports.reduce((a,b)=>b.revenue>a.revenue?b:a),e=endring(place);
      return {kind,title:{day:"Siste 7 dager",week:"Siste 8 uker",month:"Siste 6 måneder"}[kind],total:reports.reduce((sum,r)=>sum+r.revenue,0),
        change:(kind==="day"?e.uke:e.siste30)/100,changeLabel:{day:"mot uka før",week:"mot perioden før",month:"mot perioden før"}[kind],bars,
        best:{lead:{day:"Beste dag:",week:"Beste uke:",month:"Beste måned:"}[kind],name:name(best),text:kr(best.revenue)+" · "+nf.format(best.guests)+" gjester"}};
    }
    // Oversikt: dagen så langt, neste grep og de siste periodene. Visningen
    // ligger i scope-overview.js; her bygges bare tallene den skal vise.
    function renderDash() {
      if(!dash)return;
      const place=placeName.textContent,p=profil(place),tasks=hubTasks(),now=new Date(),weekday=dagIndeks(now);
      const planned=stederI(place).reduce((sum,name)=>sum+kveldsTall(STED_PROFIL[name],weekday).vakt,0);
      const today=buildToday({dayRevenue:p.oms*dagFaktor(weekday),dayGuests:p.gjester*dagFaktor(weekday),hourWeights:TIMEVEKT,seed:hubKey()+"|"+[now.getFullYear(),now.getMonth()+1,now.getDate()].join("-"),now,plannedStaff:planned});
      renderOverview(dash,{
        dateLabel:stor(datoFormat.format(now))+" · "+place,
        updated:new Intl.DateTimeFormat("nb-NO",{hour:"2-digit",minute:"2-digit"}).format(now),
        weekdayName:DAGNAVN_LANG[weekday],
        today,
        tasks:tasks.slice(0,3),
        period:overviewPeriod(p,today,place)
      },{
        openSales:()=>hubGo("salg"),
        openStaff:()=>{opsState.staffDay=weekday;opsState.staffWeek=0;opsState.extra=0;staffView();hubGo("bemanning");},
        toggleTask:id=>{const task=tasks.find(t=>t.id===id);setTask(task,task.status==="done"?"suggested":"done");},
        runTask:id=>runTask(tasks.find(t=>t.id===id)),
        openAllTasks:()=>hubGo("tiltak"),
        setPeriod:kind=>{hubState.report=kind;hubState.offset=0;renderDash();workspaceSync();dash.querySelector('[data-period="'+kind+'"]')?.focus();},
        openReport:offset=>{hubState.offset=offset;openReportStory();}
      });
      renderTasks(tasks);renderEffect(tasks);renderReports();
    }
EOF
python3 - <<'EOF'
import os
from pathlib import Path
p = Path('test.js'); s = p.read_text()
start = s.index('    function renderDash() {'); end = s.index('    function renderTasks(tasks) {')
s = s[:start] + Path(os.environ['TMPDIR'], 'renderdash.js').read_text() + s[end:]
p.write_text(s)
EOF
grep -c 'kol-\|day-chart\|glance-step' test.js
```

Expected: `0` (no old overview classes left in `test.js`).

- [ ] **Step 9: Wire `test.js` – keep «oppdatert» current**

Replace

```js
    stedsLyttere.push(renderDash);
    renderDash();
```

with

```js
    stedsLyttere.push(renderDash);
    renderDash();
    // «Oppdatert HH:MM» skal stemme. Tegn oversikten på nytt hvert minutt, men
    // aldri mens noen står i den med mus eller tastatur.
    setInterval(()=>{if(!dash.closest(".view").hidden&&!dash.contains(document.activeElement)&&!dash.matches(":hover"))renderDash();},60000);
```

Then bump tags:

```bash
V="redesign-$(date +%m%d%H%M%S)"; sed -i '' -E "s/(test\.css|test\.js|scope-ui\.css|scope-insights\.js|scope-overview\.js|scope-chart\.js)\?v=[A-Za-z0-9-]+/\1?v=$V/g" test.html test.js scope-overview.js 2>/dev/null; true
node --check test.js && node --check scope-overview.js && node --check scope-chart.js && echo SYNTAX-OK
```

Expected: `SYNTAX-OK`.

- [ ] **Step 10: Verify in the browser**

Open `http://localhost:4180/test?cb=t5#oversikt` at 1440×900 (light theme). Check, in order:

1. `read_console_messages` with `onlyErrors: true` → none.
2. Screenshot: head «I dag Tirsdag … · Heim Jessheim» with «Live fra kassen · oppdatert HH:MM»; I dag card with a big «Omsetning så langt» number and chip, three KPIs, a bar chart 11–23 with dashed normal line and ghost bars after «nå»; bottom row «Gjør dette nå» (3 rows with value and button) and «Siste 7 dager» (8 bars, last one blue «i dag»).
3. Hover an hour bar → tooltip with «I dag / Vanlig … / Forskjell». Tab into the chart and press → → the tooltip follows focus.
4. Click the first round checkbox → row is struck through, count says «2 åpne», focus stays on that checkbox; click again → restored.
5. Click «Uke» → 8 bars labelled `u..`, title «Siste 8 uker», focus stays on «Uke». Click a bar → the guided report dialog opens for that week; close it with Esc.
6. Click «Se vaktplan» → Bemanning opens for tomorrow; back to Oversikt. Click «Se innkjøp» → Varekost. Click the receipts button → details dialog.
7. Click «Omsetning så langt» → Salg. Click «På vakt nå» → Bemanning (today).
8. Open the place picker, tick Gjøvik as well → the overview re-renders with summed numbers and the new place label.
9. `const b=document.getElementById('content-body'); [b.scrollHeight,b.clientHeight]` → first ≤ second.

Fix anything that fails before committing (re-bump tags after each CSS/JS edit).

- [ ] **Step 11: Run all tests**

Run (outside the sandbox): `npm test 2>&1 | grep -E '^# (pass|fail)'`
Expected: `# pass 140` / `# fail 0` (baseline 132 + 1 advice test + 5 day-model tests + 2 overview tests).

- [ ] **Step 12: Commit**

```bash
git add scope-overview.js scope-ui.css test.js test.html tests/overview.test.mjs
git commit -m "$(printf 'Rebuild the overview around how today is going\n\nOne I dag card compares so far with a normal weekday and forecasts the\nrest, with priced actions and recent periods underneath, all on the\nnew design system and shared chart.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

---

### Task 6: Fit, dark mode, mobile and keyboard pass

**Files:**
- Modify: `scope-ui.css` (only if a check fails)

**Interfaces:**
- Consumes: everything from Task 5. Produces no new names.

- [ ] **Step 1: Measure fit at both laptop sizes**

For each size `1440×900` and `1280×720` (`resize_window`), open `http://localhost:4180/test?cb=t6#oversikt` and run:

```js
(() => { const b = document.getElementById('content-body'), c = document.querySelector('.ov-chart');
  return {scroll: b.scrollHeight, client: b.clientHeight, chart: c.clientHeight,
    clipped: [...document.querySelectorAll('.ov-task-why')].filter(n => n.scrollWidth > n.clientWidth).length}; })()
```

Expected: `scroll <= client`, `chart >= 120`. If `scroll > client` at 1280×720, reduce in the `(max-height: 800px)` block first `.ov-period-chart` (to 76px), then `.ov-task` padding (to 6px), re-bump tags, re-measure. `clipped` may be > 0 (ellipsis is intended) but the full text must be in the title row above it.

- [ ] **Step 2: Dark mode**

Click the theme button (moon icon, top right) and screenshot at 1440×900. Expected: dark cards, readable text, blue bars `#7d9bff`, ghost bars visible, tooltip light-on-dark inverted (light box, dark text), no pure-white blocks. Switch back to light, wait 1 s, and screenshot again: the active workspace tab («Oversikt / …») and every button must be readable (the pre-redesign light mode showed the active tab and «Start» buttons as black blobs). If the tab is still dark, add to `scope-ui.css`:

```css
.app:not([data-theme=dark]) .workspace-tab-shell[data-active=true] { background: var(--hover); color: var(--ink); }
```

re-bump tags and re-check both themes.

- [ ] **Step 3: Mobile**

`resize_window` preset `mobile`, reload. Expected: cards stacked; KPI grid 2 columns with the main number on its own row; chart 200px tall with all hour labels readable (no overlap); task buttons wrap under the text; page scrolls normally. Screenshot. Reset with preset `desktop`.

- [ ] **Step 4: Before opening hours**

In the console, simulate a morning without changing code:

```js
(() => { const RealDate = Date; const fake = new RealDate(); fake.setHours(9, 0, 0, 0);
  globalThis.Date = class extends RealDate { constructor(...a) { return a.length ? new RealDate(...a) : new RealDate(fake); } static now() { return fake.getTime(); } };
  document.querySelector('.rail-link[data-view="salg"]').click(); document.querySelector('.rail-link[data-view="oversikt"]').click();
  const text = document.querySelector('.ov').innerText; globalThis.Date = RealDate; return text.slice(0, 400); })()
```

Expected text contains «Åpner kl. 11», «Prognose i dag», «Forventede gjester», «På vakt i kveld». Reload the page afterwards.

- [ ] **Step 5: Commit (only if Step 1–4 required CSS changes)**

```bash
git add scope-ui.css test.html test.js scope-overview.js
git commit -m "$(printf 'Keep the overview on one screen at laptop sizes\n\nTightens the compact-height spacing found while measuring 1280x720.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

---

### Task 7: Remove the CSS the new overview made dead

**Files:**
- Modify: `test.css`
- Tool (not committed): `$TMPDIR/prune_css.py` (content below)

**Interfaces:**
- Consumes: final class usage in `test.html`, `test.js`, `scope-overview.js`, `scope-chart.js`, `scope-assistant.js`, `scope-pointer.js`.

- [ ] **Step 1: Record style signatures before pruning**

With the page at 1440×900 on `http://localhost:4180/test?cb=t7a#oversikt`, run in both light and dark theme (toggle with the theme button between runs) and save both outputs in your notes:

```js
(() => {
  const props = ['display','position','color','background-color','font-size','font-weight','padding','margin','border-top','border-bottom','border-radius','gap','grid-template-columns','flex-direction','opacity','box-shadow','text-decoration-line','fill','stroke'];
  const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
  const out = {};
  document.querySelectorAll('.sidebar, .content-header, .ask, .view, dialog').forEach((root, i) => {
    let sig = '';
    [root, ...root.querySelectorAll('*')].forEach(node => { const cs = getComputedStyle(node); sig += node.tagName + props.map(p => cs.getPropertyValue(p)).join('|'); });
    out[(root.dataset.view || root.id || root.className.split(' ')[0] || 'x') + ':' + i] = hash(sig);
  });
  return out;
})()
```

- [ ] **Step 2: Create the pruner**

Write `$TMPDIR/prune_css.py`:

```python
#!/usr/bin/env python3
"""Remove CSS selectors whose classes no longer appear anywhere in the page's sources.

Usage: prune_css.py CSS_FILE SOURCE_FILE... [--write]

A selector is dead when one of its classes (outside :not()/:has()/:is()/:where()) is
never mentioned in the sources. Class names that start with a string literal ending in
"-" (e.g. "is-" + state) are always kept. Without --write it only prints a report.
"""
import re
import sys
from pathlib import Path


def scan_block(text, start):
    """Return index just after the '}' that closes the '{' at text[start]."""
    depth, i, n = 0, start, len(text)
    while i < n:
        c = text[i]
        if text.startswith('/*', i):
            end = text.find('*/', i + 2)
            i = n if end < 0 else end + 2
            continue
        if c in '"\'':
            j = i + 1
            while j < n and text[j] != c:
                j += 2 if text[j] == '\\' else 1
            i = j + 1
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    raise ValueError('unbalanced braces')


def parse(text):
    """Split CSS into nodes: ('ws'|'comment'|'raw', s) or ('rule', prelude, body) or ('group', prelude, nodes)."""
    nodes, i, n = [], 0, len(text)
    while i < n:
        if text[i].isspace():
            j = i
            while j < n and text[j].isspace():
                j += 1
            nodes.append(('ws', text[i:j]))
            i = j
            continue
        if text.startswith('/*', i):
            end = text.find('*/', i + 2) + 2
            nodes.append(('comment', text[i:end]))
            i = end
            continue
        j = i
        while j < n and text[j] not in '{;':
            if text.startswith('/*', j):
                j = text.find('*/', j + 2) + 2
                continue
            j += 1
        if j >= n or text[j] == ';':
            nodes.append(('raw', text[i:j + 1]))
            i = j + 1
            continue
        close = scan_block(text, j)
        prelude, body = text[i:j], text[j + 1:close - 1]
        head = prelude.strip().lower()
        if head.startswith(('@media', '@supports', '@container', '@layer')):
            nodes.append(('group', prelude, parse(body)))
        elif head.startswith('@'):
            nodes.append(('raw', text[i:close]))
        else:
            nodes.append(('rule', prelude, body))
        i = close
    return nodes


def split_selectors(prelude):
    parts, depth, cur = [], 0, ''
    for c in prelude:
        if c in '([':
            depth += 1
        elif c in ')]':
            depth -= 1
        if c == ',' and depth == 0:
            parts.append(cur)
            cur = ''
        else:
            cur += c
    parts.append(cur)
    return parts


def classes_in(selector):
    flat = selector
    while True:  # drop functional pseudo-class arguments, innermost first
        nxt = re.sub(r'\([^()]*\)', '', flat)
        if nxt == flat:
            break
        flat = nxt
    flat = re.sub(r'\[[^\]]*\]', '', flat)
    return re.findall(r'\.(-?[A-Za-z_][\w-]*)', flat)


def prune(nodes, alive, report):
    out = []
    for node in nodes:
        kind = node[0]
        if kind == 'rule':
            prelude, body = node[1], node[2]
            selectors = split_selectors(prelude)
            keep = [s for s in selectors if all(alive(c) for c in classes_in(s))]
            if not keep:
                report.append(prelude.strip())
                while out and out[-1][0] == 'ws':
                    out.pop()
                continue
            if len(keep) != len(selectors):
                report.append(' , '.join(s.strip() for s in selectors if s not in keep) + '   (part of a list)')
                lead = re.match(r'\s*', prelude).group(0)
                prelude = lead + ',\n'.join(s.strip() for s in keep) + ' '
            out.append(('rule', prelude, body))
        elif kind == 'group':
            inner = prune(node[2], alive, report)
            if any(x[0] in ('rule', 'group', 'raw') for x in inner):
                out.append(('group', node[1], inner))
            else:
                while out and out[-1][0] == 'ws':
                    out.pop()
        else:
            out.append(node)
    return out


def emit(nodes):
    s = ''
    for node in nodes:
        if node[0] in ('ws', 'comment', 'raw'):
            s += node[1]
        elif node[0] == 'rule':
            s += node[1] + '{' + node[2] + '}'
        else:
            s += node[1] + '{' + emit(node[2]) + '}'
    return s


def main():
    args = [a for a in sys.argv[1:] if a != '--write']
    css_path, sources = Path(args[0]), [Path(a) for a in args[1:]]
    text = css_path.read_text()
    blob = '\n'.join(p.read_text() for p in sources)
    tokens = set(re.findall(r'[A-Za-z_][\w-]*', blob))
    prefixes = set(re.findall(r'["\'`]([a-z][\w-]*-)["\'`]', blob))

    def alive(cls):
        return cls in tokens or any(cls.startswith(p) for p in prefixes)

    nodes = parse(text)
    assert emit(nodes) == text, 'parser does not round-trip this file'
    report = []
    result = emit(prune(nodes, alive, report))
    result = re.sub(r'\n{3,}', '\n\n', result)
    for line in report:
        print('dead:', line.replace('\n', ' ')[:150])
    print(f'{len(report)} dead selector groups · {len(text)} → {len(result)} bytes')
    if '--write' in sys.argv:
        css_path.write_text(result)


if __name__ == '__main__':
    main()
```

- [ ] **Step 3: Dry run and spot-check**

```bash
SRC="test.html test.js scope-overview.js scope-chart.js scope-assistant.js scope-pointer.js"
python3 "$TMPDIR/prune_css.py" test.css $SRC | tail -3
for c in kolonner kol-naa day-chart glance-step dash-stempel; do printf "%s: " $c; grep -c -- "$c" $SRC | awk -F: '{s+=$2} END {print s}'; done
```

Expected: the summary line reports several hundred dead selector groups and roughly 50–60 KB removed; every spot-checked class prints `0`.

- [ ] **Step 4: Prune and remove orphaned comments**

```bash
python3 "$TMPDIR/prune_css.py" test.css $SRC --write | tail -1
git diff --stat test.css
```

Then read `git diff test.css` and delete, by hand, any comment block that now describes rules that are gone (e.g. the «Oversikten i tre deler side om side» and «På en vanlig laptop fyller oversikten skjermen» comments). Bump tags:

```bash
V="redesign-$(date +%m%d%H%M%S)"; sed -i '' -E "s/(test\.css|test\.js|scope-ui\.css|scope-insights\.js|scope-overview\.js|scope-chart\.js)\?v=[A-Za-z0-9-]+/\1?v=$V/g" test.html test.js scope-overview.js 2>/dev/null; true
```

- [ ] **Step 5: Verify nothing else changed**

Reload `http://localhost:4180/test?cb=t7b#oversikt` at 1440×900, confirm `document.styleSheets` shows the new `test.css` tag, and re-run the Step 1 signature snippet in light and dark. Expected: every key has the identical hash as before. If a key differs, compare that view's screenshot before/after, restore the selector(s) responsible from `git diff`, and re-check. Also click through Salg, Kostnader, Varekost, Bemanning, Resultat, Tiltak, Koblinger, Innstillinger and open «Oppsummert» on Salg: no visual change, no console errors.

- [ ] **Step 6: Commit**

```bash
git add test.css test.html test.js scope-overview.js
git commit -m "$(printf 'Delete stylesheet rules no page element uses any more\n\nThree generations of overview CSS no longer match anything after the\nrebuild; removing them keeps later redesign steps from fighting old\noverrides. Computed styles of every view are unchanged.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

---

### Task 8: Release

**Files:**
- Modify: memory file `~/.claude/projects/-Users-ole-froiland-Desktop-Prosjekter-Scope-1/memory/scope-test-workspace.md` (create) and `MEMORY.md` (one line)

- [ ] **Step 1: Full test run**

Run (outside the sandbox): `npm test 2>&1 | grep -E '^# (pass|fail)'`
Expected: `# fail 0`.

- [ ] **Step 2: Final visual proof**

Screenshots of Oversikt at 1440×900 light, 1440×900 dark and mobile, saved for the summary to Ole.

- [ ] **Step 3: Push and deploy**

```bash
git status --short
git push origin main
netlify deploy --prod --build
```

Expected: only unrelated files (enkel-mork etc.) remain modified; push succeeds; deploy prints a production URL.

- [ ] **Step 4: Check it is live**

```bash
curl -s https://scopeanalytics.netlify.app/test | grep -o 'scope-ui.css?v=[^"]*\|test.js?v=[^"]*'
```

Expected: the same `redesign-…` tag as `test.html` locally. Open `https://scopeanalytics.netlify.app/test#oversikt` in the browser pane and screenshot.

- [ ] **Step 5: Save what the next session needs**

Create `scope-test-workspace.md` in the memory directory:

```markdown
---
name: scope-test-workspace
description: /test arbeidsflate etter redesign trinn 1 – scope-ui.css (tokens/ui-), scope-chart.js (barChart), scope-overview.js (renderOverview); renderDash i test.js bygger bare modellen
metadata:
  type: project
---

Per 2026-09-30 er Oversikt på /test bygget om («Dagen først», spec docs/superpowers/specs/2026-09-29-scope-dashboard-redesign-design.md).
Tall: scope-insights.js (buildToday, buildOperationalAdvice med value/valueNote). Visning: scope-overview.js. Graf: scope-chart.js (barChart, niceScale).
Stil: scope-ui.css lastes etter test.css; tokens --paper/--ink/--accent osv. på .app, mørk under [data-theme=dark].
Trinn 2 (Salg/Kostnader/Resultat) og 3 (Koblinger/Innstillinger/chat/menyer) gjenstår, hvert med skisse til Ole først.
Gammel WIP fra 13. sep. ligger i `git stash` («wip 2026-09-13 overview (pre-redesign)»).
Cache: alle ?v= bumpes med sed-kommandoen i planen docs/superpowers/plans/2026-09-30-scope-oversikt-trinn-1.md.
Se [[ole-design-taste]], [[scope-deploy]], [[scope-push-to-main]].
```

Add to `MEMORY.md`:

```markdown
- [Scope /test arbeidsflate](scope-test-workspace.md) — redesign trinn 1 ferdig: scope-ui.css + scope-chart.js + scope-overview.js; trinn 2–3 gjenstår
```
