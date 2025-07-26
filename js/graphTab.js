import { createButton } from "./utils.js";
import {updatePBTable } from "./statisticsTab.js"
import {themes} from "./themes.js"
export {graphTabStartup};


//              x,     y
var logScale = [false, false]

//Do the dygraph line styling for series i. 
function doSeriesLineStyling(i) {
    const label_ = window.userData.labels[i]
    const color_ = window.userData.colors[i - 1]
    const width_ = window.userData.widths[i - 1]
    //Default setup
    window.g.updateOptions({series : { 
        [label_] : {
            color : color_,
            strokeWidth : width_
        }
    }})
    //Dashed line for pb
    if(label_[0] == 'P') {
        window.g.updateOptions({series : { [label_] : {strokePattern: Dygraph.DASHED_LINE}}})
    }
    //Points for time
    if(label_ == 'Time') {
        window.g.updateOptions({series : { [label_] : {
            strokeWidth: 0,
            drawPoints: true,
            pointSize: width_}}})
    }
}

//Create the whole series toggle table, for statistics tab aswell
function createAllSeriesRows() {
    const toggleTableBody = document.getElementById("toggleTableBody")
    const pbSeriesTableBody = document.getElementById("pbSeriesTableBody")
    toggleTableBody.replaceChildren();
    pbSeriesTableBody.replaceChildren();
    //increment by 2 because 2 series per row
    for (let i = 1; i < window.userData.labels.length; i+=2) {
        const newRow = createSeriesRow(i);
        toggleTableBody.appendChild(newRow[0])
        pbSeriesTableBody.appendChild(newRow[1])
    }
}

function createSeriesRow(i) {
    //create 1st toggle button (aoX/moX/Single)
    const newButton1 = createButton(window.userData.labels[i], (e) => {
        const currentVisibility = window.userData.visibilities[i - 1];
        window.userData.visibilities[i - 1] = !currentVisibility;
        window.g.setVisibility(window.userData.visibilities, true);
        const tgt = e.target.closest('button');
        tgt.classList.toggle('pressed');
    }, "seriesToggle")
    
    //colorful shadow
    const color1 = window.userData.colors[i - 1];
    newButton1.style = "box-shadow: 2px 2px 3px 3px" + color1

    //check if clicked or unclicked
    if (!window.userData.visibilities[i - 1]) newButton1.classList.toggle('pressed')

    //create 2nd toggle button (PB)
    const newButton2 = createButton("PB", (e) => {
        const currentVisibility = window.userData.visibilities[i];
        window.userData.visibilities[i] = !currentVisibility;
        window.g.setVisibility(window.userData.visibilities, true);
        const tgt = e.target.closest('button');
        tgt.classList.toggle('pressed');
    }, "seriesToggle")

    //colorful shadow
    const color2 = window.userData.colors[i];
    newButton2.style = "box-shadow: 2px 2px 3px 3px" + color2

    //check if clicked or unclicked
    if (!window.userData.visibilities[i]) newButton2.classList.toggle('pressed')


    //create the settings button
    const seriesSettings = createButton(">", (e) => {
        const settings = document.getElementById("seriesSettingsBox")
        //make the settings box visible and move it to the cursor
        settings.style.display = settings.style.display === 'block' ? 'none' : 'block';
        settings.style.top = e.pageY + "px"
        settings.style.left = e.pageX + 10 + "px"

        //use the name attribute to know which series is being edited
        settings.name = i+1 

        //set the value of the color selector to the color of the series
        document.getElementById("seriesColorSelector").value = window.userData.colors[i - 1];

        //if dealing with the time series, show the lines/points radio
        const timeStyleRadio = document.getElementById("seriesTimeStyleRadio")
        if(i == 1) { timeStyleRadio.style.display = "inline-flex" } 
        else { timeStyleRadio.style.display = "none" }

        //set the value of the width selector the the width of the series
        document.getElementById("seriesWidthSelector").value = window.userData.widths[i - 1];
    }, "seriesSettings")

    //create the button for the statistics tab
    const pbSeriesButton = createButton(window.userData.labels[i+1], (e) => {
        //make all the other buttons untoggled
        const allButtons = document.getElementsByClassName('pbSeriesSelectButton pressed');
        for(let btn of allButtons) { btn.classList.toggle('pressed'); }

        //update the pb table
        const sess = document.getElementById("title-dropdown").value;
        updatePBTable(sess,(i-1)/2);

        //make button pressed and store the selection
        const tgt = e.target.closest('button');
        tgt.classList.toggle('pressed');
        window.userData.currentPbSeries = window.userData.labels[i+1]
    }, "seriesToggle pbSeriesSelectButton")

    if(window.userData.currentPbSeries == window.userData.labels[i+1]) {pbSeriesButton.classList.toggle('pressed')}

    const cell1 = document.createElement("td")
    cell1.appendChild(newButton1)
    const cell2 = document.createElement("td")
    cell2.appendChild(newButton2)
    const cell3 = document.createElement("td")
    cell3.appendChild(seriesSettings)
    const newRow = document.createElement("tr")
    newRow.appendChild(cell1)
    newRow.appendChild(cell2)
    newRow.appendChild(cell3)
    return [newRow, pbSeriesButton]
}

