import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TIFO Faction';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/* --- Faction data (inlined for edge runtime compatibility) --- */

const FACTIONS = [
  { id: 0, code: 'ARG', name: 'Argentina', color: '#75AADB', confederation: 'CONMEBOL', anchor: 'AR' },
  { id: 1, code: 'BRA', name: 'Brazil', color: '#009C3B', confederation: 'CONMEBOL', anchor: 'BR' },
  { id: 2, code: 'URU', name: 'Uruguay', color: '#5CBFEB', confederation: 'CONMEBOL', anchor: 'UY' },
  { id: 3, code: 'COL', name: 'Colombia', color: '#FCD116', confederation: 'CONMEBOL', anchor: 'CO' },
  { id: 4, code: 'ECU', name: 'Ecuador', color: '#FFD100', confederation: 'CONMEBOL', anchor: 'EC' },
  { id: 5, code: 'PAR', name: 'Paraguay', color: '#D52B1E', confederation: 'CONMEBOL', anchor: 'PY' },
  { id: 6, code: 'FRA', name: 'France', color: '#002395', confederation: 'UEFA', anchor: 'FR' },
  { id: 7, code: 'ESP', name: 'Spain', color: '#AA151B', confederation: 'UEFA', anchor: 'ES' },
  { id: 8, code: 'ENG', name: 'England', color: '#FFFFFF', confederation: 'UEFA', anchor: 'GB' },
  { id: 9, code: 'GER', name: 'Germany', color: '#000000', confederation: 'UEFA', anchor: 'DE' },
  { id: 10, code: 'POR', name: 'Portugal', color: '#006847', confederation: 'UEFA', anchor: 'PT' },
  { id: 11, code: 'NED', name: 'Netherlands', color: '#FF6600', confederation: 'UEFA', anchor: 'NL' },
  { id: 12, code: 'CRO', name: 'Croatia', color: '#FF0000', confederation: 'UEFA', anchor: 'HR' },
  { id: 13, code: 'BEL', name: 'Belgium', color: '#ED2939', confederation: 'UEFA', anchor: 'BE' },
  { id: 14, code: 'ITA', name: 'Italy', color: '#0066B2', confederation: 'UEFA', anchor: 'IT' },
  { id: 15, code: 'SUI', name: 'Switzerland', color: '#D52B1E', confederation: 'UEFA', anchor: 'CH' },
  { id: 16, code: 'AUT', name: 'Austria', color: '#C8102E', confederation: 'UEFA', anchor: 'AT' },
  { id: 17, code: 'NOR', name: 'Norway', color: '#BA0C2F', confederation: 'UEFA', anchor: 'NO' },
  { id: 18, code: 'POL', name: 'Poland', color: '#DC143C', confederation: 'UEFA', anchor: 'PL' },
  { id: 19, code: 'CZE', name: 'Czech Republic', color: '#11457E', confederation: 'UEFA', anchor: 'CZ' },
  { id: 20, code: 'USA', name: 'United States', color: '#3C3B6E', confederation: 'CONCACAF', anchor: 'US' },
  { id: 21, code: 'MEX', name: 'Mexico', color: '#006341', confederation: 'CONCACAF', anchor: 'MX' },
  { id: 22, code: 'CAN', name: 'Canada', color: '#E03C31', confederation: 'CONCACAF', anchor: 'CA' },
  { id: 23, code: 'PAN', name: 'Panama', color: '#DA121A', confederation: 'CONCACAF', anchor: 'PA' },
  { id: 24, code: 'HAI', name: 'Haiti', color: '#00209F', confederation: 'CONCACAF', anchor: 'HT' },
  { id: 25, code: 'MAR', name: 'Morocco', color: '#C1272D', confederation: 'CAF', anchor: 'MA' },
  { id: 26, code: 'SEN', name: 'Senegal', color: '#00853F', confederation: 'CAF', anchor: 'SN' },
  { id: 27, code: 'GHA', name: 'Ghana', color: '#006B3F', confederation: 'CAF', anchor: 'GH' },
  { id: 28, code: 'RSA', name: 'South Africa', color: '#007749', confederation: 'CAF', anchor: 'ZA' },
  { id: 29, code: 'CIV', name: "Cote d'Ivoire", color: '#F77F00', confederation: 'CAF', anchor: 'CI' },
  { id: 30, code: 'NGA', name: 'Nigeria', color: '#008751', confederation: 'CAF', anchor: 'NG' },
  { id: 31, code: 'ALG', name: 'Algeria', color: '#006233', confederation: 'CAF', anchor: 'DZ' },
  { id: 32, code: 'EGY', name: 'Egypt', color: '#C8102E', confederation: 'CAF', anchor: 'EG' },
  { id: 33, code: 'CPV', name: 'Cape Verde', color: '#003893', confederation: 'CAF', anchor: 'CV' },
  { id: 34, code: 'COD', name: 'DR Congo', color: '#007FFF', confederation: 'CAF', anchor: 'CD' },
  { id: 35, code: 'JPN', name: 'Japan', color: '#002B7F', confederation: 'AFC', anchor: 'JP' },
  { id: 36, code: 'KOR', name: 'South Korea', color: '#CD2E3A', confederation: 'AFC', anchor: 'KR' },
  { id: 37, code: 'AUS', name: 'Australia', color: '#FFCD00', confederation: 'AFC', anchor: 'AU' },
  { id: 38, code: 'KSA', name: 'Saudi Arabia', color: '#006C35', confederation: 'AFC', anchor: 'SA' },
  { id: 39, code: 'IRN', name: 'Iran', color: '#239F40', confederation: 'AFC', anchor: 'IR' },
  { id: 40, code: 'QAT', name: 'Qatar', color: '#8A1538', confederation: 'AFC', anchor: 'QA' },
  { id: 41, code: 'UZB', name: 'Uzbekistan', color: '#1EB53A', confederation: 'AFC', anchor: 'UZ' },
  { id: 42, code: 'JOR', name: 'Jordan', color: '#007A3D', confederation: 'AFC', anchor: 'JO' },
  { id: 43, code: 'IRQ', name: 'Iraq', color: '#007A33', confederation: 'AFC', anchor: 'IQ' },
  { id: 44, code: 'NZL', name: 'New Zealand', color: '#1A1A1A', confederation: 'OFC', anchor: 'NZ' },
  { id: 45, code: 'JAM', name: 'Jamaica', color: '#009B3A', confederation: 'CONCACAF', anchor: 'JM' },
  { id: 46, code: 'TUR', name: 'Turkey', color: '#E30A17', confederation: 'UEFA', anchor: 'TR' },
  { id: 47, code: 'TUN', name: 'Tunisia', color: '#E70013', confederation: 'CAF', anchor: 'TN' },
] as const;

