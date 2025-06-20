import {binarySearchInsertIdx, round, dhm, sleep, createButton, parseTime} from "./utils.js"
export {histogramTabStartup}
import {themes} from "./themes.js"


window.sldWinPlaying = false;
window.creationPlaying = false;
window.distribMode = "pdf"

//sliding window play
document.getElementById("sldWinPlay").addEventListener("click", function() {
    if(window.sldWinPlaying) {window.sldWinPlaying = false;} 
    else {window.creationPlaying = false; animateHistRange();}
})
//sliding window reset
document.getElementById("sldWinReset").addEventListener("click", function() {
    histBucketInput.value = 1
    window.userData.createHist(histBucketInput.value)
    updateHist();
})
//sliding window defaults
document.getElementById("sldWinDefaults").addEventListener("click", function() {window.userData.genSlidingWindowDefaults();})

//creation play
document.getElementById("creationPlay").addEventListener("click", function() {
    if(window.creationPlaying) {window.creationPlaying = false} 
    else {window.sldWinPlaying = false;animateHistCreate();}
})
//creation reset
document.getElementById("creationReset").addEventListener("click", function() {
    histBucketInput.value = 1
    window.userData.createHist(histBucketInput.value)
    updateHist();
})
//creation defaults
document.getElementById("creationDefaults").addEventListener("click", function() {window.userData.genCreationDefaults();})


//distribution buttons
document.getElementById("showHistNorm").addEventListener("click", function() {
    window.userData.createNormData();
    window.userData.distribVisibilities[0] = !window.userData.distribVisibilities[0];
    updateHist();
})
document.getElementById("showHistSkew").addEventListener("click", function() {
    window.userData.createSkewData();
    window.userData.distribVisibilities[1] = !window.userData.distribVisibilities[1];
    updateHist();
})
document.getElementById("showHistBeta").addEventListener("click", function() {
    window.userData.createBetaData();
    window.userData.distribVisibilities[2] = !window.userData.distribVisibilities[2];
    updateHist();
})


const probDistribButton = document.getElementById("clickProbDistrib")
const cumDistribButton = document.getElementById("clickCumDistrib")
probDistribButton.addEventListener("click", function() {
    cumDistribButton.classList.remove("pressed");
    probDistribButton.classList.add("pressed");
    window.distribMode = "pdf"
    updateHist();
})
cumDistribButton.addEventListener("click", function() {
    probDistribButton.classList.remove("pressed");
    cumDistribButton.classList.add("pressed");
    window.userData.cdfData = createCDF();
    window.distribMode = "cdf"
    updateHist();
})


//col width input
document.getElementById("histBucketInput").addEventListener("change", function() {
    window.userData.createHist(histBucketInput.value)
    updateHist();
})
//reset
document.getElementById("histBucketReset").addEventListener("click", function() {
    histBucketInput.value = 1
    window.userData.createHist(histBucketInput.value)
    updateHist();
})

// Update the histogram (with optional overlays)
window.updateHist = function () {

    if(window.distribMode == "pdf") {
        window.selectedSess = document.getElementById("title-dropdown").value;
        //update these in case bucketsize was changed
        window.userData.createNormData()
        window.userData.createBetaData()
        window.userData.createSkewData()

        const hist = window.userData.hist[window.selectedSess];
        const distrib = window.userData.distribData;
        const dLabels = window.userData.distribLabels;
        const numDistribs = distrib.length;

        const numSolves = window.userData.solves[window.selectedSess].length;
        const bucketWidth = hist[1][0] - hist[0][0];
        const scale = numSolves*bucketWidth;

        
        // Start building combined data
        const combined = hist.map(([x, y], i) => {
            const row = [x, y/scale];

            for(let d = 0; d < numDistribs; d++) {
                if(window.userData.distribVisibilities[d]) {
                    row.push(distrib?.[d]?.[i]?.[1] ?? null);
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

        // Update Dygraph
        window.h.updateOptions({
            file: combined,
            labels: labels,
        });
    }
    else if(window.distribMode == "cdf") {
        window.h.updateOptions({
            file: window.userData.cdfData,
            labels: ["Time(s)","Probability"],
            xlabel: "Time(s)",
            ylabel: 'Probability',
            dateWindow: window.userData.cdfRange
        })
    }
    
};



function createHistRange(bucketSize, range,offset) {
    const bucketSize_ = parseFloat(bucketSize)
    const hist = []
    let j = window.selectedSess
    const solves = window.userData.solves[j]
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

window.createCDF = function() {
    const solves = window.userData.solves[window.selectedSess];
    const times = solves.map(s => s[1]);

    // Sort ascending
    const sorted = [...times].sort((a, b) => a - b);
    const n = sorted.length;
    const max = sorted[n-1]
    const min = sorted[0]

    const cdf = new Map(); // to deduplicate by keeping latest index

    for (let i = 0; i < n; i++) {
        const x = sorted[i];
        const y = (i + 1) / n;
        cdf.set(x, y); // later index overwrites earlier => keeps highest y
    }

    // Convert map to array of [time, cdf] points
    
    window.userData.cdfRange = [0,max];
    return Array.from(cdf.entries());


}


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

    //just for the progress bar
    const totalFrames = Math.floor((numSolves - range) / step)
    let frame = 0;

    for(let i = numSolves-range; i > 0; i-=step) {
        if(!window.sldWinPlaying) break; //animation can be cancelled with stop button

        const hist = createHistRange(bucketSize,range,i)
        window.h.updateOptions({
            file: hist,
            dateWindow: [0,xmax],
            labels: ["Time(s)", "Frequency"],
        });

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

    let j = window.selectedSess
    const solves = window.userData.solves[j]
    const numSolves = solves.length

    //for the progress bar
    const totalFrames = Math.floor(numSolves/step)
    let frame = 0;

    const hist = []
    
    let max = 0;
    //find the max time
    for(let i = 0; i < numSolves; i++) {const time = solves[i][1];if(time > max) max = time;}
    //create the buckets
    for(let b = 0; b <= max+1; b+= bucketSize) {hist.push([b,0]);}

    //add the solves to buckets
    for(let i = 0; i < numSolves; i++) {
        if(!window.creationPlaying) break; //animation can be cancelled with stop button

        const time = solves[i][1];
        const bucket = Math.floor(time/bucketSize);
        hist[bucket][1] += 1;

        //only draw every STEP frames, so animation isnt too slow
        if(i % step == 0) {
            window.h.updateOptions({
                file: hist,
                dateWindow: [0,Xmax],
                labels: ["Time(s)", "Frequency"],
            });

            //update progress bar
            frame++
            progressBar.style.width = `${(frame/totalFrames)*100}%`

            await sleep(1)
        } 
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
                stepPlot: true,
                fillGraph: true,
                color: themes[window.currentTheme]['--color-primary'],
                legend: "follow",
                fillAlpha: 0.5,
                //labelsSeparateLines: false,
            }
        );
    });

    //styling for the distributions
    window.h.updateOptions({series : { "Normal Fit" : {fillGraph: false, stepPlot: false, color: "#00FF00", axis: "y1"}}})
    window.h.updateOptions({series : { "Skew Fit" : {fillGraph: false, stepPlot: false, color: "#0000FF", axis: "y1"}}})
    window.h.updateOptions({series : { "Beta Fit" : {fillGraph: false, stepPlot: false, color: "#FF0000", axis: "y1"}}})
    
}