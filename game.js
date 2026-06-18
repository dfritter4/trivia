// Totally Rad Trivia — front-end game logic. Vanilla JS, no build step.
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const KEYS = ["A", "B", "C", "D", "E", "F"];

  const state = {
    questions: [],
    index: 0,
    score: 0,
    points: 0,
    streak: 0,
    bestStreak: 0,
    settings: { count: 10, time: 15, theme: null, difficulty: "any" },
    timer: null,
    timeLeft: 0,
    answered: false,
  };

  // ---------- small DOM helpers (textContent only — no innerHTML) ----------
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  // ---------- screen switching ----------
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $("#" + id).classList.add("active");
  }

  // ---------- start screen pickers ----------
  // Generic single-select picker: clicking a .count-btn sets state.settings[key].
  function wirePicker(containerSel, key, attr, parse) {
    const container = $(containerSel);
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".count-btn");
      if (!btn || btn.disabled) return;
      container.querySelectorAll(".count-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const raw = btn.getAttribute(attr);
      state.settings[key] = parse ? parse(raw) : raw;
    });
  }

  // Load themes from the API and render the theme picker.
  async function loadThemes() {
    const picker = $("#theme-picker");
    try {
      const res = await fetch("/api/meta");
      if (!res.ok) throw new Error("bad status " + res.status);
      const meta = await res.json();
      clear(picker);
      meta.themes.forEach((t, i) => {
        const btn = el("button", "count-btn theme-btn" + (i === 0 ? " active" : ""));
        btn.setAttribute("data-theme", t.name);
        btn.appendChild(el("span", "theme-emoji", t.emoji));
        btn.appendChild(el("span", "theme-name", t.name));
        picker.appendChild(btn);
      });
      state.settings.theme = meta.themes.length ? meta.themes[0].name : null;
    } catch (err) {
      clear(picker);
      const btn = el("button", "count-btn theme-btn", "Couldn't load themes — is the server running?");
      btn.disabled = true;
      picker.appendChild(btn);
    }
  }

  // ---------- game flow ----------
  async function startGame() {
    if (!state.settings.theme) {
      alert("Pick a theme first!");
      return;
    }
    try {
      const params = new URLSearchParams({
        count: state.settings.count,
        theme: state.settings.theme,
      });
      if (state.settings.difficulty && state.settings.difficulty !== "any") {
        params.set("difficulty", state.settings.difficulty);
      }
      const res = await fetch(`/api/round?${params.toString()}`);
      const data = await res.json();
      if (!data.questions || data.questions.length === 0) {
        alert("No questions found for that theme/difficulty. Try 'Any' difficulty.");
        return;
      }
      state.questions = data.questions;
    } catch (err) {
      alert("Couldn't load questions. Is the server running?");
      return;
    }
    state.index = 0;
    state.score = 0;
    state.points = 0;
    state.streak = 0;
    state.bestStreak = 0;
    show("screen-quiz");
    renderQuestion();
  }

  function renderQuestion() {
    state.answered = false;
    const q = state.questions[state.index];

    $("#q-progress").textContent = `${state.index + 1}/${state.questions.length}`;
    $("#score").textContent = state.score;
    $("#streak").textContent = state.streak;
    $("#category-tag").textContent = q.difficulty ? `${q.category} · ${q.difficulty}` : q.category;
    $("#question").textContent = q.q;
    $("#feedback").classList.remove("show");

    const choicesEl = $("#choices");
    clear(choicesEl);
    q.choices.forEach((choice, i) => {
      const btn = el("button", "choice");
      btn.appendChild(el("span", "key", KEYS[i]));
      btn.appendChild(el("span", null, choice));
      btn.addEventListener("click", () => selectAnswer(i));
      choicesEl.appendChild(btn);
    });

    startTimer();
  }

  function startTimer() {
    clearInterval(state.timer);
    const bar = $("#timer-bar");
    bar.classList.remove("warn");

    if (!state.settings.time) {
      // Infinite mode — full bar, no countdown.
      bar.style.transition = "none";
      bar.style.transform = "scaleX(1)";
      return;
    }

    state.timeLeft = state.settings.time;
    const total = state.settings.time;
    bar.style.transition = "none";
    bar.style.transform = "scaleX(1)";
    // force reflow then animate down smoothly
    void bar.offsetWidth;
    bar.style.transition = `transform ${total}s linear`;
    bar.style.transform = "scaleX(0)";

    state.timer = setInterval(() => {
      state.timeLeft -= 0.1;
      if (state.timeLeft <= total * 0.33) bar.classList.add("warn");
      if (state.timeLeft <= 0) {
        clearInterval(state.timer);
        selectAnswer(-1); // timed out
      }
    }, 100);
  }

  function selectAnswer(choice) {
    if (state.answered) return;
    state.answered = true;
    clearInterval(state.timer);

    const q = state.questions[state.index];
    const buttons = Array.from(document.querySelectorAll(".choice"));
    buttons.forEach((b, i) => {
      b.setAttribute("disabled", "true");
      if (i === q.answer) b.classList.add("correct");
      else if (i === choice) b.classList.add("wrong");
      else b.classList.add("dim");
    });

    const correct = choice === q.answer;
    const fb = $("#feedback");
    const fbText = $("#feedback-text");

    if (correct) {
      // Speed bonus: faster answers earn more (only in timed mode).
      let gained = 100;
      if (state.settings.time) {
        gained += Math.round((state.timeLeft / state.settings.time) * 100);
      }
      state.score += 1;
      state.points += gained;
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      fbText.textContent = state.streak >= 3 ? `🔥 ${state.streak} IN A ROW! +${gained}` : `✅ Correct! +${gained}`;
      fbText.className = "feedback-text good";
    } else {
      state.streak = 0;
      fbText.textContent = choice === -1 ? "⏰ Time's up!" : "❌ Nope!";
      fbText.className = "feedback-text bad";
    }

    $("#fact-text").textContent = q.fact || "";
    $("#btn-next").textContent = state.index + 1 >= state.questions.length ? "SEE RESULTS 🏆" : "NEXT ▶";
    fb.classList.add("show");
    $("#score").textContent = state.score;
    $("#streak").textContent = state.streak;
  }

  function next() {
    state.index += 1;
    if (state.index >= state.questions.length) showResults();
    else renderQuestion();
  }

  // ---------- results ----------
  function showResults() {
    const total = state.questions.length;
    const pct = total ? Math.round((state.score / total) * 100) : 0;
    $("#result-score").textContent = `${state.score} / ${total}`;
    $("#result-pct").textContent = `${pct}%`;
    $("#best-streak").textContent = state.bestStreak;
    $("#result-points").textContent = state.points;

    let rank, emoji, blurb;
    if (pct === 100) {
      rank = "LEGEND"; emoji = "👑";
      blurb = "Flawless. A perfect run — nobody's beating that. Go brag.";
    } else if (pct >= 80) {
      rank = "Totally Rad"; emoji = "🏆";
      blurb = "Certified expert. You clearly know your stuff.";
    } else if (pct >= 60) {
      rank = "Pretty Fly"; emoji = "😎";
      blurb = "Solid run! A little more and you'd be unstoppable.";
    } else if (pct >= 40) {
      rank = "Buffering…"; emoji = "📼";
      blurb = "Not bad — a few got away. Run it back!";
    } else {
      rank = "404 Not Found"; emoji = "💾";
      blurb = "Rough round. Time for a refresher — try again!";
    }
    $("#result-rank").textContent = rank;
    $("#result-emoji").textContent = emoji;
    $("#result-blurb").textContent = blurb;
    show("screen-results");
  }

  // keyboard support (desktop): A-D / 1-4, Enter for next
  document.addEventListener("keydown", (e) => {
    if (!$("#screen-quiz").classList.contains("active")) return;
    if (!state.answered) {
      const letterIdx = KEYS.indexOf(e.key.toUpperCase());
      const numIdx = parseInt(e.key, 10) - 1;
      const idx = letterIdx >= 0 ? letterIdx : numIdx;
      const buttons = document.querySelectorAll(".choice");
      if (idx >= 0 && idx < buttons.length) buttons[idx].click();
    } else if (e.key === "Enter" || e.key === " ") {
      next();
    }
  });

  // ---------- init ----------
  wirePicker("#theme-picker", "theme", "data-theme");
  wirePicker("#difficulty-picker", "difficulty", "data-difficulty");
  wirePicker("#count-picker", "count", "data-count", (v) => parseInt(v, 10));
  wirePicker("#timer-picker", "time", "data-time", (v) => parseInt(v, 10));
  $("#btn-start").addEventListener("click", startGame);
  $("#btn-next").addEventListener("click", next);
  $("#btn-again").addEventListener("click", startGame);
  $("#btn-home").addEventListener("click", () => show("screen-start"));
  loadThemes();
})();
