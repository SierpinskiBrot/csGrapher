
import { makeArrayOfArrays, binarySearchInsertIdx, parseTime, defaultColumnWidth, seriesColor} from "./utils.js"
import { sampleMoments } from "./probabilities.js"
import { graphTabStartup, resetRegressions } from "./graphTab.js";
import { histogramTabStartup } from "./histogramTab.js";
import { updatePBTable, pbTabStartup } from "./pbTab.js"
import { activityTabStartup, drawHeatmap } from "./activityTab.js";
import { parseMoveSolves } from "./tps.js";

window.selectedSess = 0; //selected session from the cstimer
//acubemy move_times is kept in userData.moveSolves and only shown (as the TPS graph) in the histogram tab
window.isMoveTimes = () => window.userData?.moveSess == window.selectedSess

//clicking of the overlays closes them too
const overlayIds = [
    'fileHintOverlay',
    'slidingWindowHintOverlay',
    'creationHintOverlay',
    'createHintOverlay',
    'distributionHintOverlay',
    'regressionHintOverlay',
    'tpsHintOverlay'
];
function setupOverlayDismiss(id) {
    const el = document.getElementById(id);
    if (el) {
        el.onclick = (e) => {
            if (e.target.id === id) {
                el.style.display = 'none';
            }
        };
    }
}
overlayIds.forEach(setupOverlayDismiss);

//#region handle the toolbar buttons on the top
window.currentTab = "graph";
const tabs = [[graphContainer, graphButton], [histogramContainer, histogramButton], [statsContainer, statsButton], [activityContainer, activityButton]];
window.resetContainers = function() {
    for (const [container, button] of tabs) {
        container.style.display = "none";
        button.classList.remove("pressed");
    }
}
//hide the other tabs and show this one
window.showTab = function(name, container, button) {
    window.currentTab = name;
    window.resetContainers();
    container.style.display = "flex";
    button.classList.add("pressed");

    //move_times can only be selected in the histogram tab
    const moveOption = window.dropdown?.querySelector(`option[value="${window.userData.moveSess}"]`)
    if (!moveOption) return
    moveOption.hidden = name != "hist"
    if (moveOption.hidden && window.isMoveTimes()) window.dropdown.value = window.selectedSess = 0
}
graphButton.addEventListener("click", function () {
    window.showTab("graph", graphContainer, graphButton);
    window.updateGraph();
})
statsButton.addEventListener("click", function() {
    window.showTab("stats", statsContainer, statsButton);
    showSelectedPBSeries();
})
activityButton.addEventListener("click", function() {
    window.showTab("activity", activityContainer, activityButton);
    drawHeatmap();
})
//#endregion

//show the PB table of the selected series, by clicking its button
function showSelectedPBSeries() {
    let clickOccured = false;
    const buttons = document.getElementsByClassName('pbSeriesSelectButton pressed')
    for(let btn of buttons) {
        if(btn.innerText == window.userData.currentPbSeries) {
            btn.click()
            clickOccured = true
        }
    }
    if(!clickOccured) {
        updatePBTable(window.dropdown.value,0)
    }
}

function dropdownOnChange() {
    window.selectedSess = document.getElementById("title-dropdown").value;
    //Only update what is on screen
    if(window.currentTab == "graph") {
        resetRegressions();
        window.updateGraph();
    }
    else if (window.currentTab == "hist") {
        window.histShowSession();
    }
    else if (window.currentTab == "stats") {
        showSelectedPBSeries();
    }
    else if (window.currentTab == "activity") {
        drawHeatmap();
    }
}

