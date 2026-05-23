// 48 World Cup factions — name lookups for tweet templates

export interface Faction {
  id: number;
  code: string;
  name: string;
  flag: string; // emoji flag
}

export const FACTIONS: Faction[] = [
  { id: 0,  code: 'ARG', name: 'Argentina',     flag: '🇦🇷' },
  { id: 1,  code: 'BRA', name: 'Brazil',        flag: '🇧🇷' },
  { id: 2,  code: 'URU', name: 'Uruguay',       flag: '🇺🇾' },
  { id: 3,  code: 'COL', name: 'Colombia',      flag: '🇨🇴' },
  { id: 4,  code: 'ECU', name: 'Ecuador',       flag: '🇪🇨' },
  { id: 5,  code: 'PAR', name: 'Paraguay',      flag: '🇵🇾' },
  { id: 6,  code: 'FRA', name: 'France',        flag: '🇫🇷' },
  { id: 7,  code: 'ESP', name: 'Spain',         flag: '🇪🇸' },
  { id: 8,  code: 'ENG', name: 'England',       flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 9,  code: 'GER', name: 'Germany',       flag: '🇩🇪' },
  { id: 10, code: 'POR', name: 'Portugal',      flag: '🇵🇹' },
  { id: 11, code: 'NED', name: 'Netherlands',   flag: '🇳🇱' },
  { id: 12, code: 'CRO', name: 'Croatia',       flag: '🇭🇷' },
  { id: 13, code: 'BEL', name: 'Belgium',       flag: '🇧🇪' },
  { id: 14, code: 'BIH', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { id: 15, code: 'SUI', name: 'Switzerland',   flag: '🇨🇭' },
  { id: 16, code: 'AUT', name: 'Austria',       flag: '🇦🇹' },
  { id: 17, code: 'NOR', name: 'Norway',        flag: '🇳🇴' },
  { id: 18, code: 'SWE', name: 'Sweden',         flag: '🇸🇪' },
  { id: 19, code: 'CZE', name: 'Czech Republic',flag: '🇨🇿' },
  { id: 20, code: 'USA', name: 'United States',  flag: '🇺🇸' },
  { id: 21, code: 'MEX', name: 'Mexico',        flag: '🇲🇽' },
  { id: 22, code: 'CAN', name: 'Canada',        flag: '🇨🇦' },
  { id: 23, code: 'PAN', name: 'Panama',        flag: '🇵🇦' },
  { id: 24, code: 'HAI', name: 'Haiti',         flag: '🇭🇹' },
  { id: 25, code: 'MAR', name: 'Morocco',       flag: '🇲🇦' },
  { id: 26, code: 'SEN', name: 'Senegal',       flag: '🇸🇳' },
  { id: 27, code: 'GHA', name: 'Ghana',         flag: '🇬🇭' },
  { id: 28, code: 'RSA', name: 'South Africa',  flag: '🇿🇦' },
  { id: 29, code: 'CIV', name: "Cote d'Ivoire", flag: '🇨🇮' },
  { id: 30, code: 'SCO', name: 'Scotland',       flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { id: 31, code: 'ALG', name: 'Algeria',       flag: '🇩🇿' },
  { id: 32, code: 'EGY', name: 'Egypt',         flag: '🇪🇬' },
  { id: 33, code: 'CPV', name: 'Cape Verde',    flag: '🇨🇻' },
  { id: 34, code: 'COD', name: 'DR Congo',      flag: '🇨🇩' },
  { id: 35, code: 'JPN', name: 'Japan',         flag: '🇯🇵' },
  { id: 36, code: 'KOR', name: 'South Korea',   flag: '🇰🇷' },
  { id: 37, code: 'AUS', name: 'Australia',     flag: '🇦🇺' },
  { id: 38, code: 'KSA', name: 'Saudi Arabia',  flag: '🇸🇦' },
  { id: 39, code: 'IRN', name: 'Iran',          flag: '🇮🇷' },
  { id: 40, code: 'QAT', name: 'Qatar',         flag: '🇶🇦' },
  { id: 41, code: 'UZB', name: 'Uzbekistan',    flag: '🇺🇿' },
  { id: 42, code: 'JOR', name: 'Jordan',        flag: '🇯🇴' },
  { id: 43, code: 'IRQ', name: 'Iraq',          flag: '🇮🇶' },
  { id: 44, code: 'NZL', name: 'New Zealand',   flag: '🇳🇿' },
  { id: 45, code: 'CUR', name: 'Curacao',        flag: '🇨🇼' },
  { id: 46, code: 'TUR', name: 'Turkey',        flag: '🇹🇷' },
  { id: 47, code: 'TUN', name: 'Tunisia',       flag: '🇹🇳' },
];

const NO_FACTION = 255;

export function getFaction(id: number): Faction {
  if (id === NO_FACTION || id < 0 || id >= FACTIONS.length) {
    return { id, code: '???', name: 'Neutral', flag: '🏳️' };
  }
  return FACTIONS[id];
}

export function factionLabel(id: number): string {
  const f = getFaction(id);
  return `${f.flag} ${f.name}`;
}
