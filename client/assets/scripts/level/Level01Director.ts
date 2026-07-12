import { _decorator, Component } from 'cc';
import { LevelPhase, LevelStateMachine } from './LevelStateMachine';
import { RadioReceiver } from '../narrative/RadioReceiver';

const { ccclass, property } = _decorator;

/** Orchestrates Act A → B → C for level 01. */
@ccclass('Level01Director')
export class Level01Director extends Component {
  @property(LevelStateMachine)
  stateMachine: LevelStateMachine | null = null;

  @property(RadioReceiver)
  radio: RadioReceiver | null = null;

  @property
  pigDone = false;

  @property
  ritualDone = false;

  onHorror(id: string) {
    if (id === 'pig') this.pigDone = true;
    if (id === 'ritual') this.ritualDone = true;
    if (this.pigDone && this.ritualDone) {
      this.radio?.push({
        id: 'after_horror',
        speaker: '总部',
        text: '黑鹰7号？传感器出现异常读数。保持前进。',
        duration: 4,
      });
    }
  }

  enterSniper() {
    this.stateMachine?.setPhase(LevelPhase.Sniper);
  }

  enterBetrayal() {
    this.radio?.stopNag();
    this.radio?.push({
      id: 'betrayal',
      speaker: '总部',
      text: '通告全频段：黑鹰7号已叛变。立即执行清理措施。',
      duration: 5,
    });
    this.stateMachine?.setPhase(LevelPhase.Betrayal);
    this.node.emit('spawn-betrayers');
  }

  onBetrayersCleared() {
    this.stateMachine?.notifyWaveCleared();
  }
}
