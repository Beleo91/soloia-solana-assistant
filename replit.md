# ARCHERMES — Web3 Marketplace (Arc Testnet)

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
<!-- maintainer: Leonardo Soares <leosoares482@gmail.com> -->

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

### `artifacts/archermes-vitrine` (`@workspace/archermes-vitrine`)

Cyberpunk-styled Web3 marketplace frontend built with React + Vite + TypeScript + Tailwind CSS v4.

**Chain**: Arc Testnet (chainId 5042002), RPC: `https://rpc.testnet.arc.network`, Explorer: `https://testnet.arcscan.app`
**Contract v5 (ACTIVE)**: `0xd16FA8418D52aAf71BCc00036f1FDaA5A684Cce7` (deployed 2026-03-29, tx `0xb8c437…`, block 34420326)
**Contract v4 (deprecated)**: `0x78cd1587e4CA8e052A7672faF43F0Cfb16D16447`
**Contract v3 (deprecated)**: `0x4ba9BDBCA5Bb8aF32B30F5F7bA5Ef58BA7B09557`
**Auth**: Privy (`@privy-io/react-auth`)
**Key files**:
- `src/HomePage.tsx` — vitrine principal (section order: Boosted → VIP → Leaderboard → Partners circles → Minhas Compras → Vitrine)
- `src/StoreDashboard.tsx` — painel do lojista (tabs: loja, produtos, pedidos, visual); rating modal before releaseFunds
- `src/Home.css` — layout-critical CSS (cyberpunk card classes, neon glows, glow-pulse, scroll-oculto)
- `src/contract.ts` — ABI + CONTRACT_ADDRESS (v5, 42 entries)
- `src/chains.ts` — arcTestnet chain config
- `src/stablecoins.ts` — USDC/EURC ERC-20 helpers (approveERC20, transferERC20)
- `src/contractUtils.ts` — shared `extractContractError` helper
- `contracts/Archermes.sol` — v5 source with 7-star rating system

**v5 Contract (escrow + 7-star rating)**:
- `Order` struct: `orderId, itemId, buyer, seller, amount, status (0=Pending/1=Shipped/2=Completed/3=Refunded), trackingCode`
- `Store` struct: `storeName, expiresAt, tier, productCount, totalStars, reviewCount`
- `buyItem(_itemId)` — creates Order, holds ETH in escrow
- `updateTracking(orderId, code)` — seller only → sets tracking code, status → Shipped
- `releaseFunds(orderId, rating uint8)` — buyer only → releases escrow, records 1–7 star rating → status Completed
- `refundOrder(orderId)` — seller/admin → refunds buyer, status → Refunded
- `getOrdersByBuyer(addr)` / `getOrdersBySeller(addr)` — view helpers returning orderId arrays
- `getStoreRating(addr)` — returns (totalStars, reviewCount, avgX100) where avgX100 is avg*100
- Events: `OrderCreated(orderId, itemId, buyer indexed, seller, amount)`, `StoreRated(store indexed, buyer indexed, stars, newAvgX100)`

**StoreDashboard tabs**:
1. `loja` — store info & registration
2. `produtos` — manage listings (cancel, delete, boost)
3. `pedidos` — "Pedidos a Enviar": pending orders with tracking input → `updateTracking`; shipped orders show code; completed orders show payment + rating received
4. `visual` — colors, avatar, banner

**HomePage sections (in order)**:
1. Boosted Products — `produtosImpulsionados` grid (gold/purple neon cards)
2. Featured VIP — `lojasVip` horizontal scroll (banner+avatar overlay, 200px cards); hidden when empty
3. Market Champions Leaderboard — top sellers/buyers + star rating from `getStoreRating`
4. Partner Stores — compact avatar circles (wrapping flex row)
5. Minhas Compras — buyer orders; "Confirmar Entrega" opens 7-star rating modal → `releaseFunds(orderId, rating)`
6. On-Chain Showcase (Vitrine) — all active products from `ItemListed` events

**Rating modal (both HomePage + StoreDashboard)**:
- 7 interactive star buttons (★), hover preview, selected/7 counter
- Confirm button disabled until star >= 1
- Calls `releaseFunds(orderId, selectedStars)`

**Features**:
- On-chain product listing via smart contract (listItem / buyItem)
- ERC-20 stablecoin support (USDC/EURC): approve → transfer flow (off-chain, unaffected by escrow)
- Persistent deletion per wallet address (localStorage `archermes_deleted_items_<addr>`)
- Produtos Impulsionados: 4 premium cards with gold/purple neon borders, glow-pulse animation
- StoreDashboard visual panel: preset banner gallery, preset avatar gallery, file upload dropzones, neon color picker
- Stock system: `uint256 stock` in Item struct; frontend shows ⛔ ESGOTADO badge
- ImgBB pipeline: API server `/api/images/upload` proxies to ImgBB; permanent `https://i.ibb.co/...` URLs stored
- Glassmorphism UI: modals use `backdrop-filter: blur(24px)` glass effect
- Market Champions Leaderboard: top 3 sellers + buyers from `OrderCreated` events (9k block window) + star ratings

**Image Hosting**:
- `src/imageUploader.ts` — abstraction layer for image uploads
- When `VITE_IMGBB_API_KEY` is set: images uploaded to ImgBB CDN, permanent https:// URLs
- Without the key: base64 localStorage fallback (per-browser only)

**Notes**:
- "Invalid hook call" in console is pre-existing Privy/Coinbase connector HMR issue, not a bug
- Tailwind v4: layout-critical styles use custom CSS classes in `Home.css`
- v5 contract has store subscription checks **disabled** (commented out in `listItem`) for open testing
- Admin wallet `0x434189487484F20B9Bf0e0c28C1559B0c961274B` bypasses product-count checks in frontend
- `platformFeePercent = 3`, `referralFeePercent = 2`
- Deployer wallet: `0xC87e5c146ed67625eAf90dD6B6780b22cb2f5a41`
- Deploy scripts: `contracts/compile.cjs` → `contracts/deploy.js` (reads `DEPLOYER_PRIVATE_KEY`)
