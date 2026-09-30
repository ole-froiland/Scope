// Oversikt: «Hvordan går det i dag?» – I dag-kortet, neste grep og de siste
// periodene. Bare visning: test.js bygger modellen og eier all tilstand.
import {barChart} from './scope-chart.js?v=redesign-0930153930';

const nf = new Intl.NumberFormat('nb-NO');
const one = new Intl.NumberFormat('nb-NO', {maximumFractionDigits: 1});
const kr = n => 'kr ' + nf.format(Math.round(n));
const axisLabel = n => (n >= 1000 ? one.format(n / 1000) + 'k' : String(Math.round(n)));
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
let cleanups = [];

// Under one percent reads as flat, so the card never shouts about noise.
export function change(ratio) {
  const pct = Math.round(ratio * 100);
  if (!Number.isFinite(pct) || pct === 0) return {text: '→ 0 %', tone: 'is-flat'};
  return pct > 0 ? {text: '▲ ' + pct + ' %', tone: 'is-up'} : {text: '▼ ' + Math.abs(pct) + ' %', tone: 'is-down'};
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className, text, onClick) {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

export function renderOverview(root, model, actions) {
  cleanups.forEach(stop => stop());
  cleanups = [];
  root.className = 'ov';
  root.replaceChildren(head(model), hero(model, actions), bottom(model, actions));
}

function head(model) {
  const header = el('header', 'ov-head');
  const title = el('h2', '', 'I dag');
  title.append(el('span', '', model.dateLabel));
  const before = model.today.phase === 'before';
  header.append(title, el('span', 'ov-live' + (before ? ' is-closed' : ''), (before ? 'Åpner kl. 11' : 'Live fra kassen') + ' · oppdatert ' + model.updated));
  return header;
}

function kpi(spec, onClick) {
  const node = button('ov-kpi' + (spec.main ? ' ov-kpi-main' : ''), undefined, onClick);
  const meta = el('span', 'ui-stat-meta');
  if (spec.chip) meta.append(el('span', 'ui-chip ' + spec.chip.tone, spec.chip.text));
  if (spec.delta) meta.append(el('span', 'ui-delta ' + spec.delta.tone, spec.delta.text));
  meta.append(document.createTextNode(spec.meta));
  node.append(el('span', 'ui-stat-label', spec.label), el('span', 'ui-stat-value', spec.value), meta);
  if (spec.extra) {
    const more = el('span', 'ui-stat-meta ov-kpi-extra', spec.extra[0] + ' ');
    more.append(el('b', '', spec.extra[1]));
    node.append(more);
  }
  return node;
}

function hourBar(h, index, nowIndex, weekdayName) {
  const span = 'kl. ' + h.hour + '–' + (h.hour + 1);
  const normal = ['Vanlig ' + weekdayName, kr(h.normal)];
  let title, tip;
  if (index < nowIndex) { title = span; tip = [['I dag', kr(h.actual)], normal, ['Forskjell', change(h.actual / h.normal - 1).text]]; }
  else if (index === nowIndex) { title = span + ' · pågår'; tip = [['Så langt', kr(h.actual)], ['Hele timen, anslått', kr(h.forecast)], normal]; }
  else { title = span + ' · prognose'; tip = [['Prognose', kr(h.forecast)], normal]; }
  return {label: String(h.hour), value: h.actual, ghost: h.forecast, current: index === nowIndex, title, tip,
    aria: title + ': ' + tip.map(([name, value]) => name + ' ' + value).join(', ')};
}

function hero(model, actions) {
  const {today, weekdayName} = model;
  const before = today.phase === 'before';
  const card = el('section', 'ui-card ov-hero');
  card.setAttribute('aria-label', 'Dagen så langt');
  const ticket = today.guests ? today.revenue / today.guests : 0;
  const normalTicket = today.normalGuests ? today.normalRevenue / today.normalGuests : 0;
  const hour = today.hours[today.nowIndex];
  const perStaff = today.staffNow && hour ? hour.forecastGuests / today.staffNow : 0;
  const kpis = el('div', 'ov-kpis');
  kpis.append(
    kpi(before
      ? {main: true, label: 'Prognose i dag', value: kr(today.normalDayRevenue), meta: 'Vanlig nivå for en ' + weekdayName}
      : {main: true, label: 'Omsetning så langt', value: kr(today.revenue), chip: change(today.revenue / today.normalRevenue - 1),
        meta: 'mot en vanlig ' + weekdayName, extra: ['Prognose i dag', kr(today.forecastRevenue)]}, actions.openSales),
    kpi(before
      ? {label: 'Forventede gjester', value: nf.format(today.forecastGuests), meta: 'hele dagen'}
      : {label: 'Gjester', value: nf.format(today.guests), delta: change(today.guests / today.normalGuests - 1), meta: 'mot vanlig'}, actions.openSales),
    kpi(before
      ? {label: 'Snitt per gjest', value: kr(today.forecastGuests ? today.forecastRevenue / today.forecastGuests : 0), meta: 'forventet'}
      : {label: 'Snitt per gjest', value: kr(ticket), delta: change(ticket / normalTicket - 1), meta: 'mot vanlig'}, actions.openSales),
    kpi(before
      ? {label: 'På vakt i kveld', value: nf.format(today.plannedStaff), meta: 'planlagt'}
      : {label: 'På vakt nå', value: nf.format(today.staffNow), meta: one.format(perStaff) + ' gjester per ansatt nå'}, actions.openStaff)
  );

  const chartHead = el('div', 'ov-chart-head');
  const legend = el('div', 'ov-legend');
  legend.setAttribute('aria-hidden', 'true');
  [['', 'I dag'], ['is-line', 'Vanlig ' + weekdayName], ['is-ghost', 'Prognose']].forEach(([kind, text]) => {
    const item = el('span');
    item.append(el('i', kind), document.createTextNode(text));
    legend.append(item);
  });
  chartHead.append(el('h3', '', 'Omsetning per time'), legend);

  const chart = el('div', 'ov-chart');
  chart.setAttribute('role', 'group');
  chart.setAttribute('aria-label', 'Omsetning per time i dag. Bruk piltastene for å gå mellom timene.');
  cleanups.push(barChart(chart, {
    bars: today.hours.map((h, index) => hourBar(h, index, today.nowIndex, weekdayName)),
    line: today.hours.map(h => h.normal),
    format: axisLabel,
    onSelect: () => actions.openSales()
  }));
  card.append(kpis, chartHead, chart);
  return card;
}

function bottom(model, actions) {
  const row = el('div', 'ov-bottom');
  row.append(tasksPanel(model.tasks, actions), periodPanel(model.period, actions));
  return row;
}

function tasksPanel(tasks, actions) {
  const panel = el('section', 'ui-card ov-panel');
  panel.setAttribute('aria-label', 'Gjør dette nå');
  const open = tasks.filter(task => task.status !== 'done').length;
  const head = el('div', 'ui-panel-head');
  const title = el('h2', '', 'Gjør dette nå');
  title.append(el('small', '', open ? open + (open === 1 ? ' åpen' : ' åpne') : 'Alt gjort'));
  head.append(title, button('ui-link', 'Alle tiltak →', actions.openAllTasks));
  panel.append(head);
  if (!tasks.length) {
    panel.append(el('p', 'ui-empty', 'Ingen tiltak akkurat nå. Scope sier fra når tallene gir grunn til det.'));
    return panel;
  }
  tasks.forEach(task => {
    const done = task.status === 'done';
    const row = el('div', 'ui-row ov-task' + (done ? ' is-done' : ''));
    row.dataset.task = task.id;
    const check = button('ov-check', undefined, () => actions.toggleTask(task.id));
    check.setAttribute('role', 'checkbox');
    check.setAttribute('aria-checked', String(done));
    check.setAttribute('aria-label', task.title);
    check.innerHTML = CHECK;
    const text = el('div', 'ov-task-text');
    const name = el('div', 'ov-task-title', task.title), why = el('div', 'ov-task-why', task.basis);
    name.title = task.title;
    why.title = task.basis;
    text.append(name, why);
    const value = el('div', 'ov-task-value');
    value.append(el('strong', '', task.value), document.createTextNode(task.valueNote));
    row.append(check, text, value, button('ui-btn', task.action, () => actions.runTask(task.id)));
    panel.append(row);
  });
  return panel;
}

function periodPanel(period, actions) {
  const panel = el('section', 'ui-card ov-panel');
  panel.setAttribute('aria-label', period.title);
  const head = el('div', 'ui-panel-head');
  const seg = el('div', 'ui-seg');
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', 'Periode');
  [['day', 'Dag'], ['week', 'Uke'], ['month', 'Måned']].forEach(([kind, label]) => {
    const option = button('', label, () => actions.setPeriod(kind));
    option.dataset.period = kind;
    option.setAttribute('aria-pressed', String(period.kind === kind));
    seg.append(option);
  });
  head.append(el('h2', '', period.title), seg);

  const sum = el('div', 'ov-sum');
  const delta = change(period.change);
  sum.append(el('span', 'ui-stat-value', kr(period.total)), el('span', 'ui-delta ' + delta.tone, delta.text), el('span', 'ui-stat-label', period.changeLabel));

  const chart = el('div', 'ov-period-chart');
  chart.setAttribute('role', 'group');
  chart.setAttribute('aria-label', period.title + '. Velg en søyle for å åpne rapporten.');
  cleanups.push(barChart(chart, {
    bars: period.bars, axis: false, tone: 'neutral', format: axisLabel,
    onSelect: index => { const offset = period.bars[index].offset; if (offset === null) actions.openSales(); else actions.openReport(offset); }
  }));

  const note = el('p', 'ov-note', period.best.lead + ' ');
  note.append(el('b', '', period.best.name), document.createTextNode(' · ' + period.best.text));
  panel.append(head, sum, chart, note);
  return panel;
}
