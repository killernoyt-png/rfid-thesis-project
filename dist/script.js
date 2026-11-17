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

  /*
    TODO: Add real, post-testing values here only after research evaluation.
    Each result object can hold a label and measured values for charts.
    Do not enter estimated or fabricated statistics.
  */
  const results = [];
  void results;
})();
