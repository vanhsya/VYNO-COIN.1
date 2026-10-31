# VYNO COSMOS — DATABASE & STATE AUDIT

**Current Architecture:** Transient In-Memory Cache with Direct JSON-RPC Querying  
**Evaluation Scope:** Existing Persistence, Cache Layer, and Target Database Architecture  

---

## 1. Existing State & Persistence Model

- **Database Engine in Active Use:** None (Stateless Backend with TTL in-memory cache).
- **Telemetry Cache Strategy:** In `/services/bscBlockchainService.ts`, a global `cachedTelemetry` object with a 10,000 ms (10-second) TTL is used to prevent rate-limiting against public BSC RPC nodes while ensuring near real-time updates.
- **Client-Side Persistence:** Local React state for active tab selection, connected wallet address, and simulated staking calculator values.

---

## 2. Identified Deficiencies for Production

1. **No Historical Event Indexing:**
   - Without a database, historical BEP-20 `Transfer` events cannot be queried chronologically without incurring heavy RPC costs or encountering RPC node block range limits (typically capped at 5,000 blocks per query).
2. **No User Preference / Watchlist Persistence:**
   - User wallet watchlists, transaction histories, and customized HUD preferences are reset upon page reload.
3. **No DAO Governance Record Keeping:**
   - Proposals and vote tallies currently live in ephemeral component state.

---

## 3. Recommended Production Database Schema (PostgreSQL / Cloud SQL)

For production scalability, the following relational schema is designed for implementation:

### 3.1 `token_telemetry_snapshots`
- `id` (UUID, Primary Key)
- `contract_address` (VARCHAR(42))
- `block_height` (BIGINT)
- `total_supply` (NUMERIC(78, 0))
- `burned_amount` (NUMERIC(78, 0))
- `gas_price_gwei` (NUMERIC(10, 4))
- `created_at` (TIMESTAMPTZ)

### 3.2 `indexed_token_transfers`
- `tx_hash` (VARCHAR(66), Primary Key)
- `block_number` (BIGINT, Indexed)
- `log_index` (INTEGER)
- `from_address` (VARCHAR(42), Indexed)
- `to_address` (VARCHAR(42), Indexed)
- `amount` (NUMERIC(78, 0))
- `timestamp` (TIMESTAMPTZ)

### 3.3 `dao_proposals`
- `id` (VARCHAR(32), Primary Key)
- `creator_address` (VARCHAR(42))
- `title` (VARCHAR(255))
- `description` (TEXT)
- `start_block` (BIGINT)
- `end_block` (BIGINT)
- `votes_for` (NUMERIC(78, 0))
- `votes_against` (NUMERIC(78, 0))
- `status` (VARCHAR(32))
- `created_at` (TIMESTAMPTZ)

### 3.4 `wallet_portfolio_snapshots`
- `wallet_address` (VARCHAR(42), Indexed)
- `network` (VARCHAR(32))
- `vyno_balance` (NUMERIC(78, 0))
- `bnb_balance` (NUMERIC(78, 0))
- `snapshot_timestamp` (TIMESTAMPTZ)
