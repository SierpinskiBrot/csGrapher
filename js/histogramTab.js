import {sleep, defaultColumnWidth} from "./utils.js"
import {normalPDF, skewNormalPDF, skewNormalCDF, exGaussPDF, exGaussCDF, logitNormPDF, logPDF, logCDF, logitNormCDF, gammaPDF, gammaCDF, generalNormalCDF, sampleMoments, fitNormal, fitSkewNormal, fitGamma, fitExGauss, fitShiftedLog, fitLogitNormal, fitMetalog, makeMetalogCDF, makeMetalogPDF} from "./probabilities.js"
import {drawTPS} from "./tps.js"
import {drawHist, resetHistZoom, resizeHist, clearHist} from "./histPlot.js"

export {histogramTabStartup}

window.sldWinPlaying = false;
window.creationPlaying = false;
window.distribMode = "pdf"

let stepHist = true
histSelectStep.onclick = () => {if (!stepHist) {stepHist = true;  drawHist({step: stepHist});}}
histSelectLinear.onclick = () => {if (stepHist) {stepHist = false; drawHist({step: stepHist});}}

//sliding window play
sldWinPlay.addEventListener("click", function() {
    if(window.sldWinPlaying) {window.sldWinPlaying = false;} 
    else {window.creationPlaying = false; animateHistRange();} })
//sliding window reset
sldWinReset.addEventListener("click", function() {rangeSelectorApply(); resetHistZoom();})
//sliding window defaults
sldWinDefaults.addEventListener("click", function() {window.userData.genSlidingWindowDefaults(); })
//creation play
creationPlay.addEventListener("click", function() {
    if(window.creationPlaying) {window.creationPlaying = false} 
    else {window.sldWinPlaying = false;animateHistCreate();} })
//creation reset
creationReset.addEventListener("click", function() {rangeSelectorApply(); resetHistZoom(); })
//creation defaults
creationDefaults.addEventListener("click", function() {window.userData.genCreationDefaults(); })

//distribution and average toggle buttons
const toggleGroups = [
    ["distribVisibilities", [showHistNorm, showHistSkew, showHistExGauss, showHistGamma, showHistLogit, showHistLog, showHistMetalog]],
    ["averageVisibilities", [showHistMean, showHistMedian, showHistMode]],
]
for (const [key, buttons] of toggleGroups) {
    buttons.forEach((btn, i) => btn.addEventListener("click", function() {
        const vis = window.userData[key]
        vis[i] = !vis[i]
        btn.classList.toggle("pressed", vis[i])
        updateHist()
    }))
}
//refitting the metalog is cheap, so only it is redone when the number of terms changes
metalogTerms.addEventListener("change", function() {
    if(!window.userData || window.isMoveTimes()) return
    fitMetalogToSelection()
    createDistributionPDFs()
    createDistributionCDFs()
    performGoodnessOfFitTests()
    updateHist()
})

clickProbDistrib.addEventListener("click", function() {
    clickCumDistrib.classList.remove("pressed");
    clickProbDistrib.classList.add("pressed");
    window.distribMode = "pdf"
    updateHist();
})
clickCumDistrib.addEventListener("click", function() {
    clickProbDistrib.classList.remove("pressed");
    clickCumDistrib.classList.add("pressed");
    createCDF();
    window.distribMode = "cdf"
    updateHist();
})

