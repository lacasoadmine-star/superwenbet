/* Skyline Crash: multiplier climbs until a predetermined point, then drops. */
const Crash = (() => {
  const HOUSE = 0.96;
  let root = null;
  let raf = 0;
  let timer = 0;
  let phase = "betting";
  let crashAt = 1.5;
  let flyStarted = 0;
  let betEnds = 0;
  let multiplier = 1;
  let bet = null;
  let history = [];
  let table = [];
  let canvas = null;
  let ctx = null;
  let viewW = 0;
  let viewH = 0;

  function rollCrash() {
    const r = Math.random();
    if (r < 0.04) return 1;
    const raw = HOUSE / (1 - r);
    return Math.max(1.01, Math.floor(raw * 100) / 100);
  }

  function multiplierAt(elapsed) {
    return Math.exp(elapsed * 0.22);
  }

  function money(value) {
    return (Math.round(value * 100) / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function paintChrome() {
    if (typeof Superwen !== "undefined" && Superwen.paintBalance) Superwen.paintBalance();
  }

  function fit() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    viewW = rect.width;
    viewH = rect.height;
  }

  function draw() {
    if (!ctx) return;
    const w = viewW;
    const h = viewH;
    ctx.clearRect(0, 0, w, h);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, phase === "crashed" ? "#2a1020" : "#10182b");
    sky.addColorStop(1, "#070b14");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, (h / 5) * i);
      ctx.lineTo(w, (h / 5) * i);
      ctx.stroke();
    }

    const elapsed = phase === "betting" ? 0 : (performance.now() - flyStarted) / 1000;
    const shown = phase === "betting" ? 1 : multiplier;
    const span = Math.max(elapsed, 1.2);
    const maxM = Math.max(shown * 1.25, crashAt, 2);
    const points = [];
    const steps = 80;
    const drawElapsed = phase === "betting" ? 0 : elapsed;
    for (let i = 0; i <= steps; i += 1) {
      const t = (drawElapsed * i) / steps;
      const m = multiplierAt(t);
      const x = (t / span) * (w - 28) + 12;
      const y = h - 18 - (Math.log(m) / Math.log(maxM)) * (h - 36);
      points.push({ x, y });
    }
    if (points.length > 1 && phase !== "betting") {
      ctx.beginPath();
      ctx.moveTo(points[0].x, h - 16);
      points.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.lineTo(points[points.length - 1].x, h - 16);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, 0, 0, h);
      fill.addColorStop(0, phase === "crashed" ? "rgba(255,77,109,0.35)" : "rgba(61,255,154,0.28)");
      fill.addColorStop(1, "rgba(61,255,154,0)");
      ctx.fillStyle = fill;
      ctx.fill();

      ctx.beginPath();
      points.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
      ctx.strokeStyle = phase === "crashed" ? "#ff4d6d" : "#3dff9a";
      ctx.lineWidth = 3;
      ctx.stroke();

      const head = points[points.length - 1];
      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.fillStyle = phase === "crashed" ? "#ff4d6d" : "#f4f7ff";
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, 6);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, -6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function renderTable() {
    const list = root.querySelector("[data-table]");
    if (!list) return;
    list.innerHTML = table
      .map((row) => {
        let state = "In round";
        if (row.cashed) state = `Cashed ${row.cashed.toFixed(2)}x`;
        else if (phase === "crashed") state = "Lost";
        return `<li><span>${row.name}</span><b>${money(row.amount)}</b><em>${state}</em></li>`;
      })
      .join("");
  }

  function renderHistory() {
    const row = root.querySelector("[data-history]");
    if (!row) return;
    row.innerHTML = history
      .map((value) => `<span class="${value < 2 ? "low" : "high"}">${value.toFixed(2)}x</span>`)
      .join("");
  }

  function paintStatus() {
    const multi = root.querySelector("[data-multi]");
    const label = root.querySelector("[data-phase]");
    const action = root.querySelector("[data-crash-action]");
    if (!multi || !label || !action) return;
    multi.textContent = `${multiplier.toFixed(2)}x`;
    multi.classList.toggle("crashed", phase === "crashed" && !(bet && bet.cashed));
    if (phase === "betting") {
      const left = Math.max(0, Math.ceil((betEnds - performance.now()) / 1000));
      label.textContent = bet ? `Bet placed · next climb in ${left}s` : `Place a bet · ${left}s`;
      action.textContent = bet ? "Bet locked" : "Place bet";
      action.disabled = Boolean(bet);
      action.classList.remove("cashout");
    } else if (phase === "flying") {
      if (bet && !bet.cashed) {
        label.textContent = "Climbing — cash out before it drops";
        action.textContent = `Cash out ${money(bet.amount * multiplier)}`;
        action.disabled = false;
        action.classList.add("cashout");
      } else if (bet && bet.cashed) {
        label.textContent = `You cashed out at ${bet.cashed.toFixed(2)}x`;
        action.textContent = "Cashed out";
        action.disabled = true;
        action.classList.remove("cashout");
      } else {
        label.textContent = "Round in progress";
        action.textContent = "Wait for next round";
        action.disabled = true;
        action.classList.remove("cashout");
      }
    } else if (bet && bet.cashed) {
      label.textContent = `You cashed out at ${bet.cashed.toFixed(2)}x · curve crashed at ${crashAt.toFixed(2)}x`;
      action.textContent = "Cashed out";
      action.disabled = true;
      action.classList.remove("cashout");
    } else {
      label.textContent = bet ? "Too late — the round crashed" : "Round crashed";
      action.textContent = `Crashed ${crashAt.toFixed(2)}x`;
      action.disabled = true;
      action.classList.remove("cashout");
    }
    renderTable();
  }

  function closeBet(kind) {
    if (!bet || bet.settled) return;
    bet.settled = true;
    if (kind === "cash") return;
    Store.adjust(0, {
      game: "Skyline Crash",
      result: kind === "crash" ? `Crashed at ${crashAt.toFixed(2)}x` : "Left the round",
      amount: -bet.amount,
    });
  }

  function finishRound() {
    phase = "crashed";
    multiplier = crashAt;
    table.forEach((row) => {
      if (!row.cashed && Math.random() < 0.45) {
        row.cashed = Math.max(1.01, crashAt * (0.45 + Math.random() * 0.4));
      }
    });
    if (bet && !bet.cashed) closeBet("crash");
    history.unshift(crashAt);
    history = history.slice(0, 12);
    paintStatus();
    renderHistory();
    draw();
    timer = window.setTimeout(startBetting, 2400);
  }

  function frame(now) {
    if (phase !== "flying") return;
    const elapsed = (now - flyStarted) / 1000;
    multiplier = multiplierAt(elapsed);
    const auto = Number(root.querySelector("[data-auto]")?.value);
    if (bet && !bet.cashed && auto > 1 && multiplier >= auto) cashOut();
    table.forEach((row) => {
      if (!row.cashed && multiplier >= row.target) row.cashed = row.target;
    });
    if (multiplier >= crashAt) {
      multiplier = crashAt;
      paintStatus();
      draw();
      finishRound();
      return;
    }
    paintStatus();
    draw();
    raf = requestAnimationFrame(frame);
  }

  function startFlying() {
    phase = "flying";
    crashAt = rollCrash();
    multiplier = 1;
    flyStarted = performance.now();
    table = ["Nina", "Abel", "Sara", "Yonas", "Hana"].slice(0, 4).map((name) => ({
      name,
      amount: [10, 20, 25, 50, 100][Math.floor(Math.random() * 5)],
      target: Math.max(1.2, Math.round((1.1 + Math.random() * 3) * 100) / 100),
      cashed: null,
    }));
    paintStatus();
    raf = requestAnimationFrame(frame);
  }

  function startBetting() {
    phase = "betting";
    multiplier = 1;
    bet = null;
    betEnds = performance.now() + 6000;
    paintStatus();
    renderHistory();
    draw();
    timer = window.setTimeout(startFlying, 6000);
  }

  function placeBet() {
    if (phase !== "betting" || bet) return;
    const player = Store.user();
    if (!player) {
      Superwen.openAuth("login");
      Superwen.toast("Sign in to play with your demo balance.");
      return;
    }
    const amount = Number(root.querySelector("[data-stake]").value);
    if (!Number.isFinite(amount) || amount < 1) {
      Superwen.toast("Enter a bet of at least 1 play ETB.", "bad");
      return;
    }
    if (player.balance < amount) {
      Superwen.toast("Not enough play credits.", "bad");
      return;
    }
    Store.adjust(-amount);
    bet = { amount, cashed: null, settled: false };
    paintChrome();
    paintStatus();
    Superwen.toast(`Bet locked: ${money(amount)} play ETB`);
  }

  function cashOut() {
    if (phase !== "flying" || !bet || bet.cashed || bet.settled) return;
    const at = Math.max(1.01, Math.floor(multiplier * 100) / 100);
    bet.cashed = at;
    bet.settled = true;
    const payout = bet.amount * at;
    bet.settled = true;
    Store.adjust(payout, {
      game: "Skyline Crash",
      result: `Cashed out at ${at.toFixed(2)}x`,
      amount: payout - bet.amount,
    });
    paintChrome();
    paintStatus();
    Superwen.toast(`Cashed out ${money(payout)} play ETB`);
  }

  function onClick(event) {
    const button = event.target.closest("[data-crash-action]");
    if (!button) {
      const chip = event.target.closest("[data-chip]");
      if (!chip || !root) return;
      root.querySelector("[data-stake]").value = chip.dataset.chip;
      return;
    }
    event.preventDefault();
    if (phase === "betting") placeBet();
    else if (phase === "flying") cashOut();
  }

  return {
    mount(node) {
      this.unmount();
      root = node;
      root.innerHTML = `
        <div class="history" data-history></div>
        <div class="stage">
          <canvas data-canvas></canvas>
          <div class="multi" data-multi>1.00x</div>
          <p class="phase" data-phase>Place a bet</p>
        </div>
        <div class="bet-row">
          <label>Bet<input data-stake type="number" min="1" step="1" value="10" /></label>
          <label>Auto cash out<input data-auto type="number" min="1.1" step="0.1" placeholder="2.00" /></label>
        </div>
        <div class="chips">
          ${[10, 20, 50, 100, 200].map((value) => `<button type="button" data-chip="${value}">${value}</button>`).join("")}
        </div>
        <button class="primary big" type="button" data-crash-action>Place bet</button>
        <p class="hint">The cash-out button pays your bet times the live multiplier. If the curve crashes first, the bet is lost. Demo players on the list are not real.</p>
        <ul class="table" data-table></ul>
      `;
      canvas = root.querySelector("[data-canvas]");
      root.addEventListener("click", onClick);
      window.addEventListener("resize", fit);
      fit();
      startBetting();
    },
    unmount() {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      raf = 0;
      timer = 0;
      if (root) {
        root.removeEventListener("click", onClick);
        window.removeEventListener("resize", fit);
      }
      closeBet("leave");
      root = null;
      canvas = null;
      ctx = null;
      bet = null;
      phase = "betting";
    },
  };
})();
