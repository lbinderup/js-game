import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { BlockGrid } from '../world/BlockGrid.js';
import { MinerManager } from '../agents/MinerManager.js';
import { PointerSelector } from '../systems/PointerSelector.js';
import { MiningPlanner } from '../systems/MiningPlanner.js';
import { UIController } from '../ui/UIController.js';
import { ResourcePile } from '../world/ResourcePile.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101418);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 13, 13);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.setupLighting();
    this.setupGroundPlane();
    this.resourcePiles = [];
    this.resources = {
      goldOre: GAME_CONFIG.economy.startingGoldOre,
      ironOre: 0,
      rock: 0,
    };
    this.hiredMinerCount = 0;
    this.buildings = [];

    this.blockGrid = new BlockGrid(this.scene, GAME_CONFIG.grid);
    this.blockGrid.generateLayer();
    this.setupStagingArea();
    this.setupStagingBuildings();

    const dropoffCell = {
      x: this.blockGrid.layout.dropoff.startX,
      z: this.blockGrid.layout.dropoff.startZ,
    };

    this.minerManager = new MinerManager(this.scene, this.blockGrid, GAME_CONFIG.miners, {
      dropoffCell,
      onBlockMined: (block) => this.handleBlockMined(block),
      onResourceDelivered: (pile) => this.handleResourceDelivered(pile),
      onMinerLevelUp: () => this.ui.showFloatingText('Level Up!', '#7bed9f'),
    });
    this.minerManager.createMiners();

    this.pointerSelector = new PointerSelector(this.camera, this.canvas);
    this.miningPlanner = new MiningPlanner(this.blockGrid, this.minerManager, GAME_CONFIG.grid.mineMarkColor);
    this.ui = new UIController({
      miners: this.minerManager.miners,
      hudRoot: document.getElementById('hud-stats'),
    });
    this.ui.setResources(this.resources);
    this.ui.updateHireCost(this.getHireCost(), this.resources.goldOre);

    this.installInputHandlers();
    window.addEventListener('resize', () => this.handleResize());
  }

  setupLighting() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(7, 12, 9);
    this.scene.add(sun);
  }

  setupGroundPlane() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.9 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.scene.add(ground);
  }

  setupStagingArea() {
    const { startX, endX, startZ, endZ } = this.blockGrid.layout.staging;
    const centerX = (startX + endX) / 2;
    const centerZ = (startZ + endZ) / 2;
    const width = endX - startX + 1;
    const depth = endZ - startZ + 1;
    const center = this.blockGrid.cellToWorld(centerX, centerZ, 0.02);

    const staging = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.8 }),
    );

    staging.rotation.x = -Math.PI / 2;
    staging.position.copy(center);
    this.scene.add(staging);
  }

  installInputHandlers() {
    this.canvas.addEventListener('pointerdown', (event) => {
      const entity = this.pointerSelector.pick(event.clientX, event.clientY, [
        ...this.blockGrid.getAllMeshes(),
        ...this.minerManager.getAllMeshes(),
        ...this.getResourcePileMeshes(),
        ...this.buildings.map((b) => b.mesh),
      ]);

      if (!entity) {
        this.ui.clearSelection();
        return;
      }

      if (entity.mesh?.userData?.entityType === 'miner' || entity.name?.startsWith('Miner')) {
        this.ui.selectMiner(entity);
        return;
      }

      const entityType = entity.mesh?.userData?.entityType;
      if (entityType === 'building') {
        this.handleBuildingClick(entity.mesh.userData.entityRef);
        return;
      }

      if (entity.mesh?.userData?.entityType === 'block' || entity.type) {
        this.miningPlanner.beginSelection();
        this.miningPlanner.tryMarkBlock(entity);
      }
    });

    this.canvas.addEventListener('pointermove', (event) => {
      if (!this.miningPlanner.dragSelecting) {
        return;
      }
      const block = this.pointerSelector.pick(event.clientX, event.clientY, this.blockGrid.getAllMeshes());
      this.miningPlanner.tryMarkBlock(block);
    });

    window.addEventListener('pointerup', () => {
      this.miningPlanner.endSelection();
    });
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start() {
    const tick = () => {
      const delta = this.clock.getDelta();
      this.miningPlanner.update(this.resourcePiles);
      this.minerManager.update(delta);
      this.ui.renderHud();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(tick);
    };

    tick();
  }

  setupStagingBuildings() {
    const dropoff = this.blockGrid.layout.dropoff;
    const barracks = this.blockGrid.layout.barracks;

    const dropoffCenter = this.blockGrid.cellToWorld((dropoff.startX + dropoff.endX) / 2, (dropoff.startZ + dropoff.endZ) / 2, 0.2);
    const dropoffMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.35, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x1abc9c }),
    );
    dropoffMesh.position.copy(dropoffCenter);
    dropoffMesh.userData.entityType = 'building';
    dropoffMesh.userData.entityRef = { kind: 'dropoff', name: 'Staging Depot', mesh: dropoffMesh };
    this.scene.add(dropoffMesh);

    const barracksCenter = this.blockGrid.cellToWorld((barracks.startX + barracks.endX) / 2, (barracks.startZ + barracks.endZ) / 2, 0.35);
    const barracksMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.7, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xe67e22 }),
    );
    barracksMesh.position.copy(barracksCenter);
    barracksMesh.userData.entityType = 'building';
    barracksMesh.userData.entityRef = { kind: 'barracks', name: 'Worker Barracks', mesh: barracksMesh };
    this.scene.add(barracksMesh);

    this.buildings.push(
      { kind: 'dropoff', mesh: dropoffMesh },
      { kind: 'barracks', mesh: barracksMesh },
    );
  }

  handleBlockMined(block) {
    const drop = block.getDrop();
    if (!drop) {
      return;
    }

    const cell = { x: block.gridX, z: block.gridZ };
    const pile = new ResourcePile({
      id: `${drop.resource}:${Date.now()}:${Math.random()}`,
      position: { x: cell.x, z: cell.z, world: this.blockGrid.cellToWorld(cell.x, cell.z, 0.15) },
      drop,
    });
    this.resourcePiles.push(pile);
    this.scene.add(pile.mesh);
  }

  handleResourceDelivered(pile) {
    this.resources[pile.resource] = (this.resources[pile.resource] ?? 0) + pile.amount;
    this.ui.setResources(this.resources);
    this.ui.showFloatingText(`+${pile.amount} ${pile.label}`, '#f1c40f');
    this.ui.updateHireCost(this.getHireCost(), this.resources.goldOre);
    this.resourcePiles = this.resourcePiles.filter((entry) => !entry.isCollected);
  }

  getResourcePileMeshes() {
    return this.resourcePiles.filter((pile) => !pile.isCollected).map((pile) => pile.mesh);
  }

  getHireCost() {
    return GAME_CONFIG.economy.hireCostBase + (this.hiredMinerCount * GAME_CONFIG.economy.hireCostStep);
  }

  handleBuildingClick(building) {
    if (building.kind !== 'barracks') {
      return;
    }

    this.ui.openBarracks(
      this.getHireCost(),
      this.resources.goldOre,
      () => this.tryHireWorker(),
    );
  }

  tryHireWorker() {
    const cost = this.getHireCost();
    if (this.resources.goldOre < cost) {
      this.ui.showFloatingText('Not enough Gold Ore', '#ff7675');
      return;
    }

    this.resources.goldOre -= cost;
    this.hiredMinerCount += 1;
    this.minerManager.addMiner();
    this.ui.setResources(this.resources);
    this.ui.updateHireCost(this.getHireCost(), this.resources.goldOre);
    this.ui.showFloatingText('Worker hired!', '#74b9ff');
  }
}
