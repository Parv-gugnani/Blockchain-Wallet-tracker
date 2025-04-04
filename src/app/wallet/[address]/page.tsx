import WalletClient from './client-page';

export default function Page({ params }: { params: { address: string } }) {
  return <WalletClient address={params.address} />;
}