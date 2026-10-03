import BridgeDetailClient from './BridgeDetailClient';

export function generateStaticParams() {
  return [
    { slug: 'river-gorge-bridge' },
    { slug: 'coastal-causeway' },
  ];
}

export default function Page() {
  return <BridgeDetailClient />;
}
