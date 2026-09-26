import {sleep} from "./utils.js"
import {digamma, trigamma, normalPDF, skewNormalPDF, betaPDF, logit, logitNormPDF, logPDF, logCDF, logitNormCDF, gammaPDF, generalNormalCDF, betaCDF} from "./probabilities.js"
import {themes} from "./themes.js"

export {histogramTabStartup, rangeSelectorApply}


window.sldWinPlaying = false;
window.creationPlaying = false;
window.distribMode = "pdf"

let stepHist = true
histSelectStep.onclick = () => {if (!stepHist) {stepHist = true;  window.h.updateOptions({stepPlot: stepHist});}}
histSelectLinear.onclick = () => {if (stepHist) {stepHist = false; window.h.updateOptions({stepPlot: stepHist});}}

//sliding window play
sldWinPlay.addEventListener("click", function() {
    if(window.sldWinPlaying) {window.sldWinPlaying = false;} 
    else {window.creationPlaying = false; animateHistRange();} })
//sliding window reset
sldWinReset.addEventListener("click", function() {rangeSelectorApply(); window.h.resetZoom();})
//sliding window defaults
sldWinDefaults.addEventListener("click", function() {window.userData.genSlidingWindowDefaults(); })
//creation play
creationPlay.addEventListener("click", function() {
    if(window.creationPlaying) {window.creationPlaying = false} 
    else {window.sldWinPlaying = false;animateHistCreate();} })
//creation reset
creationReset.addEventListener("click", function() {rangeSelectorApply(); window.h.resetZoom(); })
//creation defaults
creationDefaults.addEventListener("click", function() {window.userData.genCreationDefaults(); })


//distribution buttons
showHistNorm.addEventListener("click", function() {
    window.userData.distribVisibilities[0] = !window.userData.distribVisibilities[0];
    window.userData.distribVisibilities[0]
        ? showHistNorm.classList.add("pressed")
        : showHistNorm.classList.remove("pressed")
    updateHist(); })
showHistSkew.addEventListener("click", function() {
    window.userData.distribVisibilities[1] = !window.userData.distribVisibilities[1];
    window.userData.distribVisibilities[1]
        ? showHistSkew.classList.add("pressed")
        : showHistSkew.classList.remove("pressed")
    updateHist(); })
showHistBeta.addEventListener("click", function() {
    window.userData.distribVisibilities[2] = !window.userData.distribVisibilities[2];
    window.userData.distribVisibilities[2]
        ? showHistBeta.classList.add("pressed")
        : showHistBeta.classList.remove("pressed")
    updateHist(); })
showHistGamma.addEventListener("click", function() {
    window.userData.distribVisibilities[3] = !window.userData.distribVisibilities[3];
    window.userData.distribVisibilities[3]
        ? showHistGamma.classList.add("pressed")
        : showHistGamma.classList.remove("pressed")
    updateHist(); })
showHistLogit.addEventListener("click", function() {
    window.userData.distribVisibilities[4] = !window.userData.distribVisibilities[4];
    window.userData.distribVisibilities[4]
        ? showHistLogit.classList.add("pressed")
        : showHistLogit.classList.remove("pressed")
    updateHist(); })
showHistLog.addEventListener("click", function() {
    window.userData.distribVisibilities[5] = !window.userData.distribVisibilities[5];
    window.userData.distribVisibilities[5]
        ? showHistLog.classList.add("pressed")
        : showHistLog.classList.remove("pressed")
    updateHist(); })

//average buttons
showHistMean.addEventListener("click", function() {
    window.userData.averageVisibilities[0] = !window.userData.averageVisibilities[0];
    window.userData.averageVisibilities[0]
        ? showHistMean.classList.add("pressed")
        : showHistMean.classList.remove("pressed")
    updateHist(); })
showHistMedian.addEventListener("click", function() {
    window.userData.averageVisibilities[1] = !window.userData.averageVisibilities[1];
    window.userData.averageVisibilities[1]
        ? showHistMedian.classList.add("pressed")
        : showHistMedian.classList.remove("pressed")
    updateHist(); })
showHistMode.addEventListener("click", function() {
    window.userData.averageVisibilities[2] = !window.userData.averageVisibilities[2];
    window.userData.averageVisibilities[2]
        ? showHistMode.classList.add("pressed")
        : showHistMode.classList.remove("pressed")
    updateHist(); })



clickProbDistrib.addEventListener("click", function() {
    clickCumDistrib.classList.remove("pressed");
    clickProbDistrib.classList.add("pressed");
    window.distribMode = "pdf"
    updateHist();
})
clickCumDistrib.addEventListener("click", function() {
    clickProbDistrib.classList.remove("pressed");
    clickCumDistrib.classList.add("pressed");
    window.userData.cdf = createCDF();
    window.distribMode = "cdf"
    updateHist();
})