//handling the add series button
document.getElementById("addSeriesBtn").addEventListener("click", () => {
    const type = document.getElementById("newAvgType").value; // 'ao' or 'mo'
    const size = parseInt(document.getElementById("newAvgSize").value); //X
    const width = parseInt(document.getElementById('newAvgWidth').value)

    if (isNaN(size) || size < 1) return alert("Please enter a valid number.");
    if (size == 1 || (type == "ao" && size == 2)) return alert("Bro")
  
    const label1 = `${type}${size}`;
    const label2 = "PB "+label1
    const color = document.getElementById("newAvgColor").value
  
    // Avoid duplicates
    if (window.userData.labels.includes(label1)) {
      alert("This series already exists.");
      return;
    }

    //Find where to insert the new series, they should be in order
    let index = window.userData.labels.length;
    for(let i = 3; i < window.userData.labels.length; i++) { //skip over 'Time' and 'PB'
        const x = parseInt(window.userData.labels[i].substring(2))

        if(x > size) {
            index = i;
            break;
        }

        //mean should go behind average
        if(x == size) {
            if(type == "ao") {index = i+2;}
            else {index = i;}
            break;
        }

        i++ //skip over 'PB' of row
    }

    //splice the attributes in the right locations
    window.userData.labels.splice(index,0,label1);window.userData.labels.splice(index+1,0,label2)
    window.userData.colors.splice(index-1,0,color);window.userData.colors.splice(index-1,0,color);
    window.userData.widths.splice(index-1,0,width);window.userData.widths.splice(index-1,0,width);
    window.userData.visibilities.splice(index-1,0,true);window.userData.visibilities.splice(index-1,0,true);
    
    //calc the average/mean column
    if (type === "ao") window.userData.pushAvg(size, index);
    else window.userData.pushMean(size, index);

    //calc the pb column
    window.userData.pbsOfLastCol(size, index)

    //right...
    window.userData.createSolves2();
  
    //Do the line styling for ao/mo and pb
    doSeriesLineStyling(index)
    doSeriesLineStyling(index+1)

    //just remake the whole table cuz its quick and im lazy
    createAllSeriesRows();
    
    updateGraph();
    window.g.setVisibility(window.userData.visibilities, true);
});



