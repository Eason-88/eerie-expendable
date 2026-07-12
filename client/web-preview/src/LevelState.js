/** Level state machine: Explore → Sniper → Betrayal → Win */
export const LevelPhase = Object.freeze({
  Explore: "Explore",
  Sniper: "Sniper",
  Betrayal: "Betrayal",
  Win: "Win",
});

export class LevelStateMachine {
  constructor(onChange) {
    this.phase = LevelPhase.Explore;
    this._onChange = onChange;
    this._onChange?.(this.phase);
  }

  set(phase) {
    if (this.phase === phase) {
      return;
    }
    this.phase = phase;
    this._onChange?.(phase);
  }

  notifyWaveCleared() {
    this.set(LevelPhase.Win);
  }

  resetToExplore() {
    this.set(LevelPhase.Explore);
  }
}