//col width input
histBucketInput.addEventListener("change", function() {
    rangeSelectorApply()
    createDistributionPDFs();
    updateHist(); })
//reset
histBucketReset.addEventListener("click", function() {
    histBucketInput.value = 1
    rangeSelectorApply()
    createDistributionPDFs();
    updateHist();
})
histOffset.addEventListener("change", function() {
    rangeSelectorApply();
    createDistributionPDFs();
    updateHist();
})
histOffsetBest.addEventListener("click", function() {
    const lower = document.getElementById("histRangeLow").value
    const upper = document.getElementById("histRangeHigh").value

    const bucketSize = document.getElementById("histBucketInput").value
    const range = upper - lower + 1
    const offset = window.userData.solves[window.selectedSess].length - upper

    let best3 = Infinity
    let bestIdx3 = 0
    let worst3 = -Infinity
    let worstIdx3 = 0

    const step = 0.001
    const steps = Math.round(bucketSize / step)

    for(let k = 0; k < steps; k++) {

        const bucketOffset = k * step
        const hist = createHistRange(bucketSize, range, offset,bucketOffset)

        let sum3 = 0
        for(let i = 1; i < hist.length-2; i++) {sum3 += (hist[i+1][1]-2*hist[i][1]+hist[i-1][1])**2}
        
        if(sum3 < best3) {
            best3 = sum3
            bestIdx3 = bucketOffset
        }
        if(sum3 > worst3) {
            worst3 = sum3
            worstIdx3 = bucketOffset
        }
        
    }

    console.log(`Best3: ${bestIdx3}: ${best3}`)
    console.log(`Worst3: ${worstIdx3}: ${worst3}`)

    histOffset.value = Number(bestIdx3.toFixed(3));
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

//resets the range selector to show the max range
window.resetRangeSelector = function() {
    const numSolves = window.userData.solves[window.selectedSess].length
    document.getElementById("histRangeLow").value = 1
    document.getElementById("histRangeHigh").value = numSolves
    document.getElementById("histRangeHigh").max = numSolves
}

//apply the selection to only solves done within the last cutoff milliseconds
function rangeSelectorCutoff(cutoff) {
    const solves = window.userData.solves[window.selectedSess];
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
    window.currentTab = "hist";
    window.resetContainers();
    histogramContainer.style.display = "flex";
    histogramButton.classList.add("pressed");
    window.h.resize();

    histBucketInput.value = window.userData.histDefaultWidths[window.selectedSess]
    window.resetRangeSelector();
    rangeSelectorApply()
    if (window.distribMode == "pdf") window.h.resetZoom();
    window.userData.genSlidingWindowDefaults(); window.userData.genCreationDefaults();
})



window.genSessionDistribData = function() {
    createCDF()
    calculateDistributionCoeffs();
    createDistributionPDFs();

    createDistributionCDFs();
    performAndersonDarlingTest();
    performKSTest();
}

// Update the histogram (with optional overlays)
window.updateHist = function () {
    console.log("updateHist called")
    window.selectedSess = document.getElementById("title-dropdown").value;

    if(window.distribMode == "pdf") {
        
        const hist = window.userData.hist[window.selectedSess];
        const distrib = window.userData.distribData;
        const dLabels = window.userData.distribLabels;
        const numDistribs = distrib.length;
        
        //const numSolves = end - start + 1;
        let numSolves_ = 0
        for(let i = 0; i < hist.length; i++) {
            numSolves_ += hist[i][1]
        }
        const numSolves = numSolves_;
        const bucketWidth = hist[1][0] - hist[0][0];
        
        // Start building combined data
        const combined = hist.map(([x, y], i) => {
            const row = [x, y];

            for(let d = 0; d < numDistribs; d++) {
                if(window.userData.distribVisibilities[d]) {
                    row.push(distrib?.[d]?.[i]?.[1] * bucketWidth * numSolves?? null);
                }
            }

            return row;
        });

        // Build labels array
        const labels = ["Time(s)", "Frequency"];
        for(let d = 0; d < numDistribs; d++) {
            if(window.userData.distribVisibilities[d]) {
                labels.push(dLabels[d])
            }
        }

        // Update Dygraph
        window.h.updateOptions({
            file: combined,
            labels: labels,
            valueRange: null,
        });
        window.h.ready(function () {
            window.h.setAnnotations(getAnnotations())
        })
    }

    else if(window.distribMode == "cdf") {
        createDistributionCDFs() 
        const cdf = window.userData.cdf
        const distribCdf = window.userData.distribCdfData
        const dLabels = window.userData.distribLabels;
        const numDistribs = distribCdf.length

        // Start building combined data
        const combined = cdf.map(([x, y], i) => {
            const row = [x, y];

            for(let d = 0; d < numDistribs; d++) {
                if(window.userData.distribVisibilities[d]) {
                    row.push(distribCdf?.[d]?.[i]?.[1] ?? null);
                }
            }

            return row;
        });

        // Build labels array
        const labels = ["Time(s)", "Probability"];
        for(let d = 0; d < numDistribs; d++) {
            if(window.userData.distribVisibilities[d]) {
                labels.push(dLabels[d])
            }
        }

        window.h.updateOptions({
            file: combined,
            labels: labels,
            xlabel: "Time(s)",
            ylabel: 'Probability',
            dateWindow: window.userData.cdfRange
        })
    }
    
};



function getAnnotations() {
    const vis = window.userData.averageVisibilities
    const avgs = window.histAverages
    const annotations = []
    if(vis[0]) {
        annotations.push({
            series: "Frequency",
            x: avgs.mean,
            shortText: "Mean",
            width: 33,
            attachAtBottom: true,
            tickHeight: 5
        })
    }
    if(vis[1]) {
        annotations.push({
            series: "Frequency",
            x: avgs.median,
            shortText: "Median",
            width: 45,
            attachAtBottom: true,
            tickHeight: 25
        })
    }
    if(vis[2]) {
        annotations.push({
            series: "Frequency",
            x: avgs.modeBucket,
            shortText: "Mode",
            width: 45,
            attachAtBottom: true,
            tickHeight: 45
        })
    }
    return annotations;
}


function createHistRangeOld(bucketSize, range, offset) {
    const bucketSize_ = parseFloat(bucketSize)
    const hist = []
    const solves = window.userData.solves[window.selectedSess]
    const numSolves = solves.length
    let max = 0;
    //find the max time
    for(let i = numSolves-range-offset; i < numSolves-offset; i++) {
        const time = solves[i][1]
        if(time > max) max = time;
    }
    //create the buckets
    for(let b = 0; b <= max+1; b+= bucketSize_) {
        hist.push([b,0]);
    }
    //add the solves to buckets
    for(let i = numSolves-range-offset; i < numSolves-offset; i++) {
        const time = solves[i][1];
        const bucket = Math.floor(time/bucketSize_);
        hist[bucket][1] += 1;
    }
    return hist;
}
function createHistRange(bucketSize, range, offset) {
    const bucketSize_ = parseFloat(bucketSize);
    const solves = window.userData.solves[window.selectedSess];
    const numSolves = solves.length;

    // figure out the slice [start, end) we’re using
    const end = Math.max(0, numSolves - offset);
    const start = Math.max(0, end - range);
    const n = end - start;

    // empty case
    if (n <= 0) {
        window.histAverages = { mean: NaN, median: NaN, modeBucket: NaN, modeCount: 0 };
        return [];
    }

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

        const bucket = (t / bucketSize_) | 0; // fast floor
        const c = (counts[bucket] = (counts[bucket] | 0) + 1);
        if (c > modeCount) { modeCount = c; modeBucket = bucket; }
        if (bucket > maxBucket) maxBucket = bucket;
    }
    if (m === 0) { window.histAverages = { mean: NaN, median: NaN, modeBucket: NaN, modeCount: 0 }; return []; }

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
        hist[b] = [b * bucketSize_, counts[b] | 0];
    }

    // expose summary
    window.histAverages = {
        mean: Math.floor(mean/bucketSize_)*bucketSize_,
        median: Math.floor(median/bucketSize_)*bucketSize_,
        // mode is the bucket with the most solves (not the raw mode)
        modeBucket: modeBucket * bucketSize_,
        modeCount
    };

    return hist;
}


