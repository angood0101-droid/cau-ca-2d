// ===== Câu Cá 2D =====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;
function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
resize(); addEventListener('resize', resize);

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ===== DOM =====
const moneyEl = document.getElementById('money');
const caughtEl = document.getElementById('caught');
const rareEl = document.getElementById('rareCount');
const rodNameEl = document.getElementById('rodName');
const timeOfDayEl = document.getElementById('timeOfDay');
const hintBar = document.getElementById('hintBar');
const powerWrap = document.getElementById('powerWrap');
const powerFill = document.getElementById('powerFill');
const tensionWrap = document.getElementById('tensionWrap');
const tensionFill = document.getElementById('tensionFill');
const biteAlert = document.getElementById('biteAlert');
const catchPopup = document.getElementById('catchPopup');
const catchName = document.getElementById('catchName');
const catchSize = document.getElementById('catchSize');
const catchReward = document.getElementById('catchReward');
const catchSellBtn = document.getElementById('catchSellBtn');
const catchCookBtn = document.getElementById('catchCookBtn');
const hungerFill = document.getElementById('hungerFill');
const hungerLabel = document.getElementById('hungerLabel');
const shopBtn = document.getElementById('shopBtn');
const shopEl = document.getElementById('shop');
const rodListEl = document.getElementById('rodList');
const shopCloseBtn = document.getElementById('shopClose');
const toastEl = document.getElementById('toast');
const btnReel = document.getElementById('btnReel');
const btnLetout = document.getElementById('btnLetout');
const btnDrop = document.getElementById('btnDrop');
const lineLenFill = document.getElementById('lineLenFill');
const baitBtn = document.getElementById('baitBtn');
const baitBtnName = document.getElementById('baitBtnName');
const scoopLabel = document.getElementById('fishScoopLabel');
const tiredBadge = document.getElementById('tiredBadge');
const baitListEl = document.getElementById('baitList');

// ===== Input =====
const mouse = { x: W / 2, y: H / 2, down: false };
const lineIO = { reel: false, letout: false };
canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', e => { if (e.button === 0) onPress(); });
canvas.addEventListener('mouseup', e => { if (e.button === 0) onRelease(); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0]; mouse.x = t.clientX; mouse.y = t.clientY;
  onPress();
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = e.touches[0]; if (t) { mouse.x = t.clientX; mouse.y = t.clientY; }
}, { passive: false });
canvas.addEventListener('touchend', e => { e.preventDefault(); onRelease(); }, { passive: false });
canvas.addEventListener('touchcancel', e => { e.preventDefault(); onRelease(); }, { passive: false });
// Prevent pinch-zoom / double-tap zoom
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'r') lineIO.reel = true;
  if (k === 'f') lineIO.letout = true;
});
addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'r') lineIO.reel = false;
  if (k === 'f') lineIO.letout = false;
});

function bindHoldButton(el, flag) {
  let activeId = null;
  const press = ev => {
    ev.preventDefault();
    if (activeId !== null) return;
    activeId = ev.pointerId !== undefined ? ev.pointerId : 'touch';
    try { if (ev.pointerId !== undefined) el.setPointerCapture(ev.pointerId); } catch (e) { }
    lineIO[flag] = true;
    el.classList.add('hold');
  };
  const release = ev => {
    if (ev && ev.pointerId !== undefined && activeId !== 'touch' && ev.pointerId !== activeId) return;
    activeId = null;
    lineIO[flag] = false;
    el.classList.remove('hold');
  };
  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  // Touch fallback (iOS Safari older versions may not dispatch pointer events reliably)
  el.addEventListener('touchstart', ev => {
    ev.preventDefault();
    activeId = 'touch';
    lineIO[flag] = true;
    el.classList.add('hold');
  }, { passive: false });
  el.addEventListener('touchend', ev => {
    ev.preventDefault();
    activeId = null;
    lineIO[flag] = false;
    el.classList.remove('hold');
  }, { passive: false });
  el.addEventListener('touchcancel', () => {
    activeId = null;
    lineIO[flag] = false;
    el.classList.remove('hold');
  });
  // Click fallback (mouse): treat as pulse
  el.addEventListener('mouseleave', () => {
    if (activeId === null) return;
    // mouse only: if button released outside, force release
    // (pointerup already handled; this is extra safety)
  });
}
bindHoldButton(btnReel, 'reel');
bindHoldButton(btnLetout, 'letout');

function dropLineStraightDown() {
  if (state !== 'idle') return;
  // Thả lưỡi câu xuống tại vị trí con trỏ chuột (x), trên mặt nước
  const base = rodBaseXY();
  const dropX = clamp(mouse.x || W / 2, base.x + 40, W - 30);
  // Cần nghiêng về hướng đó
  rod.angle = Math.atan2(waterLevelY() - base.y, dropX - base.x);
  rod.angle = clamp(rod.angle, -Math.PI * 0.8, -0.1);
  getRodTip();
  hook.x = dropX;
  hook.y = waterLevelY() + 5;
  hook.vx = 0;
  hook.vy = 0;
  hook.inAir = false;
  hook.onFish = null;
  state = 'fishing';
  // Splash
  for (let i = 0; i < 12; i++) {
    particles.push({ x: hook.x, y: waterLevelY(), vx: rand(-3, 3), vy: rand(-5, -1), life: 30, col: '#a0c4e0' });
  }
  // Bobber nếu mồi sống
  const useBobber = currentBait === 'worm' || currentBait === 'shrimp';
  bobber.visible = useBobber;
  if (useBobber) {
    bobber.x = hook.x;
    bobber.y = waterLevelY();
    bobber.bobPhase = 0;
    bobber.wobble = 0;
  }
  powerWrap.classList.remove('show');
  hintBar.innerHTML = 'Dây thả thẳng! Mồi đang chìm. Giữ <b>THU DÂY</b> để kéo';
}
btnDrop.addEventListener('click', dropLineStraightDown);
addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 't') dropLineStraightDown();
});

scoopLabel.addEventListener('click', swingNet);
scoopLabel.addEventListener('pointerdown', e => { e.stopPropagation(); swingNet(); });
addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'v' && state === 'fighting') swingNet();
});
function swingNet() {
  if (state !== 'fighting' || net.active) return;
  net.active = true;
  net.phase = 0;
  const tip = getRodTip();
  net.x = tip.x;
  net.y = tip.y;
}

baitBtn.addEventListener('click', () => {
  const idx = ownedBaits.indexOf(currentBait);
  currentBait = ownedBaits[(idx + 1) % ownedBaits.length];
  updateBaitUI();
  showToast('Đổi mồi: ' + BAITS.find(b => b.id === currentBait).name);
});

function updateBaitUI() {
  const b = BAITS.find(x => x.id === currentBait);
  baitBtnName.textContent = (b.emoji || '') + ' ' + b.name;
}

// ===== Game data =====
const RODS = [
  { name: 'Cần gỗ thô',       maxPower: 16, reelSpeed: 0.018, strength: 1.0, price: 0,
    v: { rod: '#6a3a10', rod2: '#8a5a20', grip: '#3a2010', reel: '#4a3a20', reelCore: '#2a1a08', eyelets: 2, thick: 6, glow: null, bait: 'worm' } },
  { name: 'Cần tre tay',       maxPower: 20, reelSpeed: 0.025, strength: 1.4, price: 300,
    v: { rod: '#b08a3a', rod2: '#d8b060', grip: '#6a4a1a', reel: '#7a5a3a', reelCore: '#3a2a10', eyelets: 3, thick: 5, knots: true, bait: 'worm' } },
  { name: 'Cần sợi thủy tinh', maxPower: 26, reelSpeed: 0.032, strength: 1.9, price: 1200,
    v: { rod: '#d0d8e0', rod2: '#f0f4f8', grip: '#202030', reel: '#a0a0b0', reelCore: '#404050', eyelets: 4, thick: 4, bait: 'shrimp' } },
  { name: 'Cần thép',          maxPower: 32, reelSpeed: 0.04,  strength: 2.6, price: 4000,
    v: { rod: '#808890', rod2: '#c0c8d0', grip: '#b03030', reel: '#606070', reelCore: '#202028', eyelets: 5, thick: 4, shiny: true, bait: 'shrimp' } },
  { name: 'Cần carbon',        maxPower: 40, reelSpeed: 0.055, strength: 3.8, price: 12000,
    v: { rod: '#18181f', rod2: '#404050', grip: '#2a0a0a', reel: '#1a1a22', reelCore: '#ff4040', eyelets: 6, thick: 3.5, shiny: true, bait: 'lure' } },
  { name: 'Cần titan',         maxPower: 52, reelSpeed: 0.065, strength: 4.6, price: 28000,
    v: { rod: '#50586a', rod2: '#8090a8', grip: '#1a3040', reel: '#404858', reelCore: '#00c8ff', eyelets: 7, thick: 3.5, shiny: true, glow: '#40a0ff', bait: 'lure' } },
  { name: 'Cần huyền thoại',   maxPower: 60, reelSpeed: 0.075, strength: 5.8, price: 55000,
    v: { rod: '#ffd040', rod2: '#fff080', grip: '#a06020', reel: '#ffd040', reelCore: '#c08040', eyelets: 7, thick: 4, shiny: true, glow: '#ffcf5f', bait: 'goldlure' } },
  { name: 'Cần thần kim cương', maxPower: 80, reelSpeed: 0.1, strength: 8.0, price: 150000,
    v: { rod: '#f0f8ff', rod2: '#e0f0ff', grip: '#8080ff', reel: '#a0c8ff', reelCore: '#ff40ff', eyelets: 8, thick: 4.5, shiny: true, glow: '#ff80ff', bait: 'goldlure' } },
  { name: 'Cần pha lê',         maxPower: 95,  reelSpeed: 0.12, strength: 10.0, price: 300000,
    v: { rod: '#b0f0ff', rod2: '#e0ffff', grip: '#2080a0', reel: '#80d0ff', reelCore: '#00ffff', eyelets: 8, thick: 4.5, shiny: true, glow: '#80ffff' } },
  { name: 'Cần rồng thiêng',    maxPower: 110, reelSpeed: 0.14, strength: 12.5, price: 600000,
    v: { rod: '#8a1010', rod2: '#e04040', grip: '#400000', reel: '#a02020', reelCore: '#ffd040', eyelets: 9, thick: 5, shiny: true, glow: '#ff6020' } },
  { name: 'Cần thần sấm',       maxPower: 130, reelSpeed: 0.17, strength: 15.0, price: 1200000,
    v: { rod: '#4a4080', rod2: '#9080ff', grip: '#1a1040', reel: '#6050aa', reelCore: '#fff080', eyelets: 9, thick: 5, shiny: true, glow: '#d0c0ff' } },
  { name: 'Cần mặt trời vàng',  maxPower: 155, reelSpeed: 0.2,  strength: 18.5, price: 2500000,
    v: { rod: '#ffa020', rod2: '#ffe060', grip: '#a04000', reel: '#ffc040', reelCore: '#ff4020', eyelets: 10, thick: 5, shiny: true, glow: '#ffff60' } },
  { name: 'Cần hỏa long',       maxPower: 185, reelSpeed: 0.24, strength: 22.0, price: 5000000,
    v: { rod: '#202020', rod2: '#ff4020', grip: '#100000', reel: '#2a0a0a', reelCore: '#ffbe0b', eyelets: 10, thick: 5.5, shiny: true, glow: '#ff2020' } },
  { name: 'Cần băng vĩnh cửu',  maxPower: 220, reelSpeed: 0.28, strength: 26.0, price: 10000000,
    v: { rod: '#e0f8ff', rod2: '#ffffff', grip: '#2060a0', reel: '#a0d8f0', reelCore: '#4090d0', eyelets: 11, thick: 5.5, shiny: true, glow: '#a0f0ff' } },
  { name: 'Cần thiên hà',       maxPower: 260, reelSpeed: 0.33, strength: 31.0, price: 25000000,
    v: { rod: '#0a0020', rod2: '#8040ff', grip: '#4a00aa', reel: '#2a1060', reelCore: '#ff80ff', eyelets: 12, thick: 6, shiny: true, glow: '#a040ff' } },
  { name: 'Cần thời gian',      maxPower: 310, reelSpeed: 0.4,  strength: 37.0, price: 50000000,
    v: { rod: '#c0c0c0', rod2: '#ffffff', grip: '#606060', reel: '#e0e0e0', reelCore: '#40ffff', eyelets: 13, thick: 6.5, shiny: true, glow: '#80ffff' } },
  { name: 'Cần vĩnh hằng',      maxPower: 380, reelSpeed: 0.5,  strength: 45.0, price: 100000000,
    v: { rod: '#ffffff', rod2: '#fff8c0', grip: '#ffd040', reel: '#ffc040', reelCore: '#ff40c0', eyelets: 14, thick: 7, shiny: true, glow: '#ffffff' } },
  { name: 'Cần thần thoại cổ đại', maxPower: 500, reelSpeed: 0.65, strength: 60.0, price: 500000000,
    v: { rod: '#40ffc0', rod2: '#ffd040', grip: '#a000ff', reel: '#ff00ff', reelCore: '#ffff00', eyelets: 16, thick: 7.5, shiny: true, glow: '#ff40ff' } },
];

const BAITS = [
  { id: 'worm',     name: 'Giun đất',         kind: 'worm',     price: 0,     attractsRare: 0.0, attractPower: 1.0, sinkSpeed: 0.55, emoji: '🪱' },
  { id: 'shrimp',   name: 'Tôm sống',         kind: 'shrimp',   price: 200,   attractsRare: 0.3, attractPower: 1.3, sinkSpeed: 0.65, emoji: '🦐' },
  { id: 'frog',     name: 'Nhái giả',         kind: 'frog',     price: 800,   attractsRare: 0.6, attractPower: 1.5, sinkSpeed: 0.75, emoji: '🐸' },
  { id: 'lure',     name: 'Mồi giả kim loại', kind: 'lure',     price: 2500,  attractsRare: 1.0, attractPower: 1.7, sinkSpeed: 0.9, emoji: '✨' },
  { id: 'heavy',    name: 'Mồi chì nặng',     kind: 'heavy',    price: 3500,  attractsRare: 0.5, attractPower: 1.4, sinkSpeed: 1.3, emoji: '⚓' },
  { id: 'goldlure', name: 'Mồi vàng',         kind: 'goldlure', price: 10000, attractsRare: 2.0, attractPower: 2.0, sinkSpeed: 1.0, emoji: '👑' },
  { id: 'diamond',  name: 'Mồi kim cương',    kind: 'diamond',  price: 50000,    attractsRare: 3.5,  attractPower: 2.8, sinkSpeed: 1.1, emoji: '💎' },
  { id: 'blood',    name: 'Mồi huyết long',   kind: 'blood',    price: 150000,   attractsRare: 4.0,  attractPower: 3.2, sinkSpeed: 1.1, emoji: '🩸' },
  { id: 'angel',    name: 'Mồi thiên thần',   kind: 'angel',    price: 400000,   attractsRare: 5.0,  attractPower: 3.6, sinkSpeed: 1.15, emoji: '😇' },
  { id: 'electric', name: 'Mồi điện',         kind: 'electric', price: 800000,   attractsRare: 6.0,  attractPower: 4.0, sinkSpeed: 1.2, emoji: '⚡' },
  { id: 'magic',    name: 'Mồi phép thuật',   kind: 'magic',    price: 1500000,  attractsRare: 7.5,  attractPower: 4.5, sinkSpeed: 1.2, emoji: '🪄' },
  { id: 'soul',     name: 'Mồi linh hồn',     kind: 'soul',     price: 3000000,  attractsRare: 9.0,  attractPower: 5.0, sinkSpeed: 1.25, emoji: '👻' },
  { id: 'divine',   name: 'Mồi thần thánh',   kind: 'divine',   price: 6000000,  attractsRare: 11.0, attractPower: 5.6, sinkSpeed: 1.3, emoji: '✨' },
  { id: 'infinity', name: 'Mồi vô cực',       kind: 'infinity', price: 12000000, attractsRare: 14.0, attractPower: 6.2, sinkSpeed: 1.3, emoji: '♾' },
  { id: 'ancient',  name: 'Mồi ma thuật cổ',  kind: 'ancient',  price: 30000000, attractsRare: 18.0, attractPower: 7.0, sinkSpeed: 1.35, emoji: '🔮' },
  { id: 'absolute', name: 'Mồi tuyệt đối',    kind: 'absolute', price: 70000000, attractsRare: 22.0, attractPower: 8.0, sinkSpeed: 1.4, emoji: '🌟' },
  { id: 'cosmic',   name: 'Mồi vũ trụ',       kind: 'cosmic',   price: 200000000, attractsRare: 30.0, attractPower: 10.0, sinkSpeed: 1.5, emoji: '🌌' },
];

const FISH_TYPES = [
  // Tier 1: Ao hồ
  { id: 'tri',    name: 'Cá trích',        bodyCol: '#c8d8e0', bellyCol: '#f0f4f8', backCol: '#5a7a90', finCol: '#90a0b0', size: 16, speed: 1.2, rarity: 60,  value: 15,    strength: 0.35, minD: 0.1,  maxD: 0.75, rare: false, likes: ['worm', 'shrimp'],        shape: 'herring',   tireMax: 1, wMin: 0.2,   wMax: 1.0,    lMin: 18,  lMax: 35  },
  { id: 'ro',     name: 'Cá rô',           bodyCol: '#6a8030', bellyCol: '#c0c080', backCol: '#3a4010', finCol: '#4a5020', size: 14, speed: 1.3, rarity: 40,  value: 30,    strength: 0.4,  minD: 0.1,  maxD: 0.7,  rare: false, likes: ['worm'],                  shape: 'perch',     tireMax: 1, wMin: 0.2,   wMax: 1.5,    lMin: 15,  lMax: 30  },
  { id: 'vang',   name: 'Cá vàng',         bodyCol: '#ffb030', bellyCol: '#ffe080', backCol: '#d07010', finCol: '#ff8020', size: 20, speed: 1.0, rarity: 28,  value: 40,    strength: 0.55, minD: 0.15, maxD: 0.85, rare: false, likes: ['worm', 'shrimp'],        shape: 'goldfish',  tireMax: 1, wMin: 0.5,   wMax: 2.0,    lMin: 20,  lMax: 45  },
  // Tier 2: Sông
  { id: 'hong',   name: 'Cá hồng',         bodyCol: '#e85060', bellyCol: '#ffa8b0', backCol: '#8a2030', finCol: '#c03040', size: 24, speed: 1.3, rarity: 18,  value: 100,   strength: 0.85, minD: 0.3,  maxD: 0.9,  rare: false, likes: ['shrimp'],                shape: 'snapper',   tireMax: 2, wMin: 1.0,   wMax: 4.0,    lMin: 35,  lMax: 70  },
  { id: 'tre',    name: 'Cá trê',          bodyCol: '#3a3028', bellyCol: '#6a6050', backCol: '#1a1008', finCol: '#2a2018', size: 24, speed: 1.4, rarity: 14,  value: 160,   strength: 1.0,  minD: 0.5,  maxD: 1.0,  rare: false, likes: ['worm', 'shrimp'],        shape: 'catfish',   tireMax: 2, wMin: 1.5,   wMax: 10.0,   lMin: 30,  lMax: 70  },
  { id: 'xanh',   name: 'Cá xanh lam',     bodyCol: '#4080d0', bellyCol: '#b0d0f0', backCol: '#1a3a7a', finCol: '#2050a0', size: 28, speed: 1.6, rarity: 10,  value: 250,   strength: 1.2,  minD: 0.4,  maxD: 1.0,  rare: false, likes: ['shrimp', 'lure'],        shape: 'bluefish',  tireMax: 2, wMin: 2.0,   wMax: 7.0,    lMin: 55,  lMax: 110 },
  { id: 'loc',    name: 'Cá lóc',          bodyCol: '#4a6a3a', bellyCol: '#b0c080', backCol: '#2a3a1a', finCol: '#2a3a1a', size: 34, speed: 1.8, rarity: 8,   value: 800,   strength: 2.0,  minD: 0.25, maxD: 0.85, rare: false, likes: ['frog'],                  shape: 'snakehead', tireMax: 3, wMin: 5.0,   wMax: 25.0,   lMin: 60,  lMax: 130 },
  { id: 'nheo',   name: 'Cá nheo',         bodyCol: '#504838', bellyCol: '#9a8870', backCol: '#28200f', finCol: '#30281a', size: 36, speed: 1.3, rarity: 6,   value: 900,   strength: 2.2,  minD: 0.55, maxD: 1.0,  rare: false, likes: ['shrimp', 'frog'],        shape: 'giantcat',  tireMax: 3, wMin: 5.0,   wMax: 50.0,   lMin: 80,  lMax: 180 },
  // Tier 3: Biển
  { id: 'duoi',   name: 'Cá đuối',         bodyCol: '#9a7a5a', bellyCol: '#e8d0a0', backCol: '#5a3a1a', finCol: '#6a4a2a', size: 32, speed: 1.1, rarity: 6,   value: 500,   strength: 1.8,  minD: 0.55, maxD: 1.0,  rare: true,  likes: ['shrimp', 'lure'],        shape: 'ray',       tireMax: 3, wMin: 5.0,   wMax: 18.0,   lMin: 100, lMax: 220 },
  { id: 'map',    name: 'Cá mập búa',      bodyCol: '#707884', bellyCol: '#d8dce0', backCol: '#3a3e48', finCol: '#2a2e38', size: 46, speed: 2.4, rarity: 2,   value: 1800,  strength: 3.2,  minD: 0.6,  maxD: 1.0,  rare: true,  likes: ['lure'],                  shape: 'shark',     tireMax: 5, wMin: 20.0,  wMax: 60.0,   lMin: 220, lMax: 300 },
  // Tier 4: Amazon - cá khổng lồ
  { id: 'hongvi', name: 'Cá hồng vĩ',      bodyCol: '#38302a', bellyCol: '#8a7060', backCol: '#18100a', finCol: '#d04020', size: 42, speed: 1.8, rarity: 4,   value: 3000,  strength: 3.0,  minD: 0.5,  maxD: 1.0,  rare: true,  likes: ['frog', 'lure'],          shape: 'redtail',   tireMax: 4, wMin: 10.0,  wMax: 80.0,   lMin: 80,  lMax: 150 },
  { id: 'sau',    name: 'Cá sấu hỏa tiển', bodyCol: '#3a4030', bellyCol: '#a0a070', backCol: '#1a1810', finCol: '#5a6040', size: 48, speed: 1.5, rarity: 2.5, value: 5500,  strength: 4.0,  minD: 0.4,  maxD: 1.0,  rare: true,  likes: ['lure', 'frog'],          shape: 'gar',       tireMax: 5, wMin: 50.0,  wMax: 200.0,  lMin: 150, lMax: 250 },
  { id: 'haituong', name: 'Cá hải tượng',  bodyCol: '#9a3030', bellyCol: '#d89090', backCol: '#5a1010', finCol: '#6a0810', size: 56, speed: 1.2, rarity: 1,   value: 20000, strength: 6.0,  minD: 0.5,  maxD: 1.0,  rare: true,  likes: ['goldlure', 'diamond'],   shape: 'arapaima',  tireMax: 6, wMin: 100.0, wMax: 500.0,  lMin: 200, lMax: 350 },
  // Tier 5: Thần thoại
  { id: 'rong',   name: 'Cá rồng',         bodyCol: '#e04060', bellyCol: '#ff8090', backCol: '#a01030', finCol: '#801020', size: 40, speed: 2.2, rarity: 1,   value: 5000,  strength: 4.5,  minD: 0.7,  maxD: 1.0,  rare: true,  likes: ['lure', 'goldlure'],      shape: 'arowana',   tireMax: 5, wMin: 30.0,  wMax: 80.0,   lMin: 450, lMax: 500 },
  { id: 'vangthan', name: 'Cá vàng thần',  bodyCol: '#ffd040', bellyCol: '#fff0a0', backCol: '#c08020', finCol: '#ffef80', size: 28, speed: 1.5, rarity: 0.3, value: 15000, strength: 2.5,  minD: 0.3,  maxD: 0.9,  rare: true,  likes: ['goldlure', 'diamond'],   shape: 'mythical',  tireMax: 4, wMin: 5.0,   wMax: 15.0,   lMin: 50,  lMax: 100 },
  // World 6: Hồ Lớn Bắc — cá nước ngọt Bắc Bộ
  { id: 'me',     name: 'Cá mè',           bodyCol: '#d8e0e8', bellyCol: '#f8fcff', backCol: '#7a8a98', finCol: '#a0b0c0', size: 26, speed: 1.4, rarity: 25,  value: 180,   strength: 0.9,  minD: 0.2,  maxD: 0.9,  rare: false, likes: ['worm', 'shrimp'],        shape: 'herring',   tireMax: 2, wMin: 2.0,   wMax: 10.0,   lMin: 30,  lMax: 70  },
  { id: 'tram',   name: 'Cá trắm',         bodyCol: '#6a8a5a', bellyCol: '#c0d0a0', backCol: '#3a5030', finCol: '#5a7040', size: 30, speed: 1.2, rarity: 18,  value: 280,   strength: 1.3,  minD: 0.3,  maxD: 0.9,  rare: false, likes: ['worm', 'shrimp'],        shape: 'herring',   tireMax: 2, wMin: 5.0,   wMax: 15.0,   lMin: 50,  lMax: 100 },
  { id: 'chep',   name: 'Cá chép',         bodyCol: '#f0a030', bellyCol: '#ffd080', backCol: '#a06010', finCol: '#c07020', size: 26, speed: 1.3, rarity: 22,  value: 220,   strength: 1.0,  minD: 0.25, maxD: 0.9,  rare: false, likes: ['worm', 'shrimp'],        shape: 'carp',      tireMax: 2, wMin: 1.0,   wMax: 5.0,    lMin: 30,  lMax: 50  },
  // World 7: Biển Khơi — cá biển khổng lồ và quái
  { id: 'mapbo',  name: 'Cá mập bò',       bodyCol: '#8a8080', bellyCol: '#d8d0c8', backCol: '#4a4a4a', finCol: '#2a2a2a', size: 52, speed: 2.6, rarity: 4,   value: 8000,  strength: 5.0,  minD: 0.4,  maxD: 1.0,  rare: true,  likes: ['lure', 'heavy'],         shape: 'shark',     tireMax: 6, wMin: 80.0,  wMax: 300.0,  lMin: 200, lMax: 350 },
  { id: 'maptrang', name: 'Cá mập trắng', bodyCol: '#9098a4', bellyCol: '#f0f4f8', backCol: '#3a4048', finCol: '#2a2e38', size: 64, speed: 3.0, rarity: 1.5, value: 35000, strength: 7.5,  minD: 0.5,  maxD: 1.0,  rare: true,  likes: ['lure', 'heavy', 'blood'], shape: 'shark',    tireMax: 8, wMin: 200.0, wMax: 900.0,  lMin: 400, lMax: 700 },
  { id: 'mukhong', name: 'Cá mú khổng lồ', bodyCol: '#6a6040', bellyCol: '#b0a070', backCol: '#302810', finCol: '#4a3a20', size: 60, speed: 1.3, rarity: 2,   value: 25000, strength: 6.5,  minD: 0.6,  maxD: 1.0,  rare: true,  likes: ['heavy', 'lure', 'frog'], shape: 'grouper',   tireMax: 7, wMin: 100.0, wMax: 900.0,  lMin: 200, lMax: 900 },
  { id: 'kiem',   name: 'Cá kiếm',         bodyCol: '#4a6080', bellyCol: '#c0d0e8', backCol: '#1a2a4a', finCol: '#2a4068', size: 48, speed: 3.2, rarity: 3,   value: 6500,  strength: 4.5,  minD: 0.4,  maxD: 0.9,  rare: true,  likes: ['lure', 'heavy'],         shape: 'swordfish', tireMax: 5, wMin: 80.0,  wMax: 400.0,  lMin: 200, lMax: 450 },
  { id: 'ngu',    name: 'Cá ngừ vây xanh', bodyCol: '#305070', bellyCol: '#d0e0f0', backCol: '#1a2840', finCol: '#ffe040', size: 44, speed: 3.5, rarity: 5,   value: 4500,  strength: 4.0,  minD: 0.3,  maxD: 0.9,  rare: true,  likes: ['shrimp', 'lure'],        shape: 'tuna',      tireMax: 4, wMin: 50.0,  wMax: 300.0,  lMin: 150, lMax: 300 },
  { id: 'mat',    name: 'Cá mặt trời',     bodyCol: '#a0a0a8', bellyCol: '#d8d8e0', backCol: '#606068', finCol: '#707078', size: 56, speed: 0.8, rarity: 1.2, value: 18000, strength: 5.5,  minD: 0.2,  maxD: 0.7,  rare: true,  likes: ['frog', 'lure', 'diamond'], shape: 'sunfish', tireMax: 6, wMin: 500.0, wMax: 2000.0, lMin: 200, lMax: 350 },
  { id: 'voi',    name: 'Cá voi sát thủ nhỏ', bodyCol: '#202028', bellyCol: '#ffffff', backCol: '#000008', finCol: '#101018', size: 70, speed: 2.5, rarity: 0.8, value: 50000, strength: 9.0, minD: 0.3, maxD: 1.0, rare: true, likes: ['diamond', 'blood'],      shape: 'orca',      tireMax: 9, wMin: 300.0, wMax: 1500.0, lMin: 300, lMax: 600 },
  // Cá nước ngọt Việt Nam bổ sung
  { id: 'locbong',  name: 'Cá lóc bông',    bodyCol: '#5a7a4a', bellyCol: '#d0e0a0', backCol: '#2a4018', finCol: '#1a2a0a', size: 62, speed: 1.7, rarity: 2,   value: 20000, strength: 7.0, minD: 0.3,  maxD: 0.95, rare: true,  likes: ['frog', 'lure', 'blood'], shape: 'snakehead', tireMax: 8, wMin: 200.0, wMax: 1000.0, lMin: 2000, lMax: 10000 },
  { id: 'mevinh',   name: 'Mè vinh',        bodyCol: '#d8e0d8', bellyCol: '#f8f8f0', backCol: '#708090', finCol: '#a0a8a0', size: 18, speed: 1.5, rarity: 30,  value: 80,    strength: 0.5, minD: 0.15, maxD: 0.8,  rare: false, likes: ['worm', 'shrimp'],       shape: 'herring',   tireMax: 1, wMin: 0.3,  wMax: 2.0,  lMin: 15,  lMax: 40  },
  { id: 'tramden',  name: 'Cá trắm đen',    bodyCol: '#303028', bellyCol: '#707060', backCol: '#0a0a08', finCol: '#1a1a18', size: 34, speed: 1.3, rarity: 10,  value: 900,   strength: 2.0, minD: 0.5,  maxD: 1.0,  rare: false, likes: ['shrimp', 'worm'],       shape: 'carp',      tireMax: 3, wMin: 8.0,  wMax: 20.0, lMin: 60,  lMax: 120 },
  { id: 'tramtrang', name: 'Cá trắm trắng', bodyCol: '#e0e8f0', bellyCol: '#ffffff', backCol: '#8090a0', finCol: '#a8b0b8', size: 28, speed: 1.5, rarity: 16,  value: 450,   strength: 1.4, minD: 0.3,  maxD: 0.9,  rare: false, likes: ['worm', 'shrimp'],       shape: 'carp',      tireMax: 2, wMin: 3.0,  wMax: 12.0, lMin: 40,  lMax: 90  },
];

