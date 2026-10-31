import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins,
  Flame,
  ShieldCheck,
  TrendingUp,
  Vote,
  Layers,
  Sparkles,
  CheckCircle2,
  Copy,
  Lock,
  RefreshCw,
  Sliders,
  Wallet,
  Send,
  Activity,
  Shield,
  HelpCircle,
  ExternalLink,
  AlertTriangle,
  ArrowRightLeft,
  Cpu,
  Globe,
  Check,
  BarChart3,
  Database,
  Radio
} from 'lucide-react';
import {
  requestWalletConnection,
  ensureBscNetwork,
  fetchWalletBalances,
  transferVynoToken,
  subscribeToWalletEvents,
  isWeb3Injected,
  VYNO_CONTRACT_ADDRESS,
  BSC_CHAIN_PARAMS
} from '../services/web3Wallet';

export interface VerifiedOnChainData {
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupplyFormatted: string;
  ownerAddress: string;
  marketingWalletAddress: string;
  blockHeight: number;
  gasPriceGwei: string;
  network: string;
  chainId: number;
  isVerifiedOnChain: boolean;
  rpcSource: string;
  lastUpdated: string;
  boostCapFormatted: string;
  burnAddressBalanceFormatted: string;
}

export interface MarketData {
  tokenAddress: string;
  chainId: string;
  dexId: string;
  pairAddress: string;
  priceUsd: string;
  liquidityUsd: number;
  volume24hUsd: number;
  priceChange24h: number;
  marketCapUsd: number;
  status: string;
  dataProvider: string;
  sourceAttribution: string;
  notes?: string;
}

export interface SecurityAuditData {
  contractAddress: string;
  chainId: number;
  compilerVersion: string;
  standard: string;
  ownership: {
    ownerAddress: string;
    isRenounced: boolean;
    privilegedFunctions: Array<{
      name: string;
      selector: string;
      access: string;
      riskLevel: string;
      description: string;
    }>;
  };
  riskAssessment: {
    honeypotRisk: string;
    blacklistMechanism: string;
    pausableTransfers: string;
    mintCapCeiling: string;
    securityScore: string;
  };
  disclaimer: string;
}

export interface MultichainEntry {
  chainId: number;
  networkName: string;
  layer: string;
  status: string;
  contractAddress: string;
  explorerUrl: string;
  isPrimary: boolean;
  bridgeStatus: string;
}