window.doTPSgraph = function(bucketSize,j,t,step,height){
    let data = window.userData.solves[7]
    window.userData.createHist(bucketSize)
    let newHist = window.userData.hist[window.selectedSess]

    let numSolves = window.userData.solves[0].length
    //let factor = 0.01*bucketSize*window.userData.meanTime*numSolves
    let factor = bucketSize*numSolves
    for(let i = 0; i < newHist.length; i++) {
        newHist[i][1] /= factor
    }
    if(j && t) newHist = smoothEMA(newHist, j, t);
    window.h.updateOptions({
            file: newHist,
            labels: ["1", "2"],
            xlabel: "% Done",
            ylabel: 'TPS',
            stepPlot: false,
        })

        window.h.ready(function() {
            window.h.setAnnotations([
        {
            series: "2",
            x: bucketSize*Math.floor(window.userData.meanCross*100/window.userData.meanTime/bucketSize),
            shortText: "F2L",
            width: 50,
            attachAtBottom: true,
            tickHeight: height
        },
        {
            series: "2",
            x: bucketSize*Math.floor((window.userData.meanCross+window.userData.meanF2l)*100/window.userData.meanTime/bucketSize),
            shortText: "LL",
            width: 33,
            attachAtBottom: true,
            tickHeight: height
        },{
            series: "22",
            x: bucketSize*Math.floor((window.userData.meanTime-window.userData.meanPll)*100/window.userData.meanTime/bucketSize),
            shortText: "PLL",
            width: 33,
            attachAtBottom: true,
            tickHeight: height
        }
    ])
        })
    
}
window.compareTPS = function(newHist, name1, name2) {
        //do the same doTPSgraph in other tab, copy window.h.file_ object as newHist    


        let hist = window.h.file_

        const combined = hist.map(([x, y], i) => {
            const row = [x, y];
            row.push(newHist[i]?.[1] ?? 0);
            return row;
        });

        // Build labels array
        const labels = ["% Done", name1, name2];

        // Update Dygraph
        window.h.updateOptions({
            file: combined,
            labels: labels,
            valueRange: null,
        });

        window.h.ready(function() {
            window.h.updateOptions({ 
            series: { [name1]: { 
                fillGraph: false, 
                stepPlot: false, 
                color: "#FF0000", 
                strokeWidth: 5 
            } } })
        window.h.updateOptions({ 
            series: { [name2]: { 
                fillGraph: false, 
                stepPlot: false, 
                color: "#0000FF", 
                strokeWidth: 5 
            } } })
        })  
}
window.compareTPS2 = function(newHist1, newHist2, name1, name2, name3) {
        //do the same doTPSgraph in other tab, copy window.h.file_ object as newHist    


        let hist = window.h.file_

        const combined = hist.map(([x, y], i) => {
            const row = [x, y];
            row.push(newHist1[i]?.[1] ?? 0)
            row.push(newHist2[i]?.[1] ?? 0)
            return row;
        });

        // Build labels array
        const labels = ["% Done", name1, name2,name3];

        // Update Dygraph
        window.h.updateOptions({
            file: combined,
            labels: labels,
            valueRange: null,
        });

        window.h.ready(function() {
            window.h.updateOptions({ 
            series: { [name1]: { 
                fillGraph: false, 
                stepPlot: false, 
                color: "#FF0000", 
                strokeWidth: 5 
                } } })
            window.h.updateOptions({ 
                series: { [name2]: { 
                    fillGraph: false, 
                    stepPlot: false, 
                    color: "#0000FF", 
                    strokeWidth: 5 
                } } })
            window.h.updateOptions({ 
                series: { [name3]: { 
                    fillGraph: false, 
                    stepPlot: false, 
                    color: "#00FF00", 
                    strokeWidth: 5 
                } } })
        })  
}

