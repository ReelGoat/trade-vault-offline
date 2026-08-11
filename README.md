# Trade Ledger

Build a premium offline-first trade logging and journaling app called "Trade Vault".



IMPORTANT PROJECT DIRECTION

This is a local-first web app first, but it must be architected so it can later be wrapped with:

- Capacitor for Android

- Tauri for desktop



Do not build cloud features.

Do not add authentication.

Do not use Supabase.

Do not use Firebase.

Do not use any remote backend.

Do not require internet access for core app functionality.



The current target is:

1. Web app / PWA on desktop Linux first

2. Later Android via Capacitor

3. Later desktop via Tauri



So the code must be clean, modular, and wrapper-ready.



--------------------------------------------------

CORE REQUIREMENTS

--------------------------------------------------



Build a slick, modern, offline-first trade journal with the following major areas:



1. Dashboard

2. Log Trade

3. Calendar

4. Analysis

5. Setups

6. Rules

7. Settings

8. Backup / Import / Export



The app must:

- work fully offline after first load

- store all data locally

- persist data after refresh

- feel premium and smooth

- be fully responsive on desktop and mobile

- use sliding/toggle-style navigation where appropriate

- be ready for future native filesystem integration



--------------------------------------------------

TECH STACK

--------------------------------------------------



Use:- React

- TypeScript

- Vite

- Tailwind CSS

- shadcn/ui-style components

- Dexie.js with IndexedDB for local storage

- Zustand or React Context for global state

- date-fns for date handling

- Recharts for charts

- PWA support with manifest and service worker



If possible, use:

- vite-plugin-pwa

- hash-based routing or another routing approach that works well in offline/static/native-wrapper environments



--------------------------------------------------

GLOBAL DESIGN STYLE

--------------------------------------------------



Create a dark, premium, modern trading UI.



Design requirements:

- dark theme by default

- elegant glassmorphism panels

- subtle gradients

- soft shadows

- rounded-xl or rounded-2xl cards

- clean spacing

- smooth micro-interactions

- animated toggle switches

- sliding panels/drawers

- polished empty states

- skeleton loading states

- toast notifications

- confirmation dialogs for destructive actions



Color language:

- green for profit

- red for loss

- neutral slate/gray for empty/no data

- accent color can be cyan/violet/blue



The UI should feel like a high-end trading dashboard, not a basic CRUD app.



--------------------------------------------------

NAVIGATION

--------------------------------------------------



Create a smooth navigation system.

Desktop:

- left sidebar or top nav with animated active indicator



Mobile:

- bottom navigation bar



Include these main destinations:

- Dashboard

- Log

- Calendar

- Analysis

- More/Settings



Also include easy access to:

- Setups

- Rules

- Backup/Settings



Use animated transitions between pages where practical.

Use slide-over drawers/panels for quick editing and detail views.



--------------------------------------------------

DATA MODEL

--------------------------------------------------



Create these local data entities:



Trade:

- id

- symbol

- direction: "long" | "short"

- entryDate

- exitDate

- entryPrice

- exitPrice

- quantity

- positionSize

- fees

- grossPnl

- netPnl

- riskAmount

- rewardAmount

- rMultiple

- status: "open" | "closed"

- strategyId or strategy name

- setupId or setup name

- tags: string[]

- notes

- emotionBeforeTrade

- emotionAfterTrade- followedRules: boolean

- ruleChecklist: array of rule id/name + checked state

- attachments: optional image metadata/blobs

- createdAt

- updatedAt



Setup:

- id

- name

- description

- criteria: string[]

- isActive

- createdAt

- updatedAt



Rule:

- id

- name

- description

- category

- isActive

- createdAt

- updatedAt



Settings:

- accountStartingBalance

- defaultRiskPercent

- baseCurrency

- timezone

- defaultCommission

- instruments list

- theme preference

- backup preferences

- createdAt

- updatedAt



--------------------------------------------------

STORAGE ARCHITECTURE

--------------------------------------------------



This is critical.



Create a clean storage abstraction layer.



Do not scatter browser-only storage logic across components.



Structure the app so storage is handled through services such as:

- src/services/db.ts

- src/services/storage.ts

- src/services/backup.ts- src/services/platform.ts

- src/services/analytics.ts



Primary storage for now:

- IndexedDB using Dexie.js



Design the storage layer so it can later be replaced or extended with:

- SQLite

- Capacitor Filesystem

- Tauri filesystem



Do not make future native integration painful.



