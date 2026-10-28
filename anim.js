// Move animations. Draws effects on top of the battle arena; contains no game logic.
// Effect images come from Pokémon Showdown (https://play.pokemonshowdown.com/fx/).
// Animations are picked from a move's type, category and flags, so every move gets one.
(() => {
  'use strict';
  const FX_URL = 'https://play.pokemonshowdown.com/fx/';
  let getOpts = () => ({ speed: 1, anim: true });

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s);
  const speed = () => getOpts().speed || 1;
  const dur = ms => ms / speed();
  const enabled = () => getOpts().anim !== false && speed() < 4 && !!$('.fx-layer');

  // type -> effect image and an optional CSS filter to recolour it
  const TYPE_FX = {
    Normal: { img: 'impact' }, Fire: { img: 'fireball' }, Water: { img: 'waterwisp' },
    Electric: { img: 'electroball' }, Grass: { img: 'leaf1' }, Ice: { img: 'iceball' },
    Fighting: { img: 'impact', filter: 'sepia(1) saturate(4) hue-rotate(-30deg)' }, Poison: { img: 'poisonwisp' },
    Ground: { img: 'mudwisp' }, Flying: { img: 'feather' }, Psychic: { img: 'mistball' },
    Bug: { img: 'energyball', filter: 'hue-rotate(-40deg) saturate(1.6)' }, Rock: { img: 'rock1' },
    Ghost: { img: 'shadowball' }, Dragon: { img: 'flareball', filter: 'hue-rotate(200deg) saturate(1.4)' },
    Dark: { img: 'shadowball', filter: 'brightness(.55)' }, Steel: { img: 'impact', filter: 'grayscale(1) brightness(1.4)' },
    Fairy: { img: 'heart' }
  };
  const TYPE_TINT = {
    Normal: '#c8c6a7', Fire: '#ff7b2e', Water: '#5a9bff', Electric: '#ffd43b', Grass: '#7ad04c', Ice: '#8ee8f0',
    Fighting: '#d9443c', Poison: '#b65bd6', Ground: '#d8b05a', Flying: '#b5a2ff', Psychic: '#ff6aa0', Bug: '#b6cc2a',
    Rock: '#c8b04a', Ghost: '#8a6ab8', Dragon: '#7e52ff', Dark: '#5a4a40', Steel: '#c0c0d8', Fairy: '#ff9ed2'
  };
  const STATUS_TINT = { brn: '#ff6a2b', par: '#ffd21f', psn: '#b04bd0', tox: '#8a2bb0', slp: '#9aa0b8', frz: '#7fe0ff' };

  // Centre of a battler, relative to the arena
  function center(side) {
    const arena = $('.arena'), el = $(side === 'p' ? '#me-img' : '#foe-img');
    const a = arena.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2, w: r.width, el };
  }
  function particle(img, x, y, size = 44, filter = '') {
    const el = document.createElement('img');
    el.src = FX_URL + img + '.png';
    el.className = 'fx';
    el.alt = '';
    Object.assign(el.style, { width: size + 'px', height: size + 'px', left: x - size / 2 + 'px', top: y - size / 2 + 'px', filter });
    $('.fx-layer').appendChild(el);
    return el;
  }
  function shape(cls, x, y, size, color) {
    const el = document.createElement('div');
    el.className = cls;
    Object.assign(el.style, { width: size + 'px', height: size + 'px', left: x - size / 2 + 'px', top: y - size / 2 + 'px', color });
    $('.fx-layer').appendChild(el);
    return el;
  }
  // Animate and always resolve (a timeout backs up .finished in throttled/background tabs)
  function run(el, frames, ms, o = {}) {
    const d = dur(ms), delay = dur(o.delay || 0);
    const a = el.animate(frames, { duration: d, delay, easing: o.easing || 'ease-out', fill: o.keep ? 'none' : 'forwards' });
    return Promise.race([a.finished.catch(() => {}), sleep(d + delay + 250)]).then(() => { if (!o.keep) el.remove(); });
  }
  const fly = (dx, dy, s0 = 0.6, s1 = 1) => [
    { transform: `translate(0,0) scale(${s0})`, opacity: 0 },
    { opacity: 1, offset: 0.15 },
    { transform: `translate(${dx}px,${dy}px) scale(${s1})`, opacity: 1 }
  ];
  const pop = (s0 = 0.4, s1 = 1.6) => [
    { transform: `scale(${s0})`, opacity: 1 },
    { transform: `scale(${s1})`, opacity: 0 }
  ];

  function burst(at, t, size = 64) {
    return run(particle(t.img, at.x, at.y, size, t.filter || ''), pop(), 320);
  }
  function impact(at) {
    return run(particle('impact', at.x, at.y, 70), pop(0.5, 1.4), 260);
  }

  // ---------- Templates ----------
  async function projectile(from, to, t) {
    const p = particle(t.img, from.x, from.y, 46, t.filter || '');
    await run(p, fly(to.x - from.x, to.y - from.y), 420, { easing: 'ease-in' });
    await burst(to, t);
  }
  async function beam(from, to, t) {
    const jobs = [];
    for (let i = 0; i < 8; i++) {
      const p = particle(t.img, from.x, from.y, 40, t.filter || '');
      jobs.push(run(p, fly(to.x - from.x, to.y - from.y, 0.8, 1.2), 320, { delay: i * 45, easing: 'linear' }));
    }
    await Promise.all(jobs);
    await burst(to, t, 80);
  }
  async function lunge(from, to, ms) {
    const dx = (to.x - from.x) * 0.35, dy = (to.y - from.y) * 0.35;
    await run(from.el, [{ translate: '0 0' }, { translate: `${dx}px ${dy}px`, offset: 0.5 }, { translate: '0 0' }], ms, { keep: true });
  }
  async function contact(from, to, t, ms = 340) {
    await lunge(from, to, ms);
    await Promise.all([impact(to), burst(to, t, 54)]);
  }
  async function punch(from, to) {
    await lunge(from, to, 300);
    await Promise.all([run(particle('fist', to.x, to.y, 50), pop(0.3, 1.5), 300), impact(to)]);
  }
  async function bite(from, to) {
    await lunge(from, to, 280);
    const top = particle('topbite', to.x, to.y - 30, 60), bot = particle('bottombite', to.x, to.y + 30, 60);
    await Promise.all([
      run(top, [{ transform: 'translateY(-20px)', opacity: 0.2 }, { transform: 'translateY(22px)', opacity: 1 }], 260, { easing: 'ease-in' }),
      run(bot, [{ transform: 'translateY(20px)', opacity: 0.2 }, { transform: 'translateY(-22px)', opacity: 1 }], 260, { easing: 'ease-in' })
    ]);
    await impact(to);
  }
  async function slash(from, to) {
    await lunge(from, to, 260);
    const c = particle('leftclaw', to.x, to.y, 80);
    await run(c, [{ transform: 'translate(-30px,-30px) scale(.6)', opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'translate(30px,30px) scale(1.1)', opacity: 0 }], 300);
  }
  async function quake(from, to) {
    const arena = $('.arena');
    const shakeFrames = [];
    for (let i = 0; i <= 8; i++) shakeFrames.push({ translate: i === 8 ? '0 0' : `${i % 2 ? 7 : -7}px 0` });
    const jobs = [run(arena, shakeFrames, 520, { keep: true, easing: 'linear' })];
    for (let i = 0; i < 4; i++) {
      const p = particle('mudwisp', to.x + (i - 1.5) * 26, to.y + to.w * 0.3, 48);
      jobs.push(run(p, [{ transform: 'translateY(10px) scale(.5)', opacity: 1 }, { transform: 'translateY(-45px) scale(1.2)', opacity: 0 }], 480, { delay: i * 60 }));
    }
    await Promise.all(jobs);
  }
  async function rockfall(from, to) {
    const jobs = [];
    for (let i = 0; i < 3; i++) {
      const p = particle(i % 2 ? 'rock3' : 'rock1', to.x + (i - 1) * 28, to.y - 10, 42);
      jobs.push(run(p, [{ transform: 'translateY(-130px)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translateY(0)', opacity: 1 }], 360, { delay: i * 90, easing: 'ease-in' }));
    }
    await Promise.all(jobs);
    await impact(to);
  }
  async function sound(from, to, type) {
    const jobs = [];
    for (let i = 0; i < 3; i++) {
      const ring = shape('fx-ring', from.x, from.y, 60, TYPE_TINT[type]);
      jobs.push(run(ring, [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(4)', opacity: 0 }], 520, { delay: i * 120 }));
    }
    await Promise.all(jobs);
  }
  async function statusMove(from, to, t) {
    const jobs = [];
    const r = to.w * 0.35;
    for (let i = 0; i < 5; i++) {
      const p = particle(t.img, to.x, to.y, 30, t.filter || '');
      const frames = [];
      for (let k = 0; k <= 8; k++) {
        const ang = (i / 5 + k / 8) * Math.PI * 2;
        frames.push({ transform: `translate(${Math.cos(ang) * r}px,${Math.sin(ang) * r * 0.6}px)`, opacity: k === 8 ? 0 : 1 });
      }
      jobs.push(run(p, frames, 650, { easing: 'linear' }));
    }
    await Promise.all(jobs);
  }
  async function selfBuff(from, heal) {
    const filter = heal ? 'sepia(1) saturate(5) hue-rotate(70deg)' : '';
    const jobs = [run(from.el, [{ filter: 'brightness(1)' }, { filter: `brightness(1.8) drop-shadow(0 0 10px ${heal ? '#5f5' : '#fff'})` }, { filter: 'brightness(1)' }], 500, { keep: true })];
    for (let i = 0; i < 6; i++) {
      const p = particle('shine', from.x + (i - 2.5) * 18, from.y + from.w * 0.25, 26, filter);
      jobs.push(run(p, [{ transform: 'translateY(0) scale(.5)', opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'translateY(-70px) scale(1)', opacity: 0 }], 520, { delay: i * 50 }));
    }
    await Promise.all(jobs);
  }

  // ---------- Public API ----------
  async function move(fromSide, m, type) {
    if (!enabled()) return;
    try {
      const from = center(fromSide), to = center(fromSide === 'p' ? 'b' : 'p');
      const t = TYPE_FX[type] || TYPE_FX.Normal;
      if (m.cat === 'x') return m.inflict ? await statusMove(from, to, t) : await selfBuff(from, !!m.heal);
      if (m.sound) return await sound(from, to, type);
      if (type === 'Ground') return await quake(from, to);
      if (type === 'Rock' && m.cat === 'p') return await rockfall(from, to);
      if (m.cat === 'p') {
        if (m.prio > 0) return await contact(from, to, t, 200);
        if (m.punch) return await punch(from, to);
        if (m.bite) return await bite(from, to);
        if (m.slicing) return await slash(from, to);
        return await contact(from, to, t);
      }
      if (m.pulse || m.power >= 110) return await beam(from, to, t);
      return await projectile(from, to, t);
    } catch (e) { /* never let an effect break a battle */ }
  }

  function stat(side, up) {
    if (!enabled()) return;
    try {
      const at = center(side);
      for (let i = 0; i < 3; i++) {
        const a = shape('fx-arrow ' + (up ? 'up' : 'down'), at.x + (i - 1) * 26, at.y, 18, up ? '#ff8a3d' : '#4aa3ff');
        run(a, [{ transform: `translateY(${up ? 30 : -30}px)`, opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: `translateY(${up ? -40 : 40}px)`, opacity: 0 }], 520, { delay: i * 70 });
      }
    } catch (e) { /* ignore */ }
  }

  function status(side, st) {
    if (!enabled()) return;
    try {
      const at = center(side);
      const p = shape('fx-pulse', at.x, at.y, at.w * 0.8, STATUS_TINT[st] || '#fff');
      run(p, [{ transform: 'scale(.4)', opacity: 0.9 }, { transform: 'scale(1.3)', opacity: 0 }], 500);
    } catch (e) { /* ignore */ }
  }

  // Gold sparkle burst when a shiny Pokémon is sent out
  function shiny(side) {
    if (!enabled()) return;
    try {
      const at = center(side);
      for (let i = 0; i < 8; i++) {
        const ang = i / 8 * Math.PI * 2, r = at.w * 0.45;
        const p = particle('shine', at.x, at.y, 28, 'sepia(1) saturate(6) hue-rotate(5deg) brightness(1.3)');
        run(p, [{ transform: 'translate(0,0) scale(.3)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * r}px,${Math.sin(ang) * r}px) scale(1.1)`, opacity: 0 }], 650, { delay: i * 35 });
      }
    } catch (e) { /* ignore */ }
  }

  function weather(type) {
    const el = $('.fx-weather');
    if (!el) return;
    el.className = 'fx-weather' + (type && getOpts().anim !== false ? ' w-' + type : '');
  }

  window.FX = { move, stat, status, shiny, weather, setOptions: fn => { getOpts = fn; } };
})();
