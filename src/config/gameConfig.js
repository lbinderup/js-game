export const GAME_CONFIG = {
  grid: {
    width: 36,
    depth: 28,
    blockSize: 1,
    mineMarkColor: 0xf39c12,
    stagingSize: 6,
    shaftLength: 8,
  },
  miners: {
    count: 3,
    baseStrength: 1,
    baseSpeed: 2,
    hitsPerLevel: 12,
    minedBlocksPerLevel: 4,
  },
  economy: {
    startingGoldOre: 20,
    hireCostBase: 10,
    hireCostStep: 5,
  },
};

export const BLOCK_TYPES = {
  BEDROCK: {
    name: 'Bedrock', color: 0x2f3640, maxHealth: Number.POSITIVE_INFINITY, weight: 0, mineable: false,
    drop: null,
  },
  DIRT: {
    name: 'Dirt', color: 0x8e5a2a, maxHealth: 3, weight: 0.45, drop: null,
  },
  STONE: {
    name: 'Stone', color: 0x7f8c8d, maxHealth: 6, weight: 0.35, drop: { resource: 'rock', label: 'Rock', amount: 1 },
  },
  IRON: {
    name: 'Iron', color: 0x95a5a6, maxHealth: 10, weight: 0.15, drop: { resource: 'ironOre', label: 'Iron Ore', amount: 2 },
  },
  GOLD: {
    name: 'Gold', color: 0xf1c40f, maxHealth: 14, weight: 0.05, drop: { resource: 'goldOre', label: 'Gold Ore', amount: 3 },
  },
};
