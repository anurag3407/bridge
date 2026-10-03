import OperatorReportClient from './OperatorReportClient';

export function generateStaticParams() {
  return [
    { id: '11111111-1111-1111-1111-111111111111' },
    { id: '22222222-2222-2222-2222-222222222222' },
  ];
}

export default function Page() {
  return <OperatorReportClient />;
}