//Update the graph
window.updateGraph = function() {
    console.log("window.updateGraph called")
    window.selectedSess = document.getElementById("title-dropdown").value;
    
    if(powerLawAnalysis) {
        runPowerLaw();
        const solves = window.userData.solves2[window.selectedSess];
        const numSolves = solves.length
        const offset = parseInt(document.getElementById("powerLawOffset").value) || 0;
        const a = powerLawAnalysisCoeffs[0]
        const b = powerLawAnalysisCoeffs[1]
        const c = powerLawAnalysisCoeffs[2]
        const r2 = powerLawAnalysisCoeffs[3]

        document.getElementById("powerLawR2").innerText = r2.toFixed(4)
        
        let max = 0
        let min = Infinity
        for(let i = 0; i < numSolves; i++) {
            const time = solves[i][1]
            if(time > max) max = time
            if(time < min) min = time
        }
        const lowerBound = Math.max(0.001, min - 0.1*(max-min))
        const upperBound = max + 0.1*(max-min)


        const displayed = []

        for(let i = -offset; i < numSolves*1.5; i++) {
            const newRow = []
            newRow.push(i+1+offset)
            for(let j = 1; j < solves[0].length;j++) {
                if(i < numSolves && i >= 0) newRow.push(solves[i][j])
                else newRow.push(NaN)
            }
            newRow.push(a * Math.pow(i+1+offset,-b) + c)
            //if(i == -offset) console.log("First time: ",a * Math.pow(i+1+offset,b))
            displayed.push(newRow);
        }

        const newLabels = []
        const labels = window.userData.labels
        for(let i = 0; i < labels.length; i++) { newLabels.push(labels[i]) }

        newLabels.push("Power Law Fit")
        if(logScale[1]) { //if the y-axis is log it makes sense to let it be as high as it wants
            window.g.updateOptions({
                file: displayed, 
                labels: newLabels,
                dateWindow: [1, offset + 1.5*(numSolves)],
                valueRange: null,
                xlabel:  window.userData.xTitle
            });
        } else {
            window.g.updateOptions({
                file: displayed, 
                labels: newLabels,
                dateWindow: [1, offset + 1.5*(numSolves)],
                valueRange: [lowerBound, upperBound],
                //valueRange: [min, max],
                xlabel:  "Solve #"
            });
        }
        
    } else if(window.userData.xTitle == "Date") {
        window.g.updateOptions({
            file: window.userData.solves[window.selectedSess], 
            labels: window.userData.labels,
            xlabel:  window.userData.xTitle
        });
    } else if (window.userData.xTitle == "Solve #") {
        window.g.updateOptions({
            file: window.userData.solves2[window.selectedSess], 
            labels: window.userData.labels,
            xlabel: window.userData.xTitle
        });
    }
    
};

//#region Handle the buttons on the right of the graph screen
//Handle swapping between Date and Solve# on the x-axis
const xSelectDate = document.getElementById("xSelectDate");
const xSelectSolve = document.getElementById("xSelectSolve");
xSelectDate.addEventListener("click", function() { 
    if(window.userData.xTitle == "Solve #")  {
        window.userData.xTitle = "Date"
        window.updateGraph();
        window.g.resetZoom();
    }
});
xSelectSolve.addEventListener("click", function() { 
    if(window.userData.xTitle == "Date") {
        window.userData.xTitle = "Solve #"
        window.updateGraph();
        window.g.resetZoom();
    }
});

//Handle swapping between Linear and Log on the x-axis
const xSelectLinear = document.getElementById("xSelectLinear");
const xSelectLog = document.getElementById("xSelectLog");
function xSwapScale() {
    if(window.userData != undefined && window.g != undefined) {
        logScale[0] = !logScale[0];
        window.g.updateOptions({ axes : { x : {  logscale : logScale[0] } } })
        if(powerLawAnalysis && logScale[0]) window.g.resetZoom();
    }
};
xSelectLinear.addEventListener("click", function() { if(logScale[0] == true) xSwapScale(); });
xSelectLog.addEventListener("click", function() { if(logScale[0] == false) xSwapScale(); });

//Handle swapping between Linear and Log on the y-axis
const ySelectLinear = document.getElementById("ySelectLinear");
const ySelectLog = document.getElementById("ySelectLog");
function ySwapScale() {
    if(window.userData != undefined && window.g != undefined) {
        logScale[1] = !logScale[1];
        window.g.updateOptions({  logscale : logScale[1] })
        if(powerLawAnalysis && logScale[1]) window.g.resetZoom();
    }
};
ySelectLinear.addEventListener("click", function() { if(logScale[1] == true) ySwapScale(); });
ySelectLog.addEventListener("click", function() { if(logScale[1] == false) ySwapScale(); });
//#endregion

let powerLawAnalysis = false;
const powerLawAnalysisCoeffs = [0,0,0,0] //a,b,c,r2
document.getElementById("powerLawAnalysisOn").addEventListener("click", function() {
    powerLawAnalysis = true
    xSelectDate.disabled = true
    xSelectSolve.disabled = true
    window.g.updateOptions({series : { 
        "Power Law Fit" : {
            color : "#000000",
            strokeWidth : 3
        }
    }})
    window.updateGraph();
})
document.getElementById("powerLawAnalysisOff").addEventListener("click", function() {
    powerLawAnalysis = false
    xSelectDate.disabled = false
    xSelectSolve.disabled = false
    window.updateGraph(); window.g.resetZoom();
})
document.getElementById("powerLawIterations").addEventListener("change", function() {
    if(powerLawAnalysis) window.updateGraph();
})


