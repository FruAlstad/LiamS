import * as THREE from 'three'
import { LANES, Track, createRunnerMesh } from './world.js'

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
    this.coins = 0
    this.dead = false
    this.laneLock = 0
    this.jumpLock = false
    this.slideLock = false
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
    this.coins = 0
    this.dead = false
    this.laneLock = 0
    this.track.reset()
    this.track.fillAhead(0, 0)
    this.mesh.rotation.set(0, 0, 0)
    this.mesh.scale.set(1, 1, 1)
    this._animate()
  }

  get score() {
    return Math.floor(this.distance * 4 + this.coins * 10)
  }

  update(dt, input, audio) {
    if (this.dead) return

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

    if (input.jump && !this.jumpLock && (this.y < 0.08 || this.onTrain)) {
      this.vy = 11.4
      this.onTrain = null
      this.sliding = 0
      audio.jump()
    }
    this.jumpLock = input.jump

    if (input.slide && !this.slideLock) {
      if (this.y > 0.2 && !this.onTrain) this.vy = -14
      this.sliding = 0.55
      audio.slide()
    }
    this.slideLock = input.slide

    this.x += (LANES[this.targetLane] - this.x) * Math.min(1, 14 * dt)
    this.lane = this.targetLane

    if (!this.onTrain) {
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
    this._coins(audio)
    this._obstacles()
    this._animate()
  }

  _height() {
    if (this.sliding > 0 && this.y < 0.15) return 0.72
    return 1.55
  }

  _coins(audio) {
    const px = this.x
    const pz = this.z
    const py = this.y + 0.8
    for (const c of this.track.coins) {
      if (c.userData.gone) continue
      const dx = c.position.x - px
      const dz = c.position.z - pz
      const dy = c.position.y - py
      if (dx * dx + dz * dz + dy * dy < 1.15) {
        c.userData.gone = true
        c.visible = false
        this.coins += 1
        audio.coin()
      } else {
        c.rotation.z += 0.12
      }
    }
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
        if (feet >= top - 0.35 && this.vy <= 2) {
          this.onTrain = o
          this.y = top
          this.vy = 0
          continue
        }
        if (head > 0.2 && feet < top - 0.05) {
          this._die()
          return
        }
      } else if (kind === 'barrier') {
        if (feet < 0.95) {
          this._die()
          return
        }
      } else if (kind === 'sign') {
        if (!(this.sliding > 0 && feet < 0.25) && head > 0.95) {
          this._die()
          return
        }
      }
    }
  }

  _die() {
    this.dead = true
    this.vy = 3
  }

  _animate() {
    const slide = this.sliding > 0 && this.y < 0.2
    this.mesh.position.set(this.x, this.y, this.z)
    this.shadow.position.set(this.x, 0.04, this.z)
    const lift = Math.min(1, this.y / 2.2)
    const ss = 0.85 + lift * 0.55
    this.shadow.scale.set(ss, ss, 1)
    this.shadow.material.opacity = 0.42 * (1 - lift * 0.7)
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, (LANES[this.targetLane] - this.x) * 0.06, 0.15)
    this.mesh.rotation.x = slide ? 1.05 : THREE.MathUtils.lerp(this.mesh.rotation.x, 0, 0.18)
    this.mesh.scale.y = slide ? 0.62 : 1

    const t = this.z * 0.38
    const run = this.y < 0.05 && !slide ? 1 : 0.12
    const { leftLeg, rightLeg, leftArm, rightArm } = this.mesh.userData
    if (leftLeg) {
      leftLeg.rotation.x = Math.sin(t) * 0.85 * run
      rightLeg.rotation.x = Math.cos(t) * 0.85 * run
      leftArm.rotation.x = Math.cos(t) * 0.55 * run
      rightArm.rotation.x = Math.sin(t) * 0.55 * run
    }
  }
}