const FACTION_FLAGS: Record<string, string> = {
  AR: '\u{1F1E6}\u{1F1F7}', BR: '\u{1F1E7}\u{1F1F7}', UY: '\u{1F1FA}\u{1F1FE}',
  CO: '\u{1F1E8}\u{1F1F4}', EC: '\u{1F1EA}\u{1F1E8}', PY: '\u{1F1F5}\u{1F1FE}',
  FR: '\u{1F1EB}\u{1F1F7}', ES: '\u{1F1EA}\u{1F1F8}', GB: '\u{1F1EC}\u{1F1E7}',
  DE: '\u{1F1E9}\u{1F1EA}', PT: '\u{1F1F5}\u{1F1F9}', NL: '\u{1F1F3}\u{1F1F1}',
  HR: '\u{1F1ED}\u{1F1F7}', BE: '\u{1F1E7}\u{1F1EA}', IT: '\u{1F1EE}\u{1F1F9}',
  CH: '\u{1F1E8}\u{1F1ED}', AT: '\u{1F1E6}\u{1F1F9}', NO: '\u{1F1F3}\u{1F1F4}',
  PL: '\u{1F1F5}\u{1F1F1}', CZ: '\u{1F1E8}\u{1F1FF}', US: '\u{1F1FA}\u{1F1F8}',
  MX: '\u{1F1F2}\u{1F1FD}', CA: '\u{1F1E8}\u{1F1E6}', PA: '\u{1F1F5}\u{1F1E6}',
  HT: '\u{1F1ED}\u{1F1F9}', MA: '\u{1F1F2}\u{1F1E6}', SN: '\u{1F1F8}\u{1F1F3}',
  GH: '\u{1F1EC}\u{1F1ED}', ZA: '\u{1F1FF}\u{1F1E6}', CI: '\u{1F1E8}\u{1F1EE}',
  NG: '\u{1F1F3}\u{1F1EC}', DZ: '\u{1F1E9}\u{1F1FF}', EG: '\u{1F1EA}\u{1F1EC}',
  CV: '\u{1F1E8}\u{1F1FB}', CD: '\u{1F1E8}\u{1F1E9}', JP: '\u{1F1EF}\u{1F1F5}',
  KR: '\u{1F1F0}\u{1F1F7}', AU: '\u{1F1E6}\u{1F1FA}', SA: '\u{1F1F8}\u{1F1E6}',
  IR: '\u{1F1EE}\u{1F1F7}', QA: '\u{1F1F6}\u{1F1E6}', UZ: '\u{1F1FA}\u{1F1FF}',
  JO: '\u{1F1EF}\u{1F1F4}', IQ: '\u{1F1EE}\u{1F1F6}', NZ: '\u{1F1F3}\u{1F1FF}',
  JM: '\u{1F1EF}\u{1F1F2}', TR: '\u{1F1F9}\u{1F1F7}', TN: '\u{1F1F9}\u{1F1F3}',
};

