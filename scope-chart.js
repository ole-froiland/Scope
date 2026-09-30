// Felles søylegraf for arbeidsflaten: SVG-søyler, valgfri sammenligningslinje og
// ekte knapper over hver kolonne, så mus, klikk og tastatur oppfører seg likt.
const SVG_NS = 'http://www.w3.org/2000/svg';

// Round the axis top up to a friendly number: 9 100 → 10 000.
export function niceScale(max, steps = 2) {
  if (!(max > 0)) return {max: 1, ticks: [0, 1]};
  const raw = max / steps, magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(m => m * magnitude).find(s => s >= raw);
  return {max: step * steps, ticks: Array.from({length: steps + 1}, (_, i) => i * step)};
}

const escape = text => String(text).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

export function barChart(root, {bars, line = null, format = String, onSelect = null, axis = true, tone = ''}) {
  root.classList.add('ui-chart');
  if (tone) root.dataset.tone = tone;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const hits = document.createElement('div');
  hits.className = 'ui-chart-hits';
  const tip = document.createElement('div');
  tip.className = 'ui-tip';
  tip.hidden = true;
  root.replaceChildren(svg, hits, tip);

  const scale = niceScale(Math.max(0, ...bars.map(bar => Math.max(bar.value, bar.ghost || 0)), ...(line || [])));
  const left = axis ? 40 : 0, bottom = 22, top = 8;
  const focusStart = Math.max(0, bars.findIndex(bar => bar.current));
  let slot = 0, y = () => 0;
  hits.style.left = left + 'px';

  bars.forEach((bar, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.tabIndex = index === focusStart ? 0 : -1;
    button.setAttribute('aria-label', bar.aria);
    button.addEventListener('mouseenter', () => show(index));
    button.addEventListener('focus', () => show(index));
    button.addEventListener('mouseleave', hide);
    button.addEventListener('blur', hide);
    button.addEventListener('keydown', event => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const next = hits.children[Math.max(0, Math.min(bars.length - 1, index + step))];
      [...hits.children].forEach(other => { other.tabIndex = other === next ? 0 : -1; });
      next.focus();
    });
    if (onSelect) button.addEventListener('click', () => onSelect(index));
    hits.append(button);
  });

  function draw() {
    const width = root.clientWidth, height = root.clientHeight;
    if (!width || !height) return;
    slot = (width - left) / bars.length;
    const barWidth = Math.min(34, slot * 0.56);
    y = value => top + (height - top - bottom) * (1 - value / scale.max);
    let out = '';
    if (axis) scale.ticks.forEach(tick => {
      out += `<line class="ui-chart-grid${tick ? '' : ' is-base'}" x1="${left}" x2="${width}" y1="${y(tick)}" y2="${y(tick)}"/>`;
      out += `<text class="ui-chart-axis" x="${left - 10}" y="${y(tick) + 4}" text-anchor="end">${escape(format(tick))}</text>`;
    });
    bars.forEach((bar, index) => {
      const center = left + slot * index + slot / 2, x = center - barWidth / 2, current = bar.current ? ' is-current' : '';
      if ((bar.ghost || 0) > bar.value) out += `<rect class="ui-chart-ghost" x="${x}" y="${y(bar.ghost)}" width="${barWidth}" height="${y(0) - y(bar.ghost)}" rx="5"/>`;
      if (bar.value > 0) out += `<rect class="ui-chart-bar${current}" x="${x}" y="${y(bar.value)}" width="${barWidth}" height="${y(0) - y(bar.value)}" rx="5"/>`;
      out += `<text class="ui-chart-label${current}" x="${center}" y="${height - 5}" text-anchor="middle">${escape(bar.label)}</text>`;
    });
    if (line) out += `<polyline class="ui-chart-line" points="${line.map((value, index) => `${left + slot * index + slot / 2},${y(value)}`).join(' ')}"/>`;
    const now = bars.findIndex(bar => bar.current);
    if (line && now >= 0) {
      const center = left + slot * now + slot / 2;
      out += `<line class="ui-chart-now" x1="${center}" x2="${center}" y1="${top - 2}" y2="${y(0)}"/>`;
    }
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = out;
  }

  function show(index) {
    const bar = bars[index];
    const title = document.createElement('b');
    title.textContent = bar.title;
    tip.replaceChildren(title, ...bar.tip.map(([label, value]) => {
      const row = document.createElement('div'), name = document.createElement('span');
      name.textContent = label;
      row.append(name, document.createTextNode(value));
      return row;
    }));
    tip.hidden = false;
    const center = left + slot * index + slot / 2, half = tip.offsetWidth / 2;
    tip.style.left = Math.max(half, Math.min(root.clientWidth - half, center)) + 'px';
    tip.style.top = Math.max(0, y(Math.max(bar.value, bar.ghost || 0, line ? line[index] : 0)) - 8) + 'px';
  }

  function hide() { tip.hidden = true; }

  const observer = new ResizeObserver(draw);
  observer.observe(root);
  draw();
  return () => observer.disconnect();
}
