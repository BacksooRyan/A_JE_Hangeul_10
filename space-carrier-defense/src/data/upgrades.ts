export interface UpgradeCard {
  id: string;
  title: string;
  desc: string;
  category: 'weapons' | 'defense' | 'flight' | 'salvage' | 'tactical';
}

export const ALL_UPGRADES: UpgradeCard[] = [
  { id: 'turret_rate',    title: 'Rapid Turrets',       desc: 'Carrier turret fire rate +30%',     category: 'weapons'  },
  { id: 'turret_dmg',     title: 'Heavy Rounds',         desc: 'Carrier turret damage +25%',        category: 'weapons'  },
  { id: 'turret_range',   title: 'Extended Range',       desc: 'All weapon range +20%',             category: 'weapons'  },
  { id: 'fighter_add',    title: 'Scramble Fighter',     desc: 'Launch 1 additional Fighter',       category: 'flight'   },
  { id: 'fighter_dmg',    title: 'Ace Pilots',           desc: 'Fighter damage +25%',               category: 'flight'   },
  { id: 'fighter_speed',  title: 'Afterburner',          desc: 'Fighter speed +20%',                category: 'flight'   },
  { id: 'hull_repair',    title: 'Emergency Repair',     desc: 'Restore 20 Hull',                   category: 'defense'  },
  { id: 'hull_max',       title: 'Reinforced Hull',      desc: 'Max Hull +20',                      category: 'defense'  },
  { id: 'salvage_speed',  title: 'Efficient Recovery',   desc: 'Salvage Ship speed +30%',           category: 'salvage'  },
  { id: 'salvage_add',    title: 'Deploy Salvage Ship',  desc: 'Launch 1 additional Salvage Ship',  category: 'salvage'  },
  { id: 'salvage_yield',  title: 'Deep Salvage',         desc: 'Salvage yield per debris +50%',     category: 'salvage'  },
  { id: 'carrier_speed',  title: 'Thruster Boost',       desc: 'Carrier move speed +15%',           category: 'tactical' },
];

export function pick3Upgrades(exclude: string[]): UpgradeCard[] {
  const pool = ALL_UPGRADES.filter(u => !exclude.includes(u.id));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}
