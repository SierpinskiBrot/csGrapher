import { themes } from "./themes.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MS_PER_DAY = 86400000;

let view = "week";      //"week" or "calendar"
let scale = "linear";   //"linear" or "log"
let period = "all";     //"all" or a year number as a string
let yearsForSess = -1;  //session the period dropdown was last built for
let hitRegions = [];    //hoverable rectangles from the last draw, in css pixels

//#region helpers
//day number that is the same for every solve on a local calendar day, and consecutive for consecutive days
function dayIndex(d) {
    return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY);
}
function dateFromDayIndex(idx) {
    const u = new Date(idx * MS_PER_DAY);
    return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
}
function formatDay(idx, weekday = true) {
    const opts = { year: "numeric", month: "short", day: "numeric" };
    if (weekday) opts.weekday = "short";
    return dateFromDayIndex(idx).toLocaleDateString(undefined, opts);
}
function hourRange(h) {
    return `${h}:00–${(h + 1) % 24}:00`;
}
function plural(n, word) {
    return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
}

function themeColor(name) {
    return themes[window.currentTheme][name].trim();
}
function hexToRgb(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
}

//true when the session holds solve times (acubemy sessions can hold turns, tps, etc.)
function sessHasTimes(sess) {
    if (window.userData.dataFormat !== "acubemy") return true;
    return [0, 3, 4, 5, 6].includes(Number(sess));
}
//#endregion

//#region data
//collect every solve with a real date in the selected session and period
function collectActivity(sess) {
    const solves = window.userData.solves[sess] ?? [];
    const real = window.userData.sessIsReal?.[sess];

    const week = Array.from({ length: 7 }, () => Array(24).fill(0));
    const days = new Map();  //dayIndex -> {count, sum, n}
    let total = 0, estimated = 0, timeSum = 0;

    for (let i = 0; i < solves.length; i++) {
        //skip estimated dates
        if (real && real[i] === 0) { estimated++; continue; }
        const d = solves[i][0];
        if (period !== "all" && d.getFullYear() !== Number(period)) continue;

        total++;
        week[d.getDay()][d.getHours()]++;

        const key = dayIndex(d);
        let day = days.get(key);
        if (!day) { day = { count: 0, sum: 0, n: 0 }; days.set(key, day); }
        day.count++;
        const t = solves[i][1];
        if (t != null && Number.isFinite(t)) { day.sum += t; day.n++; timeSum += t; }
    }
    return { week, days, total, estimated, timeSum };
}

function yearsInSession(sess) {
    const solves = window.userData.solves[sess] ?? [];
    const real = window.userData.sessIsReal?.[sess];
    const years = new Set();
    for (let i = 0; i < solves.length; i++) {
        if (real && real[i] === 0) continue;
        years.add(solves[i][0].getFullYear());
    }
    return [...years].sort((a, b) => b - a);
}
//#endregion

//#region controls
function rebuildPeriodDropdown() {
    const sess = window.selectedSess;
    if (yearsForSess === sess) return;
    yearsForSess = sess;

    const select = document.getElementById("activityPeriod");
    const years = yearsInSession(sess);
    select.innerHTML = "";
    select.add(new Option("All time", "all"));
    for (const y of years) select.add(new Option(String(y), String(y)));
    if (!years.includes(Number(period))) period = "all";
    select.value = period;
}

function setupControls() {
    for (const input of document.querySelectorAll('input[name="activityView"]')) {
        input.addEventListener("change", () => { view = input.value; drawHeatmap(); });
    }
    for (const input of document.querySelectorAll('input[name="activityScale"]')) {
        input.addEventListener("change", () => { scale = input.value; drawHeatmap(); });
    }
    document.getElementById("activityPeriod").addEventListener("change", (e) => {
        period = e.target.value;
        drawHeatmap();
    });

    const canvas = document.getElementById("activityCanvas");
    const tooltip = document.getElementById("activityTooltip");
    canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const hit = hitRegions.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
        if (!hit) { tooltip.style.display = "none"; return; }

        tooltip.innerHTML = hit.html;
        tooltip.style.display = "block";
        //keep the tooltip inside the canvas
        const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
        let tx = x + 14, ty = y + 14;
        if (tx + tw > rect.width) tx = x - tw - 14;
        if (ty + th > rect.height) ty = y - th - 14;
        tooltip.style.left = Math.max(0, tx) + "px";
        tooltip.style.top = Math.max(0, ty) + "px";
    });
    canvas.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });

    window.addEventListener("themechange", () => { if (window.currentTab === "activity") drawHeatmap(); });
    let resizeQueued = false;
    window.addEventListener("resize", () => {
        if (resizeQueued || window.currentTab !== "activity") return;
        resizeQueued = true;
        requestAnimationFrame(() => { resizeQueued = false; drawHeatmap(); });
    });
}
let controlsReady = false;
//#endregion