--------------------------------------------------

LOCAL DATA RULES

--------------------------------------------------



All user-created data must be stored locally.



No cloud sync.

No external API calls.

No remote database.

No telemetry.

No account system.



The app should be completely usable in airplane mode.



--------------------------------------------------

OFFLINE / PWA REQUIREMENTS

--------------------------------------------------



Make the app installable and offline-capable.



Requirements:

- add web app manifest

- add service worker

- cache app shell and static assets

- app must work offline after first load

- no core feature should depend on internet access

- use local assets where possible

- avoid external fonts/icons if they break offline usage

- if external fonts are used, provide fallback system fonts



The app should be installable as a PWA on desktop Linux and mobile browsers.



--------------------------------------------------

DASHBOARD PAGE

--------------------------------------------------



Create a beautiful dashboard.

Show:

- account balance / starting balance

- total net P&L

- win rate

- profit factor

- expectancy

- open trades count

- closed trades count

- recent trades list

- quick equity curve preview

- current month P&L

- best day

- worst day

- quick actions:

  - add trade

  - view calendar

  - view analysis



Use polished stat cards and charts.



--------------------------------------------------

LOG TRADE PAGE

--------------------------------------------------



Create a premium trade entry form.



Fields:

- symbol

- direction toggle: long/short

- status: open/closed

- entry date/time

- exit date/time

- entry price

- exit price

- quantity

- position size

- fees/commission

- strategy

- setup

- tags input

- notes

- emotion before trade

- emotion after trade

- rule checklist

- optional screenshots/attachments



Behavior:

- clean form layout

- mobile friendly- toggles/sliders where useful

- save locally

- edit existing trades

- delete trades with confirmation

- duplicate trade option if useful



Automatic calculations:

- gross P&L

- net P&L

- R multiple

- risk/reward

- percentage return



Suggested formulas:

- Long gross P&L = (exitPrice - entryPrice) * quantity

- Short gross P&L = (entryPrice - exitPrice) * quantity

- Net P&L = gross P&L - fees

- R multiple = netPnl / riskAmount if riskAmount > 0



Validation:

- warn if exit date is before entry date

- warn if trade is closed but exit price/date missing

- prevent invalid numeric entries

- gracefully handle missing optional fields



--------------------------------------------------

CALENDAR PAGE

--------------------------------------------------



Create a calendar-based trade viewer.



Requirements:

- monthly calendar grid

- each date box shows net realized P&L for that day

- color-code each date:

  - green for profit

  - red for loss

  - neutral for no trades

- show number of trades on that day

- show monthly net P&L summary

- allow switching months

- clicking a date opens a side panel or drawer with trades for that date

- from that panel, user can:

  - view trades

  - edit trade

  - delete trade

  - add new trade for that date



Important:

- closed trades should count toward realized P&L based on exit date- open trades should not distort realized calendar P&L unless shown separately

- optionally show an indicator if a day has open trades



Make the calendar visually beautiful and easy to scan.



--------------------------------------------------

ANALYSIS PAGE

--------------------------------------------------



Create a full analysis page generated automatically from local trade data.



Include KPIs:

- total net P&L

- total gross P&L

- total fees

- win rate

- loss rate

- breakeven rate

- number of wins

- number of losses

- number of breakeven trades

- average win

- average loss

- largest win

- largest loss

- average R multiple

- profit factor

- expectancy

- max drawdown

- current win streak

- current loss streak



Include charts:

- equity curve

- daily net P&L bar chart

- monthly net P&L bar chart

- P&L by symbol

- P&L by setup

- P&L by strategy

- P&L by direction

- win/loss distribution

- performance by day of week

- performance by hour of day

- rule-following vs rule-breaking performance



Include tables:

- performance by setup

- performance by strategy

- performance by symbol

- performance by tags- performance by rule compliance



Filters:

- date range

- symbol

- strategy

- setup

- direction

- tags

- win/loss status

- followed rules or not



The analysis page should feel powerful but clean.



--------------------------------------------------

SETUPS PAGE

--------------------------------------------------



Create a Setups page.



Features:

- create setup

- edit setup

- delete setup

- toggle active/inactive

- setup description

- setup criteria checklist

- show number of trades using that setup

- show win rate and net P&L for that setup

- open setup details in drawer or detail page



Make it visually card-based and polished.



--------------------------------------------------

RULES PAGE

--------------------------------------------------



Create a Rules page.



Features:

- create rule

- edit rule

- delete rule

- toggle active/inactive