function smoothEMA(newHist, radius = 10, tau = 4) {
  const n = newHist.length;
  const out = new Array(n);

  for (let i = 0; i < n; i++) {
    let num = 0;
    let den = 0;

    const lo = Math.max(0, i - radius);
    const hi = Math.min(n - 1, i + radius);

    for (let j = lo; j <= hi; j++) {
      const d = Math.abs(j - i);
      const w = Math.exp(-d / tau);
      num += w * newHist[j][1];
      den += w;
    }

    out[i] = [newHist[i][0], num / den];
  }

  return out;
}


window.createCDF = function() {
    console.log("createCDF called")

    const solves = window.userData.solves[window.selectedSess];
    const start = document.getElementById("histRangeLow").value
    const end = document.getElementById("histRangeHigh").value
    const times = solves.slice(start-1,end).map(s => s[1]).filter(t => t != null);

    // Sort ascending
    const sorted = [...times].sort((a, b) => a - b);
    const n = sorted.length;
    const max = sorted[n-1]
    const min = sorted[0]

    const cdf = new Map(); // to deduplicate by keeping latest index

    for (let i = 0; i < n; i++) {
        const x = sorted[i];
        const y = (i + 1) / n;
        cdf.set(x, y); 
    }

    window.userData.cdfRange = [0,max];
    window.userData.cdf = Array.from(cdf.entries());
    return Array.from(cdf.entries());
    
}

//sliding window animation
async function animateHistRange() {
    const playBtn = document.getElementById("sldWinPlay")
    const progressBar = document.querySelector("#sldWinProgressBar div")
    //Flip button state and reset progress
    window.sldWinPlaying = true;
    playBtn.textContent = "Stop"
    progressBar.style.width = "0%"

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
        window.h.updateOptions({valueRange: [0,yMax]})
    } else {
        window.h.updateOptions({valueRange: null})
    }

    //just for the progress bar
    const totalFrames = Math.floor((numSolves - range) / step)
    let frame = 0;

    for(let i = numSolves-range; i > 0; i-=step) {
        if(!window.sldWinPlaying) break; //animation can be cancelled with stop button

        const hist = createHistRange(bucketSize,range,i,0)
        window.h.updateOptions({
            file: hist,
            dateWindow: [0,xmax],
            labels: ["Time(s)", "Frequency"],
        });
        window.h.setAnnotations(getAnnotations())

        await sleep(frameTime)

        //update progress bar
        frame++
        progressBar.style.width = `${(frame/totalFrames)*100}%`        
    }

    //reset the button
    playBtn.textContent = "Play";
    window.sldWinPlaying = false;
    progressBar.style.width = "0%"
}


