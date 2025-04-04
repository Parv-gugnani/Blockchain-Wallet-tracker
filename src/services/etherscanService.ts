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

export interface TokenMovement {
  tokenName: string;
  totalSent: number;
  totalReceived: number;
  uniqueDestinations: string[];
  uniqueSources: string[];
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
    const response = await axios.get(BASE_URL, {
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

    return analyzeTokenMovements(response.data.result, address);
  } catch (error) {
    console.error('Error fetching token movements:', error);
    throw error;
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