//col width and offset inputs
histBucketInput.addEventListener("change", rangeSelectorApply)
histOffset.addEventListener("change", rangeSelectorApply)
histBucketReset.addEventListener("click", function() {
    histBucketInput.value = 1
    rangeSelectorApply()
})
//the column offset giving the smoothest histogram (least squared second differences of the counts)
histOffsetBest.addEventListener("click", function() {
    const lower = document.getElementById("histRangeLow").value
    const upper = document.getElementById("histRangeHigh").value

    const bucketSize = document.getElementById("histBucketInput").value
    const range = upper - lower + 1
    const offset = window.userData.solves[window.selectedSess].length - upper

    let best = Infinity
    let bestOffset = 0
    const step = 0.001
    const steps = Math.round(bucketSize / step)
    for(let k = 0; k < steps; k++) {
        const bucketOffset = k * step
        const hist = createHistRange(bucketSize, range, offset,bucketOffset)
        let sum = 0
        for(let i = 1; i < hist.length-1; i++) {sum += (hist[i+1][1]-2*hist[i][1]+hist[i-1][1])**2}
        if(sum < best) {
            best = sum
            bestOffset = bucketOffset
        }
    }

    histOffset.value = Number(bestOffset.toFixed(3));
    histOffset.dispatchEvent(new Event("change", { bubbles: true }));
})

//range select all
rangeSelectAll.addEventListener("click", function() {
    window.resetRangeSelector()
    rangeSelectorApply()
})
//range selector timeframes
document.getElementById("histRangeLow").addEventListener(      "change", function() {rangeSelectorApply()})
document.getElementById("histRangeHigh").addEventListener(     "change", function() {rangeSelectorApply()})
document.getElementById("rangeSelect24H").addEventListener(    "click",  function() {rangeSelectorCutoff(86400000)})
document.getElementById("rangeSelectWeek").addEventListener(   "click",  function() {rangeSelectorCutoff(604800000)})
document.getElementById("rangeSelectMonth").addEventListener(  "click",  function() {rangeSelectorCutoff(2626560000)})
document.getElementById("rangeSelect6Months").addEventListener("click",  function() {rangeSelectorCutoff(15779232000)})
document.getElementById("rangeSelectYear").addEventListener(   "click",  function() {rangeSelectorCutoff(31557600000)})

//applies the currently selected range and column input and updates the histogram
function rangeSelectorApply() {
    const lower = Math.max(1, parseInt(histRangeLow.value) || 1);
    histRangeLow.value = lower;
    if (window.isMoveTimes()) return drawTPS()
    const upper = document.getElementById("histRangeHigh").value

    const bucketSize = document.getElementById("histBucketInput").value
    const bucketOffset = histOffset.value
    const range = upper - lower + 1
    const offset = window.userData.solves[window.selectedSess].length - upper

    const hist = createHistRange(bucketSize, range, offset,bucketOffset)
    window.userData.hist[window.selectedSess] = hist
    genSessionDistribData();
    updateHist()
}

//the solves the range selector picks from (for move_times, the solves whose moves are included)
function rangeSolves() {
    return window.userData.solves[window.isMoveTimes() ? 0 : window.selectedSess]
}

//resets the range selector to show the max range
window.resetRangeSelector = function() {
    const numSolves = rangeSolves().length
    document.getElementById("histRangeLow").value = 1
    document.getElementById("histRangeHigh").value = numSolves
    document.getElementById("histRangeHigh").max = numSolves
}

//apply the selection to only solves done within the last cutoff milliseconds
function rangeSelectorCutoff(cutoff) {
    const solves = rangeSolves();
    const cutoffDate = Date.now() - cutoff;
    let lower = -1;
    for (let i = 0; i < solves.length; i++) {
        if (solves[i][0].getTime() > cutoffDate) { lower = i + 1; break; }
    }
    if (lower === -1) return alert("No solves in that timeframe");
    histRangeLow.value = lower;
    histRangeHigh.value = solves.length;
    rangeSelectorApply();
}

histogramButton.addEventListener("click", function () {
    window.showTab("hist", histogramContainer, histogramButton);
    resizeHist();
    window.histShowSession();
})

//the TPS Graph Settings menu replaces the histogram menus when move_times is selected
function setTPSMode() {
    const tps = window.isMoveTimes()
    if (histogramContainer.classList.contains("tpsMode") == tps) return
    histogramContainer.classList.toggle("tpsMode", tps)
    resizeHist()
}