//creation animation
async function animateHistCreate() {
    const playBtn = document.getElementById("creationPlay")
    const progressBar = document.querySelector("#creationProgressBar div")

    //Flip button state and reset progress
    window.creationPlaying = true;
    playBtn.textContent = "Stop"
    progressBar.style.width = "0%"

    //get the parameters from the input elements
    const step = parseFloat(document.getElementById("creationStep").value)
    const Xmax = parseFloat(document.getElementById("creationXmax").value)
    const bucketSize = parseFloat(document.getElementById("creationWidth").value)
    const yAxisType = document.getElementById("creationYaxis").value

    //get the solves
    let j = window.selectedSess
    const solves = window.userData.solves[j]
    const numSolves = solves.length

    //if the y-axis is to be static, we need to know the height of the final graph
    let yMax = 0;
    if(yAxisType == 'static') {
        window.userData.createHist(bucketSize)
        const hist = window.userData.hist[j]
        for(let i = 0; i < hist.length; i++) {if(hist[i][1] > yMax) yMax = hist[i][1]}
        window.h.updateOptions({valueRange: [0,yMax]})
    } else {
        window.h.updateOptions({valueRange: null})
    }
    

    //for the progress bar
    const totalFrames = Math.floor(numSolves/step)
    let frame = 0;

    const hist = []
    
    let max = 0;
    //find the max time
    for(let i = 0; i < numSolves; i++) {const time = solves[i][1];if(time > max) max = time;}
    //create the buckets
    for(let b = 0; b <= max+1; b+= bucketSize) {hist.push([b,0]);}

   //animate
    for(let range = 0; range < numSolves-step; range+=step) {
        if(!window.creationPlaying) break; //animation can be cancelled with stop button

        
        const hist = createHistRange(bucketSize,range,numSolves-range,0)

        //only draw every STEP frames, so animation isnt too slow
        
        window.h.updateOptions({
            file: hist,
            dateWindow: [0,Xmax],
            labels: ["Time(s)", "Frequency"],
        });
        window.h.setAnnotations(getAnnotations())
        
        //update progress bar
        frame++
        progressBar.style.width = `${(frame/totalFrames)*100}%`

        await sleep(1)
         
    }

    //reset the button
    playBtn.textContent = "Play";
    window.creationPlaying = false;
    progressBar.style.width = "0%"

}


function histogramTabStartup() {
    //Make sure its empty
    document.getElementById("histogramDiv").replaceChildren();

    //create dygraphs
    Dygraph.onDOMready(function onDOMready() {
        //Create the histogram
        window.h = new Dygraph(
            document.getElementById("histogramDiv"), //containing div
            window.userData.hist[window.selectedSess], //Data
            //Options
            {
                xlabel: "Time(s)",
                ylabel: "Frequency",
                stepPlot: stepHist,
                fillGraph: true,
                color: themes[window.currentTheme]['--color-primary'],
                legend: "follow",
                fillAlpha: 0.5,
                //labelsSeparateLines: false,
            }
        );
    });


    //styling for the distributions
    const dNames = window.userData.distribLabels
    const dColors = window.userData.distribColors
    for (let i = 0; i < dNames.length; i++) {
        window.h.updateOptions({ 
            series: { [dNames[i]]: { 
                fillGraph: false, 
                stepPlot: false, 
                color: [dColors[i]], 
                strokeWidth: 2 
            } } })
    }

    window.resetRangeSelector();
    genDefaultColumnWidths();
    histBucketInput.value = window.userData.histDefaultWidths[window.selectedSess]
    rangeSelectorApply()
    window.updateHist();

}

function genDefaultColumnWidths() {
    const solves = window.userData.solves
    const colWidths = []
    for (let j = 0; j < window.userData.numSessions; j++) {
        const times = [];

        //extract solves
        for (let i = 0; i < solves[j].length; i++) {
            if(solves[j][i][1] != null) times.push(solves[j][i][1]);
        }

        const mean = times.reduce((a, b) => a + b, 0) / times.length;
        const std = Math.sqrt(times.reduce((sum, t) => sum + (t - mean) ** 2, 0) / times.length);
        const rawWidth = std / 6;

        //  Snap to closest power of two fraction (0.25, 0.5, 1, 2, ...
        const log2 = Math.round(Math.log2(rawWidth));
        const colWidth = Math.pow(2, log2);

        colWidths.push(colWidth)

    }
    window.userData.histDefaultWidths = colWidths;
    
}


