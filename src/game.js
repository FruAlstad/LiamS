import * as THREE from 'three'
import { LANES, Track, createRunnerMesh } from './world.js'
import { SHOP_PRICES } from './shop.js'

const WALLET_KEY = 'metro-rush-coins'

function loadWallet() {
  const n = Number(localStorage.getItem(WALLET_KEY))
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function saveWallet(coins) {
  localStorage.setItem(WALLET_KEY, String(Math.max(0, Math.floor(coins))))
}

const POWER_DEFAULTS = () => ({
  fly: 0,
  magnet: 0,
  shield: 0,
  double: 0,
  megaJump: 0,
  canBoardTrains: false,
})

export class Runner {
  constructor(scene) {
    this.scene = scene
    this.track = new Track(scene)
    this.mesh = createRunnerMesh()
    scene.add(this.mesh)

    this.lane = 1
    this.targetLane = 1
    this.x = LANES[1]
    this.y = 0
    this.vy = 0
    this.z = 0
    this.sliding = 0
    this.onTrain = null
    this.speed = 22
    this.distance = 0
    this.coins = loadWallet()
    this.runCoins = 0
    this.dead = false
    this.laneLock = 0
    this.jumpLock = false
    this.slideLock = false
    this.powers = POWER_DEFAULTS()
    this.flyHeight = 2.8
    this.invuln = 5
    this.track.fillAhead(0, 0)
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }),
    )
    this.shadow.rotation.x = -Math.PI / 2
    this.shadow.position.y = 0.04
    scene.add(this.shadow)
    this._animate()
  }

  reset() {
    this.lane = 1
    this.targetLane = 1
    this.x = LANES[1]
    this.y = 0
    this.vy = 0
    this.z = 0
    this.sliding = 0
    this.onTrain = null
    this.speed = 22
    this.distance = 0
    this.coins = loadWallet()
    this.runCoins = 0
    this.dead = false
    this.laneLock = 0
    this.powers = POWER_DEFAULTS()
    this.invuln = 5
    this.track.reset()
    this.track.fillAhead(0, 0)
    this.mesh.rotation.set(0, 0, 0)
    this.mesh.scale.set(1, 1, 1)
    this._animate()
  }

  get score() {
    return Math.floor(this.distance * 4 + this.runCoins * 10)
  }

  saveCoins() {
    saveWallet(this.coins)
  }

  buy(id) {
    const price = SHOP_PRICES[id]
    if (price == null || this.coins < price) return false
    this.coins -= price
    this.saveCoins()

    if (id === 'fly') {
      this.powers.fly = 7
      this.onTrain = null
      this.vy = 0
      this.y = Math.max(this.y, this.flyHeight)
    } else if (id === 'train') {
      this.powers.canBoardTrains = true
    } else if (id === 'magnet') {
      this.powers.magnet = 10
    } else if (id === 'shield') {
      this.powers.shield = 8
    } else if (id === 'double') {
      this.powers.double = 12
    } else if (id === 'megaJump') {
      this.powers.megaJump = 10
    }
    return true
  }

  activePowersLabel() {
    const parts = []
    if (this.powers.fly > 0) parts.push(`Flyg ${this.powers.fly.toFixed(1)}s`)
    if (this.invuln > 0) parts.push(`Startskydd ${this.invuln.toFixed(1)}s`)
    if (this.powers.canBoardTrains) parts.push('Tåg-hopp')
    if (this.powers.magnet > 0) parts.push(`Magnet ${this.powers.magnet.toFixed(1)}s`)
    if (this.powers.shield > 0) parts.push(`Sköld ${this.powers.shield.toFixed(1)}s`)
    if (this.powers.double > 0) parts.push(`2× ${this.powers.double.toFixed(1)}s`)
    if (this.powers.megaJump > 0) parts.push(`Mega ${this.powers.megaJump.toFixed(1)}s`)
    return parts.join(' · ')
  }

  update(dt, input, audio) {
    if (this.dead) return

    for (const key of ['fly', 'magnet', 'shield', 'double', 'megaJump']) {
      if (this.powers[key] > 0) this.powers[key] = Math.max(0, this.powers[key] - dt)
    }
    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt)

    this.speed = Math.min(40, 22 + this.distance * 0.012)
    this.z += this.speed * dt
    this.distance += this.speed * dt
    this.laneLock = Math.max(0, this.laneLock - dt)
    this.sliding = Math.max(0, this.sliding - dt)

    if (this.laneLock <= 0) {
      if (input.left) {
        this.targetLane = Math.max(0, this.targetLane - 1)
        this.laneLock = 0.16
        audio.whoosh()
      } else if (input.right) {
        this.targetLane = Math.min(2, this.targetLane + 1)
        this.laneLock = 0.16
        audio.whoosh()
      }
    }

    const canJump = this.y < 0.08 || this.onTrain || this.powers.fly > 0
    if (input.jump && !this.jumpLock && canJump) {
      this.vy = this.powers.megaJump > 0 ? 15.5 : 11.4
      this.onTrain = null
      this.sliding = 0
      audio.jump()
    }
    this.jumpLock = input.jump

    if (input.slide && !this.slideLock) {
      if (this.powers.fly > 0) {
        this.powers.fly = 0
        this.vy = -8
      } else if (this.y > 0.2 && !this.onTrain) {
        this.vy = -14
      }
      this.sliding = 0.55
      audio.slide()
    }
    this.slideLock = input.slide

    this.x += (LANES[this.targetLane] - this.x) * Math.min(1, 14 * dt)
    this.lane = this.targetLane

    if (this.powers.fly > 0) {
      this.onTrain = null
      this.y += (this.flyHeight - this.y) * Math.min(1, 8 * dt)
      this.vy = 0
    } else if (!this.onTrain) {
      this.vy -= 28 * dt
      this.y += this.vy * dt
      if (this.y < 0) {
        this.y = 0
        this.vy = 0
      }
    } else {
      this.y = this.onTrain.userData.top
      this.vy = 0
      const end = this.onTrain.position.z + this.onTrain.userData.len * 0.5
      if (this.z > end - 0.4) {
        this.onTrain = null
      }
    }

    this.track.recycle(this.z)
    this.track.fillAhead(this.z, this.distance)
    this._coins(audio, dt)
    this._obstacles()
    this._animate()
  }

  _height() {
    if (this.sliding > 0 && this.y < 0.15) return 0.72
    return 1.55
  }

  _coins(audio, dt) {
    const px = this.x
    const pz = this.z
    const py = this.y + 0.8
    const magnet = this.powers.magnet > 0
    const gain = this.powers.double > 0 ? 2 : 1
    for (const c of this.track.coins) {
      if (c.userData.gone) continue
      if (magnet) {
        const dx = px - c.position.x
        const dy = py - c.position.y
        const dz = pz - c.position.z
        const dist = Math.hypot(dx, dy, dz)
        if (dist < 7 && dist > 0.001) {
          const pull = Math.min(1, (18 * dt) / dist)
          c.position.x += dx * pull
          c.position.y += dy * pull
          c.position.z += dz * pull
        }
      }
      const dx = c.position.x - px
      const dz = c.position.z - pz
      const dy = c.position.y - py
      if (dx * dx + dz * dz + dy * dy < 1.15) {
        c.userData.gone = true
        c.visible = false
        this.coins += gain
        this.runCoins += gain
        audio.coin()
      } else {
        c.rotation.z += 0.12
      }
    }
  }

  _hit() {
    if (this.invuln > 0) return false
    if (this.powers.fly > 0) return false
    if (this.powers.shield > 0) {
      this.powers.shield = 0
      return false
    }
    this._die()
    return true
  }

  _obstacles() {
    const pz = this.z
    const px = this.x
    const feet = this.y
    const head = this.y + this._height()

    for (const o of this.track.obstacles) {
      const kind = o.userData.kind
      const half = o.userData.len * 0.5
      if (Math.abs(o.position.z - pz) > half + 0.45) continue
      if (Math.abs(o.position.x - px) > 1.05) continue

      if (kind === 'train') {
        const top = o.userData.top
        if (this.powers.canBoardTrains && feet >= top - 0.35 && this.vy <= 2) {
          this.onTrain = o
          this.y = top
          this.vy = 0
          continue
        }
        if (this.powers.fly > 0 && feet > top - 0.1) continue
        if (head > 0.2 && feet < top - 0.05) {
          if (this._hit()) return
        }
      } else if (kind === 'barrier') {
        if (this.powers.fly > 0) continue
        if (feet < 0.95) {
          if (this._hit()) return
        }
      } else if (kind === 'sign') {
        if (this.powers.fly > 0) continue
        if (!(this.sliding > 0 && feet < 0.25) && head > 0.95) {
          if (this._hit()) return
        }
      }
    }
  }

  _die() {
    this.dead = true
    this.vy = 3
    this.saveCoins()
  }

  _animate() {
    const slide = this.sliding > 0 && this.y < 0.2
    const flying = this.powers.fly > 0
    this.mesh.position.set(this.x, this.y, this.z)
    this.shadow.position.set(this.x, 0.04, this.z)
    const lift = Math.min(1, this.y / 2.2)
    const ss = 0.85 + lift * 0.55
    this.shadow.scale.set(ss, ss, 1)
    this.shadow.material.opacity = 0.42 * (1 - lift * 0.7)
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, (LANES[this.targetLane] - this.x) * 0.06, 0.15)
    this.mesh.rotation.x = slide ? 1.05 : THREE.MathUtils.lerp(this.mesh.rotation.x, flying ? -0.2 : 0, 0.18)
    this.mesh.scale.y = slide ? 0.62 : 1

    const t = this.z * 0.38
    const run = this.y < 0.05 && !slide && !flying ? 1 : flying ? 0.35 : 0.12
    const { leftLeg, rightLeg, leftArm, rightArm } = this.mesh.userData
    if (leftLeg) {
      leftLeg.rotation.x = Math.sin(t) * 0.85 * run
      rightLeg.rotation.x = Math.cos(t) * 0.85 * run
      leftArm.rotation.x = Math.cos(t) * 0.55 * run
      rightArm.rotation.x = Math.sin(t) * 0.55 * run
    }
  }
}
