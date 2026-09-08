// Shared, dependency-free contract. Actions are data, never code or selectors.
export const VIEWS = ['oversikt', 'tiltak', 'effekt', 'rapporter', 'salg', 'varekost', 'bemanning', 'resultat', 'koblinger', 'innstillinger'];
export const PERIODS = ['igår', 'uke', 'siste30'];
const normalize = value => value.toLocaleLowerCase('nb-NO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ø/g, 'o');
const number = value => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(value);

export function validateActions(actions, context) {
  if (!Array.isArray(actions) || actions.length > 4) throw new Error('Ugyldig handlingsplan.');
  if (actions.some(action => action?.type === 'logout') && actions.length !== 1) throw new Error('Be om utlogging som en egen handling.');
  return actions.map(action => {
    if (!action || typeof action.type !== 'string' || typeof action.value !== 'string' || Object.keys(action).some(k => !['type', 'value'].includes(k))) throw new Error('Ugyldig handling.');
    const valid = action.type === 'navigate' ? VIEWS.includes(action.value)
      : action.type === 'place' ? context.places.includes(action.value) || action.value === 'all'
      : action.type === 'period' ? PERIODS.includes(action.value)
      : action.type === 'theme' ? ['light', 'dark'].includes(action.value)
      : action.type === 'logout' && action.value === '';
    if (!valid) throw new Error('Denne handlingen støttes ikke.');
    return { type: action.type, value: action.value };
  });
}

export function localAnswer(question, context, history = []) {
  const q = normalize(question.trim());
  const reply = text => ({ reply: text, actions: [], mode: 'local' });
  const action = (type, value) => ({ reply: '', actions: [{ type, value }], mode: 'local' });
  // Only complete, unambiguous commands auto-execute. Questions and negations don't.
  if (/^(?:kan du |jeg vil |vennligst )?(?:logg(?:e)? (?:meg )?ut|log out|sign out)[.!?]?$/.test(q)) return action('logout', '');
  if (/^(?:kan du |vennligst )?(?:sla pa |bytt til |aktiver )(mork|lys)(?: modus|t tema)?[.!?]?$/.test(q)) return action('theme', q.includes('mork') ? 'dark' : 'light');
  const nav = q.match(/^(?:kan du |vennligst )?(?:apne|vis|ga til) (tiltak|effekt|rapporter|oversikt(?:en)?|salg(?:et)?|varekost|bemanning|resultat(?:et)?|koblinger|innstillinger)[.!?]?$/);
  if (nav) return action('navigate', VIEWS.find(v => nav[1].startsWith(v)));
  const place = context.places.find(p => q === 'bytt til ' + normalize(p) || q === 'bytt til ' + normalize(p.replace('Heim ', '')));
  if (place) return action('place', place);
  if (/^(vis|velg|bytt til) alle (steder|restaurantene|restauranter)$/.test(q)) return action('place', 'all');
  const per = /i gar/.test(q) ? 'igår' : /(?:denne uke|denne uken|hittil i uken)/.test(q) ? 'uke' : /(?:siste (?:4|fire) uker)/.test(q) ? 'siste30' : context.period;
  if (/^(?:bytt til|velg|vis) (?:i gar|denne uken?|siste (?:4|fire) uker)$/.test(q)) return action('period', per);
  if (/(?:ikke|don't|hvordan|hvorfor)/.test(q) && /(?:logg|log out|sign out)/.test(q)) return reply('Skriv «logg meg ut» når du ønsker å avslutte økten. Jeg har ikke logget deg ut.');
  if (/(?:i dag|i morgen|neste uke|forrige maned|siste 30|202\d|\d{1,2}\.\d{1,2})/.test(q)) return reply('Jeg har bare demotall for i går, ukens viste periode og siste 4 uker. Jeg har ikke data for perioden du spør om.');
  if (/overskudd|nettoresultat|etter.*faste kost/.test(q)) return reply('Jeg har bidrag før faste kostnader, men mangler faste kostnader og kan derfor ikke beregne overskudd.');
  const mentioned = context.places.filter(p => q.includes(normalize(p.replace('Heim ', ''))));
  const names = /alle (?:steder|restaurant)/.test(q) ? context.places : mentioned.length ? mentioned : context.selected;
  let metricQuestion = q;
  if (/^(?:og |hva med )/.test(q) && !/omset|salg|gjest|varekost|lonn|bidrag|resultat|snitt/.test(q)) {
    metricQuestion += ' ' + normalize(history.filter(m => m.role === 'user').at(-1)?.text || '');
  }
  const metrics = [
    [/omset|salg|solgt/, 'oms', 'Omsetning', ' kr'],
    [/gjest/, 'gjester', 'Gjester', ''],
    [/varekost/, 'varekostKr', 'Varekost', ' kr'],
    [/lonn|bemanning/, 'lonnKr', 'Lønnskostnad', ' kr'],
    [/bidrag|resultat|igjen/, 'bidragKr', 'Bidrag før faste kostnader', ' kr'],
    [/snittbong/, 'snittbong', 'Snittbong', ' kr'],
  ].filter(([pattern]) => pattern.test(metricQuestion));
  if (/hvorfor|arsak/.test(q)) return reply('Tallene alene dokumenterer ikke årsaken. Jeg kan vise omsetning, varekost, lønnskostnad og bidrag, men ikke fastslå hvorfor de har endret seg.');
  if (metrics.length || /oppsummer|hvordan gar|nokkeltall/.test(q)) {
    const wanted = metrics.length ? metrics : [[null, 'oms', 'Omsetning', ' kr'], [null, 'bidragKr', 'Bidrag før faste kostnader', ' kr']];
    const lines = names.map(name => {
      const row = context.facts.find(f => f.place === name && f.period === per);
      return row ? name + ': ' + wanted.map(([, key, label, suffix]) => {
        if (/prosent|andel|%/.test(q) && ['varekostKr', 'lonnKr', 'bidragKr'].includes(key)) return label + ' ' + (row.oms ? new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 }).format(row[key] / row.oms * 100) + ' %' : 'ukjent (ingen omsetning)');
        return label + ' ' + number(row[key]) + suffix;
      }).join(' · ') : name + ': Ingen data.';
    });
    return reply('Demodata · ' + context.periodLabels[per] + '\n' + lines.join('\n') + '\nKilde: samme beregninger som Scope-arbeidsflaten.');
  }
  return reply('Jeg bruker en lokal motor med begrenset språkforståelse. Prøv «Hva var omsetningen i går?», «Hva er varekosten i Hamar?», «Åpne salg», «Bytt til Gjøvik», «Slå på mørk modus» eller «Logg meg ut». En språkmodell må kobles til for fri samtale.');
}