//This code is run after the user uploads a file
const jsonDataFile = document.getElementById("UploadFile");
jsonDataFile.addEventListener("change", function() {

    var GetFile = new FileReader;
    GetFile .onload=function(){
        const result = GetFile.result;
        var jsonData = JSON.parse(result);
        
        //create the userData
        window.userData = new UserData(jsonData)
        
        //Create the dropdown for the title of the graph and set its functionality
        if(document.getElementById("title-dropdown")) document.getElementById("title-dropdown").remove()
        window.dropdown = document.createElement("select");
        window.dropdown.setAttribute("id","title-dropdown")
        for (let i = 0; i < window.userData.numSessions; i++) {
            if(window.userData.sessions[i]) {
                let child = document.createElement("option");
                child.value = i;
                child.innerHTML = window.userData.sessions[i];
                child.hidden = i == window.userData.moveSess && window.currentTab != "hist";
                window.dropdown.appendChild(child);
            }
        }
        const first = window.userData.solves.findIndex(s => s.length > 0);
        window.selectedSess = first < 0 ? 0 : first;
        window.dropdown.value = String(window.selectedSess);
        window.dropdown.addEventListener("change", dropdownOnChange)
        document.getElementById("hintButton").after(window.dropdown)
        
        graphTabStartup();
        histogramTabStartup();
        pbTabStartup();
        activityTabStartup();
        
    }

    GetFile.readAsText(this.files[0]);
});

class UserData {
    constructor(data) {

        this.dataFormat = "" //either csTimer or acubemy

        this.numSessions = 0;
        this.sessions = []; //names of sessions
        this.moveSess = -1; //index of the acubemy move_times session, whose solves are in moveSolves instead

        //Get the session names
        if(data?.properties?.sessionData != undefined){
            this.dataFormat = "csTimer"
            const sessionData = JSON.parse(data.properties.sessionData)
            for(let i = 0; i < 100; i++) {
                if(sessionData[i] != undefined){
                    this.sessions.push(sessionData[i].name)
                    this.numSessions += 1
                }
            }
        } else {
            this.dataFormat = "acubemy"
            this.sessions = ["3x3", "turns", "tps", "cross_time", "f2l_time", "oll_time", "pll_time", "move_times"]
            this.numSessions = 8
            this.moveSess = 7
        }
        

        this.labels = [ "Date",    "Time",      "PB Single",   "ao5",        "PB ao5",    "ao12",      "PB ao12",   "ao100",     "PB ao100",    "ao1000",  "PB ao1000" ];
        this.colors = [            0, 0, 1, 1, 2, 2, 3, 3, 4, 4].map(seriesColor);
        this.widths = [            2,            2,             2,           2,           2,           2,            2,           2,            2,          2]
        this.visibilities = [      true,        true,          true,        false,       true,         false,        true,        false,         true,      false];

        this.bands = []
        
        //   date, time, pb s, ao5, pb ao5, ao12, pb ao12, ao50, pb ao50, ao100, pb ao100, ao1000, pbao1000
        this.solves = makeArrayOfArrays(this.numSessions);
        //solve #, time, pb s, ao5, pb ao5, ao12, pb ao12, ao50, pb ao50, ao100, pb ao100, ao1000, pbao1000
        this.solves2 = makeArrayOfArrays(this.numSessions);

        //histogram
        this.hist = makeArrayOfArrays(this.numSessions);
        this.distribLabels = ["Normal Fit", "Skew Fit", "Ex-Gaussian Fit", "Gamma Fit", "Logit Fit", "Shifted Log Fit", "Metalog Fit"];
        this.distribColors = ["#00FF00",    "#0000FF",  "#FF0000",  "#FF00FF",   "#FFFF00",   "#00FFFF",   "#FF8C00"] //g, b, r, m, y, c, orange
        this.distribVisibilities = [false,        false,      false,      false,       false,       false,       false];
        this.distribData =         [[],           [],         [],         [],          [],          [],          []];
        this.distribCdfData =      [[],           [],         [],         [],          [],          [],          []];
        this.distribADids = ["normAD", "skewAD", "exGaussAD", "gammaAD", "logitAD", "logAD", "metalogAD"]; //ids for elements showing AD statistic
        this.distribKSids = ["normKS", "skewKS", "exGaussKS", "gammaKS", "logitKS", "logKS", "metalogKS"]; //ids for elements showing KS statistic

        this.averageVisibilities = [false, false, false]
        

        //pb data for stats panel
        this.pbInfo = makeArrayOfArrays(this.numSessions);
        this.currentPbSeries = "PB Single"
        
        //Add the first two columns: solve date, solve time
        if(this.dataFormat == "csTimer") {
            for (let s = 1; s <= this.numSessions; s++) {
                const sessionKey = `session${s}`;
                if (data[sessionKey] !== undefined) {
                    for (let i = 0; i < data[sessionKey].length; i++) {
                        this.solves[s - 1].push([new Date(1000 * data[sessionKey][i][3])]);         //solve date
                        this.solves[s - 1][i].push(0.001*parseTime(data[sessionKey][i][0]))         //solve time
                    }
                }
            }
        } else if(this.dataFormat == "acubemy") {
            //only CFOP solves, oldest first; moveSolves[i] is the solve of row i in every session
            this.moveSolves = parseMoveSolves(data)
            for(const s of this.moveSolves) {
                this.solves[0].push([s.date, 0.001*s.total])    //3x3
                this.solves[1].push([s.date, s.turns])          //turns
                this.solves[2].push([s.date, s.tps])            //tps
                for(let k = 0; k < 4; k++) this.solves[3+k].push([s.date, 0.001*s.steps[k]])    //cross, f2l, oll, pll
            }
        }
        
        //Delete DNFs
        for(let j = 0; j < this.numSessions; j++) {
            for(let i = 0; i < this.solves[j].length; i++) {
                if(this.solves[j][i][1] == 0) this.solves[j][i][1] = null
            }
        }

        //Fix "Invalid Date" for very old cstimer files
        this.sessIsReal = [];
        for (let j = 0; j < this.numSessions; j++) {
            this.sessIsReal[j] = this.normalizeSessionDates(this.solves[j]);
        }

        
        //create the default data series
        this.pbsOfLastCol(1);
        for (const x of [5, 12, 100, 1000]) {
            this.pushAvg(x);
            this.createIQR(x)
            this.createSTD(x)
            this.pbsOfLastCol(x);
        }

        //This creates solves2, which is solves but x-axis is solve#
        this.createSolves2();
        this.createSolves3();
        

        //add the data for histogram
        this.createHist(1)
        this.genSlidingWindowDefaults()
        this.genCreationDefaults()
     
    }