//calculate the coefficients (parameters) for each of the types of distribution
function calculateDistributionCoeffs() {
    console.log("calculateDistributionCoeffs called")
    const start = document.getElementById("histRangeLow").value
    const end = document.getElementById("histRangeHigh").value
    if(end - start < 5) return alert("Distributions not calculated (<5 solves selected)");
    const solveTimes = window.userData.solves[window.selectedSess].map(s => s[1]).slice(start-1,end).filter(t => t != null);;

    const clean = solveTimes.filter(t => t > 0 && Number.isFinite(t));
    const sorted = [...clean].sort((a,b) => a - b)
    const trim = 0.01, q = 0.999, pad = 0.05;
    const lower = Math.floor(trim*sorted.length);
    const upper = Math.ceil(sorted.length*(1-trim));  
    const trimmed = sorted.slice(lower, upper);
    
    const eps = 1e-12;
    const maxIter = 5000, tol = 1e-12;
    const n = solveTimes.length;

    //robust scale parameter M (high quantile * (1 + pad) )
    const idx = (trimmed.length - 1) * q;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    const quant = hi === lo 
        ? trimmed[lo]
        : trimmed[lo] + (idx - lo) * (trimmed[hi] - trimmed[lo]);
    const M = quant * (1 + pad);
    //debugger;
    const scaled = trimmed.map(t => Math.min(Math.max(t / M, eps), 1 - eps))
    
    const mean = solveTimes.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(solveTimes.reduce((sum, t) => sum + (t - mean) ** 2, 0) / n);
    let max = 0;
    for(let i = 0; i < n; i++) {if(solveTimes[i] > max) max = solveTimes[i]}


    //--------------------NORMAL DISTRIBUTION--------------------    
    window.userData.normCoeffs = {mu: mean, sigma: std} //store the calculated coefficients


    //--------------------SKEW DISTRIBUTION--------------------
    //skew mean, var, and skew
    const skewN = trimmed.length;
    const skewMean = trimmed.reduce((s, v) => s + v, 0) / skewN;
    const m2 = trimmed.reduce((s, v) => s + (v - skewMean) ** 2, 0);
    const m3 = trimmed.reduce((s, v) => s + (v - skewMean) ** 3, 0);

    const s2 = m2 / (skewN - 1);
    const ss = Math.sqrt(s2);

    //unbiased fisher-pearson skewness g1
    const g1 = (skewN * m3) / ((skewN - 1) * (skewN - 2) * ss ** 3);

    if(Math.abs(g1) < 1e-12) {
        //if skewness is too small, use normal distribution
        window.userData.skewCoeffs = {xi: skewMean, omega: ss, alpha: 0};
    } else {
        const twoOverPi = 2 / Math.PI;
        const gamma1FromDelta = delta => {
            const delta0 = delta * Math.sqrt(twoOverPi);
            const num = (4 - Math.PI) / 2 * delta0 ** 3;
            const den = Math.pow(1 - delta0 ** 2, 1.5);
            return num / den;
        }

        const f = delta => gamma1FromDelta(delta) - g1;

        const delta_max = 0.995
        let a = g1 < 0 ? -delta_max : 0;
        let b = g1 < 0 ? 0 : delta_max;

        let fa = f(a), fb = f(b);
        //if(fa * fb > 0) throw new Error("Invalid skewness: " + g1);

        let delta
        for(let i = 0; i < maxIter; i++) {
            delta = (a + b) / 2;
            const fd = f(delta);
            if(Math.abs(fd) < tol || (b - a) / 2 < tol) break; //convergence check

            if(fa * fd < 0) {
                b = delta;
                fb = fd;
            } else {
                a = delta;
                fa = fd;
            }
        }

        const alpha_skew = delta / Math.sqrt(1 - delta * delta)
        const omega_skew = ss / Math.sqrt(1 - twoOverPi * delta * delta);
        const xi_skew = skewMean - omega_skew * delta * Math.sqrt(twoOverPi);

        window.userData.skewCoeffs = {xi: xi_skew, omega: omega_skew, alpha: alpha_skew}
    }


    //--------------------BETA DISTRIBUTION--------------------
    const m = mean/max
    const v = (std ** 2) / (max ** 2);
    const alpha_beta = m * (m * (1-m) / v - 1);
    const beta_beta = (1-m) * (m * (1-m) / v - 1)
    
    window.userData.betaCoeffs = {alpha: alpha_beta, beta: beta_beta, max: max} //store coeffs


    //--------------------GAMMA DISTRIBUTION--------------------
    const meanLog = clean.reduce((sum, t) => sum + Math.log(t), 0) / n;
    const s = Math.log(mean) - meanLog
    //Intitial guess for alpha (approx by Minkas method)
    let alpha_gamma = (3 - s + Math.sqrt((s - 3) ** 2 + 24 * s)) / (12 * s);

    //Newton-Raphson refinement
    for(let i = 0; i < maxIter; i++) {
        const psiAlpha = digamma(alpha_gamma);
        const psiPrimeAlpha = trigamma(alpha_gamma);
        const step = (Math.log(alpha_gamma) - psiAlpha - s) / (1 / alpha_gamma - psiPrimeAlpha);
        alpha_gamma -= step;
        if(Math.abs(step) < tol) break; //convergence check
        if(alpha_gamma <= 0) alpha_gamma = 1e-3;
    }

    const theta_gamma = mean / alpha_gamma;

    window.userData.gammaCoeffs = {alpha: alpha_gamma, theta: theta_gamma} //store coeffs


    //--------------------LOGIT DISTRIBUTION--------------------    
    if(clean.length < 5) throw new Error("Need >= 5 positive solve times for logit")
    //logit-transform, avoid exact 0 or 1 by clamping tiny epsilon
    const z = trimmed.map(t => {
        const p = Math.min(Math.max(t / M, eps), 1 - eps);
        return Math.log(p / (1 - p));
    })
    //MLE in logit-space
    const logitN = z.length;
    const meanLogit = z.reduce((s, v) => s + v, 0) / logitN;
    const stdLogit = Math.sqrt(
        z.reduce((s, v) => s + (v - meanLogit) ** 2, 0) / (logitN - 1)
    )

    window.userData.logitCoeffs = {mu: meanLogit, sigma: stdLogit, max: M}


    //--------------------LOG DISTRIBUTION--------------------
    const logTimes = clean.map(t => Math.log(t));
    const mu_log = logTimes.reduce((a, b) => a + b, 0) / n;
    const var_log = logTimes.reduce((sum, t) => sum + (t - mu_log) ** 2, 0) / n;

    window.userData.logCoeffs = {mu: mu_log, sigma: Math.sqrt(var_log)}
}


