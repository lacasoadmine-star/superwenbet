/* Three-reel fruit slot with a 1x–5x ladder. Original symbols, play credits only. */
const Fruit = (() => {
  const SYMBOLS = [
    { id: "seven", mark: "7", pay: 8, weight: 2, tone: "#ff5d7a" },
    { id: "bell", mark: "🔔", pay: 5, weight: 3, tone: "#f5c16c" },
    { id: "melon", mark: "🍉", pay: 4, weight: 4, tone: "#3dd68c" },
    { id: "grape", mark: "🍇", pay: 3, weight: 5, tone: "#b388ff" },
    { id: "orange", mark: "🍊", pay: 2.5, weight: 6, tone: "#ff9f43" },
    { id: "plum", mark: "🫐", pay: 2.5, weight: 6, tone: "#7c6bff" },
    { id: "cherry", mark: "🍒", pay: 2, weight: 7, tone: "#ff6b81" },
    { id: "lemon", mark: "🍋", pay: 2, weight: 7, tone: "#ffe66d" },
  ];
  const LADDER = [1, 2, 3, 4, 5];
  const LADDER_WEIGHT = [8, 6, 4, 2, 1];
  const BETS = [5, 8, 10, 20, 40];
  const LINES = [
    [0, 0, 0],
    [1, 1, 1],
    [2, 2, 2],
    [0, 1, 2],
    [2, 1, 0],
  ];

  let root = null;
  let timer = 0;
  let spinning = false;
  let betIndex = 0;
  let grid = null;
  let locked = null;
  let ladder = 1;
  let lastWin = 0;
  let winNow = 0;

  function pick() {
    const total = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
    let roll = Math.random() * total;
    for (const symbol of SYMBOLS) {
      roll -= symbol.weight;
      if (roll <= 0) return symbol;
    }
    return SYMBOLS[SYMBOLS.length - 1];
  }

  function pickLadder() {
    const total = LADDER_WEIGHT.reduce((sum, weight) => sum + weight, 0);
    let roll = Math.random() * total;
    for (let index = 0; index < LADDER.length; index += 1) {
      roll -= LADDER_WEIGHT[index];
      if (roll <= 0) return LADDER[index];
    }
    return 1;
  }

  function freshGrid() {
    return [0, 1, 2].map(() => [pick(), pick(), pick()]);
  }

  function money(value) {
    return (Math.round(value * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function score(reels, stake, mult) {
    let win = 0;
    const hits = [];
    LINES.forEach((rows, line) => {
      const symbols = rows.map((row, col) => reels[col][row]);
      if (symbols.every((symbol) => symbol.id === symbols[0].id)) {
        win += (stake * symbols[0].pay * mult) / 5;
        hits.push(line);
      }
    });
    return { win: Math.round(win * 100) / 100, hits };
  }

  function paint() {
    if (!root) return;
    const board = root.querySelector("[data-fruit-board]");
    board.innerHTML = grid
      .map(
        (reel) =>
          `<div class="reel">${reel
            .map((symbol) => `<div class="cell" style="color:${symbol.tone}">${symbol.mark}</div>`)
            .join("")}</div>`
      )
      .join("");
    root.querySelectorAll("[data-step]").forEach((node) => {
      node.classList.toggle("on", !spinning && Number(node.dataset.step) === ladder);
    });
    const player = Store.user();
    root.querySelector("[data-fruit-balance]").textContent = player ? money(player.balance) : "—";
    root.querySelector("[data-fruit-win]").textContent = money(winNow);
    root.querySelector("[data-fruit-last]").textContent = money(lastWin);
    root.querySelector("[data-fruit-bet]").textContent = `${BETS[betIndex].toFixed(2)} ETB`;
    const popup = root.querySelector("[data-fruit-popup]");
    popup.classList.toggle("show", winNow > 0 && !spinning);
    popup.textContent = winNow > 0 ? money(winNow) : "";
  }

  function finish(result, stake) {
    if (!spinning) return;
    spinning = false;
    window.clearInterval(timer);
    timer = 0;
    winNow = result.win;
    if (result.win > 0) lastWin = result.win;
    const button = root.querySelector("[data-fruit-spin]");
    button.textContent = "Spin";
    button.disabled = false;
    if (result.win > 0) {
      Store.adjust(result.win, {
        game: "Fruit Ladder",
        result: `Win · ${ladder}x ladder`,
        amount: result.win - stake,
      });
      Superwen.toast(`Fruit win ${money(result.win)}`);
      Superwen.paintBalance();
    } else {
      Store.adjust(0, { game: "Fruit Ladder", result: "No line", amount: -stake });
    }
    paint();
  }

  function spin() {
    if (spinning) return;
    const player = Store.user();
    if (!player) {
      Superwen.openAuth("login");
      Superwen.toast("Sign in to spin.");
      return;
    }
    const stake = BETS[betIndex];
    if (player.balance < stake) {
      Superwen.toast("Not enough play credits.", "bad");
      return;
    }
    Store.adjust(-stake);
    Superwen.paintBalance();
    locked = freshGrid();
    ladder = pickLadder();
    const result = score(locked, stake, ladder);
    winNow = 0;
    spinning = true;
    root.querySelector("[data-fruit-spin]").textContent = "Stop";
    let frames = 0;
    window.clearInterval(timer);
    timer = window.setInterval(() => {
      frames += 1;
      if (frames < 14) {
        grid = freshGrid();
        paint();
      } else {
        grid = locked;
        finish(result, stake);
      }
    }, 80);
  }

  function onClick(event) {
    if (event.target.closest("[data-fruit-spin]")) {
      if (spinning && locked) {
        grid = locked;
        finish(score(locked, BETS[betIndex], ladder), BETS[betIndex]);
      } else spin();
      return;
    }
    if (spinning) return;
    if (event.target.closest("[data-fruit-minus]")) betIndex = Math.max(0, betIndex - 1);
    if (event.target.closest("[data-fruit-plus]")) betIndex = Math.min(BETS.length - 1, betIndex + 1);
    if (event.target.closest("[data-fruit-double]")) betIndex = Math.min(BETS.length - 1, betIndex + 1);
    paint();
  }

  return {
    mount(node) {
      this.unmount();
      root = node;
      grid = freshGrid();
      ladder = 1;
      root.innerHTML = `
        <div class="fruit-top"><p>5 lines · ladder</p><h2>Fruit Ladder</h2></div>
        <div class="fruit-stage">
          <ol class="ladder">${LADDER.map((step) => `<li data-step="${step}">${step}x</li>`).join("")}</ol>
          <div class="fruit-window">
            <div class="board fruit-board" data-fruit-board></div>
            <div class="fruit-popup" data-fruit-popup></div>
          </div>
        </div>
        <div class="fruit-stats">
          <span>Balance<b data-fruit-balance>0.00</b></span>
          <span>Win<b data-fruit-win>0.00</b></span>
          <span>Last<b data-fruit-last>0.00</b></span>
        </div>
        <div class="fruit-controls">
          <button type="button" data-fruit-minus aria-label="Lower bet">−</button>
          <button type="button" class="fruit-spin" data-fruit-spin>Spin</button>
          <button type="button" data-fruit-plus aria-label="Raise bet">+</button>
        </div>
        <p class="hint">Bet <b data-fruit-bet>5.00 ETB</b> · <button type="button" data-fruit-double>Step bet up</button>. The ladder multiplies a winning line. Stop only shortens the spin.</p>
      `;
      root.addEventListener("click", onClick);
      paint();
    },
    unmount() {
      if (spinning && root) {
        Store.adjust(0, { game: "Fruit Ladder", result: "Spin closed", amount: -BETS[betIndex] });
      }
      window.clearInterval(timer);
      timer = 0;
      spinning = false;
      if (root) root.removeEventListener("click", onClick);
      root = null;
    },
  };
})();