function runPowerLaw() {
    const iters = parseInt(document.getElementById("powerLawIterations").value)
    const times = window.userData.solves[window.selectedSess].map(s => s[9]);
    const clean = times.filter(t => t > 0 && Number.isFinite(t));
    const { a, b, c, r2 } = powerLawFit(clean, {iterations: iters});

    powerLawAnalysisCoeffs[0] = a
    powerLawAnalysisCoeffs[1] = b
    powerLawAnalysisCoeffs[2] = c
    powerLawAnalysisCoeffs[3] = r2

    console.log(`RT = ${a.toFixed(3)} · P^(-${b.toFixed(3)}) + ${c.toFixed(3)} (R² = ${r2.toFixed(4)})`);

}


//#region handle series settings box
//the color selector
document.getElementById("seriesColorSelector").addEventListener("change", function () {
    const seriesNumber = parseInt(document.getElementById("seriesSettingsBox").name)
    
    //update saved color
    window.userData.colors[seriesNumber - 1] = this.value;
    window.userData.colors[seriesNumber - 2] = this.value;

    //update color on the graph
    const label1 = window.userData.labels[seriesNumber]
    const label2 = window.userData.labels[seriesNumber - 1]
    window.g.updateOptions({
        series: {
            [label1]: { color: window.userData.colors[seriesNumber - 1] },
            [label2]: { color: window.userData.colors[seriesNumber - 2] }
        }
    })

    //update the color of the series toggle buttons shadow
    const toggleButtons = document.getElementsByClassName("seriesToggle")
    for (let i = 1; i <= 2; i++) {
        toggleButtons[seriesNumber - i].style = "box-shadow: 2px 2px 3px 3px " + window.userData.colors[seriesNumber - i]
        toggleButtons[seriesNumber - i].style = "box-shadow: 2px 2px 3px 3px " + window.userData.colors[seriesNumber - i]
    }
})

//the width selector
document.getElementById("seriesWidthSelector").addEventListener("change", function () {
    const seriesNumber = parseInt(document.getElementById("seriesSettingsBox").name)
    for (let i = 0; i <= 1; i++) {
        //update saved width
        const width_ = this.value
        window.userData.widths[seriesNumber - (i+1)] = width_;
        
        //update width on the graph
        const label_ = window.userData.labels[seriesNumber - i]
        if (label_ == 'Time') {
            if(document.getElementById("seriesTimeLines").checked) {
                window.g.updateOptions({series: {[label_]: {drawPoints: false, strokeWidth: width_}}})
            } else {
                window.g.updateOptions({series: {[label_]: {pointSize: width_, strokeWidth: 0}}})
            }
            
        }

        else { window.g.updateOptions({series: {[label_]: { strokeWidth: width_ }}}) }
    } 
})

//the points/lines radio
document.getElementById("seriesTimePoints").addEventListener("click", function() { 
    window.g.updateOptions({series: {"Time": {drawPoints: true, pointSize: window.userData.widths[1], strokeWidth: 0}}})
})
document.getElementById("seriesTimeLines").addEventListener("click", function() {
    window.g.updateOptions({series: {"Time": {drawPoints: false, strokeWidth: window.userData.widths[1]}}})
})
//#endregion

function graphTabStartup() {
    //Reset the buttons on the right
    xSelectDate.checked = true;
    xSelectLinear.checked = true;
    ySelectLinear.checked = true;

    //Make sure its empty
    document.getElementById("graphdiv").replaceChildren();

    //create dygraphs
    Dygraph.onDOMready(function onDOMready() {
        //Create the main graph
        window.g = new Dygraph(
            document.getElementById("graphdiv"), // containing div
            window.userData.solves[window.selectedSess], //Data
            //Options
            {
                labels: window.userData.labels,
                xlabel: window.userData.xTitle,
                ylabel: "Time(s)",
                legend: "follow",
                color: "#084C61",
            }
        );
    });
    window.g.setVisibility(window.userData.visibilities, true);

    //Line styling for each line
    for(let i = 1; i < window.userData.labels.length; i++) {
        doSeriesLineStyling(i)
    }
    
    //-----create the series toggle buttons-----
    createAllSeriesRows();
}

