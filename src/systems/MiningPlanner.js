export class MiningPlanner {
  constructor(blockGrid, minerManager, mineMarkColor) {
    this.blockGrid = blockGrid;
    this.minerManager = minerManager;
    this.mineMarkColor = mineMarkColor;
    this.dragSelecting = false;
  }

  beginSelection() {
    this.dragSelecting = true;
  }

  endSelection() {
    this.dragSelecting = false;
  }

  tryMarkBlock(block) {
    if (!this.dragSelecting || !block || block.isMined) {
      return;
    }

    block.markForMining(this.mineMarkColor);
  }

  update(resourcePiles = []) {
    const markedBlocks = this.blockGrid.getMarkedBlocks();
    this.minerManager.assignBlocks(markedBlocks);

    if (markedBlocks.length === 0) {
      this.minerManager.assignResourcePiles(resourcePiles);
      this.minerManager.assignDropoffsForLoadedMiners(resourcePiles);
    }
  }
}
