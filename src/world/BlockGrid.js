import * as THREE from 'three';
import { BLOCK_TYPES } from '../config/gameConfig.js';
import { Block } from './Block.js';

function weightedBlockType() {
  const entries = Object.values(BLOCK_TYPES).filter((entry) => entry.weight > 0);
  const roll = Math.random();
  let total = 0;
  for (const entry of entries) {
    total += entry.weight;
    if (roll <= total) {
      return entry;
    }
  }
  return entries[entries.length - 1];
}

export class BlockGrid {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.blocks = [];
    this.blockMap = new Map();
    this.walkableMap = new Map();
    this.revealedWalkable = new Set();
    this.layout = null;
  }

  buildLayout() {
    const { width, depth, stagingSize, shaftLength } = this.config;
    const cells = Array.from({ length: depth }, () => Array.from({ length: width }, () => ({ kind: 'mineable' })));

    for (let z = 0; z < depth; z += 1) {
      for (let x = 0; x < width; x += 1) {
        if (x === 0 || z === 0 || x === width - 1 || z === depth - 1) {
          cells[z][x] = { kind: 'bedrock' };
        }
      }
    }

    const stagingStartX = 2;
    const stagingEndX = stagingStartX + stagingSize - 1;
    const centerZ = Math.floor(depth / 2);
    const stagingStartZ = centerZ - Math.floor(stagingSize / 2);
    const stagingEndZ = stagingStartZ + stagingSize - 1;

    for (let z = stagingStartZ; z <= stagingEndZ; z += 1) {
      for (let x = stagingStartX; x <= stagingEndX; x += 1) {
        cells[z][x] = { kind: 'staging' };
      }
    }

    for (let z = stagingStartZ - 1; z <= stagingEndZ + 1; z += 1) {
      for (let x = stagingStartX - 1; x <= stagingEndX + 1; x += 1) {
        if (z <= 0 || z >= depth - 1 || x <= 0 || x >= width - 1) {
          continue;
        }
        if (z >= stagingStartZ && z <= stagingEndZ && x >= stagingStartX && x <= stagingEndX) {
          continue;
        }
        cells[z][x] = { kind: 'bedrock' };
      }
    }

    const shaftStartX = stagingEndX + 1;
    const shaftEndX = shaftStartX + shaftLength - 1;
    const shaftMinZ = centerZ - 1;
    const shaftMaxZ = centerZ + 1;

    for (let x = shaftStartX; x <= shaftEndX; x += 1) {
      for (let z = shaftMinZ; z <= shaftMaxZ; z += 1) {
        cells[z][x] = { kind: 'empty' };
      }

      if (centerZ - 2 > 0) {
        cells[centerZ - 2][x] = { kind: 'bedrock' };
      }

      if (centerZ + 2 < depth - 1) {
        cells[centerZ + 2][x] = { kind: 'bedrock' };
      }
    }

    const digFrontX = shaftEndX + 1;
    const digLine = [centerZ - 1, centerZ, centerZ + 1];
    for (const z of digLine) {
      if (z > 0 && z < depth - 1) {
        cells[z][digFrontX] = { kind: 'mineable' };
      }
    }

    const dropoff = {
      startX: stagingStartX,
      endX: stagingStartX + 1,
      startZ: stagingStartZ,
      endZ: stagingStartZ + 1,
    };

    const barracks = {
      startX: stagingStartX,
      endX: stagingStartX,
      startZ: stagingEndZ - 1,
      endZ: stagingEndZ,
    };

    return {
      cells,
      centerZ,
      staging: {
        startX: stagingStartX,
        endX: stagingEndX,
        startZ: stagingStartZ,
        endZ: stagingEndZ,
      },
      shaft: {
        startX: shaftStartX,
        endX: shaftEndX,
        z: centerZ,
      },
      dropoff,
      barracks,
    };
  }

  generateLayer() {
    const { width, depth, blockSize } = this.config;
    const offsetX = (width - 1) / 2;
    const offsetZ = (depth - 1) / 2;

    this.layout = this.buildLayout();

    for (let z = 0; z < depth; z += 1) {
      for (let x = 0; x < width; x += 1) {
        const cell = this.layout.cells[z][x];
        const id = this.getId(x, z);

        if (cell.kind === 'empty' || cell.kind === 'staging') {
          this.walkableMap.set(id, true);
          this.revealedWalkable.add(id);
          continue;
        }

        const type = cell.kind === 'bedrock' ? BLOCK_TYPES.BEDROCK : weightedBlockType();

        const position = new THREE.Vector3(
          (x - offsetX) * blockSize,
          blockSize * 0.5,
          (z - offsetZ) * blockSize,
        );

        const block = new Block({
          id,
          type,
          position,
          size: blockSize * 0.95,
          gridX: x,
          gridZ: z,
        });

        this.blocks.push(block);
        this.blockMap.set(id, block);
        this.scene.add(block.mesh);
      }
    }

    this.updateVisibility();
  }

  getId(x, z) {
    return `${x}:${z}`;
  }

  isInside(x, z) {
    return x >= 0 && z >= 0 && x < this.config.width && z < this.config.depth;
  }

  getBlockAt(x, z) {
    return this.blockMap.get(this.getId(x, z)) ?? null;
  }

  isWalkable(x, z) {
    const id = this.getId(x, z);
    if (this.walkableMap.get(id)) {
      return true;
    }

    const block = this.blockMap.get(id);
    return Boolean(block?.isMined);
  }

  getNeighbors(x, z) {
    const steps = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    return steps
      .map(([dx, dz]) => ({ x: x + dx, z: z + dz }))
      .filter((next) => this.isInside(next.x, next.z));
  }

  getAllMeshes() {
    return this.blocks.map((block) => block.mesh);
  }

  getMarkedBlocks() {
    return this.blocks.filter((block) => block.isMarkedForMining && !block.isMined && block.isMineable);
  }

  hasPendingMining() {
    return this.getMarkedBlocks().length > 0;
  }

  worldToCell(position) {
    const { width, depth, blockSize } = this.config;
    const offsetX = (width - 1) / 2;
    const offsetZ = (depth - 1) / 2;

    return {
      x: Math.round(position.x / blockSize + offsetX),
      z: Math.round(position.z / blockSize + offsetZ),
    };
  }

  cellToWorld(x, z, y = 0.6) {
    const { width, depth, blockSize } = this.config;
    const offsetX = (width - 1) / 2;
    const offsetZ = (depth - 1) / 2;
    return new THREE.Vector3((x - offsetX) * blockSize, y, (z - offsetZ) * blockSize);
  }

  revealWalkableCell(x, z) {
    const id = this.getId(x, z);
    if (!this.isWalkable(x, z) || this.revealedWalkable.has(id)) {
      return;
    }

    this.revealedWalkable.add(id);
    this.updateVisibility();
  }

  updateVisibility() {
    for (const block of this.blocks) {
      if (block.isMined || !block.isMineable) {
        block.setRevealed(true);
        continue;
      }

      const shouldReveal = this.getNeighbors(block.gridX, block.gridZ).some((neighbor) => {
        const neighborId = this.getId(neighbor.x, neighbor.z);
        return this.revealedWalkable.has(neighborId);
      });

      block.setRevealed(shouldReveal);
    }
  }
}
