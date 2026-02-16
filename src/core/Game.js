import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { BlockGrid } from '../world/BlockGrid.js';
import { MinerManager } from '../agents/MinerManager.js';
import { PointerSelector } from '../systems/PointerSelector.js';
import { MiningPlanner } from '../systems/MiningPlanner.js';
import { UIController } from '../ui/UIController.js';

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

    this.blockGrid = new BlockGrid(this.scene, GAME_CONFIG.grid);
    this.blockGrid.generateLayer();
    this.setupStagingArea();

    this.minerManager = new MinerManager(this.scene, this.blockGrid, GAME_CONFIG.miners);
    this.minerManager.createMiners();

    this.pointerSelector = new PointerSelector(this.camera, this.canvas);
    this.miningPlanner = new MiningPlanner(this.blockGrid, this.minerManager, GAME_CONFIG.grid.mineMarkColor);
    this.ui = new UIController({
      miners: this.minerManager.miners,
      hudRoot: document.getElementById('hud-stats'),
    });

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
      ]);

      if (!entity) {
        this.ui.clearSelection();
        return;
      }

      if (entity.mesh?.userData?.entityType === 'miner' || entity.name?.startsWith('Miner')) {
        this.ui.selectMiner(entity);
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
      this.miningPlanner.update();
      this.minerManager.update(delta);
      this.ui.renderHud();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(tick);
    };

    tick();
  }
}
