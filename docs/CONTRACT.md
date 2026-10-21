# Kinvo web app contract

This file is the agreement between the lead and the screen workers. Read it before you change code.
If you need something that this file does not give you, ask the lead. Do not change a shared file yourself.

## 1. Stack

- Vite 8, React 19, TypeScript 6 (strict), React Router 7 (data router, `react-router` package).
- Plain CSS with tokens. No UI kit, no Tailwind, no CSS-in-JS.
- Node 22.18 or later. The server runs `.ts` files directly with type stripping.

Commands:

```
npm run dev        # http://localhost:5173, proxies /api to 127.0.0.1:8790
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + vite build to dist/
npm run server     # node server/index.ts (after W5 lands)
npm test           # node --test (finds *.test.ts)
```

## 2. Folder ownership

| Path | Owner | Others may |
| --- | --- | --- |
| `src/shared/` | Lead | import only |
| `src/data/` | Lead | import only |
| `src/components/` | Lead | import only |
| `src/styles/` | Lead | import only |
| `src/lib/` | Lead | import only |
| `src/app/` (router, paths, Demo panel) | Lead | import only |
| `src/screens/record/` | W1 Record | |
| `src/screens/family/` | W2 Family | |
| `src/screens/meanings/` | W3 Meanings | |
| `src/screens/archive/`, `src/screens/lessons/` | W4 Archive and Lessons | |
| `server/` | W5 Backend | |
| `docs/figma/` | Lead | read only |
| `package.json`, configs | Lead | ask first |

Inside your folder you may add any files: screens, sub-components, hooks, one CSS file per screen or one per folder.
Import your CSS from your screen file (`import './record.css'`).
Each folder has a `routes.tsx`. Keep the route paths as they are. You may add routes in your own `routes.tsx`
after you tell the lead the path. Add the path helper request to the lead, so `src/app/paths.ts` stays the one list.

To ask for a change in a shared file, write the request in your PR description under "Requests to lead"
and, if you are blocked, tell the lead at once. A local workaround inside your folder is fine until the lead answers.

## 3. Rules for all code

- Match the Figma PNG in `docs/figma/`. The web app has no fake iOS status bar, so the app sits 32 px higher than the frame. Ignore the top 32 px when you compare.
- Colours, fonts and type sizes come from `src/styles/tokens.css` variables only. No hex values or font names in other files.
- Use the shared components. Do not copy them into your folder.
- Use `paths.*` from `src/app/paths.ts` for every link.
- Every action goes through `useDispatch()`. Never write to localStorage or fetch `/api` from a screen.
- New ids: `newId('story')` from `src/lib/ids.ts`. Timestamps: `nowIso()`.
- The acting person is `usePersona()` from `src/lib/session.ts`. Never hard-code "meixin" as the author.
- No em dashes in any user-facing text. No emoji in code. No `console.log`.
- Accessibility: every button has a visible label or an `aria-label`. Use real `<button>` and `<a>`. Keyboard must reach everything. Status text that changes uses `role="status"`.
- Text from the scenario must match `SCENARIO` in `src/shared/seed.ts` word for word.

## 4. Shared components (`src/components/index.ts`)

| Component | Figma | Props |
| --- | --- | --- |
| `Screen` | frame layout | `nav`, `children`, `footer?`, `hideTabBar?`, `tab?: 'archive'\|'record'\|'family'\|'lessons'`, `bodyClassName?` |
| `NavBar` | Breadcrumb Bar 331:708 | `{ title }` for tab roots, or `{ trail: Crumb[], current, onBack?, backTo?, showHome? }` |
| `TabBar` | Navbar 314:155 | `active?` (Screen renders it for you) |
| `Button` | Button 313:191 | `variant?: primary\|secondary\|outline\|ghost\|destructive\|destructive-outline\|link`, `size?: sm\|md\|lg` (default lg), `icon?`, `block?`, plus button attributes |
| `ButtonLink` | Button | same look, `to` instead of `onClick` |
| `Pill` | Pill 314:182 | `kind: draft\|waiting\|differ\|agreed\|ready\|streak`, `children?` label override |
| `Field` | Field 314:224 | `label`, `value`, `onChange(value)`, `multiline?`, `rows?`, `placeholder?`, `hint?`, `invalid?`, `maxLength?` |
| `Avatar` | Avatar 314:215 | `initials`, `size?: 32\|40\|56\|72`, `status?: online\|offline\|none`, `label?` |
| `ChoiceChipGroup` | Choice Chip 372:2016 | `label`, `options: {value,label}[]`, `value`, `onChange` (radio group, arrow keys work) |
| `MeaningCard` | Meaning Card 373:2148 | `authorName`, `authorInitials`, `createdAt`, `text`, `agreed?`, `onMarkAgreed?` |
| `ThreadReply` | Thread Reply 373:2149 | `authorName`, `authorInitials`, `createdAt`, `text` |
| `PhraseCard` | Reply Field 314:225 | `label`, `phrase`, `english`, `tone?: clay\|card` |
| `Sheet` | 06a | `open`, `onClose`, `title`, `leftAction?`, `rightAction?`, `children` |
| `Alert` | 03a | `open`, `title`, `message`, `actions: {label,onClick,tone?: default\|bold\|destructive}[]`, `onDismiss?` |
| `Waveform` | 03, 04, 13 | `levels?` (live 0..1), `bars?`, `tone?: heritage\|primary\|muted`, `height?`, `seed?`, `progress?` |
| `PlayButton` | 01, 05, 09, 13 | `playing`, `onClick`, `label` ("Play ..."), `tone?` |
| `Checkbox` | 07 | `checked`, `onChange`, `children` |
| `Icon` | Icons 313:2 | `name`, `size?` |

