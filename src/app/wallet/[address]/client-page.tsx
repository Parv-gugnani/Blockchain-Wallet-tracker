'use client';

import { useState, useEffect } from 'react';
import {
  getWalletOverview,
  getTokenMovements,
  WalletOverview,
  TokenMovement
} from '@/services/etherscanService';

interface WalletData {
  overview?: WalletOverview;
  tokenMovements?: TokenMovement[];
}

export default function WalletClient({ address }: { address: string }) {
  const [walletData, setWalletData] = useState<WalletData>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setLoading(true);
        setError(null);
        const decodedAddress = decodeURIComponent(address);
        if (!decodedAddress || !/^0x[a-fA-F0-9]{40}$/.test(decodedAddress)) {
          throw new Error('Invalid Ethereum address format');
        }

        const overview = await getWalletOverview(decodedAddress);
        const tokenMovements = await getTokenMovements(decodedAddress);

        setWalletData({ overview, tokenMovements });
      } catch (err) {
        console.error('Wallet data fetch error:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, [address]);

  useEffect(() => {
    // Check for DEX activities specifically
    if (walletData.tokenMovements) {
      walletData.tokenMovements.forEach(movement => {
        if (movement.dexActivities && movement.dexActivities.length > 0) {
          console.log(`Found DEX activities for ${movement.tokenName}:`, movement.dexActivities);
        }
      });
    }
  }, [walletData]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading wallet information...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex justify-center items-center min-h-screen bg-red-50">
      <div className="text-center p-8 bg-white shadow-lg rounded-lg">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
        <p className="text-gray-700 mb-4">{error}</p>
        <p className="text-gray-500">Please check the wallet address and try again.</p>
      </div>
    </div>
  );

  if (!walletData.overview) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">No Data Found</h1>
        <p className="text-gray-600">This wallet appears to have no transaction history.</p>
      </div>
    </div>
  );

  return (
    <div className="w-full px-4 py-8 bg-gray-50 min-h-screen">
      <div className="w-full">
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 break-words">
            Wallet Details: {address}
          </h1>
        </div>

        {/* Wallet Overview Section */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Wallet Overview</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-gray-600">ETH Balance</p>
              <p className="text-lg font-bold text-blue-600">
                {walletData.overview.ethBalance.toFixed(4)} ETH
              </p>
            </div>
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-gray-600">Total Transactions</p>
              <p className="text-lg font-bold text-green-600">
                {walletData.overview.totalTransactions}
              </p>
            </div>
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-gray-600">First Transaction</p>
              <p className="text-sm">
                {walletData.overview.firstTransaction
                  ? new Date(walletData.overview.firstTransaction).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-gray-600">Last Transaction</p>
              <p className="text-sm">
                {walletData.overview.lastTransaction
                  ? new Date(walletData.overview.lastTransaction).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Token Holdings Section */}
        {walletData.overview.tokenHoldings && walletData.overview.tokenHoldings.length > 0 && (
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Token Holdings</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                    <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {walletData.overview.tokenHoldings.map((token, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-900">{token.name}</td>
                      <td className="p-3 text-sm text-gray-500">{token.symbol}</td>
                      <td className="p-3 text-sm text-gray-900 text-right">
                        {token.balance.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

              {walletData.tokenMovements && walletData.tokenMovements.length > 0 && (
                <div className="bg-white shadow-md rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Token Movements</h2>
                  <div className="space-y-4">
                    {walletData.tokenMovements.map((movement, index) => (
                      <div key={index} className="bg-gray-100 p-4 rounded-lg hover:shadow-sm transition-shadow">
                  <h3 className="font-bold text-blue-600 mb-2">{movement.tokenName}</h3>
                  <div className="grid md:grid-cols-2 gap-2">
                    <div>
                      <p className="text-gray-600">Total Sent</p>
                      <p className="font-semibold text-red-600">
                        {movement.totalSent.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Received</p>
                      <p className="font-semibold text-green-600">
                        {movement.totalReceived.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Unique Destinations</p>
                      <p>{movement.uniqueDestinations.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Unique Sources</p>
                      <p>{movement.uniqueSources.length}</p>
                    </div>
                  </div>

                  {movement.uniqueDestinations.length > 0 && (
                    <div className="mt-3">
                      <p className="text-black font-medium">Destination Addresses</p>
                      <div className="mt-2 bg-gray-100 p-2 rounded max-h-32 overflow-y-auto">
                        {movement.uniqueDestinations.map((dest, idx) => (
                          <div key={idx} className="text-sm mb-1 break-all">
                            <span className="font-mono text-black">{dest}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* DEX Activities Section */}
                  {movement.dexActivities && movement.dexActivities.length > 0 && (
  <div className="mt-3">
    <p className="text-black font-medium">DEX Activities</p>
    <div className="mt-2 bg-gray-100 p-2 rounded max-h-48 overflow-y-auto">
      {movement.dexActivities.map((activity, idx) => (
        <div key={idx} className="text-sm mb-2 p-2 bg-white rounded shadow-sm">
          <div className="flex justify-between items-center">
            <span className="font-medium text-blue-600">{activity.dexName}</span>
            <span className="text-xs text-gray-500">
              {new Date(activity.timestamp * 1000).toLocaleString()}
            </span>
          </div>
          <div className="mt-1">
            <span className="capitalize text-gray-700 font-medium">
              {activity.type.replace('_', ' ')}
            </span>
          </div>
          <div className="mt-1 text-xs font-mono break-all">
            <span className="text-gray-600">Tx: </span>
            <a
              href={`https://etherscan.io/tx/${activity.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {activity.txHash}
            </a>
          </div>
          {activity.tokenIn && (
            <div className="mt-1 text-red-500">
              In: {activity.tokenIn.amount.toFixed(4)} {activity.tokenIn.symbol}
            </div>
          )}
          {activity.tokenOut && (
            <div className="mt-1 text-green-500">
              Out: {activity.tokenOut.amount.toFixed(4)} {activity.tokenOut.symbol}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}