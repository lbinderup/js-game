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

  update() {
    const markedBlocks = this.blockGrid.getMarkedBlocks();
    this.minerManager.assignBlocks(markedBlocks);
  }
}