- categorize rule

- show rule compliance stats

- show performance when rule followed vs not followed



Example categories:

- risk- entry

- exit

- psychology

- confirmation



--------------------------------------------------

SETTINGS PAGE

--------------------------------------------------



Create a clean Settings page.



Sections:

- profile/trading preferences

- account settings

- instruments

- backup and restore

- app info



Settings fields:

- account starting balance

- default risk percent

- base currency

- timezone

- default commission

- instruments list

- theme preference



--------------------------------------------------

BACKUP / EXPORT / IMPORT

--------------------------------------------------



This is a core feature.



Create a Backup / Data page.



Export:

- one-click export of all app data to a JSON file

- file should include:

  - schemaVersion

  - appVersion

  - exportedAt

  - settings

  - trades

  - setups

  - rules

- export must be complete enough to restore the app on another device



Import:

- import from JSON backup

- validate backup file structure- show confirmation before replacing current data

- if possible, automatically create a safety backup before replacing data

- show success/error toast messages



CSV export:

- export trades to CSV

- include important fields:

  - symbol

  - direction

  - entryDate

  - exitDate

  - entryPrice

  - exitPrice

  - quantity

  - fees

  - netPnl

  - rMultiple

  - setup

  - strategy

  - tags

  - notes



Optional desktop folder support:

- if File System Access API is supported, allow choosing a backup folder

- if unsupported, fall back gracefully to normal download/export

- do not break the app on browsers without this API



--------------------------------------------------

ATTACHMENTS / SCREENSHOTS

--------------------------------------------------



If practical, support optional trade attachments:

- user can attach screenshots to a trade

- store locally in IndexedDB

- show thumbnail preview

- allow delete attachment



If full attachment export becomes too complex, at minimum:

- support attachments locally

- include metadata in export

- warn user if attachment export/import is partial or limited



Do not let attachments break the core app.



--------------------------------------------------

FUTURE NATIVE WRAPPER PREPARATION

--------------------------------------------------



Prepare the codebase for later wrapping with:

- Capacitor Android- Tauri desktop



Important:

- keep platform-specific logic isolated

- avoid direct browser-only APIs in components when possible

- use service layers for:

  - storage

  - backup

  - file access

  - platform detection



Create simple placeholder service interfaces where appropriate, such as:

- exportData()

- importData()

- saveBackupToFilesystem()

- pickBackupFile()

- isNativePlatform()



The app should work perfectly as a web app now, but be easy to enhance later for native file access.



--------------------------------------------------

EMPTY STATES

--------------------------------------------------



Create beautiful empty states for:

- no trades yet

- no setups yet

- no rules yet

- no analysis data yet

- no calendar trades for selected month



Each empty state should include a clear call to action.



--------------------------------------------------

QUALITY AND UX DETAILS

--------------------------------------------------



Include:

- responsive layouts

- polished forms

- clean modals/drawers

- delete confirmations

- loading states

- error states

- toast feedback

- accessible buttons and labels

- stable date formatting

- consistent currency formatting

- smooth transitions

The app should feel complete, not like a prototype.



--------------------------------------------------

ACCEPTANCE CRITERIA

--------------------------------------------------



The app is considered successful if:



1. It works fully offline after first load

2. All data is stored locally

3. No cloud backend or login is required

4. Trades can be created, edited, and deleted

5. Data persists after refresh

6. Calendar shows daily net P&L correctly

7. Analysis page calculates metrics from local trades

8. Setups and rules can be managed

9. Export creates a complete JSON backup

10. Import restores from that backup

11. The UI is premium, slick, and responsive

12. The code is structured cleanly for future Capacitor/Tauri wrapping



--------------------------------------------------

IMPORTANT CONSTRAINTS

--------------------------------------------------



Do not:

- add Supabase

- add authentication

- add remote database features

- add external analytics

- make core features depend on internet

- overcomplicate the first version with cloud sync



If a feature cannot be done cleanly in the browser, implement a graceful fallback and keep the app stable.



--------------------------------------------------

FINAL GOAL

--------------------------------------------------



Create a polished, offline-first, local-only trade journaling app that:

- looks premium

- works smoothly on desktop and mobile web

- can later be packaged for Android with Capacitor

- can later be packaged for desktop with Tauri

- keeps all user data local

- includes powerful analysis

- includes a calendar P&L board

- includes setups and rules management

- includes full backup/restore via JSON

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a29743e3-a525-410d-a7bf-f78a75449abe).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
