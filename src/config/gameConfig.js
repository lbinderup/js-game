export const GAME_CONFIG = {
  grid: {
    width: 14,
    depth: 10,
    blockSize: 1,
    mineMarkColor: 0xf39c12,
  },
  miners: {
    count: 3,
    baseStrength: 1,
    baseSpeed: 2,
    hitsPerLevel: 12,
    minedBlocksPerLevel: 4,
  },
};

export const BLOCK_TYPES = {
  DIRT: { name: 'Dirt', color: 0x8e5a2a, maxHealth: 3, weight: 0.45 },
  STONE: { name: 'Stone', color: 0x7f8c8d, maxHealth: 6, weight: 0.35 },
  IRON: { name: 'Iron', color: 0x95a5a6, maxHealth: 10, weight: 0.15 },
  GOLD: { name: 'Gold', color: 0xf1c40f, maxHealth: 14, weight: 0.05 },
};
