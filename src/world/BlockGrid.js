import * as THREE from 'three';
import { BLOCK_TYPES } from '../config/gameConfig.js';
import { Block } from './Block.js';

function weightedBlockType() {
  const entries = Object.values(BLOCK_TYPES);
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
  }

  generateLayer() {
    const { width, depth, blockSize } = this.config;
    const offsetX = (width - 1) / 2;
    const offsetZ = (depth - 1) / 2;

    for (let z = 0; z < depth; z += 1) {
      for (let x = 0; x < width; x += 1) {
        const type = weightedBlockType();
        const id = `${x}:${z}`;
        const position = new THREE.Vector3(
          (x - offsetX) * blockSize,
          blockSize * 0.5,
          (z - offsetZ) * blockSize,
        );

        const block = new Block({ id, type, position, size: blockSize * 0.95 });
        this.blocks.push(block);
        this.blockMap.set(id, block);
        this.scene.add(block.mesh);
      }
    }
  }

  getAllMeshes() {
    return this.blocks.map((block) => block.mesh);
  }

  getMarkedBlocks() {
    return this.blocks.filter((block) => block.isMarkedForMining && !block.isMined);
  }

  hasPendingMining() {
    return this.getMarkedBlocks().length > 0;
  }
}
