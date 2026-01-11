// Credora Demo Dashboard (no dependencies)

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const state = {
  range: 7,
  data: []
};

function pad(n){ return String(n).padStart(2, "0"); }
function formatDate(d){
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}
function fmtInt(n){
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function fmtPct(x){
  return `${x.toFixed(2)}%`;
}
function pctChange(curr, prev){
  if (prev <= 0) return 100;
  return ((curr - prev) / prev) * 100;
}
function setDelta(el, value){
  const rounded = Math.abs(value) < 0.01 ? 0 : value;
  el.classList.remove("up","down");
  el.classList.add(rounded >= 0 ? "up" : "down");
  el.textContent = `${rounded >= 0 ? "▲" : "▼"} ${Math.abs(rounded).toFixed(1)}%`;
}

function randomAround(base, variance){
  const delta = (Math.random() * 2 - 1) * variance;
  return Math.max(0, Math.round(base + delta));
}

// Generates sample daily data for N days
function generateData(days){
  const out = [];
  const now = new Date();

  // base curves (so it looks like growth)
  let visitsBase = 220;
  let signupsBase = 18;
  let leadsBase = 2;

  for (let i = days - 1; i >= 0; i--){
    const d = new Date(now);
    d.setDate(now.getDate() - i);

    // gentle growth
    visitsBase *= 1.018;
    signupsBase *= 1.025;

    const visits = randomAround(visitsBase, 40);
    const signups = randomAround(signupsBase, 6);
    const leads = randomAround(leadsBase + (i % 6 === 0 ? 1 : 0), 2);

    const conversion = visits > 0 ? (signups / visits) * 100 : 0;

    out.push({
      date: formatDate(d),
      visits,
      signups,
      leads,
      conversion
    });
  }

  return out;
}

// Canvas chart (simple line chart)
function drawChart(canvas, seriesA, seriesB){
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  // Clear
  ctx.clearRect(0,0,W,H);

  // Scale with padding
  const padX = 48;
  const padY = 28;

  const maxY = Math.max(
    ...seriesA.map(d => d.y),
    ...seriesB.map(d => d.y)
  );

  const minY = 0;

  const xStep = (W - padX*2) / (seriesA.length - 1 || 1);
  const yScale = (H - padY*2) / (maxY - minY || 1);

  // Background grid
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;

  const gridLines = 4;
  for (let i=0;i<=gridLines;i++){
    const y = padY + ((H - padY*2) * i / gridLines);
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(W - padX, y);
    ctx.stroke();
  }
  ctx.restore();

  // Helper to map points
  const toXY = (i, yVal) => {
    const x = padX + i * xStep;
    const y = H - padY - ((yVal - minY) * yScale);
    return {x,y};
  };

  // Axis labels (right-aligned minimal)
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "12px Inter, system-ui";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i=0;i<=gridLines;i++){
    const value = Math.round(maxY - (maxY * i / gridLines));
    const y = padY + ((H - padY*2) * i / gridLines);
    ctx.fillText(String(value), padX - 10, y);
  }
  ctx.restore();

  // Line function
  function plot(series, stroke){
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.6;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Glow
    ctx.shadowColor = stroke;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    series.forEach((p, i) => {
      const {x,y} = toXY(i, p.y);
      if (i === 0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });
    ctx.stroke();

    // Points
    ctx.shadowBlur = 0;
    ctx.fillStyle = stroke;
    series.forEach((p, i) => {
      const {x,y} = toXY(i, p.y);
      ctx.beginPath();
      ctx.arc(x, y, 3.3, 0, Math.PI*2);
      ctx.fill();
    });

    ctx.restore();
  }

  // Colors match legend CSS vibe
  plot(seriesA, "rgba(34,211,238,0.95)");   // visits
  plot(seriesB, "rgba(124,92,255,0.95)");  // waitlist
}

function updateTable(rows){
  const tbody = $("#tableBody");
  tbody.innerHTML = "";

  rows.slice().reverse().forEach(r => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.date}</td>
      <td class="num">${fmtInt(r.visits)}</td>
      <td class="num">${fmtInt(r.signups)}</td>
      <td class="num">${fmtInt(r.leads)}</td>
      <td class="num">${fmtPct(r.conversion)}</td>
    `;

    tbody.appendChild(tr);
  });
}

function sum(arr, key){
  return arr.reduce((acc, x) => acc + (x[key] || 0), 0);
}

function updateKPIs(range){
  const data = state.data.slice(-range);
  const prev = state.data.slice(-(range*2), -range);

  const signups = sum(data, "signups");
  const visits = sum(data, "visits");
  const leads = sum(data, "leads");
  const conv = visits > 0 ? (signups / visits) * 100 : 0;

  const signupsPrev = sum(prev, "signups");
  const visitsPrev = sum(prev, "visits");
  const leadsPrev = sum(prev, "leads");
  const convPrev = visitsPrev > 0 ? (signupsPrev / visitsPrev) * 100 : 0;

  $("#kpiSignups").textContent = fmtInt(signups);
  $("#kpiVisits").textContent = fmtInt(visits);
  $("#kpiLeads").textContent = fmtInt(leads);
  $("#kpiConversion").textContent = fmtPct(conv);

  setDelta($("#deltaSignups"), pctChange(signups, signupsPrev));
  setDelta($("#deltaVisits"), pctChange(visits, visitsPrev));
  setDelta($("#deltaLeads"), pctChange(leads, leadsPrev));
  setDelta($("#deltaConversion"), pctChange(conv, convPrev));
}

function updateChart(range){
  const data = state.data.slice(-range);
  const maxVisits = Math.max(...data.map(d => d.visits));
  const maxSignups = Math.max(...data.map(d => d.signups));

  // Put them on roughly comparable scale by normalizing signups up to visits range
  const scale = maxSignups > 0 ? (maxVisits / maxSignups) : 1;

  const seriesVisits = data.map(d => ({ x: d.date, y: d.visits }));
  const seriesWaitlist = data.map(d => ({ x: d.date, y: Math.round(d.signups * scale) }));

  drawChart($("#chart"), seriesVisits, seriesWaitlist);
}

function setLastUpdated(){
  const d = new Date();
  const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  $("#lastUpdated").textContent = `${formatDate(d)} ${t}`;
}

function setRange(range){
  state.range = range;
  updateKPIs(range);
  updateChart(range);
  updateTable(state.data.slice(-range));
  setLastUpdated();
}

function wireUI(){
  $$(".seg").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".seg").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setRange(Number(btn.dataset.range));
    });
  });

  $("#refreshBtn").addEventListener("click", () => {
    // regenerate data so it feels like a refresh
    state.data = generateData(60);
    setRange(state.range);

    // small status pulse
    const pill = $("#statusPill");
    pill.animate(
      [{ transform: "translateY(0)" }, { transform: "translateY(-2px)" }, { transform: "translateY(0)" }],
      { duration: 320, easing: "ease-out" }
    );
  });
}

function init(){
  $("#year").textContent = String(new Date().getFullYear());
  state.data = generateData(60);
  wireUI();
  setRange(state.range);
}

init();