//show the selected session with its full range and default settings
window.histShowSession = function() {
    setTPSMode();
    window.resetRangeSelector();
    if (window.isMoveTimes()) return drawTPS();
    histBucketInput.value = window.userData.histDefaultWidths[window.selectedSess]
    rangeSelectorApply()
    if (window.distribMode == "pdf") resetHistZoom();
    window.userData.genSlidingWindowDefaults(); window.userData.genCreationDefaults();
}

window.genSessionDistribData = function() {
    createCDF()
    calculateDistributionCoeffs();
    createDistributionPDFs();
    createDistributionCDFs();
    performGoodnessOfFitTests();
}

// Update the histogram (with optional overlays): the column counts with the fitted pdfs, or the cumulative distributions
window.updateHist = function () {
    window.selectedSess = document.getElementById("title-dropdown").value;
    if (window.isMoveTimes()) return drawTPS()
    const U = window.userData
    const pdf = window.distribMode == "pdf"
    if(!pdf) createDistributionCDFs()
    const base = pdf ? U.hist[window.selectedSess] : U.cdf
    const curves = pdf ? U.distribData : U.distribCdfData
    const shown = U.distribLabels.map((label, d) => d).filter(d => U.distribVisibilities[d])

    //a pdf is scaled from a density to the expected number of solves in each column
    const numSolves = pdf ? base.reduce((sum, [, count]) => sum + count, 0) : 0
    const bucketWidth = pdf ? base[1][0] - base[0][0] : 0
    const file = base.map(([x, y], i) => [x, y, ...shown.map(d => pdf
        ? curves?.[d]?.[i]?.[1] * bucketWidth * numSolves ?? null
        : curves?.[d]?.[i]?.[1] ?? null)])
    const labels = ["Time(s)", pdf ? "Frequency" : "Probability", ...shown.map(d => U.distribLabels[d])]

    drawHist({ rows: file, labels, colors: shown.map(d => U.distribColors[d]), xlabel: "Time(s)", ylabel: labels[1], step: stepHist, spanGaps: false, yRange: null,
        ...(pdf ? { annotations: getAnnotations(base) } : { annotations: [], xRange: U.cdfRange }) })
};

//markers for the averages of a histogram that are switched on
function getAnnotations(hist) {
    const avgs = hist.averages
    if (!avgs) return []
    return [["Mean", avgs.mean, 33, 5], ["Median", avgs.median, 45, 25], ["Mode", avgs.mode, 45, 45]]
        .filter((a, i) => window.userData.averageVisibilities[i])
        .map(([shortText, x, width, tickHeight]) => ({ x, shortText, width, tickHeight }))
}

function createHistRange(bucketSize, range, offset, bucketOffset = 0) {
    const bucketSize_ = parseFloat(bucketSize);
    const off = (((parseFloat(bucketOffset) || 0) % bucketSize_) + bucketSize_) % bucketSize_;
    const solves = window.userData.solves[window.selectedSess];
    const numSolves = solves.length;

    // figure out the slice [start, end) we’re using
    const end = Math.max(0, numSolves - offset);
    const start = Math.max(0, end - range);
    const n = end - start;

    // empty case
    if (n <= 0) return [];

    // one pass: bucket counts, sum, times[], mode tracking
    const counts = [];                   // sparse array: counts[bucket] = frequency
    const times = new Float64Array(n);   // for exact median via quickselect
    let sum = 0;
    let maxBucket = -1;
    let modeBucket = 0, modeCount = 0;

    let m = 0;
    for (let i = start; i < end; i++) {
        const t = solves[i][1];
        if (t == null) continue;
        times[m++] = t;
        sum += t;

        const bucket = Math.floor((t-off) / bucketSize_) + 1; // fast floor
        const c = (counts[bucket] = (counts[bucket] | 0) + 1);
        if (c > modeCount) { modeCount = c; modeBucket = bucket; }
        if (bucket > maxBucket) maxBucket = bucket;
    }
    if (m === 0) return [];

    // exact median with Quickselect (linear time expected)
    function selectKth(arr, k) {
        let lo = 0, hi = arr.length - 1;
        while (true) {
        const pivot = arr[(lo + hi) >> 1];
        let i = lo, j = hi;
        while (i <= j) {
            while (arr[i] < pivot) i++;
            while (arr[j] > pivot) j--;
            if (i <= j) { const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; i++; j--; }
        }
        if (k <= j) hi = j;
        else if (k >= i) lo = i;
        else return arr[k];
        }
    }

    const valid = times.subarray(0, m);
    let median;
    if (m & 1) median = selectKth(valid, m >> 1);
    else median = (selectKth(valid, (m >> 1) - 1) + selectKth(valid, m >> 1)) * 0.5;
    const mean = sum / m;

    // build hist in the same shape as before: [[bucketStart, count], ...]
    const hist = new Array(maxBucket + 1);
    for (let b = 0; b <= maxBucket; b++) {
        hist[b] = [(b-1) * bucketSize_ + off, counts[b] | 0];
    }

    // the averages drawn with this histogram (the mode at the middle of its column)
    hist.averages = {
        mean,
        median,
        mode: (modeBucket - 0.5) * bucketSize_ + off,
        modeCount
    };

    return hist;
}

