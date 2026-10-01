# Observability Scorecard — Agent Context

A Dynatrace Platform App (dt-app v1.0+) showing signal coverage per service: Metrics, Traces, Logs, Cloud Events, and SLOs over the last 24 hours.

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm start` |
| Production build | `npm run build` |
| Deploy | `npm run deploy` |
| Lint | `npm run lint` |

## Source layout

```
app.config.json               # App manifest, scopes, build.sourceRoot = "src"
src/
└── ui/                       # All UI code lives here (dt-app v1.0 requirement)
    ├── main.tsx              # React entry point
    ├── tsconfig.json         # TS config; typeRoots use ../../node_modules paths
    └── app/
        ├── App.tsx           # Page shell
        └── pages/
            └── Scorecard.tsx # All data fetching, DQL queries, SLO logic, table UI
```

Only the `ui/` subtree exists — no `api/`, `actions/`, or `settings/` directories.

## SDK usage patterns

### DQL queries (`@dynatrace-sdk/client-query`)

```ts
const { requestToken } = await queryExecutionClient.queryExecute({ body: { query } });
if (!requestToken) throw new Error('no requestToken');

let state: string | undefined;
while (state !== 'SUCCEEDED' && state !== 'FAILED' && state !== 'CANCELLED') {
  const poll = await queryExecutionClient.queryPoll({ requestToken });
  state = poll.state;
  if (poll.result?.records) records = poll.result.records;
}
```

`requestToken` is typed `string | undefined` — guard before passing to `queryPoll`.

### SLO client (`@dynatrace-sdk/client-classic-environment-v2`)

- Export: `serviceLevelObjectivesClient` (not `sloClient`)
- Method: `.getSlo({ pageSize, nextPageKey })` (not `.getSlos`)
- Response list field: `.slo` (not `.slos`)
- Pagination: `response.nextPageKey`

### DataTable sort (`@dynatrace/strato-components-preview`)

`enableDefaultSort` belongs to `DataTableOnSortPropsWithChange`, which requires `onSortChange`. Always pair them:

```tsx
<DataTable onSortChange={() => {}} enableDefaultSort resizable ...>
```

Omitting `onSortChange` causes a TS2322 compile error even if you don't need a custom handler.

## app.config.json constraints

The schema (`additionalProperties: false`) rejects unknown top-level keys. Valid top-level keys: `$schema`, `environmentUrl`, `build`, `app`, `injectSdk`, `server`, `plugins`. There is no `token` or `oauth` field — authentication is external (see below).

## Authentication

Auth is not stored in `app.config.json`. Use:

- **Interactive dev**: `npm start` triggers browser OAuth automatically.
- **CI/non-interactive**: set environment variables before running commands:
  - `DT_APP_OAUTH_CLIENT_ID` + `DT_APP_OAUTH_CLIENT_SECRET`
  - or `DT_APP_PLATFORM_TOKEN`

## dt-app v1.0 structure requirements

- `app.config.json` must have `"build": { "sourceRoot": "<dir>" }`
- UI entry point must be at `<sourceRoot>/ui/main.tsx`
- `tsconfig.json` must be at `<sourceRoot>/ui/tsconfig.json`
- `typeRoots` in that tsconfig must use paths relative to `src/ui/` (e.g., `../../node_modules/@types`)

## Linting

ESLint config is at `.eslintrc`. Security plugins active: `@microsoft/eslint-plugin-sdl`, `eslint-plugin-no-secrets`. Run `npm run lint` before committing.

