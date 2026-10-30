const Superwen = (() => {
  const ui = {
    modal: null,
    authMode: "login",
    menu: false,
    hideBalance: false,
    error: "",
    picks: {},
    accountOpen: "history",
    calls: [],
    busy: false,
  };

  const MATCHES = [
    { id: "m1", league: "Addis Cup", when: "Today 18:00", home: "Addis United", away: "Hawassa Stars", odds: [2.1, 3.3, 3.15] },
    { id: "m2", league: "Rift League", when: "Today 20:30", home: "Dire Lions", away: "Mekelle City", odds: [1.85, 3.5, 4.1] },
    { id: "m3", league: "Friendly", when: "Tomorrow 16:00", home: "Gondar FC", away: "Jimma Coffee", odds: [2.45, 3.2, 2.7] },
    { id: "m4", league: "Superwen XI", when: "Tomorrow 19:00", home: "Blue Nile", away: "Lalibela Rock", odds: [2.7, 3.1, 2.5] },
  ];

  const GAMES = [
    { href: "#/crash", title: "Skyline Crash", copy: "Cash out before the curve drops", art: "crash" },
    { href: "#/slot/highland", title: "Highland Reels", copy: "5 reels · savanna symbols", art: "highland" },
    { href: "#/slot/market", title: "Night Market", copy: "5 reels · night symbols", art: "market" },
    { href: "#/fruit", title: "Fruit Ladder", copy: "3 reels · 5 lines · 1x to 5x", art: "fruit" },
    { href: "#/live", title: "Live tables", copy: "Play-money seats, no real dealer", art: "live" },
    { href: "#/sports", title: "Play Sports", copy: "Demo prices on fictional fixtures", art: "sports" },
  ];

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function money(value) {
    return (Math.round(Number(value) * 100) / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function clock() {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Addis_Ababa",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date());
    return `${formatted} · GMT+3`;
  }

  function route() {
    const raw = (location.hash || "#/home").replace(/^#\/?/, "");
    const [name, arg] = raw.split("/");
    const known = ["home", "casino", "crash", "slot", "fruit", "live", "wallet", "sports", "games", "popular", "info", "account"];
    if (!known.includes(name)) return { name: "home", arg: "" };
    return { name, arg: arg || "" };
  }

  function toast(message, kind) {
    const host = document.getElementById("toasts");
    if (!host) return;
    host.replaceChildren();
    const node = document.createElement("div");
    node.className = `toast${kind === "bad" ? " bad" : ""}`;
    node.textContent = message;
    host.appendChild(node);
    window.setTimeout(() => node.remove(), 2600);
  }

  function paintBalance() {
    const node = document.getElementById("balance-label");
    const player = Store.user();
    document.getElementById("register-btn")?.classList.toggle("hidden", Boolean(player));
    document.getElementById("login-btn")?.classList.toggle("hidden", Boolean(player));
    node?.classList.toggle("hidden", !player);
    if (!node || !player) return;
    node.textContent = ui.hideBalance ? "•••• ETB" : `${money(player.balance)} ETB`;
  }

  function gameCards(list) {
    return `<div class="grid">${list
      .map(
        (game) => `<a class="game-card" href="${game.href}">
          <div class="art ${game.art}"></div>
          <span class="kicker">Play money</span>
          <strong>${esc(game.title)}</strong>
          <span>${esc(game.copy)}</span>
        </a>`
      )
      .join("")}</div>`;
  }

  function homeView() {
    const bonus = Store.user() && Store.bonusAvailable();
    return `
      <section class="hero">
        <div>
          <p class="kicker">Crash · slots · demo sports</p>
          <h1>Cash out before it drops.</h1>
          <p>A play-money floor for crash, slots, and fixture prices. Nothing here pays real birr.</p>
        </div>
        <div class="rise" aria-hidden="true">
          <span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span>
          <span class="rocket"></span>
        </div>
      </section>
      <div class="actions">
        <button class="primary" type="button" data-action="deposit">Add play credits</button>
        <button class="ghost" type="button" data-action="withdraw">Withdraw demo</button>
      </div>
      <div class="cats">
        <a class="cat" href="#/casino"><span>Casino</span><strong>Slots</strong></a>
        <a class="cat" href="#/live"><span>Live</span><strong>Tables</strong></a>
        <a class="cat" href="#/sports"><span>Sports</span><strong>Fixtures</strong></a>
        <a class="cat" href="#/crash"><span>Crash</span><strong>Cash out</strong></a>
      </div>
      ${bonus ? `<button class="primary" type="button" data-action="bonus">Claim +50 daily play ETB</button>` : ""}
      <div class="section-title"><h2>Most played</h2><a href="#/popular">See all</a></div>
      ${gameCards(GAMES.slice(0, 3))}
    `;
  }

  function casinoView() {
    return `
      <div class="tabs"><a class="active" href="#/casino">All games</a><a href="#/popular">Popular</a></div>
      ${gameCards(GAMES)}
    `;
  }

  function gamesView() {
    return `
      <div class="section-title"><h2>Games</h2></div>
      <div class="cats">
        <a class="cat" href="#/crash"><span>Instant</span><strong>Crash</strong></a>
        <a class="cat" href="#/casino"><span>Reels</span><strong>Slots</strong></a>
        <a class="cat" href="#/sports"><span>Prices</span><strong>Sports</strong></a>
        <a class="cat" href="#/info"><span>Guide</span><strong>Info</strong></a>
      </div>
      ${gameCards(GAMES)}
    `;
  }

  function popularView() {
    return `<div class="section-title"><h2>Popular</h2></div>${gameCards(GAMES)}`;
  }

  function crashView() {
    return `
      <div class="section-title"><h2>Skyline Crash</h2><a href="#/info">How it works</a></div>
      <div id="crash-root"></div>
    `;
  }

  function fruitView() {
    return `<div id="fruit-root"></div>`;
  }

  function liveView() {
    const tables = [
      ["Green seat", "Fruit Ladder", "#/fruit"],
      ["Night seat", "Night Market", "#/slot/market"],
      ["Highland seat", "Highland Reels", "#/slot/highland"],
      ["Crash seat", "Skyline Crash", "#/crash"],
    ];
    return `
      <div class="section-title"><h2>Live tables</h2><span class="muted">Play money</span></div>
      <div class="grid">${tables
        .map(
          ([name, game, href]) => `<a class="game-card" href="${href}">
            <div class="art live"></div>
            <span class="kicker">${esc(game)}</span>
            <strong>${esc(name)}</strong>
            <span>Open the play-money game</span>
          </a>`
        )
        .join("")}</div>
    `;
  }

  function walletView() {
    const player = Store.user();
    return `
      <section class="panel">
        <h2>Deposit</h2>
        <p class="muted">Play credits stay in this browser. ${player ? `Balance ${money(player.balance)} ETB.` : "Sign in first."}</p>
        <div class="chips">${[50, 100, 250, 500, 1000].map((amount) => `<button type="button" data-action="add-credit" data-amount="${amount}">+${amount}</button>`).join("")}</div>
        <button class="ghost" type="button" data-action="withdraw">Withdraw demo</button>
      </section>
    `;
  }

  function slotView(arg) {
    return `<div id="slot-root" data-theme="${esc(arg || "highland")}"></div>`;
  }

  function sportsView() {
    return `
      <div class="section-title"><h2>Sports</h2><span class="muted">Fictional fixtures</span></div>
      <div class="sports-list">
        ${MATCHES.map((match) => {
          const labels = ["1", "X", "2"];
          return `<article class="match">
            <header><span>${esc(match.league)}</span><span>${esc(match.when)}</span></header>
            <strong>${esc(match.home)}</strong>
            <strong>${esc(match.away)}</strong>
            <div class="odds">
              ${match.odds
                .map((odd, index) => {
                  const active = ui.picks[match.id] === index ? " active" : "";
                  return `<button class="odd${active}" type="button" data-action="pick" data-match="${match.id}" data-outcome="${index}"><span>${labels[index]}</span><b>${odd.toFixed(2)}</b></button>`;
                })
                .join("")}
            </div>
            <button class="primary" type="button" data-action="sport-bet" data-match="${match.id}">Place 10 play ETB</button>
          </article>`;
        }).join("")}
      </div>
    `;
  }

  function infoView() {
    return `
      <div class="section-title"><h2>Information</h2></div>
      <div class="info-list">
        <article><h3>Play money only</h3><p>Balances live in this browser. Add credits and demo withdrawals never leave the page. There is no mobile-money payout.</p></article>
        <article><h3>Skyline Crash</h3><p>Each round hides a crash point. The multiplier climbs from 1.00x. Cash out to keep bet × multiplier. If the curve crashes first, the stake is gone. Auto cash out fires at the multiplier you type.</p></article>
        <article><h3>Slots</h3><p>Highland Reels and Night Market use five reels. Fruit Ladder uses three reels, five lines, and a 1x–5x ladder. Stop only shortens the animation.</p></article>
        <article><h3>Live tables</h3><p>The live lobby is a play-money seat list. It does not connect to a real studio or dealer.</p></article>
        <article><h3>Sports prices</h3><p>Teams are fictional. A placed demo bet settles immediately. The draw uses the shown prices as relative chances.</p></article>
        <article><h3>Account</h3><p>Register with a 9-digit mobile number starting with 9. New players receive 500 play ETB. A daily +50 play bonus can be claimed once per Addis Ababa day.</p></article>
      </div>
    `;
  }

  function accountView() {
    const player = Store.user();
    if (!player) {
      return `<section class="panel"><h2>Account</h2><p class="muted">Sign in to see your player ID, play balance, and history.</p><button class="primary" type="button" data-action="auth" data-mode="login">Login</button></section>`;
    }
    const history = player.history.length
      ? `<ul class="history-list">${player.history
          .slice(0, 12)
          .map((item) => {
            const when = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Addis_Ababa", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", hourCycle: "h23" }).format(item.at);
            const sign = item.amount > 0 ? "+" : "";
            return `<li><span>${esc(item.game)}<br><small class="muted">${esc(item.result)} · ${when}</small></span><b>${sign}${money(item.amount)}</b></li>`;
          })
          .join("")}</ul>`
      : `<p class="muted">No rounds yet.</p>`;
    return `
      <section class="panel">
        <div class="stat"><span>+251 ${esc(player.phone)}</span></div>
        <div class="stat"><span>Player ID</span><button class="ghost" type="button" data-action="copy-id">${esc(player.playerId)}</button></div>
        <div class="stat"><span>Balance</span><strong id="account-balance">${ui.hideBalance ? "••••" : money(player.balance)} <small>ETB</small></strong><button class="eye" type="button" data-action="toggle-balance">${ui.hideBalance ? "Show" : "Hide"}</button></div>
        <div class="actions">
          <button class="primary" type="button" data-action="deposit">Add credits</button>
          <button class="ghost" type="button" data-action="withdraw">Withdraw demo</button>
        </div>
      </section>
      <div class="menu-list account-list">
        ${[
          ["history", "Game history"],
          ["offers", "Offers"],
          ["call", "Request a call"],
          ["messages", "Messages"],
          ["security", "Security"],
        ]
          .map(
            ([tab, label]) =>
              `<button type="button" data-action="account-tab" data-tab="${tab}">${label}<span>${ui.accountOpen === tab ? "−" : "+"}</span></button>`
          )
          .join("")}
      </div>
      ${ui.accountOpen === "history" ? history : ""}
      ${ui.accountOpen === "offers" ? `<section class="panel"><h3>Daily play bonus</h3><p class="muted">${Store.bonusAvailable() ? "50 play ETB is waiting." : "Already claimed for today in Addis Ababa."}</p>${Store.bonusAvailable() ? `<button class="primary" type="button" data-action="bonus">Claim 50</button>` : ""}</section>` : ""}
      ${ui.accountOpen === "messages" ? `<section class="panel"><h3>Messages</h3><p>Welcome to Superwen. This inbox is local. No SMS is sent.</p><p class="muted">Your play balance started at 500 ETB.</p></section>` : ""}
      ${ui.accountOpen === "call" ? `<form class="panel" data-call><h3>Request a call</h3><p class="muted">Saved on this device only. Nobody is dialed.</p><label>Note<input name="note" placeholder="When should we pretend to call?" required /></label><p class="error" data-form-error></p><button class="primary" type="submit">Save request</button>${ui.calls.map((note) => `<p class="muted">Saved: ${esc(note)}</p>`).join("")}</form>` : ""}
      ${ui.accountOpen === "security" ? `<form class="panel" data-password><label>Current password<input name="current" type="password" required /></label><label>New password<input name="next" type="password" minlength="6" required /></label><p class="error" data-form-error></p><button class="primary" type="submit">Update password</button><button class="ghost" type="button" data-action="logout">Log out</button></form>` : ""}
    `;
  }

  const views = {
    home: homeView,
    casino: casinoView,
    games: gamesView,
    popular: popularView,
    crash: crashView,
    fruit: fruitView,
    live: liveView,
    wallet: walletView,
    slot: () => slotView(route().arg),
    sports: sportsView,
    info: infoView,
    account: accountView,
  };

  function shell() {
    return `
      <div class="shell">
        <header class="topbar">
          <button class="icon-btn" type="button" data-action="menu" aria-label="Open menu">☰</button>
          <a class="brand" href="#/home"><span class="mark">S</span> Superwen</a>
          <div class="top-actions">
            <button class="primary tiny" type="button" id="register-btn" data-action="auth" data-mode="register">Register</button>
            <button class="ghost tiny" type="button" id="login-btn" data-action="auth" data-mode="login">Login</button>
            <button class="balance-pill hidden" type="button" id="balance-label" data-action="balance">0.00 ETB</button>
            <button class="account-btn" type="button" data-action="account" aria-label="Account">☺</button>
          </div>
        </header>
        <p class="clock" id="clock"></p>
        <div class="banner"><span>Play money only · Lacag ciyaar ah</span><span>No real payout</span></div>
        <main class="view" id="view"></main>
      </div>
      <nav class="tabbar">
        <a href="#/home" data-nav="home">Home</a>
        <a href="#/sports" data-nav="sports">Sports</a>
        <a href="#/wallet" data-nav="wallet">Deposit</a>
        <a href="#/casino" data-nav="casino">Games</a>
        <a href="#/popular" data-nav="popular">Popular</a>
      </nav>
      <div id="menu-root"></div>
      <div id="modal-root"></div>
      <div id="toasts"></div>
    `;
  }

  function paintMenu() {
    const host = document.getElementById("menu-root");
    if (!host) return;
    if (!ui.menu) {
      host.innerHTML = "";
      return;
    }
    const links = [
      ["#/home", "Home"],
      ["#/casino", "Casino slots"],
      ["#/fruit", "Fruit Ladder"],
      ["#/live", "Live tables"],
      ["#/crash", "Crash"],
      ["#/wallet", "Deposit"],
      ["#/sports", "Sports"],
      ["#/games", "Games"],
      ["#/popular", "Popular"],
      ["#/info", "Information"],
      ["#/account", "Account"],
    ];
    host.innerHTML = `<div class="drawer-back" data-action="close-menu"><aside class="drawer" data-stop>
      <div class="brand"><span class="mark">S</span> Superwen</div>
      <div class="menu-list">${links.map(([href, label]) => `<a class="link-row" href="${href}">${label}</a>`).join("")}</div>
      <button class="primary" type="button" data-action="auth" data-mode="register">Register</button>
      <button class="ghost" type="button" data-action="auth" data-mode="login">Login</button>
    </aside></div>`;
  }

  function authFields() {
    if (ui.authMode === "register") {
      return `
        <h2>Create a play account</h2>
        <label>Mobile number<span class="phone"><input value="+251" disabled /><input name="phone" inputmode="numeric" placeholder="9xxxxxxxx" required /></span></label>
        <label>Currency<select disabled><option>Play ETB</option></select></label>
        <label>Password<input name="password" type="password" minlength="6" required /></label>
        <label>Confirm password<input name="confirm" type="password" minlength="6" required /></label>
        <p class="muted">New accounts start with 500 play ETB.</p>
      `;
    }
    return `
      <h2>Welcome back</h2>
      <label>Mobile number<span class="phone"><input value="+251" disabled /><input name="phone" inputmode="numeric" placeholder="9xxxxxxxx" required /></span></label>
      <label>Password<input name="password" type="password" required /></label>
    `;
  }

  function paintModal() {
    const host = document.getElementById("modal-root");
    if (!host) return;
    if (!ui.modal) {
      host.innerHTML = "";
      return;
    }
    let body = "";
    let title = "";
    if (ui.modal === "auth") {
      title = ui.authMode === "register" ? "Register" : "Login";
      body = `<form data-auth>${authFields()}<p class="error">${esc(ui.error)}</p><button class="primary" type="submit">${title}</button>
        <button class="ghost" type="button" data-action="switch-auth">${ui.authMode === "register" ? "I already have an account" : "Create an account"}</button></form>`;
    } else if (ui.modal === "deposit") {
      title = "Add play credits";
      body = `<p class="muted">These credits exist only in this browser.</p>
        <div class="chips">${[50, 100, 250, 500, 1000].map((amount) => `<button type="button" data-action="add-credit" data-amount="${amount}">+${amount}</button>`).join("")}</div>`;
    } else if (ui.modal === "withdraw") {
      title = "Demo withdrawal";
      body = `<form data-withdraw><p class="muted">This records a request and removes play credits. No birr is sent to a phone or bank.</p>
        <label>Amount<input name="amount" type="number" min="10" step="1" value="50" /></label>
        <p class="error">${esc(ui.error)}</p>
        <button class="primary" type="submit">Record demo withdrawal</button></form>`;
    }
    host.innerHTML = `<div class="modal-back" data-action="close-modal"><section class="modal-card" data-stop>
      <div class="section-title"><h2>${title}</h2><button class="icon-btn" type="button" data-action="close-modal" aria-label="Close">×</button></div>
      ${body}
    </section></div>`;
  }

  function show() {
    Crash.unmount();
    Slots.unmount();
    Fruit.unmount();
    const current = route();
    document.getElementById("view").innerHTML = (views[current.name] || homeView)();
    document.getElementById("clock").textContent = clock();
    document.querySelectorAll("[data-nav]").forEach((link) => {
      const games = ["casino", "slot", "fruit", "live", "crash", "games"];
    link.classList.toggle("active", link.dataset.nav === current.name || (games.includes(current.name) && link.dataset.nav === "casino"));
    });
    paintBalance();
    paintMenu();
    paintModal();
    if (current.name === "crash") Crash.mount(document.getElementById("crash-root"));
    if (current.name === "slot") Slots.mount(document.getElementById("slot-root"), current.arg || "highland");
    if (current.name === "fruit") Fruit.mount(document.getElementById("fruit-root"));
  }

  function requireUser() {
    if (Store.user()) return true;
    ui.modal = "auth";
    ui.authMode = "login";
    ui.error = "Sign in to use the play wallet.";
    paintModal();
    return false;
  }

  function phoneValue(form) {
    return String(new FormData(form).get("phone") || "").replace(/\D/g, "");
  }

  async function onAuth(form) {
    const phone = phoneValue(form);
    const password = String(new FormData(form).get("password") || "");
    if (!/^9\d{8}$/.test(phone)) {
      ui.error = "Use a 9-digit number starting with 9.";
      paintModal();
      return;
    }
    try {
      ui.busy = true;
      if (ui.authMode === "register") {
        const confirm = String(new FormData(form).get("confirm") || "");
        if (password.length < 6) throw new Error("Use at least 6 characters.");
        if (password !== confirm) throw new Error("Passwords do not match.");
        await Store.register({ phone, password });
        toast("Account ready with 500 play ETB");
      } else {
        await Store.login(phone, password);
        toast("Signed in");
      }
      ui.modal = null;
      ui.error = "";
      show();
    } catch (error) {
      ui.error = error.message;
      paintModal();
    } finally {
      ui.busy = false;
    }
  }

  async function onPassword(form) {
    const data = new FormData(form);
    const error = form.querySelector("[data-form-error]");
    try {
      await Store.changePassword(String(data.get("current") || ""), String(data.get("next") || ""));
      toast("Password updated");
      form.reset();
      if (error) error.textContent = "";
    } catch (err) {
      if (error) error.textContent = err.message;
    }
  }

  function onWithdraw(form) {
    const player = Store.user();
    if (!player) return;
    const amount = Number(new FormData(form).get("amount"));
    if (!Number.isFinite(amount) || amount < 10) {
      ui.error = "Enter at least 10 play ETB.";
      paintModal();
      return;
    }
    if (player.balance < amount) {
      ui.error = "Not enough play credits.";
      paintModal();
      return;
    }
    Store.adjust(-amount, { game: "Wallet", result: "Demo withdrawal — no payout sent", amount: -amount });
    ui.modal = null;
    ui.error = "";
    toast("Demo withdrawal recorded");
    show();
  }

  function settleSport(match) {
    const outcome = ui.picks[match.id];
    if (outcome == null) {
      toast("Choose 1, X, or 2 first.", "bad");
      return;
    }
    if (!requireUser()) return;
    const stake = 10;
    const player = Store.user();
    if (player.balance < stake) {
      toast("Not enough play credits.", "bad");
      return;
    }
    const weights = match.odds.map((odd) => 1 / odd);
    const total = weights.reduce((sum, value) => sum + value, 0);
    let roll = Math.random() * total;
    let result = match.odds.length - 1;
    for (let index = 0; index < weights.length; index += 1) {
      roll -= weights[index];
      if (roll <= 0) {
        result = index;
        break;
      }
    }
    Store.adjust(-stake);
    const labels = ["home", "draw", "away"];
    if (result === outcome) {
      const payout = stake * match.odds[outcome];
      Store.adjust(payout, {
        game: "Sports",
        result: `${match.home} vs ${match.away} · ${labels[result]}`,
        amount: payout - stake,
      });
      toast(`Won ${money(payout)} play ETB`);
    } else {
      Store.adjust(0, {
        game: "Sports",
        result: `${match.home} vs ${match.away} · ${labels[result]}`,
        amount: -stake,
      });
      toast("Demo bet lost", "bad");
    }
    paintBalance();
  }

  function onClick(event) {
    const actionNode = event.target.closest("[data-action]");
    if (!actionNode) return;
    const stopper = event.target.closest("[data-stop]");
    if (stopper && !stopper.contains(actionNode)) {
      if (event.target.closest("a[href]")) ui.menu = false;
      else return;
    }
    const action = actionNode.dataset.action;
    if (action === "menu") ui.menu = true;
    else if (action === "close-menu") ui.menu = false;
    else if (action === "close-modal") {
      ui.modal = null;
      ui.error = "";
    } else if (action === "auth") {
      ui.menu = false;
      ui.modal = "auth";
      ui.authMode = actionNode.dataset.mode || "login";
      ui.error = "";
    } else if (action === "switch-auth") {
      ui.authMode = ui.authMode === "login" ? "register" : "login";
      ui.error = "";
    } else if (action === "account" || action === "balance") {
      if (!Store.user()) {
        ui.modal = "auth";
        ui.authMode = "login";
      } else if (route().name !== "account") {
        location.hash = "#/account";
        return;
      }
    } else if (action === "deposit" || action === "withdraw") {
      if (!requireUser()) return;
      ui.modal = action === "deposit" ? "deposit" : "withdraw";
      ui.error = "";
    } else if (action === "add-credit") {
      if (!requireUser()) return;
      const amount = Number(actionNode.dataset.amount);
      Store.adjust(amount, { game: "Wallet", result: "Play credits added" });
      ui.modal = null;
      toast(`Added ${money(amount)} play ETB`);
      show();
      return;
    } else if (action === "bonus") {
      try {
        Store.claimDaily();
        toast("Daily 50 play ETB added");
        show();
      } catch (error) {
        toast(error.message, "bad");
      }
      return;
    } else if (action === "logout") {
      Store.logout();
      toast("Signed out");
      show();
      return;
    } else if (action === "toggle-balance") {
      ui.hideBalance = !ui.hideBalance;
      show();
      return;
    } else if (action === "copy-id") {
      const player = Store.user();
      if (!player) return;
      navigator.clipboard?.writeText(player.playerId).then(
        () => toast("Player ID copied"),
        () => toast(player.playerId)
      );
      return;
    } else if (action === "account-tab") {
      event.preventDefault();
      ui.accountOpen = actionNode.dataset.tab;
      show();
      return;
    } else if (action === "pick") {
      ui.picks[actionNode.dataset.match] = Number(actionNode.dataset.outcome);
      show();
      return;
    } else if (action === "sport-bet") {
      const match = MATCHES.find((item) => item.id === actionNode.dataset.match);
      if (match) settleSport(match);
      return;
    }
    if (["menu", "close-menu", "close-modal", "auth", "switch-auth", "account", "balance", "deposit", "withdraw"].includes(action)) {
      paintMenu();
      paintModal();
      if (action === "close-menu") {
        const link = event.target.closest("a");
        if (!link) event.preventDefault();
      }
    }
  }

  function onSubmit(event) {
    const form = event.target;
    if (form.matches("[data-auth]")) {
      event.preventDefault();
      onAuth(form);
    } else if (form.matches("[data-withdraw]")) {
      event.preventDefault();
      onWithdraw(form);
    } else if (form.matches("[data-password]")) {
      event.preventDefault();
      onPassword(form);
    } else if (form.matches("[data-call]")) {
      event.preventDefault();
      const note = String(new FormData(form).get("note") || "").trim();
      if (!note) return;
      ui.calls.unshift(note);
      toast("Call request saved on this device");
      show();
    }
  }

  function boot() {
    document.getElementById("app").innerHTML = shell();
    document.body.addEventListener("click", onClick);
    document.body.addEventListener("submit", onSubmit);
    window.addEventListener("hashchange", show);
    if (!location.hash) location.hash = "#/home";
    else show();
  }

  return { boot, toast, paintBalance, openAuth: (mode) => { ui.modal = "auth"; ui.authMode = mode; ui.error = ""; paintModal(); } };
})();

Superwen.boot();
