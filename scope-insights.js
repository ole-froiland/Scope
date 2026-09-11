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
