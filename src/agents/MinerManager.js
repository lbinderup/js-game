import * as THREE from 'three';
import { Miner } from './Miner.js';

export class MinerManager {
  constructor(scene, gridConfig, minerConfig) {
    this.scene = scene;
    this.gridConfig = gridConfig;
    this.minerConfig = minerConfig;
    this.miners = [];
  }

  createMiners() {
    const baseX = -(this.gridConfig.width * this.gridConfig.blockSize) / 2;
    for (let i = 0; i < this.minerConfig.count; i += 1) {
      const spawn = new THREE.Vector3(baseX - 1.5, 0.6, i * 1.4 - 1.5);
      const miner = new Miner({
        id: i,
        spawnPosition: spawn,
        baseStrength: this.minerConfig.baseStrength,
        baseSpeed: this.minerConfig.baseSpeed,
        levelThresholds: {
          hitsPerLevel: this.minerConfig.hitsPerLevel,
          minedBlocksPerLevel: this.minerConfig.minedBlocksPerLevel,
        },
      });

      this.miners.push(miner);
      this.scene.add(miner.mesh);
    }
  }

  update(deltaSeconds) {
    for (const miner of this.miners) {
      miner.update(deltaSeconds);
    }
  }

  getIdleMiners() {
    return this.miners.filter((miner) => miner.isIdle());
  }

  assignBlocks(blocks) {
    for (const block of blocks) {
      const idleMiner = this.getIdleMiners()[0];
      if (!idleMiner) {
        return;
      }

      const alreadyAssigned = this.miners.some((miner) => miner.targetBlock === block);
      if (!alreadyAssigned) {
        idleMiner.assignBlock(block);
      }
    }
  }

  getAllMeshes() {
    return this.miners.map((miner) => miner.mesh);
  }
}
