import "../lib/dygraph.js";
import "../lib/dygraph-extra.js"
import "../lib/uPlot.iife.min.js";

import { makeArrayOfArrays, binarySearchInsertIdx, round, parseTime} from "./utils.js"
import { graphTabStartup, resetRegressions } from "./graphTab.js";
import { histogramTabStartup, rangeSelectorApply } from "./histogramTab.js";
import { updatePBTable, pbTabStartup } from "./pbTab.js"
import { activityTabStartup, drawHeatmap } from "./activityTab.js";


window.selectedSess = 0; //selected session from the cstimer


//clicking of the overlays closes them too
const overlayIds = [
    'fileHintOverlay',
    'slidingWindowHintOverlay',
    'creationHintOverlay',
    'createHintOverlay',
    'distributionHintOverlay',
    'powerLawHintOverlay'
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
const graphButton = document.getElementById("graphButton");
const histogramButton = document.getElementById("histogramButton");
const statsButton = document.getElementById("statsButton");
const activityButton = document.getElementById("activityButton");
const graphContainer = document.getElementById("graphContainer");
const histogramContainer = document.getElementById("histogramContainer");
const statsContainer = document.getElementById("statsContainer");
const activityContainer = document.getElementById("activityContainer");
window.resetContainers = function() {
    histogramContainer.style.display = "none";
    histogramButton.classList.remove("pressed");
    statsContainer.style.display = "none";
    statsButton.classList.remove("pressed");
    graphContainer.style.display = "none";
    graphButton.classList.remove("pressed");
    activityContainer.style.display = "none";
    activityButton.classList.remove("pressed");
}
graphButton.addEventListener("click", function () {
    window.currentTab = "graph";
    window.resetContainers();
    graphContainer.style.display = "flex";
    graphButton.classList.add("pressed");
    window.updateGraph();
})
statsButton.addEventListener("click", function() {
    window.currentTab = "stats";
    window.resetContainers();
    statsContainer.style.display = "flex";
    statsButton.classList.add("pressed");
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
})
activityButton.addEventListener("click", function() {
    window.currentTab = "activity";
    window.resetContainers();
    activityContainer.style.display = "flex";
    activityButton.classList.add("pressed");
    drawHeatmap();
})
//#endregion


function dropdownOnChange() {
    window.selectedSess = document.getElementById("title-dropdown").value;
    //Only update what is on screen
    if(window.currentTab == "graph") { 
        resetRegressions();
        window.updateGraph();
    }

    else if (window.currentTab == "hist") {
        histBucketInput.value = window.userData.histDefaultWidths[window.selectedSess]
        window.resetRangeSelector();
        rangeSelectorApply()
        window.genSessionDistribData();
        window.updateHist();
        if(window.distribMode == "pdf") window.h.resetZoom(); 
        window.userData.genSlidingWindowDefaults(); window.userData.genCreationDefaults(); 
    }

    else if (window.currentTab == "stats") {
        //automatically click the button of the selected pb series
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
                window.dropdown.appendChild(child);
            }
        }
        window.dropdown.setAttribute("value", window.selectedSess);
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
        /** Incoming data format from csTimer
         *  {
         *      "session1":[[[solve1 time modifier, solve1 time],solve1 scramble,idk, solve1 UTC],[same shit for solve 2 and so on],[solve3],[...]],
         *      "session2":[[[solve1 time modifier, solve1 time],solve1 scramble,idk, solve1 UTC],[same shit for solve 2 and so on],[solve3],[...]],
         *      "...": [...],
         *      "properties":
         *          {
         *              "sessionData":
         *                  {
         *                      "session # (1-numSessions)": 
         *                          {
         *                              "name": name of session,
         *                              "opt": options like the scramble type,
         *                              "rank": idk
         *                              "stat": [#of solves, #of dnfs, mean time(ms)],
         *                              "date": [solve1 UTC, most recent solve UTC]
         *                          },
         *                      "...": ...
         *                  }
         *              "useMilli": true/false,
         *              "...useless stuff...""
         *              "statalu": all the stats you see on the left, mine is "mo3 ao5 ao12 ao50 ao100 ao200 ao500 ao1000",
         *              "...just a bunch more useless stuff...": ...
         *          }
         * }
         */
        this.xTitle = "Date";
        this.xTitle2 = "Solve #";

        this.dataFormat = "" //either csTimer or acubemy

        this.numSessions = 0;
        this.sessions = []; //names of sessions
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
            console.log("this is acubemy data")
            this.dataFormat = "acubemy"
            this.sessions.push("3x3")
            this.numSessions = 1
        }
        

        this.labels = [ "Date",    "Time",    "PB Single", "ao5",     "PB ao5",  "ao12",    "PB ao12", "ao100",   "PB ao100", "ao1000",  "PB ao1000" ];
        this.colors = [            "#084C61", "#084C61",   "#177E89", "#177E89", "#86A06A", "#86A06A", "#F2934A", "#F2934A",  "#E45E3D", "#E45E3D"];
        this.widths = [            2,         2,           2,         2,         2,         2,          2,        2,          2,          2]
        this.visibilities = [      true,      true,        true,      false,     true,      false,      true,     false,      true,      false];
        
        //   date, time, pb s, ao5, pb ao5, ao12, pb ao12, ao50, pb ao50, ao100, pb ao100, ao1000, pbao1000
        this.solves = makeArrayOfArrays(this.numSessions);
        //solve #, time, pb s, ao5, pb ao5, ao12, pb ao12, ao50, pb ao50, ao100, pb ao100, ao1000, pbao1000
        this.solves2 = makeArrayOfArrays(this.numSessions);

        //histogram
        this.hist = makeArrayOfArrays(this.numSessions);
        this.maxDelta = 0.985;
        this.distribLabels = ["Normal Fit", "Skew Fit", "Beta Fit", "Gamma Fit", "Logit Fit", "Log Fit"];
        this.distribColors = ["#00FF00",    "#0000FF",  "#FF0000",  "#FF00FF",   "#FFFF00",   "#00FFFF"] //g, b, r, m, y, c
        this.distribVisibilities = [false,        false,      false,      false,       false,       false];
        this.distribData =         [[],           [],         [],         [],          [],          []];
        this.distribCdfData =      [[],           [],         [],         [],          [],          []];
        this.distribADids = ["normAD", "skewAD", "betaAD", "gammaAD", "logitAD", "logAD"]; //ids for elements showing AD statistic
        this.distribKSids = ["normKS", "skewKS", "betaKS", "gammaKS", "logitKS", "logKS"]; //ids for elements showing KS statistic
        

        //pb data for stats panel
        this.pbInfo = makeArrayOfArrays(this.numSessions);
        this.currentPbSeries = "PB Single"
        
        //Add the first two columns: solve date, solve time
        if(this.dataFormat == "csTimer") {
            const fcstartTime = performance.now() 
            for (let s = 1; s <= this.numSessions; s++) {
                const sessionKey = `session${s}`;
                if (data[sessionKey] !== undefined) {
                    for (let i = 0; i < data[sessionKey].length; i++) {
                        this.solves[s - 1].push([new Date(1000 * data[sessionKey][i][3])]);         //solve date
                        this.solves[s - 1][i].push(0.001*parseTime(data[sessionKey][i][0]))         //solve time
                    }
                }
            }
            const fcendTime = performance.now()
            console.log(`first 2 cols: ${round(fcendTime - fcstartTime)} milliseconds`)
        } else if(this.dataFormat == "acubemy") {
            for(let i = data.length - 1 ; i > 1 ; i--) {
                this.solves[0].push([new Date(data[i].date)])                   //solve date
                this.solves[0][data.length-i-1].push(0.001*data[i].total_time)  //solve time
            }
        }
        
        //Delete DNFs
        const ddstartTime = performance.now() 
        for(let j = 0; j < this.numSessions; j++) {
            for(let i = 0; i < this.solves[j].length; i++) {
                if(this.solves[j][i][1] == 0) {
                    this.solves[j].splice(i,1);
                    i-=1;
                }
            }
        }
        const ddendTime = performance.now()
        console.log(`delete dnfs: ${round(ddendTime - ddstartTime)} milliseconds`)

        //create the default data series
        const ddsstartTime = performance.now() 
        this.pbsOfLastCol(1);
        this.pushAvg(5);
        this.pbsOfLastCol(5);
        this.pushAvg(12);
        this.pbsOfLastCol(12);
        this.pushAvg(100);
        this.pbsOfLastCol(100);
        this.pushAvg(1000);
        this.pbsOfLastCol(1000);
        const ddsendTime = performance.now()
        console.log(`default series: ${round(ddsendTime - ddsstartTime)} milliseconds`)
        
        //This creates solves2, which is solves but x-axis is solve#
        const s2startTime = performance.now() 
        this.createSolves2();
        const s2endTime = performance.now()
        console.log(`create solves2: ${round(s2endTime - s2startTime)} milliseconds`)
        

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
        for(let b = 0; b <= max+1; b+= bucketSize_) {
            this.hist[j].push([b,0]);
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
        console.log("genSlidingWindowDefaults called")
        let numSolves = this.solves[window.selectedSess].length
        let mean = 0;
        let deviation = 0;
        let max = 0;
        for(let i = 0; i < numSolves; i++) {
            const time = this.solves[window.selectedSess][i][1]
            if(time > max) max = time;
            mean += time;
        }
        mean /= numSolves;
        for(let i = 0; i < numSolves; i++) {
            const time = this.solves[window.selectedSess][i][1]
            deviation += (time - mean) ** 2
        }
        deviation /= numSolves;
        deviation = deviation ** 0.5

        //-----width-----
        const rawWidth = deviation / 6;
        //  Snap to closest power-of-two fraction (0.25, 0.5, 1, 2, 4, ...)
        const log2 = Math.round(Math.log2(rawWidth));
        const sldWinWidth = Math.pow(2, log2);

        //-----window - 1/5 of total solves-----
        const sldWinWindow = Math.round(numSolves * 0.2 + 1);

        //-----step-----
        const sldWinStep = Math.round(sldWinWindow / 100 + 1)

        //-----xmax - 2 standard deviations-----
        const sldWinXmax = Math.round(mean+3*deviation+1);

        //-----time-----
        const sldWinTime = 1

        document.getElementById("sldWinWidth").value = sldWinWidth
        document.getElementById("sldWinWindow").value = sldWinWindow
        document.getElementById("sldWinStep").value = sldWinStep
        document.getElementById("sldWinXmax").value = sldWinXmax
        document.getElementById("sldWinTime").value = sldWinTime
    }

    //generate the default parameters for the creation animation
    genCreationDefaults() {
        console.log("genCreationDefaults called")
        let numSolves = this.solves[window.selectedSess].length
        let mean = 0;
        let deviation = 0;
        let max = 0;
        for(let i = 0; i < numSolves; i++) {
            const time = this.solves[window.selectedSess][i][1]
            if(time > max) max = time;
            mean += time;
        }
        mean /= numSolves;
        for(let i = 0; i < numSolves; i++) {
            const time = this.solves[window.selectedSess][i][1]
            deviation += (time - mean) ** 2
        }
        deviation /= numSolves;
        deviation = deviation ** 0.5

        //-----width-----
        const rawWidth = deviation / 6;
        //  Snap to closest power-of-two fraction (0.25, 0.5, 1, 2, 4, ...)
        const log2 = Math.round(Math.log2(rawWidth));
        const creationWidth = Math.pow(2, log2);

        //-----step-----
        const creationStep = Math.round(numSolves / 1000 + 1)

        //-----xmax - 2 standard deviations-----
        const creationXmax = Math.round(mean+6*deviation+1);

        document.getElementById("creationWidth").value = creationWidth
        document.getElementById("creationStep").value = creationStep
        document.getElementById("creationXmax").value = creationXmax
    }


    //append a column for the average of the x last solves
    pushAvg(x, index = undefined) {
        const pastartTime = performance.now() 
        
        let sum,mean
        for (let j = 0; j < this.numSessions; j++) {
            const solves = this.solves[j];
            const clip = Math.ceil(0.05 * x); //Remove top and bottom 5% of solves
            const trimmedSize = x-clip*2
            let windo = [];
            
            for (let i = 0; i < solves.length; i++) {
                const newVal = solves[i][1];
                if (i < x) { //Cant make an average without enough data
                    if(index == undefined) { solves[i].push(null); } 
                    else { solves[i].splice(index,0,null); }
                    // Insert new solve time in sorted position
                    const insertIdx = binarySearchInsertIdx(windo, newVal);
                    if (insertIdx === -1) windo.push(newVal);
                    else windo.splice(insertIdx, 0, newVal);
                } else {
                    // Remove oldest solve from window
                    const old = solves[i - x][1];
                    const removeIdx = binarySearchInsertIdx(windo, old);
                    if (removeIdx !== -1) windo.splice(removeIdx, 1);
                    
                    // Insert new solve time in sorted position
                    const insertIdx = binarySearchInsertIdx(windo, newVal);
                    if (insertIdx === -1) windo.push(newVal);
                    else windo.splice(insertIdx, 0, newVal);
            
                    //mean of clipped portion
                    sum = 0;
                    for(let k = clip; k < x-clip; k++) {sum+=windo[k]}
                    mean = sum/trimmedSize

                    if (index === undefined) { solves[i].push(mean); } 
                    else { solves[i].splice(index, 0, mean); }
                }
            }
        }

        const paendTime = performance.now()
        console.log(`   push ao${x}: ${round(paendTime - pastartTime)} milliseconds`)
    }

    //append a column for the mean of the x last solves
    pushMean(x, index = undefined) {
        const pmstartTime = performance.now() 
        
        let sum,mean
        for (let j = 0; j < this.numSessions; j++) {
            const solves = this.solves[j];
            let windo = [];
            
            for (let i = 0; i < solves.length; i++) {
                const newVal = solves[i][1];
                if (i < x) { //Cant make an average without enough data
                    if(index == undefined) { solves[i].push(null); } 
                    else { solves[i].splice(index,0,null); }
                    windo.push(newVal)
                } else {
                    windo.splice(0,1)  // Remove oldest solve from window
                    windo.push(newVal) // Insert new solve time in window
            
                    //mean of window
                    sum = 0;
                    for(let k = 0; k < x; k++) {sum+=windo[k]}
                    mean = sum/x

                    if (index === undefined) { solves[i].push(mean); } 
                    else { solves[i].splice(index, 0, mean); }
                }
            }
        }

        const pmendTime = performance.now()
        console.log(`   push mo${x}: ${round(pmendTime - pmstartTime)} milliseconds`)
    }


    //Append a col for the pb of the previous col
    //lowkey you can provide an index of the col to calc pbs for but thats beside the point
    pbsOfLastCol(x, index = undefined) {
        const pblstartTime = performance.now() 
        
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

                //find the first valid index - 
                //for a pb ao12, this would be 12
                let firstValIdx = 0
                for(let i = 0; i < this.solves[j].length; i++) {
                    firstValIdx += 1;
                    if(index == undefined) {
                        this.solves[j][i].push(this.solves[j][i][idx])
                    } else {
                        this.solves[j][i].splice(idx+1,0,this.solves[j][i][idx])
                    }
                    
                    if(this.solves[j][i][idx] > 0) break;
                    
                }
                
                //creating the actual data
                let bestSinceLastPB = Infinity;
                for (let i = firstValIdx; i < this.solves[j].length; i++) {
                    const solveTime = this.solves[j][i][idx];
                    const prevPB = this.solves[j][i-1][idx+1]
                    //if the time is less than prev pb, update the rolling pb
                    if (solveTime < prevPB) {
                        if(index == undefined) {
                            this.solves[j][i].push(solveTime)
                        }
                        else {
                            this.solves[j][i].splice(idx + 1, 0, solveTime)
                        }
                        bestSinceLastPB = Infinity
                        times.push(solveTime); //time
                        dates.push(this.solves[j][i][0]) //date
                        solveNums.push(i); //solve #

                    }
                    //otherwise, keep the current pb
                    else {
                        if(index == undefined) {
                            this.solves[j][i].push(prevPB)
                        } else {
                            this.solves[j][i].splice(idx + 1, 0, prevPB)
                        }
                        if (solveTime < bestSinceLastPB) bestSinceLastPB = solveTime;

                    }
                }

                seriesPBs.times = times;
                seriesPBs.dates = dates;
                seriesPBs.solveNums = solveNums;
                seriesPBs.bestSinceLastPB = bestSinceLastPB;

                //index is undefined for the original series, 
                //must be specified for additional series so they are in the right order
                if (index == undefined) {
                    this.pbInfo[j].push(seriesPBs);
                } else {
                    this.pbInfo[j].splice((idx - 1) / 2, 0, seriesPBs)
                }

            }
        }

        const pblendTime = performance.now()
        console.log(`   pb ao${x}: ${round(pblendTime - pblstartTime)} milliseconds`)
        
    }

}

