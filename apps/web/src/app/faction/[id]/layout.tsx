import type { Metadata } from 'next';

const FACTIONS = [
  { id: 0, code: 'ARG', name: 'Argentina' },
  { id: 1, code: 'BRA', name: 'Brazil' },
  { id: 2, code: 'URU', name: 'Uruguay' },
  { id: 3, code: 'COL', name: 'Colombia' },
  { id: 4, code: 'ECU', name: 'Ecuador' },
  { id: 5, code: 'PAR', name: 'Paraguay' },
  { id: 6, code: 'FRA', name: 'France' },
  { id: 7, code: 'ESP', name: 'Spain' },
  { id: 8, code: 'ENG', name: 'England' },
  { id: 9, code: 'GER', name: 'Germany' },
  { id: 10, code: 'POR', name: 'Portugal' },
  { id: 11, code: 'NED', name: 'Netherlands' },
  { id: 12, code: 'CRO', name: 'Croatia' },
  { id: 13, code: 'BEL', name: 'Belgium' },
  { id: 14, code: 'ITA', name: 'Italy' },
  { id: 15, code: 'SUI', name: 'Switzerland' },
  { id: 16, code: 'AUT', name: 'Austria' },
  { id: 17, code: 'NOR', name: 'Norway' },
  { id: 18, code: 'POL', name: 'Poland' },
  { id: 19, code: 'CZE', name: 'Czech Republic' },
  { id: 20, code: 'USA', name: 'United States' },
  { id: 21, code: 'MEX', name: 'Mexico' },
  { id: 22, code: 'CAN', name: 'Canada' },
  { id: 23, code: 'PAN', name: 'Panama' },
  { id: 24, code: 'HAI', name: 'Haiti' },
  { id: 25, code: 'MAR', name: 'Morocco' },
  { id: 26, code: 'SEN', name: 'Senegal' },
  { id: 27, code: 'GHA', name: 'Ghana' },
  { id: 28, code: 'RSA', name: 'South Africa' },
  { id: 29, code: 'CIV', name: "Cote d'Ivoire" },
  { id: 30, code: 'NGA', name: 'Nigeria' },
  { id: 31, code: 'ALG', name: 'Algeria' },
  { id: 32, code: 'EGY', name: 'Egypt' },
  { id: 33, code: 'CPV', name: 'Cape Verde' },
  { id: 34, code: 'COD', name: 'DR Congo' },
  { id: 35, code: 'JPN', name: 'Japan' },
  { id: 36, code: 'KOR', name: 'South Korea' },
  { id: 37, code: 'AUS', name: 'Australia' },
  { id: 38, code: 'KSA', name: 'Saudi Arabia' },
  { id: 39, code: 'IRN', name: 'Iran' },
  { id: 40, code: 'QAT', name: 'Qatar' },
  { id: 41, code: 'UZB', name: 'Uzbekistan' },
  { id: 42, code: 'JOR', name: 'Jordan' },
  { id: 43, code: 'IRQ', name: 'Iraq' },
  { id: 44, code: 'NZL', name: 'New Zealand' },
  { id: 45, code: 'JAM', name: 'Jamaica' },
  { id: 46, code: 'TUR', name: 'Turkey' },
  { id: 47, code: 'TUN', name: 'Tunisia' },
] as const;

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const factionId = parseInt(params.id, 10);
  const faction = FACTIONS.find((f) => f.id === factionId);
  const factionName = faction?.name ?? 'Unknown Faction';
  const factionCode = faction?.code ?? '???';

  return {
    title: `${factionName} (${factionCode}) | TIFO`,
    description: `${factionName} faction in the TIFO territory war. 48 World Cup factions battle for 200 regions on X Layer. Every rally, capture, and defection is on-chain.`,
    twitter: {
      card: 'summary_large_image',
      title: `${factionName} | TIFO Territory War`,
      description: `Join ${factionName} in the World Cup territory war on X Layer.`,
      creator: '@0xWangyangming',
    },
    openGraph: {
      title: `${factionName} (${factionCode}) | TIFO`,
      description: `${factionName} faction in the TIFO territory war on X Layer.`,
      type: 'website',
    },
  };
}

export default function FactionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
