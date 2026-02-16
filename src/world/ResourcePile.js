import * as THREE from 'three';

export class ResourcePile {
  constructor({ id, position, drop }) {
    this.id = id;
    this.resource = drop.resource;
    this.label = drop.label;
    this.amount = drop.amount;
    this.cell = { x: position.x, z: position.z };
    this.isClaimed = false;
    this.isCollected = false;

    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 0.2, 7),
      new THREE.MeshStandardMaterial({ color: 0xf5deb3 }),
    );
    mesh.position.copy(position.world);
    mesh.position.y = 0.12;
    mesh.userData.entityType = 'resourcePile';
    mesh.userData.entityRef = this;
    this.mesh = mesh;
  }

  claim() {
    if (this.isClaimed || this.isCollected) {
      return false;
    }
    this.isClaimed = true;
    return true;
  }

  release() {
    this.isClaimed = false;
  }

  collect() {
    this.isCollected = true;
    this.isClaimed = false;
    this.mesh.visible = false;
  }
}