export function activityTabStartup() {
    if (!controlsReady) { setupControls(); controlsReady = true; }
    yearsForSess = -1;
    drawHeatmap();
}

export function drawHeatmap() {
    if (!window.userData) return;
    rebuildPeriodDropdown();

    const sess = window.selectedSess;
    const data = collectActivity(sess);
    updateStats(sess, data);

    const canvas = document.getElementById("activityCanvas");
    const cssW = canvas.parentElement.clientWidth;
    if (cssW === 0) return; //tab is hidden, will be drawn when shown

    const colors = {
        bg: themeColor("--color-surface"),
        empty: themeColor("--color-surface-odd"),
        text: themeColor("--on-surface"),
        low: hexToRgb(themeColor("--color-secondary-variant")),
        high: hexToRgb(themeColor("--color-primary-variant")),
    };

    hitRegions = [];
    document.getElementById("activityTooltip").style.display = "none";
    const layout = view === "week" ? weekLayout(cssW) : calendarLayout(cssW, data);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(layout.height * dpr);
    canvas.style.height = layout.height + "px";

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, cssW, layout.height);

    if (data.total === 0) {
        ctx.fillStyle = colors.text;
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("No dated solves in this session" + (period === "all" ? "" : ` for ${period}`), cssW / 2, layout.height / 2);
        return;
    }

    if (view === "week") drawWeek(ctx, cssW, layout, data, colors);
    else drawCalendar(ctx, cssW, layout, data, colors);
}

//maps a count to a fill color; zero is always the empty color
function makeColorScale(max, colors) {
    const norm = scale === "log"
        ? (c) => Math.log1p(c) / Math.log1p(max)
        : (c) => c / max;
    return (c) => c === 0 ? colors.empty : mix(colors.low, colors.high, Math.min(1, norm(c)));
}

function drawLegend(ctx, x, y, max, colors) {
    const color = makeColorScale(max, colors);
    const w = 160, h = 12;
    ctx.font = "13px Arial";
    ctx.fillStyle = colors.text;
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.fillText("Fewer", x - 6, y + h / 2);

    for (let i = 0; i < w; i++) {
        //sample the scale in "count space" so the legend matches the cells in log mode too
        const t = i / (w - 1);
        const c = scale === "log" ? Math.expm1(t * Math.log1p(max)) : t * max;
        ctx.fillStyle = c < 0.5 ? colors.empty : color(Math.max(c, 1e-9));
        ctx.fillRect(x + i, y, 1, h);
    }
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    ctx.fillStyle = colors.text;
    ctx.textAlign = "left";
    ctx.fillText(`More (max ${max.toLocaleString()}${scale === "log" ? ", log scale" : ""})`, x + w + 6, y + h / 2);
}

//#region week x hour view
function weekLayout(W) {
    const left = 46, barArea = 70, gap = 6;
    const top = 16 + 50 + gap;  //title row + hour totals bars
    const gridW = W - left - gap - barArea - 16;
    const cellW = gridW / 24;
    const cellH = Math.max(18, Math.min(cellW * 0.9, 48));
    const gridH = cellH * 7;
    const height = top + gridH + 26 + 34;
    return { left, top, gap, barArea, cellW, cellH, gridW, gridH, height };
}

