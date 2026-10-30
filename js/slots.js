/* Five-reel slot. The result is chosen before the reels animate. */
const Slots = (() => {
  const SYMBOLS = [
    { id: "seven", mark: "7", pay: 8, weight: 2, tone: "#ff5d7a" },
    { id: "crown", mark: "♛", pay: 5, weight: 3, tone: "#f5c16c" },
    { id: "gem", mark: "◆", pay: 4, weight: 4, tone: "#8b7cff" },
    { id: "star", mark: "★", pay: 3, weight: 6, tone: "#5ec8ff" },
    { id: "coin", mark: "●", pay: 2, weight: 8, tone: "#f0b429" },
    { id: "leaf", mark: "♣", pay: 1.5, weight: 10, tone: "#3dd68c" },
  ];
  const THEMES = {
    highland: { title: "Highland Reels", kicker: "Savanna window · 3 lines" },
    market: { title: "Night Market", kicker: "City lights · 3 lines" },
  };

  let root = null;
  let timer = 0;
  let spinning = false;
  let theme = "highland";
  let grid = null;

  function pick() {
    const total = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
    let roll = Math.random() * total;
    for (const symbol of SYMBOLS) {
      roll -= symbol.weight;
      if (roll <= 0) return symbol;
    }
    return SYMBOLS[SYMBOLS.length - 1];
  }

  function freshGrid() {
    return Array.from({ length: 5 }, () => [pick(), pick(), pick()]);
  }

  function money(value) {
    return (Math.round(value * 100) / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function score(reels, stake) {
    let win = 0;
    const lines = [];
    for (let row = 0; row < 3; row += 1) {
      const first = reels[0][row];
      let count = 1;
      for (let col = 1; col < 5; col += 1) {
        if (reels[col][row].id === first.id) count += 1;
        else break;
      }
      if (count >= 3) {
        const factor = count === 3 ? 1 : count === 4 ? 2 : 4;
        win += stake * first.pay * factor;
        lines.push(row);
      }
    }
    return { win: Math.round(win * 100) / 100, lines };
  }

  function cell(symbol, hot) {
    return `<div class="cell${hot ? " hot" : ""}" style="color:${symbol.tone}">${symbol.mark}</div>`;
  }

  function runLength(reels, row) {
    const first = reels[0][row];
    let count = 1;
    for (let col = 1; col < reels.length; col += 1) {
      if (reels[col][row].id === first.id) count += 1;
      else break;
    }
    return count;
  }

  function paint(reels, reveal) {
    const board = root.querySelector("[data-board]");
    if (!board) return;
    const runs = reveal ? reels[0].map((_, row) => runLength(reels, row)) : [];
    board.innerHTML = reels
      .map(
        (reel, col) =>
          `<div class="reel">${reel
            .map((symbol, row) => cell(symbol, reveal && runs[row] >= 3 && col < runs[row]))
            .join("")}</div>`
      )
      .join("");
  }

  function setStatus(text) {
    const node = root.querySelector("[data-slot-status]");
    if (node) node.textContent = text;
  }

  function gameName() {
    return theme === "market" ? "Night Market" : "Highland Reels";
  }

  function finish(result, stake) {
    spinning = false;
    window.clearInterval(timer);
    timer = 0;
    paint(grid, true);
    const button = root.querySelector("[data-spin]");
    if (button) {
      button.disabled = false;
      button.textContent = "Spin";
    }
    if (result.win > 0) {
      Store.adjust(result.win, {
        game: gameName(),
        result: `Win on ${result.lines.length} line${result.lines.length > 1 ? "s" : ""}`,
        amount: result.win - stake,
      });
      setStatus(`Win ${money(result.win)} play ETB`);
      Superwen.toast(`Slot win ${money(result.win)}`);
      Superwen.paintBalance();
    } else {
      Store.adjust(0, { game: gameName(), result: "No line", amount: -stake });
      setStatus("No winning line");
    }
  }

  function spin() {
    if (spinning) return;
    const player = Store.user();
    if (!player) {
      Superwen.openAuth("login");
      Superwen.toast("Sign in to spin with your demo balance.");
      return;
    }
    const stake = Number(root.querySelector("[data-slot-bet]").value);
    if (!Number.isFinite(stake) || stake < 1) {
      Superwen.toast("Choose a bet of at least 1.", "bad");
      return;
    }
    if (player.balance < stake) {
      Superwen.toast("Not enough play credits.", "bad");
      return;
    }
    Store.adjust(-stake);
    Superwen.paintBalance();
    grid = freshGrid();
    const result = score(grid, stake);
    spinning = true;
    const button = root.querySelector("[data-spin]");
    button.disabled = false;
    button.textContent = "Stop";
    setStatus("Reels spinning");
    let frames = 0;
    timer = window.setInterval(() => {
      frames += 1;
      paint(freshGrid(), false);
      if (frames >= 16) finish(result, stake);
    }, 80);
  }

  function stopEarly() {
    if (!spinning || !grid) return;
    const stake = Number(root.querySelector("[data-slot-bet]").value);
    finish(score(grid, stake), stake);
  }

  function onClick(event) {
    const chip = event.target.closest("[data-slot-chip]");
    if (chip && !spinning) {
      root.querySelector("[data-slot-bet]").value = chip.dataset.slotChip;
      return;
    }
    if (event.target.closest("[data-spin]")) {
      event.preventDefault();
      if (spinning) stopEarly();
      else spin();
    }
  }

  return {
    mount(node, name) {
      this.unmount();
      theme = THEMES[name] ? name : "highland";
      root = node;
      root.classList.toggle("market", theme === "market");
      const copy = THEMES[theme];
      grid = freshGrid();
      root.innerHTML = `
        <div class="slot-top">
          <p>${copy.kicker}</p>
          <h2>${copy.title}</h2>
        </div>
        <div class="board" data-board></div>
        <p class="phase" data-slot-status>Match 3 or more from the left on a row.</p>
        <div class="bet-row">
          <label>Bet<input data-slot-bet type="number" min="1" step="1" value="2" /></label>
        </div>
        <div class="chips">
          ${[2, 5, 10, 20, 50].map((value) => `<button type="button" data-slot-chip="${value}">${value}</button>`).join("")}
        </div>
        <button class="primary big" type="button" data-spin>Spin</button>
        <p class="hint">Stop only reveals the result already chosen for this spin. Wins are play credits.</p>
      `;
      paint(grid, null);
      root.addEventListener("click", onClick);
    },
    unmount() {
      if (spinning && root) {
        const stake = Number(root.querySelector("[data-slot-bet]").value);
        Store.adjust(0, { game: gameName(), result: "Spin closed", amount: -stake });
      }
      window.clearInterval(timer);
      timer = 0;
      spinning = false;
      if (root) root.removeEventListener("click", onClick);
      root = null;
      grid = null;
    },
  };
})();
