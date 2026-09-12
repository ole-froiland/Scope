/* Testflate: venstremeny, stedsvelger, tidligere samtaler og spørreboks.
   Scriptet lastes øverst i <body> slik at lagret tilstand settes før tegning. */

(function () {
  const SIDEBAR_KEY = "scope-test-sidebar";
  const PLACE_KEY = "scope-test-sted";
  const CHATS_KEY = "scope-test-samtaler";
  const LINKS_KEY = "scope-test-koblinger";
  const PROFIL_KEY = "scope-test-profil";
  const VARSEL_KEY = "scope-test-varsler";
  const MODUS_KEY = "scope-test-visning";
  const app = document.body;

  function store(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      /* Ingen lagring tilgjengelig – tilstanden gjelder bare denne økten */
    }
  }

  function restore(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  // Kjøres før resten av siden er tegnet, så menyen ikke blinker åpen.
  if (restore(SIDEBAR_KEY) === "collapsed") {
    app.classList.add("is-collapsed");
  }

  app.dataset.theme = restore("scope-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  // Visningsnivået settes også før tegning, slik at siden ikke hopper.
  const lagretModus = restore(MODUS_KEY);
  app.dataset.modus = lagretModus === "rask" || lagretModus === "avansert" ? lagretModus : "vanlig";

  async function init() {
    const { buildReport, improvementEffect, buildDayTimeline } = await import("./scope-insights.js?v=day-overview-11");
    const sidebar = document.getElementById("sidebar");
    const toggleButton = document.getElementById("sidebar-toggle");
    const brandLink = document.querySelector(".brand");
    const menuButton = document.getElementById("menu-button");
    const scrim = document.getElementById("scrim");
    const small = window.matchMedia("(max-width: 860px)");

    /* ---- Åpne og lukke menyen ------------------------------------------ */

    function syncMenuLabels() {
      const collapsed = app.classList.contains("is-collapsed");
      const drawerOpen = app.classList.contains("is-open");
      const open = small.matches ? drawerOpen : !collapsed;

      const stablet = collapsed && !small.matches;
      const merkelapp = open ? "Lukk meny" : "Åpne meny";

      toggleButton.setAttribute("aria-expanded", String(open));
      toggleButton.setAttribute("aria-label", merkelapp);
      toggleButton.dataset.tooltip = merkelapp;
      // Smal meny har sin egen boble; da skal ikke nettleserens komme i tillegg.
      toggleButton.title = stablet ? "" : merkelapp;
      menuButton.setAttribute("aria-expanded", String(small.matches && drawerOpen));

      // I smal meny ligger logoen under menyknappen. Da skal den ikke
      // kunne fokuseres eller klikkes – knappen eier plassen.
      brandLink.inert = stablet;
    }

    const content = document.querySelector(".content");

    function openDrawer() {
      app.classList.add("is-open");
      if (small.matches) content.inert = true;
      syncMenuLabels();
      const first = sidebar.querySelector("a, button");
      if (first) first.focus();
    }

    function closeDrawer(returnFocus) {
      app.classList.remove("is-open");
      content.inert = false;
      syncMenuLabels();
      if (returnFocus) menuButton.focus();
    }

    toggleButton.addEventListener("click", function () {
      if (small.matches) {
        closeDrawer(true);
        return;
      }
      const collapsed = app.classList.toggle("is-collapsed");
      store(SIDEBAR_KEY, collapsed ? "collapsed" : "expanded");
      syncMenuLabels();
    });

    menuButton.addEventListener("click", openDrawer);

    scrim.addEventListener("click", function () {
      closeDrawer(false);
    });

    small.addEventListener("change", function () {
      app.classList.remove("is-open");
      content.inert = false;
      syncMenuLabels();
    });

    /* ---- Stedsvelger ---------------------------------------------------- */

    const placeButton = document.getElementById("place-button");
    const placeList = document.getElementById("place-list");
    const placeName = document.getElementById("place-name");
    const placeInitial = document.getElementById("place-initial");
    const placeAll = document.getElementById("place-all");
    const placeNote = document.getElementById("place-note");
    const contentTitle = document.getElementById("content-title");
    const askInput = document.getElementById("ask-input");
    const places = Array.from(placeList.querySelectorAll(".place-option"));
    // Rekkefølgen i menyen er fasit for visning og lagring. Navnene må være
    // de samme som nøklene i STED_PROFIL lenger nede.
    const STEDSNAVN = places.map(function (option) {
      return option.dataset.place;
    });

    // Deler som må tegnes på nytt når stedet byttes (oversikt, innstillinger).
    const stedsLyttere = [];
    let workspaceSync=()=>{};

    // Menyen er en avhukingsmeny: ett eller flere steder kan være på.
    // VALGT.navn er navnet resten av flaten regner på, VALGT.liste er
    // stedene navnet dekker.
    const VALGT = { navn: STEDSNAVN[0], liste: [STEDSNAVN[0]] };
    let sisteEnkeltvalg = STEDSNAVN[0];

    function kortNavn(navn) {
      return navn.replace("Heim ", "");
    }

    function valgtNavn(liste) {
      if (liste.length === 1) return liste[0];
      if (liste.length === STEDSNAVN.length) return "Alle restauranter";
      if (liste.length === 2) return kortNavn(liste[0]) + " og " + kortNavn(liste[1]);
      return kortNavn(liste[0]) + " og " + (liste.length - 1) + " andre";
    }

    function velgSteder(liste) {
      const valgt = STEDSNAVN.filter(function (navn) {
        return liste.includes(navn);
      });
      if (!valgt.length) return;

      const alle = valgt.length === STEDSNAVN.length;
      VALGT.liste = valgt;
      VALGT.navn = valgtNavn(valgt);
      if (valgt.length === 1) sisteEnkeltvalg = valgt[0];

      placeName.textContent = VALGT.navn;
      placeInitial.textContent = valgt.length === 1
        ? places[STEDSNAVN.indexOf(valgt[0])].dataset.initial
        : String(valgt.length);
      placeButton.dataset.tooltip = VALGT.navn;
      contentTitle.textContent = VALGT.navn;
      document.title = VALGT.navn + " | Scope";

      // Er bare ett sted igjen, kan det ikke hukes av. Det sies i klartekst
      // i stedet for at klikket bare blir stille borte.
      const eneste = valgt.length === 1;
      places.forEach(function (option) {
        const på = valgt.includes(option.dataset.place);
        option.setAttribute("aria-checked", String(på));
        if (på && eneste) option.setAttribute("aria-disabled", "true");
        else option.removeAttribute("aria-disabled");
      });
      placeNote.hidden = !eneste;
      placeAll.setAttribute("aria-pressed", String(alle));
      placeAll.title = alle ? "Tilbake til " + kortNavn(sisteEnkeltvalg) : "Velg alle";

      store(PLACE_KEY, JSON.stringify(valgt));
      workspaceSync();
      stedsLyttere.forEach(function (fn) {
        fn(VALGT.navn);
      });
    }

    // Huker av eller av-huker ett sted. Minst ett må alltid stå igjen.
    function vekslesSted(navn) {
      const på = VALGT.liste.includes(navn);
      if (på && VALGT.liste.length === 1) return;
      velgSteder(
        på
          ? VALGT.liste.filter(function (n) {
              return n !== navn;
            })
          : VALGT.liste.concat(navn)
      );
    }

    function openPlaceList() {
      placeList.hidden = false;
      placeButton.setAttribute("aria-expanded", "true");
      const checked = placeList.querySelector('[aria-checked="true"]') || places[0];
      if (checked) checked.focus();
    }

    function closePlaceList(returnFocus) {
      placeList.hidden = true;
      placeButton.setAttribute("aria-expanded", "false");
      if (returnFocus) placeButton.focus();
    }

    placeButton.addEventListener("click", function () {
      if (placeList.hidden) {
        openPlaceList();
      } else {
        closePlaceList(true);
      }
    });

    // Lista blir stående åpen: flere steder kan hukes av etter hverandre.
    places.forEach(function (option) {
      option.addEventListener("click", function () {
        vekslesSted(option.dataset.place);
      });
    });

    placeAll.addEventListener("click", function () {
      if (VALGT.liste.length === STEDSNAVN.length) {
        velgSteder([sisteEnkeltvalg]);
      } else {
        velgSteder(STEDSNAVN.slice());
      }
    });

    document.addEventListener("click", function (event) {
      if (placeList.hidden) return;
      if (!event.target.closest(".place")) closePlaceList(false);
    });

    document.addEventListener("focusin", function (event) {
      if (placeList.hidden) return;
      if (!event.target.closest(".place")) closePlaceList(false);
    });

    const savedPlace = restore(PLACE_KEY);
    let startSteder = [];
    if (savedPlace) {
      try {
        const lest = JSON.parse(savedPlace);
        startSteder = Array.isArray(lest) ? lest : [lest];
      } catch (error) {
        startSteder = [savedPlace]; // eldre format lagret bare ett navn
      }
    }
    const kjenteStart = STEDSNAVN.filter(function (navn) {
      return startSteder.includes(navn);
    });
    velgSteder(kjenteStart.length ? kjenteStart : [STEDSNAVN[0]]);

    /* ---- Bytte mellom menyvalg ------------------------------------------ */

    const views = Array.from(document.querySelectorAll(".view"));
    const viewLinks = Array.from(document.querySelectorAll(".rail-link[data-view], .overview-tab[data-view]"));
    const contentView = document.getElementById("content-view");
    const contentBody = document.getElementById("content-body");

    const overviewViews=["oversikt","tiltak","rapporter"];

    // Visningen bestemmer hvilke sider som står i menyen (data-visning), men
    // alle sider kan åpnes fra en lenke. En side utenfor menyen hører til en
    // side som står der: kostnadssidene til Kostnader, resten til Oversikt.
    const MENY_FORELDER={varekost:"kostnader",bemanning:"kostnader","andre-kostnader":"kostnader",tiltak:"oversikt",rapporter:"oversikt"};
    const visningTilbake=document.getElementById("view-back");
    const visningTilbakeKnapp=document.getElementById("view-back-button");

    function iMenyen(name) {
      const lenke = document.querySelector('.rail-link[data-view="' + name + '"]');
      if (!lenke) return false;
      return !lenke.dataset.visning || lenke.dataset.visning.split(" ").includes(app.dataset.modus);
    }

    function menyForelder(name) {
      if (iMenyen(name)) return name;
      const forelder = MENY_FORELDER[name];
      return forelder && iMenyen(forelder) ? forelder : "oversikt";
    }

    // Oversikt er delt i tre deler: Nå, Tiltak og Rapporter. Fanelinjen bytter
    // del, og Effekt ligger nederst på Tiltak.
    let currentView=null;

    function showView(name, scroll = true) {
      // Effekt ligger nå nederst på Tiltak. Gamle lenker og lagrede faner
      // skal fortsatt finne fram.
      if (name === "effekt") name = "tiltak";
      const known = views.some(function (view) {
        return view.dataset.view === name;
      });
      const active = known ? name : "oversikt";
      const forrige = currentView;
      const inOverview = overviewViews.includes(active);

      views.forEach(function (view) {
        view.hidden = view.dataset.view !== active;
      });

      viewLinks.forEach(function (link) {
        if (link.dataset.view === active) {
          link.setAttribute("aria-current", "page");
          contentView.textContent = link.querySelector(".rail-label").textContent;
        } else {
          link.removeAttribute("aria-current");
        }
      });

      const overviewLink=document.querySelector('.rail-link[data-view="oversikt"]');
      if(inOverview) {
        overviewLink.setAttribute("aria-current","page");
        contentView.textContent=overviewLink.querySelector(".rail-label").textContent;
      }

      // Står siden utenfor menyen, markeres siden den hører til, og en lenke
      // øverst fører tilbake dit.
      const forelder = menyForelder(active);
      if (forelder !== active) {
        document.querySelector('.rail-link[data-view="' + forelder + '"]').setAttribute("aria-current", "page");
        visningTilbakeKnapp.dataset.view = forelder;
        visningTilbakeKnapp.textContent = forelder === "kostnader" ? "← Til kostnader" : "← Til oversikt";
        views.find(function (view) { return view.dataset.view === active; }).prepend(visningTilbake);
      }
      visningTilbake.hidden = forelder === active;

      if (active === "oversikt" && forrige !== null) renderDash();
      currentView = active;

      // Bare et ekte bytte skal flytte rullingen. Kontomenyen setter hash rett
      // etter at den har hoppet til et kort, og hashchange kaller hit igjen
      // med samme visning.
      if (scroll && (inOverview || forrige !== active)) {
        contentBody.scrollTop = 0;
      }
      workspaceSync();
    }

    viewLinks.forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        showView(link.dataset.view);
        history.pushState(null, "", "#" + link.dataset.view);
        if (small.matches) closeDrawer(false);
      });
    });

    visningTilbakeKnapp.addEventListener("click", function () {
      const target = visningTilbakeKnapp.dataset.view;
      showView(target);
      history.pushState(null, "", "#" + target);
    });

    // Bytter man visning mens man står på en side som ikke er med i den nye
    // menyen, går man til siden den hører til der.
    function følgMenyen() {
      const aktiv = currentView || "oversikt";
      const mål = menyForelder(aktiv);
      if (mål !== aktiv) {
        showView(mål);
        history.replaceState(null, "", "#" + mål);
      } else if (aktiv !== "oversikt") {
        showView(aktiv, false);
      }
    }

    window.addEventListener("popstate", function () {
      showView(location.hash.replace("#", ""));
    });

    window.addEventListener("hashchange", function () {
      showView(location.hash.replace("#", ""));
    });

    showView(location.hash.replace("#", ""));

    // Felles toppmeny: innstillingene følger brukeren mellom visningene.
    const languageOptions=document.getElementById("language-options");
    const languageToggle=document.getElementById("language-toggle");
    const themeToggle=document.getElementById("theme-toggle");
    let navigationLanguage=restore("scope-menu-language")==="en"?"en":"nb";
    const menuNames={tiltak:["Tiltak","Actions"],effekt:["Effekt","Impact"],rapporter:["Rapporter","Reports"],oversikt:["Oversikt","Overview"],salg:["Salg","Sales"],kostnader:["Kostnader","Costs"],varekost:["Varekost","Food costs"],bemanning:["Bemanning","Staffing"],"andre-kostnader":["Andre kostnader","Other costs"],resultat:["Resultat","Results"],koblinger:["Koblinger","Connections"],innstillinger:["Innstillinger","Settings"]};
    const staticMenuLabels=[...document.querySelectorAll(".rail-heading,.rail-new .rail-label")].map(node=>({node,original:node.textContent}));
    const menuTranslations={Restauranter:"Restaurants","Økonomi":"Finances","Tidligere samtaler":"Recent conversations","Ny samtale":"New conversation"};
    function syncThemeButton() {
      const dark=app.dataset.theme==="dark";
      themeToggle.setAttribute("aria-pressed",String(dark));
      const label=navigationLanguage==="en"?(dark?"Switch to light mode":"Switch to dark mode"):(dark?"Slå på lys modus":"Slå på mørk modus");
      themeToggle.setAttribute("aria-label",label);themeToggle.title=label;
    }
    function applyMenuLanguage() {
      const english=navigationLanguage==="en";
      viewLinks.forEach(link=>{const label=link.classList.contains("overview-tab")&&link.dataset.view==="oversikt"?(english?"Now":"Nå"):menuNames[link.dataset.view][english?1:0];link.querySelector(".rail-label").textContent=label;link.dataset.tooltip=label;});
      const current=views.find(view=>!view.hidden)?.dataset.view||"oversikt";
      contentView.textContent=menuNames[overviewViews.includes(current)?"oversikt":current][english?1:0];
      staticMenuLabels.forEach(({node,original})=>node.textContent=english?(menuTranslations[original]||original):original);
      document.getElementById("language-label").textContent=english?"EN":"NO";
      document.getElementById("language-heading").textContent=english?"Navigation language":"Menyspråk";
      document.getElementById("language-note").textContent=english?"Switches the menu. Figures and reports stay in Norwegian.":"Bytter menyen. Tall og rapporter står på norsk.";
      languageToggle.setAttribute("aria-label",english?"Navigation language":"Menyspråk");languageToggle.title=languageToggle.getAttribute("aria-label");
      document.querySelectorAll("[data-language]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.language===navigationLanguage)));
      document.querySelector(".header-actions").lang=english?"en":"nb";
      document.querySelector(".rail-nav").lang=english?"en":"nb";
      contentView.lang=english?"en":"nb";
      syncThemeButton();
    }
    function closeLanguage(returnFocus=false){languageOptions.hidden=true;languageToggle.setAttribute("aria-expanded","false");if(returnFocus)languageToggle.focus();}
    themeToggle.addEventListener("click",()=>{app.dataset.theme=app.dataset.theme==="dark"?"light":"dark";store("scope-theme",app.dataset.theme);syncThemeButton();});
    languageToggle.addEventListener("click",()=>{const open=languageOptions.hidden;languageOptions.hidden=!open;languageToggle.setAttribute("aria-expanded",String(open));if(open)languageOptions.querySelector('[aria-pressed="true"]').focus();});
    document.querySelectorAll("[data-language]").forEach(button=>button.addEventListener("click",()=>{navigationLanguage=button.dataset.language;store("scope-menu-language",navigationLanguage);applyMenuLanguage();syncModus();closeLanguage(true);}));
    document.addEventListener("click",e=>{if(!e.target.closest(".header-language"))closeLanguage();});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!languageOptions.hidden){closeLanguage(true);}});
    document.addEventListener("focusin",e=>{if(!e.target.closest(".header-language"))closeLanguage();});
    applyMenuLanguage();

    /* ---- Samtaler ------------------------------------------------------- */

    const askForm = document.getElementById("ask-form");
    const askThread = document.getElementById("ask-thread");
    const askSend = askForm.querySelector(".ask-send");
    const askArea = document.querySelector(".ask");
    const askGripe = document.getElementById("ask-gripe");

    /* ---- Høyden på spørreruten ------------------------------------------ */

    // Kanten kan dras. Høyden gjelder samtalen; skrivefeltet står fast.
    const TRÅD_KEY = "scope-test-sporhoyde";
    const TRÅD_MIN = 96;
    let trådHøyde = 260;

    // Samtalen kan ta alt innholdet har: helt opp til fanelinja. Plassen er
    // hele kolonnen minus toppfeltet og spørreboksens egen ramme.
    function trådMaks() {
      const ramme = askArea.parentElement;
      const topp = ramme.querySelector(".content-header");
      // Alt kolonnen har, minus fanelinja og spørreboksens egen ramme.
      const krom = askArea.offsetHeight - askThread.offsetHeight;
      return Math.max(TRÅD_MIN, Math.round(ramme.clientHeight - (topp ? topp.offsetHeight : 0) - krom - 4));
    }

    function settTrådhøyde(piksler) {
      trådHøyde = Math.max(TRÅD_MIN, Math.min(trådMaks(), Math.round(piksler)));
      askArea.style.setProperty("--ask-traad", trådHøyde + "px");
      askGripe.setAttribute("aria-valuenow", String(trådHøyde));
      return trådHøyde;
    }

    const lagretTrådhøyde = Number(restore(TRÅD_KEY));
    if (lagretTrådhøyde > 0) settTrådhøyde(lagretTrådhøyde);

    let gripeStart = null;

    askGripe.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) return;
      event.preventDefault();
      try {
        askGripe.setPointerCapture(event.pointerId);
      } catch (feil) {
        /* Uten peker-fangst virker draging fortsatt innenfor grepet */
      }
      askArea.classList.add("er-dratt");
      // Utgangspunktet er høyden som er satt, ikke hvor høy teksten
      // tilfeldigvis er akkurat nå.
      gripeStart = { y: event.clientY, høyde: trådHøyde };
      // Drar man selv, er man ute av den store visningen, men beholder høyden.
      if (storVisning) merkStor(false);
    });

    askGripe.addEventListener("pointermove", function (event) {
      if (!gripeStart) return;
      // Opp er større: derfor start minus nå.
      settTrådhøyde(gripeStart.høyde + (gripeStart.y - event.clientY));
    });

    function slippGrepet() {
      if (!gripeStart) return;
      gripeStart = null;
      askArea.classList.remove("er-dratt");
      store(TRÅD_KEY, String(trådHøyde));
    }

    askGripe.addEventListener("pointerup", slippGrepet);
    askGripe.addEventListener("pointercancel", slippGrepet);

    // Piltaster gjør det samme for dem som ikke bruker mus.
    askGripe.addEventListener("keydown", function (event) {
      const steg = event.key === "ArrowUp" ? 40 : event.key === "ArrowDown" ? -40 : 0;
      if (!steg) return;
      event.preventDefault();
      settTrådhøyde(trådHøyde + steg);
      store(TRÅD_KEY, String(trådHøyde));
    });
    // Stor visning: samtalen fyller skjermen, og samme knapp tar den ned igjen.
    const askExpand = document.getElementById("ask-expand");
    let storVisning = false;
    let høydeFørStor = trådHøyde;

    function merkStor(på) {
      storVisning = på;
      askExpand.setAttribute("aria-pressed", String(på));
      const tekst = på ? "Gjør samtalen liten" : "Gjør samtalen stor";
      askExpand.setAttribute("aria-label", tekst);
      askExpand.title = tekst;
      askArea.classList.toggle("er-stor", på);
    }

    function settStor(på) {
      if (på) høydeFørStor = trådHøyde;
      // Uten meldinger er samtalen skjult. Den må likevel være framme på vei
      // opp, ellers er det ingenting som glir.
      const tom = askThread.childElementCount === 0;
      // Høyden måles før og etter, så bevegelsen blir den samme enten den
      // gamle høyden var satt eller fulgte innholdet.
      const fra = askThread.hidden ? 0 : askThread.getBoundingClientRect().height;
      // Dashbordet går ut av flyten og må få beholde nøyaktig den boksen det
      // hadde, ellers rykker innholdet idet panelet slippes løs. Boksen er
      // gitt av panelet slik det står nede: målt før på vei opp, etter på
      // vei ned.
      function settLukketHøyde() {
        askArea.parentElement.style.setProperty("--ask-lukket", askArea.offsetHeight + "px");
      }
      if (på) settLukketHøyde();
      if (på) askThread.hidden = false;
      // Ruta har sin egen overgang på max-height. Den ville både dratt i
      // samme høyde som animasjonen under, og gitt feil mål når vi måler
      // rett etterpå, så den står over mens vi stiller høyden.
      askThread.style.transition = "none";
      merkStor(på);
      settTrådhøyde(på ? trådMaks() : høydeFørStor);
      store(TRÅD_KEY, String(trådHøyde));
      const til = !på && tom ? 0 : askThread.getBoundingClientRect().height;
      askThread.style.transition = "";
      // Panelet går ned, men dashbordet skal ikke røre seg før det er nede.
      // Plassen måles med panelet slik det blir stående, altså før merkelappen
      // settes på.
      if (!på) settLukketHøyde();
      askArea.classList.toggle("er-lukker", !på);

      function rydd() {
        // Tom samtale hører ikke hjemme i den lille visningen.
        if (!storVisning && askThread.childElementCount === 0) askThread.hidden = true;
        // Nede igjen: dashbordet kan ta plassen sin tilbake.
        if (!storVisning) askArea.classList.remove("er-lukker");
      }

      if (Math.abs(til - fra) < 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        rydd();
        return;
      }

      // Panelet dekker nesten hele skjermen, så det trenger tid nok til at
      // man ser det gli over dashbordet. Kurven setter i gang rolig og lander
      // mykt.
      // Taket må følge med i bevegelsen. Ellers klipper det lille taket
      // panelet ned med én gang på vei ned, og bare resten glir.
      const bevegelse = askThread.animate([
        { height: fra + "px", maxHeight: fra + "px" },
        { height: til + "px", maxHeight: til + "px" }
      ], {
        duration: 360,
        easing: "cubic-bezier(0.32, 0.72, 0, 1)"
      });
      bevegelse.finished.then(rydd, rydd);
    }

    askExpand.addEventListener("click", function () {
      settStor(!storVisning);
      document.getElementById("ask-input").focus({ preventScroll: true });
    });

    const convList = document.getElementById("conv-list");
    const newChatButton = document.getElementById("new-chat");

    let assistantBusy = false;
    let assistantMode = 'local';
    let actionProposal = null;
    const assistantModule = import('./scope-assistant.js?v=assistant-3');
    const assistantHint = askForm.querySelector('.ask-hint');
    assistantHint.textContent = 'Lokal motor · demodata';
    fetch('/api/assistant/status').then(r => r.ok ? r.json() : null).then(status => {
      assistantMode = status?.mode === 'model' ? 'model' : 'local';
      assistantHint.textContent = assistantMode === 'model' ? 'Lokal AI · ingen API-kostnader · demodata' : 'Lokal motor · begrenset språkforståelse · demodata';
    }).catch(() => { assistantHint.textContent = 'Lokal motor · begrenset språkforståelse · demodata'; });
    let chats = [];
    let activeId = null;

    try {
      chats = JSON.parse(restore(CHATS_KEY) || "[]");
      if (!Array.isArray(chats)) chats = [];
      chats = chats.filter(c => c && typeof c.id === 'string' && typeof c.title === 'string' && Array.isArray(c.messages)).slice(0, 30);
      chats.forEach(c => { c.messages = c.messages.filter(m => m && ['user', 'scope'].includes(m.role) && typeof m.text === 'string').slice(-100); });
    } catch (error) {
      chats = [];
    }

    function saveChats() {
      store(CHATS_KEY, JSON.stringify(chats.slice(0, 30)));
    }

    function activeChat() {
      return chats.find(function (chat) {
        return chat.id === activeId;
      });
    }

    function assistantText(text) {
      return text.replace(/\s*\(demodata\)/gi, '')
        .replace(/(?:\r?\n)?Kilde: Scope-arbeidsflaten · demodata · lokal AI\.?/gi, '')
        .replace(/^Demodata · /gm, '')
        .replace(/\nKilde: samme beregninger som Scope-arbeidsflaten\./g, '').trim();
    }

    function renderThread() {
      const chat = activeChat();
      askThread.textContent = "";

      if (!chat || chat.messages.length === 0) {
        // I stor visning blir den tomme ruten stående, så panelet ikke
        // detter ned når man starter en ny samtale.
        askThread.hidden = !storVisning;
        askGripe.hidden = true;
        return;
      }

      askGripe.hidden = false;

      chat.messages.forEach(function (message) {
        const element = document.createElement("p");
        element.className = "ask-message " + (message.role === "user" ? "is-user" : "is-scope");
        element.textContent = message.role === 'user' ? message.text : assistantText(message.text);
        askThread.append(element);
      });

      if (actionProposal?.chatId === activeId) {
        const proposal = actionProposal;
        const box = document.createElement('div');
        box.className = 'ask-message is-scope';
        const description = document.createElement('p');
        description.textContent = 'Foreslåtte handlinger: ' + proposal.actions.map(actionLabel).join(' → ');
        const run = document.createElement('button');
        run.type = 'button'; run.textContent = 'Utfør'; run.className = 'ops-button';
        const cancel = document.createElement('button');
        cancel.type = 'button'; cancel.textContent = 'Avbryt'; cancel.className = 'ops-button';
        run.addEventListener('click', async () => {
          if (assistantBusy || actionProposal !== proposal) return;
          run.disabled = cancel.disabled = true;
          actionProposal = null;
          try {
            if (proposal.context !== assistantContextKey()) throw new Error('Arbeidsflaten er endret. Be om handlingen på nytt.');
            assistantBusy = true;
            chat.messages.push({ role: 'scope', text: await executeAssistantActions(proposal.actions) });
          } catch (error) { chat.messages.push({ role: 'scope', text: error.message }); }
          finally { assistantBusy = false; saveChats(); renderThread(); askSend.disabled = !askInput.value.trim(); }
        });
        cancel.addEventListener('click', () => { actionProposal = null; chat.messages.push({ role: 'scope', text: 'Avbrutt. Ingen handling er utført.' }); saveChats(); renderThread(); });
        box.append(description, run, cancel); askThread.append(box);
      }
      askThread.hidden = false;
      askThread.scrollTop = askThread.scrollHeight;
    }

    function renderChatList() {
      convList.textContent = "";

      if (chats.length === 0) {
        const empty = document.createElement("p");
        empty.className = "conv-empty";
        empty.textContent = "Ingen samtaler ennå.";
        convList.append(empty);
        return;
      }

      chats.forEach(function (chat) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "conv-item";
        item.textContent = chat.title;
        item.title = chat.title;
        if (chat.id === activeId) item.setAttribute("aria-current", "true");
        item.addEventListener("click", function () {
          activeId = chat.id;
          renderChatList();
          renderThread();
          if (small.matches) closeDrawer(false);
        });
        convList.append(item);
      });
    }

    function startNewChat() {
      activeId = null;
      renderChatList();
      renderThread();
      askInput.focus();
      if (small.matches) closeDrawer(false);
    }

    newChatButton.addEventListener("click", startNewChat);

    /* ---- Spørreboksen --------------------------------------------------- */

    // Feltet vokser med teksten.
    function grow() {
      askInput.style.height = "auto";
      askInput.style.height = askInput.scrollHeight + "px";
    }

    askInput.addEventListener("input", function () {
      askInput.setCustomValidity('');
      grow();
      askSend.disabled = assistantBusy || askInput.value.trim() === "";
    });

    askInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        askForm.requestSubmit();
      }
    });

    askForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const question = askInput.value.trim();
      if (!question || assistantBusy) return;
      if (question.length > 4000) { askInput.setCustomValidity('Bruk maksimalt 4000 tegn.'); askInput.reportValidity(); return; }
      askInput.setCustomValidity('');
      actionProposal = null;
      assistantBusy = true;
      // Første spørsmål åpner ruten. Har du dratt kanten selv, står den.
      if (askThread.hidden && !(Number(restore(TRÅD_KEY)) > 0)) settTrådhøyde(340);

      let chat = activeChat();
      if (!chat) {
        chat = {
          id: "s" + Date.now(),
          title: question.length > 42 ? question.slice(0, 42).trim() + "…" : question,
          messages: [],
        };
        chats.unshift(chat);
        activeId = chat.id;
      }

      chat.messages.push({ role: "user", text: question });
      askInput.value = "";
      askSend.disabled = true;
      grow();
      renderChatList();
      renderThread();

      const pending = document.createElement("p");
      pending.className = "ask-message is-scope is-pending";
      pending.textContent = "Skriver …";
      askThread.hidden = false;
      askThread.append(pending);
      askThread.scrollTop = askThread.scrollHeight;

      const requestContext = assistantContext();
      const requestKey = assistantContextKey();
      try {
        const engine = await assistantModule;
        let answer;
        const direct = engine.localAnswer(question, requestContext, chat.messages.slice(0, -1));
        if (direct.actions.length) {
          answer = direct;
        } else if (assistantMode === 'model') {
          const response = await fetch('/api/assistant/chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(60000),
            body: JSON.stringify({ question, context: requestContext, history: chat.messages.slice(0, -1).slice(-10) }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'AI-en kunne ikke svare. Prøv igjen.');
          answer = result;
        } else {
          answer = direct;
        }
        const actions = engine.validateActions(answer.actions, requestContext);
        if (answer.reply) chat.messages.push({ role: 'scope', text: assistantText(answer.reply) });
        if (actions.length) {
          if (requestKey !== assistantContextKey() || activeId !== chat.id) {
            chat.messages.push({ role: 'scope', text: 'Arbeidsflaten eller samtalen ble endret mens jeg svarte. Ingen handling er utført. Be om handlingen på nytt.' });
          } else if (answer.mode === 'local') {
            chat.messages.push({ role: 'scope', text: await executeAssistantActions(actions) });
          } else {
            actionProposal = { chatId: chat.id, actions, context: requestKey };
          }
        }
      } catch (error) {
        chat.messages.push({ role: 'scope', text: error.name === 'TimeoutError' ? 'AI-en brukte for lang tid. Ingen handling er utført. Prøv igjen.' : error.message });
      } finally {
        assistantBusy = false;
        pending.remove();
        saveChats(); renderThread();
        askSend.disabled = !askInput.value.trim();
      }

      saveChats();
    });

    renderChatList();
    renderThread();

    /* ---- Koblinger ------------------------------------------------------ */

    const SYSTEMER = [
      { id: "munu", navn: "Munu", type: "Kassesystem", logo: "munu.svg", henter: "Omsetning, ordrelinjer, betalingsmåte" },
      { id: "pckasse", navn: "PCKasse", type: "Kassesystem", logo: "pckasse.svg", henter: "Omsetning, varegrupper, betalingsmåte" },
      { id: "lightspeed", navn: "Lightspeed", type: "Kassesystem", logo: "lightspeed.svg", henter: "Omsetning, ordrelinjer, gjester" },
      { id: "restolution", navn: "Restolution", type: "Kassesystem", logo: "trim/restolution-new.png", henter: "Omsetning, bord og gjester" },
      { id: "orderx", navn: "OrderX", type: "Kassesystem", logo: "trim/orderx.png", flis: true, henter: "Bestillinger fra bord og app" },
      { id: "favrit", navn: "Favrit", type: "Kassesystem", logo: "trim/favrit.svg", henter: "Bestillinger og betalinger i app" },

      { id: "tripletex", navn: "Tripletex", type: "Regnskap", logo: "tripletex.svg", henter: "Leverandørfakturaer, resultat og balanse" },
      { id: "poweroffice", navn: "PowerOffice", type: "Regnskap", logo: "trim/poweroffice-farge01.png", henter: "Bilag, kontoplan, resultat" },
      { id: "fiken", navn: "Fiken", type: "Regnskap", logo: "fiken-icon.svg", henter: "Bilag, fakturaer, mva" },
      { id: "conta", navn: "Conta", type: "Regnskap", logo: "conta.svg", henter: "Bilag og fakturaer" },
      { id: "xledger", navn: "Xledger", type: "Regnskap", logo: "xledger.svg", henter: "Hovedbok, budsjett, resultat" },
      { id: "businessnxt", navn: "Visma Business NXT", type: "Regnskap", logo: "trim/business-nxt.png", henter: "Hovedbok, leverandører, resultat" },
      { id: "dynamics", navn: "Dynamics 365", type: "Regnskap", logo: "dynamics365.svg", henter: "Hovedbok, prosjekt, resultat" },

      { id: "planday", navn: "Planday", type: "Vaktplan", logo: "trim/planday.png", henter: "Planlagte vakter, stemplede timer, lønnskost" },
      { id: "quinyx", navn: "Quinyx", type: "Vaktplan", logo: "trim/quinyx.svg", henter: "Vaktplan, timer, fravær" },
      { id: "tamigo", navn: "Tamigo", type: "Vaktplan", logo: "tamigo.svg", henter: "Vaktplan, timer, lønnskost" },
      { id: "tidsbanken", navn: "Tidsbanken", type: "Vaktplan", logo: "trim/tidsbanken.png", henter: "Stemplinger, timer, fravær" },
      { id: "timegrip", navn: "Timegrip", type: "Vaktplan", logo: "trim/timegrip.png", henter: "Timer, bemanningsbehov, lønnskost" },
      { id: "easyatwork", navn: "EasyAtWork", type: "Vaktplan", logo: "trim/easyatwork.png", henter: "Vaktplan og timer" },
      { id: "connecteam", navn: "Connecteam", type: "Vaktplan", logo: "trim/connecteam.png", henter: "Vakter, sjekklister, timer" },
      { id: "samesystem", navn: "SameSystem", type: "Vaktplan", logo: "trim/samesystem.png", henter: "Bemanningsplan mot omsetning" },
      { id: "gastroplanner", navn: "GastroPlanner", type: "Vaktplan", logo: "trim/gastroplanner.png", flis: true, henter: "Vaktplan, timer, budsjett" },
      { id: "baemingo", navn: "Baemingo", type: "Vaktplan", logo: "baemingo.svg", henter: "Vaktbytter og timer" },
      { id: "amendo", navn: "Amendo", type: "Vaktplan", logo: "trim/amendo.png", henter: "Innleide vakter og timer" },

      { id: "wolt", navn: "Wolt", type: "Levering", logo: "trim/wolt.png", flis: true, henter: "Ordrer, provisjon, leveringstid" },
      { id: "foodora", navn: "Foodora", type: "Levering", logo: "trim/foodora.png", henter: "Ordrer, provisjon, kanselleringer" },

      { id: "google", navn: "Google", type: "Anmeldelser", logo: "trim/google-reviews.png", henter: "Nye anmeldelser, snittscore, svarprosent" },
      { id: "tripadvisor", navn: "Tripadvisor", type: "Anmeldelser", logo: "trim/tripadvisor.png", henter: "Anmeldelser og snittscore" },

      { id: "vipps", navn: "Vipps", type: "Betaling", logo: "trim/vipps.png", henter: "Betalinger og oppgjør" },
      { id: "stockifi", navn: "Stockifi", type: "Varelager", logo: "trim/stockifi.png", henter: "Varetelling, svinn, lagerverdi" },
    ];

    const STANDARD_KOBLET = {
      munu: "i dag 06:00",
      tripletex: "i dag 06:10",
      planday: "i dag 06:05",
      wolt: "i dag 06:20",
      google: "i går 22:40",
    };

    const integrationsGrid = document.getElementById("integrations");
    const addDialog = document.getElementById("add-dialog");
    const addClose = document.getElementById("add-close");
    const addSearch = document.getElementById("add-search");
    const addFilters = document.getElementById("add-filters");
    const addCount = document.getElementById("add-count");
    const addList = document.getElementById("add-list");

    let koblet = {};
    try {
      koblet = JSON.parse(restore(LINKS_KEY) || "null") || Object.assign({}, STANDARD_KOBLET);
    } catch (error) {
      koblet = Object.assign({}, STANDARD_KOBLET);
    }

    let filter = "Alle";

    function saveLinks() {
      store(LINKS_KEY, JSON.stringify(koblet));
    }

    function system(id) {
      return SYSTEMER.find(function (s) {
        return s.id === id;
      });
    }

    function logoElement(s, klasse) {
      const img = document.createElement("img");
      img.className = klasse + (s.flis ? " is-tile" : "");
      img.src = "assets/logos/" + s.logo;
      img.alt = "";
      img.loading = "lazy";
      return img;
    }

    function renderCards() {
      integrationsGrid.textContent = "";

      SYSTEMER.filter(function (s) {
        return koblet[s.id];
      }).forEach(function (s) {
        const kort = document.createElement("article");
        kort.className = "integration";

        const head = document.createElement("div");
        head.className = "integration-head";
        head.append(logoElement(s, "integration-logo"));

        const navn = document.createElement("h3");
        navn.className = "integration-name";
        navn.textContent = s.navn;

        const type = document.createElement("span");
        type.className = "integration-type";
        type.textContent = s.type;

        const data = document.createElement("p");
        data.className = "integration-data";
        data.textContent = s.henter;

        const sync = document.createElement("p");
        sync.className = "integration-sync";
        const prikk = document.createElement("span");
        prikk.className = "dot";
        prikk.setAttribute("aria-hidden", "true");
        sync.append(prikk, "Koblet på · oppdatert " + koblet[s.id]);

        kort.append(head, navn, type, data, sync);
        integrationsGrid.append(kort);
      });

      const leggTil = document.createElement("button");
      leggTil.type = "button";
      leggTil.className = "integration integration-add";
      leggTil.id = "add-integration";
      leggTil.innerHTML =
        '<span class="integration-plus" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 5.5v13M5.5 12h13"></path></svg></span>' +
        '<span>Legg til kobling</span>';
      leggTil.addEventListener("click", openDialog);
      integrationsGrid.append(leggTil);
    }

    function renderFilters() {
      const typer = ["Alle"].concat(
        SYSTEMER.map(function (s) {
          return s.type;
        }).filter(function (type, i, alle) {
          return alle.indexOf(type) === i;
        })
      );

      addFilters.textContent = "";
      typer.forEach(function (type) {
        const knapp = document.createElement("button");
        knapp.type = "button";
        knapp.className = "filter-chip";
        knapp.textContent = type;
        knapp.setAttribute("aria-pressed", String(type === filter));
        knapp.addEventListener("click", function () {
          filter = type;
          renderFilters();
          renderList();
        });
        addFilters.append(knapp);
      });
    }

    function renderList() {
      const søk = addSearch.value.trim().toLowerCase();
      const treff = SYSTEMER.filter(function (s) {
        const passerFilter = filter === "Alle" || s.type === filter;
        const passerSøk =
          søk === "" ||
          s.navn.toLowerCase().includes(søk) ||
          s.type.toLowerCase().includes(søk) ||
          s.henter.toLowerCase().includes(søk);
        return passerFilter && passerSøk;
      });

      addCount.textContent =
        treff.length === 0
          ? "Ingen treff"
          : treff.length + (treff.length === 1 ? " system" : " systemer");

      addList.textContent = "";
      treff.forEach(function (s) {
        const rad = document.createElement("li");
        rad.className = "dialog-row";

        const logo = document.createElement("span");
        logo.className = "row-logo";
        logo.append(logoElement(s, "row-logo-img"));

        const tekst = document.createElement("span");
        tekst.className = "row-text";
        const navn = document.createElement("span");
        navn.className = "row-name";
        navn.textContent = s.navn;
        const type = document.createElement("span");
        type.className = "row-type";
        type.textContent = s.type;
        tekst.append(navn, type);

        const knapp = document.createElement("button");
        knapp.type = "button";

        if (koblet[s.id]) {
          knapp.className = "row-remove";
          knapp.textContent = "Koble fra";
          knapp.addEventListener("click", function () {
            delete koblet[s.id];
            saveLinks();
            renderCards();
            renderList();
          });
          rad.classList.add("is-linked");
        } else {
          knapp.className = "integration-connect";
          knapp.textContent = "Koble til";
          knapp.addEventListener("click", function () {
            koblet[s.id] = "nå";
            saveLinks();
            renderCards();
            renderList();
          });
        }

        rad.append(logo, tekst, knapp);
        addList.append(rad);
      });
    }

    function openDialog() {
      addSearch.value = "";
      filter = "Alle";
      renderFilters();
      renderList();
      addDialog.showModal();
      addSearch.focus();
    }

    addSearch.addEventListener("input", renderList);
    addClose.addEventListener("click", function () {
      addDialog.close();
    });

    // renderCards() bygger knappen på nytt, så nettleserens egen fokusretur
    // peker på et element som er fjernet. Vi setter fokus selv.
    addDialog.addEventListener("close", function () {
      const knapp = document.getElementById("add-integration");
      if (knapp) knapp.focus();
    });

    // Klikk utenfor dialogruten lukker den.
    addDialog.addEventListener("click", function (event) {
      if (event.target === addDialog) addDialog.close();
    });

    renderCards();

    /* ---- Kontomeny ------------------------------------------------------ */

    const userButton = document.getElementById("user-button");
    const userMenu = document.getElementById("user-menu");
    const menuNote = document.getElementById("menu-note");

    function openUserMenu() {
      menuNote.hidden = true;
      userMenu.hidden = false;
      userButton.setAttribute("aria-expanded", "true");
      const første = userMenu.querySelector(".menu-item");
      if (første) første.focus();
    }

    function closeUserMenu(returnFocus) {
      userMenu.hidden = true;
      userButton.setAttribute("aria-expanded", "false");
      if (returnFocus) userButton.focus();
    }

    userButton.addEventListener("click", function () {
      if (userMenu.hidden) {
        openUserMenu();
      } else {
        closeUserMenu(true);
      }
    });

    let logoutPromise;
    async function logoutScope() {
      const response = await fetch('/api/assistant/logout', { method: 'POST', headers: { 'X-Scope-Action': 'logout' } });
      if (!response.ok) throw new Error('Kunne ikke avslutte økten. Ingen utlogging er bekreftet.');
      const result = await response.json();
      if (!result.ok) throw new Error('Kunne ikke bekrefte utlogging.');
      window.location.assign('/');
      return 'Økten er avsluttet.';
    }
    const logoutButton = document.getElementById('scope-logout');
    logoutButton.addEventListener('click', () => {
      logoutPromise = logoutScope();
      logoutPromise.catch(error => { menuNote.textContent = error.message; menuNote.hidden = false; });
    });
    userMenu.querySelectorAll('.menu-item:not(#scope-logout)').forEach(function (item) {
      item.addEventListener("click", function () {
        if (item.dataset.demo) {
          menuNote.textContent = item.dataset.demo;
          menuNote.hidden = false;
          return;
        }

        closeUserMenu(false);
        if (small.matches) closeDrawer(false);
        showView(item.dataset.goto);
        location.hash = "#" + item.dataset.goto;

        if (item.dataset.anker) {
          const mål = document.getElementById("set-" + item.dataset.anker);
          if (mål) mål.scrollIntoView({ block: "start" });
        }
      });
    });

    document.addEventListener("click", function (event) {
      if (userMenu.hidden) return;
      if (!event.target.closest(".rail-bottom")) closeUserMenu(false);
    });

    document.addEventListener("focusin", function (event) {
      if (userMenu.hidden) return;
      if (!event.target.closest(".rail-bottom")) closeUserMenu(false);
    });

    /* ---- Visning: rask, vanlig eller avansert --------------------------- */

    // Ett valg for hele arbeidsflaten: hvor mye som vises på en gang.
    // Rask viser bare det som haster, avansert legger til flere tall.
    const modusSlider = document.getElementById("modus-slider");
    const modusTittel = document.getElementById("modus-tittel");
    const modusVerdi = document.getElementById("modus-verdi");
    const modusValg = Array.from(modusSlider.querySelectorAll(".modus-valg"));
    const modusRekke = modusValg.map(function (knapp) {
      return knapp.dataset.modus;
    });
    const modusLag = modusSlider.querySelector(".modus-thumb-lag");
    const modusFyll = modusSlider.querySelector(".modus-fyll");
    const MODUS_TEKST = {
      rask: {
        nb: ["Rask"],
        en: ["Quick"],
      },
      vanlig: {
        nb: ["Vanlig"],
        en: ["Standard"],
      },
      avansert: {
        nb: ["Avansert"],
        en: ["Advanced"],
      },
    };

    function gjeldendeModus() {
      return MODUS_TEKST[app.dataset.modus] ? app.dataset.modus : "vanlig";
    }

    function syncModus() {
      const valgt = gjeldendeModus();
      const engelsk = navigationLanguage === "en";
      modusValg.forEach(function (knapp) {
        const aktiv = knapp.dataset.modus === valgt;
        knapp.setAttribute("aria-checked", String(aktiv));
        knapp.tabIndex = aktiv ? 0 : -1;
        knapp.dataset.fylt = String(modusRekke.indexOf(knapp.dataset.modus) < modusRekke.indexOf(valgt));
        knapp.querySelector(".modus-tekst").textContent = MODUS_TEKST[knapp.dataset.modus][engelsk ? "en" : "nb"][0];
      });
      modusTittel.textContent = engelsk ? "View" : "Visning";
      modusVerdi.textContent = MODUS_TEKST[valgt][engelsk ? "en" : "nb"][0];
      modusSlider.lang = engelsk ? "en" : "nb";
      document.querySelector(".menu-modus").lang = engelsk ? "en" : "nb";
    }

    function velgModus(nytt, flyttFokus) {
      const gyldig = MODUS_TEKST[nytt] ? nytt : "vanlig";
      app.dataset.modus = gyldig;
      store(MODUS_KEY, gyldig);
      syncModus();
      følgMenyen();
      if (flyttFokus) {
        const knapp = modusSlider.querySelector('.modus-valg[data-modus="' + gyldig + '"]');
        if (knapp) knapp.focus();
      }
    }

    modusValg.forEach(function (knapp) {
      knapp.addEventListener("click", function () {
        velgModus(knapp.dataset.modus, false);
      });
    });

    // Sporet kan dras. Knappen følger fingeren uten overgang, og slipper
    // man, låser den seg til nærmeste trinn.
    function trinnVed(x) {
      const spor = modusSlider.getBoundingClientRect();
      const start = 14;
      const bredde = Math.max(1, spor.width - start * 2);
      const andel = Math.max(0, Math.min(1, (x - spor.left - start) / bredde));
      return modusRekke[Math.round(andel * (modusRekke.length - 1))];
    }

    function følgFinger(x) {
      const spor = modusSlider.getBoundingClientRect();
      const start = 14;
      const senter = Math.max(start, Math.min(spor.width - start, x - spor.left));
      modusLag.style.left = senter - start + "px";
      modusFyll.style.width = senter - start + "px";
    }

    function slippSporet() {
      if (!modusSlider.classList.contains("er-dratt")) return;
      modusSlider.classList.remove("er-dratt");
      modusLag.style.left = "";
      modusFyll.style.width = "";
      // Etter en dragning skal fokus ligge på trinnet man endte på.
      const valgt = modusSlider.querySelector('.modus-valg[aria-checked="true"]');
      if (valgt && modusSlider.contains(document.activeElement)) valgt.focus();
    }

    modusSlider.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) return;
      // Hindrer at teksten rundt markeres mens man drar.
      event.preventDefault();
      try {
        modusSlider.setPointerCapture(event.pointerId);
      } catch (feil) {
        /* Uten peker-fangst virker klikk fortsatt; bare draging utenfor ikke */
      }
      modusSlider.classList.add("er-dratt");
      const trinn = trinnVed(event.clientX);
      følgFinger(event.clientX);
      // Fokus flyttes bare hvis det alt lå i sporet, ellers ville et
      // museklikk tegnet fokusringen.
      velgModus(trinn, modusSlider.contains(document.activeElement));
    });

    modusSlider.addEventListener("pointermove", function (event) {
      if (!modusSlider.classList.contains("er-dratt")) return;
      følgFinger(event.clientX);
      const trinn = trinnVed(event.clientX);
      if (trinn !== gjeldendeModus()) velgModus(trinn, false);
    });

    modusSlider.addEventListener("pointerup", slippSporet);
    modusSlider.addEventListener("pointercancel", slippSporet);

    // Piltaster flytter mellom de tre trinnene, slik radiogrupper skal.
    modusSlider.addEventListener("keydown", function (event) {
      const steg =
        event.key === "ArrowRight" || event.key === "ArrowDown"
          ? 1
          : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
      if (!steg) return;
      event.preventDefault();
      const neste =
        modusRekke[(modusRekke.indexOf(gjeldendeModus()) + steg + modusRekke.length) % modusRekke.length];
      velgModus(neste, true);
    });

    syncModus();

    /* ---- Innstillinger --------------------------------------------------- */

    const profilFelt = {
      navn: document.getElementById("set-navn"),
      epost: document.getElementById("set-epost"),
      telefon: document.getElementById("set-telefon"),
    };
    const profileAvatar = document.getElementById("profile-avatar");
    const userInitial = document.getElementById("user-initial");
    const userShort = document.getElementById("user-short");
    const menuAvatar = document.getElementById("menu-avatar");
    const menuName = document.getElementById("menu-name");
    const menuMail = document.getElementById("menu-mail");
    const settingsNote = document.getElementById("settings-note");
    const settingsPlaces = document.getElementById("settings-places");

    function visProfil() {
      const navn = profilFelt.navn.value.trim() || "Uten navn";
      const initial = navn.charAt(0).toUpperCase();
      const fornavn = navn.split(" ")[0];

      profileAvatar.textContent = initial;
      userInitial.textContent = initial;
      userShort.textContent = fornavn;
      userButton.dataset.tooltip = fornavn;
      menuAvatar.textContent = initial;
      menuName.textContent = navn;
      menuMail.textContent = profilFelt.epost.value.trim();
    }

    function lagreProfil() {
      store(
        PROFIL_KEY,
        JSON.stringify({
          navn: profilFelt.navn.value,
          epost: profilFelt.epost.value,
          telefon: profilFelt.telefon.value,
        })
      );
    }

    try {
      const lagret = JSON.parse(restore(PROFIL_KEY) || "null");
      if (lagret) {
        Object.keys(profilFelt).forEach(function (nøkkel) {
          if (typeof lagret[nøkkel] === "string") profilFelt[nøkkel].value = lagret[nøkkel];
        });
      }
    } catch (error) {
      /* Beholder standardverdiene fra markupen */
    }

    Object.keys(profilFelt).forEach(function (nøkkel) {
      profilFelt[nøkkel].addEventListener("input", function () {
        visProfil();
        lagreProfil();
      });
    });

    visProfil();

    // Varselbrytere
    const brytere = Array.from(document.querySelectorAll(".switch[data-varsel]"));
    let varsler = {};
    try {
      varsler = JSON.parse(restore(VARSEL_KEY) || "{}") || {};
    } catch (error) {
      varsler = {};
    }

    brytere.forEach(function (bryter) {
      const nøkkel = bryter.dataset.varsel;
      if (typeof varsler[nøkkel] === "boolean") {
        bryter.setAttribute("aria-checked", String(varsler[nøkkel]));
      }

      bryter.addEventListener("click", function () {
        const på = bryter.getAttribute("aria-checked") !== "true";
        bryter.setAttribute("aria-checked", String(på));
        varsler[nøkkel] = på;
        store(VARSEL_KEY, JSON.stringify(varsler));
      });
    });

    // Restaurantene: viser hvilken som åpnes som standard
    function renderPlaces() {
      settingsPlaces.textContent = "";

      places.forEach(function (option) {
        const navn = option.dataset.place;
        const rad = document.createElement("li");
        rad.className = "place-row";

        const tekst = document.createElement("span");
        tekst.className = "user-row-text";
        const tittel = document.createElement("span");
        tittel.className = "place-row-name";
        tittel.textContent = navn;
        const meta = document.createElement("span");
        meta.className = "place-row-meta";
        meta.textContent =
          navn === "Heim Gruppen"
            ? "Egen avdeling med eget regnskap"
            : "Egen kasse, vaktplan og regnskap";
        tekst.append(tittel, meta);
        rad.append(tekst);

        if (VALGT.liste.includes(navn)) {
          const merke = document.createElement("span");
          merke.className = "badge is-default";
          merke.textContent = "Åpnes som standard";
          rad.append(merke);
        } else {
          const knapp = document.createElement("button");
          knapp.type = "button";
          knapp.className = "btn";
          knapp.textContent = "Sett som standard";
          knapp.addEventListener("click", function () {
            velgSteder([navn]);
          });
          rad.append(knapp);
        }

        settingsPlaces.append(rad);
      });
    }

    stedsLyttere.push(renderPlaces);
    renderPlaces();

    // Demoknapper på innstillingssiden
    document.querySelectorAll(".settings [data-demo]").forEach(function (knapp) {
      knapp.addEventListener("click", function () {
        settingsNote.textContent = knapp.dataset.demo;
        settingsNote.hidden = false;
      });
    });

    /* ---- Oversikt -------------------------------------------------------- */

    const PERIODE_KEY = "scope-test-periode";
    const AVVIK_KEY = "scope-test-avvik-sett";

    // Ett døgn (torsdag) per sted. Uke og måned skaleres fra dette.
    const STED_PROFIL = {
      // vaktEksp: hvor mye stedet bemanner opp når det blir travelt.
      // 1 = følger gjestetallet helt, lavere = henger etter.
      "Heim Jessheim": { oms: 87400, gjester: 214, varekost: 31.2, lonn: 28.4, booket: 68, vakt: 7, vaktEksp: 0.82, score: 4.3, bilag: 3 },
      "Heim Gjøvik": { oms: 61200, gjester: 158, varekost: 29.4, lonn: 31.6, booket: 44, vakt: 6, vaktEksp: 0.95, score: 4.5, bilag: 1 },
      "Heim St. Hanshaugen": { oms: 104800, gjester: 262, varekost: 30.1, lonn: 27.2, booket: 92, vakt: 9, vaktEksp: 0.88, score: 4.6, bilag: 2 },
      "Heim Fredrikstad": { oms: 54600, gjester: 142, varekost: 32.8, lonn: 29.9, booket: 38, vakt: 5, vaktEksp: 0.8, score: 4.1, bilag: 5 },
      "Heim Hamar": { oms: 48300, gjester: 126, varekost: 30.6, lonn: 30.8, booket: 31, vakt: 5, vaktEksp: 1, score: 4.4, bilag: 2 },
      // Gruppen er en egen avdeling med eget regnskap, ikke summen av de andre.
      "Heim Gruppen": { oms: 66400, gjester: 172, varekost: 31.8, lonn: 30.2, booket: 49, vakt: 6, vaktEksp: 0.86, score: 4.2, bilag: 4 },
    };

    const STEDSLISTE = Object.keys(STED_PROFIL);

    function samletProfil(liste) {
      const sum = liste.reduce(
        function (akk, navn) {
          const p = STED_PROFIL[navn];
          akk.oms += p.oms;
          akk.gjester += p.gjester;
          akk.booket += p.booket;
          akk.vakt += p.vakt;
          akk.bilag += p.bilag;
          akk.varekost += p.varekost * p.oms;
          akk.lonn += p.lonn * p.oms;
          akk.score += p.score * p.gjester;
          akk.vaktEksp += p.vaktEksp * p.vakt;
          return akk;
        },
        { oms: 0, gjester: 0, booket: 0, vakt: 0, bilag: 0, varekost: 0, lonn: 0, score: 0, vaktEksp: 0 }
      );

      return {
        oms: sum.oms,
        gjester: sum.gjester,
        booket: sum.booket,
        vakt: sum.vakt,
        bilag: sum.bilag,
        varekost: sum.varekost / sum.oms,
        lonn: sum.lonn / sum.oms,
        score: sum.score / sum.gjester,
        vaktEksp: sum.vaktEksp / sum.vakt,
      };
    }

    // Et navn kan dekke flere steder når menyen har flere avhukinger.
    function stederI(sted) {
      if (STED_PROFIL[sted]) return [sted];
      if (sted === VALGT.navn) return VALGT.liste;
      return STEDSLISTE;
    }

    function profil(sted) {
      const liste = stederI(sted);
      return liste.length === 1 ? STED_PROFIL[liste[0]] : samletProfil(liste);
    }

    // Endringstallene vektes mot omsetning, slik at de store stedene teller mest.
    function endring(sted) {
      const liste = stederI(sted);
      if (liste.length === 1) return ENDRING[liste[0]];

      const vekt = liste.reduce(function (sum, navn) {
        return sum + STED_PROFIL[navn].oms;
      }, 0);

      return liste.reduce(
        function (akk, navn) {
          const del = STED_PROFIL[navn].oms / vekt;
          Object.keys(akk).forEach(function (nøkkel) {
            akk[nøkkel] += ENDRING[navn][nøkkel] * del;
          });
          return akk;
        },
        { igår: 0, uke: 0, siste30: 0, varekost: 0, lonn: 0 }
      );
    }

    // Én beregning for kvelden, brukt både i panelet og i bemanningsvarselet,
    // slik at de aldri viser ulike tall for samme kveld.
    function kveldsTall(p, indeks) {
      const f = dagFaktor(indeks);
      const gjester = p.gjester * f * KVELDSANDEL;
      const vakt = Math.max(3, Math.round(p.vakt * Math.pow(f, p.vaktEksp)));
      return {
        faktor: f,
        gjester: gjester,
        vakt: vakt,
        booket: Math.round(p.booket * f),
        perAnsatt: gjester / vakt,
        oms: p.oms * f * KVELDSANDEL,
      };
    }

    // Endring mot forrige tilsvarende periode.
    const ENDRING = {
      "Heim Jessheim": { igår: 8.2, uke: 4.1, siste30: 6.5, varekost: 1.4, lonn: -0.8 },
      "Heim Gjøvik": { igår: -3.4, uke: 1.2, siste30: -0.8, varekost: -0.6, lonn: 1.7 },
      "Heim St. Hanshaugen": { igår: 12.6, uke: 9.4, siste30: 11.2, varekost: 0.2, lonn: -1.2 },
      "Heim Fredrikstad": { igår: -6.1, uke: -2.8, siste30: 1.4, varekost: 2.1, lonn: 0.4 },
      "Heim Hamar": { igår: 2.3, uke: 5.6, siste30: 3.1, varekost: -0.3, lonn: 1.1 },
      "Heim Gruppen": { igår: 5.4, uke: 3.3, siste30: 4.1, varekost: -0.9, lonn: 0.6 },
    };

    const NÅ = new Date();
    const I_GÅR = new Date(NÅ.getFullYear(), NÅ.getMonth(), NÅ.getDate() - 1);
    const dagIndeks = function (d) {
      return (d.getDay() + 6) % 7; // 0 = mandag
    };
    const datoFormat = new Intl.DateTimeFormat("nb-NO", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const stor = function (t) {
      return t.charAt(0).toUpperCase() + t.slice(1);
    };
    const ukenummer = function (d) {
      const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
      const nyttår = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
      return Math.ceil(((t - nyttår) / 86400000 + 1) / 7);
    };

    const TIMEVEKT = [0.03, 0.09, 0.1, 0.05, 0.04, 0.05, 0.09, 0.14, 0.15, 0.12, 0.08, 0.04, 0.02];
    const TIMENAVN = ["11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"];
    // Profiltallene er et snitt-døgn (torsdag). Ukedagene vektes mot det.
    const DAGVEKT = [0.7, 0.75, 0.85, 1, 1.45, 1.6, 0.95];
    const DAGNAVN = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
    const DAGNAVN_LANG = ["mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag", "søndag"];
    const TORSDAG = 3;

    function dagFaktor(indeks) {
      return DAGVEKT[indeks] / DAGVEKT[TORSDAG];
    }

    function ukeOppsett() {
      // Mandag til og med i går. Er det mandag i dag, viser vi forrige uke.
      const iGårIndeks = dagIndeks(I_GÅR);
      const heleForrige = dagIndeks(NÅ) === 0;
      const antall = heleForrige ? 7 : iGårIndeks + 1;
      return { antall: antall, heleForrige: heleForrige, sisteIndeks: heleForrige ? 6 : iGårIndeks };
    }

    const RETTER = [
      { navn: "Heim-burger", andel: 0.19, db: 68, type: "Mat" },
      { navn: "Fish & chips", andel: 0.12, db: 61, type: "Mat" },
      { navn: "Ribeye 300 g", andel: 0.08, db: 46, type: "Mat" },
      { navn: "Vegetarbowl", andel: 0.07, db: 72, type: "Mat" },
      { navn: "Husets pils 0,5", andel: 0.28, db: 78, type: "Drikke" },
      { navn: "Hummersuppe", andel: 0.04, db: 41, type: "Mat" },
      { navn: "Husets vin, glass", andel: 0.13, db: 74, type: "Drikke" },
      { navn: "Barnemeny", andel: 0.05, db: 52, type: "Mat" },
    ];

    const ANMELDELSER = [
      { score: 5, tekst: "Beste burgeren i byen, og rask service selv på en travel torsdag.", når: "I går" },
      { score: 4, tekst: "God mat og hyggelig personale, men vi ventet lenge på drikke.", når: "2 dager siden" },
      { score: 3, tekst: "Maten var fin, men lydnivået gjorde det vanskelig å prate.", når: "4 dager siden" },
    ];

    const MÅL = { varekost: 30, lonn: 30 };
    // Kveldsserveringen står for drøyt halve døgnet. Brukes til å vurdere
    // bemanningen mot forventet gjestetall.
    const KVELDSANDEL = 0.55;
    const PER_ANSATT_NORMALT = [15, 18];

    const nf = new Intl.NumberFormat("nb-NO");
    const kr = function (n) {
      return "kr " + nf.format(Math.round(n));
    };
    const krKort = function (n) {
      return n >= 10000 ? "kr " + nf.format(Math.round(n / 1000)) + "k" : kr(n);
    };
    const pst = function (n, desimaler) {
      return nf.format(Number(n.toFixed(desimaler === undefined ? 1 : desimaler))) + " %";
    };
    const pp = function (n) {
      return (n > 0 ? "+" : "−") + nf.format(Math.abs(Number(n.toFixed(1)))) + " pp";
    };
    const prosentEndring = function (n) {
      return (n > 0 ? "+" : "−") + nf.format(Math.abs(Number(n.toFixed(1)))) + " %";
    };

    const UKE = ukeOppsett();
    const ukeFaktor = DAGVEKT.slice(0, UKE.antall).reduce(function (a, b) {
      return a + b;
    }, 0) / DAGVEKT[TORSDAG];
    const snittDag = DAGVEKT.reduce(function (a, b) {
      return a + b;
    }, 0) / 7;

    const PERIODER = {
      igår: {
        navn: "I går",
        faktor: dagFaktor(dagIndeks(I_GÅR)),
        mot: "forrige " + DAGNAVN_LANG[dagIndeks(I_GÅR)],
        akse: "time",
      },
      uke: {
        navn: UKE.heleForrige ? "Forrige uke" : "Denne uken",
        faktor: ukeFaktor,
        mot: UKE.heleForrige ? "uken før" : "samme tid forrige uke",
        akse: "dag",
      },
      siste30: {
        // Fire hele uker, så grafsøylene summerer nøyaktig til kortet over dem.
        navn: "Siste 4 uker",
        faktor: (snittDag * 28) / DAGVEKT[TORSDAG],
        mot: "de fire ukene før",
        akse: "uke",
      },
    };

    const dash = document.getElementById("dash");
    const dashStatus = document.getElementById("dash-status");
    // Hele dashbordet bygges på nytt ved hver endring. Disse to holder styr på
    // hvor fokus skal lande etterpå, og hva skjermlesere skal få vite.
    let fokusEtterRender = null;
    let førsteRender = true;
    let periode = restore(PERIODE_KEY) || "igår";
    if (!PERIODER[periode]) periode = "igår";

    let overviewImprovement = 1;
    let avvikSett = {};
    try {
      avvikSett = JSON.parse(restore(AVVIK_KEY) || "{}") || {};
    } catch (error) {
      avvikSett = {};
    }

    // Daterte markeringer gjelder bare sin egen kveld.
    (function ryddAvvik() {
      const iDag = NÅ.toISOString().slice(0, 10);
      let endret = false;
      Object.keys(avvikSett).forEach(function (sted) {
        const beholdt = avvikSett[sted].filter(function (id) {
          const treff = id.match(/(\d{4}-\d{2}-\d{2})$/);
          return !treff || treff[1] >= iDag;
        });
        if (beholdt.length !== avvikSett[sted].length) endret = true;
        if (beholdt.length) avvikSett[sted] = beholdt;
        else delete avvikSett[sted];
      });
      if (endret) store(AVVIK_KEY, JSON.stringify(avvikSett));
    })();


    function tall(sted, per) {
      const p = profil(sted);
      const e = endring(sted);
      const f = PERIODER[per].faktor;
      const oms = p.oms * f;
      const gjester = Math.round(p.gjester * f);
      const bidragPst = 100 - p.varekost - p.lonn;

      return {
        oms: oms,
        gjester: gjester,
        snittbong: oms / gjester,
        varekost: p.varekost,
        varekostKr: (oms * p.varekost) / 100,
        lonn: p.lonn,
        lonnKr: (oms * p.lonn) / 100,
        bidragPst: bidragPst,
        bidragKr: (oms * bidragPst) / 100,
        // Bidraget forrige periode, så kortet kan vise en ekte kroneendring.
        bidragEndring: (function () {
          const forrigeOms = oms / (1 + e[per] / 100);
          const forrigeMargin = 100 - (p.varekost - e.varekost) - (p.lonn - e.lonn);
          const forrige = (forrigeOms * forrigeMargin) / 100;
          return forrige > 0 ? ((oms * bidragPst) / 100 / forrige - 1) * 100 : 0;
        })(),
        endring: e[per],
        varekostEndring: e.varekost,
        lonnEndring: e.lonn,
        profil: p,
      };
    }

    function serie(sted, per) {
      const p = profil(sted);
      const døgn = p.oms; // torsdagsnivå
      const gjesterDøgn = p.gjester;

      if (per === "igår") {
        const t = tall(sted, per);
        const sum = TIMEVEKT.reduce(function (a, b) {
          return a + b;
        }, 0);
        return TIMEVEKT.map(function (v, i) {
          const andel = v / sum;
          return {
            navn: TIMENAVN[i],
            verdi: t.oms * andel,
            gjester: Math.round(t.gjester * andel),
            prognose: false,
          };
        });
      }

      if (per === "uke") {
        return DAGVEKT.map(function (v, i) {
          const faktor = v / DAGVEKT[TORSDAG];
          return {
            navn: DAGNAVN[i],
            verdi: døgn * faktor,
            gjester: Math.round(gjesterDøgn * faktor),
            // Dager etter i går er ikke bokført ennå.
            prognose: !UKE.heleForrige && i > UKE.sisteIndeks,
          };
        });
      }

      // Fire uker, eldste først. Vektene normaliseres mot periodetotalen slik
      // at summen av søylene alltid er lik tallet i nøkkelkortet.
      const t = tall(sted, per);
      const uker = [0.96, 1.02, 0.98, 1.04];
      const sumUker = uker.reduce(function (a, b) {
        return a + b;
      }, 0);

      return uker.map(function (vekt, i) {
        const slutt = new Date(I_GÅR.getFullYear(), I_GÅR.getMonth(), I_GÅR.getDate() - (3 - i) * 7);
        const andel = vekt / sumUker;
        return {
          navn: "Uke " + ukenummer(slutt),
          verdi: t.oms * andel,
          gjester: Math.round(t.gjester * andel),
          prognose: false,
        };
      });
    }

    function isoDag(d) {
      return d.toISOString().slice(0, 10);
    }

    function avvikFor(sted) {
      const p = profil(sted);
      const liste = [];
      const gruppe = stederI(sted).length > 1;

      if (p.varekost > MÅL.varekost) {
        const over = p.varekost - MÅL.varekost;
        liste.push({
          id: "varekost",
          nivå: over > 1.5 ? "høy" : "middels",
          tittel: "Varekosten ligger " + pp(over).replace("+", "") + " over målet",
          tekst:
            (gruppe ? "Snittet for stedene du har valgt" : "Stedet") +
            " ligger på " +
            pst(p.varekost) +
            " mot målet på " +
            pst(MÅL.varekost, 0) +
            ". Det tilsvarer " +
            kr((p.oms * over) / 100) +
            " i døgnet.",
          handling: "Se varekost",
          visning: "varekost",
        });
      }

      if (p.lonn > MÅL.lonn) {
        const over = p.lonn - MÅL.lonn;
        liste.push({
          id: "lonn",
          nivå: over > 1 ? "høy" : "middels",
          tittel: "Lønnsprosenten er over målet",
          tekst:
            "Lønnskosten var " +
            pst(p.lonn) +
            " av salget i går, mot målet på " +
            pst(MÅL.lonn, 0) +
            ". Sjekk vaktplanen mot booking før helgen.",
          handling: "Se bemanning",
          visning: "bemanning",
        });
      }

      liste.push({
        id: "priser",
        nivå: "middels",
        tittel: "12 varer har økt i pris hos leverandøren",
        tekst:
          "Prisene steg i snitt 4,2 % siden forrige uke. Storfe og meieri står for det meste av økningen.",
        handling: "Se varekost",
        visning: "varekost",
      });

      // Første kveld de neste fire døgnene som ligger over normalen.
      let travel = null;
      for (let i = 0; i <= 3 && !travel; i++) {
        const indeks = (dagIndeks(NÅ) + i) % 7;
        const k = kveldsTall(p, indeks);
        if (k.perAnsatt > PER_ANSATT_NORMALT[1]) {
          const dato = new Date(NÅ.getFullYear(), NÅ.getMonth(), NÅ.getDate() + i);
          travel = {
            navn: i === 0 ? "I kveld" : stor(DAGNAVN_LANG[indeks]) + " kveld",
            tall: k,
            dato: isoDag(dato),
          };
        }
      }

      if (travel) {
        const k = travel.tall;
        liste.push({
          // Id-en bærer datoen, ellers ville «marker som sett» skjult
          // varselet for alle senere kvelder også.
          id: "bemanning-kveld-" + travel.dato,
          nivå: k.perAnsatt > 21 ? "høy" : "middels",
          tittel: travel.navn + " blir tynt bemannet",
          tekst:
            "Vi venter " +
            nf.format(Math.round(k.gjester)) +
            " gjester mot " +
            k.vakt +
            " på vakt — " +
            nf.format(Number(k.perAnsatt.toFixed(1))) +
            " per ansatt, mot normalen på " +
            PER_ANSATT_NORMALT[0] +
            "–" +
            PER_ANSATT_NORMALT[1] +
            ". Én ekstra på kveldsvakt tar det ned til " +
            nf.format(Number((k.gjester / (k.vakt + 1)).toFixed(1))) +
            ".",
          handling: "Se bemanning",
          visning: "bemanning",
        });
      }

      if (p.bilag > 0) {
        liste.push({
          id: "bilag",
          nivå: "lav",
          tittel: p.bilag + " bilag mangler vedlegg",
          tekst:
            "Regnskapsføreren får ikke lukket måneden før kvitteringene er lastet opp i Tripletex.",
          handling: "Se resultat",
          visning: "resultat",
        });
      }

      return liste.filter(function (a) {
        return !(avvikSett[sted] || []).includes(a.id);
      });
    }

    function el(tag, klasse, tekst) {
      const e = document.createElement(tag);
      if (klasse) e.className = klasse;
      if (tekst !== undefined) e.textContent = tekst;
      return e;
    }

    function delta(verdi, positivErBra, enhet) {
      const bra = positivErBra ? verdi > 0 : verdi < 0;
      const e = el("span", "delta " + (verdi === 0 ? "is-flat" : bra ? "is-up" : "is-down"));
      const pil = el("span", "delta-pil");
      pil.setAttribute("aria-hidden", "true");
      pil.textContent = verdi === 0 ? "→" : verdi > 0 ? "↑" : "↓";
      e.append(pil, enhet === "pp" ? pp(verdi) : prosentEndring(verdi));
      return e;
    }

    function sparkline(punkter) {
      const maks = Math.max.apply(null, punkter);
      const min = Math.min.apply(null, punkter);
      const spenn = maks - min || 1;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 100 28");
      svg.setAttribute("class", "spark");
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("aria-hidden", "true");

      const d = punkter
        .map(function (v, i) {
          const x = (i / (punkter.length - 1)) * 100;
          const y = 26 - ((v - min) / spenn) * 24;
          return (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
        })
        .join(" ");

      const linje = document.createElementNS("http://www.w3.org/2000/svg", "path");
      linje.setAttribute("d", d);
      linje.setAttribute("fill", "none");
      linje.setAttribute("stroke", "currentColor");
      linje.setAttribute("stroke-width", "1.6");
      linje.setAttribute("stroke-linecap", "round");
      linje.setAttribute("stroke-linejoin", "round");
      svg.append(linje);
      return svg;
    }

    function nøkkelkort(opts) {
      const kort = el("button", "kpi");
      kort.type = "button";
      kort.append(el("span", "kpi-label", opts.label));

      const verdi = el("span", "kpi-verdi", opts.verdi);
      kort.append(verdi);

      const under = el("span", "kpi-under");
      under.append(opts.delta);
      under.append(el("span", "kpi-mot", opts.mot));
      kort.append(under);

      if (opts.fot) kort.append(el("span", "kpi-fot", opts.fot));
      // Bare synlig i avansert visning; CSS styrer om linja vises.
      if (opts.detalj) kort.append(el("span", "kpi-detalj", opts.detalj));
      if (opts.spark) {
        const boks = el("span", "kpi-spark " + (opts.sparkKlasse || ""));
        boks.append(opts.spark);
        kort.append(boks);
      }

      kort.addEventListener("click", function () {
        showView(opts.visning);
        location.hash = "#" + opts.visning;
      });
      return kort;
    }

    // Periodene i Rapport-delen av oversikten. «Måned» er de siste fire ukene, samme periode som Salg.
    const GLANCE=[["igår","I går"],["uke","Uke"],["siste30","Måned"]];
    const hubState = {filter:"alle",report:"day",offset:0,food:0.5,wages:0.5,glance:"igår"};
    let taskProgress={};
    try { const saved=JSON.parse(restore("scope-actions-v1")||"{}"); if(saved && typeof saved==="object"&&!Array.isArray(saved)) taskProgress=saved; } catch { /* Start empty if local state is unreadable. */ }
    const hubDate=new Intl.DateTimeFormat("nb-NO",{day:"numeric",month:"short",year:"numeric"});
    const hubKey=()=>VALGT.liste.slice().sort().join("|");
    function hubButton(text,action,cls="hub-button") {const b=el("button",cls,text);b.type="button";b.addEventListener("click",()=>{action();workspaceSync();});return b;}
    function hubGo(view) {showView(view);location.hash="#"+view;}
    function hubHead(eyebrow,title,text) {const h=el("header","hub-head");h.append(el("span","overview-eyebrow",eyebrow),el("h2","",title),el("p","",text));return h;}
    function hubTasks() {
      const t=tall(placeName.textContent,"siste30");
      const tasks=[
        {id:"plan",title:"Tilpass vaktene til gjestene",text:"Sammenlign forventede gjester og bemanning. Test en justering på rolige vakter og følg med på servicen.",basis:"Lønn "+pst(t.lonn)+" · mål "+pst(MÅL.lonn),view:"bemanning",horizon:"Denne uken",priority:t.lonn>MÅL.lonn?3:1},
        {id:"cost",title:"Gå gjennom de største varelinjene",text:"Kontroller innkjøpspris og porsjonskost. Velg én varelinje å følge opp med leverandøren.",basis:"Varekost "+pst(t.varekost)+" · mål "+pst(MÅL.varekost),view:"varekost",horizon:"Neste 4 uker",priority:t.varekost>MÅL.varekost?3:1}
      ];
      if(t.profil.bilag>0) tasks.push({id:"receipts",title:"Få vedleggene på plass",text:"Finn kvitteringene som mangler og legg dem ved i regnskapssystemet før perioden lukkes.",basis:t.profil.bilag+" bilag mangler vedlegg",view:"resultat",horizon:"Nå",priority:2});
      return tasks.sort((a,b)=>b.priority-a.priority).map(task=>({...task,...taskProgress[hubKey()+"/"+task.id],status:["active","done"].includes(taskProgress[hubKey()+"/"+task.id]?.status)?taskProgress[hubKey()+"/"+task.id].status:"suggested"}));
    }
    function setTask(task,status) {
      taskProgress[hubKey()+"/"+task.id]={status,updated:new Date().toISOString()};
      store("scope-actions-v1",JSON.stringify(taskProgress)); renderDash();
      dashStatus.textContent=task.title+": "+({suggested:"Foreslått",active:"Pågår",done:"Utført"}[status]);
      // Tiltaket står både i oversiktskolonnen og på den fulle siden. Fokus
      // skal til det som faktisk er synlig.
      const synlig=velger=>Array.from(document.querySelectorAll(velger)).find(node=>node.offsetParent!==null);
      const target=synlig('.kol-tiltak [data-task="'+task.id+'"] button')||synlig('#hub-tiltak [data-task="'+task.id+'"] button')||synlig('#hub-tiltak [data-filter="'+hubState.filter+'"]');target?.focus({preventScroll:true});
    }
    function taskCard(task,compact=false) {
      const card=el("article","hub-task");card.dataset.task=task.id;card.dataset.status=task.status;
      const top=el("div","hub-task-top");top.append(el("span","hub-tag",task.horizon),el("span","hub-state",{suggested:"Foreslått",active:"◉ Pågår",done:"✓ Utført"}[task.status]));
      card.append(top,el("h3","",task.title),el("p","",task.text),el("span","hub-task-basis",task.basis));
      const actions=el("div","hub-actions");
      if(compact) actions.append(hubButton("Se tiltaket →",()=>hubGo("tiltak")));
      else {
        actions.append(hubButton(task.status==="suggested"?"Start tiltak →":task.status==="active"?"Marker som utført ✓":"Åpne igjen",()=>setTask(task,task.status==="suggested"?"active":task.status==="active"?"done":"suggested"),"hub-button hub-primary"));
        actions.append(hubButton("Se grunnlag ↗",()=>hubGo(task.view),"hub-link"));
        if(task.status==="active") actions.append(hubButton("Tilbake til foreslått",()=>setTask(task,"suggested"),"hub-link"));
      }
      card.append(actions);return card;
    }
    function hubStat(label,value,note) {const s=el("div","hub-stat");s.append(el("span","",label),el("strong","",value),el("small","",note));return s;}
    function renderDash() {
      if(!dash)return;
      const place=placeName.textContent,p=profil(place),tasks=hubTasks();
      const entries=stederI(place).map(name=>kveldsTall(STED_PROFIL[name],dagIndeks(NÅ)));
      const planned=entries.reduce((sum,entry)=>sum+entry.vakt,0),factor=dagFaktor(dagIndeks(NÅ));
      const points=buildDayTimeline(p.oms*factor,p.gjester*factor,planned);
      let selected=Math.max(0,Math.min(11,new Date().getHours()-12)),extra=0;
      dash.className="dash hub day-overview kolonner-flate";dash.replaceChildren();
      const grid=el("div","kolonner");dash.append(grid);

      // Kolonne 1: dagen som den ser ut nå, med bemanningen for valgt time.
      const naa=el("section","kol kol-naa"),naaHead=el("header","kol-topp"),time=el("span","day-time");
      naaHead.append(el("h3","","Nå"),time);naa.append(naaHead);
      const stats=el("div","day-stats"),revenue=el("strong"),guests=el("strong"),staff=el("strong"),ratio=el("strong");
      [["Omsetning",revenue,"Hittil i dag"],["Gjester",guests,"Hittil i dag"],["På vakt",staff,"I valgt time"],["Gjester / ansatt",ratio,"I valgt time"]].forEach(([label,value,note])=>{const box=el("div","day-stat");box.append(el("span","",label),value,el("small","",note));stats.append(box);});naa.append(stats);
      const chartHead=el("div","day-chart-head"),hourRead=el("output");chartHead.append(el("span","","Omsetning per time"),hourRead);naa.append(chartHead);
      const chart=el("div","day-chart");chart.setAttribute("role","group");chart.setAttribute("aria-label","Velg time i dagen");const max=Math.max(...points.map(point=>point.revenue));
      points.forEach((point,index)=>{const button=hubButton("",()=>{selected=index;update();},"day-hour");button.dataset.hour=String(point.hour);button.setAttribute("aria-label","Klokken "+point.label);const well=el("span","day-hour-well"),bar=el("i");bar.style.height=Math.max(2,point.revenue/max*100)+"%";well.append(bar);button.append(well,el("span","",String(point.hour)));chart.append(button);});naa.append(chart);
      const total=el("div","day-total");total.append(el("span","","Hele dagen · "+kr(points.at(-1).totalRevenue)+" / "+nf.format(points.at(-1).totalGuests)+" gjester"),hubButton("Se salg ↗",()=>hubGo("salg"),"hub-link"));naa.append(total);
      const team=el("div","kol-bemanning"),teamRead=el("div","kol-bemanning-tall"),teamNumber=el("strong"),teamNote=el("span");
      teamRead.append(teamNumber,teamNote);
      const stepper=el("div","glance-stepper"),extraRead=el("output");
      const minus=hubButton("−",()=>{extra--;update();},"glance-step"),plus=hubButton("+",()=>{extra++;update();},"glance-step");
      minus.setAttribute("aria-label","Én færre i simuleringen");plus.setAttribute("aria-label","Én ekstra i simuleringen");stepper.append(minus,extraRead,plus);
      const simNote=el("p","day-sim-note"),teamTopp=el("div","kol-bemanning-topp");
      teamTopp.append(el("span","kol-merke","BEMANNING"),stepper);
      team.append(teamTopp,teamRead,simNote,hubButton("Åpne vaktoversikten ↗",()=>{opsState.staffDay=dagIndeks(NÅ);opsState.staffWeek=0;hubGo("bemanning");},"hub-link"));
      naa.append(team);grid.append(naa);
      function update(){const point=points[selected],count=point.staff+extra;time.textContent="Til kl. "+(point.hour+1)+":00";revenue.textContent=kr(point.totalRevenue);guests.textContent=nf.format(point.totalGuests);staff.textContent=String(count);staff.parentElement.querySelector("small").textContent=extra?"Simulert i valgt time":"I valgt time";ratio.parentElement.querySelector("small").textContent=extra?"Simulert i valgt time":"I valgt time";ratio.textContent=nf.format(Number((point.guests/count).toFixed(1)));hourRead.textContent=point.label+" · "+kr(point.revenue)+" · "+point.guests+" gjester";chart.querySelectorAll("button").forEach((button,index)=>{button.setAttribute("aria-pressed",String(index===selected));button.dataset.future=String(index>selected);});teamNumber.textContent=String(count);teamNote.textContent="på vakt kl. "+point.label;extraRead.textContent=extra===0?"0":"+"+extra;minus.disabled=extra===0;plus.disabled=extra===8;simNote.textContent=extra?"Simulert: "+count+" ansatte · "+nf.format(Number((point.guests/count).toFixed(1)))+" gjester per ansatt.":"Prøv + og se gjester per ansatt endre seg.";}
      update();

      // Kolonne 2: de konkrete tiltakene, med effekten av dem nederst.
      const tiltak=el("section","kol kol-tiltak"),tiltakHead=el("header","kol-topp");
      tiltakHead.append(el("h3","","Tiltak"),hubButton("Alle tiltak ↗",()=>hubGo("tiltak"),"hub-link"));tiltak.append(tiltakHead);
      const t30=tall(place,"siste30"),anslag={cost:improvementEffect(t30.oms,1,0),plan:improvementEffect(t30.oms,0,1)};
      // Kortet skal leses på et blikk: hva, hvor mye, og én knapp.
      const gevinst={cost:["+ "+kr(anslag.cost),"på fire uker ved 1 pp lavere varekost"],plan:["+ "+kr(anslag.plan),"på fire uker ved 1 pp lavere lønn"],receipts:[null,"Ingen kroner, men riktig grunnlag i regnskapet"]};
      const liste=el("div","kol-liste");
      tasks.forEach(task=>{
        const kort=el("article","kol-raad");kort.dataset.task=task.id;kort.dataset.status=task.status;
        const topp=el("div","kol-raad-topp");
        topp.append(el("span","kol-chip",task.horizon),el("span","kol-status",{suggested:"Foreslått",active:"◉ Pågår",done:"✓ Utført"}[task.status]));
        const [sum,note]=gevinst[task.id]||[null,""];
        const effekt=el("div","kol-raad-effekt");
        if(sum)effekt.append(el("strong","",sum));
        effekt.append(el("small","",note));
        const knapper=el("div","kol-raad-knapper");
        const knapp=hubButton(task.status==="suggested"?"Start":task.status==="active"?"Fullfør":"Åpne igjen",()=>setTask(task,task.status==="suggested"?"active":task.status==="active"?"done":"suggested"),"hub-button");
        knapp.dataset.compactTask=task.id;
        knapper.append(knapp,hubButton("Se grunnlag ↗",()=>hubGo(task.view),"hub-link"));
        kort.append(topp,el("h4","",task.title),el("p","kol-raad-basis",task.basis),effekt,knapper);
        liste.append(kort);
      });
      tiltak.append(liste);grid.append(tiltak);

      // Kolonne 3: gårsdagen, uken eller måneden som er avsluttet.
      const rapport=el("section","kol kol-rapport"),rapportHead=el("header","kol-topp");
      rapportHead.append(el("h3","","Rapporter"),hubButton("Hele rapporten ↗",()=>hubGo("rapporter"),"hub-link"));rapport.append(rapportHead);
      const typer=el("div","kol-segment");typer.setAttribute("role","group");typer.setAttribute("aria-label","Rapporttype");
      [["day","Dag"],["week","Uke"],["month","Måned"]].forEach(([id,label])=>{const b=hubButton(label,()=>{hubState.report=id;hubState.offset=0;tegnRapport();typer.querySelector('[data-kol-report="'+id+'"]').focus();},"");b.dataset.kolReport=id;typer.append(b);});
      const rapportListe=el("div","kol-rapportliste");rapport.append(typer,rapportListe);
      const ukedagFormat=new Intl.DateTimeFormat("nb-NO",{weekday:"long"}),manedFormat=new Intl.DateTimeFormat("nb-NO",{month:"long",year:"numeric"});
      // ISO-ukenummer: uken eies av torsdagen.
      function ukenummer(dato){const d=new Date(Date.UTC(dato.getFullYear(),dato.getMonth(),dato.getDate()));d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));return Math.ceil(((d-Date.UTC(d.getUTCFullYear(),0,1))/86400000+1)/7);}
      function periodeNavn(r){return hubState.report==="day"?stor(ukedagFormat.format(r.start))+" "+hubDate.format(r.start):hubState.report==="week"?"Uke "+ukenummer(r.start):stor(manedFormat.format(r.start));}
      // Alle periodene ligger under hverandre. Kortet man åpner folder seg ut
      // der det står, så nabo-rapportene fortsatt er synlige over og under.
      function apneRapport(valgt){
        hubState.offset=valgt===null?0:valgt;
        rapportListe.querySelectorAll(".kol-rapportkort").forEach(kort=>{
          const apen=Number(kort.dataset.offset)===valgt,kropp=kort.querySelector(".kol-rapportkropp");
          kort.dataset.apen=String(apen);
          kort.querySelector(".kol-rapportknapp").setAttribute("aria-expanded",String(apen));
          // Høyden settes her, så utfoldingen animerer til akkurat det
          // rapporten trenger.
          kropp.style.maxHeight=apen?kropp.firstElementChild.scrollHeight+14+"px":"0px";
          if(apen)kort.scrollIntoView({block:"nearest",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
        });
      }
      function tegnRapport(){
        typer.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.kolReport===hubState.report)));
        rapportListe.replaceChildren();
        const navn={day:"dag",week:"uke",month:"måned"}[hubState.report];
        for(let offset=0;offset<8;offset++){
          const r=buildReport(p,hubState.report,offset,NÅ,DAGVEKT),forrige=buildReport(p,hubState.report,offset+1,NÅ,DAGVEKT);
          const kort=el("article","kol-rapportkort");kort.dataset.offset=String(offset);kort.dataset.apen="false";
          const knapp=hubButton("",()=>apneRapport(kort.dataset.apen==="true"?null:offset),"kol-rapportknapp");
          knapp.setAttribute("aria-expanded","false");
          const best=r.points.reduce((a,b)=>b.revenue>a.revenue?b:a);
          const navnBoks=el("div","kol-rapportnavn");
          navnBoks.append(el("strong","",periodeNavn(r)),el("small","",r.points.length>1?"Best: "+ukedagFormat.format(best.date)+" · "+kr(best.revenue):nf.format(r.guests)+" gjester"));
          knapp.append(navnBoks,el("span","kol-rapportsum",kr(r.revenue)),el("span","kol-pil","⌄"));
          const kropp=el("div","kol-rapportkropp"),inner=el("div","kol-rapportinner");
          const fire=el("div","kol-tall");
          [["Omsetning",kr(r.revenue)],["Gjester",nf.format(r.guests)],["Varekost + lønn",kr(r.cost+r.wages)],["Bidrag",kr(r.contribution)]].forEach(([label,verdi])=>{const boks=el("div");boks.append(el("span","",label),el("strong","",verdi));fire.append(boks);});
          const diff=r.contribution-forrige.contribution;
          const sammen=el("p","kol-sammenlign",diff===0?"Samme bidrag som forrige "+navn:(diff>0?"+ ":"− ")+kr(Math.abs(diff))+" i bidrag mot forrige "+navn);
          sammen.dataset.retning=diff===0?"flat":diff>0?"opp":"ned";
          inner.append(fire,sammen);
          // Dagsrapporten har bare ett punkt, og én enslig stolpe sier ingenting.
          if(r.points.length>1){
            const graf=el("div","kol-graf");graf.setAttribute("role","group");graf.setAttribute("aria-label","Omsetning per dag");
            const lese=el("output","kol-graf-lese","Velg en dag for beløp");const maks=Math.max(...r.points.map(x=>x.revenue));
            r.points.forEach(x=>{const b=hubButton("",()=>{lese.textContent=hubDate.format(x.date)+" · "+kr(x.revenue);graf.querySelectorAll("button").forEach(y=>y.setAttribute("aria-pressed",String(y===b)));},"kol-stolpe");b.setAttribute("aria-label",hubDate.format(x.date)+": "+kr(x.revenue));b.setAttribute("aria-pressed","false");const i=el("i");i.style.height=Math.max(3,x.revenue/maks*100)+"%";b.append(i);graf.append(b);});
            inner.append(graf,lese);
          }
          inner.append(hubButton("Hele rapporten ↗",()=>{hubState.offset=offset;hubGo("rapporter");},"hub-link"));
          kropp.append(inner);kort.append(knapp,kropp);rapportListe.append(kort);
        }
      }
      tegnRapport();grid.append(rapport);
      renderTasks(tasks);renderEffect(tasks);renderReports();
    }
    function renderTasks(tasks) {
      const root=document.getElementById("hub-tiltak");root.replaceChildren(hubHead("TILTAK / "+placeName.textContent,"Fra innsikt til handling.","Ett godt grep om gangen. Velg et tiltak, prøv det ut og følg utviklingen."));
      const done=tasks.filter(t=>t.status==="done").length;
      const progress=el("div","hub-progress");const track=el("progress");track.max=tasks.length;track.value=done;track.setAttribute("aria-label","Utførte tiltak");progress.append(el("strong","",done+" av "+tasks.length+" utført"),track,el("span","","Din oppfølging · lagret på denne enheten"));root.append(progress);
      const filters=el("div","hub-filters");filters.setAttribute("role","group");filters.setAttribute("aria-label","Filtrer tiltak");
      [["alle","Alle"],["suggested","Foreslått"],["active","Pågår"],["done","Utført"]].forEach(([id,label])=>{const b=hubButton(label+" · "+tasks.filter(t=>id==="alle"||t.status===id).length,()=>{hubState.filter=id;renderTasks(hubTasks());document.querySelector('[data-filter="'+id+'"]').focus();},"hub-filter");b.dataset.filter=id;b.setAttribute("aria-pressed",String(hubState.filter===id));filters.append(b);});root.append(filters);
      const list=el("div","hub-task-grid");const selected=tasks.filter(t=>hubState.filter==="alle"||t.status===hubState.filter);selected.forEach(t=>list.append(taskCard(t)));if(!selected.length)list.append(el("p","hub-empty","Ingen tiltak her ennå. Start et foreslått tiltak når du er klar."));root.append(list,el("p","hub-footnote","Forslagene er regelbaserte og bruker demodata. Status er din egen oppfølging; den endrer ikke vaktplan, regnskap eller leverandøravtaler."));
    }
    function renderEffect(tasks) {
      const root=document.getElementById("hub-effekt");root.replaceChildren(hubHead("EFFEKT / "+placeName.textContent,"Små endringer. Større handlingsrom.","Prøv ulike kostnadsandeler og se hva det kan bety for bidraget."));
      const t=tall(placeName.textContent,"siste30"),grid=el("div","hub-effect-grid"),controls=el("section","hub-panel");
      controls.append(el("span","overview-eyebrow","UTFORSK ET SCENARIO"),el("h3","","Hva vil du forbedre?"));
      const result=el("section","hub-effect-result"),amount=el("strong","hub-effect-amount"),after=el("p"),bars=el("div","hub-effect-bars");
      function update() {const gain=improvementEffect(t.oms,hubState.food,hubState.wages);amount.textContent="+ "+kr(gain);after.textContent="Bidragsgrad: "+pst(t.bidragPst)+" → "+pst(t.bidragPst+hubState.food+hubState.wages);bars.replaceChildren();[["Utgangspunkt",t.bidragKr],["Med endring",t.bidragKr+gain]].forEach(([label,v])=>{const r=el("div");const fill=el("i");fill.style.width=v/(t.bidragKr+t.oms*.06)*100+"%";r.append(el("span","",label+" · "+kr(v)),fill);bars.append(r);});}
      [["food","Lavere varekostandel",t.varekost],["wages","Lavere lønnsandel",t.lonn]].forEach(([key,title,current])=>{const label=el("label","hub-slider-label",title);label.htmlFor="effect-"+key;const value=el("output");value.htmlFor=label.htmlFor;const input=el("input");input.type="range";input.id=label.htmlFor;input.min="0";input.max="3";input.step="0.1";input.value=hubState[key];function change(){hubState[key]=Number(input.value);value.textContent=nf.format(hubState[key])+" pp · "+pst(current)+" → "+pst(current-hubState[key]);input.setAttribute("aria-valuetext",value.textContent);update();}input.addEventListener("input",change);change();controls.append(label,value,input);});
      controls.append(hubButton("Nullstill scenario",()=>{hubState.food=0;hubState.wages=0;renderEffect(hubTasks());document.getElementById("effect-food").focus();},"hub-link"),el("p","hub-footnote","1 prosentpoeng tilsvarer 1 kr per 100 kr i omsetning. Uendret salg og øvrige kostnader er forutsatt."));
      result.append(el("span","overview-eyebrow","MULIG ØKNING I BIDRAG / 4 UKER"),amount,after,bars,el("p","","Regneeksempel basert på siste 4 ukers demo-omsetning. Dette er ikke målt effekt eller en prognose."));update();grid.append(controls,result);root.append(grid);
      const measured=el("section","hub-panel hub-measured");measured.append(el("span","overview-eyebrow","OPPFØLGING AV FAKTISK EFFEKT"),el("h3","",tasks.some(t=>t.status==="done")?"Tiltak utført. Effekten må fortsatt måles.":"Ingen målt effekt ennå."),el("p","","For å måle effekt trenger vi faktiske før- og etterdata for sammenlignbare perioder. Et utført tiltak blir derfor ikke automatisk regnet som en besparelse."));tasks.filter(t=>t.status==="done").forEach(t=>measured.append(el("div","hub-measured-row", "✓ "+t.title+" · venter på målegrunnlag")));root.append(measured);
    }
    function renderReports() {
      const root=document.getElementById("hub-rapporter");root.replaceChildren(hubHead("RAPPORTER / "+placeName.textContent,"Se tilbake. Ta med deg det viktigste.","Utforsk avsluttede dager, hele uker og kalendermåneder. Alle rapporter er illustrasjoner med demodata."));
      const types=el("div","hub-report-types");[["day","Dagsrapport","Én avsluttet dag"],["week","Ukesrapport","Mandag til søndag"],["month","Månedsrapport","Hele kalendermåneden"]].forEach(([id,title,sub])=>{const b=hubButton("",()=>{hubState.report=id;hubState.offset=0;renderReports();document.querySelector('[data-report="'+id+'"]').focus();},"hub-report-type");b.dataset.report=id;b.setAttribute("aria-pressed",String(hubState.report===id));b.append(el("span","",{day:"☀",week:"▤",month:"▦"}[id]),el("strong","",title),el("small","",sub));types.append(b);});root.append(types);
      const r=buildReport(profil(placeName.textContent),hubState.report,hubState.offset,NÅ,DAGVEKT),prior=buildReport(profil(placeName.textContent),hubState.report,hubState.offset+1,NÅ,DAGVEKT);
      const dates=x=>hubDate.format(x.start)+(x.days.length>1?" – "+hubDate.format(x.end):"");
      const toolbar=el("div","hub-report-toolbar");const title=el("h3","",dates(r));const back=hubButton("← Eldre",()=>{hubState.offset++;renderReports();document.querySelector('[data-report-nav="older"]').focus();});back.dataset.reportNav="older";const next=hubButton("Nyere →",()=>{hubState.offset--;renderReports();document.querySelector('[data-report-nav="older"]').focus();});next.disabled=hubState.offset===0;toolbar.append(back,title,next);root.append(toolbar);
      const stats=el("div","hub-stats");stats.append(hubStat("Omsetning",kr(r.revenue),r.days.length+" avsluttede dager"),hubStat("Gjester",nf.format(r.guests),"Modellert fra restaurantprofilen"),hubStat("Varekost + lønn",kr(r.cost+r.wages),"Før faste kostnader"),hubStat("Bidrag",kr(r.contribution),pst(r.contribution/r.revenue*100)+" av omsetningen"));root.append(stats);
      const panel=el("section","hub-panel hub-report-body");panel.append(el("span","overview-eyebrow","OPPSUMMERT"),el("h3","",r.contribution>=prior.contribution?"Mer bidrag i denne perioden.":"Mindre bidrag i denne perioden."),el("p","","Bidraget er "+kr(Math.abs(r.contribution-prior.contribution))+(r.contribution>=prior.contribution?" høyere":" lavere")+" enn "+dates(prior)+". "+"Denne demomodellen har faste kostnadsandeler; forskjellen kommer fra antall dager og sammensetningen av ukedager."));
      const graph=el("div","hub-report-chart");graph.setAttribute("aria-label","Omsetning per dag");const read=el("output","hub-chart-read","Velg en dag for detaljer");read.setAttribute("aria-live","polite");const max=Math.max(...r.points.map(p=>p.revenue));
      r.points.forEach((p,i)=>{const b=hubButton("",()=>{read.textContent=hubDate.format(p.date)+" · "+kr(p.revenue)+" i omsetning";graph.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));},"hub-report-bar");b.setAttribute("aria-label",hubDate.format(p.date)+": "+kr(p.revenue));b.setAttribute("aria-pressed","false");const bar=el("i");bar.style.height=Math.max(3,p.revenue/max*100)+"%";b.append(bar,el("span","",String(p.date.getDate())));graph.append(b);});panel.append(graph,read);
      const table=el("table","hub-report-table");const thead=el("thead"),hr=el("tr");["Nøkkeltall","Valgt periode","Forrige periode"].forEach(x=>hr.append(el("th","",x)));thead.append(hr);table.append(thead);const body=el("tbody");[["Omsetning","revenue"],["Varekost","cost"],["Lønn","wages"],["Bidrag før faste kostnader","contribution"]].forEach(([label,key])=>{const row=el("tr");row.append(el("th","",label),el("td","",kr(r[key])),el("td","",kr(prior[key])));body.append(row);});table.append(body);const wrap=el("div","hub-table-wrap");wrap.append(table);panel.append(wrap);
      const exportButton=hubButton("Last ned rapport · CSV ↓",()=>{
        const lines=[["Scope – DEMODATA",placeName.textContent],["Periode",dates(r)],["Dato","Omsetning","Varekost","Lønn","Bidrag"]];
        r.points.forEach(p=>lines.push([hubDate.format(p.date),p.revenue.toFixed(2),(p.revenue*r.cost/r.revenue).toFixed(2),(p.revenue*r.wages/r.revenue).toFixed(2),(p.revenue*r.contribution/r.revenue).toFixed(2)]));
        const csv='\uFEFF'+lines.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=el("a");a.href=url;a.download="scope-demo-"+hubState.report+"-"+r.start.getFullYear()+"-"+(r.start.getMonth()+1)+"-"+r.start.getDate()+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      });panel.append(exportButton,el("p","hub-footnote","Rapporten er generert fra en fast demoprofil, ikke et arkiv av bokførte rapporter. CSV inneholder daglige tall for valgt restaurant og periode."));root.append(panel);
    }

    // Salg bruker de samme restaurant- og periodetallene som oversikten.
    const sales = document.getElementById("sales");
    let salesPeriod = "igår";
    let salesProducts = [];
    let salesMetric = 0;
    let salesSnapshot = null;
    let salesSlides = [];
    let salesSlideIndex = 0;
    let salesQuizAnswer = null;
    function renderSalesStory() {
      const data=salesSlides[salesSlideIndex];
      const wrap=document.getElementById("sales-wrap");wrap.dataset.tone=data.tone;wrap.dataset.chapter=String(salesSlideIndex);wrap.dataset.revealed=String(salesQuizAnswer!==null);
      const slide=document.getElementById("sales-wrap-slide");slide.replaceChildren();
      slide.append(el("p","sales-wrap-kicker",data.kicker));
      const title=el("h2","",salesSlideIndex===3&&salesQuizAnswer!==null&&data.top?data.top.navn:data.title);title.id="sales-wrap-title";slide.append(title);
      slide.append(el("strong","sales-wrap-number",data.value),el("p","sales-wrap-description",data.text));
      const visual=el("div","story-visual story-visual-"+salesSlideIndex);
      if(salesSlideIndex===0) {
        const max=Math.max(data.current,data.prior);
        [["Før",data.prior],["Nå",data.current]].forEach(([label,value],i)=>{const column=el("div","story-column");const bar=el("i");bar.style.setProperty("--story-height",(value/max*100)+"%");bar.style.setProperty("--story-delay",i*100+"ms");column.append(bar,el("span","",label));visual.append(column);});
      } else if(salesSlideIndex===1) {
        visual.setAttribute("aria-hidden","true");
        for(let i=0;i<30;i++){const dot=el("i","story-person");dot.style.setProperty("--story-delay",(i%10)*22+"ms");visual.append(dot);}
      } else if(salesSlideIndex===2) {
        const max=Math.max(...data.points.map(p=>p.revenue));
        data.points.forEach(p=>{const bar=el("button","story-peak-bar");bar.type="button";bar.style.setProperty("--story-height",(p.revenue/max*100)+"%");bar.dataset.peak=String(p.revenue===max);bar.setAttribute("aria-label",p.navn+": "+kr(p.revenue));bar.title=bar.getAttribute("aria-label");bar.addEventListener("click",()=>{document.getElementById("story-peak-caption").textContent=p.navn+" · "+kr(p.revenue);});visual.append(bar);});
      } else if(salesSlideIndex===3 && data.top) {
        visual.setAttribute("role","group");visual.setAttribute("aria-label","Gjett produktet med mest omsetning");
        data.choices.forEach((product,index)=>{const choice=el("button","story-choice");choice.append(el("span","story-choice-index",String(index+1).padStart(2,"0")),el("span","",product.navn),el("span","story-choice-arrow","↗"));choice.type="button";choice.disabled=salesQuizAnswer!==null;
          if(salesQuizAnswer!==null){choice.dataset.correct=String(product.navn===data.top.navn);choice.dataset.chosen=String(product.navn===salesQuizAnswer);}
          choice.addEventListener("click",()=>{salesQuizAnswer=product.navn;renderSalesStory();document.getElementById("sales-wrap-next").focus();});visual.append(choice);});
      } else if(salesSlideIndex===4) { const stamp=el("span","story-stamp","✓");stamp.setAttribute("aria-hidden","true");visual.append(stamp,el("span","story-stamp-label","Dette er din periode.")); }
      if(visual.childNodes.length)slide.append(visual);
      if(salesSlideIndex===2){const caption=el("p","story-peak-caption","Trykk på en søyle for å utforske");caption.id="story-peak-caption";slide.append(caption);}
      if(salesSlideIndex===3&&data.top){
        const feedback=el("p","story-quiz-feedback");feedback.textContent=salesQuizAnswer===null?"Velg et produkt — eller hopp videre.":(salesQuizAnswer===data.top.navn?"Riktig! ":"Det var "+data.top.navn+". ")+kr(data.top.amount)+" · "+pst(data.top.share*100)+" av salget";slide.append(feedback);
      }
      const facts=el("div","sales-wrap-facts");
      (salesSlideIndex===3&&data.top ? [] : data.facts).forEach(([label,value])=>{const fact=el("div");fact.append(el("span","",label),el("strong","",value));facts.append(fact);});slide.append(facts);
      const progress=document.getElementById("sales-wrap-progress");progress.replaceChildren();
      salesSlides.forEach((item,i)=>{const b=el("button");b.type="button";b.setAttribute("aria-label",(i+1)+". "+item.title);b.setAttribute("aria-current",i===salesSlideIndex?"step":"false");b.addEventListener("click",()=>{salesSlideIndex=i;renderSalesStory();document.querySelectorAll('#sales-wrap-progress button')[i].focus();});progress.append(b);});
      document.getElementById("sales-wrap-prev").disabled=salesSlideIndex===0;
      document.getElementById("sales-wrap-next").textContent=salesSlideIndex===salesSlides.length-1?"Tilbake til salg ↗":"Neste →";
      document.getElementById("sales-wrap-count").textContent=(salesSlideIndex+1)+" / "+salesSlides.length;
    }
    function openSalesStory() {
      const {t,peak,shiftRevenue}=salesSnapshot;
      const category=document.getElementById("sales-category").value;
      const query=document.getElementById("sales-search").value.trim().toLocaleLowerCase("nb-NO");
      const products=salesProducts.filter(r=>(category==="Alle"||r.type===category||salesCategory(r)===category)&&r.navn.toLocaleLowerCase("nb-NO").includes(query));
      const top=products[0];const prior=t.oms/(1+t.endring/100);const diff=t.oms-prior;
      const peakLabel=salesPeriod==="igår"?"kl. "+peak.navn:peak.navn;
      const shiftIndex=shiftRevenue.indexOf(Math.max(...shiftRevenue));
      const choices=products.slice(0,3);if(choices.length>1)choices.push(choices.shift());
      salesQuizAnswer=null;
      salesSlides=[
        {tone:"forest",kicker:"01 / Din periode i tall",title:t.endring>=0?"En sterkere periode.":"Salget gikk ned.",value:prosentEndring(t.endring),text:kr(Math.abs(diff))+(diff>=0?" mer":" mindre")+" enn "+PERIODER[salesPeriod].mot+".",current:t.oms,prior,facts:[["Omsetning",kr(t.oms)]]},
        {tone:"blue",kicker:"02 / Rundt bordene",title:"Plass til alle disse.",value:nf.format(t.gjester),text:"Og "+kr(t.snittbong)+" i omsetning per gjest.",facts:[["Restaurant",placeName.textContent]]},
        {tone:"amber",kicker:"03 / Periodens toppunkt",title:salesPeriod==="igår"?"Timens høydepunkt.":"Dagen som skilte seg ut.",value:peakLabel,text:kr(peak.revenue)+" i salg. "+pst(peak.revenue/t.oms*100)+" av hele perioden.",points:salesSnapshot.points,facts:[]},
        {tone:"plum",kicker:"04 / Gjett førsteplassen",title:top?"Hva solgte for mest?":"Ingen produkter i utvalget.",value:top?"01":"Ingen treff",text:top?(category!=="Alle"||query?"Blant produktene i filteret ditt.":"Ett produkt topper omsetningen."):"Prøv et annet søk eller en annen avdeling.",top,choices,facts:[]},
        {tone:"forest",kicker:"05 / Det du tar med deg",title:"Din periode, samlet.",value:kr(t.oms),text:nf.format(t.gjester)+" gjester · "+prosentEndring(t.endring)+" i omsetning",facts:[["Sterkeste punkt",peakLabel],["Største vakt",["Lunsj","Ettermiddag","Kveld"][shiftIndex]+" · "+pst(shiftRevenue[shiftIndex]/t.oms*100)],["Bestselger i utvalget",top?top.navn:"Ingen treff"]]}
      ];
      salesSlideIndex=0;
      document.getElementById("sales-wrap-context").textContent=document.getElementById("sales-date").textContent;
      renderSalesStory();document.getElementById("sales-wrap").showModal();
    }
    const SALES_MENU = [
      ...RETTER.map((r,i)=>({...r,price:[249,269,429,219,109,189,129,129][i]})),
      {navn:"Pommes frites",andel:.055,db:76,type:"Mat",price:79},
      {navn:"Sjokoladefondant",andel:.045,db:71,type:"Mat",price:139},
      {navn:"Cæsarsalat",andel:.06,db:67,type:"Mat",price:239},
      {navn:"Kyllingsandwich",andel:.05,db:69,type:"Mat",price:229},
      {navn:"Alkoholfri øl",andel:.04,db:73,type:"Drikke",price:79},
      {navn:"Mineralvann",andel:.07,db:82,type:"Drikke",price:59},
      {navn:"Espresso",andel:.025,db:86,type:"Drikke",price:39},
      {navn:"Aperol Spritz",andel:.05,db:77,type:"Drikke",price:149}
    ];
    function salesDialog(title,items,note) {
      const dialog=document.getElementById("sales-dialog");
      document.getElementById("sales-dialog-title").textContent=title;
      document.getElementById("sales-dialog-context").textContent=placeName.textContent+" · "+PERIODER[salesPeriod].navn;
      const body=document.getElementById("sales-dialog-body");body.replaceChildren();
      items.forEach(([label,value])=>{const row=el("div","sales-detail-row");row.append(el("span","",label),el("strong","",value));body.append(row);});
      if(note)body.append(el("p","sales-detail-note",note));
      dialog.showModal();
    }
    function salesAllocate(weights,total) {
      const sum=weights.reduce((a,b)=>a+b,0);let used=0;
      return weights.map((w,i)=>{const value=i===weights.length-1 ? total-used : Math.round(total*w/sum);used+=value;return value;});
    }
    const salesCategoryColors={Mat:"#478cb0",Mineralvann:"#65b3a2",Øl:"#d4a34f",Vin:"#ac7696",Sprit:"#9184c4",Kaffe:"#a68d72"};
    function salesCategory(product) {
      if(product.type==="Mat")return "Mat";
      if(product.navn==="Mineralvann")return "Mineralvann";
      if(product.navn==="Espresso")return "Kaffe";
      if(product.navn==="Aperol Spritz")return "Sprit";
      if(product.navn.includes("vin"))return "Vin";
      return "Øl";
    }
    const salesFormat = new Intl.DateTimeFormat("nb-NO", { day:"numeric", month:"short" });
    function renderSalesProducts() {
      const category = document.getElementById("sales-category").value;
      const query = document.getElementById("sales-search").value.trim().toLocaleLowerCase("nb-NO");
      const rows = salesProducts.filter(r => (category === "Alle" || r.type === category || salesCategory(r) === category) && r.navn.toLocaleLowerCase("nb-NO").includes(query));
      const body = document.getElementById("sales-rows");
      body.replaceChildren();
      rows.forEach(r => {
        const tr = el("tr");
        const name = el("td");
        const open=el("button","sales-product-link",r.navn);
        open.type="button";open.addEventListener("click",()=>salesDialog(r.navn,[["Omsetning",kr(r.amount)],["Solgte enheter, estimert",nf.format(Math.round(r.amount/r.price))],["Andel av totalen",pst(r.share*100)],["Dekningsbidrag",pst(r.db,0)],["Bidrag etter varekost",kr(r.amount*r.db/100)]],"Estimerte enheter er beregnet fra en eksempelpris på "+kr(r.price)+". Rabatter og varierende priser kan påvirke antallet."));
        name.append(open,el("small", "", salesCategory(r)+" · ca. "+nf.format(Math.round(r.amount/r.price))+" solgt"));
        const share=el("td","sales-product-share");share.append(el("span","",pst(r.share*100)));const meter=el("i");meter.style.background=salesCategoryColors[salesCategory(r)];meter.style.width=(r.share/salesProducts[0].share*100)+"%";meter.setAttribute("aria-hidden","true");share.append(meter);
        tr.append(name, share, el("td", "", kr(r.amount)));
        body.append(tr);
      });
      document.getElementById("sales-count").textContent = rows.length + " produkter";
      document.getElementById("sales-empty").hidden = rows.length > 0;
    }
    function renderSales() {
      const t = tall(placeName.textContent, salesPeriod);
      const period = PERIODER[salesPeriod];
      const start = new Date(I_GÅR);
      start.setDate(start.getDate() - (salesPeriod === "siste30" ? 29 : salesPeriod === "uke" ? UKE.antall - 1 : 0));
      document.getElementById("sales-date").textContent = placeName.textContent + " · " + (salesPeriod === "igår" ? stor(datoFormat.format(I_GÅR)) : salesFormat.format(start) + " – " + salesFormat.format(I_GÅR));

      document.querySelectorAll("[data-sales-period]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.salesPeriod === salesPeriod)));
      const metrics = document.getElementById("sales-metrics");
      metrics.replaceChildren();
      [ ["Omsetning", kr(t.oms), prosentEndring(t.endring) + " mot " + period.mot, t.endring >= 0 ? "sales-positive" : "sales-negative"], ["Gjester", nf.format(t.gjester), "I valgt periode", ""], ["Omsetning per gjest", kr(t.snittbong), "Omsetning delt på antall gjester", ""] ].forEach(([label,value,note,tone],index) => {
        const card = el("button", "sales-stat");card.type="button";card.setAttribute("aria-pressed",String(index===salesMetric));card.title="Vis "+label.toLowerCase()+" i grafen";
        card.addEventListener("click",()=>{salesMetric=index;renderSales();document.querySelectorAll(".sales-stat")[index].focus({preventScroll:true});});
        card.append(el("p", "sales-stat-label", label), el("strong", "sales-stat-value", value), el("p", "sales-stat-note " + tone, note));
        metrics.append(card);
      });
      const compare = document.getElementById("sales-compare").checked;
      document.getElementById("sales-prior-legend").hidden = !compare;
      // Normaliser alle punktene til periodens omsetning, uten fremtidige prognoser.
      let points = serie(placeName.textContent, salesPeriod).filter(p => !p.prognose);
      if (salesPeriod === "siste30") {
        points = Array.from({length:30}, (_,i) => { const day = new Date(start); day.setDate(day.getDate()+i); return { navn:salesFormat.format(day), verdi:DAGVEKT[dagIndeks(day)] }; });
      }
      const seed=placeName.textContent.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
      const weights=points.map((p,i)=>p.verdi*(1+.13*Math.sin(i*2.1+seed)));
      const revenue=salesAllocate(weights,Math.round(t.oms));
      const previous=salesAllocate(weights.map((w,i)=>w*(1+.19*Math.cos(i*1.7+seed))),Math.round(t.oms/(1+t.endring/100)));
      const guests=salesAllocate(weights.map((w,i)=>w*(1+.12*Math.cos(i+seed))),t.gjester);
      const priorGuests=salesAllocate(weights.map((w,i)=>w*(1+.14*Math.sin(i+seed))),Math.round(t.gjester/(1+t.endring/140)));
      points=points.map((p,i)=>({...p,revenue:revenue[i],previous:previous[i],guests:guests[i],value:salesMetric===0?revenue[i]:salesMetric===1?guests[i]:revenue[i]/Math.max(1,guests[i]),prior:salesMetric===0?previous[i]:salesMetric===1?priorGuests[i]:previous[i]/Math.max(1,priorGuests[i])}));
      const format=salesMetric===1 ? n=>nf.format(Math.round(n))+" gjester" : kr;
      const step=salesMetric===0 ? 5000 : salesMetric===1 ? 20 : 100;
      const max=Math.ceil(Math.max(...points.map(p=>Math.max(p.value,compare?p.prior:0)))/step)*step;
      document.getElementById("sales-chart-title").textContent=["Salgsutvikling","Gjester gjennom perioden","Omsetning per gjest"][salesMetric];
      const chart = document.getElementById("sales-chart"); chart.replaceChildren();
      const grid = el("div", "sales-chart-grid"); grid.setAttribute("aria-hidden","true");
      [max,max/2,0].forEach(n => { const line=el("div","sales-grid-line"); line.append(el("span","",n >= 1000 ? nf.format(n/1000)+"k" : nf.format(n)));grid.append(line); }); chart.append(grid);
      const bars = el("div", "sales-bars");
      const detail = document.getElementById("sales-point"); detail.textContent="Velg et punkt for detaljer";
      points.forEach((p,i) => {
        const button = el("button", "sales-bar"); button.type="button";button.style.setProperty("--sales-delay",Math.min(i*12,180)+"ms");
        const name = salesPeriod === "igår" ? "Kl. " + p.navn : p.navn;
        const description = name + ": " + format(p.value) + (compare ? " · før " + format(p.prior) : "");
        button.setAttribute("aria-label",description); button.title=description;
        const track=el("span","sales-bar-track"); track.setAttribute("aria-hidden","true");
        if(compare) { const prev=el("span","sales-bar-fill sales-bar-prev");prev.style.setProperty("--bar-height",(p.prior/max*100)+"%");track.append(prev); }
        const bar=el("span","sales-bar-fill");bar.style.setProperty("--bar-height",(p.value/max*100)+"%");track.append(bar);
        button.append(track,el("span","sales-bar-label",salesPeriod === "siste30" ? (i%7===0 ? p.navn.split(".")[0] : "") : p.navn));
        ["pointerenter","focus"].forEach(event => button.addEventListener(event,()=> { detail.textContent=description; }));
        button.addEventListener("click",()=>salesDialog(name,[["Omsetning",kr(p.revenue)],["Forrige periode",kr(p.previous)],["Gjester",nf.format(p.guests)],["Omsetning per gjest",kr(p.revenue/Math.max(1,p.guests))]],"Dette punktet er en del av "+PERIODER[salesPeriod].navn.toLowerCase()+". Alle søylene summerer til periodens omsetning og gjestetall."));bars.append(button);
      }); chart.append(bars);
      const productAmounts=salesAllocate(SALES_MENU.map((r,i)=>r.andel*(1+.18*Math.sin(seed+i*1.3+salesPeriod.length))),Math.round(t.oms));
      salesProducts=SALES_MENU.map((r,i)=>({...r,share:productAmounts[i]/t.oms,amount:productAmounts[i]})).sort((a,b)=>b.amount-a.amount);
      renderSalesProducts();
      const mix=document.getElementById("sales-mix"); mix.replaceChildren();
      const categories=Object.entries(salesCategoryColors).map(([name,color])=>({name,color,amount:salesProducts.filter(r=>salesCategory(r)===name).reduce((sum,r)=>sum+r.amount,0)}));
      const categoryTotal=categories.reduce((sum,c)=>sum+c.amount,0);
      let offset=0;
      const stops=categories.map(c=>{const from=offset;offset+=c.amount/categoryTotal*100;return c.color+" "+from+"% "+offset+"%";});
      const donut=el("div","sales-donut");donut.style.background="conic-gradient("+stops.join(",")+")";donut.setAttribute("aria-hidden","true");
      const center=el("div","sales-donut-center");center.append(el("strong","",pst(categories[0].amount/categoryTotal*100,0)),el("span","","Mat"));donut.append(center);mix.append(donut);
      categories.forEach(({name,color,amount})=>{
        const row=el("button","sales-mix-row");row.type="button";row.title="Vis produkter fra "+name.toLowerCase();
        row.addEventListener("click",()=>{setSalesDetail("products");document.getElementById("sales-category").value=name;document.getElementById("sales-search").value="";renderSalesProducts();document.getElementById("sales-category").focus({preventScroll:true});});
        const label=el("span");const dot=el("i");dot.style.background=color;label.append(dot,document.createTextNode(name+" · "+pst(amount/categoryTotal*100)));row.append(label,el("strong","",kr(amount)));mix.append(row);
      });
      const shifts=document.getElementById("sales-shifts");shifts.replaceChildren();
      const shiftGroups=[[0,4],[4,7],[7,13]];
      const shiftRevenue=salesPeriod==="igår" ? shiftGroups.map(([a,b])=>points.slice(a,b).reduce((sum,p)=>sum+p.revenue,0)) : salesAllocate([.22,.31,.47],Math.round(t.oms));
      const shiftGuests=salesPeriod==="igår" ? shiftGroups.map(([a,b])=>points.slice(a,b).reduce((sum,p)=>sum+p.guests,0)) : salesAllocate([.28,.32,.40],t.gjester);
      ["Lunsj · 11–15","Ettermiddag · 15–18","Kveld · 18–24"].forEach((name,i)=>{const button=el("button","sales-shift");button.type="button";button.append(el("span","",name),el("strong","",kr(shiftRevenue[i])));button.addEventListener("click",()=>salesDialog(name,[["Omsetning",kr(shiftRevenue[i])],["Gjester",nf.format(shiftGuests[i])],["Omsetning per gjest",kr(shiftRevenue[i]/Math.max(1,shiftGuests[i]))],["Andel av salget",pst(shiftRevenue[i]/t.oms*100)]],"Fordeling per vakt for hele den valgte perioden."));shifts.append(button);});
      const peak=points.reduce((best,p)=>p.revenue>best.revenue?p:best,points[0]);
      salesSnapshot={t,peak,shiftRevenue,points};
      sales.dataset.metric=String(salesMetric);
      const guestData=document.getElementById("sales-guest-data");guestData.replaceChildren();
      const total=el("div","sales-guest-total");total.append(el("strong","",nf.format(t.gjester)),el("span","","gjester totalt"));guestData.append(total);
      ["Lunsj","Ettermiddag","Kveld"].forEach((name,i)=>{const row=el("button","sales-guest-row");row.type="button";const line=el("span","sales-guest-line");line.append(el("span","",name),el("strong","",nf.format(shiftGuests[i])+" · "+pst(shiftGuests[i]/t.gjester*100,0)));const track=el("span","sales-guest-track");const fill=el("i");fill.style.width=(shiftGuests[i]/Math.max(...shiftGuests)*100)+"%";track.append(fill);row.append(line,track);row.addEventListener("click",()=>salesDialog(name,[["Gjester",nf.format(shiftGuests[i])],["Omsetning per gjest",kr(shiftRevenue[i]/Math.max(1,shiftGuests[i]))],["Omsetning",kr(shiftRevenue[i])]],"Tallene gjelder valgt restaurant og periode."));guestData.append(row);});
      const average=el("div","sales-guest-average");average.append(el("span","","Omsetning per gjest"),el("strong","",kr(t.snittbong)));guestData.append(average);
    }
    function setSalesDetail(name) {
      ["mix","guests","products"].forEach(key=>{document.getElementById("sales-detail-"+key).hidden=key!==name;document.querySelector('[data-sales-detail="'+key+'"]').setAttribute("aria-pressed",String(key===name));});
    }
    if (sales) {
      document.querySelectorAll("[data-sales-detail]").forEach(button=>button.addEventListener("click",()=>setSalesDetail(button.dataset.salesDetail)));
      const wrap=document.getElementById("sales-wrap");
      document.getElementById("sales-summary-open").addEventListener("click",openSalesStory);
      document.getElementById("sales-wrap-close").addEventListener("click",()=>wrap.close());
      function moveSalesStory(direction) { if(direction===1&&salesSlideIndex===salesSlides.length-1){wrap.close();return;}salesSlideIndex=Math.max(0,Math.min(salesSlides.length-1,salesSlideIndex+direction));renderSalesStory(); }
      document.getElementById("sales-wrap-next").addEventListener("click",()=>moveSalesStory(1));
      document.getElementById("sales-wrap-prev").addEventListener("click",()=>moveSalesStory(-1));
      wrap.addEventListener("keydown",e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();moveSalesStory(e.key==="ArrowRight"?1:-1);}});
      wrap.addEventListener("click",e=>{if(e.target===wrap){const b=wrap.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)wrap.close();}});
      const dialog=document.getElementById("sales-dialog");
      document.getElementById("sales-dialog-close").addEventListener("click",()=>dialog.close());
      dialog.addEventListener("click",e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}});
      Object.entries(PERIODER).forEach(([key,p]) => { const button=el("button","",p.navn); button.type="button";button.dataset.salesPeriod=key;button.addEventListener("click",()=>{salesPeriod=key;renderSales();});document.getElementById("sales-periods").append(button); });
      document.getElementById("sales-category").addEventListener("change",renderSalesProducts);
      document.getElementById("sales-search").addEventListener("input",renderSalesProducts);
      document.getElementById("sales-compare").addEventListener("change",renderSales);
      stedsLyttere.push(renderSales);
      renderSales();
    }

    /* Arbeidsflater: beregningene bygger på samme profiler som Salg. */
    const opsState = { varekost:"igår", resultat:"uke", kostnader:"uke", staffWeek:0, staffDay:dagIndeks(NÅ), extra:0 };
    const opsDialog=el("dialog","sales-dialog ops-dialog");opsDialog.id="ops-dialog";opsDialog.setAttribute("aria-labelledby","ops-dialog-title");
    const opsClose=el("button","icon-button","×");opsClose.type="button";opsClose.setAttribute("aria-label","Lukk detaljer");opsClose.addEventListener("click",()=>opsDialog.close());
    const opsDialogTitle=el("h2");opsDialogTitle.id="ops-dialog-title";const opsDialogBody=el("div");
    opsDialog.append(opsClose,opsDialogTitle,opsDialogBody);app.append(opsDialog);
    opsDialog.addEventListener("click",e=>{if(e.target===opsDialog){const b=opsDialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)opsDialog.close();}});
    function opsDetail(title,rows,note) {
      opsDialogTitle.textContent=title;opsDialogBody.replaceChildren();
      rows.forEach(([label,value])=>{const row=el("div","sales-detail-row");row.append(el("span","",label),el("strong","",value));opsDialogBody.append(row);});
      opsDialogBody.append(el("p","sales-detail-note",note||"Eksempeltall for "+placeName.textContent+". Ingen endringer sendes til tilkoblede systemer."));opsDialog.showModal();
    }
    function opsButton(text,fn,cls="ops-button") {const b=el("button",cls,text);b.type="button";b.addEventListener("click",fn);return b;}
    function opsPanel(title,subtitle,cls="") {const p=el("section","ops-panel "+cls);const head=el("div","ops-panel-head");head.append(el("h2","",title));if(subtitle)head.append(el("p","ops-muted",subtitle));p.append(head);return p;}
    function opsStat(label,value,note,cls="") {const card=el("div","ops-stat "+cls);card.append(el("span","ops-muted",label),el("strong","",value),el("small","",note));return card;}
    const opsStory=el("dialog","ops-story");opsStory.id="ops-story";opsStory.setAttribute("aria-labelledby","ops-story-title");app.append(opsStory);
    let opsStoryCards=[],opsStoryIndex=0;
    function renderOpsStory(){
      const card=opsStoryCards[opsStoryIndex];opsStory.replaceChildren();opsStory.dataset.tone=card.tone;
      const top=el("div","ops-story-top");top.append(el("span","","scope / oppsummert"),opsButton("×",()=>opsStory.close()));top.lastChild.setAttribute("aria-label","Lukk oppsummering");opsStory.append(top,el("p","ops-story-context",placeName.textContent+" · "+card.context));
      const progress=el("div","ops-story-progress");opsStoryCards.forEach((c,i)=>{const b=opsButton("",()=>{opsStoryIndex=i;renderOpsStory();opsStory.querySelectorAll('.ops-story-progress button')[i].focus();});b.setAttribute("aria-label",c.title);b.setAttribute("aria-current",i===opsStoryIndex?"step":"false");progress.append(b);});opsStory.append(progress);
      const body=el("div","ops-story-body");body.setAttribute("aria-live","polite");body.append(el("span","ops-story-chapter","0"+(opsStoryIndex+1)+" / 03"));const title=el("h2","",card.title);title.id="ops-story-title";body.append(title,el("strong","ops-story-value",card.value),el("p","",card.text));
      const chart=el("div","ops-story-chart");const max=Math.max(...card.bars.map(b=>b[1]),1);card.bars.forEach(([label,value,display])=>{const row=el("div");const names=el("div");names.append(el("span","",label),el("strong","",display));const track=el("span","ops-story-track");const fill=el("i");fill.style.width=value/max*100+"%";track.append(fill);row.append(names,track);chart.append(row);});body.append(chart);opsStory.append(body);
      const nav=el("div","ops-story-nav");const prev=opsButton("← Tilbake",()=>moveOpsStory(-1));prev.disabled=opsStoryIndex===0;nav.append(prev,el("span","",(opsStoryIndex+1)+" / 3"),opsButton(opsStoryIndex===2?"Tilbake til oversikten ↗":"Neste →",()=>moveOpsStory(1)));opsStory.append(nav,el("p","ops-story-note","Demodata · simuleringer endrer ikke grunnlaget"));
    }
    function moveOpsStory(delta){if(opsStoryIndex===2&&delta===1){opsStory.close();return;}opsStoryIndex=Math.max(0,Math.min(2,opsStoryIndex+delta));renderOpsStory();opsStory.querySelector('.ops-story-nav button:last-child').focus();}
    opsStory.addEventListener("keydown",e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();moveOpsStory(e.key==="ArrowRight"?1:-1);}});
    function openOpsStory(key){
      if(key==="bemanning"){
        const d=staffData()[opsState.staffDay],extra=opsState.extra,context=stor(datoFormat.format(d.date))+" · kveld";const ratio=d.guests/d.staff;
        opsStoryCards=[
          {title:"En kveld å planlegge for.",value:nf.format(d.guests)+" gjester",text:d.staff+" ansatte er planlagt i demoen.",bars:[["Forventede gjester",d.guests,nf.format(d.guests)],["Kapasitet ved 18 per ansatt",d.staff*18,nf.format(d.staff*18)]]},
          {title:ratio>18?"Litt høyt trykk.":"Kapasiteten strekker til.",value:nf.format(Number(ratio.toFixed(1))),text:"Gjester per ansatt. Normalområdet i modellen er 15–18.",bars:[["Denne kvelden",ratio,nf.format(Number(ratio.toFixed(1)))],["Øvre normalnivå",18,"18"]]},
          {title:extra?"Slik slår valget ditt ut.":"Hva med én ekstra?",value:kr((extra||1)*6*320),text:"Ekstra lønn for "+(extra||1)+" ansatte i seks timer. Regneeksempel, ikke en lagret vaktendring.",bars:[["Gjester per ansatt før",ratio,nf.format(Number(ratio.toFixed(1)))],["Etter",d.guests/(d.staff+(extra||1)),nf.format(Number((d.guests/(d.staff+(extra||1))).toFixed(1)))]]}
        ].map(c=>({...c,context,tone:"blue"}));
      }else{
        const t=tall(placeName.textContent,opsState[key]),context=PERIODER[opsState[key]].navn;
        if(key==="varekost"){
          const reduction=Number(document.getElementById("cost-reduction").value);
          opsStoryCards=[
            {title:"Dette går til varene.",value:pst(t.varekost),text:kr(t.varekostKr)+" av periodens omsetning.",bars:[["Varekost",t.varekost,pst(t.varekost)],["Mål",MÅL.varekost,pst(MÅL.varekost,0)]]},
            {title:"Dette bør forklares.",value:kr(costModel().total-costModel().theoretical),text:"Avvik mellom faktisk og teoretisk vareforbruk. Registrert svinn er en del av avviket.",bars:[["Teoretisk forbruk",costModel().theoretical,kr(costModel().theoretical)],["Faktisk forbruk",costModel().total,kr(costModel().total)]]},
            {title:"Effekten av grepet ditt.",value:kr(t.oms*reduction/100),text:"Mer igjen ved "+nf.format(reduction)+" prosentpoeng lavere varekost og uendret salg.",bars:[["Varekost nå",t.varekost,pst(t.varekost)],["I simuleringen",t.varekost-reduction,pst(t.varekost-reduction)]]}
          ].map(c=>({...c,context,tone:"gold"}));
        }else{
          const contribution=Math.round(t.oms)-Math.round(t.varekostKr)-Math.round(t.lonnKr);
          opsStoryCards=[
            {title:"Dette er igjen.",value:kr(contribution),text:"Bidrag etter varekost og lønn. Faste kostnader er ikke trukket fra.",bars:[["Omsetning",t.oms,kr(t.oms)],["Bidrag",contribution,kr(contribution)]]},
            {title:"Hvor går pengene?",value:pst(t.varekost+t.lonn),text:"Andel av salget som går til varer og lønn.",bars:[["Varekost",t.varekost,pst(t.varekost)],["Lønn",t.lonn,pst(t.lonn)],["Bidrag",t.bidragPst,pst(t.bidragPst)]]},
            {title:"Mot målet.",value:pst(t.bidragPst),text:"Bidragsgrad. Målet bygger på 30 % varekost og 30 % lønn — dette er ikke nettoresultat.",bars:[["Denne perioden",t.bidragPst,pst(t.bidragPst)],["Mål",40,"40 %"]]}
          ].map(c=>({...c,context,tone:"green"}));
        }
      }
      opsStoryIndex=0;renderOpsStory();opsStory.showModal();
    }

    function opsToolbar(root,key,render,summary) {
      const bar=el("div","ops-toolbar");const periods=el("div","sales-segment");periods.setAttribute("role","group");periods.setAttribute("aria-label","Periode");
      Object.entries(PERIODER).forEach(([id,p])=>{const b=opsButton(p.navn,()=>{opsState[key]=id;render();document.querySelector('#ops-'+key+' [data-period="'+id+'"]').focus({preventScroll:true});},"");b.dataset.period=id;b.setAttribute("aria-pressed",String(opsState[key]===id));periods.append(b);});
      bar.append(periods,opsButton("✦ Oppsummert",()=>openOpsStory(key),"ops-button ops-summary"));root.append(bar);
    }
    const costUI={tab:"invoices",supplier:"Alle",invoiceFilter:"Alle",reviewed:new Set(),reduction:1};
    function costModel(){
      const t=tall(placeName.textContent,opsState.varekost),total=Math.round(t.varekostKr);
      const seed=placeName.textContent.split("").reduce((s,c)=>s+c.charCodeAt(0),0);
      const sales=salesAllocate(SALES_MENU.map((r,i)=>r.andel*(1+.18*Math.sin(seed+i*1.3+opsState.varekost.length))),Math.round(t.oms));
      const names=Object.keys(salesCategoryColors),ratios=[.39,.18,.27,.29,.20,.16];
      const categorySales=names.map(name=>SALES_MENU.reduce((sum,r,i)=>sum+(salesCategory(r)===name?sales[i]:0),0));
      const costs=salesAllocate(categorySales.map((s,i)=>s*ratios[i]),total);
      const theoretical=salesAllocate(costs,Math.round(total*.92));const waste=salesAllocate(costs,Math.round(total*.03));
      const groups=names.map((name,i)=>({name,sales:categorySales[i],cost:costs[i],theory:theoretical[i],waste:waste[i],variance:costs[i]-theoretical[i],color:salesCategoryColors[name]}));
      const opening=Math.round(total*.42),purchases=Math.round(total*1.08),closing=opening+purchases-total;
      const suppliers=[{name:"Nord Matgrossist",group:"Mat",kind:"Mat og tørrvarer"},{name:"Grønt & Friskt",group:"Mat",kind:"Frukt og grønnsaker"},{name:"Brygghuset Engros",group:"Øl",kind:"Øl og mineralvann"},{name:"Vinlageret",group:"Vin",kind:"Vin og brennevin"}];
      const span=opsState.varekost==="igår"?1:opsState.varekost==="uke"?UKE.antall:28;
      const amounts=salesAllocate([18,14,10,9,13,7,8,11,10],purchases);
      const invoices=amounts.map((amount,i)=>{const date=new Date(I_GÅR);date.setDate(date.getDate()-Math.floor(i/9*span));const supplier=suppliers[i%4];const id="DEMO-"+(7100+i);const key=placeName.textContent+"/"+opsState.varekost+"/"+id;return {id,key,supplier:supplier.name,amount,date,review:i%3===0&&!costUI.reviewed.has(key),reason:i===0?"Prisavvik på en varelinje":i===3?"Kontroller mottatt mengde":"Kontroller kontering"};});
      return {t,total,groups,opening,purchases,closing,invoices,suppliers,theoretical:theoretical.reduce((s,v)=>s+v,0),waste:waste.reduce((s,v)=>s+v,0)};
    }
    function showCostInvoice(invoice){
      const parts=salesAllocate([.54,.31,.15],invoice.amount);
      opsDetail(invoice.id,[["Leverandør",invoice.supplier],["Fakturadato",salesFormat.format(invoice.date)],["Varelinje 1",kr(parts[0])],["Varelinje 2",kr(parts[1])],["Varelinje 3",kr(parts[2])],["Sum eks. mva.",kr(invoice.amount)],["Status",invoice.review?"Til kontroll":"Kontrollert"]],"Illustrert faktura, ikke et originalbilag. "+(invoice.review?invoice.reason+". ":"")+"Beløpet inngår i periodens innkjøp. Kontrollstatus sier ikke om fakturaen er betalt.");
      if(invoice.review){const button=opsButton("Merk kontrollert i demo",()=>{costUI.reviewed.add(invoice.key);opsDialog.close();costView();document.querySelector('#ops-varekost [data-cost-tab="invoices"]').focus();});button.classList.add("cost-review-button");opsDialogBody.append(button);}
    }
    function costView() {
      const root=document.getElementById("ops-varekost");root.replaceChildren();const m=costModel(),t=m.t;
      opsToolbar(root,"varekost",costView,()=>{});
      const stats=el("div","cost-overview");stats.append(
        opsStat("Varekost",pst(t.varekost),kr(m.total)+" brukt i perioden"),
        opsStat("Innkjøp",kr(m.purchases),m.invoices.length+" mottatte fakturaer"),
        opsStat("Avvik mot kalkyle",kr(m.total-m.theoretical),"Inkluderer registrert svinn")
      );root.append(stats);
      const grid=el("div","cost-workspace");const groups=opsPanel("Varekost per gruppe","Kostnad målt mot salget i hver gruppe","cost-groups");
      const headings=el("div","cost-group-head");["Varegruppe","Andel av gruppesalg","Varekost"].forEach(v=>headings.append(el("span","",v)));groups.append(headings);
      const rows=el("div","cost-group-list");m.groups.forEach(group=>{
        const row=opsButton("",()=>opsDetail(group.name,[["Gruppens omsetning",kr(group.sales)],["Varekost",kr(group.cost)],["Varekost / gruppesalg",pst(group.cost/group.sales*100)],["Teoretisk forbruk",kr(group.theory)],["Avvik",kr(group.variance)],["Registrert svinn",kr(group.waste)],["Uforklart avvik",kr(group.variance-group.waste)]],"Demomodell. Teoretisk forbruk og svinn er illustrerte beregninger. Avvik kan skyldes blant annet porsjonering, svinn, telling eller registrering."),"cost-group-row");row.dataset.costGroup=group.name;
        const name=el("span","cost-group-name");const dot=el("i");dot.style.background=group.color;name.append(dot,el("strong","",group.name));
        const chart=el("span","cost-group-chart");const track=el("span","cost-group-track");const bar=el("i");bar.style.width=group.cost/group.sales*100+"%";bar.style.background=group.color;track.append(bar);chart.append(track,el("span","",pst(group.cost/group.sales*100)));
        row.append(name,chart,el("strong","cost-group-value",kr(group.cost)));rows.append(row);
      });groups.append(rows);
      const explanation=el("div","cost-basis");explanation.append(el("span","ops-muted","Slik er varekosten beregnet"));const formula=el("div","cost-formula");[["Lager inn",m.opening],["+ Innkjøp",m.purchases],["− Lager ut",m.closing],["= Varekost",m.total]].forEach(([label,value])=>{const item=el("div");item.append(el("span","",label),el("strong","",kr(value)));formula.append(item);});explanation.append(formula,opsButton("Se beregningsgrunnlaget ↗",()=>opsDetail("Fra innkjøp til vareforbruk",[["Lager ved periodestart",kr(m.opening)],["Mottatte innkjøp",kr(m.purchases)],["Lager ved periodeslutt",kr(m.closing)],["Vareforbruk",kr(m.total)],["Omsetning",kr(t.oms)]],"Lager inn + innkjøp − lager ut = vareforbruk. Alle beløp er på samme grunnlag eks. mva. Denne demoen inkluderer alle mottatte fakturaer, også de som står til kontroll. Ingen lageroverføringer er lagt inn."),"cost-text-button"));groups.append(explanation);
      const details=el("section","cost-details");const tabs=el("div","cost-tabs");tabs.setAttribute("role","group");tabs.setAttribute("aria-label","Innkjøp og kontroll");[["invoices","Fakturaer"],["suppliers","Leverandører"],["variance","Avvik"],["recipes","Kalkyler"]].forEach(([key,label])=>{const b=opsButton(label,()=>{costUI.tab=key;costView();document.querySelector('[data-cost-tab="'+key+'"]').focus({preventScroll:true});},"");b.dataset.costTab=key;b.setAttribute("aria-pressed",String(costUI.tab===key));tabs.append(b);});details.append(tabs);
      const content=el("div","cost-detail-content");details.append(content);
      const invoices=el("div");invoices.hidden=costUI.tab!=="invoices";
      const pending=m.invoices.filter(i=>i.review).length;const title=el("div","ops-panel-head");title.append(el("h2","",pending?pending+" fakturaer til kontroll":"Alt er kontrollert"),el("p","ops-muted","Mottatte bilag i valgt periode"));invoices.append(title);
      const filters=el("div","cost-invoice-filters");const supplier=el("select");supplier.setAttribute("aria-label","Filtrer fakturaer på leverandør");["Alle",...m.suppliers.map(s=>s.name)].forEach(name=>{const option=el("option","",name==="Alle"?"Alle leverandører":name);option.value=name;supplier.append(option);});supplier.value=costUI.supplier;supplier.addEventListener("change",()=>{costUI.supplier=supplier.value;costView();document.querySelector('.cost-invoice-filters select').focus();});const status=el("select");status.setAttribute("aria-label","Fakturastatus");["Alle","Til kontroll","Kontrollert"].forEach(name=>{const option=el("option","",name);option.value=name;status.append(option);});status.value=costUI.invoiceFilter;status.addEventListener("change",()=>{costUI.invoiceFilter=status.value;costView();document.querySelectorAll('.cost-invoice-filters select')[1].focus();});filters.append(supplier,status);invoices.append(filters);
      const filtered=m.invoices.filter(i=>(costUI.supplier==="Alle"||i.supplier===costUI.supplier)&&(costUI.invoiceFilter==="Alle"||(costUI.invoiceFilter==="Til kontroll"?i.review:!i.review)));
      const invoiceList=el("div","cost-invoice-list");filtered.forEach(invoice=>{const row=opsButton("",()=>showCostInvoice(invoice),"cost-invoice-row");const label=el("span");label.append(el("strong","",invoice.supplier),el("small","ops-muted",invoice.id+" · "+salesFormat.format(invoice.date)));const amount=el("span");amount.append(el("strong","",kr(invoice.amount)),el("small",invoice.review?"cost-pending":"cost-checked",invoice.review?"Til kontroll":"Kontrollert"));row.append(label,amount);invoiceList.append(row);});invoices.append(invoiceList);if(!filtered.length)invoices.append(el("p","cost-empty","Ingen fakturaer i dette utvalget."));content.append(invoices);
      const suppliers=el("div");suppliers.hidden=costUI.tab!=="suppliers";suppliers.append(el("h2","","Leverandørene dine"),el("p","ops-muted","Illustrerte leverandører · klikk for fakturaer"));
      m.suppliers.forEach((supplier,i)=>{const bills=m.invoices.filter(b=>b.supplier===supplier.name),total=bills.reduce((s,b)=>s+b.amount,0);const row=opsButton("",()=>{costUI.supplier=supplier.name;costUI.invoiceFilter="Alle";costUI.tab="invoices";costView();},"cost-supplier-row");const avatar=el("span","cost-supplier-mark",String(i+1).padStart(2,"0"));const name=el("span");name.append(el("strong","",supplier.name),el("small","ops-muted",supplier.kind+" · "+bills.length+" bilag"));row.append(avatar,name,el("strong","",kr(total)));suppliers.append(row);});content.append(suppliers);
      const variance=el("div");variance.hidden=costUI.tab!=="variance";variance.append(el("h2","","Hvor oppstår avviket?"),el("p","ops-muted","Faktisk forbruk mot teoretisk oppskriftsforbruk"));
      [["Teoretisk forbruk",m.theoretical],["Registrert svinn",m.waste],["Uforklart avvik",m.total-m.theoretical-m.waste],["Faktisk forbruk",m.total]].forEach(([label,value])=>{const row=el("div","cost-variance-row");row.append(el("span","",label),el("strong","",kr(value)));variance.append(row);});variance.append(el("p","ops-footnote","Uforklart avvik er ikke automatisk svinn. Sjekk varetelling, mengder og oppskrifter før du konkluderer."));
      const scenario=el("div","cost-scenario");const label=el("label","ops-slider-label","Prøv en reduksjon i prosentpoeng");label.htmlFor="cost-reduction";const input=el("input");input.id="cost-reduction";input.type="range";input.min="0";input.max="5";input.step="0.1";input.value=costUI.reduction;const output=el("output","ops-scenario-output");output.htmlFor=input.id;output.setAttribute("aria-live","polite");function update(){costUI.reduction=Number(input.value);output.textContent=kr(t.oms*costUI.reduction/100)+" mer igjen";}input.addEventListener("input",update);update();scenario.append(label,input,output,el("p","ops-footnote","Simulering ved uendret salg. Grunnlaget endres ikke."));variance.append(scenario);content.append(variance);
      const recipes=el("div");recipes.hidden=costUI.tab!=="recipes";recipes.append(el("h2","","Produktkalkyler"),el("p","ops-muted","Varekost per porsjon · oppskriftseksempler"));SALES_MENU.filter(r=>r.type==="Mat").sort((a,b)=>a.db-b.db).forEach(r=>{const row=opsButton("",()=>opsDetail(r.navn,[["Eksempelpris",kr(r.price)],["Råvarer per porsjon",kr(r.price*(100-r.db)/100)],["Dekningsbidrag",kr(r.price*r.db/100)],["Dekningsgrad",pst(r.db,0)]],"Oppskriftseksempel før lønn, svinn og faste kostnader. Pris og varekost bruker samme beregningsgrunnlag."),"cost-recipe-row");row.append(el("span","",r.navn),el("strong","",pst(100-r.db,0)));recipes.append(row);});content.append(recipes);
      grid.append(groups,details);root.append(grid,el("p","cost-model-note","Demomodell · beløp eks. mva. · fakturaer, leverandører og varetelling er illustrert"));
    }

    function staffData() {
      const monday=new Date(NÅ.getFullYear(),NÅ.getMonth(),NÅ.getDate()-dagIndeks(NÅ)+opsState.staffWeek*7);
      return DAGNAVN.map((name,i)=>{const date=new Date(monday);date.setDate(date.getDate()+i);const profiles=stederI(placeName.textContent).map(navn=>STED_PROFIL[navn]);const entries=profiles.map(p=>kveldsTall(p,i));return {name,date,guests:Math.round(entries.reduce((s,p)=>s+p.gjester,0)),staff:entries.reduce((s,p)=>s+p.vakt,0),revenue:Math.round(entries.reduce((s,p)=>s+p.oms,0)),booked:entries.reduce((s,p)=>s+p.booket,0)};});
    }
    function staffView() {
      const root=document.getElementById("ops-bemanning");root.replaceChildren();const days=staffData();const d=days[opsState.staffDay];const bar=el("div","ops-toolbar");const weeks=el("div","sales-segment");weeks.setAttribute("role","group");weeks.setAttribute("aria-label","Uke");["Denne uken","Neste uke"].forEach((name,i)=>{const b=opsButton(name,()=>{opsState.staffWeek=i;opsState.extra=0;staffView();document.querySelector('#ops-bemanning [data-week="'+i+'"]').focus({preventScroll:true});},"");b.dataset.week=String(i);b.setAttribute("aria-pressed",String(opsState.staffWeek===i));weeks.append(b);});
      bar.append(weeks,opsButton("✦ Oppsummert",()=>openOpsStory("bemanning"),"ops-button ops-summary"));root.append(bar);
      const grid=el("div","ops-staff-grid");const timeline=opsPanel("Riktig kapasitet, til riktig tid","Kveldsservering · estimerte gjester og planlagt kapasitet","ops-staff-timeline");
      const headline=el("div","ops-staff-headline");headline.append(el("strong","",nf.format(days.reduce((s,d)=>s+d.guests,0))),el("span","ops-muted","forventede kveldsgjester "+(opsState.staffWeek===0?"denne uken":"neste uke")));timeline.append(headline);
      const chart=el("div","ops-staff-chart");const max=Math.max(...days.map(d=>Math.max(d.guests,d.staff*18)))*1.12;
      days.forEach((day,i)=>{const b=opsButton("",()=>{opsState.staffDay=i;opsState.extra=0;staffView();document.querySelector('#ops-bemanning [data-day="'+i+'"]').focus({preventScroll:true});},"ops-day");b.dataset.day=String(i);b.setAttribute("aria-pressed",String(i===opsState.staffDay));b.setAttribute("aria-label",day.name+" "+salesFormat.format(day.date)+", "+day.guests+" gjester, "+day.staff+" ansatte");
        const well=el("span","ops-day-well");const fill=el("i","ops-day-bar");fill.style.height=day.guests/max*100+"%";const capacity=el("span","ops-capacity");capacity.style.bottom=day.staff*18/max*100+"%";well.append(fill,capacity,el("span","ops-day-value",nf.format(day.guests)));b.append(well,el("strong","",day.name),el("small","",salesFormat.format(day.date)));chart.append(b);});
      timeline.append(chart,el("p","ops-chart-legend","■ Forventede gjester     ━ Kapasitet ved 18 gjester per ansatt"));
      const chosen=opsPanel(stor(datoFormat.format(d.date)),"Kveld · 18–24","ops-staff-chosen");chosen.append(opsStat("Forventede gjester",nf.format(d.guests),"Modellanslag"),opsStat("På vakt",String(d.staff),"Planlagt i demoen"));
      const ratio=d.guests/d.staff;chosen.append(el("p","ops-status "+(ratio>18?"ops-warn":"ops-good"),nf.format(Number(ratio.toFixed(1)))+" gjester per ansatt"));chosen.append(el("p","ops-muted",ratio>18?"Over normalområdet på 15–18. Se hva én ekstra på vakt gjør.":"Kapasiteten dekker modellanslaget. Vurder også roller og erfaring."));
      const simulation=opsPanel("Prøv bemanningen","Et regneeksempel, ikke en vaktendring","ops-staff-simulation");const stepper=el("div","ops-stepper");const amount=el("output");amount.id="staff-extra";amount.setAttribute("aria-live","polite");const minus=opsButton("−",()=>change(-1));minus.setAttribute("aria-label","Én færre ekstra på vakt");const plus=opsButton("+",()=>change(1));plus.setAttribute("aria-label","Én ekstra på vakt");stepper.append(minus,amount,plus);const effect=el("div","ops-simulation-result");effect.setAttribute("aria-live","polite");
      function update(){amount.textContent="+"+opsState.extra+" på vakt";minus.disabled=opsState.extra===0;plus.disabled=opsState.extra===8;effect.replaceChildren();effect.append(opsStat("Gjester per ansatt",nf.format(Number((d.guests/(d.staff+opsState.extra)).toFixed(1))),"Med "+(d.staff+opsState.extra)+" ansatte"),opsStat("Ekstra lønn",kr(opsState.extra*6*320),"6 timer × kr 320 per time"));}
      function change(delta){opsState.extra=Math.max(0,Math.min(8,opsState.extra+delta));update();}update();simulation.append(stepper,effect,el("p","ops-footnote","Forutsetter lik vaktlengde og timekost. Ingen vaktplan lagres eller sendes."));grid.append(timeline,chosen,simulation);root.append(grid);
    }
    function resultView() {
      const root=document.getElementById("ops-resultat");root.replaceChildren();const t=tall(placeName.textContent,opsState.resultat);const sales=Math.round(t.oms),cost=Math.round(t.varekostKr),wages=Math.round(t.lonnKr),contribution=sales-cost-wages;const target=100-MÅL.varekost-MÅL.lonn;
      opsToolbar(root,"resultat",resultView,()=>opsDetail("Resultat · kort fortalt",[["Omsetning",kr(sales)],["Varekost og lønn",kr(cost+wages)],["Bidrag før faste kostnader",kr(contribution)],["Bidragsgrad",pst(t.bidragPst)]],"Dette er ikke nettoresultat. Husleie, strøm, avskrivninger, renter og skatt er ikke inkludert."));
      const hero=el("section","ops-result-hero");const main=el("div");main.append(el("span","ops-eyebrow","IGJEN ETTER VAREKOST OG LØNN"),el("strong","ops-result-number",kr(contribution)),el("p","ops-muted","Bidrag før faste kostnader · "+PERIODER[opsState.resultat].navn));
      const side=el("div","ops-result-side");side.append(el("strong","",pst(t.bidragPst)),el("span","ops-muted","av omsetningen"),el("small",t.bidragPst>=target?"ops-good":"ops-warn",pp(t.bidragPst-target)+" mot målet på "+pst(target,0)));hero.append(main,side);root.append(hero);
      const grid=el("div","ops-result-grid");const bridge=opsPanel("Fra salg til bidrag","Slik fordeles hver krone","ops-result-bridge");
      const waterfall=el("div","ops-waterfall");[["Omsetning",sales,0,"sales"],["Varekost",cost,sales-cost,"cost"],["Lønn",wages,contribution,"wages"],["Bidrag",contribution,0,"remaining"]].forEach(([label,value,bottom,key])=>{const b=opsButton("",()=>opsDetail(label,[["Beløp",kr(value)],["Andel av omsetning",pst(value/sales*100)]],key==="remaining"?"Bidraget skal også dekke faste kostnader. Det er ikke nettoresultat.":"Beregnet fra samme periodetall som oversikten."),"ops-waterfall-column");b.dataset.kind=key;const plot=el("span","ops-waterfall-plot");const block=el("i");block.style.height=value/sales*100+"%";block.style.bottom=bottom/sales*100+"%";plot.append(block);b.append(el("strong","",krKort(value)),plot,el("span","",label));waterfall.append(b);});bridge.append(waterfall,el("p","ops-footnote","Klikk på et ledd for å se beløp og andel. Faste kostnader er ikke med."));
      const comparison=opsPanel("Stedene, side om side","Bidragsgrad for samme periode","ops-location-results");const table=el("div","ops-place-results");const ranked=STEDSLISTE.map(name=>({name,t:tall(name,opsState.resultat)})).sort((a,b)=>b.t.bidragPst-a.t.bidragPst);
      ranked.forEach(({name,t:local})=>{const b=opsButton("",()=>velgSteder([name]),"ops-place-result");b.setAttribute("aria-label","Vis resultat for "+name);b.setAttribute("aria-pressed",String(VALGT.liste.includes(name)));const label=el("span");label.append(el("strong","",name.replace("Heim ","")),el("small","ops-muted",kr(local.bidragKr)+" i bidrag"));const meter=el("span","ops-location-meter");const fill=el("i");fill.style.width=local.bidragPst+"%";meter.append(fill);b.append(label,meter,el("strong","",pst(local.bidragPst)));table.append(b);});comparison.append(table,el("p","ops-footnote","Velg et sted for å bytte restaurant i hele arbeidsflaten."));grid.append(bridge,comparison);root.append(grid);
    }
    // Kostnader i Vanlig: de tre kostnadssidene samlet i hvert sitt kort.
    function kostnaderView() {
      const root=document.getElementById("ops-kostnader");root.replaceChildren();const t=tall(placeName.textContent,opsState.kostnader);
      opsToolbar(root,"kostnader",kostnaderView);
      const grid=el("div","kostnader-grid");
      [["Varekost",t.varekost,t.varekostKr,MÅL.varekost,"Start med de største varelinjene.","varekost","Se varekost ↗"],["Lønn",t.lonn,t.lonnKr,MÅL.lonn,"Se om vaktene passer gjestene.","bemanning","Se bemanning ↗"]].forEach(([navn,andel,beløp,mål,råd,view,lenke])=>{
        const kort=el("section","ops-panel kostnader-kort");
        kort.append(opsStat(navn,pst(andel),kr(beløp)+" av "+kr(t.oms)+" i salg"),el("p","ops-status "+(andel>mål?"ops-warn":"ops-good"),pp(andel-mål)+" mot målet på "+pst(mål,0)),el("p","ops-muted",andel>mål?råd:"Innenfor målet i perioden."),opsButton(lenke,()=>hubGo(view)));
        grid.append(kort);
      });
      const andre=el("section","ops-panel kostnader-kort");
      andre.append(opsStat("Andre kostnader","–","Husleie, strøm, forsikring og drift"),el("p","ops-status","Regnskapstall mangler"),el("p","ops-muted","Vises når regnskapet er koblet til."),opsButton("Se andre kostnader ↗",()=>hubGo("andre-kostnader")));
      grid.append(andre);
      const deler=[["Varekost",t.varekost,t.varekostKr],["Lønn",t.lonn,t.lonnKr],["Igjen",t.bidragPst,t.bidragKr]];
      const krone=opsPanel("Hver krone i salget","Varekost, lønn og det som er igjen før faste kostnader","kostnader-krone");
      const bar=el("div","kostnader-bar");
      deler.forEach(([navn,andel],i)=>{const del=el("span");del.dataset.del=String(i);del.style.width=andel+"%";del.title=navn+" "+pst(andel);bar.append(del);});
      const tegn=el("div","kostnader-legend");
      deler.forEach(([navn,andel,beløp],i)=>{const rad=el("div");rad.dataset.del=String(i);rad.append(el("span","ops-muted",navn),el("strong","",pst(andel)),el("small","ops-muted",kr(beløp)));tegn.append(rad);});
      krone.append(bar,tegn,opsButton("Se resultat ↗",()=>hubGo("resultat")));
      root.append(grid,krone,el("p","ops-footnote","Andel av omsetningen i valgt periode · demomodell · beløp eks. mva."));
    }
    function renderOperations(){costView();staffView();resultView();kostnaderView();}
    stedsLyttere.push(()=>{opsState.extra=0;renderOperations();});renderOperations();

    stedsLyttere.push(renderDash);
    renderDash();

    /* ---- Escape lukker det som er åpent --------------------------------- */

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (addDialog.open) return; // <dialog> lukker seg selv
      if (!userMenu.hidden) {
        closeUserMenu(true);
      } else if (!placeList.hidden) {
        closePlaceList(true);
      } else if (app.classList.contains("is-open")) {
        closeDrawer(true);
      } else if (storVisning) {
        settStor(false);
      }
    });

    // Faner er lokale arbeidskontekster: restaurant, visning og rapportvalg.
    const WORKSPACE_KEY="scope-workspace-tabs-v1";
    const workspaceBar=document.getElementById("workspace-tabs");
    const workspaceAdd=document.getElementById("workspace-add");
    let workspaceSwitching=false;
    let workspaceTabs=[],workspaceActive="";
    const newWorkspaceId=()=>"work-"+crypto.randomUUID();
    const activeView=()=>currentView||views.find(v=>!v.hidden)?.dataset.view||"oversikt";
    // Faner lagret før avhukingsmenyen har bare ett navn i «place».
    function faneSteder(tab){const s=tab&&tab.state;if(!s)return [];const liste=Array.isArray(s.steder)?s.steder:[s.place];return STEDSNAVN.filter(navn=>liste.includes(navn));}
    function captureWorkspace(){return {place:placeName.textContent,steder:VALGT.liste.slice(),view:activeView(),hub:{...hubState},periode,salesPeriod,salesMetric,category:document.getElementById("sales-category").value,query:document.getElementById("sales-search").value,detail:document.querySelector('[data-sales-detail][aria-pressed="true"]')?.dataset.salesDetail||"mix",ops:{...opsState},cost:{tab:costUI.tab,supplier:costUI.supplier,invoiceFilter:costUI.invoiceFilter,reduction:costUI.reduction},scroll:contentBody.scrollTop};}
    function saveWorkspace(){if(workspaceSwitching)return;const tab=workspaceTabs.find(t=>t.id===workspaceActive);if(tab)tab.state=captureWorkspace();store(WORKSPACE_KEY,JSON.stringify({active:workspaceActive,tabs:workspaceTabs}));}
    function workspaceLabel(tab){const name=tab.state.place.replace("Heim ","");const view=menuNames[tab.state.view]?.[navigationLanguage==="en"?1:0]||tab.state.view;return name+" · "+view;}
    function renderWorkspaceTabs(){
      workspaceBar.replaceChildren();
      workspaceTabs.forEach(tab=>{const cell=el("div","workspace-tab-shell");cell.dataset.active=String(tab.id===workspaceActive);const b=opsButton("",()=>activateWorkspace(tab.id),"workspace-tab");b.id=tab.id;b.setAttribute("role","tab");b.setAttribute("aria-selected",String(tab.id===workspaceActive));b.setAttribute("aria-controls","content-body");b.tabIndex=tab.id===workspaceActive?0:-1;b.title=workspaceLabel(tab);b.append(el("span","workspace-tab-place",tab.state.place.replace("Heim ","")),el("span","workspace-tab-view",menuNames[tab.state.view]?.[navigationLanguage==="en"?1:0]||tab.state.view));
        b.addEventListener("keydown",e=>{const i=workspaceTabs.findIndex(t=>t.id===tab.id);let next;if(e.key==="ArrowRight")next=(i+1)%workspaceTabs.length;if(e.key==="ArrowLeft")next=(i-1+workspaceTabs.length)%workspaceTabs.length;if(e.key==="Home")next=0;if(e.key==="End")next=workspaceTabs.length-1;if(next!==undefined){e.preventDefault();activateWorkspace(workspaceTabs[next].id,true);}if(e.key==="Delete"&&workspaceTabs.length>1){e.preventDefault();closeWorkspace(tab.id);}});
        cell.append(b);if(workspaceTabs.length>1){const close=opsButton("×",()=>closeWorkspace(tab.id),"workspace-tab-close");close.setAttribute("aria-label","Lukk fane: "+workspaceLabel(tab));cell.append(close);}workspaceBar.append(cell);
      });
      contentBody.setAttribute("role","tabpanel");contentBody.setAttribute("aria-labelledby",workspaceActive);
    }
    function activateWorkspace(id,focus=false){
      const tab=workspaceTabs.find(t=>t.id===id);if(!tab)return;saveWorkspace();workspaceSwitching=true;workspaceActive=id;const s=tab.state;
      periode=PERIODER[s.periode]?s.periode:"igår";salesPeriod=PERIODER[s.salesPeriod]?s.salesPeriod:"igår";salesMetric=[0,1,2].includes(s.salesMetric)?s.salesMetric:0;
      Object.assign(hubState,{filter:["alle","suggested","active","done"].includes(s.hub?.filter)?s.hub.filter:"alle",report:["day","week","month"].includes(s.hub?.report)?s.hub.report:"day",offset:Math.max(0,Math.min(1200,Math.floor(Number(s.hub?.offset)||0))),food:Math.max(0,Math.min(3,Number(s.hub?.food)||0)),wages:Math.max(0,Math.min(3,Number(s.hub?.wages)||0)),glance:GLANCE.some(([key])=>key===s.hub?.glance)?s.hub.glance:"igår"});
      Object.assign(opsState,{varekost:PERIODER[s.ops?.varekost]?s.ops.varekost:"igår",resultat:PERIODER[s.ops?.resultat]?s.ops.resultat:"uke",kostnader:PERIODER[s.ops?.kostnader]?s.ops.kostnader:"uke",staffWeek:s.ops?.staffWeek===1?1:0,staffDay:Math.max(0,Math.min(6,Number(s.ops?.staffDay)||0)),extra:0});
      Object.assign(costUI,{tab:["invoices","suppliers","variance","recipes"].includes(s.cost?.tab)?s.cost.tab:"invoices",supplier:typeof s.cost?.supplier==="string"?s.cost.supplier:"Alle",invoiceFilter:["Alle","Til kontroll","Kontrollert"].includes(s.cost?.invoiceFilter)?s.cost.invoiceFilter:"Alle",reduction:Math.max(0,Math.min(5,Number(s.cost?.reduction)||0))});
      const category=document.getElementById("sales-category");category.value=[...category.options].some(o=>o.value===s.category)?s.category:"Alle";document.getElementById("sales-search").value=typeof s.query==="string"?s.query:"";
      setSalesDetail(["mix","guests","products"].includes(s.detail)?s.detail:"mix");
      velgSteder(faneSteder(tab));
      opsState.extra=Math.max(0,Math.min(8,Number(s.ops?.extra)||0));staffView();
      showView(s.view, false);history.replaceState(null,"","#"+activeView());contentBody.scrollTop=Number(s.scroll)||0;
      workspaceSwitching=false;renderWorkspaceTabs();saveWorkspace();
      const button=document.getElementById(id);button.scrollIntoView({block:"nearest",inline:"nearest"});if(focus)button.focus({preventScroll:true});
    }
    function closeWorkspace(id){if(workspaceTabs.length===1)return;saveWorkspace();const index=workspaceTabs.findIndex(t=>t.id===id);if(index<0)return;const wasActive=id===workspaceActive;workspaceTabs.splice(index,1);if(wasActive){workspaceActive="";activateWorkspace(workspaceTabs[Math.min(index,workspaceTabs.length-1)].id,true);}else{renderWorkspaceTabs();saveWorkspace();document.getElementById(workspaceActive).focus();}}
    workspaceAdd.addEventListener("click",()=>{
      saveWorkspace();
      const tab={id:newWorkspaceId(),state:{...captureWorkspace(),scroll:0}};
      workspaceTabs.push(tab);activateWorkspace(tab.id,true);
    });
    try{const saved=JSON.parse(restore(WORKSPACE_KEY)||"null");if(saved&&Array.isArray(saved.tabs)){const seen=new Set();workspaceTabs=saved.tabs.filter(t=>t&&typeof t.id==="string"&&/^work-[a-z0-9-]+$/.test(t.id)&&!seen.has(t.id)&&seen.add(t.id)&&t.state&&faneSteder(t).length&&views.some(v=>v.dataset.view===t.state.view));workspaceActive=workspaceTabs.some(t=>t.id===saved.active)?saved.active:workspaceTabs[0]?.id||"";}}catch(error){workspaceTabs=[];}
    if(!workspaceTabs.length){const initial={id:newWorkspaceId(),state:captureWorkspace()};workspaceTabs=[initial];workspaceActive=initial.id;renderWorkspaceTabs();saveWorkspace();}else{const id=workspaceActive;workspaceActive="";activateWorkspace(id);}
    workspaceSync=()=>{if(!workspaceSwitching){saveWorkspace();renderWorkspaceTabs();}};
    // Les tilstanden etter at eksisterende kontroller har behandlet hendelsen.
    document.addEventListener("click",e=>{if(e.target.closest('.content-body,.header-language'))queueMicrotask(()=>{saveWorkspace();if(e.target.closest('.header-language'))renderWorkspaceTabs();});});
    contentBody.addEventListener("input",()=>queueMicrotask(saveWorkspace));contentBody.addEventListener("change",()=>queueMicrotask(saveWorkspace));window.addEventListener("pagehide",saveWorkspace);

    function assistantContextKey() {
      return JSON.stringify([workspaceActive, activeView(), VALGT.liste, periode, salesPeriod, opsState.varekost, opsState.resultat, app.dataset.theme]);
    }
    function assistantContext() {
      const view = activeView();
      const currentPeriod = view === 'oversikt' ? hubState.glance :view === 'salg' ? salesPeriod : view === 'varekost' || view === 'resultat' ? opsState[view] : periode;
      return {
        visibleData: ['oversikt', 'tiltak', 'effekt', 'rapporter', 'salg', 'varekost', 'bemanning', 'resultat'].includes(view) ? views.find(v => v.dataset.view === view).innerText.slice(0, 5000) : '',
        source: 'demo', places: STEDSNAVN.slice(), selected: VALGT.liste.slice(), view, period: currentPeriod,
        periodLabels: Object.fromEntries(Object.entries(PERIODER).map(([key, value]) => [key, value.navn])),
        facts: STEDSNAVN.flatMap(place => Object.keys(PERIODER).map(period => {
          const t = tall(place, period);
          return { place, period, oms: t.oms, gjester: t.gjester, snittbong: t.snittbong, varekostKr: t.varekostKr, lonnKr: t.lonnKr, bidragKr: t.bidragKr };
        })),
      };
    }
    function actionLabel(action) {
      return ({ navigate: 'Åpne ', place: 'Velg sted: ', period: 'Velg periode: ', theme: 'Velg tema: ', logout: 'Logg ut' })[action.type] + (action.type === 'period' ? PERIODER[action.value]?.navn : action.type === 'theme' ? ({ light: 'lyst', dark: 'mørkt' })[action.value] : action.value === 'all' ? 'Alle restauranter' : action.value);
    }
    async function executeAssistantActions(actions) {
      const engine = await assistantModule;
      const plan = engine.validateActions(actions, assistantContext());
      const { startScopePointer } = await import('./scope-pointer.js?v=1');
      const pointer = startScopePointer(document.activeElement);
      const done = [];
      const wasCollapsed = app.classList.contains('is-collapsed');
      const wasOpen = app.classList.contains('is-open');
      const workspace = workspaceActive;
      async function revealSidebar() {
        if (small.matches && !app.classList.contains('is-open')) await pointer.click(menuButton);
        else if (!small.matches && app.classList.contains('is-collapsed')) await pointer.click(toggleButton);
      }
      async function navigate(view) {
        await revealSidebar();
        if (view !== "oversikt" && overviewViews.includes(view)) {
          await pointer.click(document.querySelector('.rail-link[data-view="oversikt"]'));
          await pointer.click(document.querySelector('[data-overview-detail="'+view+'"]'));
        } else await pointer.click(viewLinks.find(link => link.dataset.view === view));
        if (activeView() !== view) throw new Error('Kunne ikke bekrefte at visningen ble åpnet.');
      }
      try {
        for (const [index, action] of plan.entries()) {
          if (workspaceActive !== workspace) throw new Error('Arbeidsfanen ble endret. Resten av handlingene er stoppet.');
          pointer.label('Scope · ' + (index + 1) + '/' + plan.length + ' · ' + actionLabel(action));
          if (action.type === 'navigate') await navigate(action.value);
          if (action.type === 'place') {
            await revealSidebar();
            if (placeList.hidden) await pointer.click(placeButton);
            const wanted = action.value === 'all' ? STEDSNAVN.slice() : [action.value];
            // Select the new place first: the UI never allows zero selected places.
            for (const name of wanted) if (!VALGT.liste.includes(name)) await pointer.click(places.find(p => p.dataset.place === name));
            for (const name of VALGT.liste.slice()) if (!wanted.includes(name)) await pointer.click(places.find(p => p.dataset.place === name));
            await pointer.click(placeButton);
            if (small.matches && app.classList.contains('is-open')) await pointer.click(toggleButton);
            if (VALGT.liste.length !== wanted.length || wanted.some(name => !VALGT.liste.includes(name))) throw new Error('Kunne ikke bekrefte stedsvalget.');
          }
          if (action.type === 'period') {
            if (!['salg', 'varekost', 'resultat'].includes(activeView())) await navigate('salg');
            const selectors = { oversikt: '[data-periode]', salg: '[data-sales-period]', varekost: '#ops-varekost [data-period]', resultat: '#ops-resultat [data-period]' };
            const target = [...document.querySelectorAll(selectors[activeView()])].find(b => (b.dataset.periode || b.dataset.salesPeriod || b.dataset.period) === action.value);
            await pointer.click(target);
            if (assistantContext().period !== action.value) throw new Error('Kunne ikke bekrefte perioden.');
          }
          if (action.type === 'theme') {
            if (app.dataset.theme !== action.value) await pointer.click(themeToggle);
            if (app.dataset.theme !== action.value) throw new Error('Kunne ikke bekrefte temaet.');
          }
          if (action.type === 'logout') {
            await revealSidebar();
            if (userMenu.hidden) await pointer.click(userButton);
            await pointer.click(logoutButton);
            return await logoutPromise;
          }
          done.push(actionLabel(action));
        }
        workspaceSync();
        return 'Utført: ' + done.join(' → ') + '.';
      } catch (error) {
        throw new Error(error.message + (done.length ? ' Fullført: ' + done.join(' → ') + '.' : ''));
      } finally {
        pointer.finish();
        if (!wasOpen && small.matches) closeDrawer(false);
        if (wasCollapsed && !small.matches) { app.classList.add('is-collapsed'); store(SIDEBAR_KEY, 'collapsed'); syncMenuLabels(); }
      }
    }

    syncMenuLabels();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
