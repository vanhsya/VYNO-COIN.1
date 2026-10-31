# VYNO COSMOS — API INVENTORY & SPECIFICATION

This document lists all active endpoints and protocol interfaces implemented in `/server.ts` and client services.

---

## 1. REST Endpoints

### 1.1 Verified Token Telemetry
- **Route:** `GET /api/blockchain/vyno-live`
- **Query Parameters:** `refresh` (`boolean`, optional, default: `false`)
- **Headers:** `Content-Type: application/json`
- **Response Code:** `200 OK`
- **Payload Schema:**
  ```json
  {
    "contractAddress": "0xe7c0E2229957300efCEDd7455EdA931f55Bd7b10",
    "name": "VYNO Meme Sovereign",
    "symbol": "VYNO",
    "decimals": 18,
    "totalSupplyRaw": "5000100000000000000000000000000",
    "totalSupplyFormatted": "5,000,100,000,000.0000",
    "ownerAddress": "0x2db5a35e7024b6a17c69d8119a47e2ae6e6ed74e",
    "marketingWalletAddress": "0x2db5a35e7024b6a17c69d8119a47e2ae6e6ed74e",
    "blockHeight": 130831968,
    "blockHeightHex": "0x7cc5a20",
    "gasPriceGwei": "3.00",
    "network": "BNB Smart Chain Mainnet",
    "chainId": 56,
    "isVerifiedOnChain": true,
    "rpcSource": "https://bsc-dataseed.binance.org/",
    "lastUpdated": "2026-10-31T09:20:10.586Z",
    "boostCapFormatted": "30,000,000,000,000.0000",
    "burnAddressBalanceFormatted": "0.0000"
  }
  ```

### 1.2 Live On-Chain Wallet Balance
- **Route:** `GET /api/blockchain/balance/:address`
- **URL Parameter:** `address` (40-hex character EVM address with `0x` prefix)
- **Response Code:** `200 OK` (or `400 Bad Request` if address is invalid)
- **Payload Schema:**
  ```json
  {
    "address": "0x2DB5A35e7024b6A17C69D8119A47e2ae6e6Ed74e",
    "chainId": 56,
    "network": "BNB Smart Chain Mainnet",
    "blockHeight": 130831968,
    "balances": {
      "vyno": {
        "raw": "5000087778450468421398529238270",
        "formatted": "5,000,087,778,450.4684",
        "symbol": "VYNO"
      },
      "bnb": {
        "raw": "639953629917136",
        "formatted": "0.0006",
        "symbol": "BNB"
      }
    },
    "verifiedOnChain": true,
    "timestamp": "2026-10-31T09:20:10.586Z"
  }
  ```

### 1.3 Crypto Market Intelligence
- **Route:** `GET /api/blockchain/market`
- **Response Code:** `200 OK`
- **Payload Schema:** Returns live price, liquidity, pair addresses, and DEX status from DEX Screener or GeckoTerminal.

### 1.4 Smart Contract Security Audit
- **Route:** `GET /api/blockchain/security-audit`
- **Response Code:** `200 OK`
- **Payload Schema:** Returns compiler version (`Solidity 0.8.20`), ownership mapping, privileged function selectors, and honeypot test results.

### 1.5 Multichain Adapter Registry
- **Route:** `GET /api/blockchain/multichain`
- **Response Code:** `200 OK`
- **Payload Schema:** Returns array of 6 network adapters (BSC active, others standby locked).

### 1.6 Health Check
- **Route:** `GET /api/health`
- **Response Code:** `200 OK` (`{"status": "ok"}`)

---

## 2. WebSocket Protocol (`/api/live`)

- **Protocol:** `ws://` / `wss://`
- **Sub-protocol:** Bidirectional real-time Gemini Live audio bridge
- **Inbound Message Format (Client to Server):**
  - Mode switch: `{"type": "setMode", "mode": "Professional" | "Enthusiastic" | "Cautious" | "Zen" | "Thulu"}`
  - Audio chunk: `{"realtimeInput": {"mediaChunks": [{"mimeType": "audio/pcm;rate=16000", "data": "<base64>"}]}}`
- **Outbound Message Format (Server to Client):**
  - Audio chunk: `{"serverContent": {"modelTurn": {"parts": [{"inlineData": {"mimeType": "audio/pcm;rate=24000", "data": "<base64>"}}]}}}`
  - Transcription: `{"serverContent": {"outputTranscription": {"text": "..."}}}`
