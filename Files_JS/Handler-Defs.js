window.GameDefs = {
  WHATS_NEW: [
    { id: "v1", title: "New: Daily Badge", desc: "Play today and unlock the daily badge!" },
    { id: "shop", title: "Shop Items", desc: "New coin multipliers and fun cosmetics." }
  ],

  ACHIEVEMENTS: [
    {
      id: "help_friends",
      title: "Helpful Friend",
      description: "Help friends by answering questions. Each correct answer increases your helpfulness.",
      levels: [
        { level: 1, threshold: 10 },
        { level: 2, threshold: 50 },
        { level: 3, threshold: 150 }
      ]
    },
    {
      id: "collector",
      title: "Collector",
      description: "Collect coins by completing tasks and answering questions. Bigger collections unlock bigger badges.",
      levels: [
        { level: 1, threshold: 250 },
        { level: 2, threshold: 1000 },
        { level: 3, threshold: 5000 }
      ]
    },
    {
      id: "explorer",
      title: "Explorer",
      description: "Visit different places in the world. Walking further and finding friends increases this progress.",
      levels: [
        { level: 1, threshold: 3 },
        { level: 2, threshold: 12 },
        { level: 3, threshold: 35 }
      ]
    }
  ],

  // Only badges that correspond to achievements
  BADGES: [
    { id: "badge_help_1", name: "Helper I", img: "../Pictures_Thumbnails/BadgeHelp1.png" },
    { id: "badge_help_2", name: "Helper II", img: "../Pictures_Thumbnails/BadgeHelp2.png" },
    { id: "badge_help_3", name: "Helper III", img: "../Pictures_Thumbnails/BadgeHelp3.png" },

    { id: "badge_collector_1", name: "Coins I", img: "../Pictures_Thumbnails/CoinCollector1.png" },
    { id: "badge_collector_2", name: "Coins II", img: "../Pictures_Thumbnails/CoinCollector2.png" },
    { id: "badge_collector_3", name: "Coins III", img: "../Pictures_Thumbnails/CoinCollector3.png" },

    { id: "badge_explorer_1", name: "Explorer I", img: "../Pictures_Thumbnails/BadgeExplorer1.png" },
    { id: "badge_explorer_2", name: "Explorer II", img: "../Pictures_Thumbnails/BadgeExplorer2.png" },
    { id: "badge_explorer_3", name: "Explorer III", img: "../Pictures_Thumbnails/BadgeExplorer3.png" }
  ],

  SHOP: [
    { id: "mul_1", title: "Coin x1.5", desc: "Increases coin rewards by 1.5x", cost: 250, img: "../Pictures_Thumbnails/Mul1.5x.png", effect: { type: "multiplier", key: "CoinGain", value: 1.5 } },
    { id: "mul_2", title: "Coin x2", desc: "Increases coin rewards by 2x", cost: 950, img: "../Pictures_Thumbnails/Mul2x.png", effect: { type: "multiplier", key: "CoinGain", value: 2 } },
    { id: "hat_red", title: "Red Hat", desc: "Cool cosmetic for your player", cost: 500, img: "../Pictures_Thumbnails/RedHat.png", effect: { type: "cosmetic", key: "HatRed", value: true } }
  ],

  // --- Fixed Achievements Backend ---
  Achievements: {
    init(playerData) {
      if (!playerData.achievements) {
        playerData.achievements = {};
        GameDefs.ACHIEVEMENTS.forEach(ach => {
          playerData.achievements[ach.id] = { progress: 0, level: 0, badgeEarned: false };
        });
      }
      if (!playerData.badges) playerData.badges = [];
    },

    update(playerData, achId, amount = 1) {
      const achDef = GameDefs.ACHIEVEMENTS.find(a => a.id === achId);
      if (!achDef) return;

      this.init(playerData);
      const achData = playerData.achievements[achId];
      achData.progress += amount;

      let nextLevel = achData.level + 1;
      while (nextLevel <= achDef.levels.length && achData.progress >= achDef.levels[nextLevel - 1].threshold) {
        achData.level = nextLevel;
        this.awardBadge(playerData, achId, nextLevel);
        nextLevel++;
      }
    },

    awardBadge(playerData, achId, level) {
      const badgeMapping = {
        "help_friends": ["badge_help_1", "badge_help_2", "badge_help_3"],
        "collector": ["badge_collector_1", "badge_collector_2", "badge_collector_3"],
        "explorer": ["badge_explorer_1", "badge_explorer_2", "badge_explorer_3"]
      };

      const badgeId = badgeMapping[achId]?.[level - 1];
      if (!badgeId) return;

      if (!playerData.badges.includes(badgeId)) {
        playerData.badges.push(badgeId);
        if (window.GameUI?.showBadgeNotification) {
          const badge = GameDefs.BADGES.find(b => b.id === badgeId);
          window.GameUI.showBadgeNotification(badge);
        }
      }
    },

    get(playerData, achId) {
      this.init(playerData);
      const achDef = GameDefs.ACHIEVEMENTS.find(a => a.id === achId);
      const achData = playerData.achievements[achId];
      return {
        title: achDef.title,
        description: achDef.description,
        progress: achData.progress,
        level: achData.level,
        nextThreshold: achDef.levels[achData.level]?.threshold || null
      };
    }
  }
};