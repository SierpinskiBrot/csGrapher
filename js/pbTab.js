import { dhm } from "./utils.js"
import { themes } from "./themes.js"
import { tCrit68, olsThroughPoint, scanMax } from "./probabilities.js"
export { updatePBTable, pbTabStartup }

//which session/series the prediction graphs are showing, so the radio can redraw them
let shownSess = 0;
let shownSeries = 0;

//redraw the predictions when the regression type radio or the theme changes
document.querySelectorAll('input[name="pbRegType"]').forEach(radio => {
    radio.addEventListener("change", redrawPredictions);
});
window.addEventListener("themechange", redrawPredictions);
function redrawPredictions() {
    if (window.userData) drawPBPredictionGraphs(shownSess, shownSeries);
}

function fmtSeconds(v) {
    return Number.isFinite(v) ? v.toFixed(3) + "s" : "N/A";
}

function fmtDate(d) {
    return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear(); //month is 0-indexed
}

//create the list for stats tab
function updatePBTable(sess, series) {
    const seriesStats = window.userData.pbInfo[sess]?.[series];
    const pbStatsBody = document.getElementById("pbStatsBody");
    pbStatsBody.replaceChildren();

    drawPBPredictionGraphs(sess, series);

    if (!seriesStats || seriesStats.times.length === 0) {
        document.getElementById("bestSince").innerText = "No PBs in this series yet.";
        return;
    }

    document.getElementById("bestSince").innerText =
        `The best time since your last PB was ${fmtSeconds(seriesStats.bestSinceLastPB)}.
        The mean time since your last PB is ${fmtSeconds(seriesStats.meanSinceLastPB)},
        with a standard deviation of ${fmtSeconds(seriesStats.stdSinceLastPB)}.`

    const numPBs = seriesStats.times.length;
    const isReal = window.userData.sessIsReal[sess];

    for (let i = numPBs - 1; i >= 0; i--) {
        const isCurrent = (i === numPBs - 1);
        const date = seriesStats.dates[i];
        const solveNum = seriesStats.solveNums[i];

        //PB For Time: until the next PB, or until now for the current PB
        const until = isCurrent ? new Date() : seriesStats.dates[i + 1];
        let dateStr = fmtDate(date);
        let pbForTimeStr = dhm(Math.abs(until - date)) + (isCurrent ? " and counting" : "");
        if (!isReal[solveNum - 1]) {
            dateStr = "Unknown";
            pbForTimeStr = "Unknown";
        }

        //PB For # Solves: until the next PB, or until the latest solve for the current PB
        const nextSolveNum = isCurrent ? window.userData.solves[sess].length : seriesStats.solveNums[i + 1];
        const pbForSolvesStr = (nextSolveNum - solveNum) + (isCurrent ? " and counting" : "");

        const cells = [i + 1, seriesStats.times[i].toFixed(3), dateStr, pbForTimeStr, solveNum, pbForSolvesStr];
        const newRow = document.createElement("tr");
        for (const c of cells) {
            const td = document.createElement("td");
            td.textContent = c;
            newRow.appendChild(td);
        }
        pbStatsBody.appendChild(newRow);
    }
}

function pbTabStartup() {
    updatePBTable(window.selectedSess, 0)
}


function getRegType() {
    return document.querySelector('input[name="pbRegType"]:checked')?.value || "linear";
}

/*
Both models pass through the most recent PB, so the prediction continues from where
you actually are.

linear: a straight line forced through the last PB, fitted on the last 20% of PBs.
exponential: y = c + a*e^(b*x) forced through the first and the last PB, fitted on all PBs.

lo/hi is a 68% prediction interval for the next PB: if the model is right and the
scatter around it is normal, the next PB lands inside it 68% of the time (the same
coverage as +-1 SD).
*/
function anchoredLinear(points, x0) {
    const m = Math.max(4, Math.ceil(0.2 * points.length));
    const use = points.slice(-m, -1); //fitted points, the anchor itself excluded
    const last = points[points.length - 1];

    const r = olsThroughPoint(use.map(p => p.x), use.map(p => p.y), last.x, last.y, x0);
    if (!r) return null;

    return {
        pred: r.yhat,
        lo: r.lo,
        hi: r.hi,
        curve: x => last.y + r.b * (x - last.x),
        xFrom: use[0].x,
    };
}

