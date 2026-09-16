// The presentation follows native scroll; controls offer the same story without motion.
export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
function smooth(start, end, progress) {
  const x = clamp((progress - start) / (end - start));
  return x * x * (3 - 2 * x);
}
export function storyFrame(progress) {
  const p = clamp(progress);
  return {
    phase: p < .34 ? 0 : p < .73 ? 1 : 2,
    gather: smooth(.10, .36, p),
    console: smooth(.19, .36, p),
    scale: .92 + smooth(.23, .46, p) * .08,
    analysis: smooth(.43, .61, p),
    action: smooth(.73, .88, p),
    orbit: 1 - smooth(.12, .36, p),
  };
}
export function menuPriceScenario(price) {
  // Match the demonstrated carbonara: price 245, ingredients 121, 92 weekly sales.
  const normalized = clamp(Math.round(Number(price) / 5) * 5 || 245, 225, 285);
  return {price:normalized, cost:121, contribution:normalized-121, margin:(normalized-121)/normalized*100, weeklyChange:(normalized-245)*92};
}
export function initExperience({onPhase}) {
  const story = document.querySelector('.signal-story');
  const sticky = document.querySelector('.story-sticky');
  const hero = document.querySelector('.cinema-hero');
  const heroImage = document.querySelector('.hero-scene');
  const header = document.querySelector('.site-header');
  const controls = [...document.querySelectorAll('[data-story-step]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const shortScreen = matchMedia('(max-height: 600px), (min-width: 601px) and (max-height: 700px)');
  const manualStory = () => reduced.matches || shortScreen.matches;
  let raf = 0, phase = -1, manual = 0;

  function paint(progress) {
    const frame = storyFrame(progress);
    for (const [name,value] of Object.entries({gather:frame.gather,'console-opacity':frame.console,'console-scale':frame.scale,analysis:frame.analysis,action:frame.action,'orbit-opacity':frame.orbit})) {
      story.style.setProperty(`--${name}`,value.toFixed(4));
    }
    if (phase !== frame.phase) {
      phase = frame.phase;
      story.dataset.phase = String(phase);
      controls.forEach((button,index) => index === phase ? button.setAttribute('aria-current','step') : button.removeAttribute('aria-current'));
      onPhase(phase);
    }
  }
  function update() {
    raf = 0;
    header.classList.toggle('is-scrolled',scrollY > 35);
    const rect = story.getBoundingClientRect();
    const travel = Math.max(1,story.offsetHeight - sticky.offsetHeight);
    if (manualStory()) {
      paint(manual);
      heroImage.style.transform = '';
      return;
    }
    if (rect.bottom >= 0 && rect.top <= innerHeight) paint(clamp(-rect.top / travel));
    const heroBottom = hero.getBoundingClientRect().bottom;
    if (heroBottom > 0) heroImage.style.transform = `translateY(${Math.min(scrollY*.14,150).toFixed(1)}px) scale(1.015)`;
  }
  function schedule() {
    if (!raf) raf = requestAnimationFrame(update);
  }
  controls.forEach(button=>button.addEventListener('click',()=>{
    const target = [0,.54,.93][Number(button.dataset.storyStep)];
    if(manualStory()) { manual=target; paint(manual); return; }
    const top = story.getBoundingClientRect().top + scrollY;
    const travel = Math.max(1,story.offsetHeight - sticky.offsetHeight);
    scrollTo({top:top+target*travel,behavior:'smooth'});
  }));
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  const refreshMode = () => {manual=[0,.54,.93][Math.max(0,phase)];schedule();};
  reduced.addEventListener('change',refreshMode);
  shortScreen.addEventListener('change',refreshMode);
  // Keyboard focus can move directly from the hero to the controls without scrolling.
  paint(0);
  schedule();
  return {refresh:schedule,getPhase:()=>Math.max(0,phase)};
}