    createSolves2() {
        this.solves2 = makeArrayOfArrays(this.numSessions);
        for(let i = 0; i < this.numSessions; i++) {
            for(let k = 0; k < this.solves[i].length; k++) {
                this.solves2[i].push(Array.from(this.solves[i][k]))
                this.solves2[i][k][0] = k+1;
            }
        }
    }

    createSolves3() {
        this.solves3 = makeArrayOfArrays(this.numSessions);
        for(let i = 0; i < this.numSessions; i++) {
            let sum = 0;
            for(let k = 0; k < this.solves[i].length; k++) {
                this.solves3[i].push(Array.from(this.solves[i][k]))
                sum += this.solves3[i][k][1]/3600
                this.solves3[i][k][0] = sum
            }
        }
    }

    createHist(bucketSize) {
        const j = window.selectedSess
        const bucketSize_ = parseFloat(bucketSize)
        this.hist[j] = [];

        let max = 0;
        const times = [];

        //extract solves and find the max time
        for(let i = 0; i < this.solves[j].length; i++) {
            const time = this.solves[j][i][1];
            times.push(time);
            if(time > max) max = time;
        }

        //create the buckets
        for(let b = 0; b * bucketSize_ <= max+1; b++) {
            this.hist[j].push([b*bucketSize_,0]);
        }
        //add the solves to buckets
        for(let i = 0; i < this.solves[j].length; i++) {
            const time = this.solves[j][i][1];
            const bucket = Math.floor(time/bucketSize_);
            this.hist[j][bucket][1] += 1;
        }

    }

