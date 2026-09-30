// Calendar boundaries use local dates, avoiding UTC and daylight-saving offsets.
export function reportRange(kind, offset = 0, now = new Date()) {
  const y=now.getFullYear(), m=now.getMonth(), d=now.getDate();
  let start, end;
  if (kind === 'month') { start=new Date(y,m-1-offset,1); end=new Date(y,m-offset,0); }
  else if (kind === 'week') { const monday=d-(now.getDay()+6)%7; start=new Date(y,m,monday-7*(offset+1)); end=new Date(y,m,monday-1-7*offset); }
  else { start=new Date(y,m,d-1-offset); end=new Date(y,m,d-1-offset); }
  const days=[];
  for(let date=new Date(start);date<=end;date.setDate(date.getDate()+1)) days.push(new Date(date));
  return { start, end, days };
}
export function buildReport(profile, kind, offset, now, weights) {
  const range=reportRange(kind,offset,now);
  const points=range.days.map(date=>({date,revenue:profile.oms*weights[(date.getDay()+6)%7]/weights[3]}));
  const revenue=points.reduce((sum,p)=>sum+p.revenue,0);
  const cost=revenue*profile.varekost/100, wages=revenue*profile.lonn/100;
  return {...range,points,revenue,cost,wages,contribution:revenue-cost-wages,guests:Math.round(revenue/profile.oms*profile.gjester)};
}
export function improvementEffect(revenue, foodPoints, wagePoints) {
  return revenue * (Math.max(0,Math.min(3,Number(foodPoints)||0))+Math.max(0,Math.min(3,Number(wagePoints)||0)))/100;
}

// Illustrative hourly distribution, not POS events or an actual shift roster.
// 45% of the day precedes 18:00; 55% belongs to evening service.
export function buildDayTimeline(revenue, guests, staff) {
  const weights=[6,9,10,8,6,6,8,12,13,11,7,4];
  let share=0,previousGuests=0,previousRevenue=0;
  return weights.map((weight,index)=>{
    share+=weight;
    const totalGuests=Math.round(guests*share/100),totalRevenue=Math.round(revenue*share/100);
    const onDuty=Math.max(1,Math.round(staff*(index<4?0.55:index<6?0.75:index<10?1:0.7)));
    const point={hour:12+index,label:String(12+index).padStart(2,'0')+'–'+String(13+index).padStart(2,'0'),guests:totalGuests-previousGuests,revenue:totalRevenue-previousRevenue,totalGuests,totalRevenue,staff:onDuty};
    previousGuests=totalGuests;previousRevenue=totalRevenue;return point;
  });
}

// Advice is grounded in the same demo profile and evening staffing model as the UI.
// weekRevenue is a normal week for the same places; it prices the cost gap.
export function buildOperationalAdvice(profile, tomorrow, weekRevenue) {
  const format = new Intl.NumberFormat('nb-NO', {maximumFractionDigits: 1});
  const whole = new Intl.NumberFormat('nb-NO', {maximumFractionDigits: 0});
  const evening = new Intl.DateTimeFormat('nb-NO', {weekday: 'long'}).format(tomorrow.date) + ' kveld';
  const costAbove = profile.varekost > 30;
  const costGap = Math.round(weekRevenue * (profile.varekost - 30) / 100 / 100) * 100;
  const ratio = tomorrow.staff > 0 ? tomorrow.guests / tomorrow.staff : 0;
  const extra = Math.max(0, Math.ceil(tomorrow.guests / 18) - tomorrow.staff);
  const advice = [{
    id: 'cost', category: 'Varekost', horizon: 'Denne uken', view: 'varekost', action: 'Se innkjøp',
    title: costAbove ? 'Sjekk prisen på de tre største innkjøpene' : 'Tell de ti dyreste råvarene før neste bestilling',
    basis: 'Varekost '+format.format(profile.varekost)+' % · målet er 30 %',
    text: costAbove ? 'Sammenlign de to siste fakturaene. Avklar prisøkninger før neste bestilling.' : 'Sjekk lageret mot forbruket, og trekk beholdningen fra bestillingen.',
    value: costAbove ? 'kr '+whole.format(costGap) : 'Lager',
    valueNote: costAbove ? 'per uke' : 'før bestilling',
    priority: costAbove ? 3 : 1
  }, {
    id: 'plan', category: 'Bemanning', horizon: 'I morgen', view: 'bemanning', action: 'Se vaktplan',
    title: extra ? 'Avklar '+extra+' ekstra på kveldsvakten i morgen' : ratio < 15 ? 'Gjør prep før kveldsvakten' : 'Bekreft bemanningen før morgendagens kveldsvakt',
    basis: whole.format(Math.round(tomorrow.guests))+' forventede gjester · '+tomorrow.staff+' på vakt',
    text: extra ? 'Anslaget er '+format.format(ratio)+' gjester per ansatt. Sjekk bookingene og avklar ekstrahjelp før du endrer vaktplanen.' : ratio < 15 ? 'Flytt varepåfyll til rolige timer. Behold dekning når gjestene kommer.' : 'Gå gjennom bookingene med vaktleder. Fordel bord og pauser før serveringen starter.',
    value: extra ? '+'+extra+' på vakt' : whole.format(Math.round(tomorrow.guests))+' gjester',
    valueNote: evening,
    priority: extra ? 4 : 1
  }];
  if (profile.bilag > 0) advice.push({
    id: 'receipts', category: 'Regnskap', horizon: 'Før periodeslutt', view: 'resultat', action: 'Se sjekkliste',
    title: 'Hent '+profile.bilag+' manglende '+(profile.bilag===1?'kvittering':'kvitteringer'),
    basis: profile.bilag+' bilag mangler vedlegg',
    text: 'Be kjøperen sende kvitteringene før periodeslutt.',
    value: profile.bilag+' igjen', valueNote: 'før periodeslutt',
    priority: 2
  });
  return advice.sort((a,b)=>b.priority-a.priority);
}

