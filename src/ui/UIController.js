export class UIController {
  constructor({ miners, hudRoot }) {
    this.miners = miners;
    this.hudRoot = hudRoot;

    this.inspector = document.getElementById('miner-inspector');
    this.minerName = document.getElementById('miner-name');
    this.minerStatList = document.getElementById('miner-stat-list');
    this.openLevelScreenButton = document.getElementById('open-level-screen');

    this.levelScreen = document.getElementById('level-screen');
    this.levelScreenContent = document.getElementById('level-screen-content');
    this.levelUpButton = document.getElementById('level-up-btn');
    this.closeLevelScreenButton = document.getElementById('close-level-screen');

    this.selectedMiner = null;

    this.openLevelScreenButton.addEventListener('click', () => this.openLevelScreen());
    this.closeLevelScreenButton.addEventListener('click', () => this.closeLevelScreen());
    this.levelUpButton.addEventListener('click', () => this.levelUpSelectedMiner());
  }

  selectMiner(miner) {
    this.selectedMiner = miner;
    this.inspector.classList.remove('hidden');
    this.renderInspector();
    this.closeLevelScreen();
  }

  clearSelection() {
    this.selectedMiner = null;
    this.inspector.classList.add('hidden');
    this.closeLevelScreen();
  }

  openLevelScreen() {
    if (!this.selectedMiner) {
      return;
    }
    this.levelScreen.classList.remove('hidden');
    this.renderLevelScreen();
  }

  closeLevelScreen() {
    this.levelScreen.classList.add('hidden');
  }

  levelUpSelectedMiner() {
    if (!this.selectedMiner) {
      return;
    }

    this.selectedMiner.spendLevelPoint();
    this.renderInspector();
    this.renderLevelScreen();
  }

  renderInspector() {
    if (!this.selectedMiner) {
      return;
    }

    const m = this.selectedMiner;
    this.minerName.textContent = `${m.name} (Lv ${m.level})`;
    this.minerStatList.innerHTML = `
      <li>State: ${m.state}</li>
      <li>Strength: ${m.stats.strength.toFixed(1)}</li>
      <li>Speed: ${m.stats.speed.toFixed(1)}</li>
      <li>Total Hits: ${m.stats.totalHits}</li>
      <li>Blocks Mined: ${m.stats.blocksMined}</li>
      <li>Unspent Level Ups: ${m.unspentLevels}</li>
    `;
  }

  renderLevelScreen() {
    if (!this.selectedMiner) {
      return;
    }

    const m = this.selectedMiner;
    this.levelScreenContent.innerHTML = `
      <p>${m.name} can spend points to increase mining throughput.</p>
      <p>Next upgrade gives +1 Strength and +0.2 Speed.</p>
      <p>Available points: <strong>${m.unspentLevels}</strong></p>
    `;

    this.levelUpButton.disabled = !m.canLevelUp();
  }

  renderHud() {
    const available = this.miners.filter((m) => m.isIdle()).length;
    const leveling = this.miners.filter((m) => m.canLevelUp()).length;

    this.hudRoot.innerHTML = `
      <strong>Miners:</strong> ${this.miners.length}<br />
      <strong>Idle:</strong> ${available}<br />
      <strong>Ready to level:</strong> ${leveling}
    `;

    if (this.selectedMiner) {
      this.renderInspector();
      if (!this.levelScreen.classList.contains('hidden')) {
        this.renderLevelScreen();
      }
    }
  }
}