// ===== 5 Worlds — mỗi world có 1 boss iconic =====
const WORLDS = [
  { id: 'pond',        name: 'Hồ Làng',          desc: 'Nước ngọt — cá nhỏ cho người mới', unlockAt: 0,     boss: null,      skyTop: '#6ab0ff', skyBot: '#b0dfff', waterTop: '#3a90c0', waterBot: '#0a3060', spawns: ['tri', 'ro', 'vang', 'hong'] },
  { id: 'island',      name: 'Đảo Hoang (Sinh Tồn)', desc: 'MIỄN PHÍ — ăn cá để không đói!', unlockAt: 0, boss: null, skyTop: '#f0b080', skyBot: '#ffe0a0', waterTop: '#4080a8', waterBot: '#0a1840', spawns: ['tri', 'ro', 'vang', 'hong', 'me', 'mevinh', 'tre', 'chep'] },
  { id: 'mekong',      name: 'Sông Mekong',      desc: 'BOSS: Cá Nheo khổng lồ',           unlockAt: 500,   boss: 'nheo',    skyTop: '#7fbfa0', skyBot: '#c0e0a0', waterTop: '#4a8a5a', waterBot: '#0a3020', spawns: ['hong', 'tre', 'loc', 'xanh', 'mevinh', 'tramtrang'] },
  { id: 'amazon',      name: 'Sông Amazon',      desc: 'BOSS: Cá Hồng Vĩ đuôi đỏ + Cá lóc bông', unlockAt: 5000, boss: 'hongvi', skyTop: '#5a7040', skyBot: '#a0c080', waterTop: '#3a6a40', waterBot: '#0a200a', spawns: ['tre', 'loc', 'nheo', 'xanh', 'locbong'] },
  { id: 'mississippi', name: 'Đầm Mississippi',  desc: 'BOSS: Cá Sấu Hỏa Tiển',            unlockAt: 25000, boss: 'sau',     skyTop: '#b0a070', skyBot: '#d0c080', waterTop: '#6a5a30', waterBot: '#201810', spawns: ['nheo', 'hongvi', 'map', 'duoi'] },
  { id: 'primal',      name: 'Biển Cổ Đại',      desc: 'BOSS: Cá Hải Tượng + Cá Rồng',     unlockAt: 100000, boss: 'haituong', skyTop: '#7a4ad0', skyBot: '#d0a0ff', waterTop: '#4a2080', waterBot: '#10052a', spawns: ['haituong', 'sau', 'rong', 'map', 'vangthan'] },
  { id: 'bigpond',     name: 'Hồ Lớn Bắc Bộ',    desc: 'BOSS: Cá Lóc Bông 600kg + Cá Mè',  unlockAt: 250000,  boss: 'locbong',  skyTop: '#90b8d0', skyBot: '#e0f0f0', waterTop: '#4a80a8', waterBot: '#0a2040', spawns: ['me', 'tram', 'chep', 'tre', 'nheo', 'mevinh', 'tramden', 'tramtrang', 'locbong'] },
  { id: 'ocean',       name: 'Biển Khơi Sâu',    desc: 'BOSS: Cá Mập Trắng 900kg + quái',  unlockAt: 1000000, boss: 'maptrang', skyTop: '#2a5080', skyBot: '#6090b8', waterTop: '#1a4870', waterBot: '#02081a', spawns: ['map', 'mapbo', 'maptrang', 'mukhong', 'kiem', 'ngu', 'mat', 'voi', 'duoi'] },
];
let currentWorld = 'pond';
let ownedWorlds = ['pond', 'island']; // các thế giới đã mở khóa (pond + island free)
let hunger = 100; // 0..100 — khi đói thì giảm sức câu
function worldObj() { return WORLDS.find(w => w.id === currentWorld); }

// ===== State =====
let state = 'idle'; // idle, charging, casting, fishing, fighting, broken
let money = 50000;
let caughtCount = 0;
let rareCount = 0;
let ownedRods = [0]; // indexes of owned rods
let currentRod = 0;
let ownedBaits = ['worm'];
let currentBait = 'worm';
const net = { active: false, x: 0, y: 0, phase: 0 };

const player = { x: 120, y: 0 };
const rod = { angle: -Math.PI / 3.5, power: 0, powerDir: 1, tipX: 0, tipY: 0 };
const bobber = { x: 0, y: 0, visible: false, bobPhase: 0, wobble: 0 };
const boat = { phase: 0 };
const hook = {
  x: 0, y: 0, vx: 0, vy: 0,
  targetX: 0, targetY: 0, // for resting position
  inAir: false, onFish: null,
  biteT: 0, // bite progress when fish near
  depth: 0, // depth factor
};

const fishes = [];
const particles = [];
const bubbles = [];
const treasures = [];

// ===== NPC fishermen — đã bỏ 2 nhân vật (Bác Tư, Cô Năm) theo yêu cầu =====
const NPCS = [];
function npcBaseXY(npc) {
  // y = chân (deck level)
  return { x: W * npc.baseRatio, y: H - 22 + Math.sin(boat.phase + (npc.id === 'n2' ? 0.7 : 0.3)) * 3 };
}
function npcRodAnchor(npc) {
  // Vị trí tay cầm cần (vai NPC)
  const b = npcBaseXY(npc);
  return { x: b.x, y: b.y - 70 };
}
function npcRodTip(npc) {
  const a = npcRodAnchor(npc);
  const len = Math.min(180, W * 0.21);
  return { x: a.x + Math.cos(npc.rodAngle) * len, y: a.y + Math.sin(npc.rodAngle) * len };
}

const TREASURE_KINDS = {
  // Floating (mặt nước)
  bottle:       { floating: true,  label: 'Chai thông điệp',  valMin: 50,     valMax: 500,     color: '#6aa0c0' },
  woodchest:    { floating: true,  label: 'Rương gỗ nổi',      valMin: 500,    valMax: 2500,    color: '#8a5a20' },
  barrel:       { floating: true,  label: 'Thùng cổ nổi',      valMin: 1500,   valMax: 5000,    color: '#6a3a10' },
  // Bottom (đáy biển) — xịn hơn
  goldchest:    { floating: false, label: 'Rương vàng',        valMin: 5000,   valMax: 25000,   color: '#ffd040' },
  ancient:      { floating: false, label: 'Bình cổ',           valMin: 15000,  valMax: 60000,   color: '#a06040' },
  diamondchest: { floating: false, label: 'Rương kim cương',   valMin: 80000,  valMax: 250000,  color: '#80ffff' },
  mythic:       { floating: false, label: 'Rương thần thoại',  valMin: 500000, valMax: 2000000, color: '#ff40ff' },
};

let tension = 0;
let reelDist = 0; // how close fish is to shore (0=hooked start, 1=caught)
let biteFishCandidate = null;

let time = 0; // game time for day/night
const DAY_CYCLE = 180; // seconds for full day

// ===== Geometry helpers =====
function waterLevelY() {
  // Điện thoại dọc: kéo đường nước lên cao cho không gian nước rộng hơn
  const aspect = W / H;
  if (aspect < 0.7) return H * 0.22;   // phone portrait
  if (aspect < 1.0) return H * 0.28;   // narrow
  return H * 0.35;                      // desktop / landscape
}
function bottomY() {
  const aspect = W / H;
  if (aspect < 0.7) return H - 28;      // phone: boat mép mỏng hơn
  return H - 40;
}

function rodBaseXY() {
  // Trên điện thoại dọc: đưa tay/cần lên cao hơn trong khung, để nước rộng
  const aspect = W / H;
  const baseY = aspect < 0.7 ? 0.9 : 0.82;
  return { x: W * 0.22, y: H * baseY + Math.sin(boat.phase) * 4 };
}
function getRodTip() {
  const rodLen = Math.min(260, W * 0.32);
  const b = rodBaseXY();
  rod.tipX = b.x + Math.cos(rod.angle) * rodLen;
  rod.tipY = b.y + Math.sin(rod.angle) * rodLen;
  return { x: rod.tipX, y: rod.tipY };
}

// ===== Game actions =====
function onPress() {
  if (shopEl.classList.contains('show')) return;
  if (state === 'idle') {
    state = 'charging';
    rod.power = 0;
    rod.powerDir = 1;
    powerWrap.classList.add('show');
    hintBar.innerHTML = 'Di chuyển chuột để ngắm hướng · Thả <b>CHUỘT</b> khi lực đầy để quăng xa';
  } else if (state === 'fishing' && biteFishCandidate && hook.biteT > 0.7) {
    // attempted catch
    engageFish(biteFishCandidate);
  } else if (state === 'fighting') {
    // reeling — handled in update while mouse.down
    mouse.down = true;
  }
  mouse.down = true;
}

function onRelease() {
  mouse.down = false;
  if (state === 'charging') {
    const r = RODS[currentRod];
    const p = rod.power;
    // Chạm nhẹ (chưa lấy đủ lực) thì KHÔNG quăng — tránh "lỡ tay" ra dây.
    if (p < 0.08) {
      state = 'idle';
      powerWrap.classList.remove('show');
      hintBar.innerHTML = 'Giữ lâu hơn để lấy lực rồi thả tay mới quăng được';
      return;
    }
    // Cap cast speed + hunger penalty
    const rawSpeed = lerp(6, r.maxPower, p) * hungerMult();
    const speed = Math.min(30, rawSpeed);
    // Cast direction follows mouse cursor position relative to rod base
    const base = rodBaseXY();
    let ang = Math.atan2(mouse.y - base.y, mouse.x - base.x);
    // Clamp so rod casts up-outward toward water, not behind
    ang = clamp(ang, -Math.PI * 0.85, -0.08);
    rod.angle = ang;
    getRodTip();
    hook.x = rod.tipX;
    hook.y = rod.tipY;
    hook.vx = Math.cos(ang) * speed;
    hook.vy = Math.sin(ang) * speed * 0.9;
    hook.inAir = true;
    hook.onFish = null;
    state = 'casting';
    powerWrap.classList.remove('show');
    hintBar.textContent = 'Đang quăng cần...';
  }
}

function engageFish(fish) {
  fish.onHook = true;
  fish.tiredness = 0;
  fish.tireCount = 0;
  fish.readyToScoop = false;
  fish.recoveryT = 0;
  fish.tired = false;
  fish.struggling = true;
  fish.struggleT = rand(40, 80);
  hook.onFish = fish;
  state = 'fighting';
  biteAlert.classList.remove('show');
  tensionWrap.classList.add('show');
  tension = 0;
  reelDist = 0;
  const tm = fish.type.tireMax;
  hintBar.innerHTML = `Kéo đến đầy thanh xanh · Cá này phải mệt <b>${tm}</b> lần → khi KIỆT SỨC bấm <b>VỚT CÁ</b>`;
}

function lineSnap() {
  if (typeof godMode !== 'undefined' && godMode) { tension = 0; return; }
  state = 'broken';
  if (hook.onFish) hook.onFish.onHook = false;
  hook.onFish = null;
  tensionWrap.classList.remove('show');
  tension = 0;
  showToast('Dây câu đứt! Cá thoát mất 😢');
  setTimeout(resetToIdle, 900);
}

function resetToIdle() {
  state = 'idle';
  hook.inAir = false;
  hook.onFish = null;
  biteFishCandidate = null;
  hook.biteT = 0;
  tension = 0;
  reelDist = 0;
  bobber.visible = false;
  net.active = false;
  tensionWrap.classList.remove('show');
  biteAlert.classList.remove('show');
  tiredBadge.classList.remove('show');
  scoopLabel.classList.remove('show');
  hintBar.innerHTML = 'Chạm & giữ màn hình ngắm hướng — thả tay để quăng cần';
}

let pendingCatch = null; // { value, weightKg, name } — chờ user chọn bán hay nấu
function catchFish(fish) {
  caughtCount++;
  if (fish.type.rare) rareCount++;
  const t = fish.type;
  const weightRaw = rand(t.wMin, t.wMax);
  const weightKg = Math.round(weightRaw * 10) / 10;
  const normWeight = (weightRaw - t.wMin) / Math.max(0.1, t.wMax - t.wMin);
  const valueMult = 0.75 + normWeight * 0.8;
  const value = Math.floor(t.value * valueMult);
  const lenCm = Math.floor(lerp(t.lMin, t.lMax, normWeight * 0.8 + Math.random() * 0.2));
  const foodPts = Math.min(90, 10 + Math.sqrt(weightRaw) * 5);
  catchName.textContent = t.name;
  const lenDisplay = lenCm >= 100 ? (lenCm / 100).toFixed(lenCm >= 1000 ? 0 : 1) + ' m' : lenCm + ' cm';
  catchSize.textContent = `Cân nặng: ${weightKg}kg · Dài: ${lenDisplay}`;
  catchReward.textContent = '💰 Bán: +' + value + 'đ  ·  🍖 Nấu: +' + Math.floor(foodPts) + ' đói';
  pendingCatch = { value, foodPts: Math.floor(foodPts), name: t.name };
  catchPopup.classList.add('show');
  const idx = fishes.indexOf(fish);
  if (idx >= 0) fishes.splice(idx, 1);
}

// ===== Fish spawn / AI =====
function pickFishType() {
  const world = worldObj();
  const bait = BAITS.find(b => b.id === currentBait);
  // Admin force boss next
  if (typeof forceNextBoss !== 'undefined' && forceNextBoss && world.boss) {
    forceNextBoss = false;
    const b = FISH_TYPES.find(f => f.id === world.boss);
    if (b) return b;
  }
  // 12% chance boss spawn (if world has one)
  if (world.boss && Math.random() < 0.12) {
    const bossT = FISH_TYPES.find(f => f.id === world.boss);
    if (bossT) return bossT;
  }
  // Filter to fish in this world only
  const pool = FISH_TYPES.filter(f => world.spawns.includes(f.id) || f.id === world.boss);
  const weights = pool.map(f => {
    let w = f.rarity;
    if (f.likes.includes(currentBait)) w *= 2.5;
    if (f.rare && bait) w *= (1 + bait.attractsRare);
    if (f.id === world.boss) w *= 0.3; // bosses rarer via weighted pool (boss channel handles them)
    return w;
  });
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    if (r < weights[i]) return pool[i];
    r -= weights[i];
  }
  return pool[0] || FISH_TYPES[0];
}

function spawnTreasure() {
  // Don't spawn too many
  if (treasures.length >= 8) return;
  const floatingCount = treasures.filter(t => t.floating).length;
  const bottomCount = treasures.length - floatingCount;
  // Balance 50/50 roughly
  const wantFloating = floatingCount < bottomCount || (floatingCount === bottomCount && Math.random() < 0.5);
  let kind;
  if (wantFloating) {
    const opts = ['bottle', 'bottle', 'woodchest', 'barrel'];
    kind = opts[Math.floor(Math.random() * opts.length)];
  } else {
    // Tier by world
    const w = worldObj();
    const tier = WORLDS.indexOf(w);
    const pools = [
      ['goldchest'],                                  // pond
      ['goldchest', 'ancient'],                       // mekong
      ['ancient', 'diamondchest'],                    // amazon
      ['diamondchest', 'ancient', 'mythic'],          // mississippi
      ['diamondchest', 'mythic', 'mythic'],           // primal
      ['goldchest', 'ancient', 'diamondchest'],       // bigpond
      ['diamondchest', 'mythic', 'mythic', 'ancient'],// ocean
    ];
    const pool = pools[tier] || pools[0];
    kind = pool[Math.floor(Math.random() * pool.length)];
  }
  const def = TREASURE_KINDS[kind];
  const val = Math.floor(rand(def.valMin, def.valMax));
  if (def.floating) {
    // Lơ lửng ở tầng nước giữa (30-60% độ sâu)
    const depthT = rand(0.3, 0.6);
    const midY = waterLevelY() + (bottomY() - waterLevelY()) * depthT;
    treasures.push({
      kind, def, val, floating: true,
      x: rand(W * 0.28, W - 25),
      y: midY,
      baseY: midY,
      bob: rand(0, Math.PI * 2),
      vx: rand(-0.25, 0.25),
    });
  } else {
    treasures.push({
      kind, def, val, floating: false,
      x: rand(W * 0.28, W - 25),
      y: bottomY() - 16,
    });
  }
}

function spawnFish() {
  if (fishes.length >= 14) return;
  const type = pickFishType();
  const fromLeft = Math.random() < 0.5;
  const waterY = waterLevelY();
  const bottom = bottomY();
  const depthRange = bottom - waterY;
  const depth = rand(type.minD, type.maxD);
  const y = waterY + 30 + depth * (depthRange - 50);
  const x = fromLeft ? -60 : W + 60;
  const dir = fromLeft ? 1 : -1;
  fishes.push({
    x, y, type, dir,
    speed: type.speed * rand(0.7, 1.25),
    bob: rand(0, Math.PI * 2),
    interest: 0, onHook: false, biteCooldown: rand(80, 200),
    size: type.size, struggleT: 0,
    stamina: 100, tired: false, tiredT: 0, struggling: false,
    fleeDx: 0, fleeDy: 0,
  });
}