//the empirical cdf of the selected solves, one [time, fraction of solves <= time] entry per unique time
window.createCDF = function() {
    const solves = window.userData.solves[window.selectedSess];
    const start = document.getElementById("histRangeLow").value
    const end = document.getElementById("histRangeHigh").value
    const sorted = solves.slice(start-1,end).map(s => s[1]).filter(t => t != null).sort((a, b) => a - b);
    const n = sorted.length;

    const cdf = new Map(); // to deduplicate by keeping latest index
    for (let i = 0; i < n; i++) cdf.set(sorted[i], (i + 1) / n);

    window.userData.cdfRange = [0,sorted[n-1]];
    window.userData.cdfN = n;
    window.userData.cdf = Array.from(cdf.entries());
}

//sliding window animation: a window of solves moving from the first solves to the latest
async function animateHistRange() {
    if (window.isMoveTimes()) return
    //get the parameters from the input elements
    const bucketSize = document.getElementById("sldWinWidth").value
    const range = document.getElementById("sldWinWindow").value
    const step = document.getElementById("sldWinStep").value
    const xmax = document.getElementById("sldWinXmax").value
    const frameTime = document.getElementById("sldWinTime").value
    const numSolves = window.userData.solves[window.selectedSess].length
    const yAxisType = document.getElementById("sldWinYaxis").value

    //if the y-axis is to be static, we need to know how high it should go
    //assuming the user is getting faster with more solves, the most recent solves
    //should have the lowest relative standard deviation and therefore the highest peak
    let yMax = 0;
    if(yAxisType == 'static') {
        const hist = createHistRange(bucketSize,range,0,0)
        for(let i = 0; i < hist.length; i++) {if(hist[i][1] > yMax) yMax = hist[i][1]}
        yMax *= 1.4 //to be safe
        drawHist({yRange: [0,yMax]})
    } else {
        drawHist({yRange: null})
    }

    const frames = []
    for(let i = numSolves-range; i > 0; i-=step) frames.push([range, i])
    await playHistFrames("sldWinPlaying", "sldWin", frames, bucketSize, xmax, frameTime)
}

//creation animation: the histogram growing as solves are added
async function animateHistCreate() {
    if (window.isMoveTimes()) return
    //get the parameters from the input elements
    const step = parseFloat(document.getElementById("creationStep").value)
    const Xmax = parseFloat(document.getElementById("creationXmax").value)
    const bucketSize = parseFloat(document.getElementById("creationWidth").value)
    const yAxisType = document.getElementById("creationYaxis").value
    const j = window.selectedSess
    const numSolves = window.userData.solves[j].length

    //if the y-axis is to be static, we need to know the height of the final graph
    let yMax = 0;
    if(yAxisType == 'static') {
        const hist = createHistRange(bucketSize, numSolves, 0, 0)
        for(let i = 0; i < hist.length; i++) {if(hist[i][1] > yMax) yMax = hist[i][1]}
        drawHist({yRange: [0,yMax]})
    } else {
        drawHist({yRange: null})
    }

    const frames = []
    for(let range = 0; range < numSolves-step; range+=step) frames.push([range, numSolves-range])
    await playHistFrames("creationPlaying", "creation", frames, bucketSize, Xmax, 1)
}

