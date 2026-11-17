(() => {
  "use strict";

  const root = document.documentElement;
  const themeToggle = document.querySelector(".theme-toggle");
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");

  // Theme preference is local to this browser and safely optional.
  try {
    const storedTheme = localStorage.getItem("sksu-rfid-theme");
    if (storedTheme === "dark") root.dataset.theme = "dark";
  } catch (error) {
    // localStorage may be unavailable in restrictive browsing contexts.
  }

  themeToggle?.addEventListener("click", () => {
    const dark = root.dataset.theme !== "dark";
    root.dataset.theme = dark ? "dark" : "";
    themeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    try {
      localStorage.setItem("sksu-rfid-theme", dark ? "dark" : "light");
    } catch (error) {
      // Keep the visual setting even if it cannot be saved.
    }
  });

  menuToggle?.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!open));
    navLinks.classList.toggle("open", !open);
  });

  navLinks?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle?.setAttribute("aria-expanded", "false");
      navLinks.classList.remove("open");
    });
  });

  document.querySelectorAll("[data-accordion] .accordion-item button").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".accordion-item");
      const expanded = item.classList.contains("active");
      item.parentElement.querySelectorAll(".accordion-item").forEach((other) => {
        other.classList.remove("active");
        other.querySelector("button").setAttribute("aria-expanded", "false");
      });
      if (!expanded) {
        item.classList.add("active");
        button.setAttribute("aria-expanded", "true");
      }
    });
  });

  const description = document.getElementById("diagram-description");
  document.querySelectorAll(".diagram-node").forEach((node) => {
    const updateDiagram = () => {
      document.querySelectorAll(".diagram-node").forEach((item) => item.classList.remove("active"));
      node.classList.add("active");
      description.textContent = node.dataset.description;
    };
    node.addEventListener("click", updateDiagram);
    node.addEventListener("mouseenter", updateDiagram);
    node.addEventListener("focus", updateDiagram);
  });

  const tabs = document.querySelectorAll("[data-tabs] [role='tab']");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => {
        const selected = item === tab;
        item.setAttribute("aria-selected", String(selected));
        document.getElementById(item.getAttribute("aria-controls")).hidden = !selected;
      });
    });
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowRight", "ArrowLeft"].includes(event.key)) return;
      event.preventDefault();
      const index = Array.from(tabs).indexOf(tab);
      const next = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      tabs[next].click();
    });
  });

  const screenMain = document.getElementById("screen-main");
  const screenClock = document.getElementById("screen-clock");
  const logBody = document.getElementById("log-body");
  const logCount = document.getElementById("log-count");
  const voiceToggle = document.getElementById("voice-toggle");
  let eventCount = 0;

  function formatTime(date) {
    return new Intl.DateTimeFormat("en-PH", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
    }).format(date);
  }

  function updateClock() {
    if (screenClock) screenClock.textContent = formatTime(new Date());
  }
  updateClock();
  window.setInterval(updateClock, 1000);

  function beep(kind) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const context = new AudioCtx();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === "denied" ? "sawtooth" : "sine";
      oscillator.frequency.value = kind === "denied" ? 180 : kind === "exit" ? 600 : 780;
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.24);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.25);
    } catch (error) {
      // Audio is an optional enhancement to the visual simulation.
    }
  }

  function say(message) {
    if (!voiceToggle?.checked || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      // Speech output is optional and browser-dependent.
    }
  }

  function recordEvent(action) {
    const now = new Date();
    const details = {
      entry: { status: "ENTRY", message: "Entry Recorded", student: "Sample Student A", course: "Sample Course", tone: "entry" },
      exit: { status: "EXIT", message: "Exit Recorded", student: "Sample Student A", course: "Sample Course", tone: "exit" },
      denied: { status: "DENIED", message: "Access Denied", student: "Unknown Card", course: "—", tone: "denied" }
    }[action];
    const stateClass = action === "entry" ? "" : action === "exit" ? "exit-state" : "denied-state";
    screenMain.innerHTML =
      '<div class="screen-event ' + stateClass + '">' +
      '<span class="event-status">' + details.status + '</span>' +
      '<h3>' + details.message + '</h3>' +
      '<p>' + details.student + '</p>' +
      '<p>' + details.course + '</p><hr>' +
      '<p>TIME: ' + formatTime(now) + '</p>' +
      '<p>DEMO TRANSACTION · SAMPLE DATA</p></div>';
    beep(details.tone);
    say(details.message);

    const empty = logBody.querySelector(".empty-log");
    if (empty) empty.remove();
    const row = document.createElement("tr");
    const statusClass = action === "exit" ? "exit" : action === "denied" ? "denied" : "";
    const eventLabel = details.status === "DENIED" ? "Card rejected" : details.status.toLowerCase();
    row.innerHTML =
      "<td>" + formatTime(now) + "</td>" +
      "<td>" + details.student + "</td>" +
      "<td>" + details.course + "</td>" +
      "<td>" + eventLabel + "</td>" +
      '<td><span class="log-status ' + statusClass + '">' + details.status + "</span></td>";
    logBody.prepend(row);
    eventCount += 1;
    logCount.textContent = eventCount + " sample event" + (eventCount === 1 ? "" : "s");
  }

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => recordEvent(button.dataset.action));
  });

  // GateTap is a front-end demonstration. It does not authenticate or retain credentials.
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const loginForm = document.getElementById("login-form");
  const dashboardScan = document.getElementById("dashboard-scan");
  const dashboardTerminal = document.getElementById("dashboard-terminal");
  const dashboardLog = document.getElementById("dashboard-log");
  const dashboardCount = document.getElementById("dashboard-count");
  let dashboardEvents = 0;

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    document.body.classList.add("app-active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showLogin() {
    dashboardView.hidden = true;
    loginView.hidden = false;
    document.body.classList.add("app-active");
    loginForm.reset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showPublicSite() {
    document.body.classList.remove("app-active");
    dashboardView.hidden = true;
    loginView.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    showDashboard();
  });

  document.querySelectorAll("[data-open-public]").forEach((button) => {
    button.addEventListener("click", showPublicSite);
  });

  document.querySelectorAll("[data-open-portal], [data-signout]").forEach((button) => {
    button.addEventListener("click", showLogin);
  });

  document.querySelector(".password-toggle")?.addEventListener("click", (event) => {
    const password = document.getElementById("portal-password");
    const showing = password.type === "text";
    password.type = showing ? "password" : "text";
    event.currentTarget.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    event.currentTarget.textContent = showing ? "◌" : "●";
  });

  document.querySelector(".dashboard-menu")?.addEventListener("click", () => {
    dashboardView.classList.toggle("sidebar-open");
  });

  document.querySelectorAll(".dashboard-nav button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".dashboard-nav button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      dashboardView.classList.remove("sidebar-open");
    });
  });

  dashboardScan?.addEventListener("click", () => {
    const now = new Date();
    const time = formatTime(now);
    dashboardTerminal.innerHTML =
      '<span class="terminal-wave">✓</span>' +
      "<strong>ENTRY RECORDED</strong>" +
      "<p>Sample Student A · " + time + "</p>";
    const emptyDashboard = dashboardLog.querySelector(".dash-empty");
    if (emptyDashboard) emptyDashboard.remove();
    const sampleRow = document.createElement("tr");
    sampleRow.innerHTML =
      "<td>" + time + "</td>" +
      "<td>Sample Student A</td>" +
      "<td>Entry</td>" +
      "<td>Entry Recorded · sample transaction</td>";
    dashboardLog.prepend(sampleRow);
    dashboardEvents += 1;
    dashboardCount.textContent = dashboardEvents + " sample event" + (dashboardEvents === 1 ? "" : "s");
  });

  /*
    TODO: Add real, post-testing values here only after research evaluation.
    Each result object can hold a label and measured values for charts.
    Do not enter estimated or fabricated statistics.
  */
  const results = [];
  void results;
})();
