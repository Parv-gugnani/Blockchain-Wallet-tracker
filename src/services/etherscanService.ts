import axios from 'axios';

interface EtherscanTokenTransaction {
  from: string;
  to: string;
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  value: string;
  timeStamp: string;
}

interface EtherscanTransactionResponse {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
}

export interface TokenHolding {
  name: string;
  symbol: string;
  balance: number;
  contractAddress: string;
}

interface EtherscanInternalTransaction {
    hash: string;
    timeStamp: string;
    from: string;
    to: string;
    value: string;
    contractAddress: string;
    input: string;
    methodId: string;
    functionName: string;
  }

export interface DexActivity {
    txHash: string;
    timestamp: number;
    dexName: string;
    type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'unknown';
    tokenIn?: {
      symbol: string;
      amount: number;
    };
    tokenOut?: {
      symbol: string;
      amount: number;
    };
  }

export interface TokenMovement {
  tokenName: string;
  totalSent: number;
  totalReceived: number;
  uniqueDestinations: string[];
  uniqueSources: string[];
  dexActivities?: DexActivity[];
}

export interface WalletOverview {
  address: string;
  ethBalance: number;
  tokenHoldings: TokenHolding[];
  totalTransactions: number;
  firstTransaction?: string;
  lastTransaction?: string;
}

const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
const BASE_URL = 'https://api.etherscan.io/api';

export async function getWalletOverview(address: string): Promise<WalletOverview> {
  try {
    const [balanceRes, tokenTxRes, txListRes] = await Promise.all([
      axios.get(BASE_URL, {
        params: {
          module: 'account',
          action: 'balance',
          address,
          tag: 'latest',
          apikey: ETHERSCAN_API_KEY
        }
      }),
      axios.get(BASE_URL, {
        params: {
          module: 'account',
          action: 'tokentx',
          address,
          startblock: 0,
          endblock: 99999999,
          sort: 'asc',
          apikey: ETHERSCAN_API_KEY
        }
      }),
      axios.get(BASE_URL, {
        params: {
          module: 'account',
          action: 'txlist',
          address,
          startblock: 0,
          endblock: 99999999,
          sort: 'asc',
          apikey: ETHERSCAN_API_KEY
        }
      })
    ]);

    // Type-safe data extraction and processing
    const tokenTransactions: EtherscanTokenTransaction[] = tokenTxRes.data.result || [];
    const tokenBalances = processTokenBalances(tokenTransactions, address);

    return {
      address,
      ethBalance: convertWeiToEth(balanceRes.data.result),
      tokenHoldings: tokenBalances,
      totalTransactions: txListRes.data.result.length,
      firstTransaction: getFirstTransactionDate(txListRes.data.result),
      lastTransaction: getLastTransactionDate(txListRes.data.result)
    };
  } catch (error) {
    console.error('Error fetching wallet overview:', error);
    throw error;
  }
}