//draw the histogram of each frame's [range, offset] of solves in turn, until done or the stop button clears window[flag]
//prefix picks the animation's play button and progress bar
async function playHistFrames(flag, prefix, frames, bucketSize, xMax, frameTime) {
    const playBtn = document.getElementById(prefix + "Play")
    const progressBar = document.querySelector(`#${prefix}ProgressBar div`)
    window[flag] = true
    playBtn.textContent = "Stop"
    for(let i = 0; i < frames.length && window[flag]; i++) {
        const hist = createHistRange(bucketSize, ...frames[i], 0)
        drawHist({ rows: hist, labels: ["Time(s)", "Frequency"], ylabel: "Frequency", xRange: [0, xMax], annotations: getAnnotations(hist) })
        progressBar.style.width = `${(i + 1) / frames.length * 100}%`
        await sleep(frameTime)
    }

    //reset the button
    playBtn.textContent = "Play";
    window[flag] = false;
    progressBar.style.width = "0%"
}

function histogramTabStartup() {
    //Make sure its empty
    clearHist();

    setTPSMode();
    window.resetRangeSelector();
    genDefaultColumnWidths();
    histBucketInput.value = window.userData.histDefaultWidths[window.selectedSess]
    rangeSelectorApply()
    window.updateHist();

}

//a column width for each session, about 1/6 of its standard deviation
function genDefaultColumnWidths() {
    window.userData.histDefaultWidths = window.userData.solves.map(session =>
        defaultColumnWidth(sampleMoments(session.map(s => s[1]).filter(t => t != null)).sd))
}

//the positive solve times in the selected range, which every distribution is fit to
function selectedSolveTimes() {
    const start = document.getElementById("histRangeLow").value
    const end = document.getElementById("histRangeHigh").value
    return window.userData.solves[window.selectedSess].map(s => s[1]).slice(start-1,end)
        .filter(t => t != null && t > 0 && Number.isFinite(t));
}

//fit the metalog with the number of terms from its input box
function fitMetalogToSelection() {
    const input = document.getElementById("metalogTerms")
    const terms = Math.max(2, Math.min(16, Math.round(Number(input.value)) || 9))
    input.value = terms
    const fit = fitMetalog(selectedSolveTimes(), terms)
    window.userData.metalogCoeffs = fit
    document.getElementById("metalogNote").innerText = fit.feasible ? "" : `Not a valid distribution with ${terms} terms`
}

//calculate the coefficients (parameters) for each of the types of distribution
function calculateDistributionCoeffs() {
    const start = document.getElementById("histRangeLow").value
    const end = document.getElementById("histRangeHigh").value
    if(end - start < 5) return alert("Distributions not calculated (<5 solves selected)");

    const clean = selectedSolveTimes();
    if(clean.length < 5) return alert("Distributions not calculated (<5 positive solve times selected)");
    const U = window.userData
    U.normCoeffs = fitNormal(clean)
    U.skewCoeffs = fitSkewNormal(clean)
    U.exGaussCoeffs = fitExGauss(clean)
    U.gammaCoeffs = fitGamma(clean)
    U.logitCoeffs = fitLogitNormal(clean)
    U.logCoeffs = fitShiftedLog(clean)
    fitMetalogToSelection()
}

