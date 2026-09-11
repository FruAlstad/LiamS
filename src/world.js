import * as THREE from 'three'

export const LANES = [-2.4, 0, 2.4]
export const CHUNK = 22

function tex(draw, w = 256, h = 256, srgb = true) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}

function noise(ctx, w, h, a = 0.12) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * a * 255
    d[i] = Math.max(0, Math.min(255, d[i] + n))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n))
  }
  ctx.putImageData(img, 0, 0)
}

function ballastTexture() {
  return tex((ctx, w, h) => {
    ctx.fillStyle = '#4a453e'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 9000; i++) {
      const g = 70 + Math.random() * 70
      ctx.fillStyle = `rgb(${g},${g - 8},${g - 18})`
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3)
    }
    ctx.fillStyle = '#3a342c'
    for (let y = 18; y < h; y += 36) {
      ctx.fillRect(0, y, w, 10)
    }
  }, 512, 512)
}

function concreteTexture() {
  return tex((ctx, w, h) => {
    ctx.fillStyle = '#8b8d86'
    ctx.fillRect(0, 0, w, h)
    noise(ctx, w, h, 0.16)
    ctx.strokeStyle = 'rgba(40,40,36,0.18)'
    ctx.lineWidth = 2
    for (let y = 0; y < h; y += 64) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(50,48,40,0.12)'
    ctx.fillRect(0, h * 0.7, w, h * 0.3)
  }, 512, 512)
}

function facadeMaps(base) {
  const map = tex((ctx, w, h) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, w, h)
    noise(ctx, w, h, 0.08)
    drawWindows(ctx, w, h, false)
  }, 256, 512)
  const emissive = tex((ctx, w, h) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    drawWindows(ctx, w, h, true)
  }, 256, 512)
  return { map, emissive }
}

function drawWindows(ctx, w, h, emissiveOnly) {
  const cols = 5
  const rows = 8
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = ((r * 5 + c * 3) % 7) > 2
      const x = 18 + c * 48
      const y = 16 + r * 62
      if (emissiveOnly) {
        if (!lit) continue
        ctx.fillStyle = '#ffe9a0'
        ctx.fillRect(x, y, 28, 38)
        continue
      }
      ctx.fillStyle = lit ? '#fff4c4' : '#0c1016'
      ctx.fillRect(x, y, 28, 38)
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.strokeRect(x, y, 28, 38)
    }
  }
}

function rustMetal() {
  return tex((ctx, w, h) => {
    ctx.fillStyle = '#6e7378'
    ctx.fillRect(0, 0, w, h)
    noise(ctx, w, h, 0.2)
    ctx.fillStyle = 'rgba(110,70,40,0.2)'
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 20, 8)
    }
  }, 256, 256)
}

const steel = () =>
  new THREE.MeshStandardMaterial({
    color: 0xc5d0da,
    metalness: 0.92,
    roughness: 0.18,
  })

export function createRunnerMesh() {
  const g = new THREE.Group()
  const skin = new THREE.MeshStandardMaterial({ color: 0xe0b089, roughness: 0.65 })
  const jacket = new THREE.MeshStandardMaterial({
    color: 0xff4a1a,
    roughness: 0.48,
    emissive: 0xff2a00,
    emissiveIntensity: 0.35,
  })
  const pants = new THREE.MeshStandardMaterial({ color: 0x1c3d7a, roughness: 0.58 })
  const shoe = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 })
  const hair = new THREE.MeshStandardMaterial({ color: 0x1a120e, roughness: 0.75 })

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.22), pants)
  hips.position.y = 0.78
  hips.castShadow = true
  g.add(hips)

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.48, 6, 12), jacket)
  body.position.y = 1.12
  body.castShadow = true
  g.add(body)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), skin)
  head.position.y = 1.58
  head.scale.set(0.92, 1.05, 0.9)
  head.castShadow = true
  g.add(head)

  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.155, 12, 10, 0, Math.PI * 2, 0, 1.35), hair)
  hairMesh.position.set(0, 1.64, -0.01)
  g.add(hairMesh)

  const leftLeg = new THREE.Group()
  const rightLeg = new THREE.Group()
  leftLeg.position.set(-0.11, 0.72, 0)
  rightLeg.position.set(0.11, 0.72, 0)
  const mkLeg = () => {
    const wrap = new THREE.Group()
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.32, 4, 8), pants)
    thigh.position.y = -0.2
    thigh.castShadow = true
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.24), shoe)
    boot.position.set(0, -0.44, 0.04)
    wrap.add(thigh, boot)
    return wrap
  }
  leftLeg.add(mkLeg())
  rightLeg.add(mkLeg())
  g.add(leftLeg, rightLeg)

  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.34, 4, 8), jacket)
  const rightArm = leftArm.clone()
  leftArm.position.set(-0.32, 1.14, 0)
  rightArm.position.set(0.32, 1.14, 0)
  leftArm.rotation.z = 0.12
  rightArm.rotation.z = -0.12
  g.add(leftArm, rightArm)

  g.userData = { leftLeg, rightLeg, leftArm, rightArm, body }
  return g
}