// ---- «I dag» on the overview ---------------------------------------------
// The demo has no real till, so today is a normal weekday with a steady,
// seeded swing. Same place + date gives the same day on every reload.
export const OPEN_HOUR = 11;

export function normalDay(dayRevenue, dayGuests, hourWeights) {
  return hourWeights.map((weight, index) => ({hour: OPEN_HOUR + index, revenue: dayRevenue * weight, guests: dayGuests * weight}));
}

export function seededRandom(text) {
  let h = 2166136261;
  for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return function () {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Every factor is drawn in the same order whatever the time, so an hour that
// is finished keeps its number for the rest of the day.
export function dayActuals(normal, seed, now) {
  const random = seededRandom(seed);
  const level = -0.06 + random() * 0.16;
  const clock = now.getHours() + now.getMinutes() / 60;
  return normal.map(slot => {
    const revenueFactor = 1 + level + (random() - 0.5) * 0.24;
    const guestFactor = 1 + level * 0.7 + (random() - 0.5) * 0.16;
    const share = Math.max(0, Math.min(1, clock - slot.hour));
    return {hour: slot.hour, share, revenue: Math.round(slot.revenue * revenueFactor * share), guests: Math.round(slot.guests * guestFactor * share)};
  });
}

// What is sold so far, plus the rest of a normal day at a damped pace, so a
// strong lunch does not get extrapolated over the whole evening.
export function forecastDay(normal, actuals) {
  const normalSoFar = normal.reduce((sum, slot, index) => sum + slot.revenue * actuals[index].share, 0);
  const soFar = actuals.reduce((sum, slot) => sum + slot.revenue, 0);
  const pace = normalSoFar > 0 ? soFar / normalSoFar : 1;
  const damped = 1 + (pace - 1) * 0.6;
  const hours = normal.map((slot, index) => {
    const actual = actuals[index], rest = 1 - actual.share;
    return {hour: slot.hour, revenue: Math.round(actual.revenue + slot.revenue * rest * damped), guests: Math.round(actual.guests + slot.guests * rest * damped)};
  });
  return {pace, hours, revenue: hours.reduce((sum, h) => sum + h.revenue, 0), guests: hours.reduce((sum, h) => sum + h.guests, 0)};
}

// Same shape as the evening staffing model: thin at lunch, full for dinner.
export function staffAt(plannedStaff, hour) {
  if (hour < OPEN_HOUR || hour >= 24) return 0;
  return Math.max(1, Math.round(plannedStaff * (hour < 16 ? 0.55 : hour < 18 ? 0.75 : hour < 22 ? 1 : 0.7)));
}

export function buildToday({dayRevenue, dayGuests, hourWeights, seed, now, plannedStaff}) {
  const normal = normalDay(dayRevenue, dayGuests, hourWeights);
  const actuals = dayActuals(normal, seed, now);
  const forecast = forecastDay(normal, actuals);
  const clock = now.getHours() + now.getMinutes() / 60;
  const nowIndex = clock < OPEN_HOUR ? -1 : Math.min(normal.length - 1, Math.floor(clock) - OPEN_HOUR);
  const normalSoFar = key => normal.reduce((sum, slot, index) => sum + slot[key] * actuals[index].share, 0);
  return {
    phase: nowIndex < 0 ? 'before' : 'open',
    nowIndex,
    hours: normal.map((slot, index) => ({
      hour: slot.hour, share: actuals[index].share, actual: actuals[index].revenue, normal: Math.round(slot.revenue),
      forecast: forecast.hours[index].revenue, forecastGuests: forecast.hours[index].guests
    })),
    revenue: actuals.reduce((sum, slot) => sum + slot.revenue, 0),
    guests: actuals.reduce((sum, slot) => sum + slot.guests, 0),
    normalRevenue: normalSoFar('revenue'),
    normalGuests: normalSoFar('guests'),
    forecastRevenue: forecast.revenue,
    forecastGuests: forecast.guests,
    normalDayRevenue: dayRevenue,
    plannedStaff,
    staffNow: staffAt(plannedStaff, Math.floor(clock))
  };
}
