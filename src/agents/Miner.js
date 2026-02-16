import * as THREE from 'three';

const IDLE = 'idle';
const WALKING = 'walking';
const MINING = 'mining';
const HAULING = 'hauling';
const RETURNING = 'returning';
const RESTING = 'resting';

export class Miner {
  constructor({ id, spawnPosition, baseStrength, baseSpeed, levelThresholds }) {
    this.id = id;
    this.name = `Miner ${id + 1}`;
    this.level = 1;
    this.unspentLevels = 0;

    this.stats = {
      strength: baseStrength,
      speed: baseSpeed,
      totalHits: 0,
      blocksMined: 0,
    };

    this.levelThresholds = levelThresholds;
    this.state = IDLE;
    this.targetBlock = null;
    this.targetPile = null;
    this.haulDropoffCell = null;
    this.path = [];
    this.pathPurpose = null;
    this.pathIndex = 0;
    this.mineTimer = 0;
    this.onBlockMined = null;
    this.onResourceDelivered = null;
    this.onLevelUp = null;
    this.inventory = {
      goldOre: 0,
      ironOre: 0,
      rock: 0,
    };
    this.inventoryLoad = 0;

    const body = new THREE.CapsuleGeometry(0.25, 0.6, 4, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0x2ecc71 });
    this.mesh = new THREE.Mesh(body, material);
    this.mesh.position.copy(spawnPosition);
    this.mesh.position.y = 0.6;
    this.mesh.userData.entityType = 'miner';
    this.mesh.userData.entityRef = this;

