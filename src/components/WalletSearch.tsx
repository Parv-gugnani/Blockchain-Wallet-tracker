'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WalletSearchForm() {
  const [address, setAddress] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!address || address.trim() === '') {
      alert('Please enter a valid Ethereum wallet address');
      return;
    }
    router.push(`/wallet/${address}`);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-10">
      <div className="flex">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter Ethereum Wallet Address"
          className="flex-grow p-2 border rounded-l-md"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600"
        >
          Track Wallet
        </button>
      </div>
    </form>
  );
}