//create the probability distribution functions for all the different distributions
function createDistributionPDFs() {
    console.log("createDistributionPDFS called")
    const binData = window.userData.hist[window.selectedSess];
    const normCoeffs = window.userData.normCoeffs
    const skewCoeffs = window.userData.skewCoeffs
    const betaCoeffs = window.userData.betaCoeffs
    const gammaCoeffs = window.userData.gammaCoeffs
    const logitCoeffs = window.userData.logitCoeffs
    const logCoeffs = window.userData.logCoeffs

    //--------------------NORMAL DISTRIBUTION--------------------
    let sum = 0
    const normData = binData.map(([x]) => {
        const y = normalPDF(x, normCoeffs.mu, normCoeffs.sigma)
        sum += y;
        return [x, y];
    });
    window.userData.distribData[0] = normData; //store the norm pdf


    //--------------------SKEW DISTRIBUTION--------------------
    sum = 0;
    const skewData = binData.map(([x]) => {
        const y = skewNormalPDF(x, skewCoeffs.xi, skewCoeffs.omega, skewCoeffs.alpha);
        sum += y;
        return [x, y];
    });
    window.userData.distribData[1] = skewData; //store the skew pdf


    //--------------------BETA DISTRIBUTION--------------------
    sum = 0
    const betaData = binData.map(([x]) => {
        const y = betaPDF(x/betaCoeffs.max, betaCoeffs.alpha, betaCoeffs.beta) / betaCoeffs.max;
        sum += y;
        return [x, y];
    });
    window.userData.distribData[2] = betaData; //store beta pdf


    //--------------------GAMMA DISTRIBUTION--------------------
    sum = 0
    const gammaData = binData.map(([x]) => {
        //const y = scale * normalPDF(x, stats[0], stats[1])
        const y = gammaPDF(x, gammaCoeffs.alpha, gammaCoeffs.theta);
        sum += y;
        return [x, y];
    });
    window.userData.distribData[3] = gammaData; //store gamma pdf


    //--------------------LOGIT DISTRIBUTION--------------------
    sum = 0
    const logitData = binData.map(([x]) => {
        let y = 0;
        if( x < logitCoeffs.max) y = logitNormPDF(x/logitCoeffs.max, logitCoeffs.mu, logitCoeffs.sigma) / logitCoeffs.max
        sum += y
        return [x, y]
    })
    window.userData.distribData[4] = logitData


    //--------------------LOG DISTRIBUTION--------------------
    sum = 0
    const logData = binData.map(([x]) => {
        const y = logPDF(x, logCoeffs.mu, logCoeffs.sigma)
        sum += y
        return [x, y]
    })
    window.userData.distribData[5] = logData

}