//exponential y = c + a*e^(b*x) forced through the first and the most recent PB.
//Written as y = y1 + (yn - y1) * (e^(b(x-x1)) - 1) / (e^(b(xn-x1)) - 1), so the only free
//parameter is the curvature b (b -> 0 is a straight line). b is fitted by least squares
//on the PBs in between.
function clampedExponential(points, x0) {
    const first = points[0];
    const last = points[points.length - 1];
    const inner = points.slice(1, -1);
    const L = last.x - first.x;
    if (inner.length < 2 || L <= 0) return null;

    const shape = (b, x) => Math.abs(b * L) < 1e-9
        ? (x - first.x) / L
        : Math.expm1(b * (x - first.x)) / Math.expm1(b * L);
    const model = (b, x) => first.y + (last.y - first.y) * shape(b, x);
    const sse = b => {
        let s = 0;
        for (const p of inner) s += (p.y - model(b, p.x)) ** 2;
        return s;
    };

    //search u = b*L on a grid, then refine the best cell with golden section
    const b = scanMax(u => -sse(u / L), -40, 40, 400, 60) / L;

    //68% prediction interval: linearise the model in b around the fit
    //(dy/db at each point), same formula as least squares with one parameter
    const h = 1e-4 / L;
    const dydb = x => (model(b + h, x) - model(b - h, x)) / (2 * h);
    let Sgg = 0;
    for (const p of inner) Sgg += dydb(p.x) ** 2;
    const dof = inner.length - 1;
    const s = Math.sqrt(sse(b) / dof);
    const g0 = dydb(x0);
    const se = s * Math.sqrt(1 + (Sgg > 0 ? g0 * g0 / Sgg : 0));
    const pred = model(b, x0);
    const half = tCrit68(dof) * se;

    return {
        pred,
        lo: pred - half,
        hi: pred + half,
        curve: x => model(b, x),
        xFrom: first.x,
    };
}

function fitModel(points, x0, type) {
    return type === "exp" ? clampedExponential(points, x0) : anchoredLinear(points, x0);
}

function drawPBPredictionGraphs(sess, series) {
    shownSess = sess;
    shownSeries = series;

    const numOut = document.getElementById("solveNumPrediction");
    const timeOut = document.getElementById("solveTimePrediction");
    const dateOut = document.getElementById("solveDatePrediction");

    const stats = window.userData.pbInfo[sess]?.[series];
    if (!stats || stats.times.length < 4) {
        const msg = "Need at least 4 PBs to make a prediction";
        numOut.innerText = msg; timeOut.innerText = msg; dateOut.innerText = msg;
        drawGraph("solveNumRegression", [], null, 2, "Solve #");
        drawGraph("solveTimeRegression", [], null, 2, "Time");
        drawGraph("solveDateRegression", [], null, 2, "Date");
        return;
    }

    const type = getRegType();
    const n = stats.times.length;
    const x0 = n + 1; //the next PB

    //x is always the PB number (1-based)
    const numPts = stats.solveNums.map((y, i) => ({ x: i + 1, y }));
    const timePts = stats.times.map((y, i) => ({ x: i + 1, y }));
    //seconds since the first PB
    const t0 = stats.dates[0].getTime();
    const datePts = stats.dates.map((d, i) => ({ x: i + 1, y: (d.getTime() - t0) / 1000 }));

    const numFit = fitModel(numPts, x0, type);
    const timeFit = fitModel(timePts, x0, type);
    const dateFit = fitModel(datePts, x0, type);

    drawGraph("solveNumRegression", numPts, numFit, x0, "Solve #");
    drawGraph("solveTimeRegression", timePts, timeFit, x0, "Time");
    drawGraph("solveDateRegression", datePts, dateFit, x0, "Date");

    //-----solve #-----
    //the next PB has not happened yet, so it can't be before the next solve
    const nextSolve = window.userData.solves[sess].length + 1;
    if (!numFit) {
        numOut.innerText = "Solve # prediction: N/A";
    } else if (Math.ceil(numFit.hi) < nextSolve) {
        numOut.innerText = `Next PB is overdue: the model expected it by Solve #${Math.ceil(numFit.hi)}, you are on #${nextSolve - 1}`;
    } else {
        numOut.innerText =
            `Next PB will happen around Solve #${Math.max(nextSolve, Math.ceil(numFit.pred))}
            68% interval: #${Math.max(nextSolve, Math.ceil(numFit.lo))} to #${Math.ceil(numFit.hi)}`;
    }

    //-----time-----
    //the next PB has to beat the current one
    const maxTime = stats.times[n - 1] - 0.001;
    if (!timeFit) {
        timeOut.innerText = "Time prediction: N/A";
    } else {
        timeOut.innerText =
            `Next PB will be around ${Math.min(maxTime, Math.max(0, timeFit.pred)).toFixed(3)}s
            68% interval: ${Math.max(0, timeFit.lo).toFixed(3)}s to ${Math.min(maxTime, timeFit.hi).toFixed(3)}s`;
    }

    //-----date-----
    const allReal = stats.solveNums.every(s => window.userData.sessIsReal[sess][s - 1]);
    const toDate = secs => new Date(t0 + secs * 1000);
    const now = Date.now();
    if (!allReal) {
        dateOut.innerText = "Date prediction: N/A (some PB dates are estimated)";
    } else if (!dateFit) {
        dateOut.innerText = "Date prediction: N/A";
    } else if (toDate(dateFit.hi).getTime() < now) {
        dateOut.innerText = `Next PB is overdue: the model expected it by ${fmtDate(toDate(dateFit.hi))}`;
    } else {
        const predDate = new Date(Math.max(now, toDate(dateFit.pred).getTime()));
        const loDate = new Date(Math.max(now, toDate(dateFit.lo).getTime()));
        dateOut.innerText =
            `Next PB will happen around ${fmtDate(predDate)}
            68% interval: ${fmtDate(loDate)} to ${fmtDate(toDate(dateFit.hi))}`;
    }
}

