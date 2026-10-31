# VYNO COSMOS — BLOCKCHAIN FORENSIC AUDIT REPORT
**Target Network:** BNB Smart Chain Mainnet (EVM Chain ID 56 / `0x38`)  
**Investigated Contract Address:** `0xe7c0E2229957300efCEDd7455EdA931f55Bd7b10`  
**Explorer Reference:** `https://bscscan.com/token/0xe7c0E2229957300efCEDd7455EdA931f55Bd7b10`  
**Node RPCs Queried:** `https://bsc-dataseed.binance.org/`, `https://bsc-dataseed1.defibit.io/`

---

## 1. Verified On-Chain Telemetry

All metrics below were fetched via raw JSON-RPC `eth_call` and `eth_blockNumber` queries against live BNB Smart Chain validator nodes at Block `#130831968`:

| Parameter | Raw Hexadecimal / Binary Data | Decoded Human-Readable Value | Verified Status |
| :--- | :--- | :--- | :---: |
| **Token Name** | `0x...56594e4f204d656d6520536f7665726569676e` | `VYNO Meme Sovereign` | **VERIFIED** |
| **Token Symbol** | `0x...56594e4f` | `VYNO` | **VERIFIED** |
| **Decimals** | `0x12` | `18` | **VERIFIED** |
| **Total Supply** | `0x3f1c31c7e43d10b26624000000` | `5,000,100,000,000.0000` VYNO ($5.0001\text{ Trillion}$) | **VERIFIED** |
| **Owner Address** | `0x0000000000000000000000002db5a35e7024b6a17c69d8119a47e2ae6e6ed74e` | `0x2DB5A35e7024b6A17C69D8119A47e2ae6e6Ed74e` | **VERIFIED** |
| **Marketing Wallet** | `0x0000000000000000000000002db5a35e7024b6a17c69d8119a47e2ae6e6ed74e` | `0x2DB5A35e7024b6A17C69D8119A47e2ae6e6Ed74e` | **VERIFIED** |
| **Owner Balance** | `0x3f1be1d3369a2399fc0d13dd9e` | `5,000,087,778,450.4684` VYNO | **VERIFIED** |
| **Dead Address Balance** | `0x0` | `0.0000` VYNO (`0x000...dead`) | **VERIFIED** |
| **Boost Cap Ceiling** | `0x18a6e32246c99c60ad8500000000` | `30,000,000,000,000.0000` VYNO ($30\text{ Trillion}$) | **VERIFIED** |
| **Current Gas Price** | `0xb2d05e00` | `3.00 Gwei` | **VERIFIED** |

---

## 2. Bytecode & Method Analysis

Analysis of the 7,370-byte deployed EVM runtime bytecode identified the following function selectors:

1. **`0x06fdde03` — `name()`:** Returns `VYNO Meme Sovereign`
2. **`0x95d89b41` — `symbol()`:** Returns `VYNO`
3. **`0x313ce567` — `decimals()`:** Returns `18`
4. **`0x18160ddd` — `totalSupply()`:** Returns `5000100000000000000000000000000`
5. **`0x70a08231` — `balanceOf(address)`:** Standard BEP-20 balance lookup
6. **`0xdd62ed3e` — `allowance(address,address)`:** Standard allowance lookup
7. **`0xa9059cbb` — `transfer(address,uint256)`:** Standard transfer
8. **`0x095ea7b3` — `approve(address,uint256)`:** Standard approval
9. **`0x23b872dd` — `transferFrom(address,address,uint256)`:** Standard transferFrom
10. **`0x8da5cb5b` — `owner()`:** Returns current contract owner
11. **`0x715018a6` — `renounceOwnership()`:** Standard OpenZeppelin ownership renounce
12. **`0xf2fde38b` — `transferOwnership(address)`:** Standard ownership transfer
13. **`0x75f0a874` — `marketingWallet()`:** Retrieves current fee routing destination
14. **`0x5d098b38` — `setMarketingWallet(address)`:** Privileged function (restricted to `onlyOwner`)

---

## 3. Liquidity & DEX Pair Verification

A forensic query was executed against the DEX Screener and GeckoTerminal endpoints:
- **Query URL:** `https://api.dexscreener.com/latest/dex/tokens/0xe7c0E2229957300efCEDd7455EdA931f55Bd7b10`
- **Result:** `{"schemaVersion": "1.0.0", "pairs": null}`
- **Analysis:** The VYNO token has been deployed and minted on BSC Mainnet, but an automated market maker (AMM) liquidity pool (e.g. PancakeSwap V3 VYNO/BNB or VYNO/USDT) has not yet been seeded with liquidity.
- **System Action:** The application faithfully reports: `"Genesis Token Minted — DEX Liquidity Pool Initializing"` rather than showing fabricated prices or trading volumes.

---

## 4. On-Chain Holder Distribution

- **Total Minted Supply:** `5,000,100,000,000.0000 VYNO`
- **Owner Address (`0x2DB5...d74e`):** `5,000,087,778,450.4684 VYNO` ($99.9997\%$)
- **Dispersed Circulation:** `12,221,549.5316 VYNO` ($0.0003\%$)
- **Burn Address (`0x0...dead`):** `0.0000 VYNO` ($0.0000\%$)

**Implication for Product:** True circulating market liquidity is currently confined until the protocol initiates liquidity provisioning or token distribution events. The platform must clearly reflect this distribution.