    //generate the default parameters for the sliding window animation
    genSlidingWindowDefaults() {
        const times = this.solves[window.selectedSess].map(s => s[1])
        const { mean, sd } = sampleMoments(times)
        const window_ = Math.round(times.length * 0.2 + 1) //1/5 of total solves
        document.getElementById("sldWinWidth").value = defaultColumnWidth(sd)
        document.getElementById("sldWinWindow").value = window_
        document.getElementById("sldWinStep").value = Math.round(window_ / 100 + 1)
        document.getElementById("sldWinXmax").value = Math.round(mean + 3 * sd + 1) //3 standard deviations
        document.getElementById("sldWinTime").value = 1
    }

    //generate the default parameters for the creation animation
    genCreationDefaults() {
        const times = this.solves[window.selectedSess].map(s => s[1])
        const { mean, sd } = sampleMoments(times)
        document.getElementById("creationWidth").value = defaultColumnWidth(sd)
        document.getElementById("creationStep").value = Math.round(times.length / 1000 + 1)
        document.getElementById("creationXmax").value = Math.round(mean + 6 * sd + 1) //6 standard deviations
    }

    //append a column for the average of the x last solves
    pushAvg(x, index = undefined) {
        //if index is undefined the new col will be appended to the end instead of spliced
        x = Number(x);
        const clip = Math.ceil(0.05 * x);
        const trimmedSize = x - clip * 2;
        const key = v => (v == null ? Infinity : v);
        const put = (row, val) => index === undefined ? row.push(val) : row.splice(index, 0, val);

        for (let j = 0; j < this.numSessions; j++) {
            const solves = this.solves[j];
            const windo = [];
            for (let i = 0; i < solves.length; i++) {
                const newKey = key(solves[i][1]);
                windo.splice(binarySearchInsertIdx(windo, newKey), 0, newKey);
                if (i >= x) {
                    const oldKey = key(solves[i - x][1]);
                    windo.splice(binarySearchInsertIdx(windo, oldKey), 1);
                }
                if (i < x - 1 || windo[x - clip - 1] === Infinity) { put(solves[i], null); continue; }
                let sum = 0;
                for (let k = clip; k < x - clip; k++) sum += windo[k];
                put(solves[i], sum / trimmedSize);
            }
        }
    }

    //append a column for the mean of the x last solves
    pushMean(x, index = undefined) {
        const put = (row, val) => index === undefined ? row.push(val) : row.splice(index, 0, val);
        for (let j = 0; j < this.numSessions; j++) {
            const solves = this.solves[j];
            let sum = 0, dnfs = 0;
            for (let i = 0; i < solves.length; i++) {
                const v = solves[i][1];
                if (v == null) dnfs++; else sum += v;
                if (i >= x) { const o = solves[i - x][1]; if (o == null) dnfs--; else sum -= o; }
                put(solves[i], (i < x - 1 || dnfs > 0) ? null : sum / x);
            }
        }
    }

    //interquartile range band over the last x solves
    createIQR(x) {
        x = Number(x);
        const key = v => (v == null ? Infinity : v);
        const q1Idx = Math.floor(0.25 * (x - 1));
        const q3Idx = Math.floor(0.75 * (x - 1));
        this.createBand(x, "iqr", () => {
            const windo = [];
            return {
                add: v => windo.splice(binarySearchInsertIdx(windo, key(v)), 0, key(v)),
                remove: v => windo.splice(binarySearchInsertIdx(windo, key(v)), 1),
                //too many DNFs for Q3 to be real
                bounds: nullCount => nullCount / x >= 0.25 ? null
                    : [windo[q3Idx], windo[q1Idx]].map(q => q !== Infinity ? q : null),
            };
        });
    }

