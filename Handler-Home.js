(function () {
    const Username = SaveManager.GetCurrentUser() || "Guest";
    SaveManager.EnsureUser && SaveManager.EnsureUser(Username);

    // DOM refs
    const UsernameDisplay = document.getElementById("UsernameDisplay");
    const PlayerLevelDisplay = document.getElementById("PlayerLevelDisplay");
    const AchList = document.getElementById("AchievementsList");
    const BadgesGrid = document.getElementById("BadgesGrid");
    const ClaimBtn = document.getElementById("ClaimDailyBtn");
    const DailyInfo = document.getElementById("DailyInfo");
    const ShopList = document.getElementById("ShopList");
    const CoinsDisplayHome = document.getElementById("CoinsDisplayHome");
    const SvgText = document.querySelector(".ProgressRingText");
    const RingProgress = document.querySelector(".RingProgress");
    const TimePlayedText = document.getElementById("TimePlayedText");
    const TransientBanner = document.getElementById("TransientBanner");

    // Ring circumference
    const Radius = 54;
    const Circumference = 2 * Math.PI * Radius;
    if (RingProgress) {
        RingProgress.style.strokeDasharray = `${Circumference} ${Circumference}`;
        RingProgress.style.strokeDashoffset = `${Circumference}`;
        RingProgress.style.transition = "stroke-dashoffset 450ms cubic-bezier(.2,.9,.25,1)";
    }

    // Helpers
    function formatHMS(seconds) {
        seconds = Number(seconds) || 0;
        const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = Math.floor(seconds % 60);
        return `${h}h ${m}m ${s}s`;
    }

    function escapeHtml(s) {
        if (s == null) return "";
        return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    function getPlayerLevel() {
        try {
            const ud = SaveManager.GetUserData && SaveManager.GetUserData(Username);
            if (ud && (ud.Level || ud.XP || ud.Level === 0)) {
                if (ud.Level) return ud.Level;
                if (ud.XP) return 1 + Math.floor((ud.XP || 0) / 100);
            }
        } catch (e) { }
        if (SaveManager.GetLevel) {
            try { return SaveManager.GetLevel(Username) || 1; } catch (e) { }
        }
        return 1;
    }

    function updatePlayerLevelUI() {
        const lvl = getPlayerLevel();
        if (PlayerLevelDisplay) PlayerLevelDisplay.textContent = `Lv ${lvl}`;
    }

    function updateProgressRing(seconds, maxSeconds) {
        const ratio = Math.min((Number(seconds) || 0) / Math.max(1, (Number(maxSeconds) || 1)), 1);
        const offset = Circumference * (1 - ratio);
        if (RingProgress) RingProgress.style.strokeDashoffset = String(offset);
        if (SvgText) SvgText.textContent = formatHMS(seconds);
        if (TimePlayedText) TimePlayedText.textContent = formatHMS(seconds);
    }

    function updateCoinsHeader() {
        if (!CoinsDisplayHome) return;
        const coins = SaveManager.GetCoins ? (SaveManager.GetCoins(Username) || 0) : 0;
        CoinsDisplayHome.textContent = `🪙 ${coins}`;
        CoinsDisplayHome.title = `${coins} coins`;
    }

    function showTransient(txt, time = 1600) {
        if (!TransientBanner) return;
        TransientBanner.textContent = txt;
        TransientBanner.style.opacity = "1";
        clearTimeout(TransientBanner._t);
        TransientBanner._t = setTimeout(() => TransientBanner.style.opacity = "0", time);
    }

    // Content renderers
    function renderShop() {
        if (!ShopList) return;
        ShopList.innerHTML = "";
        const items = (window.GameDefs && window.GameDefs.SHOP) || [];
        if (!items.length) {
            const p = document.createElement("div");
            p.className = "NoShop";
            p.textContent = "Shop is empty.";
            ShopList.appendChild(p);
            updateCoinsHeader();
            return;
        }

        items.forEach(it => {
            const row = document.createElement("div");
            row.className = "ShopItem";

            const meta = document.createElement("div");
            meta.className = "ShopMeta";

            const img = document.createElement("img");
            img.src = it.img || "Pictures_Thumbnails/Tab-Icon.png";
            img.alt = it.title;
            img.onerror = () => { img.src = "Pictures_Thumbnails/Tab-Icon.png"; };

            const txt = document.createElement("div");
            txt.innerHTML = `<div class="title">${escapeHtml(it.title)}</div>
                             <div class="desc">${escapeHtml(it.desc)}</div>`;

            meta.appendChild(img);
            meta.appendChild(txt);

            const right = document.createElement("div");
            const buy = document.createElement("button");
            buy.className = "ShopBuy";
            buy.textContent = `Buy • ${it.cost}`;

            const ud = SaveManager.GetUserData(Username) || {};
            const unlocks = (ud.ShopUnlocks) || {};
            if (unlocks[it.id]) {
                buy.disabled = true;
                buy.textContent = "Owned";
            }

            buy.addEventListener("click", () => {
                const ok = SaveManager.PurchaseItem && SaveManager.PurchaseItem(Username, it.id, it.cost);
                if (ok) {
                    showTransient(`Purchased: ${it.title}`);
                    renderShop();
                    renderBadges();
                    renderAchievements();
                    updateCoinsHeader();
                } else {
                    showTransient("Not enough coins");
                }
            });

            right.appendChild(buy);
            row.appendChild(meta);
            row.appendChild(right);
            ShopList.appendChild(row);
        });

        updateCoinsHeader();
    }

    function formatAchievementDisplay(def, cur) {
        const curLevel = Number(cur.level || 0);
        const levels = def.levels || [];
        const next = levels[curLevel] || null;
        let percent = 1;
        let progressText = "MAX";
        if (next) {
            percent = Math.min(Number(cur.value || 0) / Number(next.threshold || 1), 1);
            progressText = `${Math.min(cur.value || 0, next.threshold)} / ${next.threshold}`;
        }
        return { curLevel, levelCount: levels.length, percent, progressText, description: def.description || "" };
    }

    function ensureBadgeForLevel(defId, lvl) {
        if (!defId || !lvl || lvl < 1) return null;
        const map = { help_friends: "badge_help_", collector: "badge_collector_", explorer: "badge_explorer_" };
        const prefix = map[defId] || (defId + "_badge_");
        return `${prefix}${lvl}`;
    }

    function grantBadge(badgeId) {
        if (!badgeId) return;
        const owned = SaveManager.GetBadges(Username) || [];
        if (!owned.includes(badgeId)) {
            SaveManager.AddBadge && SaveManager.AddBadge(Username, badgeId);
            animateBadgePopup(badgeId);
        }
    }

    function animateBadgePopup(badgeId) {
        const defs = (window.GameDefs && window.GameDefs.BADGES) || [];
        const badge = defs.find(b => b.id === badgeId) || {};
        const popup = document.createElement("div");
        popup.style.position = "fixed";
        popup.style.right = "18px";
        popup.style.bottom = "18px";
        popup.style.padding = "10px 14px";
        popup.style.borderRadius = "12px";
        popup.style.background = "linear-gradient(180deg,#fff,#f1fff2)";
        popup.style.boxShadow = "0 10px 30px rgba(0,0,0,.2)";
        popup.style.zIndex = 9999;
        popup.style.display = "flex";
        popup.style.alignItems = "center";
        popup.style.gap = "10px";
        popup.style.transform = "translateY(16px)";
        popup.style.opacity = "0";
        const img = document.createElement("img");
        img.src = badge.img || "/Pictures_Thumbnails/Tab-Icon.png";
        img.alt = badge.name || badgeId;
        img.style.width = "44px";
        img.style.height = "44px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "8px";
        const text = document.createElement("div");
        text.style.fontWeight = "800";
        text.style.color = "#2e7d32";
        text.textContent = `Unlocked: ${badge.name || badgeId}`;
        popup.appendChild(img);
        popup.appendChild(text);
        document.body.appendChild(popup);
        requestAnimationFrame(() => {
            popup.style.transition = "transform .45s cubic-bezier(.2,.9,.25,1), opacity .45s";
            popup.style.transform = "translateY(0)";
            popup.style.opacity = "1";
        });
        setTimeout(() => { popup.style.opacity = "0"; popup.style.transform = "translateY(-18px)"; }, 2800);
        setTimeout(() => popup.remove(), 3300);
    }

    function checkAndApplyAchievementLevelUps() {
        const defsAll = (window.GameDefs && window.GameDefs.ACHIEVEMENTS) || [];
        const defs = defsAll.filter(d => ["help_friends", "collector", "explorer"].includes(d.id));
        const userData = SaveManager.GetUserData(Username) || {};
        const userProgress = userData.Progress || {};
        defs.forEach(def => {
            let cur = userProgress[def.id] || { value: 0, level: 0 };
            if (def.id === "collector") cur.value = SaveManager.GetCoins(Username) || 0;
            if (def.id === "explorer") cur.value = (userData.ExplorerCount || 0);
            if (def.id === "help_friends") cur.value = (userProgress[def.id] && userProgress[def.id].value) || 0;
            const levels = def.levels || [];
            while (true) {
                const next = levels[cur.level] || null;
                if (!next) break;
                if (Number(cur.value || 0) >= Number(next.threshold || 0)) {
                    cur.level = cur.level + 1;
                    SaveManager.SaveUserData && SaveManager.SaveUserData(
                        Username,
                        Object.assign({}, userData, { Progress: Object.assign(userProgress, { [def.id]: cur }) })
                    );
                    const badgeId = ensureBadgeForLevel(def.id, cur.level);
                    if (badgeId) grantBadge(badgeId);
                    showTransient(`${def.title} reached level ${cur.level}!`);
                } else break;
            }
        });
    }

    function renderAchievements() {
        if (!AchList) return;
        AchList.innerHTML = "";
        const defsAll = (window.GameDefs && window.GameDefs.ACHIEVEMENTS) || [];
        const defs = defsAll.filter(d => ["help_friends", "collector", "explorer"].includes(d.id));
        const userData = SaveManager.GetUserData(Username) || {};
        const userProgress = userData.Progress || {};

        if (!defs.length) {
            const none = document.createElement("div");
            none.className = "NoAchievements";
            none.textContent = "No achievements configured.";
            AchList.appendChild(none);
            return;
        }

        defs.forEach(def => {
            let cur = userProgress[def.id] || { value: 0, level: 0 };
            if (def.id === "collector") cur.value = SaveManager.GetCoins(Username) || 0;
            if (def.id === "explorer") cur.value = (userData.ExplorerCount || 0);

            const s = formatAchievementDisplay(def, cur);

            const container = document.createElement("div");
            container.className = "Achievement";
            container.tabIndex = 0;
            container.innerHTML = `
                <div class="AchievementHeader">
                  <div class="AchievementTitle">${escapeHtml(def.title)}</div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div class="AchievementLevel">Lv ${s.curLevel}/${s.levelCount}</div>
                    <div style="min-width:90px;text-align:right;color:#476c21;font-weight:700">${escapeHtml(s.progressText)}</div>
                  </div>
                </div>
                <div class="ProgressBar" aria-hidden="true">
                  <div class="ProgressFill" style="transform:scaleX(${s.percent});"></div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
                  <div class="AchievementDescription">${escapeHtml(s.description)}</div>
                  <div class="ProgressFraction">${escapeHtml(s.progressText)}</div>
                </div>
            `;
            container.addEventListener("click", () => container.classList.toggle("expanded"));
            container.addEventListener("mouseenter", () => container.classList.add("expanded"));
            container.addEventListener("mouseleave", () => container.classList.remove("expanded"));
            AchList.appendChild(container);
        });
    }

    function renderBadges() {
        if (!BadgesGrid) return;
        BadgesGrid.innerHTML = "";
        const badges = (window.GameDefs && window.GameDefs.BADGES) || [];
        const owned = SaveManager.GetBadges(Username) || [];
        if (!badges.length) {
            const none = document.createElement("div");
            none.className = "NoBadges";
            none.textContent = "No badges defined.";
            BadgesGrid.appendChild(none);
            return;
        }
        badges.forEach(b => {
            const tile = document.createElement("div");
            tile.className = "BadgeTile";
            const img = document.createElement("img");
            img.src = b.img || "Pictures_Thumbnails/Tab-Icon.png";
            img.alt = b.name || "";
            img.onerror = () => { img.src = "Pictures_Thumbnails/Tab-Icon.png"; };
            tile.appendChild(img);
            const name = document.createElement("div");
            name.className = "BadgeName";
            name.textContent = b.name || "";
            if (owned.includes(b.id)) {
                name.style.background = "linear-gradient(90deg,#7cb342,#aed581)";
                name.style.color = "#fff";
            } else {
                name.style.background = "rgba(0,0,0,0.35)";
                name.style.color = "#fff";
            }
            tile.appendChild(name);
            BadgesGrid.appendChild(tile);
        });
    }

    // Daily reward & time played
    const MIN_PLAY_SECONDS_TO_CLAIM = 60;
    const MIN_CORRECTS_TO_CLAIM = 0;

    function refreshDailyUI() {
        SaveManager._resetDailyForUserIfNeeded && SaveManager._resetDailyForUserIfNeeded(Username);
        const user = SaveManager.GetUserData(Username) || {};
        const daily = user.Daily || { date: "", playSeconds: 0, correctAnswers: 0, claimedDaily: false };

        if (DailyInfo) {
            DailyInfo.innerHTML = `<div>Today's play: <strong>${formatHMS(daily.playSeconds || 0)}</strong></div>
                                   <div>Today's correct answers: <strong>${daily.correctAnswers || 0}</strong></div>`;
        }

        const eligible = !daily.claimedDaily &&
            ((daily.playSeconds || 0) >= MIN_PLAY_SECONDS_TO_CLAIM || (daily.correctAnswers || 0) >= MIN_CORRECTS_TO_CLAIM);

        if (ClaimBtn) {
            ClaimBtn.disabled = !!daily.claimedDaily || !eligible;
            if (daily.claimedDaily) ClaimBtn.textContent = "Already claimed";
            else if (!eligible) ClaimBtn.textContent = "Not ready";
            else ClaimBtn.textContent = "Claim reward";
        }

        const softMax = Math.max(300, MIN_PLAY_SECONDS_TO_CLAIM);
        updateProgressRing(daily.playSeconds || 0, softMax);
    }

    if (ClaimBtn) {
        ClaimBtn.addEventListener("click", () => {
            const res = SaveManager.ClaimDailyReward && SaveManager.ClaimDailyReward(Username);
            if (!res || !res.ok) {
                showTransient("Cannot claim right now");
                refreshDailyUI();
                return;
            }
            showTransient(`Claimed daily: ${res.amount} coins! 🎉`);
            renderBadges();
            renderAchievements();
            refreshDailyUI();
            updateCoinsHeader();
        });
    }

    function retroactiveBadgeGrant() {
        const defsAll = (window.GameDefs && window.GameDefs.ACHIEVEMENTS) || [];
        const defs = defsAll.filter(d => ["help_friends", "collector", "explorer"].includes(d.id));
        const userData = SaveManager.GetUserData(Username) || {};
        const userProgress = userData.Progress || {};
        defs.forEach(def => {
            const cur = userProgress[def.id] || { value: 0, level: 0 };
            for (let lv = 1; lv <= (cur.level || 0); lv++) {
                const badgeId = ensureBadgeForLevel(def.id, lv);
                if (badgeId) grantBadge(badgeId);
            }
        });
    }

    // Nav buttons
    const navHome = document.getElementById("NavHomeBtn");
    const navPlay = document.getElementById("NavPlayBtn");
    if (navHome) navHome.addEventListener("click", () => location.href = "Files_HTML/Child-Home.html");
    if (navPlay) navPlay.addEventListener("click", () => location.href = "Files_HTML/Child-Play.html");

    function updateHeaderUser() {
        if (UsernameDisplay) UsernameDisplay.textContent = SaveManager.GetCurrentUser() || "Guest";
        updatePlayerLevelUI();
        updateCoinsHeader();
    }

    function renderAll() {
        updateHeaderUser();
        renderAchievements();
        renderShop();
        renderBadges();
        refreshDailyUI();
    }

    // Initialize
    function init() {
        renderAll();
        retroactiveBadgeGrant();

        // periodic refresh: keep light to avoid jitter
        setInterval(() => {
            renderAchievements();
            refreshDailyUI();
            updateCoinsHeader();
        }, 3000);
    }

    // Start after paint
    setTimeout(init, 40);
})();