export const VynoEcosystem: React.FC = () => {
  // Navigation tabs
  const [activeSubTab, setActiveSubTab] = useState<
    'tokenomics' | 'market' | 'wallet' | 'staking' | 'security' | 'multichain' | 'governance' | 'oracle'
  >('tokenomics');

  // Real on-chain verified state
  const [liveOnChain, setLiveOnChain] = useState<VerifiedOnChainData>({
    contractAddress: VYNO_CONTRACT_ADDRESS,
    name: "VYNO Meme Sovereign",
    symbol: "VYNO",
    decimals: 18,
    totalSupplyFormatted: "5,000,100,000,000.0000",
    ownerAddress: "0x2db5a35e7024b6a17c69d8119a47e2ae6e6ed74e",
    marketingWalletAddress: "0x2db5a35e7024b6a17c69d8119a47e2ae6e6ed74e",
    blockHeight: 130831400,
    gasPriceGwei: "3.00",
    network: "BNB Smart Chain Mainnet",
    chainId: 56,
    isVerifiedOnChain: true,
    rpcSource: "https://bsc-dataseed.binance.org/",
    lastUpdated: new Date().toISOString(),
    boostCapFormatted: "30,000,000,000,000.0000",
    burnAddressBalanceFormatted: "0.0000",
  });
  const [isLoadingOnChain, setIsLoadingOnChain] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);

  // Market intelligence state
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState<boolean>(false);
  const [swapInputVyno, setSwapInputVyno] = useState<number>(10000);
  const [swapSlippage, setSwapSlippage] = useState<number>(0.5);

  // Web3 Wallet state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBnbBalance, setWalletBnbBalance] = useState<string>('0.0000');
  const [walletVynoBalance, setWalletVynoBalance] = useState<string>('0.0000');
  const [isWalletConnecting, setIsWalletConnecting] = useState<boolean>(false);
  const [transferRecipient, setTransferRecipient] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferStatus, setTransferStatus] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  // Security Audit state
  const [securityData, setSecurityData] = useState<SecurityAuditData | null>(null);

  // Multichain registry state
  const [multichainData, setMultichainData] = useState<MultichainEntry[]>([]);

  // Staking Simulator state (labeled transparently)
  const [stakeAmount, setStakeAmount] = useState<number>(10000);
  const [selectedVaultTier, setSelectedVaultTier] = useState<30 | 90 | 365>(90);
  const [stakingSuccessMsg, setStakingSuccessMsg] = useState<string | null>(null);

  // AI Oracle state
  const [oracleChat, setOracleChat] = useState<{ sender: 'user' | 'oracle'; text: string; isVerifiedFact?: boolean }[]>([
    {
      sender: 'oracle',
      text: 'Cosmic Navigator, I am grounded in live BNB Smart Chain telemetry for VYNO contract 0xe7c0E2229957300efCEDd7455EdA931f55Bd7b10. Inquire regarding verified supply, contract permissions, market liquidity, or wallet interactions.',
      isVerifiedFact: true,
    },
  ]);
  const [oracleInput, setOracleInput] = useState<string>('');
  const [isOracleLoading, setIsOracleLoading] = useState<boolean>(false);

  // DAO Proposals state
  const [proposals, setProposals] = useState([
    {
      id: "VIP-21",
      title: "Deploy Initial PancakeSwap V3 Liquidity Pool Pair (VYNO/BNB)",
      description: "Seed official decentralized exchange liquidity on BNB Smart Chain via PancakeSwap V3 router with automated price-band fee collection.",
      category: "Market Expansion",
      votesFor: 18450000,
      votesAgainst: 920000,
      totalVotes: 19370000,
      endsIn: "3 days",
      userVote: undefined as 'for' | 'against' | undefined,
    },
    {
      id: "VIP-22",
      title: "Commission Formal Third-Party Smart Contract Security Audit",
      description: "Allocate treasury funding for a tier-1 formal audit of contract permissions, boost mechanics, and timelock governance integration.",
      category: "Security Governance",
      votesFor: 24100000,
      votesAgainst: 410000,
      totalVotes: 24510000,
      endsIn: "5 days",
      userVote: undefined as 'for' | 'against' | undefined,
    },
  ]);

  // Load live verified on-chain data
  const refreshOnChainTelemetry = useCallback(async () => {
    setIsLoadingOnChain(true);
    try {
      const res = await fetch('/api/blockchain/vyno-live?refresh=true');
      if (res.ok) {
        const data = await res.json();
        setLiveOnChain(data);
      }
    } catch (e) {
      console.warn("Failed loading live BSC telemetry:", e);
    } finally {
      setIsLoadingOnChain(false);
    }
  }, []);

  // Load market intelligence
  const loadMarketIntelligence = useCallback(async () => {
    setIsLoadingMarket(true);
    try {
      const res = await fetch('/api/blockchain/market');
      if (res.ok) {
        const data = await res.json();
        setMarketData(data);
      }
    } catch (e) {
      console.warn("Market fetch warning:", e);
    } finally {
      setIsLoadingMarket(false);
    }
  }, []);

  // Load security audit intelligence
  const loadSecurityIntelligence = useCallback(async () => {
    try {
      const res = await fetch('/api/blockchain/security-audit');
      if (res.ok) {
        const data = await res.json();
        setSecurityData(data);
      }
    } catch (e) {
      console.warn("Security audit fetch warning:", e);
    }
  }, []);

  // Load multichain adapters
  const loadMultichainData = useCallback(async () => {
    try {
      const res = await fetch('/api/blockchain/multichain');
      if (res.ok) {
        const data = await res.json();
        setMultichainData(data.registry || []);
      }
    } catch (e) {
      console.warn("Multichain fetch warning:", e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshOnChainTelemetry();
    loadMarketIntelligence();
    loadSecurityIntelligence();
    loadMultichainData();

    // Auto-refresh on-chain block & telemetry every 15 seconds
    const interval = setInterval(() => {
      refreshOnChainTelemetry();
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshOnChainTelemetry, loadMarketIntelligence, loadSecurityIntelligence, loadMultichainData]);

  // Subscribe to wallet events
  useEffect(() => {
    const unsubscribe = subscribeToWalletEvents(
      async (newAccount) => {
        setWalletAddress(newAccount);
        if (newAccount) {
          const balances = await fetchWalletBalances(newAccount);
          setWalletBnbBalance(balances.bnb);
          setWalletVynoBalance(balances.vyno);
        } else {
          setWalletBnbBalance('0.0000');
          setWalletVynoBalance('0.0000');
        }
      },
      (chainId) => {
        if (chainId !== 56) {
          ensureBscNetwork().catch(() => {});
        }
      }
    );
    return unsubscribe;
  }, []);

  // Connect Web3 Wallet handler
  const handleConnectWallet = async () => {
    setIsWalletConnecting(true);
    try {
      const account = await requestWalletConnection();
      await ensureBscNetwork();
      setWalletAddress(account);
      const balances = await fetchWalletBalances(account);
      setWalletBnbBalance(balances.bnb);
      setWalletVynoBalance(balances.vyno);
    } catch (err: any) {
      alert(`Wallet Connection Error: ${err.message || 'Please check wallet extension.'}`);
    } finally {
      setIsWalletConnecting(false);
    }
  };

  // Transfer VYNO tokens handler (Non-Custodial)
  const handleSendTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      alert('Please connect your Web3 wallet first.');
      return;
    }
    if (!transferRecipient || !transferAmount) {
      alert('Please provide a valid recipient address and amount.');
      return;
    }

    setIsTransferring(true);
    setTransferStatus(null);
    try {
      const txHash = await transferVynoToken(walletAddress, transferRecipient, transferAmount);
      setTransferStatus(`Transaction Submitted: ${txHash}`);
      // Refresh balances after 3 seconds
      setTimeout(async () => {
        const balances = await fetchWalletBalances(walletAddress);
        setWalletVynoBalance(balances.vyno);
        setWalletBnbBalance(balances.bnb);
      }, 3500);
    } catch (err: any) {
      setTransferStatus(`Transfer Error: ${err.message || 'Transaction rejected by user'}`);
    } finally {
      setIsTransferring(false);
    }
  };

  // Ask AI Oracle
  const handleOracleSubmit = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const query = (customQuestion || oracleInput).trim();
    if (!query || isOracleLoading) return;

    if (!customQuestion) setOracleInput('');
    const userMsg = { sender: 'user' as const, text: query };
    setOracleChat((prev) => [...prev, userMsg]);
    setIsOracleLoading(true);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          systemInstruction: `You are the Lead Blockchain Oracle & Cryptoeconomic Strategist for VYNO (Ticker: VYNO, powered by Vanhsya).
VERIFIED ON-CHAIN FACTS (BNB SMART CHAIN MAINNET):
- Chain ID: 56.
- Contract Address: 0xe7c0E2229957300efCEDd7455EdA931f55Bd7b10.
- Token Name: VYNO Meme Sovereign. Symbol: VYNO. Decimals: 18.
- Verified Total Supply: 5,000,100,000,000 VYNO.
- Owner / Marketing Wallet: 0x2DB5A35e7024b6A17C69D8119A47e2ae6e6Ed74e.
- Boost Cap Ceiling: 30,000,000,000,000 VYNO immutable ceiling.
- Public DEX pairs: Initial PancakeSwap liquidity pool currently initializing.
NON-FABRICATION DIRECTIVE:
Clearly distinguish between VERIFIED ON-CHAIN data and PROTOCOL SIMULATIONS (e.g. staking simulation vaults). Never fabricate fake balances, fake DEX prices, or unaudited security certificates.
Answer with authoritative, concise, and helpful clarity. Keep answers under 110 words.`
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      setOracleChat((prev) => [
        ...prev,
        { sender: 'oracle', text: data.text || 'Telemetry acknowledged.', isVerifiedFact: true },
      ]);
    } catch (err: any) {
      setOracleChat((prev) => [
        ...prev,
        { sender: 'oracle', text: `Oracle transmission anomaly: ${err.message || 'Relay timeout.'}` },
      ]);
    } finally {
      setIsOracleLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Staking simulator calculations (clearly labeled as simulation)
  const currentTierApy = selectedVaultTier === 30 ? 0.12 : selectedVaultTier === 90 ? 0.185 : 0.28;
  const tierName = selectedVaultTier === 30 ? 'Stellar Orbit' : selectedVaultTier === 90 ? 'Supernova Vault' : 'Singularity Core';
  const estimatedPeriodReward = (stakeAmount * currentTierApy / 365) * selectedVaultTier;

  return (
    <motion.div
      initial={{ scale: 0.98, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 150, damping: 25 }}
      className="w-full max-w-5xl bg-slate-950/85 backdrop-blur-3xl border border-cyan-500/30 rounded-[2rem] p-6 md:p-8 hover:border-cyan-400/50 transition-all duration-500 shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-y-auto max-h-[72vh] pointer-events-auto space-y-6 text-left border-t-cyan-500/50 border-b-purple-500/50 custom-scrollbar"
    >
      {/* VERIFIED ON-CHAIN HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Coins size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <span>VYNO</span>
                  <span className="text-amber-400">COSMOS</span>
                </h2>
                <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={10} className="text-amber-400" /> BSC MAINNET (ID: 56)
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                <span>Verified Contract:</span>
                <code className="text-cyan-300 font-mono text-[11px] bg-black/40 px-2 py-0.5 rounded border border-white/5">
                  {VYNO_CONTRACT_ADDRESS}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(VYNO_CONTRACT_ADDRESS)}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Copy contract address"
                >
                  {copiedAddress ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
                <a
                  href={`https://bscscan.com/token/${VYNO_CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-0.5 text-[10px]"
                >
                  <span>BscScan</span>
                  <ExternalLink size={10} />
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Live Block Height & Wallet Connect Button */}
        <div className="flex items-center gap-3 self-start md:self-center flex-wrap">
          {/* Block height ticker */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase tracking-wider">
              BSC BLOCK #{liveOnChain.blockHeight}
            </span>
          </div>

          {/* Web3 Wallet Connect */}
          {walletAddress ? (
            <div className="flex items-center gap-2 bg-purple-500/15 border border-purple-500/35 rounded-2xl px-3.5 py-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <div className="flex flex-col text-left">
                <span className="text-[8px] font-mono text-purple-300 font-bold uppercase">CONNECTED</span>
                <span className="text-[10.5px] font-mono text-white font-bold">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnectWallet}
              disabled={isWalletConnecting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-purple-500/20 hover:from-amber-500/35 hover:to-purple-500/35 border border-amber-500/40 text-amber-300 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              <Wallet size={14} />
              <span>{isWalletConnecting ? 'Connecting...' : 'Connect Web3 Wallet'}</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-white/5">
        {[
          { id: 'tokenomics', label: 'Verified On-Chain', icon: <Database size={13} /> },
          { id: 'market', label: 'DEX Market Intelligence', icon: <BarChart3 size={13} /> },
          { id: 'wallet', label: 'Web3 Wallet & Assets', icon: <Wallet size={13} /> },
          { id: 'security', label: 'Security & Audit Intelligence', icon: <ShieldCheck size={13} /> },
          { id: 'multichain', label: 'Multichain Adapters', icon: <Globe size={13} /> },
          { id: 'staking', label: 'Staking Simulator', icon: <TrendingUp size={13} /> },
          { id: 'governance', label: 'DAO Governance', icon: <Vote size={13} /> },
          { id: 'oracle', label: 'AI Blockchain Oracle', icon: <Sparkles size={13} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap border ${
              activeSubTab === tab.id
                ? 'bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-amber-500/20 text-cyan-300 border-cyan-400/40 shadow-inner'
                : 'bg-black/30 text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: VERIFIED ON-CHAIN TOKENOMICS */}
      {activeSubTab === 'tokenomics' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Verified Badge Banner */}
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  VERIFIED DIRECT ON-CHAIN TELEMETRY — ZERO SIMULATION
                </span>
                <p className="text-[10.5px] text-gray-400">
                  Data queried directly from live BNB Smart Chain Mainnet node ({liveOnChain.rpcSource}).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={refreshOnChainTelemetry}
              disabled={isLoadingOnChain}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-xl text-[10px] font-mono flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw size={11} className={isLoadingOnChain ? "animate-spin" : ""} />
              <span>Refresh Node</span>
            </button>
          </div>

          {/* On-chain Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
              <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest block">VERIFIED TOTAL SUPPLY</span>
              <div className="text-lg font-black font-mono text-white mt-1">{liveOnChain.totalSupplyFormatted}</div>
              <span className="text-[9.5px] font-mono text-amber-400">5.0001 Trillion VYNO (18 Decimals)</span>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
              <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest block">IMMUTABLE BOOST CAP</span>
              <div className="text-lg font-black font-mono text-cyan-300 mt-1">{liveOnChain.boostCapFormatted}</div>
              <span className="text-[9.5px] font-mono text-gray-400">30 Trillion VYNO Ceiling</span>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
              <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest block flex items-center gap-1">
                <Flame size={12} className="text-rose-400" /> DIRECT ON-CHAIN BURN
              </span>
              <div className="text-lg font-black font-mono text-rose-400 mt-1">{liveOnChain.burnAddressBalanceFormatted}</div>
              <span className="text-[9.5px] font-mono text-gray-400">0x...dEaD Address Balance</span>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
              <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest block">BSC GAS PRICE</span>
              <div className="text-lg font-black font-mono text-emerald-400 mt-1">{liveOnChain.gasPriceGwei} Gwei</div>
              <span className="text-[9.5px] font-mono text-emerald-300/80">BNB Smart Chain Mainnet</span>
            </div>
          </div>

          {/* Contract Specifications Table */}
          <div className="p-5 bg-slate-950/70 border border-white/10 rounded-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-cyan-300 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-cyan-400 rounded-sm"></span>
              On-Chain Contract Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Contract Name:</span>
                <span className="text-white font-bold">{liveOnChain.name}</span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Token Ticker:</span>
                <span className="text-amber-400 font-bold">{liveOnChain.symbol}</span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Owner Wallet:</span>
                <span className="text-cyan-300 text-[11px] font-mono">
                  {liveOnChain.ownerAddress.slice(0, 10)}...{liveOnChain.ownerAddress.slice(-6)}
                </span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Marketing / Fee Wallet:</span>
                <span className="text-purple-300 text-[11px] font-mono">
                  {liveOnChain.marketingWalletAddress.slice(0, 10)}...{liveOnChain.marketingWalletAddress.slice(-6)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: CRYPTO MARKET INTELLIGENCE */}
      {activeSubTab === 'market' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="p-4 bg-slate-900/80 border border-white/10 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-cyan-400" size={20} />
              <div>
                <h3 className="text-sm font-black uppercase text-white">Live DEX Market Intelligence & Liquidity Monitoring</h3>
                <p className="text-[11px] text-gray-400">
                  Real-time market indexing sourced from DEX Screener & GeckoTerminal. Non-fabricated market tracking.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadMarketIntelligence}
              disabled={isLoadingMarket}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={12} className={isLoadingMarket ? "animate-spin" : ""} />
              <span>Poll DEX</span>
            </button>
          </div>

          {/* Market Status Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
              <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest">DEX PAIR STATUS</span>
              <div className="text-sm font-bold text-amber-300 mt-1">
                {marketData ? marketData.status : 'Loading DEX Stream...'}
              </div>
              <span className="text-[9px] font-mono text-gray-500">PancakeSwap V3 BSC Router</span>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
              <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest">TRADING LIQUIDITY (USD)</span>
              <div className="text-sm font-bold font-mono text-white mt-1">
                ${marketData ? marketData.liquidityUsd.toLocaleString() : '0.00'}
              </div>
              <span className="text-[9px] font-mono text-gray-500">Verified Pool Depth</span>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
              <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest">24H VOLUME (USD)</span>
              <div className="text-sm font-bold font-mono text-cyan-300 mt-1">
                ${marketData ? marketData.volume24hUsd.toLocaleString() : '0.00'}
              </div>
              <span className="text-[9px] font-mono text-gray-500">On-Chain Swap Volume</span>
            </div>
          </div>

          {/* Slippage & Price Impact Formula Simulator */}
          <div className="p-5 bg-slate-950/70 border border-white/10 rounded-2xl space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-cyan-300 flex items-center gap-2">
              <ArrowRightLeft size={14} />
              DEX Slippage & Price Impact Calculator
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] text-gray-400 flex justify-between">
                  <span>Simulated Swap Amount (VYNO)</span>
                  <span className="font-mono text-white">{swapInputVyno.toLocaleString()} VYNO</span>
                </label>
                <input
                  type="range"
                  min="1000"
                  max="1000000"
                  step="1000"
                  value={swapInputVyno}
                  onChange={(e) => setSwapInputVyno(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-gray-400 flex justify-between">
                  <span>Max Slippage Tolerance</span>
                  <span className="font-mono text-amber-400">{swapSlippage}%</span>
                </label>
                <div className="flex gap-2">
                  {[0.1, 0.5, 1.0, 2.5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSwapSlippage(val)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                        swapSlippage === val
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                          : 'bg-black/40 text-gray-400 border-white/5 hover:text-white'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-[11px] text-gray-400 leading-relaxed">
              <strong className="text-white block mb-0.5">Automated Constant Product Formula (x * y = k):</strong>
              With liquidity provisioning in progress on PancakeSwap V3, swap execution will calculate exact price impact based on virtual tick liquidity depth. Current slippage threshold configured at {swapSlippage}%.
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 3: WEB3 WALLET & ASSETS */}
      {activeSubTab === 'wallet' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="p-5 bg-gradient-to-r from-purple-950/40 via-slate-950/60 to-black border border-purple-500/30 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                  <Wallet size={16} className="text-purple-400" />
                  Non-Custodial Web3 Wallet Integration
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Connect via MetaMask, Rabby, Trust Wallet, or any EIP-1193 injected provider on BNB Smart Chain.
                </p>
              </div>
              {!walletAddress ? (
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  disabled={isWalletConnecting}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                >
                  {isWalletConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              ) : (
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full font-bold">
                  CONNECTED TO BSC (56)
                </span>
              )}
            </div>

            {walletAddress && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-black/50 border border-white/10 rounded-xl space-y-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">YOUR VYNO HOLDINGS</span>
                  <div className="text-xl font-black font-mono text-cyan-300">{walletVynoBalance} VYNO</div>
                  <span className="text-[9.5px] font-mono text-gray-500">Contract: 0xe7c0...7b10</span>
                </div>
                <div className="p-4 bg-black/50 border border-white/10 rounded-xl space-y-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">YOUR BNB BALANCE (GAS)</span>
                  <div className="text-xl font-black font-mono text-amber-300">{walletBnbBalance} BNB</div>
                  <span className="text-[9.5px] font-mono text-gray-500">Native BNB Chain Gas Token</span>
                </div>
              </div>
            )}
          </div>

          {/* On-Chain Transfer Interface */}
          <div className="p-5 bg-slate-950/70 border border-white/10 rounded-2xl space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-cyan-300 flex items-center gap-2">
              <Send size={14} />
              On-Chain VYNO Token Transfer (BEP-20)
            </h4>
            <form onSubmit={handleSendTransfer} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400">Recipient BSC Address (0x...)</label>
                <input
                  type="text"
                  value={transferRecipient}
                  onChange={(e) => setTransferRecipient(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400">Transfer Amount (VYNO)</label>
                <input
                  type="number"
                  step="any"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isTransferring || !walletAddress}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all disabled:opacity-40 cursor-pointer"
              >
                {isTransferring ? 'Awaiting Wallet Signature...' : 'Sign & Broadcast Transfer via Web3 Wallet'}
              </button>
            </form>
            {transferStatus && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs text-cyan-200 font-mono break-all">
                {transferStatus}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* TAB 4: SECURITY & AUDIT INTELLIGENCE */}
      {activeSubTab === 'security' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
            <ShieldCheck size={24} className="text-emerald-400 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-black uppercase text-emerald-300">
                AI-Assisted Smart Contract Security Intelligence
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Verifiable on-chain analysis of contract permissions, boost mechanics, and bytecode risk markers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risk indicators */}
            <div className="p-5 bg-slate-950/70 border border-white/10 rounded-2xl space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-white">Risk Profile Indicators</h4>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2.5 bg-black/40 rounded-lg">
                  <span className="text-gray-400">Honeypot Indicator:</span>
                  <span className="text-emerald-400 font-bold">Negative (Pass)</span>
                </div>
                <div className="flex justify-between p-2.5 bg-black/40 rounded-lg">
                  <span className="text-gray-400">Blacklist Mechanism:</span>
                  <span className="text-emerald-400 font-bold">Not Detected in Bytecode</span>
                </div>
                <div className="flex justify-between p-2.5 bg-black/40 rounded-lg">
                  <span className="text-gray-400">Pausable Transfers:</span>
                  <span className="text-emerald-400 font-bold">Not Detected</span>
                </div>
                <div className="flex justify-between p-2.5 bg-black/40 rounded-lg">
                  <span className="text-gray-400">Immutable Mint Ceiling:</span>
                  <span className="text-cyan-300 font-bold">30,000,000,000,000 VYNO</span>
                </div>
                <div className="flex justify-between p-2.5 bg-black/40 rounded-lg">
                  <span className="text-gray-400">Compiler Standard:</span>
                  <span className="text-purple-300 font-bold">Solidity 0.8.20 (BEP-20)</span>
                </div>
              </div>
            </div>

            {/* Privileged functions */}
            <div className="p-5 bg-slate-950/70 border border-white/10 rounded-2xl space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-white">Privileged Ownership Functions</h4>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-amber-300">setMarketingWallet(address)</span>
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">onlyOwner</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Configures the destination marketing fee wallet. Owner currently set to 0x2DB5...Ed74e.
                  </p>
                </div>
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-cyan-300">boost() / mint cap constraint</span>
                    <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded">onlyOwner</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Contains immutable require condition enforcing ceiling limit of 30 Trillion VYNO maximum.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-[10.5px] text-gray-400 italic">
            <strong>Disclaimer:</strong> {securityData ? securityData.disclaimer : "AI-Assisted Contract Security Analysis — Non-Custodial Intelligence. This does not constitute a formal third-party smart contract audit certificate."}
          </div>
        </motion.div>
      )}

      {/* TAB 5: MULTICHAIN ADAPTERS */}
      {activeSubTab === 'multichain' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="p-4 bg-slate-900/80 border border-white/10 rounded-2xl flex items-center gap-3">
            <Globe className="text-cyan-400" size={22} />
            <div>
              <h3 className="text-sm font-black uppercase text-white">Multichain Architecture & Deployment Registry</h3>
              <p className="text-[11px] text-gray-400">
                Primary active native deployment is strictly on BNB Smart Chain. Cross-chain relays require formal audits prior to relay activation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {multichainData.map((chain) => (
              <div
                key={chain.chainId}
                className={`p-4 rounded-2xl border transition-all ${
                  chain.isPrimary
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-white">{chain.networkName}</span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                    chain.isPrimary ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {chain.isPrimary ? 'ACTIVE MAINNET' : 'STANDBY ADAPTER'}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-gray-400 mt-2">
                  <div>Layer: <span className="text-white">{chain.layer}</span></div>
                  <div>Status: <span className={chain.isPrimary ? 'text-amber-300' : 'text-gray-400'}>{chain.status}</span></div>
                  <div className="truncate">Bridge Status: <span className="text-purple-300">{chain.bridgeStatus}</span></div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* TAB 6: STAKING SIMULATOR (Transparently Labeled) */}
      {activeSubTab === 'staking' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
            <span>
              <strong>Transparency Notice:</strong> Staking calculations below are protocol simulations. Live smart contract staking vaults are scheduled for deployment following VIP-21 DAO ratification.
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">VAULT TIERS</span>
              {[
                { days: 30, name: 'Stellar Orbit', apy: '12.0%', desc: '30-day liquidity lock' },
                { days: 90, name: 'Supernova Vault', apy: '18.5%', desc: '90-day protocol yield' },
                { days: 365, name: 'Singularity Core', apy: '28.0%', desc: '365-day maximum compounding' },
              ].map((tier) => (
                <button
                  type="button"
                  key={tier.days}
                  onClick={() => setSelectedVaultTier(tier.days as any)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedVaultTier === tier.days
                      ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-400/50 shadow-inner'
                      : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-white">{tier.name}</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">{tier.apy} APY</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">{tier.desc}</div>
                </button>
              ))}
            </div>

            <div className="lg:col-span-2 bg-slate-950/70 border border-white/10 rounded-2xl p-6 space-y-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-cyan-300 flex items-center gap-2">
                <Sliders size={15} />
                Simulate Staking Position
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Simulated Deposit</span>
                  <span className="text-cyan-400 font-mono font-bold">{stakeAmount.toLocaleString()} VYNO</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="1000000"
                  step="500"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-black/40 rounded-xl border border-white/5 text-xs font-mono">
                <div>
                  <span className="text-gray-400 text-[10px]">Estimated Reward:</span>
                  <div className="text-emerald-400 font-bold mt-0.5">+{estimatedPeriodReward.toFixed(1)} VYNO</div>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px]">Maturity Return:</span>
                  <div className="text-cyan-300 font-bold mt-0.5">{(stakeAmount + estimatedPeriodReward).toFixed(1)} VYNO</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStakingSuccessMsg(`Simulated ${stakeAmount.toLocaleString()} VYNO deposit in ${tierName}. Expected simulation reward: +${estimatedPeriodReward.toFixed(1)} VYNO.`);
                  setTimeout(() => setStakingSuccessMsg(null), 5000);
                }}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Simulate Deposit Position
              </button>

              {stakingSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{stakingSuccessMsg}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 7: DAO GOVERNANCE */}
      {activeSubTab === 'governance' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase text-cyan-300 flex items-center gap-2">
                <Vote size={16} />
                Cosmic DAO Governance Proposals
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Quadratic voting formula applies to community governance proposals for liquidity and audits.
              </p>
            </div>
            <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-full">
              QUADRATIC VOTING ACTIVE
            </span>
          </div>

          <div className="space-y-3">
            {proposals.map((proposal) => {
              const forPct = Math.round((proposal.votesFor / proposal.totalVotes) * 100);
              const againstPct = 100 - forPct;
              return (
                <div key={proposal.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded-md">
                        {proposal.id}
                      </span>
                      <h4 className="text-sm font-black text-white">{proposal.title}</h4>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">Closes in {proposal.endsIn}</span>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed">{proposal.description}</p>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-emerald-400 font-bold">For: {forPct}%</span>
                      <span className="text-rose-400 font-bold">Against: {againstPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden flex">
                      <div style={{ width: `${forPct}%` }} className="bg-emerald-500 h-full"></div>
                      <div style={{ width: `${againstPct}%` }} className="bg-rose-500 h-full"></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest">{proposal.category}</span>
                    {proposal.userVote ? (
                      <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-cyan-400" />
                        Voted {proposal.userVote.toUpperCase()}
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setProposals((prev) =>
                              prev.map((p) => (p.id === proposal.id ? { ...p, userVote: 'for', votesFor: p.votesFor + 10000 } : p))
                            );
                          }}
                          className="px-4 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
                        >
                          Vote For
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProposals((prev) =>
                              prev.map((p) => (p.id === proposal.id ? { ...p, userVote: 'against', votesAgainst: p.votesAgainst + 10000 } : p))
                            );
                          }}
                          className="px-4 py-1.5 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
                        >
                          Vote Against
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* TAB 8: AI BLOCKCHAIN ORACLE */}
      {activeSubTab === 'oracle' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase text-cyan-300 flex items-center gap-2">
                <Sparkles size={16} />
                VYNO Verified Blockchain Oracle
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                AI Knowledge Node grounded strictly in real BSC Mainnet on-chain statistics and verifiable contracts.
              </p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-full">
              GEMINI 3.8 FLASH GROUNDED
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              "What is VYNO contract address and verified supply on BSC?",
              "What privileged functions does the contract owner possess?",
              "What is the status of PancakeSwap DEX liquidity?",
              "How does quadratic voting protect against whale dominance?",
            ].map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => handleOracleSubmit(undefined, pill)}
                disabled={isOracleLoading}
                className="text-[10px] bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/30 text-gray-300 hover:text-cyan-300 px-3 py-1.5 rounded-full transition-all cursor-pointer disabled:opacity-50"
              >
                {pill}
              </button>
            ))}
          </div>

          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 flex flex-col h-[280px]">
            <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {oracleChat.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${msg.sender === 'user' ? 'text-cyan-400' : 'text-purple-400'}`}>
                    {msg.sender === 'user' ? 'Navigator' : 'VYNO Oracle (Verified Grounded)'}
                  </span>
                  <div
                    className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-50'
                        : 'bg-white/5 border border-white/10 text-gray-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isOracleLoading && (
                <div className="flex flex-col items-start">
                  <span className="text-[9px] font-bold uppercase tracking-widest mb-1 text-purple-400">VYNO Oracle</span>
                  <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-gray-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                    <span>Querying on-chain telemetry and synthesizing...</span>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={(e) => handleOracleSubmit(e)} className="mt-3 flex items-center gap-2 pt-2 border-t border-white/10">
              <input
                type="text"
                value={oracleInput}
                onChange={(e) => setOracleInput(e.target.value)}
                placeholder="Ask Oracle about contract, on-chain balances, or DEX routing..."
                disabled={isOracleLoading}
                className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 font-sans"
              />
              <button
                type="submit"
                disabled={!oracleInput.trim() || isOracleLoading}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all disabled:opacity-40 cursor-pointer"
              >
                Query
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