    //mean +- one standard deviation band over the last x solves, ignoring DNFs
    createSTD(x) {
        x = Number(x);
        this.createBand(x, "std", () => {
            let n = 0, sum = 0, sumSq = 0;
            return {
                add: v => { if (v != null) { n++; sum += v; sumSq += v * v; } },
                remove: v => { if (v != null) { n--; sum -= v; sumSq -= v * v; } },
                //>= 5% DNFs
                bounds: nullCount => {
                    if (nullCount / x >= 0.05 || n <= 1) return null;
                    const mean = sum / n;
                    const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
                    return [mean + std, mean - std];
                },
            };
        });
    }

    //add a band around a series, from a rolling window of the last x solves in each session
    //makeWindow() gives the window's add(time), remove(time) and bounds(nullCount) -> [upper, lower] or null
    createBand(x, type, makeWindow) {
        const upperBands = [];
        const lowerBands = [];
        //always push, even for empty sessions, so band.upper[j] is session j
        for (const solves of this.solves) {
            const windo = makeWindow();
            const upper = [];
            const lower = [];
            let nullCount = 0;
            for (let i = 0; i < solves.length; i++) {
                //add newest, and remove oldest once the window is over size x
                if (solves[i][1] == null) nullCount++;
                windo.add(solves[i][1]);
                if (i >= x) {
                    if (solves[i - x][1] == null) nullCount--;
                    windo.remove(solves[i - x][1]);
                }
                //not enough solves yet, or the window says there is no band here
                const bounds = i < x - 1 ? null : windo.bounds(nullCount);
                upper.push(bounds ? bounds[0] : null);
                lower.push(bounds ? bounds[1] : null);
            }
            upperBands.push(upper);
            lowerBands.push(lower);
        }
        this.bands.push({ upper: upperBands, lower: lowerBands, name: x, type, enabled: false });
    }

    //Append a col for the pb of the previous col
    //lowkey you can provide an index of the col to calc pbs for but thats beside the point
    pbsOfLastCol(x, index = undefined) {
        //do this for each session
        for(let j = 0; j < this.numSessions; j++){
            if(this.solves[j].length != 0) {

                const seriesPBs = {};
                const times = []
                const dates = []
                const solveNums = []
                
                //index of the last col in session
                let idx = this.solves[j][this.solves[j].length-1].length - 1;
                if(index != undefined) idx = index;
                //add the pb col after it
                const put = (row, val) => index == undefined ? row.push(val) : row.splice(idx + 1, 0, val);

                //find the first valid index - 
                //for a pb ao12, this would be 12
                let firstValIdx = 0
                for(let i = 0; i < this.solves[j].length; i++) {
                    firstValIdx += 1;
                    put(this.solves[j][i], this.solves[j][i][idx])
                    
                    const v = this.solves[j][i][idx];
                    if (v > 0) {
                        times.push(v);
                        dates.push(this.solves[j][i][0]);
                        solveNums.push(i + 1);
                        break;
                    }
                    
                }
                
                //creating the actual data
                let bestSinceLastPB = Infinity;
                for (let i = firstValIdx; i < this.solves[j].length; i++) {
                    const solveTime = this.solves[j][i][idx];
                    const prevPB = this.solves[j][i-1][idx+1]
                    //if the time is less than prev pb, update the rolling pb
                    if (solveTime && solveTime < prevPB) {
                        put(this.solves[j][i], solveTime)
                        bestSinceLastPB = Infinity
                        times.push(solveTime); //time
                        dates.push(this.solves[j][i][0]) //date
                        solveNums.push(i+1); //solve #

                    }
                    //otherwise, keep the current pb
                    else {
                        put(this.solves[j][i], prevPB)
                        if (solveTime && solveTime < bestSinceLastPB) bestSinceLastPB = solveTime;

                    }
                }

                seriesPBs.times = times;
                seriesPBs.dates = dates;
                seriesPBs.solveNums = solveNums;
                seriesPBs.bestSinceLastPB = bestSinceLastPB;
                let sumSinceLastPB = 0;
                let numSinceLastPB = 0
                for(let i = solveNums[solveNums.length-1] -1; i < this.solves[j].length; i++) {
                    sumSinceLastPB += this.solves[j][i][idx]
                    if(this.solves[j][i][idx]) numSinceLastPB++;
                }
                
                seriesPBs.meanSinceLastPB = sumSinceLastPB/numSinceLastPB;
                let stdSinceLastPB = 0;
                for(let i = solveNums[solveNums.length-1] -1; i < this.solves[j].length; i++) {
                    if(this.solves[j][i][idx]) {stdSinceLastPB += (this.solves[j][i][idx]-seriesPBs.meanSinceLastPB)**2}
                }
                stdSinceLastPB /= numSinceLastPB;
                stdSinceLastPB = stdSinceLastPB**0.5
                seriesPBs.stdSinceLastPB = stdSinceLastPB;

                //index is undefined for the original series, 
                //must be specified for additional series so they are in the right order
                if (index == undefined) {
                    this.pbInfo[j].push(seriesPBs);
                } else {
                    this.pbInfo[j].splice((idx - 1) / 2, 0, seriesPBs)
                }

            }
        }
    }

