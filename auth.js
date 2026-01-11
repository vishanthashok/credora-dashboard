// DEMO-ONLY ACCESS GATE (NOT SECURE)

const USERNAME = "credorafinancials";
const PASSWORD = "creditforall2026";

const gate = document.getElementById("loginGate");
const site = document.getElementById("siteContent");
const error = document.getElementById("loginError");

function unlock() {
  gate.style.display = "none";
  site.style.display = "block";
}

function checkStoredAuth() {
  if (sessionStorage.getItem("credora_demo_auth") === "true") {
    unlock();
  }
}

document.getElementById("loginBtn").addEventListener("click", () => {
  const u = document.getElementById("usernameInput").value.trim();
  const p = document.getElementById("passwordInput").value;

  if (u === USERNAME && p === PASSWORD) {
    sessionStorage.setItem("credora_demo_auth", "true");
    unlock();
  } else {
    error.style.display = "block";
  }
});

checkStoredAuth();