export function makeBarrier() {
  const g = new THREE.Group()
  const conc = new THREE.MeshStandardMaterial({
    color: 0x9a9b94,
    roughness: 0.82,
    map: concreteTexture(),
  })
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.55, 0.42), conc)
  base.position.y = 0.28
  base.castShadow = true
  g.add(base)
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.45, 0.28), conc)
  top.position.y = 0.72
  top.castShadow = true
  g.add(top)
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(1.87, 0.08, 0.44),
    new THREE.MeshStandardMaterial({ color: 0xb8860b, roughness: 0.5 }),
  )
  stripe.position.y = 0.42
  g.add(stripe)
  g.userData.kind = 'barrier'
  g.userData.h = 1.0
  g.userData.len = 0.55
  return g
}

export function makeSign() {
  const g = new THREE.Group()
  const metal = steel()
  for (const x of [-0.95, 0.95]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.35, 10), metal)
    pole.position.set(x, 1.18, 0)
    pole.castShadow = true
    g.add(pole)
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.08), metal)
  beam.position.y = 2.28
  g.add(beam)
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.42, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x1e3a22, roughness: 0.45, metalness: 0.2 }),
  )
  panel.position.y = 1.62
  g.add(panel)
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.28),
    new THREE.MeshBasicMaterial({ color: 0xffe066 }),
  )
  face.position.set(0, 1.62, 0.05)
  g.add(face)
  g.userData.kind = 'sign'
  g.userData.h = 2.2
  g.userData.len = 0.45
  return g
}

export function makeTrain(color) {
  const g = new THREE.Group()
  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.55,
    roughness: 0.32,
  })
  const dark = new THREE.MeshStandardMaterial({ color: 0x14181e, metalness: 0.4, roughness: 0.45 })
  const glass = new THREE.MeshStandardMaterial({
    color: 0x7a8a9a,
    metalness: 0.7,
    roughness: 0.12,
    transparent: true,
    opacity: 0.72,
  })

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.55, 13.6), bodyMat)
  body.position.y = 1.05
  body.castShadow = true
  g.add(body)

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.12, 13.4), dark)
  roof.position.y = 1.88
  g.add(roof)
  const ac = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 2.4), dark)
  ac.position.set(0, 2.02, 2)
  g.add(ac)

  const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.22, 13.5), dark)
  skirt.position.y = 0.28
  g.add(skirt)

  for (const z of [-5.2, -1.7, 1.7, 5.2]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.15, 1.15), dark)
    door.position.set(1.04, 0.95, z)
    g.add(door)
    const door2 = door.clone()
    door2.position.x = -1.04
    g.add(door2)
  }

  for (let i = -2; i <= 2; i++) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 1.35), glass)
    w.position.set(1.04, 1.38, i * 2.35)
    g.add(w)
    const w2 = w.clone()
    w2.position.x = -1.04
    g.add(w2)
  }

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.15, 0.35), bodyMat)
  nose.position.set(0, 1.05, -7.0)
  g.add(nose)
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.55, 0.06), glass)
  windshield.position.set(0, 1.4, -7.18)
  g.add(windshield)
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6d8 })
  for (const x of [-0.55, 0.55]) {
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), lightMat)
    lamp.position.set(x, 0.72, -7.2)
    lamp.rotation.y = Math.PI
    g.add(lamp)
  }

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.4 })
  for (const z of [-4.8, -3.4, 3.4, 4.8]) {
    for (const x of [-0.72, 0.72]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12), wheelMat)
      wh.rotation.z = Math.PI / 2
      wh.position.set(x, 0.22, z)
      g.add(wh)
    }
  }

  g.userData.kind = 'train'
  g.userData.h = 1.9
  g.userData.len = 14
  g.userData.top = 1.94
  return g
}