function drawWeek(ctx, W, L, data, colors) {
    const { left, top, gap, cellW, cellH, gridW, gridH } = L;
    const week = data.week;
    const max = Math.max(...week.flat());
    const color = makeColorScale(max, colors);
    const hourTotals = Array.from({ length: 24 }, (_, h) => week.reduce((s, row) => s + row[h], 0));
    const dayTotals = week.map(row => row.reduce((a, b) => a + b, 0));
    const pct = (n) => (100 * n / data.total).toFixed(1) + "%";
    const pad = cellW > 24 ? 1.5 : 1;

    //cells
    for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
            const x = left + h * cellW, y = top + d * cellH;
            ctx.fillStyle = color(week[d][h]);
            ctx.fillRect(x + pad, y + pad, cellW - 2 * pad, cellH - 2 * pad);
            hitRegions.push({
                x, y, w: cellW, h: cellH,
                html: `<b>${DAY_NAMES_LONG[d]}, ${hourRange(h)}</b><br>${plural(week[d][h], "solve")} (${pct(week[d][h])})`,
            });
        }
    }

    //hour totals above the grid
    const barBottom = top - gap, barMaxH = 50 - 4;
    const maxHour = Math.max(...hourTotals);
    ctx.fillStyle = mix(colors.low, colors.high, 0.7);
    for (let h = 0; h < 24; h++) {
        const bh = maxHour ? barMaxH * hourTotals[h] / maxHour : 0;
        ctx.fillRect(left + h * cellW + pad, barBottom - bh, cellW - 2 * pad, bh);
        hitRegions.push({
            x: left + h * cellW, y: barBottom - barMaxH, w: cellW, h: barMaxH,
            html: `<b>${hourRange(h)}</b>, all days<br>${plural(hourTotals[h], "solve")} (${pct(hourTotals[h])})`,
        });
    }

    //day totals to the right of the grid
    const barLeft = left + gridW + gap, barMaxW = L.barArea - 4;
    const maxDay = Math.max(...dayTotals);
    for (let d = 0; d < 7; d++) {
        const bw = maxDay ? barMaxW * dayTotals[d] / maxDay : 0;
        ctx.fillRect(barLeft, top + d * cellH + pad, bw, cellH - 2 * pad);
        hitRegions.push({
            x: barLeft, y: top + d * cellH, w: barMaxW, h: cellH,
            html: `<b>${DAY_NAMES_LONG[d]}</b>, all hours<br>${plural(dayTotals[d], "solve")} (${pct(dayTotals[d])})`,
        });
    }

    ctx.fillStyle = colors.text;
    ctx.font = "13px Arial";

    //bar captions
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Solves by hour", left, 2);
    ctx.textAlign = "center";
    ctx.fillText("By day", barLeft + barMaxW / 2, top - gap - 16);

    //day labels
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = "14px Arial";
    for (let d = 0; d < 7; d++) ctx.fillText(DAY_NAMES[d], left - 8, top + d * cellH + cellH / 2);

    //hour labels sit on the column boundaries
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const step = cellW < 22 ? 3 : 2;
    for (let h = 0; h <= 24; h += step) ctx.fillText(h + ":00", left + h * cellW, top + gridH + 6);

    drawLegend(ctx, left + 50, top + gridH + 32, max, colors);
}
//#endregion

//#region calendar view
function calendarLayout(W, data) {
    let years;
    if (period !== "all") years = [Number(period)];
    else {
        const keys = [...data.days.keys()];
        if (keys.length === 0) years = [new Date().getFullYear()];
        else {
            const first = dateFromDayIndex(Math.min(...keys)).getFullYear();
            const last = dateFromDayIndex(Math.max(...keys)).getFullYear();
            years = [];
            for (let y = last; y >= first; y--) years.push(y);
        }
    }
    const left = 40, cols = 54;
    const cell = Math.max(8, Math.min(22, Math.floor((W - left - 16) / cols)));
    const blockH = 22 + 14 + cell * 7 + 14;
    const legendH = 34;
    return { left, cell, years, blockH, top: 6, height: 6 + years.length * blockH + legendH };
}

