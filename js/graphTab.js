import { createButton } from "./utils.js";
import {updatePBTable } from "./pbTab.js"
import {themes} from "./themes.js"
export {graphTabStartup};
import { rowsToUPlotCols, xAxisIsLog, setXAxisLog, yAxisIsLog, setYAxisLog } from "./utils.js";
import { regressions, powerLawFit, logLogRegression, logarithmicRegression } from "./graphTabRegressions.js";

function getSize() {
    return {
        width: graphdiv.offsetWidth - 10,
        height: graphdiv.offsetHeight - 10,
    }
}

let xAxisDataType = "Solve #"

window.addEventListener("resize", e => {
    u.setSize(getSize());
});

presetCstimer.onclick = () => {
    for(let i = 0; i < window.userData.labels.length; i++) {
        const lbl = window.userData.labels[i];
        window.userData.widths[i-1] = 3;
        window.userData.visibilities[i-1] = true;

        if(lbl === 'Time') {
            window.userData.colors[i-1] = "#555";
            window.userData.colors[i] = "#555";
        }
        else if(lbl === "ao5") {
            window.userData.colors[i-1] = "#F00";
            window.userData.colors[i] = "#F00";
        }
        else if(lbl === "ao12") {
            window.userData.colors[i-1] = "#00F";
            window.userData.colors[i] = "#00F";
        }
        else {
            window.userData.visibilities[i-1] = false;
        }
    }
    createAllSeriesRows();
    buildMainPlot();
}
presetDefault.onclick = () => {
    const newColors = ["#084C61","#084C61","#177E89","#177E89","#86A06A","#86A06A","#F2934A","#F2934A","#E45E3D","#E45E3D"];
    const newWidths = [2,         2,          2,           2,          2,          2,          2,          2,          2,           2]
    const newVisibilities = [true,true,       true,        false,      true,       false,      true,       false,      true,        false];
    for(let i = 0; i < window.userData.labels.length - 10; i++) {
        newColors.push("#000")
        newWidths.push(2)
        newVisibilities.push(false)
    }
    window.userData.colors = newColors;
    window.userData.widths = newWidths;
    window.userData.visibilities = newVisibilities;
    createAllSeriesRows();
    buildMainPlot();
}
presetGrayscale.onclick = () => {
    const newColors = [];
    const newWidths = []
    const newVisibilities = [];
    const n = window.userData.labels.length-1;
    for(let i = 0; i < n; i+=2) {
        const gray = Math.floor(255 * i / (n-1));
        newColors.push(rgbToHex(gray, gray, gray))
        newColors.push(rgbToHex(gray, gray, gray))
        newWidths.push(2)
        newWidths.push(2)
        newVisibilities.push(true)
        newVisibilities.push(false)
    }
    window.userData.colors = newColors;
    window.userData.widths = newWidths;
    window.userData.visibilities = newVisibilities;
    createAllSeriesRows();
    buildMainPlot();
}

