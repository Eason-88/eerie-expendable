/**
 * Manual / QA checklist for Act A horror (also covered by automated tests).
 *
 * Automated: npm test  (in client/web-preview)
 *
 * In-game quick verify (after fix):
 * 1. Open http://127.0.0.1:5173
 * 2. Look for pink beacon west (train) and yellow beacon east (ritual)
 * 3. Walk into pink beacon → pig appears ON train roof (~8s), red eyes
 * 4. Walk into yellow beacon → 4 scarecrows appear (~6s) then vanish
 * 5. Objective updates to push north after both
 */
export const HORROR_MANUAL_CASES = [
  {
    id: "H-01",
    title: "列车异象可触发",
    steps: "从出生点向西走到粉色信标附近",
    expect: "HUD 提示 + 列车顶猪头怪可见 ≥ 数秒",
  },
  {
    id: "H-02",
    title: "仪式异象可触发",
    steps: "从出生点向东走到黄色信标附近",
    expect: "HUD 提示 + 稻草人可见 ≥ 数秒后消失",
  },
  {
    id: "H-03",
    title: "双异象后解锁北进引导",
    steps: "完成 H-01 与 H-02",
    expect: "目标变为向北深入",
  },
];