/* --- OG Image Generator --- */

export default async function Image({ params }: { params: { id: string } }) {
  const factionId = parseInt(params.id, 10);
  const faction = FACTIONS.find((f) => f.id === factionId);

  /* Fetch live stats from the Indexer API */
  let territoriesHeld = '--';
  let memberCount = '--';
  let prizePoolFormatted = '--';
  try {
    const indexerApi = process.env.NEXT_PUBLIC_INDEXER_API;
    if (indexerApi) {
      const res = await fetch(`${indexerApi}/faction/${factionId}`, { next: { revalidate: 60 } });
      if (res.ok) {
        const data = await res.json();
        if (data.territoriesHeld != null) territoriesHeld = String(data.territoriesHeld);
        if (data.memberCount != null) memberCount = String(data.memberCount);
        if (data.prizePoolFormatted != null) prizePoolFormatted = String(data.prizePoolFormatted);
      }
    }
  } catch {
    // fall back to '--'
  }

  if (!faction) {
    // Fallback for unknown faction IDs
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#030712',
            color: '#ffffff',
            fontSize: 48,
            fontFamily: 'sans-serif',
          }}
        >
          TIFO | Unknown Faction
        </div>
      ),
      { ...size },
    );
  }

  const flag = FACTION_FLAGS[faction.anchor] ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: '#030712',
          fontFamily: 'sans-serif',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Accent stripe on the left */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 8,
            height: '100%',
            backgroundColor: faction.color,
          }}
        />

        {/* Background color wash */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `linear-gradient(135deg, #030712 0%, ${faction.color}33 100%)`,
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '48px 64px',
            position: 'relative',
          }}
        >
          {/* Top section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Confederation badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 18,
                color: '#9ca3af',
                letterSpacing: 3,
                textTransform: 'uppercase',
              }}
            >
              {faction.confederation}
            </div>

            {/* Flag + Faction name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 8 }}>
              <span style={{ fontSize: 80 }}>{flag}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: 64,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    color: '#ffffff',
                  }}
                >
                  {faction.name}
                </span>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: faction.color,
                    letterSpacing: 4,
                    marginTop: 4,
                  }}
                >
                  {faction.code}
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 32,
              fontSize: 22,
              color: '#d1d5db',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span style={{ color: faction.color, fontWeight: 700, fontSize: 28 }}>{territoriesHeld}</span>
              <span>Territories</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span style={{ color: faction.color, fontWeight: 700, fontSize: 28 }}>{memberCount}</span>
              <span>Members</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span style={{ color: faction.color, fontWeight: 700, fontSize: 28 }}>{prizePoolFormatted}</span>
              <span>mUSDT Prize Pool</span>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 20,
                fontWeight: 600,
                color: '#9ca3af',
              }}
            >
              <span style={{ color: '#ffffff', fontWeight: 700 }}>TIFO</span>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>|</span>
              <span>Territory War on X Layer</span>
            </div>
            <div style={{ fontSize: 18, color: '#6b7280' }}>@0xWangyangming</div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