export function makeCoin() {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.05, 20),
    new THREE.MeshBasicMaterial({ color: 0xffe566 }),
  )
  mesh.rotation.x = Math.PI / 2
  mesh.userData.kind = 'coin'
  return mesh
}

const TRAIN_COLORS = [0xd7dee6, 0x2a6aa8, 0xc43b3b, 0x2f8f6a]

function addRails(group, gravel) {
  const railMat = steel()
  const tieMat = new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.9 })
  for (const lane of LANES) {
    for (const dx of [-0.72, 0.72]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, CHUNK), railMat)
      rail.position.set(lane + dx, 0.08, 0)
      rail.castShadow = true
      rail.receiveShadow = true
      group.add(rail)
    }
    for (let i = 0; i < 14; i++) {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.22), tieMat)
      tie.position.set(lane, 0.03, -CHUNK / 2 + 1.4 + i * 1.5)
      tie.receiveShadow = true
      group.add(tie)
    }
  }
  group.add(gravel)
}

export class Track {
  constructor(scene) {
    this.scene = scene
    this.obstacles = []
    this.coins = []
    this.segments = []
    this.spawnZ = 30

    this.ballast = new THREE.MeshStandardMaterial({
      map: ballastTexture(),
      roughness: 0.95,
    })
    this.ballast.map.repeat.set(4, 8)
    this.conc = new THREE.MeshStandardMaterial({
      map: concreteTexture(),
      roughness: 0.88,
      color: 0xb0b2aa,
    })
    this.conc.map.repeat.set(1, 2)
    this.corrugated = new THREE.MeshStandardMaterial({
      map: rustMetal(),
      metalness: 0.45,
      roughness: 0.55,
    })
    this.facades = ['#2a3140', '#243038', '#3a2e2a', '#1f2a32'].map((c) => {
      const { map, emissive } = facadeMaps(c)
      return new THREE.MeshStandardMaterial({
        map,
        roughness: 0.76,
        metalness: 0.08,
        emissive: 0xffffff,
        emissiveMap: emissive,
        emissiveIntensity: 2.4,
      })
    })

    for (let i = 0; i < 10; i++) this.segments.push(this._segment(i * CHUNK))
  }

