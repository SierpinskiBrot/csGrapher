//TPS graph for acubemy files: the average turns per second at each point of a solve, shown in the histogram tab when move_times is selected
import {sampleMoments} from "./probabilities.js"
import {drawHist} from "./histPlot.js"
export {parseMoveSolves, drawTPS}

//settings for the TPS graph, read from the TPS Graph Settings menu
window.tpsSettings = {
    bucketSize: 1,          //column width, in % of the solve
    smoothing: 0,           //decay length of the smoothing weights, in % of the solve (0 = off)
    sectioned: true,        //stretch each step to its mean share of the solve, or use the raw moveTime/totalTime
    splitLL: true,          //oll and pll as separate steps, or merged into one last layer step (zbll)
    timeAxis: false,        //x axis in seconds (each file's solves stretched to its mean time) instead of % solved
    worstPct: 0,            //% of slowest solves removed
}
//other files drawn on the TPS graph: [{name, solves}], solves from parseMoveSolves
window.tpsComparisons = []
const compareColors = ["#0000FF", "#00AA00", "#FF8C00", "#FF00FF"]

//add an acubemy export (parsed json) to compare against, using the same settings but all of its solves
window.addTPSComparison = function(data, name) {
    if (!Array.isArray(data)) throw new Error("not an acubemy export")
    while (name == "TPS" || window.tpsComparisons.some(c => c.name == name)) name += "*"
    window.tpsComparisons.push({ name, solves: parseMoveSolves(data) })
    tpsCompareList.textContent = window.tpsComparisons.map(c => c.name).join(", ")
    if (window.isMoveTimes()) drawTPS()
}

//#region TPS Graph Settings menu
const numberInputs = [["bucketSize", tpsBucketInput], ["smoothing", tpsSmoothing], ["worstPct", tpsWorstPct]]
const toggles = [["sectioned", tpsSelectSectioned], ["splitLL", tpsSelectSplit], ["timeAxis", tpsSelectTime]]
function readTPSMenu() {
    const set = window.tpsSettings
    for (const [key, input] of numberInputs) set[key] = Math.max(0, parseFloat(input.value) || 0)
    if (!(set.bucketSize > 0)) tpsBucketInput.value = set.bucketSize = 1
    for (const [key, radio] of toggles) set[key] = radio.checked
    if (window.isMoveTimes()) drawTPS()
}
tpsMenu.addEventListener("change", e => { if (e.target != tpsCompareFile) readTPSMenu() })
tpsBucketReset.addEventListener("click", function() {
    tpsBucketInput.value = 1
    readTPSMenu()
})
tpsCompareAdd.addEventListener("click", () => tpsCompareFile.click())
tpsCompareFile.addEventListener("change", async function() {
    for (const file of this.files) {
        try { window.addTPSComparison(JSON.parse(await file.text()), file.name.replace(/\.json$/i, "")) }
        catch { alert(`${file.name} is not an acubemy export`) }
    }
    this.value = ""
})
tpsCompareClear.addEventListener("click", function() {
    window.tpsComparisons = []
    tpsCompareList.textContent = ""
    if (window.isMoveTimes()) drawTPS()
})
//#endregion

//the CFOP solves of an acubemy export, oldest first, with step times (ms: cross, f2l, oll, pll), moves per step and move timestamps (ms)
function parseMoveSolves(data) {
    const solves = []
    for (let i = data.length - 1; i > -1; i--) {
        const s = data[i]
        if (s.analysis_type != "CFOP") continue
        const f2l = s.f2l_pair1_time + s.f2l_pair2_time + s.f2l_pair3_time + s.f2l_pair4_time
        solves.push({
            date: new Date(s.date),
            total: s.total_time,
            turns: s.turns,
            tps: s.tps,
            steps: [s.cross_time, f2l, s.oll_time, s.pll_time].map(t => t || 0),
            stepMoves: [s.cross_moves, [1, 2, 3, 4].flatMap(p => s[`f2l_pair${p}_moves`] ?? []), s.oll_moves, s.pll_moves].map(m => m?.length || 0),
            moveTimes: s.move_times,
        })
    }
    return solves
}

