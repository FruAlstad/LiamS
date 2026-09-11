import './style.css'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { Runner } from './game.js'
import { createAudio } from './audio.js'

const input = {
  left: false,
  right: false,
  jump: false,
  slide: false,
}

const held = { ...input }

function bindKey(down) {
  return (e) => {
    const map = {
      KeyA: 'left',
      ArrowLeft: 'left',
      KeyD: 'right',
      ArrowRight: 'right',
      KeyW: 'jump',
      ArrowUp: 'jump',
      Space: 'jump',
      KeyS: 'slide',
      ArrowDown: 'slide',
    }
    const k = map[e.code]
    if (!k) return
    e.preventDefault()
    input[k] = down
    held[k] = down
  }
}
window.addEventListener('keydown', bindKey(true))
window.addEventListener('keyup', bindKey(false))

let touchX = 0
let touchY = 0
window.addEventListener(
  'touchstart',
  (e) => {
    const t = e.changedTouches[0]
    touchX = t.clientX
    touchY = t.clientY
  },
  { passive: true },
)
window.addEventListener(
  'touchend',
  (e) => {
    const t = e.changedTouches[0]
    const dx = t.clientX - touchX
    const dy = t.clientY - touchY
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
      input.jump = true
      return
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) input.left = true
      else input.right = true
    } else if (dy < 0) input.jump = true
    else input.slide = true
  },
  { passive: true },
)

const scene = new THREE.Scene()
scene.fog = new THREE.Fog(0x1b2744, 38, 120)

function createSky() {
  const geo = new THREE.SphereGeometry(170, 32, 16)
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    fog: false,
    vertexShader: `
      varying vec3 vP;
      void main() {
        vP = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vP;
      void main() {
        float h = clamp(vP.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 horizon = vec3(0.95, 0.42, 0.18);
        vec3 glow = vec3(0.35, 0.22, 0.55);
        vec3 zenith = vec3(0.05, 0.08, 0.18);
        vec3 col = mix(horizon, glow, smoothstep(0.0, 0.28, h));
        col = mix(col, zenith, smoothstep(0.22, 0.85, h));
        float sun = pow(max(dot(normalize(vP), normalize(vec3(0.55, 0.08, 0.7))), 0.0), 140.0);
        col += vec3(1.0, 0.65, 0.25) * sun * 2.2;
        float star = step(0.997, fract(sin(dot(vP.xy * 80.0, vec2(12.9898, 78.233))) * 43758.5453));
        col += vec3(star) * smoothstep(0.45, 0.9, h) * 0.7;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
  return new THREE.Mesh(geo, mat)
}

const sky = createSky()
scene.add(sky)

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 240)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.12
document.body.prepend(renderer.domElement)

scene.add(new THREE.HemisphereLight(0x9eb6ff, 0x1a1512, 0.5))
scene.add(new THREE.AmbientLight(0x3a4458, 0.32))
const sun = new THREE.DirectionalLight(0xffc38a, 1.55)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 2
sun.shadow.camera.far = 70
sun.shadow.camera.left = -20
sun.shadow.camera.right = 20
sun.shadow.camera.top = 20
sun.shadow.camera.bottom = -12
sun.shadow.bias = -0.0003
scene.add(sun)
scene.add(sun.target)

const fill = new THREE.PointLight(0x66e0ff, 28, 28, 1.4)
scene.add(fill)
const neonPink = new THREE.PointLight(0xff4da6, 22, 24, 1.4)
scene.add(neonPink)
const neonAmber = new THREE.PointLight(0xffc878, 16, 20, 1.5)
scene.add(neonAmber)
const rim = new THREE.DirectionalLight(0x88aaff, 0.55)
rim.position.set(-8, 6, 4)
scene.add(rim)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.05, 0.85, 0.18)
composer.addPass(bloom)

const runner = new Runner(scene)
const audio = createAudio()

const scoreEl = document.getElementById('score')
const coinsEl = document.getElementById('coins')
const overlay = document.getElementById('overlay')
const deadScreen = document.getElementById('dead')
const deadScore = document.getElementById('dead-score')

let playing = false
let last = performance.now()
const camPos = new THREE.Vector3(0, 4.8, -9.5)
const look = new THREE.Vector3()

function consumePulse() {
  const frame = {
    left: input.left,
    right: input.right,
    jump: input.jump,
    slide: input.slide,
  }
  if (!held.left) input.left = false
  if (!held.right) input.right = false
  if (!held.jump) input.jump = false
  if (!held.slide) input.slide = false
  return frame
}

function tick(now) {
  const dt = Math.min(0.033, (now - last) / 1000)
  last = now

  const frame = consumePulse()
  if (playing) runner.update(dt, frame, audio)

  const z = runner.z
  camPos.lerp(new THREE.Vector3(runner.x * 0.45, 4.7 + runner.y * 0.2, z - 9.2), 0.1)
  camera.position.copy(camPos)
  look.set(runner.x * 0.2, 1.35, z + 16)
  camera.lookAt(look)
  sky.position.set(runner.x, 0, z)
  sun.position.set(runner.x + 16, 12, z + 14)
  sun.target.position.set(runner.x, 0, z + 6)
  sun.target.updateMatrixWorld()
  fill.position.set(runner.x + 3.2, 4.6, z + 4)
  fill.intensity = 26
  neonPink.position.set(runner.x - 3.4, 5.0, z + 1)
  neonAmber.position.set(runner.x, 3.2, z - 1)
  const pulse = 0.92 + Math.sin(now * 0.004) * 0.18
  bloom.strength = 1.05 * pulse

  scoreEl.textContent = String(runner.score)
  coinsEl.textContent = String(runner.coins)

  if (playing && runner.dead) {
    playing = false
    audio.crash()
    deadScore.textContent = `${runner.score} poäng · ${runner.coins} mynt`
    deadScreen.classList.remove('hidden')
  }

  composer.render()
  requestAnimationFrame(tick)
}

function start() {
  audio.resume()
  runner.reset()
  playing = true
  overlay.classList.add('hidden')
  deadScreen.classList.add('hidden')
}

document.getElementById('play-btn').addEventListener('click', start)
document.getElementById('retry-btn').addEventListener('click', start)

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})

requestAnimationFrame(tick)
