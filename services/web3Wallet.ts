/**
 * VYNO COSMOS — NON-CUSTODIAL WEB3 WALLET SERVICE
 * 
 * Compliant with EIP-1193 standard. Compatible with:
 * - MetaMask
 * - Rabby
 * - Trust Wallet
 * - Binance Web3 Wallet
 * - Coinbase Wallet
 * - Any EIP-1193 Injected Web3 Provider
 *
 * SECURITY DIRECTIVE:
 * Never requests or stores private keys or seed phrases.
 * All state-changing transactions are signed directly within the user's secure wallet.
 */

export const BSC_CHAIN_PARAMS = {
  chainId: '0x38', // 56 in hex
  chainName: 'BNB Smart Chain Mainnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com'],
};

export const VYNO_CONTRACT_ADDRESS = '0xe7c0E2229957300efCEDd7455EdA931f55Bd7b10';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isBscNetwork: boolean;
  vynoBalance: string;
  bnbBalance: string;
  isConnecting: boolean;
  error: string | null;
}

// ABI function selector constants
const ERC20_TRANSFER_SELECTOR = '0xa9059cbb'; // transfer(address,uint256)
const ERC20_APPROVE_SELECTOR = '0x095ea7b3';  // approve(address,uint256)

/**
 * Checks if a Web3 wallet extension is injected in the browser
 */
export function isWeb3Injected(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined';
}

/**
 * Requests wallet connection via EIP-1193 eth_requestAccounts
 */
export async function requestWalletConnection(): Promise<string> {
  if (!isWeb3Injected()) {
    throw new Error('No compatible Web3 wallet detected. Please install MetaMask, Rabby, or Trust Wallet.');
  }

  const ethereum = (window as any).ethereum;
  const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts authorized by user.');
  }

  return accounts[0];
}

/**
 * Ensures the wallet is connected to BNB Smart Chain (Chain ID: 56 / 0x38)
 */
export async function ensureBscNetwork(): Promise<boolean> {
  if (!isWeb3Injected()) return false;
  const ethereum = (window as any).ethereum;

  try {
    const currentChainId = await ethereum.request({ method: 'eth_chainId' });
    if (currentChainId === BSC_CHAIN_PARAMS.chainId || parseInt(currentChainId, 16) === 56) {
      return true;
    }

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_CHAIN_PARAMS.chainId }],
      });
      return true;
    } catch (switchError: any) {
      // Error 4902 indicates that the chain has not been added to the wallet
      if (switchError.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [BSC_CHAIN_PARAMS],
        });
        return true;
      }
      throw switchError;
    }
  } catch (err: any) {
    console.error('[Web3Wallet] Error switching to BSC:', err);
    throw new Error(err.message || 'Failed to switch network to BNB Smart Chain.');
  }
}

/**
 * Fetches verified on-chain balances for the connected wallet
 */
export async function fetchWalletBalances(address: string) {
  try {
    const res = await fetch(`/api/blockchain/balance/${address}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      vyno: data.balances?.vyno?.formatted || '0.0000',
      bnb: data.balances?.bnb?.formatted || '0.0000',
    };
  } catch (err) {
    console.warn('[Web3Wallet] Balance fetch notice:', err);
    return { vyno: '0.0000', bnb: '0.0000' };
  }
}

/**
 * Prepares and sends an on-chain BEP-20 transfer of VYNO tokens
 * Non-custodial: Prompts the user's wallet for signature and broadcast
 */
export async function transferVynoToken(
  fromAddress: string,
  recipientAddress: string,
  amountVyno: string
): Promise<string> {
  if (!isWeb3Injected()) {
    throw new Error('Web3 wallet is not available.');
  }

  if (!recipientAddress || !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
    throw new Error('Invalid recipient EVM address format.');
  }

  const amountNum = parseFloat(amountVyno);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new Error('Invalid transfer amount.');
  }

  // Convert amount to 18 decimals BigInt
  const parts = amountVyno.split('.');
  const whole = parts[0] || '0';
  const frac = (parts[1] || '').slice(0, 18).padEnd(18, '0');
  const amountWei = BigInt(whole) * 10n ** 18n + BigInt(frac);

  const paddedRecipient = recipientAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  const paddedAmount = amountWei.toString(16).padStart(64, '0');
  const data = `${ERC20_TRANSFER_SELECTOR}${paddedRecipient}${paddedAmount}`;

  const ethereum = (window as any).ethereum;
  await ensureBscNetwork();

  const txHash: string = await ethereum.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: fromAddress,
        to: VYNO_CONTRACT_ADDRESS,
        data,
      },
    ],
  });

  return txHash;
}

/**
 * Registers standard EIP-1193 event listeners for account/chain changes
 */
export function subscribeToWalletEvents(
  onAccountChange: (account: string | null) => void,
  onChainChange: (chainId: number) => void
) {
  if (!isWeb3Injected()) return () => {};
  const ethereum = (window as any).ethereum;

  const handleAccounts = (accounts: string[]) => {
    onAccountChange(accounts.length > 0 ? accounts[0] : null);
  };

  const handleChain = (chainIdHex: string) => {
    onChainChange(parseInt(chainIdHex, 16));
  };

  ethereum.on?.('accountsChanged', handleAccounts);
  ethereum.on?.('chainChanged', handleChain);

  return () => {
    ethereum.removeListener?.('accountsChanged', handleAccounts);
    ethereum.removeListener?.('chainChanged', handleChain);
  };
}