window.saveGraphTabAsImg = function() {
    //center this or the ancient library will not  
    document.querySelectorAll('.dygraph-xlabel').forEach(xlabel => {
        if (xlabel.parentElement) { xlabel.parentElement.style.textAlign = 'center'; }
    });

    const imagething = document.getElementById("dygraphImage")
    Dygraph.Export.asPNG(window.g, imagething, {backgroundColor: themes[window.currentTheme]['--color-surface']});
    
    // Wait a bit for Dygraph to finish rendering
    setTimeout(() => {
        // Convert dataURL to Blob
        const dataUrl = imagething.src;
        if (!dataUrl.startsWith("data:image/png")) return;

        fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank', 'noopener');
                // Optionally, revoke the object URL after a delay
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            });
    }, 100);

}

/**
 * Fit RT = a * P^(-b) + c  to an array of y-values (RTs).
 * The array index 0 → P = 1, index 1 → P = 2, ...  (Avoids divide-by-zero.)
 *
 * @param {number[]} y   – array of response times ( ≥ 0 )
 * @param {object}   [opt] – { iterations: 1000, learningRate: 1e-6 }
 * @returns {{a:number, b:number, c:number, r2:number}}
 */
function powerLawFit(y, opt = {}) {
    const n  = y.length;
    const offset = parseInt(document.getElementById("powerLawOffset").value) || 0; // offset for the x-axis

    if (n < 3) throw new Error('Need at least 3 points');

    // Build the x-axis
    const x = Array.from({ length: n }, (_, i) => i + 1 + offset); // 1, 2, 3, ..., n


    // 1. Closed-form starting guess
    //let c = Math.min(...y);                          // shift so RT − c > 0
    //const fastest = Math.min(...y);
    let fastest = 9999999999999999;
    for(let i = 0; i < n; i++) {if(y[i] < fastest) fastest = y[i]}
    let c = fastest
    
    if (!isFinite(c)) c = 0;

    const lnX = x.map(Math.log);
    const lnY = y.map(v => Math.log(Math.max(v - c, 1e-12)));

    const sum = arr => arr.reduce((s, v) => s + v, 0);
    const Sx  = sum(lnX),
        Sy  = sum(lnY),
        Sxx = sum(lnX.map(v => v * v)),
        Sxy = sum(lnX.map((v, i) => v * lnY[i]));

    const slope = (n * Sxy - Sx * Sy) / (n * Sxx - Sx * Sx); // = –b
    const intercept = (Sy - slope * Sx) / n;                 // = ln a

    let a = Math.exp(intercept);
    let b = -slope;

    // 2. Gradient descent
    const iters = opt.iterations   ?? 1000;
    const lr    = opt.learningRate ?? 1e-6;
    const clip    = 1e6;                                 // gradient-norm cap

    for (let k = 0; k < iters; ++k) {
        let gA = 0, gB = 0, gC = 0;

        for (let i = 0; i < n; ++i) {
            const xi = x[i];
            const yi = y[i];
            const xiNegB = Math.pow(xi, -b);
            const yhat   = a * xiNegB + c;
            const diff   = yhat - yi;

            // Gradients of squared error w.r.t. a, b, c
            gA += 2 * diff * xiNegB;
            gB += 2 * diff * a * xiNegB * (-lnX[i]);
            gC += 2 * diff;

        }

        // normalise gradients so no single step is too large
        const gNorm = Math.hypot(gA, gB, gC);
        if (gNorm > clip) {
            gA *= clip / gNorm;
            gB *= clip / gNorm;
            gC *= clip / gNorm;
        }

        const lrDecayed = lr / Math.sqrt(k + 1); // decay learning rate
        //const lrDecayed = lr / Math.pow(k+1,0.3); // decay learning rate
        
        //a -= lr * gA;
        //b -= lr * gB;
        //c -= lr * gC;
        a -= lrDecayed * gA;
        b -= lrDecayed * gB;
        c -= lrDecayed * gC;
        if(c > fastest) c = fastest; // don't let c go above the fastest time

        // Tiny parameter updates => converged
        //if (Math.max(Math.abs(lr * gA), Math.abs(lr * gB), Math.abs(lr * gC)) < 1e-12) break;
        if (Math.max(Math.abs(lrDecayed * gA), Math.abs(lrDecayed * gB), Math.abs(lrDecayed * gC)) < 1e-12) break;
    }

    // Coefficient of determination
    const mean = y.reduce((s, v) => s + v, 0) / n;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; ++i) {
        const diff = (a * Math.exp(-b * lnX[i]) + c) - y[i];
        ssRes += diff * diff;
        ssTot += (y[i] - mean) ** 2;
    }
    const r2 = 1 - ssRes / ssTot;

    return { a, b, c, r2 };
}

