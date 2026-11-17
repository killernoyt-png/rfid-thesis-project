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
  const dashboardDenied = document.getElementById("dashboard-denied");
  const dashboardTerminal = document.getElementById("dashboard-terminal");
  const dashboardLog = document.getElementById("dashboard-log");
  const dashboardCount = document.getElementById("dashboard-count");
  const totalUsers = document.getElementById("dashboard-total-users");
  const totalTaps = document.getElementById("dashboard-total-taps");
  const unauthorizedAttempts = document.getElementById("dashboard-unauthorized");
  const userForm = document.getElementById("user-form");
  const userTable = document.getElementById("user-table-body");
  const userCount = document.getElementById("user-count");
  const cardForm = document.getElementById("card-form");
  const cardTable = document.getElementById("card-table-body");
  const settingsForm = document.getElementById("settings-form");
  const doorList = document.getElementById("door-list");
  let dashboardEvents = 0;
  let deniedEvents = 0;

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    document.body.classList.add("app-active");
    dashboardView.classList.remove("sidebar-open");
    document.querySelector(".dashboard-menu")?.setAttribute("aria-expanded", "false");
    selectDashboardPane("dashboard-overview", false);
    updateDashboardStats();
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

  const dashboardMenu = document.querySelector(".dashboard-menu");
  dashboardMenu?.addEventListener("click", () => {
    const open = dashboardView.classList.toggle("sidebar-open");
    dashboardMenu.setAttribute("aria-expanded", String(open));
  });

  function selectDashboardPane(paneId, moveFocus) {
    const target = document.getElementById(paneId);
    if (!target) return;
    document.querySelectorAll(".dashboard-pane").forEach((pane) => {
      pane.hidden = pane !== target;
      pane.classList.remove("is-highlighted");
    });
    document.querySelectorAll(".dashboard-nav button").forEach((item) => {
      const selected = item.dataset.dashboardTarget === paneId;
      item.classList.toggle("active", selected);
      item.toggleAttribute("aria-current", selected);
    });
    dashboardView.classList.remove("sidebar-open");
    dashboardMenu?.setAttribute("aria-expanded", "false");
    if (moveFocus) {
      target.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(() => target.classList.add("is-highlighted"), 120);
      window.setTimeout(() => target.classList.remove("is-highlighted"), 1400);
    }
  }

  document.querySelectorAll("[data-dashboard-target]").forEach((button) => {
    button.addEventListener("click", () => {
      selectDashboardPane(button.dataset.dashboardTarget, true);
    });
  });

  function createCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
    return cell;
  }

  function currentUserRows() {
    return Array.from(userTable?.querySelectorAll("tr") || []);
  }

  function updateDashboardStats() {
    const userTotal = currentUserRows().length;
    if (totalUsers) totalUsers.textContent = String(userTotal);
    if (totalTaps) totalTaps.textContent = String(dashboardEvents);
    if (unauthorizedAttempts) unauthorizedAttempts.textContent = String(deniedEvents);
    if (userCount) userCount.textContent = userTotal + " sample " + (userTotal === 1 ? "user" : "users");
  }

  function updateUserSelectors() {
    const users = currentUserRows().map((row) => row.cells[0]?.textContent).filter(Boolean);
    const cardUser = document.getElementById("card-user");
    const reportUser = document.getElementById("report-user");
    const previousCard = cardUser?.value || "";
    const previousReport = reportUser?.value || "All users";
    if (cardUser) {
      cardUser.replaceChildren();
      const unassigned = document.createElement("option");
      unassigned.value = "";
      unassigned.textContent = "Unassigned";
      cardUser.append(unassigned);
      users.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        cardUser.append(option);
      });
      cardUser.value = users.includes(previousCard) ? previousCard : "";
    }
    if (reportUser) {
      reportUser.replaceChildren();
      const allUsers = document.createElement("option");
      allUsers.value = "All users";
      allUsers.textContent = "All users";
      reportUser.append(allUsers);
      users.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        reportUser.append(option);
      });
      reportUser.value = users.includes(previousReport) ? previousReport : "All users";
    }
  }

  function addAccessLog({ holder, door, result, message }) {
    const now = new Date();
    const emptyDashboard = dashboardLog?.querySelector(".dash-empty");
    if (emptyDashboard) emptyDashboard.remove();
    const row = document.createElement("tr");
    createCell(row, formatTime(now));
    createCell(row, holder);
    createCell(row, door);
    const stateCell = document.createElement("td");
    const state = document.createElement("span");
    state.className = "access-status " + (result === "PASSED" ? "passed" : "denied");
    state.textContent = result;
    stateCell.append(state);
    row.append(stateCell);
    createCell(row, message);
    dashboardLog?.prepend(row);
    dashboardEvents += 1;
    if (result === "DENIED") deniedEvents += 1;
    if (dashboardCount) dashboardCount.textContent = dashboardEvents + " sample event" + (dashboardEvents === 1 ? "" : "s");
    updateDashboardStats();
    return formatTime(now);
  }

  function showTerminal(status, detail, denied) {
    if (!dashboardTerminal) return;
    dashboardTerminal.replaceChildren();
    const symbol = document.createElement("span");
    symbol.className = "terminal-wave";
    symbol.textContent = denied ? "!" : "✓";
    const heading = document.createElement("strong");
    heading.textContent = status;
    const copy = document.createElement("p");
    copy.textContent = detail;
    dashboardTerminal.append(symbol, heading, copy);
  }

  dashboardScan?.addEventListener("click", () => {
    const time = addAccessLog({ holder: "Sample Student A", door: "Isulan Main Gate", result: "PASSED", message: "Entry recorded · sample transaction" });
    showTerminal("ENTRY RECORDED", "Sample Student A · " + time, false);
  });

  dashboardDenied?.addEventListener("click", () => {
    const time = addAccessLog({ holder: "Unknown sample card", door: "Isulan Main Gate", result: "DENIED", message: "Access denied · sample transaction" });
    showTerminal("ACCESS DENIED", "Unknown sample card · " + time, true);
  });

  function createUserRow(name, role, courseYear, rfid, userId) {
    const row = document.createElement("tr");
    row.dataset.userId = userId;
    createCell(row, name);
    createCell(row, role);
    createCell(row, courseYear || "BSCpE - 4B");
    createCell(row, rfid);
    const actions = document.createElement("td");
    actions.className = "table-actions";
    ["edit", "delete"].forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "table-action" + (action === "delete" ? " danger-action" : "");
      button.dataset.userAction = action;
      button.textContent = action === "edit" ? "Edit" : "Delete";
      actions.append(button);
    });
    row.append(actions);
    return row;
  }

  userForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const idField = document.getElementById("managed-user-id");
    const name = document.getElementById("managed-name").value.trim();
    const role = document.getElementById("managed-role").value;
    const courseYear = document.getElementById("managed-course").value.trim() || "BSCpE - 4B";
    const rfid = document.getElementById("managed-rfid").value.trim();
    const notice = document.getElementById("user-form-status");
    if (!name || !rfid) return;
    const existing = idField.value ? userTable.querySelector('[data-user-id="' + idField.value + '"]') : null;
    if (existing) {
      existing.cells[0].textContent = name;
      existing.cells[1].textContent = role;
      existing.cells[2].textContent = courseYear;
      existing.cells[3].textContent = rfid;
      notice.textContent = "Local sample profile updated.";
    } else {
      userTable.append(createUserRow(name, role, courseYear, rfid, "user-" + Date.now()));
      notice.textContent = "Local sample profile added.";
    }
    userForm.reset();
    document.getElementById("managed-course").value = "BSCpE - 4B";
    idField.value = "";
    document.getElementById("user-submit").textContent = "Add user";
    updateUserSelectors();
    updateDashboardStats();
  });

  document.getElementById("user-reset")?.addEventListener("click", () => {
    userForm?.reset();
    document.getElementById("managed-user-id").value = "";
    document.getElementById("managed-course").value = "BSCpE - 4B";
    document.getElementById("user-submit").textContent = "Add user";
    document.getElementById("user-form-status").textContent = "";
  });

  userTable?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-user-action]");
    if (!button) return;
    const row = button.closest("tr");
    if (button.dataset.userAction === "edit") {
      document.getElementById("managed-user-id").value = row.dataset.userId;
      document.getElementById("managed-name").value = row.cells[0].textContent;
      document.getElementById("managed-role").value = row.cells[1].textContent;
      document.getElementById("managed-course").value = row.cells[2].textContent;
      document.getElementById("managed-rfid").value = row.cells[3].textContent;
      document.getElementById("user-submit").textContent = "Save changes";
      document.getElementById("user-form-status").textContent = "Editing local sample profile.";
      document.getElementById("managed-name").focus();
    } else {
      row.remove();
      document.getElementById("user-form-status").textContent = "Local sample profile removed.";
      updateUserSelectors();
      updateDashboardStats();
    }
  });

  function createCardRow(number, assigned, isBlocked) {
    const row = document.createElement("tr");
    createCell(row, number);
    createCell(row, assigned || "Unassigned");
    const stateCell = document.createElement("td");
    const state = document.createElement("span");
    state.className = "access-status " + (isBlocked ? "denied" : "passed");
    state.textContent = isBlocked ? "Blocked" : "Active";
    stateCell.append(state);
    row.append(stateCell);
    const actions = document.createElement("td");
    actions.className = "table-actions";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "table-action" + (isBlocked ? "" : " danger-action");
    button.dataset.cardAction = isBlocked ? "activate" : "block";
    button.textContent = isBlocked ? "Activate" : "Block";
    actions.append(button);
    row.append(actions);
    return row;
  }

  cardForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const number = document.getElementById("card-number").value.trim();
    const assigned = document.getElementById("card-user").value;
    if (!number) return;
    cardTable?.append(createCardRow(number, assigned, false));
    cardForm.reset();
    document.getElementById("card-form-status").textContent = "Card registered for this local sample session.";
  });

  cardTable?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-card-action]");
    if (!button) return;
    const row = button.closest("tr");
    const blocked = button.dataset.cardAction === "block";
    const state = row.cells[2].querySelector("span");
    state.className = "access-status " + (blocked ? "denied" : "passed");
    state.textContent = blocked ? "Blocked" : "Active";
    button.dataset.cardAction = blocked ? "activate" : "block";
    button.textContent = blocked ? "Activate" : "Block";
    button.classList.toggle("danger-action", !blocked);
  });

  settingsForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("door-name").value.trim();
    const level = document.getElementById("access-level").value;
    if (!name) return;
    const item = document.createElement("li");
    const label = document.createElement("span");
    const heading = document.createElement("strong");
    const description = document.createElement("small");
    const badge = document.createElement("b");
    heading.textContent = name;
    description.textContent = "Local sample access point";
    badge.textContent = level;
    label.append(heading, description);
    item.append(label, badge);
    doorList?.append(item);
    settingsForm.reset();
    document.getElementById("settings-form-status").textContent = "Door or room added to this local session.";
  });

  const reportDate = document.getElementById("report-date");
  const reportUser = document.getElementById("report-user");
  const reportStatus = document.getElementById("report-status");
  if (reportDate) reportDate.value = new Date().toISOString().slice(0, 10);
  document.getElementById("report-preview")?.addEventListener("click", () => {
    const date = reportDate?.value || "selected date";
    const user = reportUser?.value || "All users";
    reportStatus.textContent = "Preview prepared for " + user + " on " + date + ". " + dashboardEvents + " local sample access event" + (dashboardEvents === 1 ? " is" : "s are") + " available.";
  });
  document.getElementById("report-print")?.addEventListener("click", () => window.print());
  document.getElementById("report-download")?.addEventListener("click", () => {
    const lines = [["Time", "Card holder", "Door / room", "Result", "Monitor message"]];
    dashboardLog?.querySelectorAll("tr:not(.dash-empty)").forEach((row) => lines.push(Array.from(row.cells).map((cell) => cell.textContent.trim())));
    const csv = lines.map((line) => line.map((value) => '"' + value.replaceAll('"', '""') + '"').join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "gatetap-access-report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    reportStatus.textContent = "CSV download created from local sample events.";
  });

  updateUserSelectors();
  updateDashboardStats();

  /*
    TODO: Add real, post-testing values here only after research evaluation.
    Each result object can hold a label and measured values for charts.
    Do not enter estimated or fabricated statistics.
  */
  const results = [];
  void results;
})();