// ===== Update =====
function update(dt) {
  time += dt;
  // Đói giảm dần theo thời gian — nhanh hơn khi đang câu
  const hungerDecay = (state === 'fishing' || state === 'fighting') ? 0.6 : 0.3;
  hunger = Math.max(0, hunger - dt * hungerDecay);
  if (hungerFill) {
    hungerFill.style.width = hunger + '%';
    hungerLabel.textContent = Math.floor(hunger);
  }

  // Occasionally spawn fish
  if (Math.random() < 0.02 && fishes.length < 12) spawnFish();

  // Treasures — spawn dày hơn + respawn nhanh khi ít
  if (treasures.length < 3) { if (Math.random() < 0.05) spawnTreasure(); }
  else if (Math.random() < 0.012 && treasures.length < 8) spawnTreasure();
  for (let i = treasures.length - 1; i >= 0; i--) {
    const tr = treasures[i];
    if (tr.floating) {
      tr.bob += 0.03;
      // Lơ lửng ở tầng nước giữa, trôi nhẹ lên xuống
      tr.y = tr.baseY + Math.sin(tr.bob) * 8;
      tr.x += tr.vx;
      if (tr.x < W * 0.25) tr.vx = Math.abs(tr.vx);
      if (tr.x > W - 40) tr.vx = -Math.abs(tr.vx);
    }
    // Collision with hook
    const d = Math.hypot(hook.x - tr.x, hook.y - tr.y);
    if (d < 32 && (state === 'fishing' || state === 'casting')) {
      // Collect
      money += tr.val;
      updateHUD();
      showToast((tr.def.floating ? '🪣 ' : '📦 ') + tr.def.label + ' +' + tr.val.toLocaleString('vi-VN') + 'đ');
      // Particle burst
      const burstCol = tr.def.color;
      for (let p = 0; p < 24; p++) {
        particles.push({
          x: tr.x, y: tr.y,
          vx: rand(-5, 5), vy: rand(-7, -1),
          life: 50, col: p % 2 === 0 ? '#ffd040' : burstCol
        });
      }
      // Sparkle text "+N đ"
      for (let p = 0; p < 6; p++) {
        particles.push({ x: tr.x + rand(-8, 8), y: tr.y + rand(-10, 0), vx: 0, vy: -0.5, life: 60, col: '#ffcf5f' });
      }
      treasures.splice(i, 1);
    }
  }

  // Bubbles
  if (Math.random() < 0.1) {
    bubbles.push({ x: rand(200, W - 20), y: bottomY() - 10, vy: -rand(0.4, 0.9), r: rand(2, 4), life: 300 });
  }
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.y += b.vy; b.x += Math.sin(b.y * 0.03) * 0.3; b.life--;
    if (b.y < waterLevelY() || b.life <= 0) bubbles.splice(i, 1);
  }

  // Rod angle behavior per state
  const basePoint = rodBaseXY();
  if (state === 'idle') {
    const targetAng = Math.atan2(mouse.y - basePoint.y, mouse.x - basePoint.x);
    rod.angle = lerp(rod.angle, clamp(targetAng, -Math.PI * 0.7, -0.1), 0.15);
  } else if (state === 'casting' || state === 'fishing' || state === 'fighting') {
    const targetAng = Math.atan2(hook.y - basePoint.y, hook.x - basePoint.x);
    const clamped = clamp(targetAng, -Math.PI * 0.6, 0);
    rod.angle = lerp(rod.angle, clamped, state === 'fighting' ? 0.2 : 0.1);
  }
  // Boat gentle bobbing
  boat.phase += 0.02;

  // Charging
  if (state === 'charging') {
    rod.power += rod.powerDir * 0.022;
    if (rod.power >= 1) { rod.power = 1; rod.powerDir = -1; }
    if (rod.power <= 0) { rod.power = 0; rod.powerDir = 1; }
    powerFill.style.width = (rod.power * 100) + '%';
    // Rod angle pulls back as charging
    rod.angle = lerp(rod.angle, -Math.PI * 0.75, 0.1);
  }

  // Casting - hook in air
  if (state === 'casting') {
    hook.x += hook.vx;
    hook.y += hook.vy;
    hook.vy += 0.45; // gravity
    bobber.visible = false;
    // Clamp hook in ngang trong màn hình để không bay mất
    if (hook.x > W - 30) { hook.x = W - 30; hook.vx = 0; }
    if (hook.x < rodBaseXY().x + 40) hook.x = rodBaseXY().x + 40;
    // hit water?
    if (hook.y >= waterLevelY()) {
      // splash
      for (let i = 0; i < 16; i++) {
        particles.push({ x: hook.x, y: waterLevelY(), vx: rand(-3, 3), vy: rand(-5, -1), life: 30, col: '#a0c4e0' });
      }
      state = 'fishing';
      hook.y = waterLevelY() + 2;
      hook.vx = 0;
      hook.vy = 1.2;
      hook.inAir = false;
      // Phao chỉ dùng khi là mồi sống (giun/tôm). Mồi giả (nhái/kim loại/vàng) không có phao.
      const useBobber = currentBait === 'worm' || currentBait === 'shrimp';
      bobber.visible = useBobber;
      if (useBobber) {
        bobber.x = hook.x;
        bobber.y = waterLevelY();
        bobber.bobPhase = 0;
        bobber.wobble = 0;
      }
      hintBar.innerHTML = 'Chờ cá cắn câu... Giữ <b>THU DÂY</b> lâu để quăng lại';
    }
    if (hook.y > H) { resetToIdle(); }
  }

  // Fishing - hook in water, sink; bobber stays on surface
  if (state === 'fishing') {
    const tipP = getRodTip();
    const dx = hook.x - tipP.x, dy = hook.y - tipP.y;
    const lineDist = Math.hypot(dx, dy) || 1;
    const dirX = dx / lineDist, dirY = dy / lineDist;
    const MAX_LINE = 1400;
    const r = RODS[currentRod];

    // Manual line control (reel in / let out)
    if (lineIO.reel) {
      const rate = Math.min(24, r.reelSpeed * 700) * hungerMult();
      const newDist = Math.max(0, lineDist - rate);
      hook.x = tipP.x + dirX * newDist;
      hook.y = tipP.y + dirY * newDist;
      // Cho phép lưỡi câu ra khỏi nước khi thu
      hook.y = Math.min(hook.y, bottomY() - 10);
      if (newDist < 30) {
        resetToIdle();
        showToast('Đã thu dây — sẵn sàng quăng lại');
        return;
      }
    } else if (lineIO.letout) {
      const rate = 3;
      if (lineDist < MAX_LINE) {
        const outDirY = Math.max(0.3, dirY);
        hook.x += dirX * rate;
        hook.y += outDirY * rate;
      }
      hook.y = clamp(hook.y, waterLevelY() - 10, bottomY() - 10);
    } else {
      const b = BAITS.find(x => x.id === currentBait);
      const sinkRate = (b ? b.sinkSpeed : 0.5) * 0.55;
      // Rơi xuống chạm đáy (chỉ cách sand vài pixel)
      if (hook.y < bottomY() - 4) hook.y += sinkRate;
      hook.x += Math.sin(time * 2) * 0.15;
      hook.y = clamp(hook.y, waterLevelY() - 10, bottomY() - 3);
    }

    // update line length UI
    lineLenFill.style.width = Math.min(100, (lineDist / MAX_LINE) * 100) + '%';

    // bobber on surface above hook (only if live bait)
    if (bobber.visible) {
      bobber.x = hook.x;
      bobber.bobPhase += 0.08;
      bobber.y = waterLevelY() + Math.sin(bobber.bobPhase) * 2 + bobber.wobble;
      bobber.wobble *= 0.9;
    }
    hook.vy = 0;

    // Fish interest logic
    biteFishCandidate = null;
    let bestDist = 150;
    for (const f of fishes) {
      if (f.onHook) continue;
      const d = Math.hypot(f.x - hook.x, f.y - hook.y);
      if (d < bestDist) {
        bestDist = d;
        biteFishCandidate = f;
      }
    }

    if (biteFishCandidate) {
      const f = biteFishCandidate;
      const d = Math.hypot(f.x - hook.x, f.y - hook.y);
      const likesIt = f.type.likes.includes(currentBait);
      // Frog lure only attracts big fish (size >= 28)
      const ignoredByBait = currentBait === 'frog' && f.type.size < 28;
      const baitBoost = ignoredByBait ? 0 : (likesIt ? 2.2 : 0.6);
      if (ignoredByBait) biteFishCandidate = null;
      if (!ignoredByBait && d < 150) {
        f.interest = Math.min(1, f.interest + 0.008 * baitBoost);
        const approachSpeed = f.speed * 0.6 * f.interest;
        const dx = hook.x - f.x, dy = hook.y - f.y;
        const ln = d || 1;
        f.x += dx / ln * approachSpeed;
        f.y += dy / ln * approachSpeed;
        f.dir = dx > 0 ? 1 : -1;
      }
      if (d < 35 && f.interest > 0.6) {
        hook.biteT += 0.015;
        bobber.wobble = Math.sin(time * 20) * (4 + hook.biteT * 6);
        if (hook.biteT > 0.25 && !biteAlert.classList.contains('show')) {
          biteAlert.classList.add('show');
        }
        if (hook.biteT > 1) {
          engageFish(f);
        }
      } else {
        hook.biteT = Math.max(0, hook.biteT - 0.005);
        if (hook.biteT < 0.1) biteAlert.classList.remove('show');
      }
    } else {
      hook.biteT = Math.max(0, hook.biteT - 0.01);
      biteAlert.classList.remove('show');
    }
  }

  // Fighting - pulling fish in
  if (state === 'fighting' && hook.onFish) {
    const f = hook.onFish;
    const r = RODS[currentRod];
    // Cá ĐÃ cắn câu → mồi nằm trong MIỆNG cá → cá BÁM DÍNH vào lưỡi câu.
    // Hoảng loạn = rung/giật NHẸ tại chỗ (miệng luôn ở ngay lưỡi), còn chuyển
    // động lớn là do cá kéo cả lưỡi+dây chạy (xử lý ở phần flee bên dưới).
    f.bob += 0.05;
    const jitter = f.tired ? 1 : (f.struggling ? 4 : 2);
    // Miệng cá = vị trí lưỡi câu; thân cá rung quanh đó một chút cho có cảm giác giãy.
    f.x = hook.x + Math.sin(time * 26 + f.bob) * jitter;
    f.y = hook.y + Math.sin(time * 19 + f.bob) * jitter * 0.6;

    // Multi-cycle tiredness: fish must be fully tired (tireMax) times
    if (f.tiredness === undefined) {
      f.tiredness = 0; f.tired = false; f.tireCount = 0;
      f.readyToScoop = false; f.recoveryT = 0;
    }
    const reelingNow = mouse.down || lineIO.reel;

    if (f.readyToScoop) {
      // Final exhaustion — stays tired, no recovery
    } else if (f.recoveryT > 0) {
      // Fish is momentarily winded, drifts up a bit, then struggles again
      f.recoveryT--;
      if (f.recoveryT <= 0) {
        f.tiredness = 30; // not from zero, easier each time
        f.tired = false;
        f.struggling = true;
        f.struggleT = rand(50, 100);
        showToast('Cá hồi phục! ' + f.tireCount + '/' + f.type.tireMax);
      }
    } else if (!f.tired) {
      if (reelingNow) {
        // Drain tuned. Cap at 3/frame so big fish still take time.
        const rawDrain = (0.35 + Math.min(0.1, r.reelSpeed) * 15) * (f.struggling ? 0.65 : 1.3) / Math.max(1.0, f.type.strength * 0.5);
        const drain = Math.min(3, rawDrain);
        f.tiredness = Math.min(100, f.tiredness + drain);
      } else {
        f.tiredness = Math.max(0, f.tiredness - 0.08);
      }
      if (f.tiredness >= 100) {
        f.tireCount++;
        f.struggling = false;
        if (f.tireCount >= f.type.tireMax) {
          f.readyToScoop = true;
          f.tired = true;
          showToast('🥱 CÁ KIỆT SỨC — VỚT NGAY!');
        } else {
          // Brief breather — fish resumes fighting after
          f.tired = true;
          f.recoveryT = 70;
        }
      }
    }

    // Behaviour cycle — only when not tired
    if (!f.tired) {
      f.struggleT -= 1;
      if (f.struggleT <= 0) {
        const flee = Math.random() < 0.75;
        f.struggling = flee;
        f.struggleT = flee ? rand(40, 100) : rand(20, 55);
        if (flee) {
          // Cá chạy TRÁNH XA đầu cần (ngược hướng reel), pha thêm chút góc
          const tipP = getRodTip();
          const awayX = hook.x - tipP.x;
          const awayY = hook.y - tipP.y;
          const aLen = Math.hypot(awayX, awayY) || 1;
          const angle = rand(-0.6, 0.6); // xoay ±35° so với hướng thẳng ra xa
          const cosA = Math.cos(angle), sinA = Math.sin(angle);
          const nx = awayX / aLen, ny = awayY / aLen;
          // Lệch xuống một chút để cá có xu hướng xuống sâu
          let fdx = nx * cosA - ny * sinA;
          let fdy = nx * sinA + ny * cosA + 0.35;
          const fl = Math.hypot(fdx, fdy) || 1;
          f.fleeDx = fdx / fl; f.fleeDy = fdy / fl;
        } else {
          // Nghỉ: chỉ drift nhẹ
          f.fleeDx = rand(-0.2, 0.2); f.fleeDy = 0.25;
        }
      }
    } else {
      f.struggling = false;
      f.fleeDx = 0; f.fleeDy = -0.25;
    }

    // reel in while mouse held
    const tipP = getRodTip();
    const toTipX = tipP.x - hook.x, toTipY = tipP.y - hook.y;
    const distToTip = Math.hypot(toTipX, toTipY);

    // Fish pulls — mạnh hơn khi chạy trốn, đặc biệt khi player reel (cá phản ứng)
    const reelingForResistance = (mouse.down || lineIO.reel);
    // +1.2 nền để cá NHỎ cũng vùng chạy rõ ràng (trước đây cá yếu gần như đứng im)
    const baseFleePower = 1.2 + f.type.strength * 0.9;
    let fleeMult = f.struggling ? 1.8 : 0.35;
    if (f.struggling && reelingForResistance) fleeMult *= 1.35; // cá giật ngược khi bị kéo
    const fishPullX = f.fleeDx * baseFleePower * fleeMult;
    const fishPullY = f.fleeDy * baseFleePower * fleeMult;
    hook.x += fishPullX;
    hook.y += fishPullY;

    const reeling = mouse.down || lineIO.reel;
    const lettingOut = lineIO.letout && !reeling;

    if (reeling) {
      // Khi cá đang chạy trốn mạnh → reel gần như không hiệu quả (bạn chỉ giữ dây)
      // Khi cá nghỉ/mệt → reel kéo cá về tốt
      let reelBoost;
      if (f.readyToScoop) reelBoost = 2.0;
      else if (f.recoveryT > 0) reelBoost = 1.4;
      else if (f.struggling) reelBoost = 0.25;   // cá đang giật — gần như không vào
      else reelBoost = 0.9;                       // cá đang lững lờ — reel thoải mái
      const reelPower = Math.min(14, r.reelSpeed * 720 * reelBoost * hungerMult());
      hook.x += (toTipX / (distToTip || 1)) * reelPower;
      hook.y += (toTipY / (distToTip || 1)) * reelPower;
      if (f.readyToScoop || f.recoveryT > 0) {
        tension = Math.max(0, tension - 0.02);
      } else {
        tension += (0.008 + f.type.strength * 0.009) * (f.struggling ? 1.6 : 0.55) / r.strength;
      }
    } else if (lettingOut) {
      // giving slack — tension drops fast, fish runs freely
      tension -= 0.025;
    } else {
      tension -= 0.015;
    }

    // KHÔNG cho hook dí sát đầu cần khi cá chưa kiệt sức — giữ khoảng cách tối thiểu
    const minDist = f.readyToScoop ? 30 : (f.recoveryT > 0 ? 90 : 140);
    const distNow = Math.hypot(hook.x - tipP.x, hook.y - tipP.y);
    if (distNow < minDist) {
      const dirX = distNow > 0 ? (hook.x - tipP.x) / distNow : 0;
      const dirY = distNow > 0 ? (hook.y - tipP.y) / distNow : 0.5;
      hook.x = tipP.x + dirX * minDist;
      hook.y = tipP.y + dirY * minDist;
    }
    // Constrain hook within water
    hook.y = clamp(hook.y, waterLevelY() - 20, bottomY() - 10);
    hook.x = clamp(hook.x, player.x + 40, W - 20);

    // bobber follows hook on surface (only if visible)
    if (bobber.visible) {
      bobber.x = hook.x;
      const pullUnder = Math.max(0, (hook.y - waterLevelY()) * 0.08);
      bobber.y = waterLevelY() + Math.min(pullUnder, 20) + Math.sin(time * 15) * 3;
    }

    tension = clamp(tension, 0, 1);
    tensionFill.style.height = (tension * 100) + '%';

    if (tension >= 1) { lineSnap(); return; }

    // Show scoop label only when fully exhausted (readyToScoop)
    if (f.readyToScoop) {
      tiredBadge.classList.add('show');
      scoopLabel.classList.add('show');
      scoopLabel.style.left = f.x + 'px';
      scoopLabel.style.top = (f.y - 40) + 'px';
    } else {
      tiredBadge.classList.remove('show');
      scoopLabel.classList.remove('show');
    }

    // Net swing catches instantly when fish fully exhausted
    if (net.active && f.readyToScoop) {
      const dn = Math.hypot(hook.x - net.x, hook.y - net.y);
      if (dn < 120) {
        catchFish(f);
        hook.onFish = null;
        state = 'idle';
        tensionWrap.classList.remove('show');
        biteAlert.classList.remove('show');
        tiredBadge.classList.remove('show');
        scoopLabel.classList.remove('show');
        bobber.visible = false;
        net.active = false;
      }
    }
  }

  // Fish free roaming
  for (const f of fishes) {
    if (f.onHook) continue;
    f.bob += 0.04;
    f.x += f.dir * f.speed * 0.9;
    f.y += Math.sin(f.bob) * 0.35;
    // Clamp depth
    const waterY = waterLevelY();
    f.y = clamp(f.y, waterY + 20, bottomY() - 15);
    // Turn around at edges
    if (f.x < -100 || f.x > W + 100) {
      const idx = fishes.indexOf(f);
      if (idx >= 0) fishes.splice(idx, 1);
    }
  }

  // Net swing animation
  if (net.active) {
    net.phase++;
    const tip = getRodTip();
    const t = net.phase / 50;
    if (t <= 1) {
      net.x = lerp(tip.x, hook.x, t);
      net.y = lerp(tip.y, hook.y, t);
    }
    if (net.phase >= 70) net.active = false;
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // NPC fishermen (cùng câu)
  updateNPCs(dt);

  // Update time of day display
  const hour = Math.floor((time / DAY_CYCLE) * 24) % 24;
  if (hour >= 5 && hour < 11) timeOfDayEl.textContent = 'Sáng ☀';
  else if (hour >= 11 && hour < 17) timeOfDayEl.textContent = 'Trưa 🌞';
  else if (hour >= 17 && hour < 20) timeOfDayEl.textContent = 'Chiều 🌅';
  else timeOfDayEl.textContent = 'Đêm 🌙';
}

// ===== NPC AI: cast / fish / catch / reel =====
function updateNPCs(dt) {
  for (const npc of NPCS) {
    npc.timer -= dt;
    if (npc.catchPop > 0) npc.catchPop -= dt;
    if (npc.failPop > 0) npc.failPop -= dt;

    if (npc.state === 'idle') {
      npc.rodAngle = lerp(npc.rodAngle, -1.0, 0.06);
      const tip = npcRodTip(npc);
      npc.hook.x = tip.x; npc.hook.y = tip.y;
      if (npc.timer <= 0) {
        npc.state = 'casting';
        npc.hook.x = tip.x; npc.hook.y = tip.y;
        const targetX = npc.baseRatio < 0.7 ? rand(W * 0.42, W * 0.7) : rand(W * 0.62, W - 30);
        const dx = targetX - tip.x;
        npc.hook.vx = dx * 0.024;
        npc.hook.vy = -7;
        npc.rodAngle = -Math.PI * 0.45;
      }
    } else if (npc.state === 'casting') {
      npc.hook.x += npc.hook.vx;
      npc.hook.y += npc.hook.vy;
      npc.hook.vy += 0.42;
      npc.rodAngle = lerp(npc.rodAngle, -0.6, 0.08);
      if (npc.hook.y >= waterLevelY()) {
        npc.hook.y = waterLevelY() + 2;
        npc.state = 'fishing';
        npc.timer = rand(5, 14);
        npc.biteT = 0;
        for (let i = 0; i < 8; i++) {
          particles.push({ x: npc.hook.x, y: waterLevelY(), vx: rand(-2, 2), vy: rand(-3, -1), life: 25, col: '#a0c4e0' });
        }
      }
    } else if (npc.state === 'fishing') {
      if (npc.hook.y < bottomY() - 30) npc.hook.y += 0.32;
      npc.rodAngle = lerp(npc.rodAngle, -0.55, 0.04);
      let candidate = null, bestD = 110;
      for (const f of fishes) {
        if (f.onHook) continue;
        const d = Math.hypot(f.x - npc.hook.x, f.y - npc.hook.y);
        const dPlayer = Math.hypot(f.x - hook.x, f.y - hook.y);
        const otherNpc = NPCS.find(n => n !== npc && n.state === 'fishing');
        const dOther = otherNpc ? Math.hypot(f.x - otherNpc.hook.x, f.y - otherNpc.hook.y) : 9999;
        if (d < bestD && d < dPlayer && d < dOther) { bestD = d; candidate = f; }
      }
      if (candidate) {
        candidate.x = lerp(candidate.x, npc.hook.x, 0.05);
        candidate.y = lerp(candidate.y, npc.hook.y, 0.05);
        npc.biteT += dt * 0.7;
        if (npc.biteT > 1.5) {
          // Cá đã cắn câu — bắt đầu vật lộn
          npc.state = 'fighting';
          npc.fightFish = candidate;
          npc.fightT = 0;
          // NPC stamina theo cần (cần xịn → NPC khoẻ hơn — y chang player)
          const rs = (RODS[currentRod] && RODS[currentRod].strength) || 1;
          npc.npcStamina = 100 + rs * 18;
          npc.npcStaminaMax = npc.npcStamina;
          npc.fishStamina = 60 + candidate.type.strength * 30 + candidate.type.size * 1.5;
          npc.fightDuration = 3 + candidate.type.strength * 4;
          candidate.onHook = true;
          npc.biteT = 0;
        }
      } else {
        npc.biteT = Math.max(0, npc.biteT - dt * 0.3);
      }
      if (npc.timer <= 0 && !candidate) {
        npc.state = 'reeling';
        npc.timer = 0.7;
      }
    } else if (npc.state === 'fighting') {
      const f = npc.fightFish;
      if (!f || fishes.indexOf(f) < 0) {
        npc.state = 'reeling';
        npc.fightFish = null;
        npc.timer = 0.6;
        return;
      }
      npc.fightT += dt;
      // Cần xịn → NPC ít hao stamina, cá kiệt nhanh hơn
      const rs = (RODS[currentRod] && RODS[currentRod].strength) || 1;
      const drainRateNpc = (4 + f.type.strength * 5) / Math.max(1, rs * 0.55);
      const drainRateFish = (6 + 4) * (0.7 + rs * 0.25);
      npc.npcStamina -= dt * drainRateNpc;
      npc.fishStamina -= dt * drainRateFish;
      // Cần rung lắc theo cá kéo
      const tug = Math.sin(time * (8 + f.type.strength * 3)) * (0.12 + f.type.strength * 0.04);
      npc.rodAngle = lerp(npc.rodAngle, -1.1 + tug, 0.15);
      // Cá kéo lưỡi câu lệch khỏi vị trí rod tip
      const tip = npcRodTip(npc);
      const pullDx = Math.sin(time * 7 + (npc.id === 'n2' ? 1.7 : 0)) * (12 + f.type.strength * 8);
      const pullDy = Math.abs(Math.sin(time * 5)) * (10 + f.type.strength * 6);
      npc.hook.x = lerp(npc.hook.x, tip.x + pullDx, 0.15);
      npc.hook.y = lerp(npc.hook.y, tip.y + 30 + pullDy, 0.15);
      // Cá bám lưỡi câu, vùng vẫy
      f.x = npc.hook.x + Math.sin(time * 9) * 6;
      f.y = npc.hook.y + Math.sin(time * 8) * 4;
      f.dir = pullDx > 0 ? -1 : 1;
      f.struggling = true;
      // Kết thúc
      if (npc.fishStamina <= 0 || npc.fightT >= npc.fightDuration) {
        // NPC thắng — bắt được cá
        const idx = fishes.indexOf(f);
        if (idx >= 0) fishes.splice(idx, 1);
        npc.catches++;
        npc.catchPop = 1.5;
        npc.lastCatchName = f.type.name;
        npc.state = 'reeling';
        npc.fightFish = null;
        npc.timer = 0.8;
        npc.rodAngle = -1.5; // giật mạnh khi bắt được
      } else if (npc.npcStamina <= 0) {
        // NPC kiệt — đứt dây, cá thoát
        f.onHook = false;
        f.struggling = false;
        f.x += rand(-30, 30);
        f.y += rand(20, 50);
        npc.failPop = 1.5;
        npc.failName = f.type.name;
        npc.state = 'reeling';
        npc.fightFish = null;
        npc.timer = 0.8;
      }
    } else if (npc.state === 'reeling') {
      const tip = npcRodTip(npc);
      npc.hook.x = lerp(npc.hook.x, tip.x, 0.18);
      npc.hook.y = lerp(npc.hook.y, tip.y, 0.18);
      npc.rodAngle = lerp(npc.rodAngle, -1.0, 0.12);
      if (npc.timer <= 0) {
        npc.state = 'idle';
        npc.timer = rand(2.5, 6);
      }
    }
  }
}

