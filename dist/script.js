(() => {
  "use strict";

  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");

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

  // GateTap runs locally in the browser; access fields are not sent to an external service.
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const loginForm = document.getElementById("login-form");
  const loginUser = document.getElementById("portal-user");
  const loginPassword = document.getElementById("portal-password");
  const keepSignedIn = document.getElementById("keep-signed-in");
  const loginStatus = document.getElementById("login-status");
  const dashboardScan = document.getElementById("dashboard-scan");
  const dashboardOut = document.getElementById("dashboard-out");
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
  const userPhotoInput = document.getElementById("managed-photo");
  const photoUploadPreview = document.getElementById("photo-upload-preview");
  const profilePhotoPreview = document.getElementById("profile-photo-preview");
  const cardForm = document.getElementById("card-form");
  const cardTable = document.getElementById("card-table-body");
  const settingsForm = document.getElementById("settings-form");
  const dashboardRTC = document.getElementById("dashboard-rtc");
  const dashboardDate = document.getElementById("dashboard-date");
  const DASHBOARD_STORAGE_KEY = "gatetap-dashboard-state-v1";
  const GATETAP_SESSION_KEY = "gatetap-keep-signed-in-v1";
  let dashboardEvents = 0;
  let deniedEvents = 0;
  let selectedProfilePhoto = "";
  let activeDashboardPane = "dashboard-overview";
  let lastTerminalState = null;
  let dashboardStateReady = false;
  let defaultAccountType = "Student";

  function updateDashboardRTC() {
    const now = new Date();
    if (dashboardRTC) dashboardRTC.textContent = formatTime(now);
    if (dashboardDate) {
      dashboardDate.textContent = new Intl.DateTimeFormat("en-PH", {
        weekday: "short", month: "short", day: "numeric", year: "numeric"
      }).format(now);
    }
  }
  updateDashboardRTC();
  window.setInterval(updateDashboardRTC, 1000);

  function getStoredDashboardState() {
    try {
      const stored = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
      if (!stored) return null;
      const state = JSON.parse(stored);
      return state && typeof state === "object" ? state : null;
    } catch (error) {
      return null;
    }
  }

  function setLoginStatus(message, isError) {
    if (!loginStatus) return;
    loginStatus.textContent = message || "";
    loginStatus.classList.toggle("is-error", Boolean(isError));
  }

  function saveSessionPreference(shouldKeepSession) {
    try {
      if (shouldKeepSession) window.localStorage.setItem(GATETAP_SESSION_KEY, "1");
      else window.localStorage.removeItem(GATETAP_SESSION_KEY);
    } catch (error) {
      // The dashboard remains usable when browser storage is unavailable.
    }
  }

  function hasSavedSession() {
    try {
      return window.localStorage.getItem(GATETAP_SESSION_KEY) === "1";
    } catch (error) {
      return false;
    }
  }

  function cellText(row, index) {
    return row?.cells[index]?.textContent.trim() || "";
  }

  function persistDashboardState() {
    if (!dashboardStateReady) return true;
    const state = {
      users: currentUserRows().map((row) => ({
        id: row.dataset.userId || "user-" + Date.now(),
        name: row.dataset.userName || cellText(row, 1),
        role: cellText(row, 2),
        courseYear: cellText(row, 3),
        rfid: cellText(row, 4),
        photo: row.dataset.photo || ""
      })),
      cards: Array.from(cardTable?.querySelectorAll("tr") || []).map((row) => ({
        number: cellText(row, 0),
        assigned: cellText(row, 1),
        blocked: cellText(row, 2) === "Blocked"
      })),
      logs: Array.from(dashboardLog?.querySelectorAll("tr:not(.dash-empty)") || []).map((row) => ({
        timeIn: cellText(row, 0),
        timeOut: cellText(row, 1),
        holder: cellText(row, 2),
        result: cellText(row, 3),
        message: cellText(row, 4)
      })),
      defaultAccountType,
      dashboardEvents,
      deniedEvents,
      activePane: activeDashboardPane,
      sidebarCollapsed: dashboardView.classList.contains("sidebar-collapsed"),
      terminal: lastTerminalState,
      report: {
        date: document.getElementById("report-date")?.value || "",
        user: document.getElementById("report-user")?.value || "All users"
      }
    };
    try {
      window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      return false;
    }
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    document.body.classList.add("app-active");
    dashboardView.classList.remove("sidebar-open");
    if (!dashboardNarrow.matches) dashboardView.classList.add("sidebar-collapsed");
    else dashboardView.classList.remove("sidebar-collapsed");
    document.querySelector(".dashboard-menu")?.setAttribute("aria-expanded", String(!dashboardNarrow.matches));
    selectDashboardPane(activeDashboardPane, false);
    updateDashboardStats();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showLogin() {
    dashboardView.hidden = true;
    loginView.hidden = false;
    document.body.classList.add("app-active");
    loginForm.reset();
    setLoginStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const userId = loginUser?.value.trim() || "";
    const password = loginPassword?.value || "";
    if (!userId || !password) {
      setLoginStatus("Enter both your user ID and password to continue.", true);
      const missingField = !userId ? loginUser : loginPassword;
      missingField?.focus();
      return;
    }
    saveSessionPreference(Boolean(keepSignedIn?.checked));
    setLoginStatus("");
    showDashboard();
  });

  document.getElementById("forgot-password")?.addEventListener("click", () => {
    setLoginStatus("For password assistance, please contact the GateTap administrator.");
  });

  document.querySelectorAll("[data-open-portal]").forEach((button) => {
    button.addEventListener("click", showLogin);
  });

  document.querySelectorAll("[data-signout]").forEach((button) => {
    button.addEventListener("click", () => {
      saveSessionPreference(false);
      showLogin();
    });
  });

  document.querySelector(".password-toggle")?.addEventListener("click", (event) => {
    const password = document.getElementById("portal-password");
    const showing = password.type === "text";
    password.type = showing ? "password" : "text";
    event.currentTarget.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    event.currentTarget.textContent = showing ? "◌" : "●";
  });

  const dashboardMenu = document.querySelector(".dashboard-menu");
  const sidebarClose = document.querySelector(".sidebar-close");
  const dashboardNarrow = window.matchMedia("(max-width: 880px)");
  function syncDashboardMenu() {
    if (!dashboardMenu) return;
    const expanded = dashboardNarrow.matches
      ? dashboardView.classList.contains("sidebar-open")
      : !dashboardView.classList.contains("sidebar-collapsed");
    dashboardMenu.setAttribute("aria-expanded", String(expanded));
    dashboardMenu.setAttribute("aria-label", expanded ? "Collapse dashboard menu" : "Open dashboard menu");
  }
  function toggleDashboardSidebar() {
    if (dashboardNarrow.matches) {
      dashboardView.classList.toggle("sidebar-open");
    } else {
      dashboardView.classList.toggle("sidebar-collapsed");
    }
    syncDashboardMenu();
    persistDashboardState();
  }
  dashboardMenu?.addEventListener("click", toggleDashboardSidebar);
  sidebarClose?.addEventListener("click", toggleDashboardSidebar);
  dashboardNarrow.addEventListener("change", () => {
    dashboardView.classList.remove("sidebar-open");
    syncDashboardMenu();
  });
  syncDashboardMenu();

  function selectDashboardPane(paneId, moveFocus) {
    const target = document.getElementById(paneId);
    if (!target) return;
    activeDashboardPane = paneId;
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
    syncDashboardMenu();
    if (moveFocus) {
      target.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(() => target.classList.add("is-highlighted"), 120);
      window.setTimeout(() => target.classList.remove("is-highlighted"), 1400);
    }
    if (paneId === "dashboard-rfid-cards") setNextCardNumber();
    persistDashboardState();
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

  function initialsFor(name) {
    const initials = String(name || "1×1").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
    return initials ? initials.toUpperCase() : "1×1";
  }

  function photoBadge(name, source, className, placeholder) {
    const badge = document.createElement("span");
    badge.className = className;
    badge.setAttribute("aria-label", name ? "Photo of " + name : "Profile photo preview");
    if (source) {
      const image = document.createElement("img");
      image.src = source;
      image.alt = "";
      badge.append(image);
    } else {
      badge.textContent = placeholder || initialsFor(name);
    }
    return badge;
  }

  function setPhotoPreview(name, source) {
    photoUploadPreview?.replaceChildren(photoBadge(name, source, "photo-preview-content", "1×1"));
    profilePhotoPreview?.replaceChildren(photoBadge(name, source, "profile-photo-content"));
  }

  function resetPhotoSelection() {
    selectedProfilePhoto = "";
    if (userPhotoInput) userPhotoInput.value = "";
    setPhotoPreview("Sample Student A", "");
  }

  function updateDashboardStats() {
    const userTotal = currentUserRows().length;
    if (totalUsers) totalUsers.textContent = String(userTotal);
    if (totalTaps) totalTaps.textContent = String(dashboardEvents);
    if (unauthorizedAttempts) unauthorizedAttempts.textContent = String(deniedEvents);
    if (userCount) userCount.textContent = userTotal + " saved " + (userTotal === 1 ? "user" : "users");
  }

  function updateUserSelectors() {
    const users = currentUserRows().map((row) => row.dataset.userName || row.cells[1]?.textContent).filter(Boolean);
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

  function createEmptyDashboardLog() {
    const row = document.createElement("tr");
    row.className = "dash-empty";
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "No RFID event has been recorded yet. New activity is saved in this browser.";
    row.append(cell);
    return row;
  }

  function createAccessLogRow({ timeIn, timeOut, holder, door, result, message }) {
    const row = document.createElement("tr");
    createCell(row, timeIn || "");
    createCell(row, timeOut || "");
    createCell(row, holder);
    const stateCell = document.createElement("td");
    const state = document.createElement("span");
    state.className = "access-status " + (result === "PASSED" ? "passed" : "denied");
    state.textContent = result;
    stateCell.append(state);
    row.append(stateCell);
    createCell(row, message);
    return row;
  }

  function addAccessLog({ holder, door, result, message, eventType = "in" }) {
    const now = new Date();
    const emptyDashboard = dashboardLog?.querySelector(".dash-empty");
    if (emptyDashboard) emptyDashboard.remove();
    const time = formatTime(now);
    const row = createAccessLogRow({
      timeIn: eventType === "in" ? time : "",
      timeOut: eventType === "out" ? time : "",
      holder,
      door,
      result,
      message
    });
    dashboardLog?.prepend(row);
    dashboardEvents += 1;
    if (result === "DENIED") deniedEvents += 1;
    if (dashboardCount) dashboardCount.textContent = dashboardEvents + " saved event" + (dashboardEvents === 1 ? "" : "s");
    updateDashboardStats();
    return time;
  }

  function showTerminal(status, detail, denied) {
    if (!dashboardTerminal) return;
    lastTerminalState = { status, detail, denied: Boolean(denied) };
    dashboardTerminal.replaceChildren();
    const heading = document.createElement("strong");
    heading.textContent = status;
    const copy = document.createElement("p");
    copy.textContent = detail;
    dashboardTerminal.append(heading, copy);
  }

  dashboardScan?.addEventListener("click", () => {
    const time = addAccessLog({ holder: "Sample Student A", door: "Isulan Main Gate", result: "PASSED", message: "Entry recorded · sample transaction", eventType: "in" });
    showTerminal("ENTRY RECORDED", "Sample Student A · " + time, false);
    persistDashboardState();
  });

  dashboardOut?.addEventListener("click", () => {
    const time = addAccessLog({ holder: "Sample Student A", door: "Isulan Main Gate", result: "PASSED", message: "Exit recorded · sample transaction", eventType: "out" });
    showTerminal("TIME OUT RECORDED", "Sample Student A · " + time, false);
    persistDashboardState();
  });

  dashboardDenied?.addEventListener("click", () => {
    const time = addAccessLog({ holder: "Unknown sample card", door: "Isulan Main Gate", result: "DENIED", message: "Access denied · sample transaction" });
    showTerminal("ACCESS DENIED", "Unknown sample card · " + time, true);
    persistDashboardState();
  });

  function createUserRow(name, role, courseYear, rfid, userId, photoSource) {
    const row = document.createElement("tr");
    row.dataset.userId = userId;
    row.dataset.userName = name;
    row.dataset.photo = photoSource || "";
    const photoCell = document.createElement("td");
    photoCell.className = "user-photo-cell";
    photoCell.append(photoBadge(name, photoSource, "user-list-photo"));
    row.append(photoCell);
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

  userPhotoInput?.addEventListener("change", () => {
    const file = userPhotoInput.files?.[0];
    if (!file) {
      selectedProfilePhoto = "";
      setPhotoPreview(document.getElementById("managed-name")?.value || "Sample Student A", "");
      return;
    }
    if (!file.type.startsWith("image/")) {
      userPhotoInput.value = "";
      document.getElementById("user-form-status").textContent = "Please choose an image file for the profile photo.";
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      selectedProfilePhoto = String(reader.result || "");
      setPhotoPreview(document.getElementById("managed-name")?.value || "New user", selectedProfilePhoto);
    });
    reader.readAsDataURL(file);
  });

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
      existing.dataset.userName = name;
      existing.dataset.photo = selectedProfilePhoto;
      existing.cells[0].replaceChildren(photoBadge(name, selectedProfilePhoto, "user-list-photo"));
      existing.cells[1].textContent = name;
      existing.cells[2].textContent = role;
      existing.cells[3].textContent = courseYear;
      existing.cells[4].textContent = rfid;
      notice.textContent = "Profile updated and saved in this browser.";
    } else {
      userTable.append(createUserRow(name, role, courseYear, rfid, "user-" + Date.now(), selectedProfilePhoto));
      notice.textContent = "Profile added and saved in this browser.";
    }
    userForm.reset();
    resetPhotoSelection();
    document.getElementById("managed-course").value = "BSCpE - 4B";
    idField.value = "";
    document.getElementById("user-submit").textContent = "Add user";
    updateUserSelectors();
    updateDashboardStats();
    if (!persistDashboardState()) notice.textContent = "Profile updated, but this browser could not save it.";
  });

  document.getElementById("user-reset")?.addEventListener("click", () => {
    userForm?.reset();
    resetPhotoSelection();
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
      document.getElementById("managed-name").value = row.dataset.userName || row.cells[1].textContent;
      document.getElementById("managed-role").value = row.cells[2].textContent;
      document.getElementById("managed-course").value = row.cells[3].textContent;
      document.getElementById("managed-rfid").value = row.cells[4].textContent;
      selectedProfilePhoto = row.dataset.photo || "";
      setPhotoPreview(row.dataset.userName || row.cells[1].textContent, selectedProfilePhoto);
      document.getElementById("user-submit").textContent = "Save changes";
      document.getElementById("user-form-status").textContent = "Editing saved profile.";
      document.getElementById("managed-name").focus();
    } else {
      row.remove();
      const notice = document.getElementById("user-form-status");
      notice.textContent = "Profile removed and saved in this browser.";
      updateUserSelectors();
      updateDashboardStats();
      if (!persistDashboardState()) notice.textContent = "Profile removed, but this browser could not save the change.";
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

  function setNextCardNumber() {
    const input = document.getElementById("card-number");
    if (!input) return;
    let highest = 0;
    cardTable?.querySelectorAll("tr").forEach((row) => {
      const match = row.cells[0]?.textContent.match(/(\d+)$/);
      if (match) highest = Math.max(highest, Number(match[1]));
    });
    input.value = "RFID-" + String(highest + 1).padStart(4, "0");
  }

  cardForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const number = document.getElementById("card-number").value.trim();
    const assigned = document.getElementById("card-user").value;
    if (!number) return;
    cardTable?.append(createCardRow(number, assigned, false));
    cardForm.reset();
    setNextCardNumber();
    const notice = document.getElementById("card-form-status");
    notice.textContent = "Card registered and saved in this browser.";
    if (!persistDashboardState()) notice.textContent = "Card registered, but this browser could not save it.";
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
    persistDashboardState();
  });

  settingsForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    defaultAccountType = document.getElementById("default-account-type")?.value === "Visitor" ? "Visitor" : "Student";
    document.getElementById("managed-role").value = defaultAccountType;
    const notice = document.getElementById("settings-form-status");
    notice.textContent = "Settings saved.";
    if (!persistDashboardState()) notice.textContent = "Settings updated, but this browser could not save them.";
  });

  const reportDate = document.getElementById("report-date");
  const reportUser = document.getElementById("report-user");
  const reportStatus = document.getElementById("report-status");

  function restoreDashboardState(state) {
    if (!state) return false;
    if (Array.isArray(state.users) && userTable) {
      userTable.replaceChildren();
      state.users.filter((user) => user && user.name).forEach((user, index) => {
        userTable.append(createUserRow(
          user.name,
          (user.role === "Visitor" ? "Visitor" : "Student"),
          user.courseYear || "BSCpE - 4B",
          user.rfid || "",
          user.id || "saved-user-" + index,
          user.photo || ""
        ));
      });
    }
    if (Array.isArray(state.cards) && cardTable) {
      cardTable.replaceChildren();
      state.cards.filter((card) => card && card.number).forEach((card) => {
        cardTable.append(createCardRow(card.number, card.assigned || "", Boolean(card.blocked)));
      });
    }
    if (Array.isArray(state.logs) && dashboardLog) {
      dashboardLog.replaceChildren();
      state.logs.filter((log) => log && (log.timeIn || log.timeOut || log.time)).forEach((log) => dashboardLog.append(createAccessLogRow({
        timeIn: log.timeIn || (log.time && log.message?.toLowerCase().includes("exit") ? "" : log.time),
        timeOut: log.timeOut || (log.time && log.message?.toLowerCase().includes("exit") ? log.time : ""),
        holder: log.holder || "Unknown card",
        door: log.door || "Isulan Main Gate",
        result: log.result === "PASSED" ? "PASSED" : "DENIED",
        message: log.message || "Saved access record"
      })));
      if (!dashboardLog.children.length) dashboardLog.append(createEmptyDashboardLog());
    }
    dashboardEvents = Number.isFinite(state.dashboardEvents) ? Math.max(0, state.dashboardEvents) : (state.logs?.length || 0);
    deniedEvents = Number.isFinite(state.deniedEvents) ? Math.max(0, state.deniedEvents) : (state.logs || []).filter((log) => log?.result === "DENIED").length;
    defaultAccountType = state.defaultAccountType === "Visitor" ? "Visitor" : "Student";
    if (document.getElementById("default-account-type")) document.getElementById("default-account-type").value = defaultAccountType;
    activeDashboardPane = document.getElementById(state.activePane) ? state.activePane : "dashboard-overview";
    if (dashboardNarrow.matches) {
      dashboardView.classList.remove("sidebar-collapsed");
      dashboardView.classList.remove("sidebar-open");
    } else {
      dashboardView.classList.add("sidebar-collapsed");
    }
    if (state.terminal?.status && state.terminal?.detail) {
      showTerminal(state.terminal.status, state.terminal.detail, state.terminal.denied);
    }
    updateUserSelectors();
    if (reportDate) reportDate.value = state.report?.date || new Date().toISOString().slice(0, 10);
    if (reportUser && state.report?.user) reportUser.value = state.report.user;
    return true;
  }

  const dashboardWasRestored = restoreDashboardState(getStoredDashboardState());
  if (reportDate && !dashboardWasRestored) reportDate.value = new Date().toISOString().slice(0, 10);
  document.getElementById("report-preview")?.addEventListener("click", () => {
    const date = reportDate?.value || "selected date";
    const user = reportUser?.value || "All users";
    reportStatus.textContent = "Preview prepared for " + user + " on " + date + ". " + dashboardEvents + " saved access event" + (dashboardEvents === 1 ? " is" : "s are") + " available.";
    persistDashboardState();
  });
  reportDate?.addEventListener("change", persistDashboardState);
  reportUser?.addEventListener("change", persistDashboardState);
  document.getElementById("report-print")?.addEventListener("click", () => window.print());
  document.getElementById("report-download")?.addEventListener("click", () => {
    const lines = [["Time In", "Time Out", "Card holder", "Result", "Monitor message"]];
    dashboardLog?.querySelectorAll("tr:not(.dash-empty)").forEach((row) => lines.push(Array.from(row.cells).map((cell) => cell.textContent.trim())));
    const csv = lines.map((line) => line.map((value) => '"' + value.replaceAll('"', '""') + '"').join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "gatetap-access-report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    reportStatus.textContent = "CSV download created from saved browser events.";
  });

  updateUserSelectors();
  updateDashboardStats();
  setNextCardNumber();
  if (dashboardCount) dashboardCount.textContent = dashboardEvents ? dashboardEvents + " saved event" + (dashboardEvents === 1 ? "" : "s") : "No saved events";
  dashboardStateReady = true;
  if (!dashboardWasRestored) persistDashboardState();
  if (hasSavedSession()) showDashboard();

  /*
    TODO: Add real, post-testing values here only after research evaluation.
    Each result object can hold a label and measured values for charts.
    Do not enter estimated or fabricated statistics.
  */
  const results = [];
  void results;
})();
