/**
 * Region mapping for TIFO world map.
 *
 * The smart contract supports 200 regions (indices 0-199).
 * The world-atlas countries-110m.json uses ISO 3166-1 numeric codes as feature IDs.
 * This file provides a stable, deterministic mapping between those two systems.
 */

// ---------------------------------------------------------------------------
// Country ID -> Region ID (0-based index for the smart contract)
// Derived from sorted ISO 3166-1 numeric codes in countries-110m.json (177 countries).
// Regions 177-199 are reserved for future use.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _SORTED_COUNTRY_IDS: string[] = [
  // placeholder – filled below; used only for documentation
];

// Will be populated by buildMappings()
export const countryToRegionId: Record<string, number> = {};
export const regionIdToCountry: Record<number, string> = {};

// ---------------------------------------------------------------------------
// Static sorted list of all 177 country IDs from countries-110m.json
// ---------------------------------------------------------------------------

const ALL_COUNTRY_IDS: string[] = [
  '004','008','010','012','024','031','032','036','040','044',
  '050','051','056','064','068','070','072','076','084','090',
  '096','100','104','108','112','116','120','124','140','144',
  '148','152','156','158','170','178','180','188','191','192',
  '196','203','204','208','214','218','222','226','231','232',
  '233','238','242','246','250','260','262','266','268','270',
  '275','276','288','300','304','320','324','328','332','340',
  '348','352','356','360','364','368','372','376','380','384',
  '388','392','398','400','404','408','410','414','417','418',
  '422','426','428','430','434','440','442','450','454','458',
  '466','478','484','496','498','499','504','508','512','516',
  '524','528','540','548','554','558','562','566','578','586',
  '591','598','600','604','608','616','620','624','626','630',
  '634','642','643','646','682','686','688','694','703','704',
  '705','706','710','716','724','728','729','732','740','748',
  '752','756','760','762','764','768','780','784','788','792',
  '795','800','804','807','818','826','834','840','854','858',
  '860','862','887','894',
];

// Build mappings: regionId is simply the index in the sorted array.
ALL_COUNTRY_IDS.forEach((id, index) => {
  countryToRegionId[id] = index;
  regionIdToCountry[index] = id;
});

// ---------------------------------------------------------------------------
// Faction anchor regions
// Maps factionId (0-47) to the regionId of the anchor country.
// ---------------------------------------------------------------------------

/** Faction anchors in order of factionId 0-47 */
const FACTION_ANCHOR_COUNTRY_IDS: string[] = [
  // South America (0-5)
  '032', // 0  ARG - Argentina
  '076', // 1  BRA - Brazil
  '858', // 2  URU - Uruguay
  '170', // 3  COL - Colombia
  '218', // 4  ECU - Ecuador
  '600', // 5  PAR - Paraguay

  // Europe (6-19)
  '250', // 6  FRA - France
  '724', // 7  ESP - Spain
  '826', // 8  ENG - England (GBR)
  '276', // 9  DEU - Germany
  '620', // 10 PRT - Portugal
  '528', // 11 NLD - Netherlands
  '191', // 12 HRV - Croatia
  '056', // 13 BEL - Belgium
  '070', // 14 BIH - Bosnia and Herzegovina
  '756', // 15 CHE - Switzerland
  '040', // 16 AUT - Austria
  '578', // 17 NOR - Norway
  '752', // 18 SWE - Sweden
  '203', // 19 CZE - Czechia

  // North / Central America (20-24)
  '840', // 20 USA - United States
  '484', // 21 MEX - Mexico
  '124', // 22 CAN - Canada
  '591', // 23 PAN - Panama
  '332', // 24 HTI - Haiti

  // Africa (25-34)
  '504', // 25 MAR - Morocco
  '686', // 26 SEN - Senegal
  '288', // 27 GHA - Ghana
  '710', // 28 ZAF - South Africa
  '384', // 29 CIV - Ivory Coast
  '826', // 30 SCO - Scotland (shares GBR with England; uses reserved region 178)
  '012', // 31 DZA - Algeria
  '818', // 32 EGY - Egypt
  '132', // 33 CPV - Cape Verde  (not in 110m; assigned region 177)
  '180', // 34 COD - DR Congo

  // Asia (35-43)
  '392', // 35 JPN - Japan
  '410', // 36 KOR - South Korea
  '036', // 37 AUS - Australia
  '682', // 38 SAU - Saudi Arabia
  '364', // 39 IRN - Iran
  '634', // 40 QAT - Qatar
  '860', // 41 UZB - Uzbekistan
  '400', // 42 JOR - Jordan
  '368', // 43 IRQ - Iraq

  // Other (44-47)
  '554', // 44 NZL - New Zealand
  '531', // 45 CUR - Curaçao (not in 110m; uses reserved region 179)
  '792', // 46 TUR - Turkey
  '788', // 47 TUN - Tunisia
];

