import { copy, periods, dishes, staff, demoMailto } from './scope-content.js?v=20260916-2';

import { initExperience, menuPriceScenario } from './scope-motion.js?v=20260916-2';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const storageKey = 'scope-17-language';
let language = 'no';
try { if (localStorage.getItem(storageKey) === 'en') language = 'en'; } catch { /* Private browsers can deny preference storage; the page remains usable. */ }
const state = { period:'week', view:'overview', scenario:'staffing', source:'pos', story:0 };
let experience;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const iconPaths = {
  pos:'M5 3h14v18l-3-2-4 2-4-2-3 2V3Zm4 5h6M9 12h6',
  accounts:'M4 4h16v16H4V4Zm4 4h8M8 12h2M14 12h2M8 16h2M14 16h2',
  staffing:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M18 8a3 3 0 0 1 0 6m4 7v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  bookings:'M4 5h16v16H4V5Zm0 5h16M8 3v4M16 3v4M8 14h2M14 14h2',
  takeaway:'M5 7h14l2 14H3L5 7Zm3 0V6a4 4 0 0 1 8 0v1',
  trend:'m3 17 6-6 4 4 8-10m-6 0h6v6',
  menu:'M5 3v6a3 3 0 0 0 6 0V3M8 3v18M19 3v18M19 3c-5 3-5 9 0 9',
  spark:'m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3Z',
  profit:'M4 20V10M10 20V4M16 20v-7M22 20V7'
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPaths[name] || iconPaths.spark}"/></svg>`; }
function number(value, digits = 0) { return new Intl.NumberFormat(language === 'no' ? 'nb-NO' : 'en-GB', { maximumFractionDigits:digits, minimumFractionDigits:digits }).format(value); }
function percent(value) { return `${number(value,1)}${language === 'no' ? ' %' : '%'}`; }
function animatePanel(element) { if (reduceMotion.matches) return; element.classList.remove('state-enter'); void element.offsetWidth; element.classList.add('state-enter'); }
function kpi(label, value, unit, note, name, positive = false) { return `<div class="kpi"><div class="kpi-label">${icon(name)}${label}</div><div class="kpi-value">${value}<span class="kpi-unit">${unit}</span></div><div class="kpi-sub${positive ? ' positive' : ''}">${note}</div></div>`; }
function chart(data) {
  const c = copy[language];
  const max = state.period === 'week' ? 60000 : 15000;
  const x = index => 38 + index * 420 / (data.values.length - 1);
  const y = value => 130 - value / max * 113;
  const path = values => values.map((value,index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
  const last = data.values.length - 1;
  const summary = data.values.map((value,index) => `${c[data.labels][index]}: ${number(value)} ${c.currency}`).join('; ');
  return `<svg class="revenue-chart" viewBox="0 0 470 160" role="img" aria-label="${c.revenueChart}: ${summary}"><defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#9bdccb" stop-opacity=".16"/><stop offset="100%" stop-color="#9bdccb" stop-opacity="0"/></linearGradient></defs>${[0,.5,1].map(t=>`<line class="chart-grid" x1="38" x2="458" y1="${y(max*t)}" y2="${y(max*t)}"/><text class="chart-label" x="0" y="${y(max*t)+3}">${number(max*t/1000)}k</text>`).join('')}<path class="chart-area" d="${path(data.values)}L${x(last)},130L38,130Z"/><path class="chart-target" d="${path(data.targets)}"/><path class="chart-line" pathLength="1" d="${path(data.values)}"/><circle class="chart-point" cx="${x(last)}" cy="${y(data.values[last])}" r="4"/><circle class="chart-point-core" cx="${x(last)}" cy="${y(data.values[last])}" r="2.5"/>${c[data.labels].map((label,index)=>`<text class="chart-label" text-anchor="middle" x="${x(index)}" y="153">${label}</text>`).join('')}</svg>`;
}
function miniRecommendation(key, title, detail) { return `<button type="button" class="mini-recommendation" data-jump-scenario="${key}"><span class="recommend-icon">${icon(key)}</span><span><span class="mini-title">${title}</span><span class="mini-detail">${detail}</span></span><span class="mini-arrow" aria-hidden="true">›</span></button>`; }
function overview() {
  const c = copy[language], d = periods[state.period];
  return `<div class="kpi-row">${kpi(c.revenue,number(d.revenue),c.currency,`↗ ${percent(d.change)} ${c.vsPrevious}`,'trend',true)}${kpi(c.laborCost,percent(d.labor),'',`${state.period === 'day' ? '+' : '−'}${number(state.period === 'day' ? 5.4 : .2,1)} ${c.points} ${c.vsTarget}`,'staffing',state.period === 'week')}${kpi(c.foodCost,percent(d.food),'',`−${number(30-d.food,1)} ${c.points} ${c.vsTarget}`,'menu',true)}${kpi(c.estimatedProfit,number(d.profit),c.currency,c.allCosts,'profit')}</div><div class="dashboard-grid"><div class="chart-panel"><div class="panel-heading"><h3>${c.revenueChart}</h3><span>${c[state.period === 'day' ? 'today' : 'thisWeek']}</span></div><div class="chart-legend"><span><i class="legend-dot"></i>${c.actual}</span><span><i class="legend-dash"></i>${c.target}</span></div>${chart(d)}<div class="chart-footer"><span>${c.guests}<strong>${number(d.guests)}</strong></span><span>${c.takeawayOrders}<strong>${d.takeaway}</strong></span></div></div><div class="recommend-panel"><div class="panel-heading"><h3 class="recommend-title">${icon('spark')}${c.recommends}</h3><span class="recommend-count" aria-label="3 ${c.priorities}">3</span></div>${miniRecommendation('staffing',c.miniStaff,c.miniStaffDetail)}${miniRecommendation('menu',c.miniMenu,c.miniMenuDetail)}${miniRecommendation('takeaway',c.miniTakeaway,c.miniTakeawayDetail)}</div></div>`;
}
function menu() {
  const c = copy[language];
  const sales = dishes.reduce((sum,dish) => sum + dish.price * dish[state.period], 0);
  const costs = dishes.reduce((sum,dish) => sum + dish.cost * dish[state.period], 0);
  const average = (sales - costs) / sales * 100;
  return `<div class="menu-summary"><div><h3>${c.topDishes}</h3><p>${c.dishDescription}</p></div><span class="metric-badge">${c.averageMargin} · ${percent(average)}</span></div><table class="menu-table"><thead><tr><th scope="col">${c.dish}</th><th scope="col">${c.price}</th><th class="optional-column" scope="col">${c.food}</th><th scope="col">${c.sold}</th><th scope="col">${c.margin}</th></tr></thead><tbody>${dishes.map((dish,index)=>{const margin=(dish.price-dish.cost)/dish.price*100;return `<tr><td>${dish.name[language]}</td><td>${number(dish.price)}</td><td class="optional-column">${number(dish.cost)}</td><td>${dish[state.period]}</td><td><span class="margin-cell ${index===3?'attention':'positive'}"><span class="margin-track ${index===3?'low':''}"><i style="width:${margin}%"></i></span>${percent(margin)}</span></td></tr>`;}).join('')}</tbody></table><p class="menu-footnote">${c.menuNote} ${c.currency}.</p>`;
}
function staffing() {
  const c = copy[language];
  return `<div class="menu-summary"><div><h3>${c.staffingHeading}</h3><p>${c.staffingDescription}</p></div><span class="metric-badge">${c.today}</span></div><div class="staffing-view"><div><div class="chart-legend"><span><i class="legend-dot" style="background:var(--mint)"></i>${c.scheduled}</span><span><i class="legend-dot" style="background:#649d9560"></i>${c.needed}</span></div><div class="staff-chart" role="img" aria-label="${staff.map(s=>`${s.hour}: ${c.scheduled} ${s.scheduled}, ${c.needed} ${s.needed} ${c.people}`).join('; ')}">${staff.map(s=>`<div class="staff-slot${s.hour==='15'?' highlight':''}" data-label="${s.hour}"><div class="staff-bar actual" style="height:${s.scheduled/7*100}%"></div><div class="staff-bar" style="height:${s.needed/7*100}%"></div></div>`).join('')}</div></div><div class="staff-insight"><div class="recommend-title">${icon('spark')}${c.recommends}</div><h4>${c.staffingInsight}</h4><p>${c.staffingWhy}</p><button type="button" data-jump-scenario="staffing">${c.inspectRecommendation} <span aria-hidden="true">↗</span></button></div></div>`;
}
function renderDashboard() {
  const panel = $('#dashboard-panel');
  panel.innerHTML = ({overview,menu,staffing})[state.view]();
  panel.setAttribute('aria-labelledby', `tab-${state.view}`);
  // Staffing uses the daily roster; hide the period control instead of implying a weekly view.
  $('.period-switch').hidden = state.view === 'staffing';
  $$('[data-view]').forEach(button => { const active = button.dataset.view === state.view; button.setAttribute('aria-selected',String(active)); button.tabIndex = active ? 0 : -1; });
  $$('[data-period]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.period === state.period)));
  animatePanel(panel);
}
function renderRecommendation() {
  const c = copy[language], s = c.scenarios[state.scenario], panel = $('#recommendation-panel');
  panel.innerHTML = `<div class="old-way"><span class="comparison-label">${c.ordinaryDashboard}</span><div><div class="old-value">${s.value}</div><p class="old-metric">${s.metric}</p></div><p class="old-caption">${c.contextMissing}</p></div><span class="comparison-arrow" aria-hidden="true">→</span><article class="new-way"><div class="recommend-title">${icon('spark')}${c.recommends}</div><h3>${s.title}</h3><p>${s.description}</p><div class="effect-row"><div><span>${c.possibleEffect}</span><strong>${s.effect}</strong></div><p>${s.assumption}</p></div></article>`;
  panel.setAttribute('aria-labelledby',`scenario-${state.scenario}`);
  $$('[data-scenario]').forEach(button => { const active=button.dataset.scenario===state.scenario; button.setAttribute('aria-selected',String(active)); button.tabIndex=active?0:-1; });
  animatePanel(panel);
}
function renderSource() {
  const source = copy[language].sources[state.source];
  $('#source-insight').innerHTML = `<h3>${source.title}</h3><p>${source.description}</p>`;
  $$('[data-source]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.source===state.source)));
}
function applyLanguage() {
  const c = copy[language];
  document.documentElement.lang = language === 'no' ? 'nb' : 'en';
  document.title = c.title;
  $('meta[name="description"]').content = c.description;
  $$('[data-i18n]').forEach(element=>{element.textContent=c[element.dataset.i18n];});
  $$('[data-i18n-aria]').forEach(element=>{element.setAttribute('aria-label',c[element.dataset.i18nAria]);});
  $$('[data-i18n-alt]').forEach(element=>{element.alt=c[element.dataset.i18nAlt];});
  $$('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===language)));
  $$('[data-demo]').forEach(link=>{link.href=`mailto:post@scopeanalytics.no?subject=${encodeURIComponent(c.emailSubject)}`;});
  $('.menu-toggle').setAttribute('aria-label',c[$('.menu-toggle').getAttribute('aria-expanded')==='true'?'closeMenu':'openMenu']);
  if ($('#draft-status').textContent) $('#draft-status').textContent=c.draftStatus;
  renderDashboard(); renderRecommendation(); renderSource(); renderStory(); renderDish();
  experience?.refresh();
}
function renderStory() {
  const c = copy[language];
  const phase = c.storyPhases[state.story];
  $('#story-title').textContent = phase.title;
  $('#story-subtitle').textContent = phase.subtitle;
  $('#story-description').textContent = phase.description;
  $('#story-index').textContent = String(state.story + 1);
  $('.fragment-accounts > strong').innerHTML = `${number(28.1,1)} <small>%</small>`;
  $('.fragment-staff > strong').innerHTML = `${number(37.4,1)} <small>%</small>`;
  $('.console-metric > strong').innerHTML = `${number(37.4,1)}<small>%</small>`;
  $('.fragment-pos > strong').innerHTML = `${number(48650)} <small>${c.currency}</small>`;
  $('.scene-revenue > strong').innerHTML = `${number(48650)} <small>${c.currency}</small>`;
  $('.action-effect > strong').innerHTML = `${number(3200)} <small>${c.currency}</small>`;
  $('.scene-meta > span:last-child:not(:first-child)').textContent = `↗ ${percent(8.2)}`;
}
function renderDish() {
  const c = copy[language];
  const data = menuPriceScenario($('#dish-price-slider').value);
  $('#dish-margin').innerHTML = `${number(data.margin,1)}<span>%</span>`;
  $('#dish-price').textContent = `${number(data.price)} ${c.currency}`;
  $('#dish-cost').textContent = `${number(data.cost)} ${c.currency}`;
  $('#dish-contribution').textContent = `${number(data.contribution)} ${c.currency}`;
  $('#margin-fill').style.width = `${data.margin}%`;
  $('#dish-price-slider').setAttribute('aria-valuetext',`${number(data.price)} ${c.currency}`);
  $('#dish-impact').textContent = data.weeklyChange === 0 ? c.dishCurrent : `${data.weeklyChange>0?'+':'−'}${number(Math.abs(data.weeklyChange))} ${c.currency} ${c[data.weeklyChange>0?'dishImpactMore':'dishImpactLess']}`;
}
function setMenu(open) {
  $('.menu-toggle').setAttribute('aria-expanded',String(open));
  $('.menu-toggle').setAttribute('aria-label',copy[language][open?'closeMenu':'openMenu']);
  $('#mobile-nav').hidden = !open;
}
function showDialog(dialog) { setMenu(false); dialog.showModal(); }
// Native buttons, tab semantics and arrow-key navigation are shared by both tab sets.
$$('[role="tablist"]').forEach(list=>list.addEventListener('keydown',event=>{
  if (!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
  const tabs=$$('[role="tab"]',list), index=tabs.indexOf(document.activeElement);
  if(index<0) return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  tabs[next].focus(); tabs[next].click();
}));
document.addEventListener('click',event=>{
  const button=event.target.closest('button,a'); if(!button) return;
  if(button.dataset.language) { language=button.dataset.language; try { localStorage.setItem(storageKey,language); } catch { /* Storage is optional. */ } applyLanguage(); }
  if(button.dataset.period) { state.period=button.dataset.period; renderDashboard(); }
  if(button.dataset.view) { state.view=button.dataset.view; renderDashboard(); }
  if(button.dataset.scenario) { state.scenario=button.dataset.scenario; renderRecommendation(); }
  if(button.dataset.source) { state.source=button.dataset.source; renderSource(); }
  if(button.dataset.jumpScenario) { state.scenario=button.dataset.jumpScenario; renderRecommendation(); $('#anbefalinger').scrollIntoView({behavior:reduceMotion.matches?'instant':'smooth',block:'start'}); $(`#scenario-${state.scenario}`).focus({preventScroll:true}); }
  if(button.hasAttribute('data-demo')) { event.preventDefault(); showDialog($('#demo-dialog')); }
  if(button.hasAttribute('data-privacy')) showDialog($('#privacy-dialog'));
  if(button.hasAttribute('data-close')) button.closest('dialog').close();
  if(button.classList.contains('menu-toggle')) setMenu(button.getAttribute('aria-expanded')!=='true');
  if(button.closest('#mobile-nav')) setMenu(false);
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('.menu-toggle').getAttribute('aria-expanded')==='true'){setMenu(false);$('.menu-toggle').focus();}});
window.matchMedia('(min-width: 901px)').addEventListener('change',event=>{if(event.matches)setMenu(false);});
$$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{
  if(event.target!==dialog) return;
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom) dialog.close();
}));
$('#demo-form').addEventListener('submit',event=>{
  event.preventDefault();
  const name=$('#demo-name').value.trim(), restaurant=$('#demo-restaurant').value.trim();
  if(!name||!restaurant){(!name?$('#demo-name'):$('#demo-restaurant')).focus();return;}
  const link=document.createElement('a');
  link.href=demoMailto(language,name,restaurant); link.click();
  $('#draft-status').textContent=copy[language].draftStatus;
});
$$('[data-icon]').forEach(element=>{element.innerHTML=icon(element.dataset.icon);});
$('#year').textContent=String(new Date().getFullYear());
$('#dish-price-slider').addEventListener('input',renderDish);
applyLanguage();
experience = initExperience({onPhase:phase=>{state.story=phase;renderStory();}});
if('IntersectionObserver' in window && !reduceMotion.matches) {
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('is-waiting');observer.unobserve(entry.target);}}),{threshold:.08});
  $$('.reveal').forEach(element=>{if(element.getBoundingClientRect().top>window.innerHeight){element.classList.add('is-waiting');observer.observe(element);}});
  reduceMotion.addEventListener('change',event=>{if(event.matches){$$('.is-waiting').forEach(element=>element.classList.remove('is-waiting'));observer.disconnect();}});
}
