export interface Faction {
  id: number;
  code: string;
  name: string;
  nameZh: string;
  confederation: string;
  anchor: string;
  color: string;
  flag: string;
}

export const FACTIONS: Faction[] = [
  { id: 0, code: 'ARG', name: 'Argentina', nameZh: '阿根廷', confederation: 'CONMEBOL', anchor: 'AR', color: '#75AADB', flag: '🇦🇷' },
  { id: 1, code: 'BRA', name: 'Brazil', nameZh: '巴西', confederation: 'CONMEBOL', anchor: 'BR', color: '#009C3B', flag: '🇧🇷' },
  { id: 2, code: 'URU', name: 'Uruguay', nameZh: '乌拉圭', confederation: 'CONMEBOL', anchor: 'UY', color: '#5CBFEB', flag: '🇺🇾' },
  { id: 3, code: 'COL', name: 'Colombia', nameZh: '哥伦比亚', confederation: 'CONMEBOL', anchor: 'CO', color: '#FCD116', flag: '🇨🇴' },
  { id: 4, code: 'ECU', name: 'Ecuador', nameZh: '厄瓜多尔', confederation: 'CONMEBOL', anchor: 'EC', color: '#FFD100', flag: '🇪🇨' },
  { id: 5, code: 'PAR', name: 'Paraguay', nameZh: '巴拉圭', confederation: 'CONMEBOL', anchor: 'PY', color: '#D52B1E', flag: '🇵🇾' },
  { id: 6, code: 'FRA', name: 'France', nameZh: '法国', confederation: 'UEFA', anchor: 'FR', color: '#002395', flag: '🇫🇷' },
  { id: 7, code: 'ESP', name: 'Spain', nameZh: '西班牙', confederation: 'UEFA', anchor: 'ES', color: '#AA151B', flag: '🇪🇸' },
  { id: 8, code: 'ENG', name: 'England', nameZh: '英格兰', confederation: 'UEFA', anchor: 'GB', color: '#FFFFFF', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 9, code: 'GER', name: 'Germany', nameZh: '德国', confederation: 'UEFA', anchor: 'DE', color: '#000000', flag: '🇩🇪' },
  { id: 10, code: 'POR', name: 'Portugal', nameZh: '葡萄牙', confederation: 'UEFA', anchor: 'PT', color: '#006847', flag: '🇵🇹' },
  { id: 11, code: 'NED', name: 'Netherlands', nameZh: '荷兰', confederation: 'UEFA', anchor: 'NL', color: '#FF6600', flag: '🇳🇱' },
  { id: 12, code: 'CRO', name: 'Croatia', nameZh: '克罗地亚', confederation: 'UEFA', anchor: 'HR', color: '#FF0000', flag: '🇭🇷' },
  { id: 13, code: 'BEL', name: 'Belgium', nameZh: '比利时', confederation: 'UEFA', anchor: 'BE', color: '#ED2939', flag: '🇧🇪' },
  { id: 14, code: 'ITA', name: 'Italy', nameZh: '意大利', confederation: 'UEFA', anchor: 'IT', color: '#008C45', flag: '🇮🇹' },
  { id: 15, code: 'SUI', name: 'Switzerland', nameZh: '瑞士', confederation: 'UEFA', anchor: 'CH', color: '#D52B1E', flag: '🇨🇭' },
  { id: 16, code: 'AUT', name: 'Austria', nameZh: '奥地利', confederation: 'UEFA', anchor: 'AT', color: '#C8102E', flag: '🇦🇹' },
  { id: 17, code: 'NOR', name: 'Norway', nameZh: '挪威', confederation: 'UEFA', anchor: 'NO', color: '#BA0C2F', flag: '🇳🇴' },
  { id: 18, code: 'POL', name: 'Poland', nameZh: '波兰', confederation: 'UEFA', anchor: 'PL', color: '#DC143C', flag: '🇵🇱' },
  { id: 19, code: 'CZE', name: 'Czech Republic', nameZh: '捷克', confederation: 'UEFA', anchor: 'CZ', color: '#11457E', flag: '🇨🇿' },
  { id: 20, code: 'USA', name: 'United States', nameZh: '美国', confederation: 'CONCACAF', anchor: 'US', color: '#3C3B6E', flag: '🇺🇸' },
  { id: 21, code: 'MEX', name: 'Mexico', nameZh: '墨西哥', confederation: 'CONCACAF', anchor: 'MX', color: '#006341', flag: '🇲🇽' },
  { id: 22, code: 'CAN', name: 'Canada', nameZh: '加拿大', confederation: 'CONCACAF', anchor: 'CA', color: '#E03C31', flag: '🇨🇦' },
  { id: 23, code: 'PAN', name: 'Panama', nameZh: '巴拿马', confederation: 'CONCACAF', anchor: 'PA', color: '#DA121A', flag: '🇵🇦' },
  { id: 24, code: 'HAI', name: 'Haiti', nameZh: '海地', confederation: 'CONCACAF', anchor: 'HT', color: '#00209F', flag: '🇭🇹' },
  { id: 25, code: 'MAR', name: 'Morocco', nameZh: '摩洛哥', confederation: 'CAF', anchor: 'MA', color: '#C1272D', flag: '🇲🇦' },
  { id: 26, code: 'SEN', name: 'Senegal', nameZh: '塞内加尔', confederation: 'CAF', anchor: 'SN', color: '#00853F', flag: '🇸🇳' },
  { id: 27, code: 'GHA', name: 'Ghana', nameZh: '加纳', confederation: 'CAF', anchor: 'GH', color: '#006B3F', flag: '🇬🇭' },
  { id: 28, code: 'RSA', name: 'South Africa', nameZh: '南非', confederation: 'CAF', anchor: 'ZA', color: '#007749', flag: '🇿🇦' },
  { id: 29, code: 'CIV', name: "Cote d'Ivoire", nameZh: '科特迪瓦', confederation: 'CAF', anchor: 'CI', color: '#F77F00', flag: '🇨🇮' },
  { id: 30, code: 'NGA', name: 'Nigeria', nameZh: '尼日利亚', confederation: 'CAF', anchor: 'NG', color: '#008751', flag: '🇳🇬' },
  { id: 31, code: 'ALG', name: 'Algeria', nameZh: '阿尔及利亚', confederation: 'CAF', anchor: 'DZ', color: '#006233', flag: '🇩🇿' },
  { id: 32, code: 'EGY', name: 'Egypt', nameZh: '埃及', confederation: 'CAF', anchor: 'EG', color: '#C8102E', flag: '🇪🇬' },
  { id: 33, code: 'CPV', name: 'Cape Verde', nameZh: '佛得角', confederation: 'CAF', anchor: 'CV', color: '#003893', flag: '🇨🇻' },
  { id: 34, code: 'COD', name: 'DR Congo', nameZh: '刚果(金)', confederation: 'CAF', anchor: 'CD', color: '#007FFF', flag: '🇨🇩' },
  { id: 35, code: 'JPN', name: 'Japan', nameZh: '日本', confederation: 'AFC', anchor: 'JP', color: '#002B7F', flag: '🇯🇵' },
  { id: 36, code: 'KOR', name: 'South Korea', nameZh: '韩国', confederation: 'AFC', anchor: 'KR', color: '#CD2E3A', flag: '🇰🇷' },
  { id: 37, code: 'AUS', name: 'Australia', nameZh: '澳大利亚', confederation: 'AFC', anchor: 'AU', color: '#FFCD00', flag: '🇦🇺' },
  { id: 38, code: 'KSA', name: 'Saudi Arabia', nameZh: '沙特', confederation: 'AFC', anchor: 'SA', color: '#006C35', flag: '🇸🇦' },
  { id: 39, code: 'IRN', name: 'Iran', nameZh: '伊朗', confederation: 'AFC', anchor: 'IR', color: '#239F40', flag: '🇮🇷' },
  { id: 40, code: 'QAT', name: 'Qatar', nameZh: '卡塔尔', confederation: 'AFC', anchor: 'QA', color: '#8A1538', flag: '🇶🇦' },
  { id: 41, code: 'UZB', name: 'Uzbekistan', nameZh: '乌兹别克斯坦', confederation: 'AFC', anchor: 'UZ', color: '#1EB53A', flag: '🇺🇿' },
  { id: 42, code: 'JOR', name: 'Jordan', nameZh: '约旦', confederation: 'AFC', anchor: 'JO', color: '#007A3D', flag: '🇯🇴' },
  { id: 43, code: 'IRQ', name: 'Iraq', nameZh: '伊拉克', confederation: 'AFC', anchor: 'IQ', color: '#007A33', flag: '🇮🇶' },
  { id: 44, code: 'NZL', name: 'New Zealand', nameZh: '新西兰', confederation: 'OFC', anchor: 'NZ', color: '#1A1A1A', flag: '🇳🇿' },
  { id: 45, code: 'JAM', name: 'Jamaica', nameZh: '牙买加', confederation: 'CONCACAF', anchor: 'JM', color: '#009B3A', flag: '🇯🇲' },
  { id: 46, code: 'TUR', name: 'Turkey', nameZh: '土耳其', confederation: 'UEFA', anchor: 'TR', color: '#E30A17', flag: '🇹🇷' },
  { id: 47, code: 'TUN', name: 'Tunisia', nameZh: '突尼斯', confederation: 'CAF', anchor: 'TN', color: '#E70013', flag: '🇹🇳' },
];

export const getFaction = (id: number): Faction | undefined => FACTIONS.find(f => f.id === id);
export const NO_FACTION = 255;