CSS helpers in `src/styles/base.css`: `.t-heading .t-title .t-subtitle .t-body .t-display .t-muted .t-italic .t-heritage .t-primary .t-success .t-danger .t-center .stack .row .gap-1..6 .grow .k-card .sr-only`.

## 5. Data store

```ts
import { useAppState, useDispatch } from '../../data/react.tsx';

const state = useAppState();          // AppState, re-renders on change
const dispatch = useDispatch();       // (action: Action) => Promise<void>
await dispatch({ type: 'reply/add', id: newId('reply'), storyId, authorId: persona, text, at: nowIso() });
```

- `DataStore` (`src/data/store.ts`): `mode` ('local' or 'api'), `getState()`, `dispatch(action)`, `subscribe(fn)`, `reset()`.
- Local mode: localStorage key `kinvo.state.v1`. Tabs of one browser stay in sync.
- API mode: used when `GET /api/health` returns JSON `{ ok: true }`. Dispatch updates the UI at once, then takes the server state. Polls every 3 s.
- `?store=local` forces local mode.
- Seed (`createSeed()`): the scenario just before Auntie Lin is added. People: Mei Xin, Ah Ma, Mum. Story `story-swing` (saved, 0:12, term "chhiu-chhian-kha"). Mum's meaning with the suggested reply. An answered request to Mum. History days 5, 8 (no meaning), 9, 10, 11, 12 Sep.
- Demo day is `DEMO_TODAY` = 2026-09-13. Use it as "today" for the calendar and the streak.

## 6. Data model (`src/shared/types.ts`)

`AppState = { schema: 1, people, stories, meanings, replies, requests, attempts, history }`.
Read the file for field docs. Audio is never in AppState.

## 7. Actions (`src/shared/actions.ts`)

| type | fields | effect |
| --- | --- | --- |
| `story/create` | id, title, note, place, occasion, date, durationSec, status ('draft'\|'saved'), by, at | adds a story |
| `story/update` | id, title?, note?, status?, term?, at | patches a story |
| `story/delete` | id | removes the story and its meanings, replies, requests, attempts |
| `person/add` | id, name, relationship, by, at | adds a family member (online). Use `personIdFromName(name, state.people)` for the id |
| `request/send` | id, storyId, fromId, toId, at | asks a person to add a meaning |
| `meaning/add` | id, storyId, authorId, text, context, suggestedReply ({phrase, english} or null), at | adds a meaning, marks the author's open request as answered |
| `reply/add` | id, storyId, authorId, text, at | adds a discussion reply |
| `meaning/agree` | storyId, meaningId, by, at | marks one meaning as agreed |
| `meaning/unagree` | storyId | clears the agreed meaning |
| `attempt/add` | id, storyId, personId, score (0..100), at | stores a practise score (not the audio) |

The reducer ignores an action that does not apply (unknown story, duplicate id). The server validates every action with `parseAction()`.

## 8. Selectors and formatters (`src/shared/`)

`personById`, `storyById`, `meaningsForStory`, `repliesForStory`, `agreedMeaning`, `meaningsDiffer`, `openRequestsFor`,
`storyPill` (draft, waiting, differ, agreed, ready, or null), `lessons`, `calendarDays`, `streak(state, today)`, `addDays`.
`formatTime` ("7:40 pm"), `formatDuration` ("0:12"), `formatDay` ("Sun 13 Sep"), `formatMonth` ("September 2026").

## 9. Session (`src/lib/session.ts`)

- `usePersona()`: 'meixin', 'mum' or 'auntie-lin'. Per tab (sessionStorage). URL: `?as=mum`.
- `useVariant()`: 'a' or 'b' for 04 and 05. Per tab. URL: `?variant=b`.
- Version A: 04 has "Save and ask a helper" plus "Save without asking". Version B: 04 has one Save button, then 05 shows an "Ask a family member?" prompt.

## 10. Audio (`src/lib/audio.ts`)

- `useRecorder()`: `{ status, elapsedSec, levels, blob, url, start, stop, discard }`. Status values: idle, requesting, recording, stopped, denied, unsupported, error. Handle denied and unsupported with a clear message.
- `usePlayer(src)`: `{ playing, progress, durationSec, toggle, stop, failed }`. One player plays at a time.
- `saveClip(key, blob)`, `loadClip(key)`, `deleteClip(key)`, `useClipUrl(key)`: IndexedDB on this phone. Key = story id or attempt id.
- `AH_MA_CLIP_URL`: placeholder for Ah Ma's voice until the team gives the real clip.

## 11. Routes (`src/app/paths.ts`)

| Path | Frame | Owner |
| --- | --- | --- |
| `/archive` | 01 | W4 |
| `/record` | 02 | W1 |
| `/record/recording` | 03, 03a | W1 |
| `/record/save/:storyId` | 04 | W1 |
| `/record/saved/:storyId` | 05 | W1 |
| `/family` | 06, 06a, 06b | W2 |
| `/family/send/:storyId` | 07 | W2 |
| `/family/reply/:storyId` | 08 | W2 |
| `/stories/:storyId/meaning/new` | 09 | W3 |
| `/stories/:storyId/meanings` | 09a, 09b | W3 |
| `/lessons` | 12 | W4 |
| `/lessons/:storyId/practise` | 13 | W4 |

## 12. Definition of done (every worker)

1. `npm run typecheck` and `npm run build` pass.
2. Screenshot each of your screens at 390x844 and compare with its PNG in `docs/figma/`. Put the screenshots in the PR.
3. Keyboard: Tab reaches every control, focus is visible, Escape closes overlays.
4. No em dashes, no emoji, no `console.log`, no hex colours outside tokens.css.
5. Push your branch, open a PR to `main`. Do not merge.