function drawCalendar(ctx, W, L, data, colors) {
    const { left, cell, years, blockH } = L;
    let max = 0;
    for (const d of data.days.values()) max = Math.max(max, d.count);
    const color = makeColorScale(max, colors);
    const pad = cell >= 14 ? 1.5 : 1;
    const showMeans = sessHasTimes(window.selectedSess);

    years.forEach((year, yi) => {
        const y0 = L.top + yi * blockH;
        const gridTop = y0 + 22 + 14;
        const jan1 = new Date(year, 0, 1);
        const start = dayIndex(jan1) - jan1.getDay(); //sunday on or before Jan 1
        const end = dayIndex(new Date(year, 11, 31));

        //year title with its total
        let yearTotal = 0;
        for (let i = dayIndex(jan1); i <= end; i++) yearTotal += data.days.get(i)?.count ?? 0;
        ctx.fillStyle = colors.text;
        ctx.font = "bold 15px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(`${year}  ·  ${plural(yearTotal, "solve")}`, left, y0 + 2);

        //day labels
        ctx.font = "12px Arial";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        for (const d of [1, 3, 5]) ctx.fillText(DAY_NAMES[d], left - 6, gridTop + d * cell + cell / 2);

        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        for (let i = dayIndex(jan1); i <= end; i++) {
            const col = Math.floor((i - start) / 7), row = (i - start) % 7;
            const x = left + col * cell, y = gridTop + row * cell;
            const date = dateFromDayIndex(i);

            //month label above the column holding the 1st
            if (date.getDate() === 1) {
                ctx.fillStyle = colors.text;
                ctx.fillText(MONTH_NAMES[date.getMonth()], x, gridTop - 2);
            }

            const day = data.days.get(i);
            const count = day?.count ?? 0;
            ctx.fillStyle = color(count);
            ctx.fillRect(x + pad, y + pad, cell - 2 * pad, cell - 2 * pad);

            let html = `<b>${formatDay(i)}</b><br>${plural(count, "solve")}`;
            if (showMeans && day?.n) html += `<br>mean ${(day.sum / day.n).toFixed(2)}`;
            hitRegions.push({ x, y, w: cell, h: cell, html });
        }
    });

    drawLegend(ctx, left + 50, L.top + years.length * blockH + 6, max, colors);
}
//#endregion

//#region stats panel
function updateStats(sess, data) {
    const body = document.getElementById("activityStatsBody");
    const rows = [];
    const add = (label, value) => rows.push(`<tr><td>${label}</td><td>${value}</td></tr>`);

    if (data.total === 0) {
        body.innerHTML = `<tr><td colspan="2">No dated solves</td></tr>`;
        return;
    }

    const keys = [...data.days.keys()].sort((a, b) => a - b);
    const first = keys[0], last = keys[keys.length - 1];
    const spanDays = last - first + 1;

    //busiest day
    let bestDay = first;
    for (const k of keys) if (data.days.get(k).count > data.days.get(bestDay).count) bestDay = k;

    //streaks of consecutive active days
    let longest = 1, longestEnd = first, run = 1;
    for (let i = 1; i < keys.length; i++) {
        run = keys[i] === keys[i - 1] + 1 ? run + 1 : 1;
        if (run > longest) { longest = run; longestEnd = keys[i]; }
    }
    //the current streak counts if the last active day was today or yesterday
    const today = dayIndex(new Date());
    let current = 0;
    if (today - last <= 1) {
        current = 1;
        for (let i = keys.length - 1; i > 0 && keys[i] === keys[i - 1] + 1; i--) current++;
    }

    const dayTotals = data.week.map(row => row.reduce((a, b) => a + b, 0));
    const hourTotals = Array.from({ length: 24 }, (_, h) => data.week.reduce((s, row) => s + row[h], 0));
    const busiestDow = dayTotals.indexOf(Math.max(...dayTotals));
    const busiestHour = hourTotals.indexOf(Math.max(...hourTotals));
    const pct = (n) => (100 * n / data.total).toFixed(1) + "%";

    add("Solves", data.total.toLocaleString());
    add("Active days", `${keys.length.toLocaleString()} of ${spanDays.toLocaleString()} (${(100 * keys.length / spanDays).toFixed(0)}%)`);
    add("Solves per active day", (data.total / keys.length).toFixed(1));
    add("Most in one day", `${data.days.get(bestDay).count.toLocaleString()}<br><small>${formatDay(bestDay)}</small>`);
    add("Longest streak", `${plural(longest, "day")}<br><small>${formatDay(longestEnd - longest + 1, false)} – ${formatDay(longestEnd, false)}</small>`);
    if (period === "all" || Number(period) === new Date().getFullYear()) add("Current streak", plural(current, "day"));
    add("Busiest weekday", `${DAY_NAMES_LONG[busiestDow]} (${pct(dayTotals[busiestDow])})`);
    add("Busiest hour", `${hourRange(busiestHour)} (${pct(hourTotals[busiestHour])})`);
    if (sessHasTimes(sess)) add("Time spent solving", `${(data.timeSum / 3600).toFixed(1)} h`);
    add("First solve", formatDay(first, false));
    add("Last solve", formatDay(last, false));
    if (data.estimated > 0) add("Excluded", `${plural(data.estimated, "solve")} with no recorded date`);

    body.innerHTML = rows.join("");
}
//#endregion