// Cape Verde (132) is not present in 110m; assign it to the first reserved slot.
if (!(countryToRegionId['132'] >= 0)) {
  countryToRegionId['132'] = 177;
  regionIdToCountry[177] = '132';
}

// Scotland (826-SCO) shares ISO numeric with England (GBR); assign reserved slot 178.
// This allows Scotland to have its own distinct region on the map.
countryToRegionId['826-SCO'] = 178;
regionIdToCountry[178] = '826-SCO';

// Curaçao (531) is not present in 110m; assign reserved slot 179.
if (!(countryToRegionId['531'] >= 0)) {
  countryToRegionId['531'] = 179;
  regionIdToCountry[179] = '531';
}

export const factionAnchorRegions: Record<number, number> = {};
FACTION_ANCHOR_COUNTRY_IDS.forEach((countryId, factionId) => {
  factionAnchorRegions[factionId] = countryToRegionId[countryId];
});

// Override: Scotland (faction 30) uses reserved region 178 instead of 826 (shared with England)
factionAnchorRegions[30] = 178;
// Override: Curaçao (faction 45) uses reserved region 179
factionAnchorRegions[45] = 179;

// ---------------------------------------------------------------------------
// Country name lookup (basic, covers faction anchors + major countries)
// ---------------------------------------------------------------------------