//step times of a solve, with oll and pll merged unless splitLL
function solveSteps(s, set) {
    return set.splitLL ? s.steps : [s.steps[0], s.steps[1], s.steps[2] + s.steps[3]]
}

//the solves that go into a TPS curve: valid ones, minus the worst % by time
function filterSolves(solves, set) {
    const kept = solves.filter(s => s.total > 0 && s.moveTimes?.length > 1)
    const slow = new Set([...kept].sort((a, b) => b.total - a.total).slice(0, Math.round(kept.length * set.worstPct / 100)))
    return kept.filter(s => !slow.has(s))
}

//where time t (ms) of a solve is placed on the graph, in %
//steps: the solve's step times, ends: when each step ends, shares: cumulative share of the solves' time at the end of each step
function warp(t, total, steps, ends, shares, set) {
    if (!set.sectioned) return 100 * t / total
    const last = steps.length - 1
    for (let k = 0; k <= last; k++) {
        //the first step that isn't skipped and hasn't ended yet (anything after the end goes in the last step)
        if (!steps[k] || (t > ends[k] && k < last)) continue
        const start = k ? shares[k - 1] : 0
        return 100 * (start + (shares[k] - start) * (t - ends[k] + steps[k]) / steps[k])
    }
    return 100 * t / total
}

//the TPS in each column of the solve for these solves: {x: column centers (%), tps, shares, meanTime (s)} (null if there are no solves)
function tpsCurve(solves, set) {
    if (!solves.length) return null
    const size = parseFloat(set.bucketSize)
    const n = Math.ceil(100 / size - 1e-9)
    const counts = new Float64Array(n)
    const column = p => Math.min(n - 1, Math.max(0, Math.floor(p / size)))

    //each step's share of the time of these solves
    let totalSum = 0
    const stepSums = solveSteps(solves[0], set).map(() => 0)
    for (const s of solves) {
        totalSum += s.total
        solveSteps(s, set).forEach((t, k) => stepSums[k] += t)
    }
    const stepTotal = stepSums.reduce((a, b) => a + b, 0)
    let cum = 0
    const shares = stepSums.map(t => (cum += t) / stepTotal)

    for (const s of solves) {
        const mt = s.moveTimes
        const steps = solveSteps(s, set)
        let end = 0
        const ends = steps.map(t => end += t)
        const place = t => Math.max(0, Math.min(100, warp(t, s.total, steps, ends, shares, set)))
        //each move is spread evenly over the columns between the previous move and itself
        //(steps end on a move, so the interval is within one step and even in % is even in time)
        //the first move starts the timer, so it has no time to be spread over and is left out
        for (let m = 1; m < mt.length; m++) {
            const p0 = place(Math.min(mt[m - 1], mt[m]))
            const p1 = place(Math.max(mt[m - 1], mt[m]))
            const b0 = column(p0), b1 = column(p1)
            if (b0 == b1) { counts[b0]++; continue }
            counts[b0] += ((b0 + 1) * size - p0) / (p1 - p0)
            for (let b = b0 + 1; b < b1; b++) counts[b] += size / (p1 - p0)
            counts[b1] += (p1 - b1 * size) / (p1 - p0)
        }
    }

    //every column of the solve lasts width% of the total time of the solves (sectioned or not), so TPS = moves / that time
    const x = [], tps = []
    for (let b = 0; b < n; b++) {
        const width = Math.min(size, 100 - b * size)
        x.push(b * size + width / 2)
        tps.push(counts[b] / (0.01 * width * 0.001 * totalSum))
    }
    return { x, tps, shares, meanTime: 0.001 * totalSum / solves.length }
}

//smooth [[x, y], ...] with weights exp(-|dx|/tau) out to +-radius, both in x units
function smoothExpKernel(rows, radius, tau) {
    return rows.map(([x], i) => {
        let num = 0, den = 0
        for (let j = i; j >= 0 && x - rows[j][0] <= radius; j--) { const w = Math.exp(-(x - rows[j][0]) / tau); num += w * rows[j][1]; den += w }
        for (let j = i + 1; j < rows.length && rows[j][0] - x <= radius; j++) { const w = Math.exp(-(rows[j][0] - x) / tau); num += w * rows[j][1]; den += w }
        return [x, num / den]
    })
}

