// A visible app cursor; every click goes through the existing UI control.
export function startScopePointer(origin) {
  const controller = new AbortController();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cursor = document.createElement('div');
  cursor.className = 'scope-pointer';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<i class="scope-pointer-ring"></i><svg viewBox="0 0 28 32" fill="none"><path d="M3 2v23l6-6 5 10 5-2-5-10h9L3 2Z" fill="currentColor" stroke="var(--app-paper)" stroke-width="2" stroke-linejoin="round"/></svg><span>Scope</span>';
  const status = document.createElement('div');
  status.className = 'scope-pointer-status';
  const label = document.createElement('span');
  label.setAttribute('role', 'status');
  label.textContent = 'Scope gjør klar …';
  const stop = document.createElement('button');
  stop.type = 'button'; stop.textContent = 'Stopp'; stop.title = 'Stopp · Escape';
  stop.addEventListener('click', () => controller.abort());
  status.append(label, stop);
  document.body.append(cursor, status);
  const rect = origin?.getBoundingClientRect();
  let position = { x: rect ? rect.x + rect.width / 2 : innerWidth / 2, y: rect ? rect.y + rect.height / 2 : innerHeight - 90 };
  const transform = p => `translate3d(${p.x}px, ${p.y}px, 0)`;
  cursor.style.transform = transform(position);
  const interrupt = event => { if (event.isTrusted) controller.abort(); };
  const keys = event => { if (event.isTrusted && event.key !== 'Shift') controller.abort(); };
  document.addEventListener('pointerdown', interrupt, true);
  document.addEventListener('wheel', interrupt, { capture: true, passive: true });
  document.addEventListener('keydown', keys, true);
  window.addEventListener('resize', interrupt);
  function check() { if (controller.signal.aborted) throw new Error('Stoppet. Det som allerede ble klikket, er beholdt.'); }
  function pause(ms) {
    check();
    return new Promise((resolve, reject) => {
      const aborted = () => { clearTimeout(timer); reject(new Error('Stoppet. Det som allerede ble klikket, er beholdt.')); };
      const timer = setTimeout(() => { controller.signal.removeEventListener('abort', aborted); resolve(); }, ms);
      controller.signal.addEventListener('abort', aborted, { once: true });
    });
  }
  return {
    label(text) { label.textContent = text; },
    async click(target) {
      check();
      if (!target?.isConnected || target.disabled || target.closest('[hidden], [inert]')) throw new Error('Kontrollen er ikke tilgjengelig. Handlingen er stoppet.');
      target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      // Allow drawers and scroll containers to settle before measuring.
      await pause(reduced ? 0 : 220);
      const box = target.getBoundingClientRect();
      if (!box.width || !box.height) throw new Error('Kontrollen er skjult. Handlingen er stoppet.');
      const next = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      if (next.x < 0 || next.x > innerWidth || next.y < 0 || next.y > innerHeight) throw new Error('Kontrollen er utenfor skjermen. Handlingen er stoppet.');
      target.classList.add('scope-pointer-target');
      const motion = cursor.animate([
        { transform: transform(position) },
        { transform: transform({ x: position.x + (next.x - position.x) * .55, y: position.y + (next.y - position.y) * .42 }) },
        { transform: transform(next) },
      ], { duration: reduced ? 0 : 680, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'forwards' });
      try {
        await pause(reduced ? 0 : 700);
        check();
        const current = target.getBoundingClientRect();
        if (!target.isConnected || Math.abs(current.x - box.x) > 3 || Math.abs(current.y - box.y) > 3) throw new Error('Kontrollen flyttet seg. Handlingen er stoppet.');
        const hit = document.elementFromPoint(next.x, next.y);
        if (!hit || (hit !== target && !target.contains(hit))) throw new Error('Kontrollen er tildekket. Handlingen er stoppet.');
        position = next; cursor.style.transform = transform(position);
        cursor.classList.add('is-clicking');
        await pause(reduced ? 0 : 160);
        check();
        target.click();
        await pause(reduced ? 0 : 250);
      } finally {
        motion.cancel(); target.classList.remove('scope-pointer-target'); cursor.classList.remove('is-clicking');
      }
    },
    finish() {
      document.removeEventListener('pointerdown', interrupt, true);
      document.removeEventListener('wheel', interrupt, true);
      document.removeEventListener('keydown', keys, true);
      window.removeEventListener('resize', interrupt);
      cursor.remove(); status.remove();
    },
  };
}