export async function getTokenMovements(address: string): Promise<TokenMovement[]> {
    try {
      const tokenTxResponse = await axios.get(BASE_URL, {
        params: {
          module: 'account',
          action: 'tokentx',
          address,
          startblock: 0,
          endblock: 99999999,
          sort: 'asc',
          apikey: ETHERSCAN_API_KEY
        }
      });

      const movements = analyzeTokenMovements(tokenTxResponse.data.result, address);

      // Add test DEX data to every token for testing purposes
      return movements.map(movement => ({
        ...movement,
        dexActivities: [{
          txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          timestamp: Math.floor(Date.now() / 1000) - 86400,
          dexName: "Uniswap V3",
          type: "swap",
          tokenIn: { symbol: movement.tokenName, amount: 100 },
          tokenOut: { symbol: "ETH", amount: 50 }
        }]
      }));
    } catch (error) {
      console.error('Error fetching token movements:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function fetchDexActivities(address: string): Promise<DexActivity[]> {
    try {
      // Get internal transactions (often used by DEXes)
      const internalTxResponse = await axios.get(BASE_URL, {
        params: {
          module: 'account',
          action: 'txlistinternal',
          address,
          startblock: 0,
          endblock: 99999999,
          sort: 'asc',
          apikey: ETHERSCAN_API_KEY
        }
      });

      // Define DEX contracts with proper TypeScript typing
      const dexContracts: Record<string, string> = {
        '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2',
        '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3',
        '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'SushiSwap'
        // Add more DEX contracts as needed
      };

      const internalTxs: EtherscanInternalTransaction[] = internalTxResponse.data.result || [];

      // Filter for DEX interactions
      return internalTxs
        .filter(tx => {
          const lowerCaseTo = tx.to.toLowerCase();
          return Object.keys(dexContracts).includes(lowerCaseTo);
        })
        .map(tx => {
          const lowerCaseTo = tx.to.toLowerCase();
          const dexName = dexContracts[lowerCaseTo] || 'Unknown DEX';
          let type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'unknown' = 'unknown';

          // Identify transaction type based on function signature
          if (tx.functionName?.includes('swap')) {
            type = 'swap';
          } else if (tx.functionName?.includes('addLiquidity')) {
            type = 'add_liquidity';
          } else if (tx.functionName?.includes('removeLiquidity')) {
            type = 'remove_liquidity';
          }

          return {
            txHash: tx.hash,
            timestamp: parseInt(tx.timeStamp),
            dexName,
            type
          };
        });
    } catch (error) {
      console.error('Error fetching DEX activities:', error);
      return [];
    }
  }
// Utility functions with type annotations
function convertWeiToEth(weiBalance: string): number {
  return parseFloat(weiBalance) / 10**18;
}

function processTokenBalances(
  transactions: EtherscanTokenTransaction[],
  address: string
): TokenHolding[] {
  const tokenBalances: Record<string, TokenHolding> = {};

  transactions.forEach(tx => {
    const tokenName = tx.tokenName;
    const tokenSymbol = tx.tokenSymbol;
    const decimals = parseInt(tx.tokenDecimal);
    const value = parseFloat(tx.value) / (10 ** decimals);

    if (!tokenBalances[tokenName]) {
      tokenBalances[tokenName] = {
        name: tokenName,
        symbol: tokenSymbol,
        balance: 0,
        contractAddress: tx.contractAddress
      };
    }

    if (tx.from.toLowerCase() === address.toLowerCase()) {
      tokenBalances[tokenName].balance -= value;
    }
    if (tx.to.toLowerCase() === address.toLowerCase()) {
      tokenBalances[tokenName].balance += value;
    }
  });

  return Object.values(tokenBalances)
    .filter(token => token.balance > 0);
}

function analyzeTokenMovements(
    transactions: EtherscanTokenTransaction[],
    address: string
  ): TokenMovement[] {
    const tokenMovements: Record<string, TokenMovement> = {};

  transactions.forEach(tx => {
    const tokenName = tx.tokenName;
    const fromAddress = tx.from;
    const toAddress = tx.to;
    const decimals = parseInt(tx.tokenDecimal);
    const value = parseFloat(tx.value) / (10 ** decimals);

    if (!tokenMovements[tokenName]) {
      tokenMovements[tokenName] = {
        tokenName,
        totalSent: 0,
        totalReceived: 0,
        uniqueDestinations: [],
        uniqueSources: []
      };
    }

    if (fromAddress.toLowerCase() === address.toLowerCase()) {
      tokenMovements[tokenName].totalSent += value;
      if (!tokenMovements[tokenName].uniqueDestinations.includes(toAddress)) {
        tokenMovements[tokenName].uniqueDestinations.push(toAddress);
      }
    }

    if (toAddress.toLowerCase() === address.toLowerCase()) {
      tokenMovements[tokenName].totalReceived += value;
      if (!tokenMovements[tokenName].uniqueSources.includes(fromAddress)) {
        tokenMovements[tokenName].uniqueSources.push(fromAddress);
      }
    }
  });

  Object.keys(tokenMovements).forEach(tokenName => {
    if (tokenName === "USDT" || tokenName === "ETH") {
      tokenMovements[tokenName].dexActivities = [
        {
          txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          timestamp: Math.floor(Date.now() / 1000) - 86400, // yesterday
          dexName: "Uniswap V3",
          type: "swap",
          tokenIn: { symbol: tokenName, amount: 100 },
          tokenOut: { symbol: tokenName === "USDT" ? "ETH" : "USDT", amount: 50 }
        }
      ];
    }
  });

  return Object.values(tokenMovements);
}

function getFirstTransactionDate(transactions: EtherscanTransactionResponse[]): string | undefined {
  if (!transactions || transactions.length === 0) return undefined;
  const firstTx = transactions[0];
  return new Date(parseInt(firstTx.timeStamp) * 1000).toISOString();
}

function getLastTransactionDate(transactions: EtherscanTransactionResponse[]): string | undefined {
  if (!transactions || transactions.length === 0) return undefined;
  const lastTx = transactions[transactions.length - 1];
  return new Date(parseInt(lastTx.timeStamp) * 1000).toISOString();
}