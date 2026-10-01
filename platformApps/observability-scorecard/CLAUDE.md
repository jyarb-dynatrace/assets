# Observability Scorecard — Dynatrace Platform App

A Dynatrace Platform App that shows signal coverage (Metrics, Traces, Logs, Cloud Events, SLOs) per service for the last 24 hours.

## Commands

```bash
npm start          # Local dev server (opens browser, interactive OAuth)
npm run build      # Production build
npm run deploy     # Build + deploy to configured environment
npm run lint       # ESLint
```

## Project structure

```
app.config.json          # App metadata, scopes, build config
src/
└── ui/
    ├── main.tsx         # React entry point
    ├── tsconfig.json    # TypeScript config (typeRoots point to ../../node_modules)
    └── app/
        ├── App.tsx      # Root component (Page layout)
        └── pages/
            └── Scorecard.tsx  # Main scorecard component — all DQL + SLO logic here
```

## Key SDK APIs

- **DQL queries**: `queryExecutionClient` from `@dynatrace-sdk/client-query` — use `queryExecute` then poll with `queryPoll`
- **SLO list**: `serviceLevelObjectivesClient.getSlo()` from `@dynatrace-sdk/client-classic-environment-v2` — response field is `slo` (not `slos`), paginated via `nextPageKey`
- **UI components**: `@dynatrace/strato-components-preview` — `DataTable`, `TitleBar`, `FilterBar`, `ToggleButtonGroup`

## DataTable sort gotcha

`enableDefaultSort` requires `onSortChange` to be present (type union `DataTableOnSortPropsWithChange`). Use a no-op if you don't need a custom handler:

```tsx
<DataTable onSortChange={() => {}} enableDefaultSort ...>
```

## Authentication

No token fields in `app.config.json` — auth is handled via:
- **Interactive**: `npm start` opens a browser OAuth flow automatically
- **CI/non-interactive**: set env vars before running `deploy`
  - `DT_APP_OAUTH_CLIENT_ID` + `DT_APP_OAUTH_CLIENT_SECRET`
  - or `DT_APP_PLATFORM_TOKEN`

## Environment

- Target: `https://dqi8021h.sprint.apps.dynatracelabs.com/`
- App ID: `my.observability.scorecard`
- `dt-app` v1.0+ requires `build.sourceRoot` in `app.config.json` and source under `<sourceRoot>/ui/`

@AGENTS.md