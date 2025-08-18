window.SaveManager = (function () {
  function _get(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
  }
  function _set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error("Save failed", e); }
  }
  function _del(key) { localStorage.removeItem(key); }
  function _clear() { localStorage.clear(); }

  function _getGameData() { return _get("GameData") || {}; }
  function _setGameData(d) { _set("GameData", d); }

  function _ensureUser(username) {
    if (typeof username !== "string") return null;
    const data = _getGameData();
    if (!data[username]) {
      data[username] = {
        Coins: 0,
        PlayerX: 0,
        PlayerY: 0,
        WorldSeed: Math.floor(Math.random() * 1e9),
        Progress: {},
        TimePlayed: 0,
        HasSeenTutorial: false,
        LongestSession: 0,
        Muted: false,
        Level: 1,
        XP: 0,
        StreakDays: 0,
        Daily: { date: "", playSeconds: 0, correctAnswers: 0, claimedDaily: false },
        Badges: [],
        ShopUnlocks: {},
        Multipliers: { CoinGain: 1 }
      };
      _setGameData(data);
    }
    return data;
  }

  function _updateUser(username, updates) {
    if (typeof username !== "string" || typeof updates !== "object") return;
    const data = _ensureUser(username);
    Object.assign(data[username], updates);
    _setGameData(data);
  }

  return {
    _get, _set, _del, _clear,
    _getGameData, _setGameData,

    EnsureUser(username) { _ensureUser(username); },

    GetCurrentUser() { return localStorage.getItem("CurrentUser") || null; },
    SetCurrentUser(username) { typeof username === "string" ? localStorage.setItem("CurrentUser", username) : this.ClearCurrentUser(); },
    ClearCurrentUser() { _del("CurrentUser"); },
    ClearAllData() { _clear(); },

    SaveUserData(username, data) { _updateUser(username, data); },
    GetUserData(username) { return _getGameData()[username] || null; },

    GetWorldSeed(username) { return this.GetUserData(username)?.WorldSeed ?? 12345; },

    GetPlayerPosition(username) {
      const u = this.GetUserData(username) || {};
      return { X: u.PlayerX || 0, Y: u.PlayerY || 0 };
    },
    SetPlayerPosition(username, x, y) { _updateUser(username, { PlayerX: x, PlayerY: y }); },

    GetCoins(username) { return this.GetUserData(username)?.Coins ?? 0; },
    SetCoins(username, amount) { _updateUser(username, { Coins: Math.max(0, Number(amount) || 0) }); },

    GetTimePlayed(username) { return this.GetUserData(username)?.TimePlayed ?? 0; },
    IncrementTimePlayed(username) {
      const d = this.GetUserData(username) || {};
      _updateUser(username, { TimePlayed: (d.TimePlayed || 0) + 1 });
    },

    IncrementDailyPlaySeconds(username, s = 1) {
      const d = this.GetUserData(username) || {};
      const daily = d.Daily || { date: "", playSeconds: 0, correctAnswers: 0, claimedDaily: false };
      const today = new Date().toISOString().slice(0, 10);
      if (daily.date !== today) {
        daily.date = today;
        daily.playSeconds = 0;
        daily.correctAnswers = 0;
        daily.claimedDaily = false;
      }
      daily.playSeconds = (daily.playSeconds || 0) + s;
      _updateUser(username, { Daily: daily });
    },

    GetHasSeenTutorial(username) { return !!this.GetUserData(username)?.HasSeenTutorial; },
    SetHasSeenTutorial(username, v) { _updateUser(username, { HasSeenTutorial: !!v }); },

    GetBadges(username) { return (this.GetUserData(username) || {}).Badges || []; },
    AddBadge(username, badgeId) {
      const u = this.GetUserData(username) || {};
      u.Badges = u.Badges || [];
      if (!u.Badges.includes(badgeId)) u.Badges.push(badgeId);
      _updateUser(username, { Badges: u.Badges });
    },

    PurchaseItem(username, itemId, cost) {
      const u = this.GetUserData(username) || {};
      const coins = u.Coins || 0;
      if (coins < cost) return false;
      u.Coins = coins - cost;
      u.ShopUnlocks = u.ShopUnlocks || {};
      u.ShopUnlocks[itemId] = true;
      _updateUser(username, u);
      return true;
    },

    ClaimDailyReward(username) {
      const u = this.GetUserData(username) || {};
      const daily = u.Daily || { date: "", playSeconds: 0, correctAnswers: 0, claimedDaily: false };
      const today = new Date().toISOString().slice(0, 10);
      if (daily.date !== today) {
        daily.date = today;
        daily.playSeconds = 0;
        daily.correctAnswers = 0;
        daily.claimedDaily = false;
      }
      if (daily.claimedDaily) return { ok: false, reason: "already" };
      const amount = Math.max(5, Math.min(200, Math.floor(daily.playSeconds / 10) + (daily.correctAnswers * 2)));
      u.Coins = (u.Coins || 0) + amount;
      daily.claimedDaily = true;
      _updateUser(username, { Coins: u.Coins, Daily: daily });
      return { ok: true, amount };
    },

    RecordAnswer(username, correct) {
      const u = this.GetUserData(username) || {};
      const daily = u.Daily || { date: "", playSeconds: 0, correctAnswers: 0, claimedDaily: false };
      const today = new Date().toISOString().slice(0, 10);
      if (daily.date !== today) { daily.date = today; daily.playSeconds = 0; daily.correctAnswers = 0; daily.claimedDaily = false; }
      if (correct) daily.correctAnswers = (daily.correctAnswers || 0) + 1;
      _updateUser(username, { Daily: daily });
    },

    AddXP(username, xp) {
      const u = this.GetUserData(username) || {};
      u.XP = (u.XP || 0) + (xp || 0);
      const level = u.Level || 1;
      const needed = level * 150;
      if (u.XP >= needed) {
        u.XP -= needed;
        u.Level = level + 1;
      }
      _updateUser(username, { XP: u.XP, Level: u.Level });
    },

    BumpDailyCorrect(username, n = 1) { const u = this.GetUserData(username) || {}; u.Daily = u.Daily || {}; u.Daily.correctAnswers = (u.Daily.correctAnswers || 0) + n; _updateUser(username, { Daily: u.Daily }); },

    AddAchievementProgress(username, achId, amount = 1) {
      const u = this.GetUserData(username) || {};
      u.Progress = u.Progress || {};
      const cur = u.Progress[achId] || { value: 0, level: 0 };
      cur.value = (cur.value || 0) + amount;
      _updateUser(username, { Progress: Object.assign(u.Progress || {}, { [achId]: cur }) });
    },

    GetTimePlayed(username) { return this.GetUserData(username)?.TimePlayed || 0; },

    SaveUserFull(username, dataObj) { _updateUser(username, dataObj); },

    _resetDailyForUserIfNeeded(username) {
      const u = this.GetUserData(username) || {};
      const daily = u.Daily || { date: "", playSeconds: 0, correctAnswers: 0, claimedDaily: false };
      const today = new Date().toISOString().slice(0, 10);
      if (daily.date !== today) {
        daily.date = today;
        daily.playSeconds = 0;
        daily.correctAnswers = 0;
        daily.claimedDaily = false;
        _updateUser(username, { Daily: daily });
      }
    }
  };
})();