//create the cumulative distribution functions for all the different distributions
function createDistributionCDFs() {
    console.log("createDistributionCDFS called")
    const cdf = window.userData.cdf;
    const minVal = cdf[0][0];
    const maxVal = cdf[cdf.length-1][0]
    const density = cdf.length/(maxVal-minVal);

    const normCoeffs = window.userData.normCoeffs
    const skewCoeffs = window.userData.skewCoeffs
    const betaCoeffs = window.userData.betaCoeffs
    const gammaCoeffs = window.userData.gammaCoeffs
    const logitCoeffs = window.userData.logitCoeffs
    const logCoeffs = window.userData.logCoeffs

    //for some distributions, coding the CDF function is hard so I will just add up columns of the pdf
    const stepSize = 0.001
    let currentX = 0;
    let distribY = 0

    //--------------------NORMAL DISTRIBUTION--------------------
    const normCDF = []
    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]
        const distribY = generalNormalCDF(x, normCoeffs.mu, normCoeffs.sigma)
        normCDF.push([x,distribY])
    }
    window.userData.distribCdfData[0] = normCDF;


    //--------------------SKEW DISTRIBUTION--------------------
    //using integration by adding up columns
    const skewCdf = []
    currentX = 0;
    distribY = 0
    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]
        while(currentX < x) {
            distribY += skewNormalPDF(currentX, skewCoeffs.xi, skewCoeffs.omega, skewCoeffs.alpha)*stepSize
            currentX += stepSize;
        }
        skewCdf.push([x, distribY])
    }
    window.userData.distribCdfData[1] = skewCdf;


    //--------------------BETA DISTRIBUTION--------------------
    const betaCdf = []
    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]
        const distribY = betaCDF(x/betaCoeffs.max, betaCoeffs.alpha, betaCoeffs.beta)
        betaCdf.push([x, distribY])
    }
    window.userData.distribCdfData[2] = betaCdf;


    //--------------------GAMMA DISTRIBUTION--------------------
    //using integration by adding up columns
    const gammaCDF_ = []
    currentX = 0;
    distribY = 0
    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]
        while(currentX < x) {
            distribY += gammaPDF(currentX, gammaCoeffs.alpha, gammaCoeffs.theta) * stepSize
            currentX += stepSize
        }
        gammaCDF_.push([x,distribY])
    }
    window.userData.distribCdfData[3] = gammaCDF_;


    //--------------------LOGIT DISTRIBUTION--------------------
    const logitCDF = []
    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]
        let distribY = 1;
        if(x < logitCoeffs.max) distribY = logitNormCDF(x/logitCoeffs.max, logitCoeffs.mu, logitCoeffs.sigma)
        logitCDF.push([x,distribY])
    }
    window.userData.distribCdfData[4] = logitCDF;


    //--------------------LOG DISTRIBUTION--------------------
    const logCDF_ = []
    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]
        const distribY = logCDF(x, logCoeffs.mu, logCoeffs.sigma)
        logCDF_.push([x,distribY])
    }
    window.userData.distribCdfData[5] = logCDF_;

}

function performAndersonDarlingTest() {
    const labels = window.userData.distribLabels
    const ids = window.userData.distribADids
    const testVals = []

    for(let d = 0; d < labels.length; d++) {
        const cdfData = window.userData.distribCdfData[d]
        const n = cdfData.length;
        let realN = n //adjust n if any terms are skipped so A^2 doesnt become negative

        let sum = 0;

        for (let i = 0; i < n; i++) {
            const F = cdfData[i][1];         // CDF at x_i
            const FComp = cdfData[n - 1 - i][1]; // CDF at x_{n - i}

            // Avoid log(0) or log(1)
            if (F <= 0 || F >= 1 || FComp <= 0 || FComp >= 1) {
                realN -= 1
                continue;
            }

            sum += (2 * (i + 1) - 1) * (Math.log(F) + Math.log(1 - FComp));
        }
        const aSquared = -realN - (sum / realN)
        //return -n - (sum / n);
        //console.log("a squared for ",labels[d],": ", aSquared)
        document.getElementById(ids[d]).innerText = aSquared.toFixed(2)
        document.getElementById(ids[d]).style.backgroundColor = ""
        testVals.push(aSquared)
    }

    let minId = 0
    for(let d = 0; d < labels.length; d++) {
        if(testVals[d] < testVals[minId]) minId = d
    }   
    document.getElementById(ids[minId]).style.backgroundColor = "#FFFF00"
}

function performKSTest() {
    const labels = window.userData.distribLabels
    const ids = window.userData.distribKSids
    const testVals = []

    for(let d = 0; d < labels.length; d++) {
        const cdf = window.userData.cdf
        const distribCdf = window.userData.distribCdfData[d]
        const n = cdf.length;
        let max = 0;
        //debugger;
        for (let i = 0; i < n; i++) {
            const err = Math.abs(cdf[i][1] - distribCdf[i][1])
            if(err > max) max = err
        }

        //return -n - (sum / n);
        //console.log("ks for ",labels[d],": ", max)
        document.getElementById(ids[d]).innerText = max.toFixed(3)
        document.getElementById(ids[d]).style.backgroundColor = ""
        testVals.push(max)
    }

    let minId = 0
    for(let d = 0; d < labels.length; d++) {
        if(testVals[d] < testVals[minId]) minId = d
    }   
    document.getElementById(ids[minId]).style.backgroundColor = "#FFFF00"
}