function rgbToHex(r, g, b) {
    return (
        "#" +
        [r, g, b]
        .map((x) => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
}

allSeriesWidthSelector.addEventListener("change", (e) => {
    const val = parseInt(e.target.value);
    for(let i = 0; i < window.userData.widths.length; i++) {
        window.userData.widths[i] = val;
    }
    buildMainPlot();
})


function buildMainPlot() {
    if (!window.userData) return; // No data loaded yet
    const sess = document.getElementById("title-dropdown").value;

    let rows = []
    switch(xAxisDataType) {
        case "Solve #":
            rows = window.userData.solves2[sess]
            break
        case "Date":
            rows = window.userData.solves[sess]
            break
        case "Hours":
            rows = window.userData.solves3[sess]
            break
    }

    // deep-clone into displayedRows so we can append extra columns
    const displayed = rows.map(r => r.slice());
    let slowestSolve = 0
    for(let i = 0; i < displayed.length; i++) {
        if(displayed[i][1] > slowestSolve) slowestSolve = displayed[i][1]
    }

    // extract primary x/y for fitting
    let xs = window.userData.solves[sess].map(r => r[0])
    if(xAxisDataType == "Solve #") xs = window.userData.solves2[sess].map(r => r[0])
    if(xAxisDataType == "Hours") xs = window.userData.solves3[sess].map(r => r[0])
    
    // if any regressions are active, do forecasting
    if (activeRegs.powerLaw || activeRegs.logLog || activeRegs.logarithmic) {
        const nOriginal = xs.length;
        const nSeries = displayed[0].length;

        const forecastMultiplier = regressionProjection.value
        const offsetMultiplier = regressionOffset.value

        //Append one forecast point( x value + null-filled row)
        const pushPoint = (xVal) => {
            xs.push(xVal)
            displayed.push(new Array(nSeries).fill(null))
            displayed[displayed.length - 1][0] = xVal; //x is always col 0
        }
        //Prepend one offset point (x value + null-filled row)
        const unshiftPoint = (xVal) => {
            xs.unshift(xVal)
            displayed.unshift(new Array(nSeries).fill(null))
            displayed[0][0] = xVal
        }

        if (xAxisDataType === "Solve #") {
            //offset (backwards)
            const offsetAmount = Math.max(0,Math.floor(offsetMultiplier*nOriginal))

            for(let k = 1; k <= offsetAmount; k++) {
                unshiftPoint(-k);
            }

            //forecast (forward)
            const fCount = Math.max(0, Math.floor((forecastMultiplier - 1) * nOriginal))
            for(let i = 0; i < fCount; i++) {
                pushPoint(nOriginal+i)
            }
        } else if (xAxisDataType === "Hours") {
            const lastX = xs[xs.length - 1]
            const firstX = xs[0]
            const steps = 100

            if(!Number.isFinite(lastX) || !Number.isFinite(firstX)) {
                console.warn("Cannor offset/forecast hours: invalid x values")
            } else {
                const offsetEnd = -offsetMultiplier * lastX
                //prepend points from firstX back to offsetEnd
                if(offsetEnd < firstX) {
                    const dx = (firstX-offsetEnd) / steps
                    for(let i = 1; i <= steps; i++) {
                        unshiftPoint(firstX-dx*i)
                    }
                }

                const xStart = lastX;
                const xEnd = forecastMultiplier * lastX
                if(xEnd > xStart) {
                    const dxF = (xEnd - xStart) / steps
                    for(let i = 1; i <= steps; i++) pushPoint(xStart + dxF * i)
                }
            }
        } else if (xAxisDataType === "Date") {
            // Find earliest and latest valid dates in xs
            let minT = Infinity, maxT = -Infinity;
            for (const d of xs) {
                if (!(d instanceof Date)) continue;
                const t = d.getTime();
                if (!Number.isFinite(t)) continue;
                if (t < minT) minT = t;
                if (t > maxT) maxT = t;
            }

            if (!Number.isFinite(minT) || !Number.isFinite(maxT) || maxT <= minT) {
                console.warn("Cannot offset/forecast date: invalid or zero date span");
            } else {
                const spanMs = maxT - minT;
                const steps = 100;

                // OFFSET rule:
                // startMs = firstSolve - (last-first)*offsetMultiplier
                const startMs = minT - spanMs * offsetMultiplier;

                if (startMs < minT) {
                    const dtBack = (minT - startMs) / steps;
                    for (let i = 1; i <= steps; i++) {
                        unshiftPoint(new Date(minT - dtBack * i));
                    }
                }
                // FORECAST rule (your existing behavior): endMs = firstSolve + span*forecastMultiplier
                const endMs = minT + spanMs * forecastMultiplier;
                const dtFwd = (endMs - maxT) / steps;

                if (dtFwd > 0) {
                    for (let i = 1; i <= steps; i++) {
                        pushPoint(new Date(maxT + dtFwd * i));
                    }
                } else {
                    console.warn("Cannot forecast date: non-positive step");
                }
            }  
        } else {
            console.warn("Unknown xAxisDataType:", xAxisDataType);
        }
    }

    // for each active regression, compute and append its values
    regressions.forEach(reg => {
        if (!activeRegs[reg.id]) return;

        // IMPORTANT: for Date x-axis, convert Date objects to seconds since first solve
        let xForCompute = xs;

        if (xAxisDataType === "Date") {
            // Convert ALL dates (including offset dates) to seconds since earliest x (not “first solve”)
            let tMin = Infinity;
            for (const d of xs) {
                if (!(d instanceof Date)) continue;
                const t = d.getTime();
                if (Number.isFinite(t) && t < tMin) tMin = t;
            }
            if (!Number.isFinite(tMin)) {
                console.warn("Cannot compute regression on Date axis: no valid Date values.");
                return;
            }

            xForCompute = xs.map(d => {
                if (!(d instanceof Date)) return NaN;
                const t = d.getTime();
                if (!Number.isFinite(t)) return NaN;
                return (t - tMin) / 1000 + 1000; // seconds since earliest x
            });
        } else {
            xForCompute = xs.map(v => (Number.isFinite(v) ? v : Nan))
        }

        //shift so that the smallest xForCompute is 1
        let minX = Infinity
        for(const v of xForCompute) {
            if(Number.isFinite(v) && v < minX) minX = v
        }
        const shift = 1 - minX
        
        xForCompute = xForCompute.map(v => (Number.isFinite(v) ? (v + shift) : Nan));

        const preds = reg.compute(xForCompute);

        // add one new column per row
        preds.forEach((yhat, i) => displayed[i].push((yhat < 2*slowestSolve) ? yhat : null));
    });


    const baseSeries  = buildSeriesMeta();
    const regSeries  = regressions
        .filter(r => activeRegs[r.id])
        .map(r => ({
            label: r.label,
            stroke: r.color,
            width: r.width,
            dash: r.dash || [],
            show: true
    }));

    // convert to uPlot columns and re-create the plot
    const dataCols = rowsToUPlotCols(displayed, (xAxisDataType == "Date"), xAxisIsLog);


    if (window.u) window.u.destroy();            // tear-down old instance

    
    window.u = new uPlot({
        ...getSize(),
        drawOrder: ["series", "axes"],
        cursor: { drag: { x: true, y: true, uni: 50 }},
        plugins: [
					legendAsTooltipPlugin()
				],
        scales: { 
            x: { 
                time: (xAxisDataType == "Date"),
                distr: xAxisIsLog ? 3 : null,
                log: xAxisIsLog ? 10 : null} ,
            y: {
                distr: yAxisIsLog ? 3 : null,
                log: yAxisIsLog ? 10 : null
            }
        },
        axes  : [
            { label: [xAxisDataType],
                grid: {
                            show: true,
                            stroke: "rgba(0,0,0,0.2)",
                            width: 1,
                        },
                ticks: {
                            show: true,
                            stroke: "rgba(0,0,0,0.2)",
                            width: 1,
                        }
            },
            { label: "Time (s)",
                grid: {
                            show: true,
                            stroke: "rgba(0,0,0,0.2)",
                            width: 1,
                        },
                ticks: {
                            show: true,
                            stroke: "rgba(0,0,0,0.2)",
                            width: 1,
                        }
            }
        ],
        series: [...baseSeries, ...regSeries],
        legend: { show: true },
    }, dataCols, graphdiv);

}

function buildSeriesMeta() {
    return window.userData.labels.map((lbl, i) => ({
            label: lbl === 'Date' 
                ? xAxisDataType
                : lbl,
            stroke: i ? window.userData.colors[i - 1] : "transparent",
            show: window.userData.visibilities[i - 1],
            width:  i ? window.userData.widths[i - 1]  : 0,
            paths: (i === 1 && timeSeriesPoints) 
                ? u => null : null, 
            points: (i === 1 && timeSeriesPoints) 
                ? {
                        space: 0,
                        fill: window.userData.colors[i - 1]
                } : null,           
            dash: lbl[0] === 'P' ? [4, 4] : [],   
        }))
}


//Create the whole series toggle table, for pb tab aswell
function createAllSeriesRows() {
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
        window.u.setSeries(i, { show: !currentVisibility });
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
        window.u.setSeries(i+1, { show: !currentVisibility });
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
        //make the settings box visible and move it to the cursor
        seriesSettingsBox.style.display = seriesSettingsBox.style.display === 'block' ? 'none' : 'block';
        seriesSettingsBox.style.top = e.pageY + "px"
        seriesSettingsBox.style.left = e.pageX + 10 + "px"
        seriesSettingsHeader.innerText = "Series Settings (" + window.userData.labels[i] + ")"

        //use the name attribute to know which series is being edited
        seriesSettingsBox.name = i+1 

        //set the value of the color selector to the color of the series
        seriesColorSelector.value = window.userData.colors[i - 1];

        //if dealing with the time series, show the lines/points radio
        if(i == 1) { seriesTimeStyleRadio.style.display = "inline-flex" } 
        else { seriesTimeStyleRadio.style.display = "none" }

        //set the value of the width selector the the width of the series
        seriesWidthSelector.value = window.userData.widths[i - 1];
    }, "seriesSettings")

    //create the button for the pbs tab
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
addSeriesBtn.addEventListener("click", () => {
    const type = newAvgType.value; // 'ao' or 'mo'
    const size = newAvgSize.value; //X
    const width = newAvgWidth.value

    if (isNaN(size) || size < 1) return alert("Please enter a valid number.");
    if (size == 1 || (type == "ao" && size == 2)) return alert("Bro")
    if (!window.userData) return alert("Please upload a file first")
  
    const label1 = `${type}${size}`;
    const label2 = "PB "+label1
    const color = newAvgColor.value
  
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
    window.userData.createSolves3();
  
    //just remake the whole table cuz its quick and im lazy
    createAllSeriesRows();
    
    updateGraph();
});

allSeriesSettings.addEventListener("click", (e) => {
    //make the settings box visible and move it to the cursor
    allSeriesSettingsBox.style.display = allSeriesSettingsBox.style.display === 'block' ? 'none' : 'block';
    allSeriesSettingsBox.style.top = e.pageY + "px"
    allSeriesSettingsBox.style.left = e.pageX + 10 + "px"
})


//Update the graph
window.updateGraph = function() {
    console.log("window.updateGraph called")
    window.selectedSess = document.getElementById("title-dropdown").value;
    buildMainPlot();
};

//#region Handle the buttons on the right of the graph screen
//Handle swapping between Date and Solve # on the x-axis

function rebuildRegressions() {
    if(activeRegs.powerLaw) {
        activeRegs.powerLaw = false;
        powerLawToggle.click()
    }
    if(activeRegs.logLog) {
        activeRegs.logLog = false;
        logLogToggle.click()
    }
    if(activeRegs.logarithmic) {
        activeRegs.logarithmic = false;
        logarithmicToggle.click()
    }
}

xSelectDate.onclick   = () => { if (!(xAxisDataType == "Date"))    { xAxisDataType = "Date";    rebuildRegressions(); buildMainPlot(); } };
xSelectSolve.onclick  = () => { if (!(xAxisDataType == "Solve #")) { xAxisDataType = "Solve #"; rebuildRegressions(); buildMainPlot(); } };
xSelectHours.onclick  = () => { if (!(xAxisDataType == "Hours"))   { xAxisDataType = "Hours";   rebuildRegressions(); buildMainPlot(); } }; 
xSelectLinear.onclick = () => { if ( xAxisIsLog)  { setXAxisLog(false);  buildMainPlot(); } };
xSelectLog.onclick    = () => { if (!xAxisIsLog)  { setXAxisLog(true);   buildMainPlot(); } };
ySelectLinear.onclick = () => { if ( yAxisIsLog)  { setYAxisLog(false);  buildMainPlot(); } };
ySelectLog.onclick    = () => { if (!yAxisIsLog)  { setYAxisLog(true);   buildMainPlot(); } };

const activeRegs = {powerLaw: false, logLog: false, logarithmic: false, linear: false};

function getRegressionXYForSession(sess) {
    // Y values (clean) are always solve times
    const solves = window.userData.solves[sess];
    const solves2 = window.userData.solves2[sess];
    const solves3 = window.userData.solves3[sess];

    // Pick the raw x array depending on axis type
    let xRaw;
    if (xAxisDataType === "Date") {
        xRaw = solves.map(s => s[0]);
    } else if (xAxisDataType === "Solve #") {
        xRaw = solves2.map(s => s[0]);
    } else if (xAxisDataType === "Hours") {
        xRaw = solves3.map(s => s[0]);
    } else {
        // fallback: index+1
        xRaw = solves.map((_, i) => i + 1);
    }

    // Build paired arrays, then filter pairs together
    const x = [];
    const y = [];

    const offsetMultiplier = regressionOffset.value

    if (xAxisDataType === "Date") {
        // Find first + last valid solve dates (ONLY from real solves)
        let minT = Infinity, maxT = -Infinity;
        for (const d of xRaw) {
            if (!(d instanceof Date)) continue;
            const t = d.getTime();
            if (!Number.isFinite(t)) continue;
            if (t < minT) minT = t;
            if (t > maxT) maxT = t;
        }
        if (!Number.isFinite(minT) || !Number.isFinite(maxT) || maxT <= minT) {
            throw new Error("No valid Date span found for x-axis.");
        }

        const spanMs = maxT - minT;


        const startMs = minT - spanMs * offsetMultiplier;

        // Build x/y, converting to seconds since startMs (offset-aware)
        for (let i = 0; i < solves.length; i++) {
            const d  = xRaw[i];
            const yi = solves[i][1];

            if (!(d instanceof Date)) continue;
            const ms = d.getTime();
            if (!Number.isFinite(ms)) continue;
            if (!(yi > 0) || !Number.isFinite(yi)) continue;

            // seconds since offset-start
            x.push((ms - startMs) / 1000 + 1000);
            y.push(yi);
        }
    } else {
        for (let i = 0; i < solves.length; i++) {
        const xi = xRaw[i];
        const yi = solves[i][1];

        if (!Number.isFinite(xi)) continue;
        if (!(yi > 0) || !Number.isFinite(yi)) continue;

        x.push(xi);
        y.push(yi);
        }
    }

    if(offsetMultiplier > 0) {
        if (xAxisDataType === "Solve #") {
            const n = solves.length;
            const offsetAmount = Math.max(0, Math.floor(offsetMultiplier * n));
            for (let i = 0; i < x.length; i++) x[i] = x[i] + offsetAmount;
        } else if (xAxisDataType === "Hours") {
            const lastX = xRaw[xRaw.length - 1];
            if (Number.isFinite(lastX)) {
                const shift0 = offsetMultiplier * lastX;
                for (let i = 0; i < x.length; i++) x[i] = x[i] + shift0;
            }
        } 
    }
   

    return { x, y };
}

powerLawToggle.onclick = () => {
    if (!window.userData) return alert("Please upload a file first");
    activeRegs.powerLaw = !activeRegs.powerLaw;

    if (activeRegs.powerLaw) {
        powerLawToggle.classList.add("pressed");
        const iters = parseInt(powerLawIterations.value, 10);

        const { x, y } = getRegressionXYForSession(window.selectedSess);
        powerLawFit(y, x, { iterations: iters });

        //console.log(regressions);
    } else {
        powerLawToggle.classList.remove("pressed");
    }

    buildMainPlot();
};

powerLawIterations.onchange = () => {
    if(activeRegs.powerLaw) {
        activeRegs.powerLaw = false;
        powerLawToggle.click()
    }
}

logLogToggle.onclick = () => {
    if (!window.userData) return alert("Please upload a file first");
    activeRegs.logLog = !activeRegs.logLog;

    if (activeRegs.logLog) {
        logLogToggle.classList.add("pressed");

        const { x, y } = getRegressionXYForSession(window.selectedSess);
        logLogRegression(y, x);

        //console.log(regressions);
    } else {
        logLogToggle.classList.remove("pressed");
    }

    buildMainPlot();
};

logarithmicToggle.onclick = () => {
    if (!window.userData) return alert("Please upload a file first");
    activeRegs.logarithmic = !activeRegs.logarithmic;

    if (activeRegs.logarithmic) {
        logarithmicToggle.classList.add("pressed");

        const { x, y } = getRegressionXYForSession(window.selectedSess);
        logarithmicRegression(y, x);

        //console.log(regressions);
    } else {
        logarithmicToggle.classList.remove("pressed");
    }

    buildMainPlot();
};


export function resetRegressions() {
    //reset the regressions
    activeRegs.powerLaw = false;
    activeRegs.logLog = false;
    activeRegs.logarithmic = false;
    activeRegs.linear = false;

    //remove the pressed class from all buttons
    powerLawToggle.classList.remove("pressed");
    logLogToggle.classList.remove("pressed");
    logarithmicToggle.classList.remove("pressed");

    //reset the r2
    powerLawR2.innerText = "N/A";
    loglogR2.innerText = "N/A";
    logarithmicR2.innerText = "N/A";

}



//#region handle series settings box
//the color selector
seriesColorSelector.addEventListener("change", function () {
    const seriesNumber = parseInt(seriesSettingsBox.name)
    
    //update saved color
    window.userData.colors[seriesNumber - 1] = this.value;
    window.userData.colors[seriesNumber - 2] = this.value;

    //rebuild the graph
    buildMainPlot();

    //update the color of the series toggle buttons shadow
    const toggleButtons = document.getElementsByClassName("seriesToggle")
    for (let i = 1; i <= 2; i++) {
        toggleButtons[seriesNumber - i].style = "box-shadow: 2px 2px 3px 3px " + window.userData.colors[seriesNumber - i]
        toggleButtons[seriesNumber - i].style = "box-shadow: 2px 2px 3px 3px " + window.userData.colors[seriesNumber - i]
    }
})

//the width selector
seriesWidthSelector.addEventListener("change", function () {
    const seriesNumber = parseInt(seriesSettingsBox.name)
    for (let i = 0; i <= 1; i++) {
        //update saved width
        const width_ = this.value
        window.userData.widths[seriesNumber - (i+1)] = width_;
        
        //update width on the graph
        window.u.series[seriesNumber - i].width = width_;
    } 
    //redraw with changes
    window.u.redraw();
})

let timeSeriesPoints = false;
//the points/lines radio
seriesTimePoints.addEventListener("click", function() { 
    timeSeriesPoints = true;
    buildMainPlot();
})
seriesTimeLines.addEventListener("click", function() {
    timeSeriesPoints = false;
    buildMainPlot();
})
//#endregion

function graphTabStartup() {
    //Reset the buttons on the right
    xSelectSolve.checked = true; xAxisDataType = "Solve #";
    xSelectLinear.checked = true; setXAxisLog(false);
    ySelectLinear.checked = true; setYAxisLog(false);
    //Make sure its empty
    graphdiv.replaceChildren();

    buildMainPlot()
    
    //-----create the series toggle buttons-----
    createAllSeriesRows();
}

// converts the legend into a simple tooltip
function legendAsTooltipPlugin({ className, style = { backgroundColor: themes[window.currentTheme]["--color-secondary-variant"], color: "black" } } = {}) {
    let legendEl;

    function init(u, opts) {
        legendEl = u.root.querySelector(".u-legend");

        legendEl.classList.remove("u-inline");
        className && legendEl.classList.add(className);

        uPlot.assign(legendEl.style, {
            textAlign: "left",
            pointerEvents: "none",
            display: "none",
            position: "absolute",
            left: "10px",
            top: "10px",
            opacity: 0.9,
            zIndex: 100,
            boxShadow: "2px 2px 10px rgba(0,0,0,0.5)",
            ...style
        });

        // hide series color markers
        const idents = legendEl.querySelectorAll(".u-marker");

        for (let i = 0; i < idents.length; i++)
            idents[i].style.display = "none";

        const overEl = u.over;
        overEl.style.overflow = "visible";

        // move legend into plot bounds
        overEl.appendChild(legendEl);

        // show/hide tooltip on enter/exit
        overEl.addEventListener("mouseenter", () => {legendEl.style.display = null;});
        overEl.addEventListener("mouseleave", () => {legendEl.style.display = "none";});

        // let tooltip exit plot
    //	overEl.style.overflow = "visible";
    }

    function update(u) {
        const { left, top } = u.cursor;
        legendEl.style.transform = "translate(" + left + "px, " + top + "px)";
    }

    return {
        hooks: {
            init: init,
            setCursor: update,
        }
    };
}

powerLawSettings.addEventListener("click", (e) => {
        openRegressionSettings(e, "Power-Law", "powerLaw")
})
logLogSettings.addEventListener("click", (e) => {
    openRegressionSettings(e, "Log-Log","logLog")
})
logSettings.addEventListener("click", (e) => {
    openRegressionSettings(e, "Logarithmic","logarithmic")
})

function openRegressionSettings(e, name, id) {
    //make the settings box visible and move it to the cursor
    regressionSettingsBox.style.display = regressionSettingsBox.style.display === 'block' ? 'none' : 'block';
    regressionSettingsBox.style.top = e.pageY + "px"
    regressionSettingsBox.style.left = e.pageX - 250 + "px"
    regressionSettingsHeader.innerText = "Regression Settings (" + name + ")"

    //use the name attribute to know which series is being edited
    regressionSettingsBox.name = id

    //set the value of the color selector to the color of the regression
    regressionColorSelector.value = regressions.find(r => r.id === id).color;

    //set the value of the width selector the the width of the series
    regressionWidthSelector.value = regressions.find(r => r.id === id).width;

    //if dealing with the power law series, show iterations
    if(id == "powerLaw") { iterationsDiv.style.display = "flex" } 
    else { iterationsDiv.style.display = "none" }
}

regressionColorSelector.addEventListener("change", function () {
    const id = regressionSettingsBox.name
    
    //update saved color
    regressions.find(r => r.id === id).color = this.value;

    //rebuild the graph
    buildMainPlot();
})

//the width selector
regressionWidthSelector.addEventListener("change", function () {
    const id = regressionSettingsBox.name
    
    //update saved color
    regressions.find(r => r.id === id).width = this.value;
    //redraw with changes
    buildMainPlot();
})
regressionProjection.onchange = () => {
    buildMainPlot();
}
regressionOffset.onchange = () => {
    rebuildRegressions();
    buildMainPlot();
}