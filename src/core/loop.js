// =====================================================================
// loop.js — the heartbeat. A fixed-timestep game loop.
//
// We update the game in fixed 1/60-second steps no matter how fast the
// screen refreshes, so the game feels the same on every computer. Rendering
// happens once per animation frame.
//
// `timeScale()` lets us FREEZE the world briefly on a big hit ("hit-stop"),
// which makes hits feel punchy. When it returns 0, we skip updates but keep
// rendering (so screen-shake still shows).
// =====================================================================

/**
 * @param {object} o
 * @param {number} [o.step] seconds per logic update (default 1/60)
 * @param {(dt:number)=>void} o.update
 * @param {(alpha:number)=>void} o.render
 * @param {()=>number} [o.timeScale]
 * @param {(frameMs:number)=>void} [o.onFrame] per-frame hook with the RAW (unclamped) wall-clock
 *   frame time in ms — used by the adaptive perf guard; kept out of the sim so it can't affect it.
 */
export function startLoop({ step = 1 / 60, update, render, timeScale = () => 1, onFrame }) {
  let last = performance.now();
  let acc = 0;

  function frame(now) {
    const frameMs = now - last; // raw, unclamped — the true frame period for FPS measurement
    let dt = frameMs / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25; // clamp after a tab-switch / breakpoint (sim only)
    if (onFrame) onFrame(frameMs);

    acc += dt * timeScale();
    let guard = 0;
    while (acc >= step && guard++ < 5) {
      update(step);
      acc -= step;
    }

    render(acc / step);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