const COUNTRY_NAMES: Record<string, string> = {
  '004': 'Afghanistan',
  '008': 'Albania',
  '010': 'Antarctica',
  '012': 'Algeria',
  '024': 'Angola',
  '031': 'Azerbaijan',
  '032': 'Argentina',
  '036': 'Australia',
  '040': 'Austria',
  '044': 'Bahamas',
  '050': 'Bangladesh',
  '051': 'Armenia',
  '056': 'Belgium',
  '064': 'Bhutan',
  '068': 'Bolivia',
  '070': 'Bosnia and Herzegovina',
  '072': 'Botswana',
  '076': 'Brazil',
  '084': 'Belize',
  '090': 'Solomon Islands',
  '096': 'Brunei',
  '100': 'Bulgaria',
  '104': 'Myanmar',
  '108': 'Burundi',
  '112': 'Belarus',
  '116': 'Cambodia',
  '120': 'Cameroon',
  '124': 'Canada',
  '132': 'Cape Verde',
  '140': 'Central African Republic',
  '144': 'Sri Lanka',
  '148': 'Chad',
  '152': 'Chile',
  '156': 'China',
  '158': 'Taiwan',
  '170': 'Colombia',
  '178': 'Congo',
  '180': 'Democratic Republic of the Congo',
  '188': 'Costa Rica',
  '191': 'Croatia',
  '192': 'Cuba',
  '196': 'Cyprus',
  '203': 'Czechia',
  '204': 'Benin',
  '208': 'Denmark',
  '214': 'Dominican Republic',
  '218': 'Ecuador',
  '222': 'El Salvador',
  '226': 'Equatorial Guinea',
  '231': 'Ethiopia',
  '232': 'Eritrea',
  '233': 'Estonia',
  '238': 'Falkland Islands',
  '242': 'Fiji',
  '246': 'Finland',
  '250': 'France',
  '260': 'French Southern Territories',
  '262': 'Djibouti',
  '266': 'Gabon',
  '268': 'Georgia',
  '270': 'Gambia',
  '275': 'Palestine',
  '276': 'Germany',
  '288': 'Ghana',
  '300': 'Greece',
  '304': 'Greenland',
  '320': 'Guatemala',
  '324': 'Guinea',
  '328': 'Guyana',
  '332': 'Haiti',
  '340': 'Honduras',
  '348': 'Hungary',
  '352': 'Iceland',
  '356': 'India',
  '360': 'Indonesia',
  '364': 'Iran',
  '368': 'Iraq',
  '372': 'Ireland',
  '376': 'Israel',
  '380': 'Italy',
  '384': "Cote d'Ivoire",
  '388': 'Jamaica',
  '392': 'Japan',
  '398': 'Kazakhstan',
  '400': 'Jordan',
  '404': 'Kenya',
  '408': 'North Korea',
  '410': 'South Korea',
  '414': 'Kuwait',
  '417': 'Kyrgyzstan',
  '418': 'Laos',
  '422': 'Lebanon',
  '426': 'Lesotho',
  '428': 'Latvia',
  '430': 'Liberia',
  '434': 'Libya',
  '440': 'Lithuania',
  '442': 'Luxembourg',
  '450': 'Madagascar',
  '454': 'Malawi',
  '458': 'Malaysia',
  '466': 'Mali',
  '478': 'Mauritania',
  '484': 'Mexico',
  '496': 'Mongolia',
  '498': 'Moldova',
  '499': 'Montenegro',
  '504': 'Morocco',
  '508': 'Mozambique',
  '512': 'Oman',
  '516': 'Namibia',
  '524': 'Nepal',
  '528': 'Netherlands',
  '540': 'New Caledonia',
  '548': 'Vanuatu',
  '554': 'New Zealand',
  '558': 'Nicaragua',
  '562': 'Niger',
  '566': 'Nigeria',
  '578': 'Norway',
  '586': 'Pakistan',
  '591': 'Panama',
  '598': 'Papua New Guinea',
  '600': 'Paraguay',
  '604': 'Peru',
  '608': 'Philippines',
  '616': 'Poland',
  '620': 'Portugal',
  '624': 'Guinea-Bissau',
  '626': 'Timor-Leste',
  '630': 'Puerto Rico',
  '634': 'Qatar',
  '642': 'Romania',
  '643': 'Russia',
  '646': 'Rwanda',
  '682': 'Saudi Arabia',
  '686': 'Senegal',
  '688': 'Serbia',
  '694': 'Sierra Leone',
  '703': 'Slovakia',
  '704': 'Vietnam',
  '705': 'Slovenia',
  '706': 'Somalia',
  '710': 'South Africa',
  '716': 'Zimbabwe',
  '724': 'Spain',
  '728': 'South Sudan',
  '729': 'Sudan',
  '732': 'Western Sahara',
  '740': 'Suriname',
  '748': 'Eswatini',
  '752': 'Sweden',
  '756': 'Switzerland',
  '760': 'Syria',
  '762': 'Tajikistan',
  '764': 'Thailand',
  '768': 'Togo',
  '780': 'Trinidad and Tobago',
  '784': 'United Arab Emirates',
  '788': 'Tunisia',
  '792': 'Turkey',
  '795': 'Turkmenistan',
  '800': 'Uganda',
  '804': 'Ukraine',
  '807': 'North Macedonia',
  '818': 'Egypt',
  '826': 'United Kingdom',
  '826-SCO': 'Scotland',
  '834': 'Tanzania',
  '840': 'United States of America',
  '854': 'Burkina Faso',
  '858': 'Uruguay',
  '860': 'Uzbekistan',
  '862': 'Venezuela',
  '887': 'Yemen',
  '894': 'Zambia',
  // Reserved entries (not in 110m but used as faction anchors)
  '531': 'Curacao',
};

export function getCountryName(numericId: string): string {
  return COUNTRY_NAMES[numericId] ?? `Unknown (${numericId})`;
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/** Total number of regions supported by the contract */
export const TOTAL_REGIONS = 200;

/** Number of mapped countries from the 110m dataset */
export const MAPPED_COUNTRY_COUNT = ALL_COUNTRY_IDS.length;

/** Check whether a regionId is a valid mapped country */
export function isValidRegion(regionId: number): boolean {
  return regionId >= 0 && regionId < TOTAL_REGIONS;
}

/** Get the faction that anchors a given region, or undefined */
export function getFactionForRegion(
  regionId: number,
): number | undefined {
  for (const [factionId, rId] of Object.entries(factionAnchorRegions)) {
    if (rId === regionId) return Number(factionId);
  }
  return undefined;
}