  _segment(z) {
    const g = new THREE.Group()
    g.position.z = z

    const gravel = new THREE.Mesh(new THREE.PlaneGeometry(9.2, CHUNK), this.ballast)
    gravel.rotation.x = -Math.PI / 2
    gravel.receiveShadow = true
    addRails(g, gravel)

    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.4, CHUNK), this.conc)
      wall.position.set(side * 4.7, 1.2, 0)
      wall.receiveShadow = true
      wall.castShadow = true
      g.add(wall)

      const fence = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, CHUNK), this.corrugated)
      fence.position.set(side * 4.95, 3.0, 0)
      g.add(fence)

      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, CHUNK),
        new THREE.MeshBasicMaterial({ color: side > 0 ? 0xff4da6 : 0x4df0ff }),
      )
      led.position.set(side * 4.48, 2.35, 0)
      g.add(led)
    }

    const poleMat = steel()
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5.2, 8), poleMat)
      pole.position.set(side * 4.35, 2.6, 0)
      g.add(pole)
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.06), poleMat)
      arm.position.set(side * 3.6, 5.05, 0)
      g.add(arm)
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xfff1c2 }),
      )
      lamp.position.set(side * 2.95, 4.95, 0)
      g.add(lamp)

      const wire = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.03, CHUNK),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.4 }),
      )
      wire.position.set(side * 1.2, 5.55, 0)
      g.add(wire)
    }

    const asphalt = new THREE.MeshStandardMaterial({ color: 0x2f3236, roughness: 0.92 })
    for (const side of [-1, 1]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(5.5, CHUNK), asphalt)
      road.rotation.x = -Math.PI / 2
      road.position.set(side * 7.2, -0.01, 0)
      road.receiveShadow = true
      g.add(road)
    }

    const h = 11 + Math.abs((z / CHUNK) % 6) * 1.8
    for (const side of [-1, 1]) {
      const idx = Math.abs(Math.round(z / CHUNK) + (side > 0 ? 1 : 2)) % 4
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(5.5, h, CHUNK * 0.92), this.facades[idx])
      bldg.position.set(side * 9.2, h / 2, 0)
      bldg.castShadow = true
      bldg.receiveShadow = true
      g.add(bldg)
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.7, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.7 }),
      )
      roof.position.set(side * 9.2, h + 0.35, -3)
      g.add(roof)

      const neonCol = side > 0 ? 0xff3d7a : 0x3df0ff
      const neon = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 1.25, 5.0),
        new THREE.MeshBasicMaterial({ color: neonCol }),
      )
      neon.position.set(side * 6.42, 5.2 + (idx % 3) * 0.8, 1.5)
      g.add(neon)
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 2.1, 3.8),
        new THREE.MeshBasicMaterial({ color: neonCol }),
      )
      board.position.set(side * 6.55, 7.4, -2)
      g.add(board)
    }

    this.scene.add(g)
    return g
  }

  reset() {
    for (const o of this.obstacles) this.scene.remove(o)
    for (const c of this.coins) this.scene.remove(c)
    this.obstacles.length = 0
    this.coins.length = 0
    this.spawnZ = 30
    this.segments.forEach((s, i) => {
      s.position.z = i * CHUNK
    })
  }

  recycle(playerZ) {
    for (const s of this.segments) {
      if (s.position.z < playerZ - CHUNK * 1.5) s.position.z += CHUNK * this.segments.length
    }
  }

  fillAhead(playerZ, dist) {
    const hard = dist > 400
    while (this.spawnZ < playerZ + 140) {
      this._pattern(this.spawnZ, hard)
      this.spawnZ += 16 + Math.random() * (hard ? 8 : 14)
    }
    this.obstacles = this.obstacles.filter((o) => {
      if (o.position.z < playerZ - 16) {
        this.scene.remove(o)
        return false
      }
      return true
    })
    this.coins = this.coins.filter((c) => {
      if (c.userData.gone || c.position.z < playerZ - 16) {
        this.scene.remove(c)
        return false
      }
      return true
    })
  }

  _add(mesh, lane, z) {
    mesh.position.set(LANES[lane], 0, z)
    this.scene.add(mesh)
    this.obstacles.push(mesh)
  }

  _coins(lane, z, n, gap = 1.6, y = 0.85) {
    for (let i = 0; i < n; i++) {
      const c = makeCoin()
      c.position.set(LANES[lane], y, z + i * gap)
      this.scene.add(c)
      this.coins.push(c)
    }
  }

  _pattern(z, hard) {
    const r = Math.random()
    if (r < 0.18) {
      const lane = (Math.random() * 3) | 0
      this._add(makeBarrier(), lane, z)
      this._coins(lane, z - 3, 4, 1.4, 1.65)
    } else if (r < 0.34) {
      const lane = (Math.random() * 3) | 0
      this._add(makeSign(), lane, z)
      this._coins(lane, z - 2, 3)
    } else if (r < 0.55) {
      const lane = (Math.random() * 3) | 0
      this._add(makeTrain(TRAIN_COLORS[(Math.random() * TRAIN_COLORS.length) | 0]), lane, z + 6)
      const free = [0, 1, 2].filter((l) => l !== lane)
      this._coins(free[(Math.random() * free.length) | 0], z, 5)
    } else if (r < 0.72 && hard) {
      const skip = (Math.random() * 3) | 0
      for (let l = 0; l < 3; l++) {
        if (l !== skip) this._add(makeTrain(TRAIN_COLORS[l % TRAIN_COLORS.length]), l, z + 6)
      }
      this._coins(skip, z, 6)
    } else if (r < 0.84) {
      const a = (Math.random() * 3) | 0
      let b = (Math.random() * 3) | 0
      if (b === a) b = (b + 1) % 3
      this._add(makeBarrier(), a, z)
      this._add(makeSign(), b, z + 8)
    } else {
      const lane = (Math.random() * 3) | 0
      this._coins(lane, z, 7)
    }
  }
}
