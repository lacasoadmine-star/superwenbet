/* Play-money wallet stored only in this browser. No payments are sent. */
const Store = (() => {
  const KEY = "superwen.play.v1";

  function empty() {
    return { users: [], session: null };
  }

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!parsed || !Array.isArray(parsed.users)) return empty();
      return parsed;
    } catch {
      return empty();
    }
  }

  let data = load();

  function save() {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  async function hash(password) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`superwen|${password}`));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function user() {
    if (!data.session) return null;
    return data.users.find((entry) => entry.phone === data.session) || null;
  }

  function patch(mutator) {
    const current = user();
    if (!current) return null;
    mutator(current);
    current.balance = Math.round(current.balance * 100) / 100;
    save();
    return current;
  }

  function todayKey() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
  }

  return {
    user,
    async register({ phone, password }) {
      if (data.users.some((entry) => entry.phone === phone)) {
        throw new Error("That mobile number is already registered.");
      }
      const player = {
        phone,
        passwordHash: await hash(password),
        playerId: String(Math.floor(10000000 + Math.random() * 90000000)),
        balance: 500,
        history: [],
        createdAt: Date.now(),
        bonusClaimedOn: null,
      };
      data.users.push(player);
      data.session = phone;
      save();
      return player;
    },
    async login(phone, password) {
      const found = data.users.find((entry) => entry.phone === phone);
      if (!found || found.passwordHash !== (await hash(password))) {
        throw new Error("Mobile number or password is incorrect.");
      }
      data.session = phone;
      save();
      return found;
    },
    logout() {
      data.session = null;
      save();
    },
    async changePassword(current, next) {
      const found = user();
      if (!found) throw new Error("Sign in first.");
      if (found.passwordHash !== (await hash(current))) throw new Error("Current password is incorrect.");
      if (next.length < 6) throw new Error("Use at least 6 characters.");
      found.passwordHash = await hash(next);
      save();
    },
    adjust(delta, entry) {
      return patch((current) => {
        current.balance += delta;
        if (entry) {
          const amount = entry.amount == null ? delta : entry.amount;
          current.history.unshift({
            id: crypto.randomUUID(),
            at: Date.now(),
            game: entry.game,
            result: entry.result,
            amount: Math.round(amount * 100) / 100,
          });
          current.history = current.history.slice(0, 50);
        }
      });
    },
    claimDaily() {
      const current = user();
      if (!current) throw new Error("Sign in to claim play credits.");
      const day = todayKey();
      if (current.bonusClaimedOn === day) throw new Error("Daily play bonus already claimed today.");
      return patch((player) => {
        player.balance += 50;
        player.bonusClaimedOn = day;
        player.history.unshift({
          id: crypto.randomUUID(),
          at: Date.now(),
          game: "Bonus",
          result: "Daily play bonus",
          amount: 50,
        });
      });
    },
    bonusAvailable() {
      const current = user();
      if (!current) return false;
      return current.bonusClaimedOn !== todayKey();
    },
  };
})();