//[pdf, cdf] of each fitted distribution, in the order of window.userData.distribLabels
//an invalid metalog has neither, so it is not drawn or tested
function distributionFunctions() {
    const { normCoeffs: n, skewCoeffs: s, exGaussCoeffs: e, gammaCoeffs: g, logitCoeffs: l, logCoeffs: sl, metalogCoeffs: m } = window.userData
    return [
        [x => normalPDF(x, n.mu, n.sigma), x => generalNormalCDF(x, n.mu, n.sigma)],
        [x => skewNormalPDF(x, s.xi, s.omega, s.alpha), x => skewNormalCDF(x, s.xi, s.omega, s.alpha)],
        [x => exGaussPDF(x, e.mu, e.sigma, e.tau), x => exGaussCDF(x, e.mu, e.sigma, e.tau)],
        [x => gammaPDF(x, g.alpha, g.theta), x => gammaCDF(x, g.alpha, g.theta)],
        //the logit-normal lives on [0, max]
        [x => x < l.max ? logitNormPDF(x / l.max, l.mu, l.sigma) / l.max : 0, x => x < l.max ? logitNormCDF(x / l.max, l.mu, l.sigma) : 1],
        [x => logPDF(x - sl.gamma, sl.mu, sl.sigma), x => logCDF(x - sl.gamma, sl.mu, sl.sigma)],
        m.feasible ? [makeMetalogPDF(m.a), makeMetalogCDF(m.a)] : null,
    ]
}

//each distribution's pdf at the histogram columns
function createDistributionPDFs() {
    const bins = window.userData.hist[window.selectedSess];
    window.userData.distribData = distributionFunctions().map(fns => fns ? bins.map(([x]) => [x, fns[0](x)]) : [])
}

//each distribution's cdf at the times in the empirical cdf
function createDistributionCDFs() {
    const cdf = window.userData.cdf;
    window.userData.distribCdfData = distributionFunctions().map(fns => fns ? cdf.map(([x]) => [x, fns[1](x)]) : [])
}

//goodness of fit of every distribution to the selected solves: Anderson-Darling A^2 and Kolmogorov-Smirnov D
function performGoodnessOfFitTests() {
    const U = window.userData
    //window.userData.cdf has one entry per unique time, [x, i/n] where i is the index of the last solve equal to x
    //so each entry stands for the solves with (sorted, 1-based) indices a+1..b, where a and b are the previous and current i
    const cdf = U.cdf
    const n = U.cdfN
    const EPS = 1e-12 //clamp F so a distribution giving 0 or 1 at a data point is heavily penalized instead of skipped
    const ad = [], ks = []

    for(const curve of U.distribCdfData) {
        if(curve.length === 0) { ad.push(NaN); ks.push(NaN); continue }
        //A^2 = -n - (1/n) * sum_i [(2i-1) ln F(x_i) + (2n+1-2i) ln(1 - F(x_i))]
        let sum = 0, a = 0, max = 0
        for (let k = 0; k < cdf.length; k++) {
            const b = Math.round(cdf[k][1] * n)
            const F = Math.min(Math.max(curve[k][1], EPS), 1 - EPS)
            const sqDiff = b * b - a * a //sum of (2i-1) for i = a+1..b
            sum += sqDiff * Math.log(F) + (2 * n * (b - a) - sqDiff) * Math.log(1 - F)
            a = b
            //the empirical cdf is a step function, so compare against both sides of each step
            const below = k === 0 ? 0 : cdf[k - 1][1]
            max = Math.max(max, Math.abs(cdf[k][1] - curve[k][1]), Math.abs(curve[k][1] - below))
        }
        ad.push(-n - sum / n)
        ks.push(max)
    }

    showTestResults(U.distribADids, ad, 2)
    showTestResults(U.distribKSids, ks, 3)
}

//show a test statistic for each distribution ("-" if it could not be fit), highlighting the lowest
function showTestResults(ids, values, digits) {
    let best = -1
    values.forEach((v, d) => {
        const el = document.getElementById(ids[d])
        el.innerText = Number.isFinite(v) ? v.toFixed(digits) : "-"
        el.style.backgroundColor = el.style.color = ""
        if(Number.isFinite(v) && (best === -1 || v < values[best])) best = d
    })
    if(best !== -1) Object.assign(document.getElementById(ids[best]).style, {backgroundColor: "#FFFF00", color: "#000000"})
}
