import { Miner } from './Miner.js';

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

function key(cell) {
  return `${cell.x}:${cell.z}`;
}

export class MinerManager {
  constructor(scene, blockGrid, minerConfig) {
    this.scene = scene;
    this.blockGrid = blockGrid;
    this.minerConfig = minerConfig;
    this.miners = [];
  }

  createMiners() {
    const { startX, endX, startZ, endZ } = this.blockGrid.layout.staging;
    const spawnCells = [];

    for (let z = startZ; z <= endZ; z += 1) {
      for (let x = startX; x <= endX; x += 1) {
        spawnCells.push({ x, z });
      }
    }

    for (let i = 0; i < this.minerConfig.count; i += 1) {
      const spawnCell = spawnCells[i % spawnCells.length];
      const spawn = this.blockGrid.cellToWorld(spawnCell.x, spawnCell.z, 0.6);

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

      miner.onBlockMined = (block) => {
        this.blockGrid.revealWalkableCell(block.gridX, block.gridZ);
      };

      this.miners.push(miner);
      this.scene.add(miner.mesh);
    }
  }

  findPath(start, goal) {
    const open = [start];
    const cameFrom = new Map();
    const gScore = new Map([[key(start), 0]]);
    const fScore = new Map([[key(start), heuristic(start, goal)]]);

    while (open.length > 0) {
      open.sort((a, b) => (fScore.get(key(a)) ?? Infinity) - (fScore.get(key(b)) ?? Infinity));
      const current = open.shift();
      if (!current) {
        break;
      }

      if (current.x === goal.x && current.z === goal.z) {
        const path = [current];
        let currentKey = key(current);
        while (cameFrom.has(currentKey)) {
          const prev = cameFrom.get(currentKey);
          path.unshift(prev);
          currentKey = key(prev);
        }
        return path;
      }

      for (const neighbor of this.blockGrid.getNeighbors(current.x, current.z)) {
        if (!this.blockGrid.isWalkable(neighbor.x, neighbor.z)) {
          continue;
        }

        const neighborKey = key(neighbor);
        const tentative = (gScore.get(key(current)) ?? Infinity) + 1;
        if (tentative >= (gScore.get(neighborKey) ?? Infinity)) {
          continue;
        }

        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentative);
        fScore.set(neighborKey, tentative + heuristic(neighbor, goal));

        if (!open.some((candidate) => candidate.x === neighbor.x && candidate.z === neighbor.z)) {
          open.push(neighbor);
        }
      }
    }

    return null;
  }

  findPathToBlock(miner, block) {
    const start = this.blockGrid.worldToCell(miner.mesh.position);
    const adjacentTargets = this.blockGrid
      .getNeighbors(block.gridX, block.gridZ)
      .filter((neighbor) => this.blockGrid.isWalkable(neighbor.x, neighbor.z));

    let bestPath = null;
    for (const adjacent of adjacentTargets) {
      const path = this.findPath(start, adjacent);
      if (!path) {
        continue;
      }
      if (!bestPath || path.length < bestPath.length) {
        bestPath = path;
      }
    }

    if (!bestPath) {
      return null;
    }

    return bestPath.slice(1).map((cell) => this.blockGrid.cellToWorld(cell.x, cell.z, miner.mesh.position.y));
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
      const alreadyAssigned = this.miners.some((miner) => miner.targetBlock === block);
      if (alreadyAssigned) {
        continue;
      }

      const idleMiners = this.getIdleMiners();
      if (idleMiners.length === 0) {
        return;
      }

      let chosenMiner = null;
      let chosenPath = null;
      for (const miner of idleMiners) {
        const path = this.findPathToBlock(miner, block);
        if (!path) {
          continue;
        }

        if (!chosenPath || path.length < chosenPath.length) {
          chosenMiner = miner;
          chosenPath = path;
        }
      }

      if (chosenMiner && chosenPath) {
        chosenMiner.assignBlock(block, chosenPath);
      }
    }
  }

  getAllMeshes() {
    return this.miners.map((miner) => miner.mesh);
  }
}