    normalizeSessionDates(solves) {
        const n = solves.length;
        const isReal = new Uint8Array(n); // 0/1 and fast

        // Collect indices that have real dates
        const realIdx = [];
        for (let i = 0; i < n; i++) {
            const t = solves[i][0].getTime();
            if (!Number.isNaN(t)) {
                isReal[i] = 1;
                realIdx.push(i);
            }
        }

        // If no real dates at all, synthesize a timeline
        if (realIdx.length === 0) {
            const now = Date.now();
            const msPerSolve = 30_000; // fallback density
            for (let i = 0; i < n; i++) {
                solves[i][0] = new Date(now - (n - 1 - i) * msPerSolve);
            }
            return isReal; // all 0
        }

        // Estimate typical ms per solve 
        const deltas = [];
        for (let k = 1; k < realIdx.length; k++) {
            const a = realIdx[k - 1], b = realIdx[k];
            const ta = solves[a][0].getTime();
            const tb = solves[b][0].getTime();
            const di = b - a;
            const dtPerSolve = (tb - ta) / di;
            if (di > 0 && Number.isFinite(dtPerSolve)) deltas.push(dtPerSolve);
        }

        let msPerSolve = 30_000; // fallback if we can't compute
        if (deltas.length) {
            deltas.sort((x, y) => x - y);
            const m = deltas.length >> 1;
            msPerSolve = (deltas.length & 1) ? deltas[m] : (deltas[m - 1] + deltas[m]) / 2;
           
            if (!Number.isFinite(msPerSolve) || msPerSolve <= 0) msPerSolve = 30_000;
            if (msPerSolve < 250) msPerSolve = 250;
            if (msPerSolve > 24 * 60 * 60 * 1000) msPerSolve = 24 * 60 * 60 * 1000;
        }

        // Fill gaps with linear interpolation
        for (let k = 0; k < realIdx.length - 1; k++) {
            const a = realIdx[k], b = realIdx[k + 1];
            const ta = solves[a][0].getTime();
            const tb = solves[b][0].getTime();
            const gap = b - a;

            if (gap > 1) {
            for (let i = a + 1; i < b; i++) {
                const frac = (i - a) / gap;
                solves[i][0] = new Date(ta + frac * (tb - ta));
                // isReal[i] stays 0
            }
            }
        }

        // Extrapolate before first real
        const first = realIdx[0];
        for (let i = first - 1; i >= 0; i--) {
            solves[i][0] = new Date(solves[i + 1][0].getTime() - msPerSolve);
        }

        // Extrapolate after last real
        const last = realIdx[realIdx.length - 1];
        for (let i = last + 1; i < n; i++) {
            solves[i][0] = new Date(solves[i - 1][0].getTime() + msPerSolve);
        }

        return isReal; // Uint8Array of 0/1
        }

}
