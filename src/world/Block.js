import * as THREE from 'three';

export class Block {
  constructor({ id, type, position, size }) {
    this.id = id;
    this.type = type;
    this.maxHealth = type.maxHealth;
    this.health = type.maxHealth;
    this.isMarkedForMining = false;
    this.isMined = false;

    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({ color: type.color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.userData.entityType = 'block';
    this.mesh.userData.entityRef = this;
  }

  markForMining(markColor) {
    if (this.isMined) {
      return;
    }
    this.isMarkedForMining = true;
    this.mesh.material.emissive.setHex(markColor);
    this.mesh.material.emissiveIntensity = 0.55;
  }

  clearMiningMark() {
    this.isMarkedForMining = false;
    this.mesh.material.emissive.setHex(0x000000);
    this.mesh.material.emissiveIntensity = 0;
  }

  takeDamage(amount) {
    if (this.isMined) {
      return false;
    }

    this.health -= amount;
    const ratio = Math.max(this.health / this.maxHealth, 0);
    this.mesh.scale.y = Math.max(0.15, ratio);

    if (this.health <= 0) {
      this.mine();
      return true;
    }

    return false;
  }

  mine() {
    this.isMined = true;
    this.isMarkedForMining = false;
    this.mesh.visible = false;
    this.mesh.userData.entityType = 'empty';
  }
}
