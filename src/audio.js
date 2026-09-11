export function createAudio() {
  let ctx = null

  function ensure() {
    if (ctx) return
    ctx = new AudioContext()
  }

  function beep(freq, dur, type, gainVal, slide) {
    ensure()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, ctx.currentTime)
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, ctx.currentTime + dur)
    g.gain.setValueAtTime(gainVal, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + dur)
  }

  return {
    resume() {
      ensure()
      ctx.resume()
    },
    jump() {
      beep(420, 0.16, 'square', 0.07, 720)
    },
    slide() {
      beep(220, 0.12, 'sawtooth', 0.05, 90)
    },
    coin() {
      beep(880, 0.09, 'square', 0.06, 1400)
    },
    crash() {
      beep(160, 0.4, 'sawtooth', 0.12, 40)
    },
    whoosh() {
      beep(180, 0.1, 'triangle', 0.04, 320)
    },
  }
}