    this.levelIndicator = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14, 0),
      new THREE.MeshStandardMaterial({ color: 0xf1c40f, emissive: 0x8a6d00, emissiveIntensity: 0.6 }),
    );
    this.levelIndicator.position.set(0, 0.95, 0);
    this.levelIndicator.visible = false;
    this.mesh.add(this.levelIndicator);
  }

  isIdle() {
    return this.state === IDLE || this.state === RESTING;
  }

  canAcceptTask() {
    return !this.targetBlock && !this.targetPile;
  }

  getCarryCapacity() {
    return Math.max(1, Math.floor(this.stats.strength));
  }

  assignBlock(block, path) {
    this.targetPile = null;
    this.haulDropoffCell = null;
    this.targetBlock = block;
    this.path = path;
    this.pathPurpose = 'mine';
    this.pathIndex = 0;
    this.state = WALKING;
  }

  assignPile(pile, pathToPile, pathToDropoff, dropoffCell) {
    this.targetBlock = null;
    this.targetPile = pile;
    this.path = pathToPile;
    this.pathPurpose = 'pickup';
    this.dropoffPath = pathToDropoff;
    this.pathIndex = 0;
    this.haulDropoffCell = dropoffCell;
    this.state = WALKING;
  }

  assignDropoff(pathToDropoff) {
    if (!this.canAcceptTask() || this.inventoryLoad <= 0) {
      return;
    }

    this.path = pathToDropoff;
    this.pathPurpose = 'dropoff';
    this.pathIndex = 0;
    this.state = HAULING;
  }

  clearTarget() {
    this.targetBlock = null;
    this.targetPile = null;
    this.haulDropoffCell = null;
    this.path = [];
    this.pathPurpose = null;
    this.dropoffPath = null;
    this.pathIndex = 0;
    this.state = IDLE;
    this.mineTimer = 0;
  }

  update(deltaSeconds) {
    this.levelIndicator.rotation.y += deltaSeconds * 2.4;

    if (this.targetPile) {
      this.updateHauling(deltaSeconds);
      return;
    }

    if (this.pathPurpose === 'dropoff') {
      this.updateDropoff(deltaSeconds);
      return;
    }

    if (this.targetBlock) {
      this.updateMining(deltaSeconds);
      return;
    }

    if (this.pathPurpose === 'returnToBarracks') {
      this.followPath(deltaSeconds, RETURNING);
      return;
    }
  }

  updateMining(deltaSeconds) {
    
    if (!this.targetBlock || this.targetBlock.isMined || !this.targetBlock.isMarkedForMining) {
      this.clearTarget();
      return;
    }

    const targetWaypoint = this.path[this.pathIndex];
    const destination = (targetWaypoint ?? this.targetBlock.mesh.position).clone();
    destination.y = this.mesh.position.y;
    const distance = this.mesh.position.distanceTo(destination);
    const miningDistance = this.mesh.position.distanceTo(this.targetBlock.mesh.position);

    if (targetWaypoint && distance < 0.15) {
      this.pathIndex += 1;
      return;
    }

    if (targetWaypoint && distance > 0.1) {
      this.state = WALKING;
      const direction = destination.sub(this.mesh.position).normalize();
      this.mesh.position.addScaledVector(direction, this.stats.speed * deltaSeconds);
      const lookTarget = targetWaypoint ?? this.targetBlock.mesh.position;
      this.mesh.lookAt(lookTarget.x, this.mesh.position.y, lookTarget.z);
      return;
    }

    if (!targetWaypoint && miningDistance > 0.8) {
      this.state = WALKING;
      const direction = destination.sub(this.mesh.position).normalize();
      this.mesh.position.addScaledVector(direction, this.stats.speed * deltaSeconds);
      this.mesh.lookAt(this.targetBlock.mesh.position.x, this.mesh.position.y, this.targetBlock.mesh.position.z);
      return;
    }

    this.state = MINING;
    this.mineTimer += deltaSeconds;

    if (this.mineTimer >= 0.7) {
      this.mineTimer = 0;
      this.hitTarget();
    }
  }

  updateHauling(deltaSeconds) {
    if (!this.targetPile) {
      this.clearTarget();
      return;
    }

    if (this.pathPurpose === 'pickup' && this.targetPile.isCollected) {
      this.clearTarget();
      return;
    }

    if (this.pathPurpose === 'pickup') {
      const reachedPickup = this.followPath(deltaSeconds, HAULING);
      if (!reachedPickup) {
        return;
      }

      const freeCapacity = this.getCarryCapacity() - this.inventoryLoad;
      const amountTaken = this.targetPile.takeAmount(freeCapacity);
      if (amountTaken > 0) {
        this.inventory[this.targetPile.resource] += amountTaken;
        this.inventoryLoad += amountTaken;
      }

      this.targetPile = null;
      if (this.inventoryLoad >= this.getCarryCapacity()) {
        this.path = this.dropoffPath ?? [];
        this.pathPurpose = 'dropoff';
        this.pathIndex = 0;
      } else {
        this.path = [];
        this.pathPurpose = null;
        this.pathIndex = 0;
        this.state = IDLE;
      }
      return;
    }
  }

  updateDropoff(deltaSeconds) {
    const reachedDropoff = this.followPath(deltaSeconds, HAULING);
    if (!reachedDropoff) {
      return;
    }

    if (this.inventoryLoad > 0 && this.onResourceDelivered) {
      this.onResourceDelivered(this, { ...this.inventory });
    }
    this.inventory = { goldOre: 0, ironOre: 0, rock: 0 };
    this.inventoryLoad = 0;
    this.clearTarget();
  }

  followPath(deltaSeconds, moveState) {
    const targetWaypoint = this.path[this.pathIndex];
    if (!targetWaypoint) {
      if (this.pathPurpose === 'returnToBarracks') {
        this.pathPurpose = null;
        this.state = RESTING;
      }
      return true;
    }

    const destination = targetWaypoint.clone();
    destination.y = this.mesh.position.y;
    const distance = this.mesh.position.distanceTo(destination);
    if (distance < 0.1) {
      this.pathIndex += 1;
      return false;
    }

    this.state = moveState;
    const direction = destination.sub(this.mesh.position).normalize();
    this.mesh.position.addScaledVector(direction, this.stats.speed * deltaSeconds);
    this.mesh.lookAt(targetWaypoint.x, this.mesh.position.y, targetWaypoint.z);
    return false;
  }

  assignReturnPath(path) {
    if (!this.canAcceptTask() || path.length === 0 || this.inventoryLoad > 0) {
      return;
    }

    this.path = path;
    this.pathPurpose = 'returnToBarracks';
    this.pathIndex = 0;
    this.state = RETURNING;
  }

  hitTarget() {
    if (!this.targetBlock) {
      return;
    }

    this.stats.totalHits += 1;
    const mined = this.targetBlock.takeDamage(this.stats.strength);
    this.checkLevelProgress();

    if (mined) {
      this.stats.blocksMined += 1;
      this.checkLevelProgress();
      if (this.onBlockMined) {
        this.onBlockMined(this.targetBlock);
      }
      this.clearTarget();
    }
  }

  canLevelUp() {
    return this.unspentLevels > 0;
  }

  checkLevelProgress() {
    const hitsProgress = Math.floor(this.stats.totalHits / this.levelThresholds.hitsPerLevel);
    const minedProgress = Math.floor(this.stats.blocksMined / this.levelThresholds.minedBlocksPerLevel);
    const shouldBeLevel = 1 + Math.min(hitsProgress, minedProgress);

    if (shouldBeLevel > this.level) {
      this.unspentLevels += shouldBeLevel - this.level;
      this.level = shouldBeLevel;
      this.updateLevelIndicator();
      if (this.onLevelUp) {
        this.onLevelUp(this);
      }
    }
  }

  spendLevelPoint() {
    if (!this.canLevelUp()) {
      return false;
    }

    this.stats.strength += 1;
    this.stats.speed += 0.2;
    this.unspentLevels -= 1;
    this.updateLevelIndicator();
    return true;
  }

  updateLevelIndicator() {
    this.levelIndicator.visible = this.unspentLevels > 0;
  }
}

export const MINER_STATES = {
  IDLE,
  WALKING,
  MINING,
  HAULING,
  RETURNING,
  RESTING,
};
