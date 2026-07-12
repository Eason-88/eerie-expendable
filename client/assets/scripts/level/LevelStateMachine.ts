import { _decorator, Component } from 'cc';

const { ccclass, property } = _decorator;

export enum LevelPhase {
  Explore = 'Explore',
  Sniper = 'Sniper',
  Betrayal = 'Betrayal',
  Win = 'Win',
}

@ccclass('LevelStateMachine')
export class LevelStateMachine extends Component {
  @property
  phase: string = LevelPhase.Explore;

  setPhase(next: LevelPhase) {
    if (this.phase === next) {
      return;
    }
    this.phase = next;
    this.node.emit('level-phase', next);
  }

  notifyWaveCleared() {
    this.setPhase(LevelPhase.Win);
  }

  resetToExplore() {
    this.setPhase(LevelPhase.Explore);
  }
}
