import { _decorator, Component, Color, director } from 'cc';

const { ccclass, property } = _decorator;

/** Soft fog for forest atmosphere (phase 0). */
@ccclass('ForestFogSetup')
export class ForestFogSetup extends Component {
  @property
  fogStart = 8;

  @property
  fogEnd = 45;

  onLoad() {
    const scene = director.getScene();
    const fog = scene?.globals?.fog;
    if (!fog) {
      return;
    }

    fog.enabled = true;
    fog.fogColor = new Color(120, 140, 130, 255);
    fog.fogStart = this.fogStart;
    fog.fogEnd = this.fogEnd;
  }
}