//[moves, time (ms)] of each section of a solve, for the TPS Stats table
const statSections = [
    ["Cross", s => [s.stepMoves[0], s.steps[0]]],
    ["F2L", s => [s.stepMoves[1], s.steps[1]]],
    ["OLL", s => [s.stepMoves[2], s.steps[2]]],
    ["PLL", s => [s.stepMoves[3], s.steps[3]]],
    ["LL", s => [s.stepMoves[2] + s.stepMoves[3], s.steps[2] + s.steps[3]]],
    ["Overall", s => [s.turns, s.total]],
]
let statsKey = null, statsData = null

//the mean TPS and number of moves of the solves in each section (solves that skipped a section are left out of it)
//only recomputed when the solves change: the range, remove worst, or the file
function showTPSStats(solves, key) {
    if (key == statsKey && statsData == window.userData) return
    statsKey = key
    statsData = window.userData
    for (const [name, section] of statSections) {
        const done = solves.map(section).filter(([moves, time]) => moves > 0 && time > 0)
        const mean = xs => done.length ? sampleMoments(xs).mean : NaN
        const show = (id, x, digits) => document.getElementById(id + name).textContent = Number.isNaN(x) ? "-" : x.toFixed(digits)
        show("tpsMean", mean(done.map(([moves, time]) => 1000 * moves / time)), 2)
        show("tpsMoves", mean(done.map(([moves]) => moves)), 1)
    }
}

//draw the TPS graph of the solves in the range selector, with the comparison files
function drawTPS() {
    const set = window.tpsSettings
    const lower = parseInt(histRangeLow.value), upper = parseInt(histRangeHigh.value)
    const solves = filterSolves(window.userData.moveSolves.slice(lower - 1, upper), set)
    showTPSStats(solves, `${lower},${upper},${set.worstPct}`)
    const curves = [{ name: "TPS", solves }, ...window.tpsComparisons.map(c => ({ name: c.name, solves: filterSolves(c.solves, set) }))]
        .map(c => ({ name: c.name, curve: tpsCurve(c.solves, set) }))

    //one row per x value (in % solved all curves share their columns; in seconds each is stretched to its own mean time)
    const scale = curve => set.timeAxis ? curve.meanTime / 100 : 1
    const rows = new Map()
    curves.forEach(({ curve }, i) => {
        if (!curve) return
        const points = curve.x.map((x, j) => [x, curve.tps[j]])
        const smoothed = set.smoothing > 0 ? smoothExpKernel(points, 3 * set.smoothing, set.smoothing) : points
        smoothed.forEach(([x, y]) => {
            const key = x * scale(curve)
            if (!rows.has(key)) rows.set(key, [key, ...curves.map(() => null)])
            rows.get(key)[i + 1] = y
        })
    })
    const file = rows.size ? [...rows.values()].sort((a, b) => a[0] - b[0]) : [[0, ...curves.map(() => null)]]

    //mark where each step starts on average, in the column containing it
    const main = curves[0].curve
    const names = set.splitLL ? ["F2L", "OLL", "PLL"] : ["F2L", "LL"]
    const annotations = !main ? [] : names.map((shortText, k) => ({
        x: main.x[Math.min(main.x.length - 1, Math.floor(100 * main.shares[k] / set.bucketSize))] * scale(main),
        shortText,
        width: shortText == "F2L" ? 50 : 33,
        tickHeight: 20,
    }))

    const xlabel = set.timeAxis ? "Time(s)" : "% Solved"
    drawHist({
        rows: file,
        labels: [xlabel, ...curves.map(c => c.name)],
        colors: curves.slice(1).map((c, i) => compareColors[i % compareColors.length]),
        xlabel,
        ylabel: "TPS",
        step: false,
        spanGaps: true,
        yRange: null,
        xRange: null,
        annotations,
    })
}