function drawGraph(graphId, points, fit, x0, ylabel) {
    const canvas = document.getElementById(graphId);
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const margin = 40;
    const theme = themes[window.currentTheme];

    //fill the background
    ctx.fillStyle = theme['--color-surface'];
    ctx.fillRect(0, 0, w, h);

    //scales: x from PB 1 to the predicted PB, y from 0 to a bit above everything drawn
    let yMax = 0;
    for (const p of points) yMax = Math.max(yMax, p.y);
    if (fit && Number.isFinite(fit.hi)) yMax = Math.max(yMax, fit.hi);
    yMax = (yMax || 1) * 1.1;
    const X = x => margin + (x - 1) / Math.max(1, x0 - 1) * (w - margin - 15);
    const Y = y => h - margin - (Math.min(Math.max(y, 0), yMax) / yMax) * (h - margin - 10);

    //draw axes
    ctx.strokeStyle = theme['--graph-ink'];
    ctx.fillStyle = theme['--graph-ink'];
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(margin, 0);
    ctx.lineTo(margin, h - margin);
    ctx.lineTo(w, h - margin);
    ctx.stroke();

    //draw labels
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 24px serif";
    ctx.fillText("PB #", w / 2, h - 14);
    ctx.save();
    ctx.translate(w - 1, 0);
    ctx.rotate(3 * Math.PI / 2);
    ctx.fillText(ylabel, -h / 1.8, -(w - 30));
    ctx.restore();

    //draw the actual data
    ctx.strokeStyle = theme['--color-primary'];
    ctx.beginPath();
    points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(X(p.x), Y(p.y));
        else ctx.lineTo(X(p.x), Y(p.y));
    });
    ctx.stroke();

    if (!fit) return;

    //draw the fitted curve (dashed) from the first fitted point to the prediction
    ctx.strokeStyle = theme['--color-secondary'];
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
        const x = fit.xFrom + (x0 - fit.xFrom) * i / steps;
        if (i === 0) ctx.moveTo(X(x), Y(fit.curve(x)));
        else ctx.lineTo(X(x), Y(fit.curve(x)));
    }
    ctx.stroke();
    ctx.setLineDash([]);

    //draw the 68% interval as an error bar at the next PB
    const xp = X(x0);
    ctx.beginPath();
    ctx.moveTo(xp, Y(fit.lo)); ctx.lineTo(xp, Y(fit.hi));
    ctx.moveTo(xp - 6, Y(fit.lo)); ctx.lineTo(xp + 6, Y(fit.lo));
    ctx.moveTo(xp - 6, Y(fit.hi)); ctx.lineTo(xp + 6, Y(fit.hi));
    ctx.stroke();
    ctx.fillStyle = theme['--color-secondary'];
    ctx.fillRect(xp - 4, Y(fit.pred) - 4, 8, 8);
}