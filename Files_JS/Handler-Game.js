/* Handler-Game.js (FULL) */
(function () {
  const Canvas = document.getElementById("GameCanvas");
  const Ctx = Canvas && Canvas.getContext ? Canvas.getContext("2d") : null;

  const CoinsUI = document.getElementById("CoinsUI");
  const QuestionUI = document.getElementById("QuestionUI");
  const QuestionTextEl = document.getElementById("QuestionText");
  const ChoicesContainer = document.getElementById("ChoicesContainer") || (function () {
    const el = document.createElement("div");
    el.id = "ChoicesContainer";
    el.setAttribute("role", "list");
    if (QuestionUI) QuestionUI.appendChild(el);
    return el;
  })();
  const ProximityPromptEl = document.getElementById("ProximityPrompt");
  const TopControlDock = document.getElementById("TopControlDock");
  const TopRightControls = document.getElementById("TopRightControls");

  const BlockSize = 64;
  const Keys = {};
  const Cache = {};
  const Npcs = [];
  const Player = { X: 0, Y: 0, Size: BlockSize };

  const Username = SaveManager.GetCurrentUser() || "Guest";
  SaveManager.EnsureUser(Username);

  let Coins = SaveManager.GetCoins(Username) || 0;
  let lastCoinAmount = Coins;

  const CoinsAmountEl = document.createElement("span");
  CoinsAmountEl.className = "CoinsAmount";

  /* Timing variables for frame-synced updates */
  let lastFrameTs = performance.now();
  let accumulated = 0;
  const MAX_DT = 0.05;

  /* Device pixel ratio tracking */
  let lastCanvasClientWidth = 0;
  let lastCanvasClientHeight = 0;
  let lastDPR = 0;

  /* -------------------------
     Asset loading
     ------------------------- */
  function LoadImage(Src) {
    const Img = new Image();
    Img.onload = () => (Img.loaded = true);
    Img.onerror = () => (Img.failed = true);
    Img.src = Src;
    return Img;
  }

  const Images = {
    Player: LoadImage("../Pictures_Assets/Player.png"),
    Ground: LoadImage("../Pictures_Assets/Ground.png"),
    Sand: LoadImage("../Pictures_Assets/Sand.png"),
    Water: LoadImage("../Pictures_Assets/Water.png"),
    Tree: LoadImage("../Pictures_Assets/Tree.png"),
    Flower: LoadImage("../Pictures_Assets/Flower.png"),
    Grass: LoadImage("../Pictures_Assets/Grass.png"),
    Rock: LoadImage("../Pictures_Assets/Rock.png")
  };

  const NpcImages = [
    LoadImage("../Pictures_Assets/Npc1.png"),
    LoadImage("../Pictures_Assets/Npc2.png"),
    LoadImage("../Pictures_Assets/Npc3.png"),
    LoadImage("../Pictures_Assets/Npc4.png")
  ];

  const QuestionBank = [
    {
      Question: "If your friend says 'HI!' to you, what is the best way to answer?",
      Choices: ["Say 'Hi!' back and smile", "Run away", "Ignore them", "Yell 'Stop!'"],
      AnswerIndex: 0
    },
    {
      Question: "If you want to get something, what should you do?",
      Choices: ["Yell, 'Give it to me!'", "Say, 'Can you please give that to me?'", "Fuss about it", "Annoy them until they give up"],
      AnswerIndex: 1
    },
    {
      Question: "If you bump into someone by accident, what should you do?",
      Choices: ["Yell 'Move!'", "Tell them it’s their fault", "Say 'Sorry.'", "Pretend it never happened"],
      AnswerIndex: 2
    },
    {
      Question: "Your teacher asks you a question, but you don’t know the answer, should you?",
      Choices: ["Tell them you don’t care", "Kindly ask them for help", "Ignore them", "Bug your buddy for the answer"],
      AnswerIndex: 1
    },
    {
      Question: "If you want to use something that someone is already using, what should you do?",
      Choices: ["Say 'Can you please share that with me?'", "Yell at them and hope they give it to you", "Grab it from them", "Yell 'Give that to me!'"],
      AnswerIndex: 0
    },
    {
      Question: "If you want to join a game with other kids, what should you do?",
      Choices: ["Ask 'Can I play with you'", "Push them aside", "Yell at them", "Cry"],
      AnswerIndex: 0
    },
    {
      Question: "If you are feeling sad, what is the best thing to do?",
      Choices: ["Tell an adult that you are feeling sad.", "Throw your stuff", "Yell at everyone", "Do nothing"],
      AnswerIndex: 0
    },
    {
      Question: "If your friend shares their snack with you, what should you say?",
      Choices: ["'Why did you do that?'", "'Go away'", "'Thanks!'", "Pretend they don’t exist"],
      AnswerIndex: 2
    },
    {
      Question: "If someone says 'thank you' to you, what should you say?",
      Choices: ["'You’re welcome!'", "'Whatever'", "'Leave me alone'", "Ignore them"],
      AnswerIndex: 0
    },
    {
      Question: "If you have to leave your friend’s house, what is the best thing to do?",
      Choices: ["Tell someone that you’re leaving before leaving", "Run away", "Yell, 'I’m leaving'", "Just leave before anyone notices"],
      AnswerIndex: 0
    },
    {
      Question: "If you want to know what someone is doing, what is a polite way to ask?",
      Choices: ["'Hey, what are you doing?'", "Be rude to them", "'Stop and tell me what you’re doing NOW!'", "Prevent them from doing what they are doing until they say something"],
      AnswerIndex: 0
    },
    {
      Question: "If you hear your name, what should you do?",
      Choices: ["Ignore it", "Say, 'What’s up?'", "Scream at them to shut up", "Walk away so you can’t hear them"],
      AnswerIndex: 1
    },
    {
      Question: "If your friend is talking about their day, what should you do?",
      Choices: ["Listen quietly.", "Talk only about yourself", "Interrupt them", "Leave"],
      AnswerIndex: 0
    },
    {
      Question: "If you want to sit next to someone, what can you say?",
      Choices: ["'Hey, can I sit here?'", "Yell at them to move over", "Push them aside", "Sit without asking"],
      AnswerIndex: 0
    },
    {
      Question: "If you make a mistake, what can you say?",
      Choices: ["'I’m sorry!'", "'It’s all your fault'", "'I don’t care, go away'", "Laugh at the other person and call names"],
      AnswerIndex: 0
    },
    {
      Question: "If someone helps you out with something, what can you tell them?",
      Choices: ["'Thank you so much'", "'Just leave already. I don’t need you'", "Go away", "'Why did you do that?'"],
      AnswerIndex: 0
    },
    {
      Question: "If you want someone to wait for you, what should you say?",
      Choices: ["'Please wait for me!'", "Scream at them", "Say nothing", "Try to catch up to them"],
      AnswerIndex: 0
    },
    {
      Question: "If someone is feeling angry, what can you do?",
      Choices: ["Cheer them up", "Annoy them even more", "Tell them they aren’t worth anything", "Call them stupid for feeling sad"],
      AnswerIndex: 0
    },
    {
      Question: "If you want to play a different game, what should you say?",
      Choices: ["'This is rigged, you are trying to cheat me!'", "'This is boring, you are dumb to be playing this'", "Leave and don’t give a reason why", "'Can we play something else guys?'"],
      AnswerIndex: 3
    },
    {
      Question: "If someone gives you a gift, what should you say?",
      Choices: ["'Only one?'", "'Why did you give me this?'", "'Thank you so much!'", "Grab it from them and quickly put it away"],
      AnswerIndex: 2
    }
  ];

  /* -------------------------
     RNG / Noise helpers
     ------------------------- */
  function Mulberry32(seed) {
    return () => {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function PerlinNoiseAlgorithm(seed) {
    const rand = Mulberry32(seed);
    const perm = new Uint8Array(512);
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);

    return (x, y) => {
      const xi = Math.floor(x) & 255;
      const yi = Math.floor(y) & 255;
      const xf = x - Math.floor(x);
      const yf = y - Math.floor(y);
      const u = fade(xf);
      const v = fade(yf);
      const a = perm[xi] + yi;
      const b = perm[xi + 1] + yi;

      return (
        (lerp(
          lerp(grad(perm[a], xf, yf), grad(perm[b], xf - 1, yf), u),
          lerp(grad(perm[a + 1], xf, yf - 1), grad(perm[b + 1], xf - 1, yf - 1), u),
          v
        ) * 0.5) + 0.5
      );
    };
  }

  function FractalNoise(f, x, y, o = 4, p = 0.5, l = 2) {
    let a = 1, freq = 1, nh = 0, maxA = 0;
    for (let i = 0; i < o; i++) {
      nh += f(x * freq, y * freq) * a;
      maxA += a;
      a *= p;
      freq *= l;
    }
    return nh / maxA;
  }

  function WhiteNoise(x, y, s = 99999) {
    return Mulberry32(x * 374761393 + y * 668265263 + s)() * 2 - 1;
  }
  function PRNGScatter(x, y, s) {
    return Mulberry32((x * 73856093) ^ (y * 19349663) ^ s)();
  }

  /* instantiate base noises */
  const WorldSeed = SaveManager.GetWorldSeed(Username);
  const BaseElevationNoise = PerlinNoiseAlgorithm(WorldSeed + (WorldSeed * 0.2));
  const BaseRiverNoise = PerlinNoiseAlgorithm(WorldSeed + (WorldSeed * 0.3));
  const BaseBiomeNoise = PerlinNoiseAlgorithm(WorldSeed + (WorldSeed * 0.4));
  const BaseTreeNoise = PerlinNoiseAlgorithm(WorldSeed + (WorldSeed * 0.5));
  const BaseGrassNoise = PerlinNoiseAlgorithm(WorldSeed + (WorldSeed * 0.6));

  function ElevationNoise(x, y) { return FractalNoise(BaseElevationNoise, x, y, 6, 0.5, 2); }
  function RiverNoise(x, y) { return FractalNoise(BaseRiverNoise, x, y, 4, 0.6, 2); }
  function BiomeNoise(x, y) { return FractalNoise(BaseBiomeNoise, x, y, 4, 0.5, 2); }
  function TreeNoise(x, y) { return FractalNoise(BaseTreeNoise, x, y, 4, 0.55, 2); }
  function GrassNoise(x, y) { return FractalNoise(BaseGrassNoise, x, y, 4, 0.55, 2); }

  /* ------------------------- Tile & NPC spawning (unchanged) ------------------------- */
  function IsNpcNearby(x, y, d = 3) {
    const dsq = d * d;
    for (const n of Npcs) if ((n.WorldX - x) ** 2 + (n.WorldY - y) ** 2 < dsq) return true;
    return false;
  }

  function CalculateTileType(x, y) {
    const elev = ElevationNoise(x * 0.005, y * 0.005) + WhiteNoise(x, y) * 0.005;
    const river = RiverNoise(x * 0.008, y * 0.008);
    const biomeVal = BiomeNoise(x * 0.002, y * 0.002);

    let biome =
      biomeVal < 0.15 ? "Desert"
        : biomeVal < 0.3 ? "Snow"
          : biomeVal < 0.5 ? "Plains"
            : biomeVal < 0.7 ? "Forest"
              : biomeVal < 0.85 ? "Swamp"
                : "Mountains";

    let type;
    if (elev < 0.43) type = "Ocean";
    else if (elev < 0.46) type = "Sand";
    else type = "Ground";

    if (type === "Ground") {
      if (biome === "Desert") type = "Sand";
      else if (biome === "Plains") {
        type =
          PRNGScatter(x, y, 404) > 0.97 ? "Flower"
            : GrassNoise(x * 0.05, y * 0.05) > 0.4 ? "Grass"
              : PRNGScatter(x, y, 101) > 0.85 ? "Tree"
                : "Ground";
      } else if (biome === "Forest") {
        type = PRNGScatter(x, y, 111) > 0.3 ? "Tree" : "Ground";
      } else if (biome === "Swamp") {
        type = PRNGScatter(x, y, 777) > 0.6 ? "Water" : "Grass";
      } else if (biome === "Mountains") {
        type = "Ground";
      }
    }

    return { type, river, elev };
  }

  function GetTile(x, y) {
    const key = `${x},${y}`;
    if (key in Cache) return Cache[key];

    const center = CalculateTileType(x, y);
    const neighbors = [
      CalculateTileType(x + 1, y),
      CalculateTileType(x - 1, y),
      CalculateTileType(x, y + 1),
      CalculateTileType(x, y - 1)
    ];

    const adjacentToOcean = neighbors.some(n => n.type === "Ocean");
    const riverCondition = Math.abs(center.river - 0.5) < 0.008;
    let type = center.type;

    if (riverCondition && type !== "Ocean" && (center.elev > 0.46 || adjacentToOcean)) type = "River";

    if (type === "Ocean") {
      const landNeighbors = neighbors.filter(n => n.type !== "Ocean").length;
      if (landNeighbors >= 4) type = "Sand";
    }

    if (type === "Sand") {
      const oceanNeighbors = neighbors.filter(n => n.type === "Ocean").length;
      if (oceanNeighbors >= 2) type = "Ocean";
      if (riverCondition) type = "River";
    }

    if (type === "Ground" && !Cache[key + "_rock"]) {
      if (!IsNpcNearby(x, y, 3) && PRNGScatter(x, y, 4242) > 0.92) {
        type = "Rock";
        Cache[key + "_rock"] = true;
      }
    }

    if ((type === "Ground" || type === "Sand") && !Cache[key + "_npc"]) {
      if (!IsNpcNearby(x, y, 3) && (WhiteNoise(x, y, 55555) * 0.5 + 0.5) < 0.003) {
        const tex = Math.floor(PRNGScatter(x, y, 12345) * NpcImages.length);
        Npcs.push({
          WorldX: x,
          WorldY: y,
          TextureName: tex,
          promptAlpha: 0,
          bobSeed: ((x * 73856093) ^ (y * 19349663)) >>> 0,
          lastInteracted: 0,
          cooldownSeconds: 8
        });
        Cache[key + "_npc"] = true;
      }
    }

    return (Cache[key] = type);
  }

  /* -------------------------
     Drawing helpers & UI effects
     ------------------------- */
  function DrawImage(img, fallback, x, y, w = BlockSize, h = BlockSize) {
    if (!Ctx) return;
    if (img && img.loaded && !img.failed && img.complete && img.naturalWidth > 0) {
      try {
        Ctx.drawImage(img, x, y, w, h);
        return;
      } catch (err) { }
    }
    Ctx.fillStyle = fallback || "#000";
    Ctx.fillRect(x, y, w, h);
  }

  function drawRotatedImage(img, x, y, w, h, rotation = 0) {
    if (!Ctx) return;
    Ctx.save();
    Ctx.translate(x + w / 2, y + h / 2);
    Ctx.rotate(rotation);
    Ctx.drawImage(img, -w / 2, -h / 2, w, h);
    Ctx.restore();
  }

  function spawnConfetti(x, y, count = 16) {
    const colors = ["#ffeb3b", "#ffc107", "#ff7043", "#66bb6a", "#42a5f5", "#ab47bc"];
    for (let i = 0; i < count; i++) {
      const c = document.createElement("div");
      c.className = "Confetti";
      c.style.position = "fixed";
      c.style.left = `${x + (Math.random() * 40 - 20)}px`;
      c.style.top = `${y + (Math.random() * 10 - 5)}px`;
      c.style.width = "8px";
      c.style.height = "8px";
      c.style.borderRadius = "2px";
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.zIndex = 11000;
      c.style.opacity = "0.95";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 1100);
    }
  }

  function flyCoin(fromX, fromY) {
    if (!CoinsUI) return;
    const coin = document.createElement("div");
    coin.className = "FlyCoin";
    coin.style.position = "fixed";
    coin.style.left = `${fromX}px`;
    coin.style.top = `${fromY}px`;
    coin.style.width = "18px";
    coin.style.height = "18px";
    coin.style.borderRadius = "50%";
    coin.style.background = "gold";
    coin.style.zIndex = 11000;
    document.body.appendChild(coin);
    const coinsRect = CoinsUI.getBoundingClientRect();
    const dx = coinsRect.left - fromX + 20;
    const dy = coinsRect.top - fromY + 10;
    coin.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.6)`, opacity: 0.25 }
    ], { duration: 700, easing: "cubic-bezier(.2,.9,.25,1)" });
    setTimeout(() => coin.remove(), 800);
  }

  function playSFX(aud) {
    try {
      if (aud) {
        aud.currentTime = 0;
        aud.play().catch(() => { });
      }
    } catch { }
  }

  /* -------------------------
     AddCoins
     ------------------------- */
  function AddCoins(amount = 0, animate = true) {
    amount = Number(amount) || 0;
    if (amount === 0) return;
    Coins = (Number(Coins) || 0) + amount;
    if (SaveManager && typeof SaveManager.SetCoins === "function") {
      SaveManager.SetCoins(Username, Coins);
    } else if (SaveManager && SaveManager.SaveUserData) {
      const ud = SaveManager.GetUserData(Username) || {};
      ud.Coins = Coins;
      SaveManager.SaveUserData(Username, Object.assign({}, ud));
    }
    UpdateCoinsUI();

    try {
      if (animate) {
        if (CoinsUI) {
          CoinsUI.classList.add("animate");
          setTimeout(() => CoinsUI.classList.remove("animate"), 350);
        }
        playSFX(document.getElementById("SFX_Coin"));
        if (Canvas && CoinsUI) {
          const cRect = Canvas.getBoundingClientRect();
          const fromX = Math.round(cRect.left + cRect.width / 2);
          const fromY = Math.round(cRect.top + cRect.height / 2);
          flyCoin(fromX, fromY);
        }
      }
    } catch (e) { }
  }

  function UpdateCoinsUI() {
    if (!CoinsUI) return;
    CoinsUI.innerHTML = `<span class="CurrencySymbol">🪙</span>`;
    CoinsUI.appendChild(CoinsAmountEl);
    CoinsAmountEl.style.color = "green";
    CoinsAmountEl.textContent = formatNumberSuffix(Coins);
    if (Coins > lastCoinAmount) {
      CoinsAmountEl.style.transform = "scale(1.35)";
      setTimeout(() => (CoinsAmountEl.style.transform = "scale(1)"), 300);
    }
    lastCoinAmount = Coins;
  }

  function formatNumberSuffix(v) {
    if (typeof v !== "number") v = Number(v) || 0;
    const Suffixes = ["", "k", "m", "b"];
    let idx = 0;
    while (v >= 1000 && idx < Suffixes.length - 1) { v /= 1000; idx++; }
    return v.toFixed(idx ? 1 : 0).replace(/\.0$/, "") + Suffixes[idx];
  }

  /* -------------------------
     Interaction UI
     ------------------------- */
  function PopulateChoices(question) {
    if (!ChoicesContainer) return;
    ChoicesContainer.innerHTML = "";
    question.Choices.forEach((text, index) => {
      const btn = document.createElement("div");
      btn.className = "Choice";
      btn.setAttribute("role", "listitem");
      btn.setAttribute("data-choice-index", String(index));
      btn.tabIndex = 0;
      btn.textContent = text;

      btn.addEventListener("click", () => {
        CurrentInteraction.selectedChoice = index;
        UpdateChoiceHighlight();
        SubmitChoice();
      });

      btn.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          CurrentInteraction.selectedChoice = index;
          UpdateChoiceHighlight();
          SubmitChoice();
        }
      });

      btn.addEventListener("mouseenter", () => {
        CurrentInteraction.selectedChoice = index;
        UpdateChoiceHighlight();
      });

      ChoicesContainer.appendChild(btn);
    });
  }

  const CurrentInteraction = { show: false, question: null, selectedChoice: 0, npc: null };

  function UpdateChoiceHighlight() {
    if (!ChoicesContainer) return;
    Array.from(ChoicesContainer.children).forEach((el, i) => {
      el.classList.toggle("selected", i === CurrentInteraction.selectedChoice);
      if (i === CurrentInteraction.selectedChoice) el.setAttribute("aria-selected", "true");
      else el.removeAttribute("aria-selected");
    });
    const selectedEl = ChoicesContainer.children[CurrentInteraction.selectedChoice];
    if (selectedEl && document.activeElement !== selectedEl) {
      try { selectedEl.focus({ preventScroll: true }); } catch (e) { }
    }
  }

  /* Submit and close interaction */
  function SubmitChoice() {
    if (!CurrentInteraction.question) return;
    const choice = CurrentInteraction.selectedChoice;
    const correct = choice === CurrentInteraction.question.AnswerIndex;

    SaveManager.RecordAnswer && SaveManager.RecordAnswer(Username, !!correct);

    if (correct) {
      const reward = Math.floor(Math.random() * 5) + 5;
      AddCoins(reward, true);
      SaveManager.AddXP && SaveManager.AddXP(Username, 15);
      SaveManager.BumpDailyCorrect && SaveManager.BumpDailyCorrect(Username, 1);
      SaveManager.AddAchievementProgress && SaveManager.AddAchievementProgress(Username, "help_friends", 1);
      showTemporaryBanner("Nice! You helped a friend and earned coins! ✨");
      playSFX(document.getElementById("SFX_Correct"));
      if (Canvas && CoinsUI) {
        const cRect = Canvas.getBoundingClientRect();
        const fx = Math.round(cRect.left + cRect.width / 2);
        const fy = Math.round(cRect.top + cRect.height / 2);
        for (let i = 0; i < 6; i++) {
          setTimeout(() => {
            flyCoin(fx + (Math.random() * 120 - 60), fy + (Math.random() * 40 - 20));
          }, i * 80);
        }
      }
    } else {
      showTemporaryBanner("Hmm — not quite. Try again or listen carefully!");
      playSFX(document.getElementById("SFX_Wrong"));
    }

    UpdateHUD();
    CloseInteraction();
  }

  function CloseInteraction() {
    CurrentInteraction.show = false;
    CurrentInteraction.question = null;
    CurrentInteraction.selectedChoice = 0;
    CurrentInteraction.npc = null;

    if (QuestionUI) {
      QuestionUI.classList.remove("visible");
      QuestionUI.setAttribute("aria-hidden", "true");
    }
    if (ChoicesContainer) ChoicesContainer.innerHTML = "";
    if (Canvas) Canvas.focus();
  }

  /* -------------------------
     Opening an interaction
     ------------------------- */
  function OpenInteractionWithNpc(npc) {
    if (!npc) return;
    if (CurrentInteraction.show) return;

    const now = Date.now();
    const cooldownMs = (npc.cooldownSeconds || 8) * 1000;
    if (npc.lastInteracted && now - npc.lastInteracted < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - (now - npc.lastInteracted)) / 1000);
      showTemporaryBanner(`They need a little rest — try again in ${remaining}s`);
      return;
    }

    const q = QuestionBank[Math.floor(Math.random() * QuestionBank.length)];
    const choices = q.Choices.slice();
    const correct = q.AnswerIndex;
    const correctText = choices[correct];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    const newIndex = choices.indexOf(correctText);

    CurrentInteraction.question = { Question: q.Question, Choices: choices, AnswerIndex: newIndex };
    CurrentInteraction.selectedChoice = 0;
    CurrentInteraction.show = true;
    CurrentInteraction.npc = npc;

    if (QuestionTextEl) QuestionTextEl.textContent = CurrentInteraction.question.Question;
    PopulateChoices(CurrentInteraction.question);
    if (QuestionUI) {
      QuestionUI.classList.add("visible");
      QuestionUI.setAttribute("aria-hidden", "false");
    }

    const first = ChoicesContainer.querySelector(".Choice");
    if (first) first.focus();
    UpdateChoiceHighlight();

    npc.lastInteracted = Date.now();

    try { TutorialManager.onUserTalkToNpc(); } catch (e) { }
  }

  /* -------------------------
     TryInteract - find nearest NPC within radius
     ------------------------- */
  function TryInteract() {
    if (CurrentInteraction.show) return;
    const tx = Math.floor(Player.X / BlockSize);
    const ty = Math.floor(Player.Y / BlockSize);

    let chosen = null;
    let chosenDist = Infinity;
    for (const n of Npcs) {
      const dx = (n.WorldX - tx);
      const dy = (n.WorldY - ty);
      const dsq = dx * dx + dy * dy;
      if (dsq <= 9) {
        const dist = Math.sqrt(dsq);
        if (dist < chosenDist) { chosenDist = dist; chosen = n; }
      }
    }

    if (!chosen) {
      showTemporaryBanner("There isn't anyone right here — try walking around to find friends to help!");
      return;
    }

    OpenInteractionWithNpc(chosen);
  }

  /* -------------------------
     Transient banner
     ------------------------- */
  function showTemporaryBanner(text, time = 1800) {
    let b = document.getElementById("TransientBanner");
    if (!b) {
      b = document.createElement("div");
      b.id = "TransientBanner";
      b.style.position = "fixed";
      b.style.left = "50%";
      b.style.top = "12%";
      b.style.transform = "translateX(-50%)";
      b.style.padding = "10px 18px";
      b.style.borderRadius = "12px";
      b.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)";
      b.style.background = "linear-gradient(180deg,#f8fff1,#e6f8e6)";
      b.style.color = "#186a16";
      b.style.fontWeight = "700";
      b.style.zIndex = 10001;
      b.style.transition = "opacity 280ms ease";
      document.body.appendChild(b);
    }
    b.textContent = text;
    b.style.opacity = "1";
    clearTimeout(b._t);
    b._t = setTimeout(() => (b.style.opacity = "0"), time);
  }

  /* -------------------------
     HUD & Top dock positioning + UpdateHUD
     ------------------------- */
  function positionTopDock() {
    if (!TopControlDock || !Canvas) return;
    const canvasRect = Canvas.getBoundingClientRect();
    const margin = 8;
    const navBarSafeTop = 70 + margin;
    const dockWidth = TopControlDock.offsetWidth || 120;
    const left = Math.max(canvasRect.left + margin, Math.min(canvasRect.left + 12 + 120, canvasRect.left + canvasRect.width - dockWidth - margin));
    const top = Math.max(canvasRect.top + margin, navBarSafeTop);
    TopControlDock.style.position = "fixed";
    TopControlDock.style.left = `${left}px`;
    TopControlDock.style.top = `${top}px`;
    TopControlDock.style.zIndex = 10005;
  }

  function UpdateHUD() {
    const d = SaveManager.GetUserData(Username) || {};
    const hud = document.getElementById("MiniHUD");
    if (!hud) return;
    const collapsed = !!d.HUDCollapsed;
    if (collapsed) {
      hud.classList.add("hidden");
      if (TopControlDock) {
        TopControlDock.style.display = "flex";
        TopControlDock.setAttribute("aria-hidden", "false");
        positionTopDock();
      }
      // Also ensure TopRightControls remain visible
      if (TopRightControls) TopRightControls.style.display = "flex";
    } else {
      hud.classList.remove("hidden");
      if (TopControlDock) {
        TopControlDock.style.display = "none";
        TopControlDock.setAttribute("aria-hidden", "true");
      }
      // Ensure TopRightControls still present on the right
      if (TopRightControls) TopRightControls.style.display = "flex";
    }
    const toggleBtn = document.getElementById("HUDToggleBtn");
    if (toggleBtn) toggleBtn.textContent = collapsed ? "+" : "—";
  }

  /* -------------------------
     Input handling
     ------------------------- */
  document.addEventListener("keydown", (e) => {
    const key = e.key;
    const lk = key.toLowerCase();

    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(lk)) {
      Keys[lk] = true;
      e.preventDefault();
    }

    if (lk === "e") {
      e.preventDefault();
      if (CurrentInteraction.show) SubmitChoice();
      else TryInteract();
      return;
    }

    if (TutorialManager.isActive()) TutorialManager.onKeyPressed(key);

    if (CurrentInteraction.show) handleInteractionNavigation(key, e);
  });

  document.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
      Keys[k] = false;
    }
  });

  /* keyboard nav in question UI */
  function handleInteractionNavigation(key, e) {
    if (!CurrentInteraction.question) return;
    const cols = 2;
    const rows = Math.ceil(CurrentInteraction.question.Choices.length / cols);
    let sel = CurrentInteraction.selectedChoice;
    const r = Math.floor(sel / cols);
    const c = sel % cols;

    if (key === "ArrowRight") {
      const nc = (c + 1) % cols;
      sel = r * cols + nc;
      sel = Math.min(sel, CurrentInteraction.question.Choices.length - 1);
      CurrentInteraction.selectedChoice = sel;
      UpdateChoiceHighlight();
      e.preventDefault();
      return;
    }
    if (key === "ArrowLeft") {
      const nc = (c - 1 + cols) % cols;
      sel = r * cols + nc;
      sel = Math.max(0, Math.min(sel, CurrentInteraction.question.Choices.length - 1));
      CurrentInteraction.selectedChoice = sel;
      UpdateChoiceHighlight();
      e.preventDefault();
      return;
    }
    if (key === "ArrowDown") {
      const nr = Math.min(rows - 1, r + 1);
      sel = nr * cols + c;
      sel = Math.min(sel, CurrentInteraction.question.Choices.length - 1);
      CurrentInteraction.selectedChoice = sel;
      UpdateChoiceHighlight();
      e.preventDefault();
      return;
    }
    if (key === "ArrowUp") {
      const nr = Math.max(0, r - 1);
      sel = nr * cols + c;
      sel = Math.max(0, Math.min(sel, CurrentInteraction.question.Choices.length - 1));
      CurrentInteraction.selectedChoice = sel;
      UpdateChoiceHighlight();
      e.preventDefault();
      return;
    }
    if (key === "Enter") {
      SubmitChoice(); e.preventDefault(); return;
    }
    if (key === "Escape") { CloseInteraction(); e.preventDefault(); return; }
  }

  /* -------------------------
     TutorialManager
     ------------------------- */
  const TutorialManager = (function () {
    let active = false;
    let overlay = null;
    let stage = -1;
    const neededKeys = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
    const pressedKeys = new Set();
    let pointer = null;

    function createFullOverlay() {
      if (overlay) return overlay;
      overlay = document.createElement("div");
      overlay.id = "TutFull";
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.display = "flex";
      overlay.style.justifyContent = "center";
      overlay.style.alignItems = "center";
      overlay.style.background = "rgba(0,0,0,0.85)";
      overlay.style.zIndex = 10000;
      overlay.style.transition = "background 450ms ease";
      overlay.style.pointerEvents = "auto";

      const card = document.createElement("div");
      card.id = "TutCard";
      card.style.maxWidth = "640px";
      card.style.width = "80%";
      card.style.borderRadius = "14px";
      card.style.padding = "18px";
      card.style.boxShadow = "0 12px 36px rgba(0,0,0,0.5)";
      card.style.background = "#f9fff6";
      card.style.color = "#2e6b2e";
      card.style.transition = "all 650ms cubic-bezier(.2,.9,.25,1)";
      card.style.pointerEvents = "auto";

      card.innerHTML = `
        <h2 style="margin:0 0 8px;font-size:1.5rem">🌱 Welcome to Aspiration!</h2>
        <p style="margin:8px 0;font-weight:700">Objective — Help friends, collect coins, and unlock surprises!</p>
        <p style="margin:8px 0">Walk with <b>WASD</b> or <b>arrow keys</b>. Talk by pressing <b>E</b> when the green prompt appears. Answer questions to earn coins.</p>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
          <button id="TutProceed" class="NavLinkButton">Proceed</button>
          <button id="TutSkip" class="NavLinkButton" style="background:#ddd;color:#111">Skip</button>
        </div>
      `;
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      return overlay;
    }

    function showFullScreen() {
      const ov = createFullOverlay();
      ov.style.display = "flex";
      const proceed = document.getElementById("TutProceed");
      const skip = document.getElementById("TutSkip");
      if (proceed) proceed.addEventListener("click", proceedToCorner);
      if (skip) skip.addEventListener("click", skipAll);
      stopLocalPlayTimer();
    }

    function proceedToCorner() {
      if (!overlay) return;
      const card = document.getElementById("TutCard");
      if (!card) return;

      overlay.style.background = "transparent";
      overlay.style.pointerEvents = "none";
      card.style.pointerEvents = "auto";

      setTimeout(() => {
        card.style.width = "320px";
        card.style.maxWidth = "320px";
        card.style.borderRadius = "12px";
        card.style.padding = "12px";
        card.style.position = "fixed";
        card.style.right = "12px";
        card.style.bottom = "12px";
        card.style.left = "auto";
        card.style.top = "auto";
        card.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)";
        card.style.background = "#f9fff6";
        card.style.zIndex = 10003;
        setTimeout(() => {
          stage = 1; active = true; showStage(1);
        }, 450);
      }, 20);
    }

    function skipAll() {
      if (overlay) overlay.style.display = "none";
      SaveManager.SetHasSeenTutorial && SaveManager.SetHasSeenTutorial(Username, true);
      active = false; startLocalPlayTimer();
    }

    function showStage(s) {
      stage = s;
      if (!overlay) createFullOverlay();
      const card = document.getElementById("TutCard");
      if (!card) return;

      if (s === 1) {
        card.innerHTML = `
          <div style="font-weight:800">Step 1 — Move</div>
          <div style="margin-top:8px;font-size:0.95rem">Press: W A S D and Arrow Up / Down / Left / Right — press each key once to continue.</div>
          <div style="margin-top:10px"><small style="color:#5b8a36">Tip: you can walk while this guide is visible — go explore the world!</small></div>
          <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
            <button id="TutResetKeys" class="NavLinkButton" style="background:#eee;color:#111">Reset</button>
          </div>
          <div id="TutProgress" style="margin-top:10px"></div>
        `;
        updateKeyProgressUI();
        const resetBtn = document.getElementById("TutResetKeys");
        if (resetBtn) resetBtn.addEventListener("click", () => { pressedKeys.clear(); updateKeyProgressUI(); });
      } else if (s === 2) {
        card.innerHTML = `
          <div style="font-weight:800">Step 2 — Talk to a friend</div>
          <div style="margin-top:8px;font-size:0.95rem">Find a friendly character. When you see the green <b>E</b> prompt near someone, press <b>E</b> to talk. You must actually open a conversation to continue.</div>
          <div style="margin-top:10px"><small style="color:#5b8a36">The game will point you to the nearest friend if you need help.</small></div>
        `;
        ensurePointer();
      } else if (s === 3) {
        card.innerHTML = `
          <div style="font-weight:800">Step 3 — Answer & Earn</div>
          <div style="margin-top:8px;font-size:0.95rem">When a friend asks a question, choose the correct answer to help them and earn coins.</div>
          <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end">
            <button id="TutFinish" class="NavLinkButton">Done</button>
          </div>
        `;
        const fin = document.getElementById("TutFinish");
        if (fin) fin.addEventListener("click", finishTutorialAndStart);
      }
    }

    function ensurePointer() {
      if (!pointer) {
        pointer = document.createElement("div");
        pointer.id = "TutPointer";
        pointer.className = "TutorialPointer";
        pointer.textContent = "➡️";
        document.body.appendChild(pointer);
        pointer.style.opacity = "0";
        pointer.style.transition = "transform .18s ease, opacity .18s";
      }
    }

    function removePointer() {
      if (pointer) {
        pointer.remove();
        pointer = null;
      }
    }

    function updatePointerToClosestNpc() {
      if (!pointer) return;
      let closest = null;
      let dist = Infinity;
      for (const n of Npcs) {
        const dx = (n.WorldX * BlockSize) - Player.X;
        const dy = (n.WorldY * BlockSize) - Player.Y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < dist) {
          dist = d; closest = n;
        }
      }
      if (!closest) {
        pointer.style.opacity = "0";
        return;
      }
      const canvasRect = Canvas.getBoundingClientRect();
      const sx = canvasRect.left + (closest.WorldX * BlockSize - (Player.X - canvasRect.width / 2));
      const sy = canvasRect.top + (closest.WorldY * BlockSize - (Player.Y - canvasRect.height / 2));
      const px = Math.max(12, Math.min(window.innerWidth - 40, sx));
      const py = Math.max(12, Math.min(window.innerHeight - 40, sy));
      pointer.style.left = `${px}px`;
      pointer.style.top = `${py}px`;
      pointer.style.opacity = "1";
      const cx = canvasRect.left + canvasRect.width / 2;
      const cy = canvasRect.top + canvasRect.height / 2;
      const angle = Math.atan2(py - cy, px - cx);
      pointer.style.transform = `rotate(${angle}rad) translate(0,0)`;
    }

    function proceedToTalk() { showStage(2); }

    function finishTutorialAndStart() { endTutorial(true); }

    function endTutorial(saveSeenFlag) {
      active = false;
      if (overlay) overlay.style.display = "none";
      SaveManager.SetHasSeenTutorial && SaveManager.SetHasSeenTutorial(Username, !!saveSeenFlag);
      startLocalPlayTimer();
      removePointer();
    }

    function onKeyPressed(key) {
      if (!active) return;
      if (stage === 1) {
        const lk = key.toLowerCase();
        if (neededKeys.has(lk)) {
          pressedKeys.add(lk);
          updateKeyProgressUI();
        }
        const allPressed = Array.from(neededKeys).every(k => pressedKeys.has(k));
        if (allPressed) {
          setTimeout(() => { stage = 2; showStage(2); }, 450);
        }
      }
    }

    function startIfNeeded(force = false) {
      const hasSeen = SaveManager.GetHasSeenTutorial && SaveManager.GetHasSeenTutorial(Username);
      if (hasSeen && !force) return false;
      showFullScreen();
      active = true;
      return true;
    }

    function onUserTalkToNpc() {
      if (!active) return;
      if (stage === 2) {
        setTimeout(() => { stage = 3; showStage(3); }, 350);
      }
    }

    function updateKeyProgressUI() {
      const prog = document.getElementById("TutProgress");
      if (!prog) return;
      const keys = ["W", "A", "S", "D", "↑", "↓", "←", "→"];
      const mapping = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];
      prog.innerHTML = "";
      mapping.forEach((k, i) => {
        const ok = pressedKeys.has(k);
        const el = document.createElement("span");
        el.style.display = "inline-block";
        el.style.minWidth = "32px";
        el.style.padding = "6px 8px";
        el.style.marginRight = "6px";
        el.style.borderRadius = "8px";
        el.style.fontWeight = "700";
        el.style.background = ok ? "#dcedc8" : "#f1f8e9";
        el.style.color = ok ? "#2e7d32" : "#6b8f5a";
        el.textContent = keys[i];
        prog.appendChild(el);
      });
    }

    return { startIfNeeded, isActive: () => active, onKeyPressed, onUserTalkToNpc, updatePointerToClosestNpc };
  })();

  /* -------------------------
     Timers & saving
     ------------------------- */
  let secondsPlayed = SaveManager.GetTimePlayed(Username) || 0;
  let playTick = null;
  let tabVisible = document.visibilityState === "visible";

  function tickSaveOnce() {
    if (tabVisible) {
      secondsPlayed += 1;
      SaveManager.IncrementTimePlayed && SaveManager.IncrementTimePlayed(Username);
      SaveManager.IncrementDailyPlaySeconds && SaveManager.IncrementDailyPlaySeconds(Username, 1);

      if (secondsPlayed % 5 === 0) {
        const user = SaveManager.GetUserData(Username) || {};
        const recordedLongest = user.LongestSession || 0;
        if (secondsPlayed > recordedLongest) {
          SaveManager.SaveUserData && SaveManager.SaveUserData(Username, Object.assign({}, user, { LongestSession: secondsPlayed }));
        }
      }
    }
  }

  function startLocalPlayTimer() { if (playTick) return; playTick = setInterval(tickSaveOnce, 1000); }
  function stopLocalPlayTimer() { if (!playTick) return; clearInterval(playTick); playTick = null; }

  window.addEventListener("beforeunload", () => {
    SaveManager.SaveUserData && SaveManager.SaveUserData(Username, Object.assign({}, SaveManager.GetUserData(Username) || {}, { TimePlayed: secondsPlayed }));
    const user = SaveManager.GetUserData(Username) || {};
    const recordedLongest = user.LongestSession || 0;
    if (secondsPlayed > recordedLongest) {
      SaveManager.SaveUserData && SaveManager.SaveUserData(Username, Object.assign({}, user, { LongestSession: secondsPlayed }));
    }
  });

  document.addEventListener("visibilitychange", () => { tabVisible = document.visibilityState === "visible"; });

  /* -------------------------
     Proximity prompt handlers
     ------------------------- */
  if (ProximityPromptEl) {
    ProximityPromptEl.addEventListener("click", (ev) => { ev.preventDefault(); TryInteract(); });
    ProximityPromptEl.addEventListener("contextmenu", (ev) => { ev.preventDefault(); TryInteract(); });
    ProximityPromptEl.addEventListener("touchstart", (ev) => { ev.preventDefault(); TryInteract(); }, { passive: false });
    ProximityPromptEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); TryInteract(); }
    });
  }

  /* -------------------------
     UI init & event wiring
     ------------------------- */
  function UpdateUsernameUI() {
    try {
      const nodes = document.querySelectorAll("#UsernameDisplay, .Username, .UsernameDisplay");
      nodes.forEach(el => {
        const name = SaveManager.GetCurrentUser ? (SaveManager.GetCurrentUser() || "Guest") : Username;
        if ("value" in el) el.value = name;
        else el.textContent = name;
      });

      // Update nav-level small display if present
      const navLevel = document.getElementById("PlayerLevelDisplay");
      const playerLevel = SaveManager.GetLevel ? (SaveManager.GetLevel(Username) || 1) : (SaveManager.GetUserData(Username)?.Level || 1);
      if (navLevel) navLevel.textContent = `Lv ${playerLevel}`;
      const hudLevel = document.getElementById("PlayerLevel");
      if (hudLevel) hudLevel.textContent = `${playerLevel}`;

    } catch (e) { /* ignore DOM update errors */ }
  }

  function initUIControls() {
    const mute = document.getElementById("MuteBtn");
    const topMute = document.getElementById("TopMuteBtn");
    const topUnhide = document.getElementById("TopUnhideBtn");
    const hudToggle = document.getElementById("HUDToggleBtn");
    const shopOpenBtn = document.getElementById("ShopOpenBtn");
    const closeShopBtn = document.getElementById("CloseShopBtn");
    const sfxIds = ["SFX_Correct", "SFX_Wrong", "SFX_Coin", "SFX_LevelUp"];
    const sfx = sfxIds.map(id => document.getElementById(id));
    const user = SaveManager.GetUserData(Username) || {};
    const initialMuted = !!user.Muted;

    function setMute(m) {
      sfx.forEach(a => { if (a) a.muted = !!m; });
      if (SaveManager.SaveUserData) {
        const existing = SaveManager.GetUserData(Username) || {};
        SaveManager.SaveUserData(Username, Object.assign({}, existing, { Muted: !!m }));
      }
      const btn = document.getElementById("MuteBtn");
      if (btn) { btn.textContent = m ? "🔇" : "🔊"; btn.setAttribute("aria-pressed", m ? "true" : "false"); }
      const topBtn = document.getElementById("TopMuteBtn");
      if (topBtn) { topBtn.textContent = m ? "🔇" : "🔊"; topBtn.setAttribute("aria-pressed", m ? "true" : "false"); }
    }
    setMute(initialMuted);

    if (mute) mute.addEventListener("click", () => setMute(!SaveManager.GetUserData(Username)?.Muted));
    if (topMute) topMute.addEventListener("click", () => setMute(!SaveManager.GetUserData(Username)?.Muted));

    if (hudToggle) {
      hudToggle.addEventListener("click", () => {
        const existing = SaveManager.GetUserData(Username) || {};
        const newVal = !existing.HUDCollapsed;
        if (SaveManager.SaveUserData) {
          SaveManager.SaveUserData(Username, Object.assign({}, existing, { HUDCollapsed: newVal }));
        }
        UpdateHUD();
        if (newVal) positionTopDock();
      });
    }

    if (TopControlDock) {
      const topUnhideBtn = document.getElementById("TopUnhideBtn");
      if (topUnhideBtn) topUnhideBtn.addEventListener("click", () => {
        const existing = SaveManager.GetUserData(Username) || {};
        if (SaveManager.SaveUserData) {
          SaveManager.SaveUserData(Username, Object.assign({}, existing, { HUDCollapsed: false }));
        }
        UpdateHUD();
      });
    }

    if (shopOpenBtn) {
      shopOpenBtn.addEventListener("click", () => {
        const panel = document.getElementById("ShopPanel");
        if (!panel) return;
        panel.classList.remove("hidden");
        panel.setAttribute("aria-hidden", "false");
        panel.style.display = "block";
      });
    }

    if (closeShopBtn) {
      closeShopBtn.addEventListener("click", () => {
        const panel = document.getElementById("ShopPanel");
        if (!panel) return;
        panel.classList.add("hidden");
        panel.setAttribute("aria-hidden", "true");
        panel.style.display = "none";
      });
    }

    window.addEventListener("resize", () => {
      positionTopDock();
      resizeCanvasForDisplay();
      TutorialManager.updatePointerToClosestNpc && TutorialManager.updatePointerToClosestNpc();
    });
    window.addEventListener("scroll", positionTopDock);

    // Make sure username text updated now
    UpdateUsernameUI();
    UpdateCoinsUI();

    // Ensure TopRightControls visible
    if (TopRightControls) TopRightControls.style.display = TopRightControls.style.display || "flex";
  }

  /* -------------------------
     Canvas DPI / Resize helpers
     ------------------------- */
  function resizeCanvasForDisplay() {
    if (!Canvas || !Ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const clientWidth = Math.floor(Canvas.clientWidth || window.innerWidth);
    const clientHeight = Math.floor(Canvas.clientHeight || (window.innerHeight - 70));

    if (clientWidth === lastCanvasClientWidth && clientHeight === lastCanvasClientHeight && dpr === lastDPR) {
      return;
    }

    lastCanvasClientWidth = clientWidth;
    lastCanvasClientHeight = clientHeight;
    lastDPR = dpr;

    const width = Math.max(1, Math.floor(clientWidth * dpr));
    const height = Math.max(1, Math.floor(clientHeight * dpr));

    Canvas.width = width;
    Canvas.height = height;

    Canvas.style.width = clientWidth + "px";
    Canvas.style.height = clientHeight + "px";

    Ctx.setTransform(1, 0, 0, 1, 0, 0);
    Ctx.scale(dpr, dpr);

    Draw();
  }

  /* -------------------------
     Main Draw & Update
     ------------------------- */
  function Draw() {
    if (!Canvas || !Ctx) return;
    const cw = Canvas.clientWidth || window.innerWidth;
    const ch = Canvas.clientHeight || (window.innerHeight - 70);
    Ctx.clearRect(0, 0, cw, ch);

    const offsetX = Player.X - cw / 2;
    const offsetY = Player.Y - ch / 2;
    const startX = Math.floor(offsetX / BlockSize) - 1;
    const startY = Math.floor(offsetY / BlockSize) - 1;
    const cols = Math.ceil(cw / BlockSize) + 2;
    const rows = Math.ceil(ch / BlockSize) + 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const wx = startX + col;
        const wy = startY + row;
        const sx = Math.round(col * BlockSize - ((offsetX % BlockSize) + BlockSize) % BlockSize);
        const sy = Math.round(row * BlockSize - ((offsetY % BlockSize) + BlockSize) % BlockSize);
        const tile = GetTile(wx, wy);
        const d = (img, c) => DrawImage(img, c, sx, sy);

        if (tile === "Ocean") d(Images.Water, "#1E90FF");
        else if (tile === "River") d(Images.Water, "#00BFFF");
        else if (tile === "Sand") d(Images.Sand, "#FFD700");
        else if (tile === "Ground") d(Images.Ground, "#4CAF50");
        else if (tile === "Tree") d(Images.Tree, "#096f00ff");
        else if (tile === "Rock") d(Images.Rock, "#4d4d4dff");
        else if (tile === "Flower") d(Images.Flower, "pink");
        else if (tile === "Grass") d(Images.Grass, "#3CB371");
        else d(Images.Ground, "#4CAF50");
      }
    }

    let closestNpc = null;
    let closestDist = Infinity;
    const globalTime = performance.now() / 1000;
    for (const n of Npcs) {
      const sx = Math.round(n.WorldX * BlockSize - offsetX);
      let sy = Math.round(n.WorldY * BlockSize - offsetY);
      const bob = Math.sin(globalTime * 2 + (n.bobSeed % 1000) * 0.01) * 6;
      sy += bob;

      const img = NpcImages[n.TextureName];
      if (!img || img.failed || !img.loaded || !img.complete || img.naturalWidth === 0) {
        Ctx.fillStyle = "#FF0000";
        Ctx.fillRect(sx, sy, BlockSize, BlockSize);
      } else {
        try { Ctx.drawImage(img, sx, sy, BlockSize, BlockSize); }
        catch (err) { Ctx.fillStyle = "#FF0000"; Ctx.fillRect(sx, sy, BlockSize, BlockSize); }
      }

      const dx = Player.X / BlockSize - n.WorldX;
      const dy = Player.Y / BlockSize - n.WorldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 3 && dist < closestDist) { closestDist = dist; closestNpc = { screenX: sx, screenY: sy, npc: n }; }
    }

    const moving = (Keys["w"] || Keys["a"] || Keys["s"] || Keys["d"] || Keys["arrowup"] || Keys["arrowdown"] || Keys["arrowleft"] || Keys["arrowright"]);
    const bob = Math.sin(globalTime * (moving ? 12 : 2)) * (moving ? 4 : 2);
    const rot = Math.sin(globalTime * (moving ? 10 : 2)) * (moving ? 0.06 : 0.02);

    const px = Math.round(cw / 2 - Player.Size / 2);
    const py = Math.round(ch / 2 - Player.Size / 2 + bob);

    if (Images.Player && Images.Player.loaded && !Images.Player.failed) {
      try { drawRotatedImage(Images.Player, px, py, Player.Size, Player.Size, rot); }
      catch (err) { DrawImage(Images.Player, "blue", px, py, Player.Size, Player.Size); }
    } else {
      DrawImage(Images.Player, "blue", px, py, Player.Size, Player.Size);
    }

    if (!CurrentInteraction.show && closestNpc && ProximityPromptEl) {
      const promptRect = ProximityPromptEl.getBoundingClientRect();
      const canvasRect = Canvas.getBoundingClientRect();
      const npcCenterX = canvasRect.left + closestNpc.screenX + BlockSize / 2;
      const npcTopY = canvasRect.top + closestNpc.screenY;
      const left = npcCenterX - (promptRect.width / 2 || 16);
      const top = npcTopY - (promptRect.height || 32) - 6;
      ProximityPromptEl.style.position = "fixed";
      ProximityPromptEl.style.left = `${left}px`;
      ProximityPromptEl.style.top = `${top}px`;
      ProximityPromptEl.classList.add("visible");
      ProximityPromptEl.style.opacity = "1";
    } else if (ProximityPromptEl) {
      ProximityPromptEl.classList.remove("visible");
      ProximityPromptEl.style.opacity = "0";
    }
  }

  /* Update(dt) */
  function Update(dt) {
    if (!CurrentInteraction.show) {
      const speed = 200;
      let dx = 0, dy = 0;
      if (Keys["w"] || Keys["arrowup"]) dy -= 1;
      if (Keys["s"] || Keys["arrowdown"]) dy += 1;
      if (Keys["a"] || Keys["arrowleft"]) dx -= 1;
      if (Keys["d"] || Keys["arrowright"]) dx += 1;
      if (dx !== 0 && dy !== 0) {
        const inv = 1 / Math.sqrt(2);
        dx *= inv; dy *= inv;
      }
      Player.X += dx * speed * dt;
      Player.Y += dy * speed * dt;
      SaveManager.SetPlayerPosition && SaveManager.SetPlayerPosition(Username, Player.X, Player.Y);
    }
  }

  /* -------------------------
     Animation loop
     ------------------------- */
  function GameLoop(ts) {
    if (!ts) ts = performance.now();
    let rawDt = (ts - lastFrameTs) / 1000;
    lastFrameTs = ts;
    if (rawDt > MAX_DT) rawDt = MAX_DT;

    Update(rawDt);
    Draw();

    requestAnimationFrame(GameLoop);
  }

  /* -------------------------
     Init & wiring
     ------------------------- */
  function InitPlayerPosition() {
    const pos = SaveManager.GetPlayerPosition ? SaveManager.GetPlayerPosition(Username) : { X: 0, Y: 0 };
    Player.X = pos.X || 0;
    Player.Y = pos.Y || 0;
  }

  InitPlayerPosition();
  resizeCanvasForDisplay();
  UpdateCoinsUI();
  initUIControls();
  UpdateHUD();

  if (!SaveManager.GetHasSeenTutorial || !SaveManager.GetHasSeenTutorial(Username)) {
    TutorialManager.startIfNeeded();
  } else {
    startLocalPlayTimer();
  }

  /* ensure top dock positioned and visible when HUD collapsed */
  positionTopDock();

  lastFrameTs = performance.now();
  requestAnimationFrame(GameLoop);

  window.__GAME_DEBUG = {
    getState: () => ({
      Player: { ...Player },
      Coins,
      NpcsCount: Npcs.length,
      CurrentInteraction: { ...CurrentInteraction }
    }),
    positionTopDock,
    resizeCanvasForDisplay
  };

  /* -------------------------
     Additional DOM wiring: nav, shop, initial UI fixups
     ------------------------- */
  // Use DOMContentLoaded to ensure elements exist
  document.addEventListener("DOMContentLoaded", () => {
    // Nav buttons - keep routes consistent with home file names
    const homeBtn = document.getElementById("NavHomeBtn");
    const playBtn = document.getElementById("NavPlayBtn");
    if (homeBtn) {
      homeBtn.addEventListener("click", () => {
        window.location.href = "../Files_HTML/Child-Home.html";
      });
    }
    if (playBtn) {
      playBtn.addEventListener("click", () => {
        window.location.href = "../Files_HTML/Child-Play.html";
      });
    }

    // Ensure top dock is positioned and username updated after DOM load
    positionTopDock();
    UpdateUsernameUI();

    // Shop wiring (in case shop was hidden by default)
    const shopOpen = document.getElementById("ShopOpenBtn");
    const shopPanel = document.getElementById("ShopPanel");
    const closeShop = document.getElementById("CloseShopBtn");
    if (shopOpen && shopPanel) {
      shopOpen.addEventListener("click", () => {
        shopPanel.classList.remove("hidden");
        shopPanel.setAttribute("aria-hidden", "false");
        shopPanel.style.display = "block";
      });
    }
    if (closeShop && shopPanel) {
      closeShop.addEventListener("click", () => {
        shopPanel.classList.add("hidden");
        shopPanel.setAttribute("aria-hidden", "true");
        shopPanel.style.display = "none";
      });
    }

    // Ensure TopRightControls visible
    if (TopRightControls) {
      TopRightControls.style.display = TopRightControls.style.display || "flex";
    }
  });
})();