function drawNPCs() {
  const Vrod = (RODS[currentRod] && RODS[currentRod].v) ? RODS[currentRod].v : null;
  for (const npc of NPCS) {
    const b0 = npcBaseXY(npc);
    // Khi đang đánh cá: thân nghiêng theo hướng cá kéo
    let leanX = 0;
    if (npc.state === 'fighting' && npc.fightFish) {
      const tip = npcRodTip(npc);
      leanX = (npc.hook.x - tip.x) * 0.06;
      leanX = clamp(leanX, -8, 8);
    }
    const b = { x: b0.x + leanX * 0.3, y: b0.y };
    const headY = b.y - 95 + Math.abs(leanX) * 0.4;
    const headR = 14;
    const shoulderY = b.y - 75;
    const waistY = b.y - 35;
    const hipY = b.y - 30;
    const torsoW = 26;

    // Quan/chan (dark pants)
    ctx.fillStyle = '#2a2a35';
    ctx.fillRect(b.x - 11, hipY, 9, b.y - hipY);
    ctx.fillRect(b.x + 2, hipY, 9, b.y - hipY);
    // Giay
    ctx.fillStyle = '#0e0e10';
    ctx.beginPath(); ctx.ellipse(b.x - 7, b.y, 7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(b.x + 7, b.y, 7, 3.5, 0, 0, Math.PI * 2); ctx.fill();

    // Áo (torso)
    ctx.fillStyle = npc.color;
    ctx.beginPath();
    ctx.moveTo(b.x - torsoW / 2, shoulderY + 4);
    ctx.lineTo(b.x + torsoW / 2, shoulderY + 4);
    ctx.lineTo(b.x + torsoW / 2 + 2, hipY);
    ctx.lineTo(b.x - torsoW / 2 - 2, hipY);
    ctx.closePath(); ctx.fill();
    // Vai bo cong
    ctx.beginPath();
    ctx.ellipse(b.x, shoulderY + 4, torsoW / 2 + 1, 5, 0, Math.PI, 0);
    ctx.fill();
    // Belt
    ctx.fillStyle = '#5a3a10';
    ctx.fillRect(b.x - torsoW / 2 - 2, hipY - 4, torsoW + 4, 4);
    // Khoá thắt lưng
    ctx.fillStyle = '#d8b040';
    ctx.fillRect(b.x - 3, hipY - 4, 6, 4);

    // Cổ
    ctx.fillStyle = npc.skin;
    ctx.fillRect(b.x - 4, headY + 9, 8, 11);

    // Đầu
    ctx.fillStyle = npc.skin;
    ctx.beginPath(); ctx.arc(b.x, headY, headR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();

    // Tóc đỉnh dưới mũ
    ctx.fillStyle = '#1a1208';
    ctx.beginPath();
    ctx.arc(b.x, headY - 2, headR - 1, Math.PI, Math.PI * 2);
    ctx.fill();

    // Mũ
    ctx.fillStyle = npc.hatColor;
    ctx.beginPath();
    ctx.ellipse(b.x, headY - 11, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(b.x, headY - 13, 13, Math.PI, 0);
    ctx.fill();
    // Dải mũ
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(b.x - 13, headY - 11, 26, 2);

    // Mắt
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(b.x - 5, headY - 1, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(b.x + 5, headY - 1, 1.6, 0, Math.PI * 2); ctx.fill();
    // Mũi
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(b.x, headY + 3, 1.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    // Miệng
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.3;
    ctx.beginPath();
    if (npc.catchPop > 0) ctx.arc(b.x, headY + 6, 4, 0, Math.PI);
    else ctx.arc(b.x, headY + 6, 3.5, 0.3, Math.PI - 0.3);
    ctx.stroke();

    // Tay cầm cần (foreground arm — phía trước thân)
    const armRoot = npcRodAnchor(npc);
    const armLen = 26;
    const handX = armRoot.x + Math.cos(npc.rodAngle) * armLen;
    const handY = armRoot.y + Math.sin(npc.rodAngle) * armLen;
    // Vai áo
    ctx.fillStyle = npc.color;
    ctx.beginPath();
    ctx.ellipse(armRoot.x, armRoot.y, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cánh tay (da)
    ctx.strokeStyle = npc.skin;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(armRoot.x, armRoot.y);
    ctx.lineTo(handX, handY);
    ctx.stroke();
    // Bàn tay
    ctx.fillStyle = npc.skin;
    ctx.beginPath();
    ctx.arc(handX, handY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Tay còn lại đặt bên hông
    ctx.strokeStyle = npc.skin;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    const otherSign = (npc.baseRatio < 0.7) ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(armRoot.x + otherSign * 8, armRoot.y + 2);
    ctx.lineTo(armRoot.x + otherSign * 14, hipY - 4);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // ===== Cần câu (style giống cần player hiện tại) =====
    const tip = npcRodTip(npc);
    const rodColor = Vrod ? Vrod.rod : '#6a3a10';
    const rod2Color = Vrod ? Vrod.rod2 : '#aa6a30';
    const thick = Vrod ? Vrod.thick : 4;
    // Glow
    if (Vrod && Vrod.glow) {
      ctx.shadowColor = Vrod.glow;
      ctx.shadowBlur = 14;
    }
    // Outer
    ctx.strokeStyle = rodColor; ctx.lineWidth = thick + 2;
    ctx.beginPath(); ctx.moveTo(handX, handY); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    // Highlight
    ctx.strokeStyle = rod2Color; ctx.lineWidth = Math.max(1, thick - 1);
    ctx.beginPath(); ctx.moveTo(handX, handY); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    if (Vrod && Vrod.glow) ctx.shadowBlur = 0;
    // Eyelets dọc cần
    if (Vrod && Vrod.eyelets) {
      const segs = Vrod.eyelets;
      for (let i = 1; i <= segs; i++) {
        const t = i / (segs + 1);
        const ex = handX + (tip.x - handX) * t;
        const ey = handY + (tip.y - handY) * t;
        ctx.fillStyle = Vrod.reel || '#888';
        ctx.beginPath(); ctx.arc(ex, ey, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Reel ở chỗ tay cầm
    if (Vrod && Vrod.reel) {
      ctx.fillStyle = Vrod.reel;
      ctx.beginPath();
      ctx.arc(handX - Math.cos(npc.rodAngle) * 4, handY - Math.sin(npc.rodAngle) * 4 + 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = Vrod.reelCore || '#222';
      ctx.beginPath();
      ctx.arc(handX - Math.cos(npc.rodAngle) * 4, handY - Math.sin(npc.rodAngle) * 4 + 4, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dây + lưỡi câu + mồi (giống player)
    if (npc.state === 'casting' || npc.state === 'fishing' || npc.state === 'reeling' || npc.state === 'fighting') {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = npc.state === 'fighting' ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      // Dây cong khi fighting
      if (npc.state === 'fighting') {
        const midX = (tip.x + npc.hook.x) / 2 + Math.sin(time * 6) * 4;
        const midY = (tip.y + npc.hook.y) / 2 + 4;
        ctx.quadraticCurveTo(midX, midY, npc.hook.x, npc.hook.y);
      } else {
        ctx.lineTo(npc.hook.x, npc.hook.y);
      }
      ctx.stroke();
      // Hook + bait y chang player
      ctx.save();
      ctx.translate(npc.hook.x, npc.hook.y);
      ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(0, 4);
      ctx.arc(-3, 4, 3, 0, Math.PI);
      ctx.stroke();
      // Mồi: cùng loại player đang dùng
      drawBait(currentBait);
      ctx.restore();
      ctx.lineCap = 'butt';
      // Bite ripple
      if (npc.state === 'fishing' && npc.biteT > 0.3) {
        const r = (1 - (npc.biteT % 0.5) / 0.5) * 18;
        ctx.strokeStyle = `rgba(255,207,95,${Math.min(1, npc.biteT)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(npc.hook.x, waterLevelY(), r, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // Tên + đếm cá
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(npc.name + '  🐟' + npc.catches, b.x + 1, headY - 26);
    ctx.fillStyle = '#fff';
    ctx.fillText(npc.name + '  🐟' + npc.catches, b.x, headY - 27);

    // Thanh stamina khi đang đánh cá
    if (npc.state === 'fighting') {
      const barY = headY - 18;
      const barW = 50;
      // NPC stamina (vàng→đỏ)
      const npcMax = npc.npcStaminaMax || 100;
      const sn = clamp(npc.npcStamina / npcMax, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(b.x - barW / 2 - 1, barY - 1, barW + 2, 6);
      ctx.fillStyle = sn > 0.4 ? '#ffd060' : '#ff5050';
      ctx.fillRect(b.x - barW / 2, barY, barW * sn, 4);
      // Fish stamina (đỏ — kéo về 0 = bắt được)
      const fishMax = 60 + (npc.fightFish ? (npc.fightFish.type.strength * 30 + npc.fightFish.type.size * 1.5) : 0);
      const sf = clamp(npc.fishStamina / Math.max(1, fishMax), 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(b.x - barW / 2 - 1, barY + 6, barW + 2, 6);
      ctx.fillStyle = '#ff7060';
      ctx.fillRect(b.x - barW / 2, barY + 7, barW * sf, 4);
      // Nhãn cá
      if (npc.fightFish) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('⚔ ' + npc.fightFish.type.name, b.x, barY - 5);
      }
    }

    // Catch popup
    if (npc.catchPop > 0) {
      const a = Math.min(1, npc.catchPop / 1.5);
      const yOff = (1 - a) * 30;
      ctx.fillStyle = `rgba(255,207,95,${a})`;
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('+ ' + (npc.lastCatchName || 'Cá'), b.x, headY - 45 - yOff);
    }
    // Đứt dây popup
    if (npc.failPop > 0) {
      const a = Math.min(1, npc.failPop / 1.5);
      const yOff = (1 - a) * 30;
      ctx.fillStyle = `rgba(255,80,80,${a})`;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('💥 Đứt dây — ' + (npc.failName || 'Cá') + ' thoát', b.x, headY - 45 - yOff);
    }
    ctx.textAlign = 'start';
  }
}

// ===== Draw =====
function draw() {
  // Sky gradient — theo world + time of day
  const t = (time / DAY_CYCLE) % 1;
  const hour = (t * 24 + 6) % 24;
  const isDay = hour > 5 && hour < 20;
  const isDawn = hour > 4 && hour < 7;
  const isDusk = hour > 17 && hour < 20;
  const wld = worldObj();

  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  if (isDawn) { sky.addColorStop(0, '#ff8060'); sky.addColorStop(1, '#ffc080'); }
  else if (isDusk) { sky.addColorStop(0, '#ff6040'); sky.addColorStop(1, '#8060a0'); }
  else if (isDay) { sky.addColorStop(0, wld.skyTop); sky.addColorStop(1, wld.skyBot); }
  else { sky.addColorStop(0, '#0a1a3a'); sky.addColorStop(1, '#203060'); }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, waterLevelY());

  // Sun/moon
  const sunX = W * ((hour - 6) / 12);
  const sunY = waterLevelY() - Math.sin(((hour - 6) / 12) * Math.PI) * (H * 0.3);
  if (hour >= 6 && hour <= 18) {
    ctx.fillStyle = '#ffe070'; ctx.beginPath(); ctx.arc(sunX, sunY, 36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,150,0.25)'; ctx.beginPath(); ctx.arc(sunX, sunY, 56, 0, Math.PI * 2); ctx.fill();
  } else if (!isDay) {
    ctx.fillStyle = '#fff8c0'; ctx.beginPath(); ctx.arc(W * 0.8, H * 0.15, 24, 0, Math.PI * 2); ctx.fill();
    // stars
    for (let i = 0; i < 30; i++) {
      const sx = (i * 137) % W, sy = (i * 71) % (waterLevelY() * 0.8);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + Math.sin(time * 2 + i) * 0.3) + ')';
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  // Clouds
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 400 + time * 10) % (W + 400)) - 200;
    const cy = 60 + i * 25;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.arc(cx + 24, cy - 8, 22, 0, Math.PI * 2);
    ctx.arc(cx + 50, cy, 26, 0, Math.PI * 2);
    ctx.arc(cx + 70, cy + 6, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mountains
  ctx.fillStyle = '#4a6a7a';
  ctx.beginPath();
  ctx.moveTo(0, waterLevelY());
  for (let i = 0; i <= W; i += 80) {
    const h = 60 + Math.sin(i * 0.01) * 40 + Math.cos(i * 0.005) * 30;
    ctx.lineTo(i, waterLevelY() - h);
  }
  ctx.lineTo(W, waterLevelY()); ctx.fill();
  ctx.fillStyle = '#5a7a8a';
  ctx.beginPath();
  ctx.moveTo(0, waterLevelY());
  for (let i = 0; i <= W; i += 60) {
    const h = 30 + Math.sin(i * 0.02) * 20;
    ctx.lineTo(i, waterLevelY() - h);
  }
  ctx.lineTo(W, waterLevelY()); ctx.fill();

  // Water — theo world
  const water = ctx.createLinearGradient(0, waterLevelY(), 0, H);
  if (isDay) { water.addColorStop(0, wld.waterTop); water.addColorStop(1, wld.waterBot); }
  else { water.addColorStop(0, '#1a3a5a'); water.addColorStop(1, '#050a20'); }
  ctx.fillStyle = water;
  ctx.fillRect(0, waterLevelY(), W, H - waterLevelY());

  // Water surface waves
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= W; i += 20) {
    const wy = waterLevelY() + Math.sin(i * 0.05 + time * 3) * 2;
    if (i === 0) ctx.moveTo(i, wy); else ctx.lineTo(i, wy);
  }
  ctx.stroke();

  // Bubbles
  for (const b of bubbles) {
    ctx.fillStyle = 'rgba(200,230,255,0.5)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
  }

  // Seaweed at bottom
  for (let i = 0; i < 25; i++) {
    const sx = (i * 80 + 40) % W;
    ctx.strokeStyle = '#2a6a3a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx, bottomY());
    const sway = Math.sin(time * 2 + i) * 6;
    ctx.quadraticCurveTo(sx + sway, bottomY() - 30, sx + sway * 0.5, bottomY() - 60);
    ctx.stroke();
  }

  // Bottom sand
  ctx.fillStyle = '#c0a060';
  ctx.fillRect(0, bottomY(), W, 40);
  ctx.fillStyle = '#a08040';
  for (let i = 0; i < 30; i++) {
    const sx = (i * 53) % W;
    ctx.beginPath(); ctx.arc(sx, bottomY() + 10 + (i % 3) * 5, 3, 0, Math.PI * 2); ctx.fill();
  }

  // Treasures at bottom (draw before fish so fish overlap)
  for (const tr of treasures) if (!tr.floating) drawTreasure(tr);

  // Fish (underwater) drawn BEFORE boat/hands overlay
  for (const f of fishes) drawFish(f);

  // Floating treasures (on surface)
  for (const tr of treasures) if (tr.floating) drawTreasure(tr);

  // Bobber and hook in water (draw bobber so line shows through)
  // Hiện lưỡi câu khi đang bay/dưới nước; KHÔNG hiện lúc chưa quăng (idle/charging)
  if (state === 'casting' || state === 'fishing' || state === 'fighting') {
    drawHook();
    if (bobber.visible) drawBobber();
  }

  // Boat + first-person hands + rod (overlay on top)
  drawBoat();
  drawNPCs();
  drawFirstPersonRod();

  // Net (draw above rod so it appears in front during swing)
  drawNet();

  // Splash particles
  for (const p of particles) {
    ctx.fillStyle = p.col;
    ctx.globalAlpha = Math.min(1, p.life / 30);
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;

  // Bite ripple on surface
  if (state === 'fishing' && hook.biteT > 0.2) {
    const r = (1 - (hook.biteT % 0.5) / 0.5) * 30;
    ctx.strokeStyle = `rgba(255,207,95,${hook.biteT})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hook.x, waterLevelY(), r, 0, Math.PI * 2); ctx.stroke();
  }
}

// ===== First-person boat + hands + rod =====
function drawBoat() {
  // Mép thuyền thu gọn sát đáy màn hình để không che đáy nước
  const deckY = H - 18 + Math.sin(boat.phase) * 2;
  // water reflection of boat
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(0, deckY + 4);
  ctx.quadraticCurveTo(W * 0.5, deckY - 30, W, deckY + 4);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

  // Mép thuyền mỏng — curve rất nhẹ, không che đáy
  ctx.fillStyle = '#3a2208';
  ctx.beginPath();
  ctx.moveTo(-10, deckY + 2);
  ctx.quadraticCurveTo(W * 0.5, deckY - 6, W + 10, deckY + 2);
  ctx.lineTo(W + 10, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath(); ctx.fill();
  // Highlight gỗ trên mặt
  ctx.fillStyle = '#6a3e14';
  ctx.beginPath();
  ctx.moveTo(-10, deckY + 2);
  ctx.quadraticCurveTo(W * 0.5, deckY - 6, W + 10, deckY + 2);
  ctx.lineTo(W + 10, deckY + 6); ctx.quadraticCurveTo(W * 0.5, deckY - 2, -10, deckY + 6);
  ctx.closePath(); ctx.fill();
  // Top rim curve with highlight
  ctx.strokeStyle = '#b0782e'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, deckY + 2);
  ctx.quadraticCurveTo(W * 0.5, deckY - 12, W, deckY + 2);
  ctx.stroke();
  // Shadow under rim
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, deckY + 5);
  ctx.quadraticCurveTo(W * 0.5, deckY - 9, W, deckY + 5);
  ctx.stroke();
}

function drawFirstPersonRod() {
  const base = rodBaseXY();
  getRodTip();
  const r = RODS[currentRod];
  const V = r.v;

  // Arms/hands (first-person) holding the rod grip
  const hand1 = { x: base.x - 20, y: base.y + 40 };
  const hand2 = { x: base.x + 25, y: base.y + 12 };

  // Forearm (right arm, foreground)
  ctx.fillStyle = '#c88050';
  ctx.beginPath();
  ctx.moveTo(hand1.x - 30, H);
  ctx.lineTo(hand1.x + 20, H);
  ctx.lineTo(hand2.x + 18, hand2.y + 6);
  ctx.lineTo(hand2.x - 8, hand2.y - 14);
  ctx.lineTo(hand1.x - 8, hand1.y - 6);
  ctx.closePath(); ctx.fill();
  // sleeve
  ctx.fillStyle = '#2a6a8a';
  ctx.beginPath();
  ctx.moveTo(hand1.x - 30, H);
  ctx.lineTo(hand1.x + 20, H);
  ctx.lineTo(hand1.x + 4, H - 30);
  ctx.lineTo(hand1.x - 22, H - 20);
  ctx.closePath(); ctx.fill();

  // Second hand lower on grip (back hand)
  ctx.fillStyle = '#c88050';
  ctx.beginPath(); ctx.ellipse(hand1.x + 10, hand1.y + 6, 18, 14, rod.angle + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a5030'; ctx.lineWidth = 1; ctx.stroke();

  // ===== Premium rod grip + reel =====
  ctx.save();
  ctx.translate(base.x, base.y);
  ctx.rotate(rod.angle);

  // Grip: EVA foam with diamond pattern, end cap
  const gripGrad = ctx.createLinearGradient(0, -9, 0, 9);
  gripGrad.addColorStop(0, V.grip);
  gripGrad.addColorStop(0.5, V.grip);
  gripGrad.addColorStop(1, '#000');
  ctx.fillStyle = gripGrad;
  ctx.beginPath();
  ctx.moveTo(-32, -8); ctx.lineTo(26, -10);
  ctx.lineTo(28, 10); ctx.lineTo(-32, 8);
  ctx.closePath(); ctx.fill();
  // Cross-hatch pattern
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.6;
  for (let i = -28; i < 25; i += 4) {
    ctx.beginPath(); ctx.moveTo(i, -9); ctx.lineTo(i + 3, 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + 3, -9); ctx.lineTo(i, 9); ctx.stroke();
  }
  // Metal end cap
  ctx.fillStyle = V.reel;
  ctx.beginPath(); ctx.ellipse(-32, 0, 3, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
  ctx.stroke();
  // Front collar (metal bezel before reel)
  ctx.fillStyle = V.reel;
  ctx.fillRect(22, -11, 8, 22);
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
  ctx.strokeRect(22, -11, 8, 22);

  // ===== Detailed REEL =====
  const reelX = 5, reelY = 20;
  // Reel body shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.arc(reelX + 1, reelY + 1, 16, 0, Math.PI * 2); ctx.fill();
  // Main reel housing (rounded rect spool holder)
  const reelGrad = ctx.createRadialGradient(reelX - 4, reelY - 4, 2, reelX, reelY, 16);
  reelGrad.addColorStop(0, V.rod2 || '#888');
  reelGrad.addColorStop(0.6, V.reel);
  reelGrad.addColorStop(1, '#000');
  ctx.fillStyle = reelGrad;
  ctx.beginPath(); ctx.arc(reelX, reelY, 16, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
  ctx.stroke();
  // Spool (inner drum)
  const spoolGrad = ctx.createRadialGradient(reelX, reelY, 2, reelX, reelY, 11);
  spoolGrad.addColorStop(0, V.reelCore);
  spoolGrad.addColorStop(1, V.reelCore + '80');
  ctx.fillStyle = spoolGrad;
  ctx.beginPath(); ctx.arc(reelX, reelY, 11, 0, Math.PI * 2); ctx.fill();
  // Line wrap lines on spool
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.5;
  for (let r = 3; r <= 10; r += 2) {
    ctx.beginPath(); ctx.arc(reelX, reelY, r, 0, Math.PI * 2); ctx.stroke();
  }
  // Center bolt
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(reelX, reelY, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = V.rod2; ctx.lineWidth = 0.8;
  // star shape
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    ctx.beginPath();
    ctx.moveTo(reelX, reelY);
    ctx.lineTo(reelX + Math.cos(a) * 2, reelY + Math.sin(a) * 2);
    ctx.stroke();
  }
  // Rotating handle arm
  const hAng = time * 6;
  const hx = reelX + Math.cos(hAng) * 14;
  const hy = reelY + Math.sin(hAng) * 14;
  ctx.strokeStyle = V.reel; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(reelX, reelY); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.strokeStyle = V.rod2; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(reelX, reelY); ctx.lineTo(hx, hy); ctx.stroke();
  // Handle knob (teardrop)
  ctx.fillStyle = V.grip;
  ctx.beginPath(); ctx.ellipse(hx, hy, 4.5, 3, hAng, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = V.reelCore;
  ctx.beginPath(); ctx.arc(hx - Math.cos(hAng) * 1, hy - Math.sin(hAng) * 1, 1.5, 0, Math.PI * 2); ctx.fill();
  // Drag knob on top of reel
  ctx.fillStyle = V.reel;
  ctx.beginPath(); ctx.arc(reelX, reelY - 13, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = V.reelCore;
  ctx.beginPath(); ctx.arc(reelX, reelY - 13, 2, 0, Math.PI * 2); ctx.fill();
  // Glow ring (legendary)
  if (V.glow) {
    ctx.save();
    ctx.shadowColor = V.glow; ctx.shadowBlur = 14;
    ctx.strokeStyle = V.glow; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(reelX, reelY, 16.5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // Top (front) hand grasping above reel
  ctx.save();
  ctx.fillStyle = '#d8a070';
  ctx.beginPath(); ctx.ellipse(hand2.x, hand2.y, 16, 12, rod.angle + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a5030'; ctx.lineWidth = 1; ctx.stroke();
  // fingers
  ctx.fillStyle = '#c88050';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.ellipse(hand2.x + i * 5, hand2.y - 10, 2.5, 4, rod.angle, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // ===== TAPERED ROD BODY (thick→thin, multi-segment) =====
  const gripEndX = base.x + Math.cos(rod.angle) * 30;
  const gripEndY = base.y + Math.sin(rod.angle) * 30;
  const thickBase = V.thick + 2;
  const thickTip = Math.max(1.2, V.thick * 0.25);
  const rodLen = Math.hypot(rod.tipX - gripEndX, rod.tipY - gripEndY);
  const nx = (rod.tipX - gripEndX) / (rodLen || 1);
  const ny = (rod.tipY - gripEndY) / (rodLen || 1);
  const perpX = -ny, perpY = nx;

  // Draw tapered rod as polygon (thick at base, thin at tip)
  const SEGS = 24;
  const pts = [];
  for (let i = 0; i <= SEGS; i++) {
    const t = i / SEGS;
    const cx = gripEndX + nx * rodLen * t;
    const cy = gripEndY + ny * rodLen * t;
    const th = lerp(thickBase, thickTip, t) / 2;
    pts.push([cx + perpX * th, cy + perpY * th, cx - perpX * th, cy - perpY * th]);
  }
  // Glow halo first (behind rod)
  if (V.glow) {
    ctx.save();
    ctx.shadowColor = V.glow; ctx.shadowBlur = 22;
    ctx.fillStyle = V.glow + 'aa';
    ctx.beginPath();
    for (let i = 0; i <= SEGS; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    for (let i = SEGS; i >= 0; i--) ctx.lineTo(pts[i][2], pts[i][3]);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Shadow outline
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 4;
  ctx.fillStyle = V.rod;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= SEGS; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  for (let i = SEGS; i >= 0; i--) ctx.lineTo(pts[i][2], pts[i][3]);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // Highlight strip on top (lighter gradient)
  const hlGrad = ctx.createLinearGradient(perpX * 10, perpY * 10, -perpX * 10, -perpY * 10);
  hlGrad.addColorStop(0, V.rod2 + 'dd');
  hlGrad.addColorStop(0.5, V.rod2 + '80');
  hlGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = hlGrad;
  ctx.beginPath();
  for (let i = 0; i <= SEGS; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  for (let i = SEGS; i >= 0; i--) {
    const t = i / SEGS;
    const cx = gripEndX + nx * rodLen * t;
    const cy = gripEndY + ny * rodLen * t;
    const th = lerp(thickBase, thickTip, t) / 4;
    ctx.lineTo(cx + perpX * th, cy + perpY * th);
  }
  ctx.closePath(); ctx.fill();

  // Bamboo knots with decorative wrap
  if (V.knots) {
    for (let t = 0.2; t < 1; t += 0.2) {
      const kx = gripEndX + nx * rodLen * t;
      const ky = gripEndY + ny * rodLen * t;
      const kth = lerp(thickBase, thickTip, t) * 0.75;
      // dark ring
      ctx.fillStyle = '#4a2a10';
      ctx.beginPath(); ctx.ellipse(kx, ky, kth, kth * 0.5, Math.atan2(ny, nx) + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
      // thread wrap
      ctx.strokeStyle = '#c0a040'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(kx, ky, kth, kth * 0.5, Math.atan2(ny, nx) + Math.PI / 2, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // ===== Decorative thread wraps at segment joints (premium look) =====
  const joints = Math.min(4, Math.max(2, Math.floor(V.thick)));
  for (let i = 1; i <= joints; i++) {
    const t = i / (joints + 1);
    const jx = gripEndX + nx * rodLen * t;
    const jy = gripEndY + ny * rodLen * t;
    const jth = lerp(thickBase, thickTip, t) / 2 + 1;
    // wrap base (darker)
    ctx.strokeStyle = V.grip;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(jx + perpX * jth, jy + perpY * jth);
    ctx.lineTo(jx - perpX * jth, jy - perpY * jth);
    ctx.stroke();
    // accent line (shiny rods)
    if (V.shiny || V.glow) {
      ctx.strokeStyle = V.reelCore || V.glow || V.rod2;
      ctx.lineWidth = 1.5;
      const wx = jx + nx * 1.5;
      const wy = jy + ny * 1.5;
      ctx.beginPath();
      ctx.moveTo(wx + perpX * jth, wy + perpY * jth);
      ctx.lineTo(wx - perpX * jth, wy - perpY * jth);
      ctx.stroke();
    }
  }

  // ===== Eyelets (professional metal rings on small posts) =====
  const segs = V.eyelets || 3;
  for (let i = 1; i <= segs; i++) {
    const t = i / (segs + 1);
    const ex = gripEndX + nx * rodLen * t;
    const ey = gripEndY + ny * rodLen * t;
    const eth = lerp(thickBase, thickTip, t) / 2;
    const ringR = Math.max(2.5, 4 - t * 2);
    // post (perpendicular, away from bottom of rod)
    const postX = ex + perpX * (eth + ringR * 0.5);
    const postY = ey + perpY * (eth + ringR * 0.5);
    ctx.strokeStyle = V.grip;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(ex + perpX * eth, ey + perpY * eth);
    ctx.lineTo(postX, postY);
    ctx.stroke();
    // ring (shiny metal)
    ctx.strokeStyle = V.rod2;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#101014';
    ctx.beginPath(); ctx.arc(postX, postY, ringR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(postX, postY, ringR, 0, Math.PI * 2); ctx.stroke();
    // inner highlight
    ctx.strokeStyle = V.reelCore || '#ffffff'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(postX, postY, ringR - 0.7, 0, Math.PI * 2); ctx.stroke();
  }

  // ===== Rod tip (protective ceramic cap) =====
  ctx.fillStyle = V.glow || V.reelCore || V.rod2;
  ctx.beginPath(); ctx.arc(rod.tipX, rod.tipY, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#000a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(rod.tipX, rod.tipY, 3.5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffffff66';
  ctx.beginPath(); ctx.arc(rod.tipX - 1, rod.tipY - 1, 1, 0, Math.PI * 2); ctx.fill();
  // Premium glint
  if (V.glow) {
    ctx.save();
    ctx.shadowColor = V.glow; ctx.shadowBlur = 18;
    ctx.fillStyle = V.glow;
    ctx.beginPath(); ctx.arc(rod.tipX, rod.tipY, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Fishing line from tip to target.
  // CHỈ vẽ khi đã quăng (casting/fishing/fighting). Lúc đang ngắm/lấy lực
  // (idle/charging) thì KHÔNG có dây — sửa lỗi "ra dây trước khi quăng".
  if (state === 'casting' || state === 'fishing' || state === 'fighting') {
    const tgtX = bobber.visible ? bobber.x : hook.x;
    const tgtY = bobber.visible ? bobber.y : hook.y;
    const midX = (rod.tipX + tgtX) / 2;
    const midY = (rod.tipY + tgtY) / 2 + (state === 'fighting' ? -6 : 18);
    ctx.strokeStyle = tension > 0.7 ? '#ff4040' : 'rgba(255,255,255,0.85)';
    ctx.lineWidth = tension > 0.7 ? 2 : 1.2;
    ctx.beginPath();
    ctx.moveTo(rod.tipX, rod.tipY);
    ctx.quadraticCurveTo(midX, midY, tgtX, tgtY);
    ctx.stroke();
  }
}

function drawTreasure(tr) {
  const x = tr.x, y = tr.y;
  const k = tr.kind;
  ctx.save();
  if (k === 'bottle') {
    // Chai thông điệp nổi
    ctx.fillStyle = 'rgba(160,200,220,0.7)';
    ctx.beginPath(); ctx.ellipse(x, y - 2, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0e0f0';
    ctx.fillRect(x - 3, y - 10, 6, 4);
    ctx.fillStyle = '#6a3a10';
    ctx.fillRect(x - 2, y - 12, 4, 3);
    // Cuộn giấy
    ctx.fillStyle = '#f0e0a0';
    ctx.fillRect(x - 2, y - 2, 4, 5);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(x, y - 2, 6, 0, Math.PI * 2); ctx.stroke();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(x - 4, y - 5, 1.5, 7);
    drawTreasureSparkle(x, y, '#fff', 1.5);
  } else if (k === 'woodchest' || k === 'barrel') {
    // Rương gỗ nổi / thùng nổi
    const w = k === 'barrel' ? 22 : 20, h = k === 'barrel' ? 16 : 14;
    ctx.fillStyle = '#6a3a10';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = '#8a5a20';
    ctx.fillRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, 3);
    // Metal bands
    ctx.fillStyle = '#404040';
    ctx.fillRect(x - w / 2, y - h / 2 + 4, w, 1.5);
    ctx.fillRect(x - w / 2, y + h / 2 - 3, w, 1.5);
    // Lock
    ctx.fillStyle = '#ffc040';
    ctx.fillRect(x - 2, y - 3, 4, 4);
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 0.5, y - 2, 1, 1.5);
    // Air bubbles rising từ rương trôi
    ctx.fillStyle = 'rgba(220,240,255,0.5)';
    for (let i = 0; i < 2; i++) {
      const bx = x + Math.sin(time * 2 + i * 3) * 4;
      const by = y - 10 - ((time * 30 + i * 15) % 25);
      ctx.beginPath(); ctx.arc(bx, by, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    drawTreasureSparkle(x, y, '#ffd040', 2);
  } else if (k === 'goldchest') {
    // Rương vàng đáy biển
    ctx.save();
    ctx.shadowColor = '#ffd040'; ctx.shadowBlur = 12;
    const w = 26, h = 20;
    // Base (darker gold)
    ctx.fillStyle = '#b08020';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    // Top shine
    const g = ctx.createLinearGradient(x - w / 2, y - h / 2, x - w / 2, y + h / 2);
    g.addColorStop(0, '#ffe080'); g.addColorStop(0.5, '#ffc040'); g.addColorStop(1, '#a06020');
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, y - h / 2, w, h * 0.55);
    // Rivets
    ctx.fillStyle = '#604010';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(x - w / 2 + 3 + i * 6, y - h / 2 + 2, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x - w / 2 + 3 + i * 6, y + h / 2 - 2, 1, 0, Math.PI * 2); ctx.fill();
    }
    // Lock
    ctx.fillStyle = '#201810';
    ctx.fillRect(x - 3, y - 3, 6, 7);
    ctx.fillStyle = '#ffd040';
    ctx.fillRect(x - 2, y - 2, 4, 5);
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 0.5, y - 1, 1, 2);
    ctx.restore();
    drawTreasureSparkle(x, y, '#fff080', 3);
  } else if (k === 'ancient') {
    // Bình cổ đáy
    ctx.fillStyle = '#8a6040';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 8);
    ctx.quadraticCurveTo(x - 13, y - 2, x - 8, y - 12);
    ctx.lineTo(x + 8, y - 12);
    ctx.quadraticCurveTo(x + 13, y - 2, x + 10, y + 8);
    ctx.closePath(); ctx.fill();
    // Neck
    ctx.fillStyle = '#6a4028';
    ctx.fillRect(x - 5, y - 14, 10, 4);
    // Highlights
    ctx.fillStyle = '#c0906a';
    ctx.fillRect(x - 8, y - 10, 2, 14);
    // Patterns
    ctx.strokeStyle = '#4a2810'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 9, y - 4); ctx.lineTo(x + 9, y - 4); ctx.stroke();
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      ctx.moveTo(x + i * 3, y); ctx.lineTo(x + i * 3 + 1.5, y + 3);
    }
    ctx.stroke();
    drawTreasureSparkle(x, y, '#ffc060', 2.5);
  } else if (k === 'diamondchest') {
    // Rương kim cương
    ctx.save();
    ctx.shadowColor = '#80ffff'; ctx.shadowBlur = 18;
    const w = 28, h = 22;
    const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, '#d0f8ff'); g.addColorStop(0.5, '#80c0ff'); g.addColorStop(1, '#2060a0');
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    // Diamond gems
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const dx = x - w / 2 + 4 + i * 6;
      ctx.beginPath();
      ctx.moveTo(dx, y - 3); ctx.lineTo(dx + 2, y); ctx.lineTo(dx, y + 3); ctx.lineTo(dx - 2, y);
      ctx.closePath(); ctx.fill();
    }
    // Glowing trim
    ctx.strokeStyle = '#40ffff'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    ctx.restore();
    drawTreasureSparkle(x, y, '#80ffff', 4);
  } else if (k === 'mythic') {
    // Rương thần thoại siêu xịn
    ctx.save();
    ctx.shadowColor = '#ff40ff'; ctx.shadowBlur = 26;
    const w = 30, h = 24;
    const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, '#ffc0ff'); g.addColorStop(0.3, '#ff40ff'); g.addColorStop(0.7, '#8020c0'); g.addColorStop(1, '#200060');
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    // Ornate runes
    ctx.fillStyle = '#ffff40';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const r = 6;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    // Purple gems corners
    for (const corner of [[-w / 2 + 3, -h / 2 + 3], [w / 2 - 3, -h / 2 + 3], [-w / 2 + 3, h / 2 - 3], [w / 2 - 3, h / 2 - 3]]) {
      ctx.fillStyle = '#ff40ff';
      ctx.beginPath(); ctx.arc(x + corner[0], y + corner[1], 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#ffff80'; ctx.lineWidth = 2;
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    ctx.restore();
    drawTreasureSparkle(x, y, '#ff80ff', 5);
  }
  ctx.restore();
}

function drawTreasureSparkle(x, y, col, count) {
  for (let i = 0; i < count; i++) {
    const a = time * 3 + i * 2.09;
    const r = 14 + Math.sin(time * 4 + i) * 4;
    const sx = x + Math.cos(a) * r, sy = y + Math.sin(a * 0.7) * (r * 0.6);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.5 + Math.sin(time * 5 + i) * 0.4;
    ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBobber() {
  const x = bobber.x, y = bobber.y;
  // antenna
  ctx.strokeStyle = '#ff2020'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x, y - 2); ctx.stroke();
  // red top half
  ctx.fillStyle = '#e02020';
  ctx.beginPath(); ctx.arc(x, y, 8, Math.PI, Math.PI * 2); ctx.fill();
  // white bottom half
  ctx.fillStyle = '#f4f4f4';
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI); ctx.fill();
  // outline
  ctx.strokeStyle = '#202020'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke();
  // highlight
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2); ctx.fill();

  // line from bobber down to hook
  if (state !== 'charging') {
    ctx.strokeStyle = 'rgba(240,240,240,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(hook.x, hook.y - 4); ctx.stroke();
  }
}

function drawHook() {
  ctx.save();
  ctx.translate(hook.x, hook.y);
  // Hook shape
  ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(0, 4);
  ctx.arc(-3, 4, 3, 0, Math.PI);
  ctx.stroke();
  drawBait(currentBait);
  ctx.restore();
}

function drawBait(kind) {
  if (kind === 'worm') {
    // Red wiggly worm
    ctx.fillStyle = '#c02830';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(-2 + Math.sin(time * 5 + i) * 1.6, 2 + i * 2.5, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ff6060';
    ctx.beginPath(); ctx.arc(-2, 2, 1.5, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'shrimp') {
    ctx.fillStyle = '#ff9060';
    ctx.beginPath(); ctx.ellipse(-1, 6, 3.5, 6, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c04020'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-3, 3); ctx.lineTo(-7, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1, 3); ctx.lineTo(5, -2); ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-2, 4, 0.8, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'frog') {
    // Frog lure — green body, eyes, legs dangling
    ctx.fillStyle = '#3aa040';
    ctx.beginPath(); ctx.ellipse(0, 5, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#50c050';
    ctx.beginPath(); ctx.ellipse(-1, 4, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#ffff80';
    ctx.beginPath(); ctx.arc(-2, 3, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2, 3, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-2, 3, 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2, 3, 0.7, 0, Math.PI * 2); ctx.fill();
    // Dangling legs
    ctx.strokeStyle = '#2a7a30'; ctx.lineWidth = 1.5;
    const wig = Math.sin(time * 8) * 2;
    ctx.beginPath(); ctx.moveTo(-4, 8); ctx.quadraticCurveTo(-7, 11 + wig, -5, 15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 8); ctx.quadraticCurveTo(7, 11 - wig, 5, 15); ctx.stroke();
  } else if (kind === 'lure') {
    // Metal spinner lure
    ctx.fillStyle = '#c0c0d0';
    ctx.beginPath(); ctx.ellipse(0, 5, 3.5, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8e8f0';
    ctx.beginPath(); ctx.ellipse(-1, 4, 1.8, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff3030';
    ctx.fillRect(-2.5, 3, 5, 2);
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(1, 2, 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(1.3, 1.7, 0.4, 0, Math.PI * 2); ctx.fill();
    // spinner blade
    ctx.fillStyle = '#f0f0f8';
    const rot = Math.sin(time * 10) * 1.2;
    ctx.beginPath(); ctx.ellipse(0, 11, 2, 4 + rot, 0, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'heavy') {
    // Chì nặng hình quả lê
    ctx.fillStyle = '#404050';
    ctx.beginPath(); ctx.ellipse(0, 6, 4, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#707080';
    ctx.beginPath(); ctx.ellipse(-1, 4, 1.5, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#202028'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 6, 4.2, 0, Math.PI * 2); ctx.stroke();
  } else if (kind === 'diamond') {
    ctx.save();
    ctx.shadowColor = '#80ffff'; ctx.shadowBlur = 18;
    // Kim cương 4 cạnh
    ctx.fillStyle = '#b0e0ff';
    ctx.beginPath();
    ctx.moveTo(0, 2); ctx.lineTo(4, 6); ctx.lineTo(0, 12); ctx.lineTo(-4, 6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 3); ctx.lineTo(2, 6); ctx.lineTo(0, 8); ctx.lineTo(-2, 6);
    ctx.closePath(); ctx.fill();
    // Sparkles
    for (let i = 0; i < 4; i++) {
      const a = time * 4 + i * 1.57;
      const sx = Math.cos(a) * 7, sy = 6 + Math.sin(a) * 5;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  } else if (kind === 'blood') {
    ctx.save(); ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#b00020'; ctx.beginPath(); ctx.ellipse(0, 6, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff4040'; ctx.beginPath(); ctx.arc(-1, 4, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (kind === 'angel') {
    ctx.save(); ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 14;
    // Halo
    ctx.strokeStyle = '#ffffa0'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 2, 5, 2, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 6, 4, 0, Math.PI * 2); ctx.fill();
    // Wings
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.ellipse(-3, 6, 2, 4, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3, 6, 2, 4, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (kind === 'electric') {
    ctx.save(); ctx.shadowColor = '#80ffff'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffff80';
    // Lightning bolt
    ctx.beginPath();
    ctx.moveTo(-2, 2); ctx.lineTo(2, 5); ctx.lineTo(-1, 6); ctx.lineTo(3, 11); ctx.lineTo(-2, 8); ctx.lineTo(1, 6); ctx.lineTo(-3, 4);
    ctx.closePath(); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const a = time * 10 + i * 2;
      ctx.strokeStyle = '#80ffff'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(Math.cos(a) * 8, 6 + Math.sin(a) * 6); ctx.stroke();
    }
    ctx.restore();
  } else if (kind === 'magic') {
    ctx.save(); ctx.shadowColor = '#c040ff'; ctx.shadowBlur = 16;
    // Magic orb
    const g = ctx.createRadialGradient(0, 6, 1, 0, 6, 5);
    g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#c080ff'); g.addColorStop(1, '#4a0080');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 6, 5, 0, Math.PI * 2); ctx.fill();
    // Swirls
    for (let i = 0; i < 4; i++) {
      const a = time * 3 + i * 1.57;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(Math.cos(a) * 6, 6 + Math.sin(a) * 4, 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  } else if (kind === 'soul') {
    ctx.save(); ctx.shadowColor = '#80c0ff'; ctx.shadowBlur = 16;
    // Ghost shape
    ctx.fillStyle = 'rgba(200,220,255,0.85)';
    ctx.beginPath();
    ctx.arc(0, 4, 5, Math.PI, 0);
    ctx.lineTo(5, 11);
    ctx.lineTo(3, 9); ctx.lineTo(1, 11); ctx.lineTo(-1, 9); ctx.lineTo(-3, 11);
    ctx.lineTo(-5, 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-2, 4, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2, 4, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (kind === 'divine') {
    ctx.save(); ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 20;
    // Star
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 7 : 3;
      const x = Math.cos(a) * r, y = 6 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffff80';
    ctx.beginPath(); ctx.arc(0, 6, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (kind === 'infinity') {
    ctx.save(); ctx.shadowColor = '#ff40ff'; ctx.shadowBlur = 18;
    ctx.strokeStyle = '#ff40ff'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-2, 6, 2.5, 0, Math.PI * 2);
    ctx.moveTo(2 + 2.5, 6);
    ctx.arc(2, 6, 2.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (kind === 'ancient') {
    ctx.save(); ctx.shadowColor = '#40c040'; ctx.shadowBlur = 16;
    // Rune crystal
    ctx.fillStyle = '#205020';
    ctx.beginPath();
    ctx.moveTo(0, 1); ctx.lineTo(4, 5); ctx.lineTo(3, 11); ctx.lineTo(-3, 11); ctx.lineTo(-4, 5);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#60ff60'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-1, 4); ctx.lineTo(1, 7); ctx.lineTo(-1, 9); ctx.stroke();
    ctx.restore();
  } else if (kind === 'absolute') {
    ctx.save(); ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 24;
    const g = ctx.createRadialGradient(0, 6, 0, 0, 6, 6);
    g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#ffff00'); g.addColorStop(1, '#ff8000');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 6, 6, 0, Math.PI * 2); ctx.fill();
    // Rays
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + time * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 6, 6 + Math.sin(a) * 6);
      ctx.lineTo(Math.cos(a) * 10, 6 + Math.sin(a) * 10);
      ctx.stroke();
    }
    ctx.restore();
  } else if (kind === 'cosmic') {
    ctx.save(); ctx.shadowColor = '#8040ff'; ctx.shadowBlur = 26;
    // Swirling galaxy
    const g = ctx.createRadialGradient(0, 6, 1, 0, 6, 8);
    g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#ff40ff'); g.addColorStop(0.7, '#4020aa'); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 6, 8, 0, Math.PI * 2); ctx.fill();
    // Stars
    for (let i = 0; i < 8; i++) {
      const a = time * 1.5 + i * 0.785;
      const r = 3 + (i % 3) * 2;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(Math.cos(a) * r, 6 + Math.sin(a) * r, 0.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  } else if (kind === 'goldlure') {
    ctx.save();
    ctx.shadowColor = '#ffdf60'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffd040';
    ctx.beginPath(); ctx.ellipse(0, 5, 4, 7.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff8c0';
    ctx.beginPath(); ctx.ellipse(-1, 4, 1.5, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Sparkles
    for (let i = 0; i < 3; i++) {
      const a = time * 3 + i * 2.1;
      const sx = Math.cos(a) * 6, sy = 5 + Math.sin(a) * 4;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sx, sy, 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function drawNet() {
  if (!net.active) return;
  const t = net.phase / 50;
  const ang = Math.atan2(net.y - (getRodTip().y), net.x - (getRodTip().x));
  ctx.save();
  ctx.translate(net.x, net.y);
  // Net pole (from rod tip area)
  const tip = getRodTip();
  ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(tip.x - net.x, tip.y - net.y); ctx.lineTo(0, 0); ctx.stroke();
  // Net ring
  ctx.strokeStyle = '#d0d0d0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.stroke();
  // Net mesh
  ctx.fillStyle = 'rgba(180,230,255,0.25)';
  ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 40); ctx.stroke();
  }
  for (let r = 10; r < 40; r += 10) {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// ===== Emoji sprite cache (render emoji as image once) =====
const emojiCache = {};
function getEmojiSprite(emoji) {
  if (emojiCache[emoji]) return emojiCache[emoji];
  const c = document.createElement('canvas');
  c.width = 200; c.height = 140;
  const cx = c.getContext('2d');
  cx.font = '110px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji","Twemoji Mozilla","EmojiOne Color",sans-serif';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText(emoji, 100, 75);
  emojiCache[emoji] = c;
  return c;
}
// Per-fish visual config: emoji + hue filter for color variety
const FISH_VISUAL = {
  tri:       { em: '🐟', hue: 200, sat: 1.0, bri: 1.1, flipX: true },
  ro:        { em: '🐠', hue: 80,  sat: 0.8, bri: 1.0, flipX: true },
  vang:      { em: '🐟', hue: 30,  sat: 1.8, bri: 1.2, flipX: true }, // cá vàng = cá chép vàng orange
  hong:      { em: '🐠', hue: -20, sat: 1.2, bri: 1.0, flipX: true },
  xanh:      { em: '🐟', hue: 180, sat: 1.3, bri: 1.0, flipX: true },
  tre:       { em: '🐟', hue: 30,  sat: 0.5, bri: 0.6, flipX: true },
  // loc: dùng vector 'snakehead' — thân thẳng dài đúng cá lóc
  nheo:      { em: '🐟', hue: 30,  sat: 0.4, bri: 0.5, flipX: true },
  duoi:      { em: '🐟', hue: 40,  sat: 0.4, bri: 0.7, flipX: true },
  map:       { em: '🦈', hue: 0,   sat: 1.0, bri: 1.0, flipX: true },
  hongvi:    { em: '🐠', hue: -30, sat: 1.4, bri: 0.85, flipX: true },
  // sau: dùng vector 'gar' — mõm dài thẳng đúng cá sấu hỏa tiển
  haituong:  { em: '🐡', hue: -20, sat: 1.4, bri: 1.0, flipX: true },
  // rong: dùng vector 'arowana' — thân dài thẳng có vảy lớn
  vangthan:  { em: '✨', hue: 0,   sat: 1.0, bri: 1.3, flipX: false },
  me:        { em: '🐟', hue: 220, sat: 0.3, bri: 1.1, flipX: true },
  tram:      { em: '🐟', hue: 90,  sat: 0.8, bri: 0.9, flipX: true },
  chep:      { em: '🐠', hue: 10,  sat: 1.1, bri: 1.0, flipX: true },
  mapbo:     { em: '🦈', hue: 30,  sat: 0.7, bri: 0.95, flipX: true },
  maptrang:  { em: '🦈', hue: 0,   sat: 0.3, bri: 1.3, flipX: true },
  mukhong:   { em: '🐡', hue: 25,  sat: 0.6, bri: 0.7, flipX: true },
  kiem:      { em: '🐟', hue: 210, sat: 0.8, bri: 0.9, flipX: true },
  ngu:       { em: '🐟', hue: 200, sat: 1.2, bri: 0.95, flipX: true },
  mat:       { em: '🐡', hue: 0,   sat: 0.2, bri: 0.9, flipX: true },
  voi:       { em: '🐋', hue: 0,   sat: 1.0, bri: 1.0, flipX: true },
  // locbong: dùng vector 'snakehead' — thân dài thẳng có đốm bông
  mevinh:    { em: '🐟', hue: 50,  sat: 0.6, bri: 1.1, flipX: true },
  tramden:   { em: '🐟', hue: 30,  sat: 0.2, bri: 0.35, flipX: true },
  tramtrang: { em: '🐟', hue: 0,   sat: 0.2, bri: 1.3, flipX: true },
};

function drawFish(f) {
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.dir, 1);
  if (f.tired) ctx.rotate(-Math.PI * 0.5);
  // Thân cá uốn lượn khi bơi (đặc biệt khi đang trôi tự do)
  if (!f.tired && !f.onHook) {
    const wag = Math.sin(time * 4 + f.bob * 2) * 0.04;
    ctx.rotate(wag);
  }
  // Bóng đổ dưới cá (underwater shadow)
  const s = f.size;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(-s * 0.1, s * 0.65, s * 0.9, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // ===== EMOJI SPRITE BODY (nếu có FISH_VISUAL entry) =====
  const viz = FISH_VISUAL[f.type.id];
  if (viz) {
    const sprite = getEmojiSprite(viz.em);
    const sw = s * 3.0;
    const sh = sw * (140 / 200); // sprite aspect
    ctx.save();
    try { ctx.filter = `hue-rotate(${viz.hue}deg) saturate(${viz.sat}) brightness(${viz.bri})`; } catch (e) { }
    if (viz.flipX) ctx.scale(-1, 1);
    ctx.drawImage(sprite, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
    ctx.restore(); // đóng outer save từ drawFish start
    // Interest bubble
    if (f.interest > 0.3 && !f.onHook) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(f.x + f.dir * f.size * 0.6, f.y - f.size * 0.8, 2, 0, Math.PI * 2); ctx.fill();
    }
    // Stamina bar khi đang câu
    if (f.onHook && f.tiredness !== undefined) {
      const bw = Math.max(80, f.size * 2.8);
      const bx = f.x - bw / 2, by = f.y - f.size - 22;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - 1, by - 1, bw + 2, 8);
      const pct = f.tiredness / 100;
      ctx.fillStyle = f.readyToScoop ? '#40ff60' : (f.recoveryT > 0 ? '#aabb40' : '#40c080');
      ctx.fillRect(bx, by, bw * pct, 6);
      ctx.strokeStyle = '#ffcf5f'; ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, 6);
      const dots = f.type.tireMax;
      for (let i = 0; i < dots; i++) {
        const dx = bx + (i / Math.max(1, dots - 1)) * bw;
        ctx.fillStyle = i < f.tireCount ? '#40ff80' : '#555';
        ctx.beginPath(); ctx.arc(dx, by - 5, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      const label = f.readyToScoop ? 'KIỆT SỨC!' : (f.recoveryT > 0 ? 'NGHỈ' : Math.floor(pct * 100) + '% · ' + f.tireCount + '/' + f.type.tireMax);
      ctx.fillText(label, f.x, by - 10);
    }
    return;
  }
  const shape = f.type.shape || 'basic';
  const bc = f.type.bodyCol, belly = f.type.bellyCol || bc, back = f.type.backCol || bc, fin = f.type.finCol;

  const drawEye = (ex, ey, er, pupilShift = 0) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(ex + pupilShift, ey, er * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex + pupilShift - er * 0.25, ey - er * 0.25, er * 0.2, 0, Math.PI * 2); ctx.fill();
  };

  const drawScales = (cx, cy, w, h, rows = 3, cols = 8) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.8;
    for (let r = 0; r < rows; r++) {
      const y = cy - h / 2 + h * (r + 0.5) / rows;
      for (let c = 0; c < cols; c++) {
        const x = cx - w / 2 + w * (c + 0.5) / cols;
        ctx.beginPath();
        ctx.arc(x, y, Math.min(w, h) / rows * 0.45, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
      }
    }
  };

  if (shape === 'herring') {
    // Cá trích — streamlined silver with blue back
    const grd = ctx.createLinearGradient(0, -s, 0, s);
    grd.addColorStop(0, back); grd.addColorStop(0.5, bc); grd.addColorStop(1, belly);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(s * 1.1, 0);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.45, -s * 0.8, -s * 0.32);
    ctx.lineTo(-s * 1.2, -s * 0.4);
    ctx.lineTo(-s * 1.4, 0);
    ctx.lineTo(-s * 1.2, s * 0.4);
    ctx.lineTo(-s * 0.8, s * 0.32);
    ctx.quadraticCurveTo(s * 0.5, s * 0.45, s * 1.1, 0);
    ctx.closePath(); ctx.fill();
    // Lateral line
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(s * 0.9, 0); ctx.quadraticCurveTo(0, -s * 0.05, -s * 1.0, 0); ctx.stroke();
    // Dorsal fin
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.38);
    ctx.lineTo(s * 0.15, -s * 0.65);
    ctx.lineTo(s * 0.3, -s * 0.38);
    ctx.closePath(); ctx.fill();
    // Pectoral
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.15);
    ctx.quadraticCurveTo(s * 0.15, s * 0.45, s * 0.45, s * 0.32);
    ctx.closePath(); ctx.fill();
    // Gill line
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(s * 0.7, -s * 0.2); ctx.quadraticCurveTo(s * 0.65, 0, s * 0.72, s * 0.2); ctx.stroke();
    drawEye(s * 0.85, -s * 0.1, s * 0.12, s * 0.02);
  } else if (shape === 'goldfish') {
    // Cá vàng — rounder, flowy tail
    const grd = ctx.createRadialGradient(-s * 0.2, 0, s * 0.1, 0, 0, s);
    grd.addColorStop(0, belly); grd.addColorStop(1, bc);
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.95, s * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    // Flowy tail
    ctx.fillStyle = fin;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(-s * 0.85, 0);
    ctx.quadraticCurveTo(-s * 1.5, -s * 0.7, -s * 1.7, -s * 0.3);
    ctx.quadraticCurveTo(-s * 1.3, -s * 0.1, -s * 1.2, 0);
    ctx.quadraticCurveTo(-s * 1.3, s * 0.1, -s * 1.7, s * 0.3);
    ctx.quadraticCurveTo(-s * 1.5, s * 0.7, -s * 0.85, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // Dorsal fin — flowing
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.5);
    ctx.quadraticCurveTo(0, -s * 0.95, s * 0.2, -s * 0.5);
    ctx.closePath(); ctx.fill();
    // Pectoral
    ctx.beginPath();
    ctx.ellipse(s * 0.25, s * 0.35, s * 0.22, s * 0.12, -0.4, 0, Math.PI * 2); ctx.fill();
    // Scales hint
    drawScales(0, 0, s * 1.6, s * 0.9, 2, 6);
    // Gill
    ctx.strokeStyle = '#a04010'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(s * 0.55, -s * 0.25); ctx.quadraticCurveTo(s * 0.5, 0, s * 0.55, s * 0.25); ctx.stroke();
    // Big bulging eye
    drawEye(s * 0.7, -s * 0.12, s * 0.17, s * 0.02);
    // Mouth
    ctx.strokeStyle = '#c06010'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(s * 0.85, s * 0.12, s * 0.1, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
  } else if (shape === 'snapper') {
    // Cá hồng — compact red with spiny fin
    const grd = ctx.createLinearGradient(0, -s * 0.7, 0, s * 0.7);
    grd.addColorStop(0, back); grd.addColorStop(0.5, bc); grd.addColorStop(1, belly);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(s * 1.05, 0);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.7, -s * 0.6, -s * 0.55);
    ctx.lineTo(-s * 1.2, -s * 0.35);
    ctx.lineTo(-s * 1.3, 0);
    ctx.lineTo(-s * 1.2, s * 0.35);
    ctx.lineTo(-s * 0.6, s * 0.55);
    ctx.quadraticCurveTo(s * 0.5, s * 0.7, s * 1.05, 0);
    ctx.closePath(); ctx.fill();
    // Spiny dorsal
    ctx.strokeStyle = fin; ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const sx = -s * 0.3 + i * s * 0.15;
      ctx.beginPath();
      ctx.moveTo(sx, -s * 0.6);
      ctx.lineTo(sx + s * 0.03, -s * 0.95);
      ctx.stroke();
    }
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, -s * 0.6); ctx.lineTo(s * 0.5, -s * 0.6);
    ctx.lineTo(s * 0.4, -s * 0.75); ctx.lineTo(-s * 0.35, -s * 0.72);
    ctx.closePath(); ctx.fill();
    // Pectoral + anal
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.3); ctx.quadraticCurveTo(s * 0.15, s * 0.6, s * 0.55, s * 0.5); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, s * 0.55); ctx.lineTo(-s * 0.2, s * 0.8); ctx.lineTo(-s * 0.1, s * 0.55); ctx.closePath(); ctx.fill();
    drawScales(0, 0, s * 1.5, s * 1.1, 3, 6);
    // Gill + eye
    ctx.strokeStyle = '#6a1010'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(s * 0.65, -s * 0.35); ctx.quadraticCurveTo(s * 0.6, 0, s * 0.7, s * 0.3); ctx.stroke();
    drawEye(s * 0.85, -s * 0.15, s * 0.12, s * 0.02);
  } else if (shape === 'bluefish') {
    // Cá xanh lam — streamlined bluefish with sharp tail
    const grd = ctx.createLinearGradient(0, -s * 0.6, 0, s * 0.6);
    grd.addColorStop(0, back); grd.addColorStop(0.55, bc); grd.addColorStop(1, belly);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(s * 1.15, 0);
    ctx.quadraticCurveTo(s * 0.3, -s * 0.55, -s * 0.8, -s * 0.4);
    ctx.lineTo(-s * 1.3, -s * 0.5);
    ctx.lineTo(-s * 1.5, 0);
    ctx.lineTo(-s * 1.3, s * 0.5);
    ctx.lineTo(-s * 0.8, s * 0.4);
    ctx.quadraticCurveTo(s * 0.3, s * 0.55, s * 1.15, 0);
    ctx.closePath(); ctx.fill();
    // Dorsal
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.45); ctx.lineTo(s * 0.1, -s * 0.78); ctx.lineTo(s * 0.35, -s * 0.45);
    ctx.closePath(); ctx.fill();
    // Secondary finlets
    for (let i = 0; i < 3; i++) {
      const fx = -s * 0.4 - i * s * 0.2;
      ctx.beginPath();
      ctx.moveTo(fx, -s * 0.35); ctx.lineTo(fx + s * 0.05, -s * 0.5); ctx.lineTo(fx + s * 0.12, -s * 0.35);
      ctx.closePath(); ctx.fill();
    }
    // Pectoral
    ctx.beginPath();
    ctx.moveTo(s * 0.45, s * 0.15); ctx.quadraticCurveTo(s * 0.25, s * 0.55, s * 0.65, s * 0.4);
    ctx.closePath(); ctx.fill();
    // Lateral line
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.moveTo(s * 0.9, -s * 0.05); ctx.quadraticCurveTo(0, 0, -s * 1.0, 0); ctx.stroke();
    // Gill
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(s * 0.7, -s * 0.25); ctx.quadraticCurveTo(s * 0.65, 0, s * 0.72, s * 0.25); ctx.stroke();
    drawEye(s * 0.85, -s * 0.1, s * 0.1, s * 0.02);
    // Sharp mouth
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(s * 1.1, s * 0.02); ctx.lineTo(s * 0.95, s * 0.15); ctx.stroke();
  } else if (shape === 'snakehead') {
    // Cá lóc — thân dài rắn lục với đốm, đầu to dẹt
    const grd = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.5);
    grd.addColorStop(0, back); grd.addColorStop(0.6, bc); grd.addColorStop(1, belly);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(s * 1.35, 0);
    ctx.quadraticCurveTo(s * 1.3, -s * 0.3, s * 1.1, -s * 0.32);
    ctx.quadraticCurveTo(s * 0.4, -s * 0.45, -s * 1.1, -s * 0.32);
    ctx.lineTo(-s * 1.5, -s * 0.28);
    ctx.lineTo(-s * 1.75, 0);
    ctx.lineTo(-s * 1.5, s * 0.28);
    ctx.lineTo(-s * 1.1, s * 0.32);
    ctx.quadraticCurveTo(s * 0.4, s * 0.45, s * 1.1, s * 0.32);
    ctx.quadraticCurveTo(s * 1.3, s * 0.3, s * 1.35, 0);
    ctx.closePath(); ctx.fill();
    // Đốm dọc thân
    ctx.fillStyle = '#1a2a0a';
    for (let i = -4; i <= 3; i++) {
      const sx = i * s * 0.32;
      ctx.beginPath(); ctx.ellipse(sx, -s * 0.05, s * 0.09, s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sx + s * 0.15, s * 0.2, s * 0.06, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Bụng vàng nhạt
    ctx.fillStyle = 'rgba(240,230,180,0.4)';
    ctx.beginPath(); ctx.ellipse(-s * 0.1, s * 0.22, s * 1.0, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    // Vây lưng dài liên tục
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(s * 0.7, -s * 0.3);
    ctx.quadraticCurveTo(-s * 0.3, -s * 0.62, -s * 1.2, -s * 0.32);
    ctx.lineTo(-s * 1.1, -s * 0.35);
    ctx.quadraticCurveTo(-s * 0.3, -s * 0.52, s * 0.7, -s * 0.33);
    ctx.closePath(); ctx.fill();
    // Vây bụng dài liên tục (anal fin)
    ctx.beginPath();
    ctx.moveTo(s * 0.2, s * 0.3);
    ctx.quadraticCurveTo(-s * 0.4, s * 0.55, -s * 1.1, s * 0.32);
    ctx.lineTo(-s * 1.0, s * 0.35);
    ctx.quadraticCurveTo(-s * 0.4, s * 0.48, s * 0.2, s * 0.33);
    ctx.closePath(); ctx.fill();
    // Vây ngực
    ctx.beginPath();
    ctx.moveTo(s * 0.8, s * 0.2);
    ctx.quadraticCurveTo(s * 0.7, s * 0.5, s * 0.95, s * 0.35);
    ctx.closePath(); ctx.fill();
    // Đuôi tròn (snakehead typical)
    ctx.beginPath();
    ctx.moveTo(-s * 1.5, -s * 0.25);
    ctx.quadraticCurveTo(-s * 1.9, 0, -s * 1.5, s * 0.25);
    ctx.quadraticCurveTo(-s * 1.65, 0, -s * 1.5, -s * 0.25);
    ctx.closePath(); ctx.fill();
    // Đầu dẹt
    ctx.fillStyle = back;
    ctx.beginPath(); ctx.ellipse(s * 1.1, -s * 0.05, s * 0.3, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    // Miệng
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(s * 1.35, s * 0.08); ctx.lineTo(s * 1.15, s * 0.15); ctx.stroke();
    // Răng
    ctx.beginPath(); ctx.moveTo(s * 1.3, s * 0.1); ctx.lineTo(s * 1.28, s * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 1.23, s * 0.12); ctx.lineTo(s * 1.21, s * 0.17); ctx.stroke();
    drawEye(s * 1.0, -s * 0.15, s * 0.09, 0);
    // Highlight đỉnh đầu
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.ellipse(s * 0.8, -s * 0.3, s * 0.3, s * 0.08, 0.1, 0, Math.PI * 2); ctx.fill();
  } else if (shape === 'shark') {
    // Cá mập búa — hammerhead với đầu chữ T
    const grd = ctx.createLinearGradient(0, -s * 0.6, 0, s * 0.4);
    grd.addColorStop(0, back); grd.addColorStop(0.6, bc); grd.addColorStop(1, belly);
    ctx.fillStyle = grd;
    // Thân
    ctx.beginPath();
    ctx.moveTo(s * 0.9, -s * 0.05);
    ctx.quadraticCurveTo(s * 0.4, -s * 0.4, -s, -s * 0.22);
    ctx.lineTo(-s * 1.35, -s * 0.42);
    ctx.lineTo(-s * 1.6, 0);
    ctx.lineTo(-s * 1.25, s * 0.18);
    ctx.lineTo(-s * 1, s * 0.22);
    ctx.quadraticCurveTo(s * 0.4, s * 0.4, s * 0.9, s * 0.05);
    ctx.closePath(); ctx.fill();
    // Đầu búa chữ T
    ctx.fillStyle = back;
    ctx.beginPath();
    ctx.moveTo(s * 0.9, -s * 0.05);
    ctx.quadraticCurveTo(s * 1.0, -s * 0.5, s * 0.85, -s * 0.55);
    ctx.quadraticCurveTo(s * 0.8, -s * 0.3, s * 0.72, -s * 0.08);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.9, s * 0.05);
    ctx.quadraticCurveTo(s * 1.0, s * 0.5, s * 0.85, s * 0.55);
    ctx.quadraticCurveTo(s * 0.8, s * 0.3, s * 0.72, s * 0.08);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(s * 0.95, 0, s * 0.12, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    // Vây lưng cao
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(s * 0.0, -s * 0.35); ctx.lineTo(s * 0.15, -s * 1.0); ctx.lineTo(s * 0.35, -s * 0.35);
    ctx.closePath(); ctx.fill();
    // Vây ngực to
    ctx.beginPath();
    ctx.moveTo(s * 0.55, s * 0.1);
    ctx.quadraticCurveTo(s * 0.35, s * 0.6, s * 0.75, s * 0.45);
    ctx.quadraticCurveTo(s * 0.7, s * 0.3, s * 0.55, s * 0.15);
    ctx.closePath(); ctx.fill();
    // Vây sau
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.3); ctx.lineTo(-s * 0.6, -s * 0.55); ctx.lineTo(-s * 0.45, -s * 0.32);
    ctx.closePath(); ctx.fill();
    // Đuôi
    ctx.beginPath();
    ctx.moveTo(-s * 1.35, -s * 0.4);
    ctx.lineTo(-s * 1.85, -s * 1.0);
    ctx.lineTo(-s * 1.55, -s * 0.1);
    ctx.lineTo(-s * 1.85, s * 0.6);
    ctx.lineTo(-s * 1.35, s * 0.1);
    ctx.closePath(); ctx.fill();
    // Mang
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const gx = s * 0.5 - i * s * 0.1;
      ctx.beginPath(); ctx.moveTo(gx, -s * 0.18); ctx.quadraticCurveTo(gx - s * 0.02, 0, gx, s * 0.18); ctx.stroke();
    }
    // Răng
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) {
      const tx = s * 1.05 + i * s * 0.04;
      ctx.beginPath();
      ctx.moveTo(tx, s * 0.08); ctx.lineTo(tx + s * 0.02, s * 0.18); ctx.lineTo(tx + s * 0.04, s * 0.08);
      ctx.closePath(); ctx.fill();
    }
    // Mắt hai bên đầu búa
    drawEye(s * 0.88, -s * 0.45, s * 0.09, 0);
  } else if (shape === 'ray') {
    // Cá đuối — hình thoi dẹt với đuôi dài
    const grd = ctx.createRadialGradient(0, -s * 0.2, s * 0.2, 0, 0, s * 1.5);
    grd.addColorStop(0, back); grd.addColorStop(0.7, bc); grd.addColorStop(1, '#3a2a10');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(s * 1.3, 0);
    ctx.quadraticCurveTo(s * 0.8, -s * 0.8, 0, -s * 0.95);
    ctx.quadraticCurveTo(-s * 0.8, -s * 0.6, -s * 1.0, 0);
    ctx.quadraticCurveTo(-s * 0.8, s * 0.6, 0, s * 0.95);
    ctx.quadraticCurveTo(s * 0.8, s * 0.8, s * 1.3, 0);
    ctx.closePath(); ctx.fill();
    // Đốm trên lưng
    ctx.fillStyle = 'rgba(40,20,0,0.4)';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const rr = rand(s * 0.2, s * 0.6);
      const sx = Math.cos(a) * rr, sy = Math.sin(a) * rr * 0.7;
      ctx.beginPath(); ctx.arc(sx, sy, s * 0.05, 0, Math.PI * 2); ctx.fill();
    }
    // Đuôi dài như roi
    ctx.strokeStyle = bc; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.9, 0);
    ctx.quadraticCurveTo(-s * 1.4, s * 0.1, -s * 2.0, s * 0.2);
    ctx.stroke();
    // Gai đuôi
    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath();
    ctx.moveTo(-s * 1.5, s * 0.1); ctx.lineTo(-s * 1.6, s * 0.25); ctx.lineTo(-s * 1.45, s * 0.15);
    ctx.closePath(); ctx.fill();
    // Mắt (trên lưng, giữa)
    drawEye(s * 0.5, -s * 0.15, s * 0.08, 0);
    drawEye(s * 0.5, s * 0.15, s * 0.08, 0);
    // Lỗ thở (spiracles)
    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.05, s * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.3, s * 0.05, s * 0.04, 0, Math.PI * 2); ctx.fill();
  } else if (shape === 'arowana') {
    // Cá rồng — thân dài với vảy lớn, râu
    const grd = ctx.createLinearGradient(0, -s * 0.4, 0, s * 0.4);
    grd.addColorStop(0, back); grd.addColorStop(0.5, bc); grd.addColorStop(1, belly);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(s * 1.2, -s * 0.2);
    ctx.quadraticCurveTo(s * 1.25, -s * 0.05, s * 1.25, s * 0.05);
    ctx.quadraticCurveTo(s * 1.2, s * 0.35, s * 0.9, s * 0.3);
    ctx.quadraticCurveTo(0, s * 0.45, -s * 1.3, s * 0.3);
    ctx.lineTo(-s * 1.6, s * 0.15);
    ctx.lineTo(-s * 1.6, -s * 0.15);
    ctx.lineTo(-s * 1.3, -s * 0.3);
    ctx.quadraticCurveTo(0, -s * 0.4, s * 0.9, -s * 0.3);
    ctx.quadraticCurveTo(s * 1.2, -s * 0.32, s * 1.2, -s * 0.2);
    ctx.closePath(); ctx.fill();
    // Vảy lớn đặc trưng arowana
    ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 0.8;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 9; col++) {
        const sx = -s * 1.2 + col * s * 0.28;
        const sy = -s * 0.25 + row * s * 0.18;
        ctx.fillStyle = 'rgba(255,180,200,0.15)';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + s * 0.16, sy - s * 0.06, sx + s * 0.3, sy);
        ctx.quadraticCurveTo(sx + s * 0.16, sy + s * 0.06, sx, sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    // Vây lưng + bụng dài kéo đến đuôi
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(s * 0.2, -s * 0.32);
    ctx.quadraticCurveTo(-s * 0.7, -s * 0.55, -s * 1.5, -s * 0.18);
    ctx.lineTo(-s * 1.5, -s * 0.25);
    ctx.quadraticCurveTo(-s * 0.7, -s * 0.45, s * 0.2, -s * 0.35);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.2, s * 0.32);
    ctx.quadraticCurveTo(-s * 0.7, s * 0.55, -s * 1.5, s * 0.18);
    ctx.lineTo(-s * 1.5, s * 0.25);
    ctx.quadraticCurveTo(-s * 0.7, s * 0.45, s * 0.2, s * 0.35);
    ctx.closePath(); ctx.fill();
    // Vây ngực
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.2);
    ctx.quadraticCurveTo(s * 0.3, s * 0.65, s * 0.75, s * 0.45);
    ctx.closePath(); ctx.fill();
    // Đuôi quạt
    ctx.beginPath();
    ctx.moveTo(-s * 1.5, -s * 0.28);
    ctx.lineTo(-s * 1.95, -s * 0.15);
    ctx.lineTo(-s * 1.85, 0);
    ctx.lineTo(-s * 1.95, s * 0.15);
    ctx.lineTo(-s * 1.5, s * 0.28);
    ctx.closePath(); ctx.fill();
    // Râu đặc trưng arowana
    ctx.strokeStyle = belly; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const wig = Math.sin(time * 3) * s * 0.05;
    ctx.beginPath();
    ctx.moveTo(s * 1.25, s * 0.1);
    ctx.quadraticCurveTo(s * 1.4 + wig, s * 0.2, s * 1.55, s * 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 1.25, s * 0.05);
    ctx.quadraticCurveTo(s * 1.45 - wig, s * 0.1, s * 1.6, s * 0.05);
    ctx.stroke();
    // Miệng
    ctx.strokeStyle = '#400'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(s * 1.22, 0); ctx.lineTo(s * 0.95, s * 0.08); ctx.stroke();
    drawEye(s * 0.9, -s * 0.12, s * 0.1, 0);
  } else if (shape === 'perch') {
    // Cá rô — thân cao dẹt, gai vây lưng
    ctx.fillStyle = bc;
    ctx.beginPath();
    ctx.moveTo(s * 1.0, 0);
    ctx.quadraticCurveTo(s * 0.3, -s * 0.75, -s * 0.5, -s * 0.6);
    ctx.lineTo(-s * 1.0, -s * 0.3);
    ctx.lineTo(-s * 1.2, 0);
    ctx.lineTo(-s * 1.0, s * 0.3);
    ctx.lineTo(-s * 0.5, s * 0.6);
    ctx.quadraticCurveTo(s * 0.3, s * 0.75, s * 1.0, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(-s * 0.1, s * 0.3, s * 0.8, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = back;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(-s * 0.4 + i * s * 0.2, -s * 0.35, s * 0.03, s * 0.45);
    }
    ctx.fillStyle = fin;
    for (let i = 0; i < 8; i++) {
      const sx = -s * 0.4 + i * s * 0.15;
      ctx.beginPath();
      ctx.moveTo(sx, -s * 0.6); ctx.lineTo(sx + s * 0.03, -s * 0.9); ctx.lineTo(sx + s * 0.08, -s * 0.6);
      ctx.closePath(); ctx.fill();
    }
    drawEye(s * 0.8, -s * 0.2, s * 0.12, 0);
  } else if (shape === 'catfish') {
    // Cá trê — thân dài đen có râu
    ctx.fillStyle = back;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.3, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(0, s * 0.15, s * 1.1, s * 0.15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fin;
    // Đuôi
    ctx.beginPath();
    ctx.moveTo(-s * 1.3, 0); ctx.lineTo(-s * 1.7, -s * 0.35); ctx.lineTo(-s * 1.55, 0); ctx.lineTo(-s * 1.7, s * 0.35);
    ctx.closePath(); ctx.fill();
    // Vây lưng ngắn
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.3); ctx.lineTo(s * 0.1, -s * 0.5); ctx.lineTo(s * 0.3, -s * 0.3);
    ctx.closePath(); ctx.fill();
    // Râu
    ctx.strokeStyle = back; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    const wh = Math.sin(time * 4) * 2;
    ctx.beginPath(); ctx.moveTo(s * 1.2, s * 0.05); ctx.quadraticCurveTo(s * 1.45 + wh, s * 0.15, s * 1.55, s * 0.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 1.2, -s * 0.05); ctx.quadraticCurveTo(s * 1.45 - wh, 0, s * 1.55, -s * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 1.15, s * 0.1); ctx.quadraticCurveTo(s * 1.35 + wh, s * 0.25, s * 1.5, s * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 1.15, -s * 0.1); ctx.quadraticCurveTo(s * 1.35 - wh, -s * 0.15, s * 1.5, -s * 0.2); ctx.stroke();
    drawEye(s * 0.95, -s * 0.1, s * 0.08, 0);
  } else if (shape === 'giantcat') {
    // Cá nheo — đầu to dẹt, thân dài, nhiều râu
    ctx.fillStyle = bc;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.4, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    // Đầu phình to
    ctx.fillStyle = back;
    ctx.beginPath(); ctx.ellipse(s * 1.0, 0, s * 0.5, s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    // Bụng sáng
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(0, s * 0.2, s * 1.2, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    // Đuôi
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(-s * 1.4, 0); ctx.lineTo(-s * 1.85, -s * 0.35); ctx.lineTo(-s * 1.65, 0); ctx.lineTo(-s * 1.85, s * 0.35);
    ctx.closePath(); ctx.fill();
    // Miệng rộng
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(s * 1.48, 0); ctx.quadraticCurveTo(s * 1.3, s * 0.12, s * 1.2, s * 0.05); ctx.stroke();
    // Râu rất dài
    ctx.strokeStyle = back; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    const wh2 = Math.sin(time * 3) * 3;
    for (let i = 0; i < 3; i++) {
      const sy = (i - 1) * 6;
      ctx.beginPath();
      ctx.moveTo(s * 1.45, sy); ctx.quadraticCurveTo(s * 1.8 + wh2, sy + 5, s * 2.0, sy + 10);
      ctx.stroke();
    }
    drawEye(s * 1.05, -s * 0.12, s * 0.09, 0);
  } else if (shape === 'redtail') {
    // Cá hồng vĩ — thân đen với đuôi đỏ
    ctx.fillStyle = bc;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.15, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = back;
    ctx.beginPath(); ctx.ellipse(-s * 0.1, -s * 0.1, s * 1.0, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(-s * 0.1, s * 0.2, s * 1.0, s * 0.15, 0, 0, Math.PI * 2); ctx.fill();
    // Sọc trắng dọc thân
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-s * 1.1, s * 0.0);
    ctx.lineTo(s * 0.9, s * 0.02);
    ctx.lineTo(s * 0.9, s * 0.08);
    ctx.lineTo(-s * 1.1, s * 0.1);
    ctx.closePath(); ctx.fill();
    // Đuôi đỏ RỰC
    ctx.fillStyle = fin; // fin = '#d04020'
    ctx.beginPath();
    ctx.moveTo(-s * 1.15, -s * 0.2); ctx.lineTo(-s * 1.7, -s * 0.5); ctx.lineTo(-s * 1.55, 0); ctx.lineTo(-s * 1.7, s * 0.5); ctx.lineTo(-s * 1.15, s * 0.2);
    ctx.closePath(); ctx.fill();
    // Vây lưng + bụng đỏ
    ctx.beginPath();
    ctx.moveTo(s * 0.1, -s * 0.4); ctx.lineTo(s * 0.3, -s * 0.75); ctx.lineTo(s * 0.45, -s * 0.4);
    ctx.closePath(); ctx.fill();
    // Râu ngắn (catfish)
    ctx.strokeStyle = back; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(s * 1.05, s * 0.1); ctx.lineTo(s * 1.3, s * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 1.05, -s * 0.05); ctx.lineTo(s * 1.3, -s * 0.12); ctx.stroke();
    drawEye(s * 0.92, -s * 0.15, s * 0.1, 0);
  } else if (shape === 'gar') {
    // Cá sấu hỏa tiển — thân dài với mõm rất dài như cá sấu
    ctx.fillStyle = bc;
    ctx.beginPath();
    ctx.moveTo(s * 1.6, -s * 0.05);
    ctx.lineTo(s * 1.9, 0);
    ctx.lineTo(s * 1.6, s * 0.05);
    ctx.lineTo(s * 0.9, s * 0.12);
    ctx.quadraticCurveTo(0, s * 0.45, -s * 1.2, s * 0.3);
    ctx.lineTo(-s * 1.7, s * 0.4);
    ctx.lineTo(-s * 1.85, 0);
    ctx.lineTo(-s * 1.7, -s * 0.4);
    ctx.lineTo(-s * 1.2, -s * 0.3);
    ctx.quadraticCurveTo(0, -s * 0.45, s * 0.9, -s * 0.12);
    ctx.closePath(); ctx.fill();
    // Vảy cứng pattern
    ctx.fillStyle = back;
    for (let i = 0; i < 8; i++) {
      const sx = -s * 0.8 + i * s * 0.22;
      ctx.beginPath();
      ctx.rect(sx, -s * 0.32, s * 0.12, s * 0.08);
      ctx.fill();
    }
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(-s * 0.3, s * 0.2, s * 0.9, s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    // Răng trắng trên mõm
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      const tx = s * 1.0 + i * s * 0.16;
      ctx.beginPath();
      ctx.moveTo(tx, -s * 0.04); ctx.lineTo(tx + s * 0.02, -s * 0.12); ctx.lineTo(tx + s * 0.05, -s * 0.04);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tx, s * 0.04); ctx.lineTo(tx + s * 0.02, s * 0.12); ctx.lineTo(tx + s * 0.05, s * 0.04);
      ctx.closePath(); ctx.fill();
    }
    // Đuôi
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(-s * 1.6, -s * 0.3); ctx.lineTo(-s * 2.0, -s * 0.5); ctx.lineTo(-s * 1.85, 0); ctx.lineTo(-s * 2.0, s * 0.5); ctx.lineTo(-s * 1.6, s * 0.3);
    ctx.closePath(); ctx.fill();
    // Vây lưng sát đuôi
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, -s * 0.3); ctx.lineTo(-s * 0.55, -s * 0.55); ctx.lineTo(-s * 0.3, -s * 0.3);
    ctx.closePath(); ctx.fill();
    drawEye(s * 0.85, -s * 0.15, s * 0.08, 0);
  } else if (shape === 'arapaima') {
    // Cá hải tượng — QUÁI VẬT đỏ khổng lồ với vảy cực lớn
    const grd = ctx.createLinearGradient(0, -s * 0.6, 0, s * 0.6);
    grd.addColorStop(0, back); grd.addColorStop(0.4, bc); grd.addColorStop(0.8, '#d86060'); grd.addColorStop(1, belly);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(s * 1.3, 0);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.6, -s * 1.0, -s * 0.5);
    ctx.lineTo(-s * 1.5, -s * 0.4);
    ctx.lineTo(-s * 1.75, 0);
    ctx.lineTo(-s * 1.5, s * 0.4);
    ctx.lineTo(-s * 1.0, s * 0.5);
    ctx.quadraticCurveTo(s * 0.5, s * 0.6, s * 1.3, 0);
    ctx.closePath(); ctx.fill();
    // Vảy to đỏ
    ctx.strokeStyle = '#ffffff66';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        const sx = -s * 1.0 + c * s * 0.28;
        const sy = -s * 0.35 + r * s * 0.18;
        ctx.fillStyle = r === 3 ? '#ff4060' : `rgba(255, ${60 + c * 10}, ${60 + r * 5}, 0.4)`;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + s * 0.14, sy - s * 0.05, sx + s * 0.28, sy);
        ctx.quadraticCurveTo(sx + s * 0.14, sy + s * 0.05, sx, sy);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
    }
    // Đầu to đen
    ctx.fillStyle = back;
    ctx.beginPath(); ctx.ellipse(s * 1.0, -s * 0.05, s * 0.35, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    // Miệng lớn
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(s * 1.3, s * 0.1); ctx.quadraticCurveTo(s * 1.1, s * 0.25, s * 0.85, s * 0.1); ctx.stroke();
    // Vây lưng dài gần đuôi
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.5);
    ctx.quadraticCurveTo(-s * 0.8, -s * 0.75, -s * 1.3, -s * 0.4);
    ctx.lineTo(-s * 1.2, -s * 0.42);
    ctx.quadraticCurveTo(-s * 0.7, -s * 0.65, -s * 0.2, -s * 0.52);
    ctx.closePath(); ctx.fill();
    // Vây ngực
    ctx.beginPath();
    ctx.moveTo(s * 0.7, s * 0.35); ctx.quadraticCurveTo(s * 0.5, s * 0.8, s * 0.95, s * 0.6);
    ctx.closePath(); ctx.fill();
    // Đuôi tròn quạt
    ctx.beginPath();
    ctx.moveTo(-s * 1.5, -s * 0.35);
    ctx.quadraticCurveTo(-s * 1.95, 0, -s * 1.5, s * 0.35);
    ctx.quadraticCurveTo(-s * 1.7, 0, -s * 1.5, -s * 0.35);
    ctx.closePath(); ctx.fill();
    drawEye(s * 0.95, -s * 0.12, s * 0.11, 0);
  } else if (shape === 'carp') {
    // Cá chép — thân vàng cam có vảy lớn và râu
    const grd = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.5);
    grd.addColorStop(0, back); grd.addColorStop(0.5, bc); grd.addColorStop(1, belly);
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.1, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    // Vảy
    drawScales(0, 0, s * 1.8, s * 1.0, 3, 7);
    // Đuôi lớn
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(-s * 1.1, 0);
    ctx.lineTo(-s * 1.75, -s * 0.5); ctx.lineTo(-s * 1.5, 0);
    ctx.lineTo(-s * 1.75, s * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.45); ctx.lineTo(s * 0.15, -s * 0.72); ctx.lineTo(s * 0.35, -s * 0.45);
    ctx.closePath(); ctx.fill();
    // Râu chép
    ctx.strokeStyle = back; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(s * 0.95, s * 0.1); ctx.quadraticCurveTo(s * 1.15, s * 0.2, s * 1.25, s * 0.15); ctx.stroke();
    drawEye(s * 0.7, -s * 0.15, s * 0.12, 0);
  } else if (shape === 'grouper') {
    // Cá mú khổng lồ — thân to bự có đốm
    const grd = ctx.createRadialGradient(0, -s * 0.1, s * 0.1, 0, 0, s * 1.2);
    grd.addColorStop(0, bc); grd.addColorStop(0.7, back); grd.addColorStop(1, '#1a1008');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(s * 1.2, 0);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.7, -s * 0.9, -s * 0.55);
    ctx.lineTo(-s * 1.3, -s * 0.4);
    ctx.lineTo(-s * 1.5, 0);
    ctx.lineTo(-s * 1.3, s * 0.4);
    ctx.lineTo(-s * 0.9, s * 0.55);
    ctx.quadraticCurveTo(s * 0.5, s * 0.7, s * 1.2, 0);
    ctx.closePath(); ctx.fill();
    // Đốm nâu to
    ctx.fillStyle = 'rgba(20,10,0,0.6)';
    for (let i = 0; i < 12; i++) {
      const sx = rand(-s * 1.0, s * 0.9);
      const sy = rand(-s * 0.4, s * 0.4);
      ctx.beginPath(); ctx.arc(sx, sy, s * 0.08 + rand(0, s * 0.05), 0, Math.PI * 2); ctx.fill();
    }
    // Miệng rộng
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(s * 1.2, 0); ctx.quadraticCurveTo(s * 0.95, s * 0.15, s * 0.7, s * 0.08); ctx.stroke();
    // Vây gai lưng
    ctx.fillStyle = fin;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const sx = -s * 0.5 + i * s * 0.2;
      ctx.moveTo(sx, -s * 0.55); ctx.lineTo(sx + s * 0.05, -s * 0.85); ctx.lineTo(sx + s * 0.15, -s * 0.55);
    }
    ctx.fill();
    // Vây ngực
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.3);
    ctx.quadraticCurveTo(s * 0.1, s * 0.75, s * 0.55, s * 0.6);
    ctx.closePath(); ctx.fill();
    drawEye(s * 0.85, -s * 0.2, s * 0.13, 0);
  } else if (shape === 'swordfish') {
    // Cá kiếm — thân thon dài có mỏ rất dài nhọn
    ctx.fillStyle = bc;
    ctx.beginPath();
    ctx.moveTo(s * 2.2, 0); // mũi kiếm
    ctx.lineTo(s * 1.2, -s * 0.1);
    ctx.quadraticCurveTo(s * 0.3, -s * 0.45, -s * 1.1, -s * 0.3);
    ctx.lineTo(-s * 1.4, -s * 0.4);
    ctx.lineTo(-s * 1.65, 0);
    ctx.lineTo(-s * 1.4, s * 0.4);
    ctx.lineTo(-s * 1.1, s * 0.3);
    ctx.quadraticCurveTo(s * 0.3, s * 0.45, s * 1.2, s * 0.1);
    ctx.closePath(); ctx.fill();
    // Back shading
    ctx.fillStyle = back;
    ctx.beginPath(); ctx.ellipse(-s * 0.2, -s * 0.15, s * 1.0, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    // Belly
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(-s * 0.2, s * 0.2, s * 0.9, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    // Dorsal fin very tall
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.3); ctx.lineTo(s * 0.1, -s * 1.1); ctx.lineTo(s * 0.3, -s * 0.3);
    ctx.closePath(); ctx.fill();
    // Second dorsal small
    ctx.beginPath();
    ctx.moveTo(-s * 0.75, -s * 0.3); ctx.lineTo(-s * 0.65, -s * 0.5); ctx.lineTo(-s * 0.5, -s * 0.3);
    ctx.closePath(); ctx.fill();
    // Anal fin
    ctx.beginPath();
    ctx.moveTo(-s * 0.75, s * 0.3); ctx.lineTo(-s * 0.65, s * 0.55); ctx.lineTo(-s * 0.5, s * 0.3);
    ctx.closePath(); ctx.fill();
    // Deeply forked tail
    ctx.beginPath();
    ctx.moveTo(-s * 1.4, -s * 0.4); ctx.lineTo(-s * 1.9, -s * 0.9); ctx.lineTo(-s * 1.6, 0);
    ctx.lineTo(-s * 1.9, s * 0.9); ctx.lineTo(-s * 1.4, s * 0.4);
    ctx.closePath(); ctx.fill();
    drawEye(s * 1.0, -s * 0.1, s * 0.08, 0);
  } else if (shape === 'tuna') {
    // Cá ngừ vây xanh — thân khí động học, finlets vàng
    const grd = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.4);
    grd.addColorStop(0, back); grd.addColorStop(0.6, bc); grd.addColorStop(1, belly);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(s * 1.15, 0);
    ctx.quadraticCurveTo(s * 0.3, -s * 0.55, -s * 0.9, -s * 0.35);
    ctx.lineTo(-s * 1.4, -s * 0.45);
    ctx.lineTo(-s * 1.55, 0);
    ctx.lineTo(-s * 1.4, s * 0.45);
    ctx.lineTo(-s * 0.9, s * 0.35);
    ctx.quadraticCurveTo(s * 0.3, s * 0.55, s * 1.15, 0);
    ctx.closePath(); ctx.fill();
    // Finlets yellow along back and belly (signature tuna)
    ctx.fillStyle = fin; // yellow
    for (let i = 0; i < 4; i++) {
      const fx = -s * 0.3 - i * s * 0.2;
      ctx.beginPath();
      ctx.moveTo(fx, -s * 0.3); ctx.lineTo(fx + s * 0.05, -s * 0.42); ctx.lineTo(fx + s * 0.12, -s * 0.3);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx, s * 0.3); ctx.lineTo(fx + s * 0.05, s * 0.42); ctx.lineTo(fx + s * 0.12, s * 0.3);
      ctx.closePath(); ctx.fill();
    }
    // Dorsal
    ctx.beginPath();
    ctx.moveTo(-s * 0.05, -s * 0.45); ctx.lineTo(s * 0.15, -s * 0.8); ctx.lineTo(s * 0.4, -s * 0.45);
    ctx.closePath(); ctx.fill();
    // Crescent tail (tuna signature)
    ctx.beginPath();
    ctx.moveTo(-s * 1.4, -s * 0.45); ctx.quadraticCurveTo(-s * 2.0, -s * 0.9, -s * 1.7, 0);
    ctx.quadraticCurveTo(-s * 2.0, s * 0.9, -s * 1.4, s * 0.45);
    ctx.quadraticCurveTo(-s * 1.5, 0, -s * 1.4, -s * 0.45);
    ctx.closePath(); ctx.fill();
    drawEye(s * 0.85, -s * 0.12, s * 0.1, 0);
  } else if (shape === 'sunfish') {
    // Cá mặt trời — hình dĩa tròn, gần như không đuôi
    const grd = ctx.createRadialGradient(s * 0.1, 0, s * 0.2, 0, 0, s * 1.2);
    grd.addColorStop(0, bc); grd.addColorStop(1, back);
    ctx.fillStyle = grd;
    // Main disc body
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.1, s * 1.0, 0, 0, Math.PI * 2); ctx.fill();
    // Belly
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(-s * 0.05, s * 0.4, s * 0.9, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    // Huge top fin
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.95);
    ctx.quadraticCurveTo(s * 0.1, -s * 1.6, s * 0.2, -s * 0.95);
    ctx.closePath(); ctx.fill();
    // Huge bottom fin
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, s * 0.95);
    ctx.quadraticCurveTo(s * 0.1, s * 1.6, s * 0.2, s * 0.95);
    ctx.closePath(); ctx.fill();
    // Tiny stub tail (clavus)
    ctx.beginPath();
    ctx.moveTo(-s * 1.1, -s * 0.4);
    ctx.quadraticCurveTo(-s * 1.35, 0, -s * 1.1, s * 0.4);
    ctx.closePath(); ctx.fill();
    // Rough skin dots
    ctx.fillStyle = 'rgba(80,80,100,0.3)';
    for (let i = 0; i < 10; i++) {
      const sx = rand(-s * 0.8, s * 0.8);
      const sy = rand(-s * 0.7, s * 0.7);
      ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // Mouth (round puckered)
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(s * 0.95, s * 0.05, s * 0.08, 0, Math.PI * 2); ctx.stroke();
    drawEye(s * 0.8, -s * 0.15, s * 0.13, 0);
  } else if (shape === 'orca') {
    // Cá voi sát thủ — thân đen-trắng hai tông
    ctx.fillStyle = back;
    ctx.beginPath();
    ctx.moveTo(s * 1.3, 0);
    ctx.quadraticCurveTo(s * 0.4, -s * 0.5, -s * 0.9, -s * 0.4);
    ctx.lineTo(-s * 1.4, -s * 0.45);
    ctx.lineTo(-s * 1.6, 0);
    ctx.lineTo(-s * 1.4, s * 0.45);
    ctx.lineTo(-s * 0.9, s * 0.4);
    ctx.quadraticCurveTo(s * 0.4, s * 0.5, s * 1.3, 0);
    ctx.closePath(); ctx.fill();
    // White belly
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.moveTo(s * 1.2, s * 0.1);
    ctx.quadraticCurveTo(s * 0.3, s * 0.5, -s * 1.3, s * 0.4);
    ctx.lineTo(-s * 1.3, s * 0.15);
    ctx.quadraticCurveTo(s * 0.3, s * 0.25, s * 1.1, s * 0.05);
    ctx.closePath(); ctx.fill();
    // White eye patch (characteristic orca mark)
    ctx.beginPath(); ctx.ellipse(s * 0.75, -s * 0.2, s * 0.25, s * 0.12, 0.1, 0, Math.PI * 2); ctx.fill();
    // Saddle patch (gray)
    ctx.fillStyle = '#606068';
    ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.2, s * 0.35, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    // Tall dorsal fin
    ctx.fillStyle = back;
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.4); ctx.lineTo(s * 0.0, -s * 1.2); ctx.lineTo(s * 0.3, -s * 0.4);
    ctx.closePath(); ctx.fill();
    // Flippers
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.2); ctx.quadraticCurveTo(s * 0.3, s * 0.7, s * 0.75, s * 0.55);
    ctx.closePath(); ctx.fill();
    // Horizontal fluke (mammal tail)
    ctx.beginPath();
    ctx.moveTo(-s * 1.4, 0);
    ctx.lineTo(-s * 1.9, -s * 0.35);
    ctx.lineTo(-s * 1.7, 0);
    ctx.lineTo(-s * 1.9, s * 0.35);
    ctx.closePath(); ctx.fill();
    // Mouth line
    ctx.strokeStyle = belly; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(s * 1.2, s * 0.1); ctx.lineTo(s * 0.8, s * 0.15); ctx.stroke();
    drawEye(s * 0.95, -s * 0.1, s * 0.09, 0);
  } else if (shape === 'mythical') {
    // Cá vàng thần — lấp lánh, có hào quang
    ctx.save();
    ctx.shadowColor = '#ffef80'; ctx.shadowBlur = 20;
    const grd = ctx.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 1.2);
    grd.addColorStop(0, '#fff8c0'); grd.addColorStop(0.5, bc); grd.addColorStop(1, back);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(s * 1.1, 0);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.6, -s * 0.7, -s * 0.45);
    ctx.lineTo(-s * 1.2, -s * 0.5);
    ctx.lineTo(-s * 1.4, 0);
    ctx.lineTo(-s * 1.2, s * 0.5);
    ctx.lineTo(-s * 0.7, s * 0.45);
    ctx.quadraticCurveTo(s * 0.5, s * 0.6, s * 1.1, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // Flowing fins
    ctx.fillStyle = fin;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.5); ctx.quadraticCurveTo(0, -s * 1.1, s * 0.3, -s * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, s * 0.5); ctx.quadraticCurveTo(0, s * 1.0, s * 0.3, s * 0.5);
    ctx.closePath(); ctx.fill();
    // Flowing tail
    ctx.beginPath();
    ctx.moveTo(-s * 1.2, -s * 0.4);
    ctx.quadraticCurveTo(-s * 2.1, -s * 1.0, -s * 2.0, -s * 0.2);
    ctx.quadraticCurveTo(-s * 1.5, 0, -s * 2.0, s * 0.2);
    ctx.quadraticCurveTo(-s * 2.1, s * 1.0, -s * 1.2, s * 0.4);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    // Scales
    drawScales(0, 0, s * 1.9, s * 0.9, 3, 8);
    // Sparkles around
    for (let i = 0; i < 5; i++) {
      const a = time * 2 + i * 1.25;
      const sx = Math.cos(a) * s * 1.3, sy = Math.sin(a * 1.3) * s * 0.8;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    drawEye(s * 0.7, -s * 0.15, s * 0.14, s * 0.02);
    // Ornate mouth
    ctx.strokeStyle = '#804020'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(s * 0.95, s * 0.1, s * 0.08, Math.PI * 1.2, Math.PI * 1.9); ctx.stroke();
  } else {
    // Fallback basic
    ctx.fillStyle = bc;
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(-s, 0); ctx.lineTo(-s - s * 0.6, -s * 0.5); ctx.lineTo(-s - s * 0.5, 0); ctx.lineTo(-s - s * 0.6, s * 0.5);
    ctx.closePath(); ctx.fill();
    drawEye(s * 0.55, -s * 0.1, s * 0.14, 0);
  }

  // === Hoa văn đặc trưng theo LOÀI (sau shape cơ bản) ===
  const id = f.type.id;
  if (id === 'tri') {
    // Cá trích — sọc bạc ngang
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(s * 0.8, -s * 0.08); ctx.quadraticCurveTo(0, 0, -s * 1.0, -s * 0.05); ctx.stroke();
  } else if (id === 'me') {
    // Cá mè — đường bên + đốm nhạt
    ctx.strokeStyle = 'rgba(120,140,160,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(s * 0.7, 0); ctx.quadraticCurveTo(0, s * 0.05, -s * 1.0, 0); ctx.stroke();
  } else if (id === 'mevinh') {
    // Mè vinh — viền vàng dọc
    ctx.strokeStyle = 'rgba(255,220,100,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(s * 0.9, -s * 0.25); ctx.quadraticCurveTo(0, -s * 0.3, -s * 1.0, -s * 0.22); ctx.stroke();
  } else if (id === 'tram') {
    // Trắm cỏ — mảng rêu xanh đậm
    ctx.fillStyle = 'rgba(30,50,10,0.3)';
    for (let i = 0; i < 6; i++) ctx.fillRect(-s * 0.8 + i * s * 0.28, -s * 0.35, s * 0.1, s * 0.15);
  } else if (id === 'tramden') {
    // Trắm đen — overlay tối
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(0, -s * 0.05, s * 0.9, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'tramtrang') {
    // Trắm trắng — ánh bạc sáng
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.ellipse(-s * 0.1, 0, s * 0.8, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'chep') {
    // Cá chép — vảy vàng to
    ctx.strokeStyle = 'rgba(200,140,40,0.6)'; ctx.lineWidth = 0.8;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
      const sx = -s * 0.8 + c * s * 0.28, sy = -s * 0.1 + r * s * 0.22;
      ctx.beginPath(); ctx.arc(sx, sy, s * 0.11, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    }
  } else if (id === 'locbong') {
    // Cá lóc bông — đốm BÔNG to đặc trưng
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const spots = [[-0.8, -0.15, 0.18], [-0.3, 0.1, 0.22], [0.2, -0.2, 0.16], [0.6, 0.12, 0.14], [-0.6, 0.25, 0.15]];
    for (const [dx, dy, rr] of spots) {
      ctx.beginPath(); ctx.arc(s * dx, s * dy, s * rr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(200,230,150,0.4)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(s * (-0.4 + i * 0.4), s * 0.3, s * 0.08, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === 'mapbo') {
    // Cá mập bò — đường bên đỏ
    ctx.strokeStyle = 'rgba(200,60,60,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(s * 0.9, s * 0.1); ctx.quadraticCurveTo(0, s * 0.15, -s * 1.2, s * 0.05); ctx.stroke();
  } else if (id === 'maptrang') {
    // Cá mập trắng — aura đỏ xung quanh miệng + răng nhọn
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(s * 0.3, s * 0.25, s * 1.0, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 7; i++) {
      const tx = s * 0.95 + i * s * 0.04;
      ctx.beginPath();
      ctx.moveTo(tx, s * 0.08); ctx.lineTo(tx + s * 0.02, s * 0.22); ctx.lineTo(tx + s * 0.04, s * 0.08);
      ctx.closePath(); ctx.fill();
    }
  } else if (id === 'mukhong') {
    // Cá mú — đốm nâu lớn thêm
    ctx.fillStyle = 'rgba(40,20,5,0.5)';
    for (let i = 0; i < 8; i++) {
      const sx = rand(-s * 1.0, s * 0.9), sy = rand(-s * 0.4, s * 0.4);
      ctx.beginPath(); ctx.arc(sx, sy, s * 0.07, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === 'hong') {
    // Cá hồng — sọc pink nhạt dọc
    ctx.fillStyle = 'rgba(255,200,210,0.4)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(-s * 0.3 + i * s * 0.3, 0, s * 0.05, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === 'xanh') {
    // Cá xanh lam — bụng vàng đặc trưng
    ctx.fillStyle = 'rgba(255,220,100,0.5)';
    ctx.beginPath(); ctx.ellipse(-s * 0.2, s * 0.3, s * 0.9, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'tre') {
    // Cá trê — dây râu dài thêm
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.2;
    const wh = Math.sin(time * 4) * 2;
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.moveTo(s * 1.2, i * s * 0.1);
      ctx.quadraticCurveTo(s * 1.55 + wh, i * s * 0.2, s * 1.8, i * s * 0.35);
      ctx.stroke();
    }
  } else if (id === 'ro') {
    // Cá rô — họa tiết camo xanh nâu
    ctx.fillStyle = 'rgba(30,50,20,0.45)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(-s * 0.6 + i * s * 0.3, rand(-s * 0.2, s * 0.1), s * 0.12, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'ngu') {
    // Cá ngừ — bụng kim loại bạc
    ctx.fillStyle = 'rgba(200,220,240,0.4)';
    ctx.beginPath(); ctx.ellipse(-s * 0.1, s * 0.25, s * 0.9, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'kiem') {
    // Cá kiếm — viền sáng lưng
    ctx.strokeStyle = 'rgba(100,140,200,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(s * 1.0, -s * 0.1); ctx.quadraticCurveTo(0, -s * 0.4, -s * 1.4, -s * 0.3); ctx.stroke();
  } else if (id === 'voi') {
    // Cá voi sát thủ — mark trắng thêm
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(-s * 0.3, s * 0.3, s * 0.35, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'hongvi') {
    // Cá hồng vĩ — đuôi đỏ rực rỡ hơn + sọc trắng thêm
    ctx.fillStyle = 'rgba(255,80,40,0.5)';
    ctx.beginPath();
    ctx.moveTo(-s * 1.1, -s * 0.25); ctx.lineTo(-s * 1.7, -s * 0.6); ctx.lineTo(-s * 1.7, s * 0.6); ctx.lineTo(-s * 1.1, s * 0.25);
    ctx.closePath(); ctx.fill();
  } else if (id === 'sau') {
    // Cá sấu hỏa tiển — mắt cam phát sáng
    ctx.save();
    ctx.shadowColor = '#ff6040'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#ff8040';
    ctx.beginPath(); ctx.arc(s * 0.85, -s * 0.15, s * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (id === 'haituong') {
    // Cá hải tượng — vảy đỏ rực hơn ở đuôi
    ctx.save();
    ctx.shadowColor = '#ff4060'; ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(255,60,80,0.6)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.ellipse(-s * 0.7 - i * s * 0.12, rand(-s * 0.25, s * 0.25), s * 0.08, s * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  } else if (id === 'rong') {
    // Cá rồng — vẩy lấp lánh xanh-đỏ
    ctx.save();
    ctx.shadowColor = '#ffd040'; ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(255,215,120,0.45)';
    for (let i = 0; i < 6; i++) {
      const sx = -s * 0.9 + i * s * 0.3;
      ctx.beginPath(); ctx.arc(sx, 0, s * 0.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();

  // Emoji badge nổi phía trên cá khi cá đang tự do (không bị câu) — dấu hiệu loài
  if (!f.onHook && f.type.emoji !== undefined) {
    const EMOJI_MAP = {
      tri: '🐟', ro: '🐠', vang: '🐠', hong: '🐟', tre: '🐠', xanh: '🐟',
      loc: '🐍', nheo: '🐡', duoi: '🫧', map: '🦈', hongvi: '🐠', sau: '🐊',
      haituong: '🐡', rong: '🐉', vangthan: '✨',
      me: '🐟', tram: '🐟', chep: '🐠', mapbo: '🦈', maptrang: '🦈',
      mukhong: '🐡', kiem: '🗡', ngu: '🐟', mat: '☀', voi: '🐋',
      locbong: '🐍', mevinh: '🐟', tramden: '🐟', tramtrang: '🐟',
    };
    const em = EMOJI_MAP[f.type.id];
    if (em) {
      const bob = Math.sin(time * 2 + f.bob) * 3;
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.font = (s * 0.6) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(em, f.x, f.y - f.size - 10 + bob);
      ctx.restore();
    }
  }

  if (f.interest > 0.3 && !f.onHook) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(f.x + f.dir * f.size * 0.6, f.y - f.size * 0.8, 2, 0, Math.PI * 2); ctx.fill();
  }
  // Tiredness bar + tire cycle indicator
  if (f.onHook && f.tiredness !== undefined) {
    const bw = Math.max(80, f.size * 2.8);
    const bx = f.x - bw / 2, by = f.y - f.size - 22;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 8);
    const pct = f.tiredness / 100;
    ctx.fillStyle = f.readyToScoop ? '#40ff60' : (f.recoveryT > 0 ? '#aabb40' : '#40c080');
    ctx.fillRect(bx, by, bw * pct, 6);
    ctx.strokeStyle = '#ffcf5f'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, 6);
    // tire count dots
    const dots = f.type.tireMax;
    for (let i = 0; i < dots; i++) {
      const dx = bx + (i / Math.max(1, dots - 1)) * bw;
      ctx.fillStyle = i < f.tireCount ? '#40ff80' : '#555';
      ctx.beginPath(); ctx.arc(dx, by - 5, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    const label = f.readyToScoop ? 'KIỆT SỨC!' : (f.recoveryT > 0 ? 'NGHỈ' : Math.floor(pct * 100) + '% · ' + f.tireCount + '/' + f.type.tireMax);
    ctx.fillText(label, f.x, by - 10);
  }
}

// ===== HUD / shop =====
function updateHUD() {
  moneyEl.textContent = money.toLocaleString('vi-VN') + 'đ';
  caughtEl.textContent = caughtCount;
  rareEl.textContent = rareCount;
  rodNameEl.textContent = RODS[currentRod].name;
  if (hungerFill) {
    hungerFill.style.width = hunger + '%';
    hungerLabel.textContent = Math.floor(hunger);
  }
}
function hungerMult() {
  // 0.45 khi đói kiệt, 1.0 khi no
  return 0.45 + (hunger / 100) * 0.55;
}

catchSellBtn.addEventListener('click', () => {
  if (pendingCatch) { money += pendingCatch.value; showToast('Đã bán ' + pendingCatch.name + ' +' + pendingCatch.value + 'đ'); }
  pendingCatch = null;
  catchPopup.classList.remove('show');
  updateHUD();
  resetToIdle();
});
catchCookBtn.addEventListener('click', () => {
  if (pendingCatch) { hunger = Math.min(100, hunger + pendingCatch.foodPts); showToast('🔥 Nấu ăn ngon +' + pendingCatch.foodPts + ' đói'); }
  pendingCatch = null;
  catchPopup.classList.remove('show');
  updateHUD();
  resetToIdle();
});

shopBtn.addEventListener('click', () => openShop('rod'));
shopCloseBtn.addEventListener('click', () => shopEl.classList.remove('show'));
document.querySelectorAll('#shop .shopTab').forEach(t => {
  t.addEventListener('click', () => openShop(t.dataset.tab));
});

function openShop(tab) {
  document.querySelectorAll('#shop .shopTab').forEach(x => x.classList.toggle('active', x.dataset.tab === tab));
  if (tab === 'rod') {
    rodListEl.style.display = 'block';
    baitListEl.style.display = 'none';
    renderRodList();
  } else {
    rodListEl.style.display = 'none';
    baitListEl.style.display = 'block';
    renderBaitList();
  }
  shopEl.classList.add('show');
}

function renderRodList() {
  rodListEl.innerHTML = '';
  RODS.forEach((r, i) => {
    const owned = ownedRods.includes(i);
    const current = i === currentRod;
    const row = document.createElement('div');
    row.className = 'rodItem' + (current ? ' current' : (owned ? ' owned' : ''));
    row.innerHTML = `
      <div class="info">
        <div class="nm">${r.name}${current ? ' ⭐' : ''}</div>
        <div class="stats">Lực: ${r.maxPower} · Quấn: ${Math.round(r.reelSpeed * 1000) / 10} · Bền: ${r.strength.toFixed(1)}× ${r.price > 0 ? '· ' + r.price + 'đ' : ''}</div>
      </div>`;
    const btn = document.createElement('button');
    if (current) { btn.textContent = 'Đang dùng'; btn.disabled = true; }
    else if (owned) { btn.textContent = 'Chọn'; btn.onclick = () => { currentRod = i; updateHUD(); renderRodList(); showToast('Đổi cần: ' + r.name); }; }
    else {
      btn.textContent = 'Mua ' + r.price + 'đ';
      btn.disabled = money < r.price;
      btn.onclick = () => {
        if (money < r.price) return;
        money -= r.price; ownedRods.push(i); currentRod = i;
        updateHUD(); renderRodList();
        showToast('Đã mua ' + r.name + ' 🎣');
      };
    }
    row.appendChild(btn);
    rodListEl.appendChild(row);
  });
}

function renderBaitList() {
  baitListEl.innerHTML = '';
  BAITS.forEach(b => {
    const owned = ownedBaits.includes(b.id);
    const current = b.id === currentBait;
    const row = document.createElement('div');
    row.className = 'baitItem' + (current ? ' current' : (owned ? ' owned' : ''));
    const attr = b.attractsRare > 0 ? ` · hiếm +${(b.attractsRare * 100).toFixed(0)}%` : '';
    row.innerHTML = `
      <div class="icon">${b.emoji}</div>
      <div class="info" style="flex:1;">
        <div class="nm" style="font-weight:700;color:#9cf;">${b.name}${current ? ' ⭐' : ''}</div>
        <div class="stats" style="font-size:12px;opacity:0.75;">Lực hút: ${b.attractPower.toFixed(1)}×${attr} ${b.price > 0 ? '· ' + b.price + 'đ' : ''}</div>
      </div>`;
    const btn = document.createElement('button');
    if (current) { btn.textContent = 'Đang dùng'; btn.disabled = true; }
    else if (owned) { btn.textContent = 'Chọn'; btn.onclick = () => { currentBait = b.id; updateBaitUI(); renderBaitList(); showToast('Đổi mồi: ' + b.name); }; }
    else {
      btn.textContent = 'Mua ' + b.price + 'đ';
      btn.disabled = money < b.price;
      btn.onclick = () => {
        if (money < b.price) return;
        money -= b.price; ownedBaits.push(b.id); currentBait = b.id;
        updateHUD(); updateBaitUI(); renderBaitList();
        showToast('Đã mua ' + b.name + ' ' + b.emoji);
      };
    }
    row.appendChild(btn);
    baitListEl.appendChild(row);
  });
}

let toastT;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

// ===== World selector =====
const worldBtn = document.getElementById('worldBtn');
const worldPanel = document.getElementById('worldPanel');
const worldList = document.getElementById('worldList');
const worldClose = document.getElementById('worldClose');
worldBtn.addEventListener('click', openWorldPanel);
worldClose.addEventListener('click', () => worldPanel.style.display = 'none');

function openWorldPanel() {
  worldList.innerHTML = '';
  WORLDS.forEach(w => {
    const owned = ownedWorlds.includes(w.id);
    const canBuy = !owned && money >= w.unlockAt;
    const current = w.id === currentWorld;
    const row = document.createElement('div');
    const bg = current ? '#302a1a' : (owned ? '#1a3020' : (canBuy ? '#2a2a40' : '#2a1818'));
    const bd = current ? '#ffcf5f' : (owned ? '#40ff80' : (canBuy ? '#6a80ff' : '#6a3030'));
    row.style.cssText = `display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:${bg};border:1px solid ${bd};border-radius:8px;margin-bottom:10px;`;
    row.innerHTML = `
      <div style="flex:1;">
        <div style="font-weight:700;color:#9cf;font-size:15px;">${w.name}${current ? ' ⭐' : ''}${owned && !current ? ' ✓' : ''}</div>
        <div style="font-size:12px;opacity:0.8;margin-top:3px;">${w.desc}</div>
        ${!owned ? `<div style="font-size:11px;color:${canBuy ? '#ffcf5f' : '#f88'};margin-top:3px;">🔒 Mở khóa: ${w.unlockAt.toLocaleString('vi-VN')}đ</div>` : ''}
      </div>`;
    const btn = document.createElement('button');
    btn.style.cssText = 'padding:9px 16px;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700;min-width:110px;';
    if (current) {
      btn.textContent = 'Đang ở'; btn.disabled = true; btn.style.background = '#444';
    } else if (owned) {
      btn.textContent = 'Đến đây'; btn.style.background = '#2a6aaa';
      btn.onclick = () => switchWorld(w);
    } else if (canBuy) {
      btn.textContent = '💳 Mua ' + w.unlockAt.toLocaleString('vi-VN') + 'đ';
      btn.style.background = '#2a8a3a';
      btn.onclick = () => {
        if (money < w.unlockAt) { showToast('Không đủ tiền!'); return; }
        money -= w.unlockAt;
        ownedWorlds.push(w.id);
        updateHUD();
        showToast('Đã mở khóa ' + w.name + ' 🎉');
        switchWorld(w);
      };
    } else {
      btn.textContent = 'Chưa đủ tiền'; btn.disabled = true; btn.style.background = '#555';
    }
    row.appendChild(btn);
    worldList.appendChild(row);
  });
  worldPanel.style.display = 'flex';
}

function switchWorld(w) {
  if (state !== 'idle') { showToast('Thu dây trước khi đi!'); return; }
  currentWorld = w.id;
  fishes.length = 0;
  for (let i = 0; i < 6; i++) spawnFish();
  worldPanel.style.display = 'none';
  showToast('Đến ' + w.name + ' 🌊');
}

// ===== Main loop =====
let last = performance.now();
function tick(now) {
  try {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
  } catch (err) {
    console.error('Tick error:', err);
  }
  requestAnimationFrame(tick);
}

// ===== Admin Mode =====
const isUrlAdmin = (() => {
  try {
    const p = new URLSearchParams(location.search);
    return p.get('admin') === '1' || p.get('admin') === 'toptop';
  } catch (e) { return false; }
})();
const isGrantedAdmin = (() => {
  try { return localStorage.getItem('fishingGrantedAdmin') === '1'; } catch (e) { return false; }
})();
const isAdmin = isUrlAdmin || isGrantedAdmin;
let godMode = false;
let forceNextBoss = false;

if (isAdmin) {
  const adminPanel = document.getElementById('adminPanel');
  adminPanel.style.display = 'block';
  // Đánh dấu granted (đặc cấp) khác với admin gốc
  if (isGrantedAdmin && !isUrlAdmin) {
    const titleEl = adminPanel.querySelector('div');
    if (titleEl) titleEl.innerHTML = '👑 <b style="color:#ffd700">ĐẶC CẤP</b> — quyền do admin trao';
    adminPanel.style.borderColor = '#ffd700';
    adminPanel.style.boxShadow = '0 0 30px rgba(255,215,0,0.6)';
  }
  document.getElementById('admMoney').onclick = () => {
    money += 100000; updateHUD(); showToast('+100.000đ 💰');
  };
  document.getElementById('admMillion').onclick = () => {
    money += 1000000; updateHUD(); showToast('+1.000.000đ 💰💰');
  };
  document.getElementById('admBillion').onclick = () => {
    money += 1000000000; updateHUD(); showToast('+1.000.000.000đ (1 tỷ) 💰💰💰');
  };
  document.getElementById('admRods').onclick = () => {
    ownedRods = RODS.map((_, i) => i);
    showToast('Đã mở khóa tất cả cần 🎣');
  };
  document.getElementById('admBaits').onclick = () => {
    ownedBaits = BAITS.map(b => b.id);
    showToast('Đã mở khóa tất cả mồi 🪱');
  };
  document.getElementById('admWorlds').onclick = () => {
    ownedWorlds = WORLDS.map(w => w.id);
    showToast('Đã mở khóa tất cả thế giới 🌍');
  };
  document.getElementById('admGod').onclick = () => {
    godMode = !godMode;
    document.body.classList.toggle('god-mode', godMode);
    showToast('God mode: ' + (godMode ? 'BẬT 🛡' : 'TẮT'));
  };
  document.getElementById('admBoss').onclick = () => {
    forceNextBoss = true;
    fishes.length = 0;
    for (let i = 0; i < 6; i++) spawnFish();
    showToast('Boss đã triệu hồi 👑');
  };
  document.getElementById('admHide').onclick = () => {
    adminPanel.style.display = 'none';
    // Tiny re-open button
    const reopener = document.createElement('button');
    reopener.textContent = '👑';
    reopener.style.cssText = 'position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:30;background:rgba(80,0,0,0.6);color:#ff80ff;border:1px solid #ff80ff;border-radius:50%;width:28px;height:28px;font-size:14px;cursor:pointer;';
    reopener.onclick = () => { adminPanel.style.display = 'block'; reopener.remove(); };
    document.body.appendChild(reopener);
  };
}

// ===== Player ping + admin remote =====
const playerId = (() => {
  let id = localStorage.getItem('fishingPid');
  if (!id) { id = 'p' + Math.random().toString(36).slice(2, 10); localStorage.setItem('fishingPid', id); }
  return id;
})();
const playerName = (() => {
  let n = localStorage.getItem('fishingName');
  if (!n && !isAdmin) {
    n = prompt('Tên bạn (để admin biết):', 'Ẩn danh') || 'Ẩn danh';
    localStorage.setItem('fishingName', n);
  }
  return n || (isAdmin ? 'ADMIN' : 'Ẩn danh');
})();

async function pingServer() {
  try {
    const q = new URLSearchParams({
      id: playerId, name: playerName,
      money: money.toString(), caught: caughtCount.toString(),
      world: currentWorld, rod: RODS[currentRod].name, bait: currentBait,
    });
    await fetch('/api/ping?' + q.toString(), { cache: 'no-store' });
    // Chỉ admin gốc (URL ?admin=1) ngừng polling. Granted admin vẫn nhận lệnh để admin gốc thu hồi được.
    if (!isUrlAdmin) {
      const r = await fetch('/api/mycmd?id=' + playerId, { cache: 'no-store' });
      const cmds = await r.json();
      for (const c of cmds) applyRemoteCmd(c);
    }
  } catch (e) { }
}
setInterval(pingServer, 5000);
pingServer();

function applyRemoteCmd(s) {
  const i = s.indexOf(':');
  const cmd = i >= 0 ? s.slice(0, i) : s;
  const val = i >= 0 ? s.slice(i + 1) : '';
  if (cmd === 'addmoney') {
    const n = parseInt(val) || 0;
    money += n; updateHUD();
    showToast('Admin tặng ' + (n >= 0 ? '+' : '') + n + 'đ 💰');
  } else if (cmd === 'unlock_all') {
    ownedRods = RODS.map((_, i) => i);
    ownedBaits = BAITS.map(b => b.id);
    ownedWorlds = WORLDS.map(w => w.id);
    showToast('Admin mở khóa tất cả 🎁');
  } else if (cmd === 'teleport') {
    if (state === 'idle' && WORLDS.find(w => w.id === val)) {
      currentWorld = val; fishes.length = 0;
      for (let i = 0; i < 6; i++) spawnFish();
      showToast('Admin chuyển đến ' + WORLDS.find(w => w.id === val).name);
    }
  } else if (cmd === 'msg') {
    showToast('📢 Admin: ' + val);
  } else if (cmd === 'promote_admin') {
    try { localStorage.setItem('fishingGrantedAdmin', '1'); } catch (e) {}
    showToast('👑 Admin đã trao QUYỀN ĐẶC CẤP cho bạn! Đang reload...');
    setTimeout(() => location.reload(), 2200);
  } else if (cmd === 'revoke_admin') {
    try { localStorage.removeItem('fishingGrantedAdmin'); } catch (e) {}
    showToast('❌ Quyền đặc cấp đã bị thu hồi. Đang reload...');
    setTimeout(() => location.reload(), 2000);
  }
}

// ===== Admin view players =====
if (isAdmin) {
  const btn = document.getElementById('admPlayers');
  const panel = document.getElementById('playersPanel');
  const listEl = document.getElementById('playersList');
  const refresh = document.getElementById('playersRefresh');
  const closeBtn = document.getElementById('playersClose');

  async function renderPlayers() {
    listEl.innerHTML = 'Đang tải...';
    try {
      const r = await fetch('/api/players', { cache: 'no-store' });
      const list = await r.json();
      if (!list.length) { listEl.innerHTML = '<div style="opacity:0.6;padding:20px;text-align:center;">Chưa có ai online</div>'; return; }
      listEl.innerHTML = '';
      const now = Math.floor(Date.now() / 1000);
      for (const p of list) {
        const secondsAgo = now - p.lastSeen;
        const me = p.id === playerId;
        const row = document.createElement('div');
        row.style.cssText = 'padding:12px;background:#1a2a3a;border:1px solid ' + (me ? '#ff80ff' : '#3a5a7a') + ';border-radius:8px;margin-bottom:8px;';
        const worldName = (WORLDS.find(w => w.id === p.world) || {}).name || p.world || '?';
        row.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <div>
              <div style="font-weight:800;color:#9fcfff;">${me ? '👑 ' : ''}${escapeH(p.name)}</div>
              <div style="font-size:11px;opacity:0.75;margin-top:3px;">
                💰 ${p.money.toLocaleString('vi-VN')}đ · 🐟 ${p.caught} · 🌍 ${escapeH(worldName)}
              </div>
              <div style="font-size:10px;opacity:0.55;margin-top:2px;">
                🎣 ${escapeH(p.rod || '—')} · 🪱 ${escapeH(p.bait || '—')} · online ${secondsAgo}s trước
              </div>
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;">
              <button class="adminBtn" data-act="money" data-id="${p.id}">+50K</button>
              <button class="adminBtn" data-act="million" data-id="${p.id}">+1M</button>
              <button class="adminBtn" data-act="billion" data-id="${p.id}">+1 tỷ</button>
              <button class="adminBtn" data-act="unlock" data-id="${p.id}">Unlock</button>
              <button class="adminBtn" data-act="msg" data-id="${p.id}">💬 Nhắn</button>
              ${me ? '' : `<button class="adminBtn" data-act="promote" data-id="${p.id}" style="background:linear-gradient(135deg,#ffbe0b,#ff80ff);color:#000;">👑 Cấp</button>
              <button class="adminBtn" data-act="revoke" data-id="${p.id}" style="background:#444;">❌ Thu</button>`}
            </div>
          </div>`;
        listEl.appendChild(row);
      }
      listEl.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', async () => {
          const id = b.dataset.id;
          const act = b.dataset.act;
          let cmd = '', val = '';
          if (act === 'money') { cmd = 'addmoney'; val = '50000'; }
          else if (act === 'million') { cmd = 'addmoney'; val = '1000000'; }
          else if (act === 'billion') { cmd = 'addmoney'; val = '1000000000'; }
          else if (act === 'unlock') { cmd = 'unlock_all'; val = '1'; }
          else if (act === 'msg') {
            const m = prompt('Tin nhắn gửi người chơi:', 'Chào bạn!'); if (!m) return;
            cmd = 'msg'; val = m;
          }
          else if (act === 'promote') {
            if (!confirm('Cấp QUYỀN ĐẶC CẤP cho người này?\nHọ sẽ có toàn bộ quyền admin (tiền, mở khóa, god mode, spawn boss, cấp/thu quyền cho người khác).')) return;
            cmd = 'promote_admin'; val = '1';
          }
          else if (act === 'revoke') {
            if (!confirm('Thu hồi quyền đặc cấp của người này?')) return;
            cmd = 'revoke_admin'; val = '1';
          }
          try {
            const q = new URLSearchParams({ target: id, cmd, val });
            await fetch('/api/cmd?' + q.toString(), { cache: 'no-store' });
            showToast('Đã gửi lệnh ' + cmd);
          } catch (e) { showToast('Lỗi gửi lệnh'); }
        });
      });
    } catch (e) {
      listEl.innerHTML = '<div style="color:#f88;padding:20px;text-align:center;">Lỗi: ' + e.message + '</div>';
    }
  }
  function escapeH(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  btn.addEventListener('click', () => { panel.style.display = 'flex'; renderPlayers(); });
  refresh.addEventListener('click', renderPlayers);
  closeBtn.addEventListener('click', () => panel.style.display = 'none');
}

// ===== Voice Chat (PeerJS) =====
const voiceBtn = document.getElementById('voiceBtn');
const voicePanel = document.getElementById('voicePanel');
const voiceList = document.getElementById('voiceList');
const voiceStatus = document.getElementById('voiceStatus');
const voiceMicBtn = document.getElementById('voiceMicBtn');
const voiceHangupBtn = document.getElementById('voiceHangupBtn');
const voiceCloseBtn = document.getElementById('voiceClose');
const voiceRemote = document.getElementById('voiceRemote');

const VOICE_MAX = 5; // tối đa 5 người trong 1 cuộc
let peer = null;
let localStream = null;
let peerConnections = {}; // peerPid -> { call, audioEl, name }

// PeerJS uses public free signaling server by default
function initPeer() {
  if (peer) return;
  const peerId = 'toptopfish_' + playerId;
  peer = new Peer(peerId, { debug: 0 });
  peer.on('open', () => { voiceStatus.textContent = 'Sẵn sàng nhận cuộc gọi'; });
  peer.on('call', call => {
    if (!localStream) {
      call.close();
      showToast('Có người gọi — bật mic trước đã');
      return;
    }
    if (Object.keys(peerConnections).length >= VOICE_MAX - 1) {
      call.close();
      showToast('Phòng voice đã đầy (5/5)');
      return;
    }
    call.answer(localStream);
    hookupCall(call);
  });
  peer.on('error', e => { voiceStatus.textContent = 'Lỗi Peer: ' + e.type; });
}

function hookupCall(call) {
  const pid = call.peer.replace('toptopfish_', '');
  const audio = new Audio();
  audio.autoplay = true;
  call.on('stream', stream => { audio.srcObject = stream; });
  call.on('close', () => { removePeerConnection(pid); });
  call.on('error', () => { removePeerConnection(pid); });
  peerConnections[pid] = { call, audio };
  renderVoiceList();
}
function removePeerConnection(pid) {
  if (!peerConnections[pid]) return;
  try { peerConnections[pid].call.close(); } catch (e) { }
  try { peerConnections[pid].audio.srcObject = null; } catch (e) { }
  delete peerConnections[pid];
  renderVoiceList();
}

async function enableMic() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    voiceStatus.textContent = '🎤 Mic đang bật';
    voiceMicBtn.textContent = '🔇 Tắt mic';
    voiceMicBtn.style.background = '#aa3030';
    renderVoiceList();
  } catch (e) {
    voiceStatus.textContent = 'Không truy cập được mic: ' + e.message;
  }
}
function disableMic() {
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  Object.keys(peerConnections).forEach(removePeerConnection);
  voiceStatus.textContent = 'Mic đã tắt';
  voiceMicBtn.textContent = '🎤 Bật mic';
  voiceMicBtn.style.background = '#2a8a3a';
  renderVoiceList();
}

voiceMicBtn.addEventListener('click', () => {
  if (localStream) disableMic(); else enableMic();
});
voiceHangupBtn.addEventListener('click', () => {
  Object.keys(peerConnections).forEach(removePeerConnection);
});
voiceBtn.addEventListener('click', async () => {
  initPeer();
  voicePanel.style.display = 'flex';
  renderVoiceList();
});
voiceCloseBtn.addEventListener('click', () => voicePanel.style.display = 'none');

async function renderVoiceList() {
  voiceList.innerHTML = '';
  voiceHangupBtn.style.display = Object.keys(peerConnections).length ? 'inline-block' : 'none';
  try {
    const r = await fetch('/api/players', { cache: 'no-store' });
    const list = await r.json();
    const others = list.filter(p => p.id !== playerId && p.world === currentWorld);
    if (!others.length) {
      voiceList.innerHTML = '<div style="text-align:center;padding:14px;opacity:0.6;">Chưa có ai trong thế giới này</div>';
    } else {
      const inRoom = Object.keys(peerConnections).length;
      for (const p of others) {
        const isCalled = !!peerConnections[p.id];
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:' + (isCalled ? '#1a3020' : '#2a1a40') + ';border:1px solid ' + (isCalled ? '#40ff80' : '#4a3070') + ';border-radius:6px;margin-bottom:6px;';
        row.innerHTML = `
          <div>
            <div style="font-weight:700;color:#e0c0ff;">${escapeHtml(p.name)}${isCalled ? ' 🔊' : ''}</div>
            <div style="font-size:11px;opacity:0.6;">💰 ${p.money.toLocaleString('vi-VN')}đ · 🐟 ${p.caught}</div>
          </div>`;
        const b = document.createElement('button');
        b.style.cssText = 'padding:8px 14px;background:' + (isCalled ? '#aa3030' : '#2a6aaa') + ';color:#fff;border:none;border-radius:5px;font-weight:600;cursor:pointer;';
        if (isCalled) { b.textContent = '📵 Rời'; b.onclick = () => removePeerConnection(p.id); }
        else if (!localStream) { b.textContent = 'Bật mic trước'; b.disabled = true; b.style.background = '#555'; }
        else if (inRoom >= VOICE_MAX - 1) { b.textContent = 'Đầy ' + VOICE_MAX + '/' + VOICE_MAX; b.disabled = true; b.style.background = '#555'; }
        else {
          b.textContent = '📞 Gọi';
          b.onclick = () => callPeer(p.id, p.name);
        }
        row.appendChild(b);
        voiceList.appendChild(row);
      }
    }
    const roomInfo = document.createElement('div');
    roomInfo.style.cssText = 'font-size:11px;opacity:0.7;text-align:center;margin-top:10px;';
    roomInfo.textContent = `Phòng: ${Object.keys(peerConnections).length + (localStream ? 1 : 0)}/${VOICE_MAX}`;
    voiceList.appendChild(roomInfo);
  } catch (e) {
    voiceList.innerHTML = '<div style="color:#f88;">Lỗi tải: ' + e.message + '</div>';
  }
}

function callPeer(pid, name) {
  if (!localStream) { showToast('Bật mic trước'); return; }
  if (Object.keys(peerConnections).length >= VOICE_MAX - 1) { showToast('Phòng đã đầy'); return; }
  const remoteId = 'toptopfish_' + pid;
  const call = peer.call(remoteId, localStream);
  if (!call) { showToast('Không gọi được ' + name); return; }
  hookupCall(call);
  showToast('Đang gọi ' + name);
}

function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// Initialize a few fish + treasures
for (let i = 0; i < 6; i++) spawnFish();
for (let i = 0; i < 5; i++) spawnTreasure();
updateHUD();
updateBaitUI();
requestAnimationFrame(tick);
