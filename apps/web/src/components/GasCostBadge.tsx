'use client';

// Estimated gas per transaction on X Layer testnet: 21000 gas * 1 gwei = 0.000021 OKB
const GAS_OKB = 0.000021;

interface GasCostBadgeProps {
  okbPrice: number | null;
}

export default function GasCostBadge({ okbPrice }: GasCostBadgeProps) {
  if (okbPrice === null) return null;

  const gasCostUsd = GAS_OKB * okbPrice;
  const display =
    gasCostUsd < 0.01
      ? 'Gas: <$0.01'
      : `Gas: ~$${gasCostUsd.toFixed(3)}`;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-800 border border-gray-700 px-2.5 py-0.5 text-xs text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      {display}
    </span>
  );
}
