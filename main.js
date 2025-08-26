// Register Service Worker and control update flow UI
const overlay = document.getElementById("update-overlay");
const progressBar = document.getElementById("progress-bar");
const statusText = document.getElementById("update-status");
const versionLabel = document.getElementById("version-label");
const checkBtn = document.getElementById("check-btn");

function showOverlay() { overlay.classList.remove("hidden"); }
function hideOverlay() { overlay.classList.add("hidden"); }

function animateProgress(to = 100, duration = 1500) {
  const start = parseInt(progressBar.style.width) || 0;
  const range = to - start;
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const pct = Math.min(100, start + Math.round((elapsed / duration) * range));
    progressBar.style.width = pct + "%";
    if (pct < to) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

async function reloadToNewVersion() {
  statusText.textContent = "Finalizing…";
  animateProgress(100, 500);
  setTimeout(() => {
    // Ensure new SW takes control
    if (navigator.serviceWorker.controller) {
      window.location.reload();
    } else {
      window.location.assign(window.location.href);
    }
  }, 700);
}

async function setupSW() {
  if (!("serviceWorker" in navigator)) return;

  const reg = await navigator.serviceWorker.register("/service-worker.js", { updateViaCache: "none" });

  // Manual check button
  checkBtn?.addEventListener("click", async () => {
    statusText.textContent = "Checking…";
    showOverlay();
    try { await reg.update(); } catch (e) {}
    // Give it a moment; if nothing changes, hide overlay
    setTimeout(() => {
      if (!reg.installing) hideOverlay();
    }, 1500);
  });

  reg.addEventListener("updatefound", () => {
    const newSW = reg.installing;
    if (!newSW) return;
    showOverlay();
    statusText.textContent = "Downloading update…";
    versionLabel.textContent = "Current: v" + (window.APP_VERSION || "?") + " → installing new";
    animateProgress(80, 1500); // pseudo progress

    newSW.addEventListener("statechange", () => {
      if (newSW.state === "installed") {
        if (navigator.serviceWorker.controller) {
          statusText.textContent = "Installing…";
          animateProgress(95, 700);
          reloadToNewVersion();
        } else {
          // First install, no need to block
          hideOverlay();
        }
      }
    });
  });

  // Optional: ask SW to check in case of long-running sessions
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage("checkForUpdate");
  }
}

setupSW();
