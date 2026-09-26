import { createButton } from "./utils.js";
import {updatePBTable } from "./pbTab.js"
import {themes} from "./themes.js"
export {graphTabStartup};
import { rowsToUPlotCols, xAxisIsLog, setXAxisLog, yAxisIsLog, setYAxisLog } from "./utils.js";
import { regressions, powerLawFit, logLogRegression, logarithmicRegression } from "./graphTabRegressions.js";
import {solve} from  "../lib/gauss-jordan.js";

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


function hexToRgba(hex, a = 0.15) {
    // accepts "#RRGGBB"
    if (!hex || hex[0] !== "#" || hex.length !== 7) return `rgba(0,0,0,${a})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
}

function parseAvgSizeFromLabel(lbl) {
    // supports ao5/mo12/etc
    if (!lbl || lbl.length < 3) return null;
    const prefix = lbl.slice(0, 2);
    if (prefix !== "ao" && prefix !== "mo") return null;
    const n = parseInt(lbl.slice(2), 10);
    return Number.isFinite(n) ? n : null;
}

function findBand(type, size) {
    const bands = window.userData?.bands || [];
    return bands.find(b => b && b.type === type && b.name === size) || null;
}

function applyBandsToPlot({ displayed, baseSeriesMeta, regSeriesMeta, addedFront = 0, addedBack = 0 }) {
    const sess = window.selectedSess;

    let seriesMeta = [...baseSeriesMeta, ...regSeriesMeta];
    const bandsOpt = [];

    const allBands = window.userData?.bands || [];
    if (!allBands.length) return { seriesMeta, bandsOpt };

    for (const band of allBands) {
        if (!band || !band.enabled) continue;
        if (!band.upper || !band.lower) continue;

        const upperRaw = band.upper[sess];
        const lowerRaw = band.lower[sess];
        if (!upperRaw || !lowerRaw) continue;

        // Map band.name=5 => "ao5" series (fallback to "mo5" if needed)
        let targetLabel = `ao${band.name}`;
        let targetIdx = window.userData.labels.indexOf(targetLabel);
        if (targetIdx < 0) {
            targetLabel = `mo${band.name}`;
            targetIdx = window.userData.labels.indexOf(targetLabel);
        }
        if (targetIdx < 0) continue;              // no matching series
        if (targetIdx === 0) continue;            // never band-fill x-series

        const seriesColor = window.userData.colors[targetIdx - 1];

        // Pad for regression forecast points (you add rows at front/back)
        const padFront = addedFront > 0 ? Array(addedFront).fill(null) : [];
        const padBack  = addedBack  > 0 ? Array(addedBack).fill(null) : [];

        const upper = padFront.concat(upperRaw, padBack);
        const lower = padFront.concat(lowerRaw, padBack);

        if (upper.length !== displayed.length || lower.length !== displayed.length) {
            continue;
        }

        // Append the two band columns to displayed rows
        for (let i = 0; i < displayed.length; i++) {
            displayed[i].push(upper[i]);
            displayed[i].push(lower[i]);
        }

        // Add two hidden series to uPlot
        const upperIdx = seriesMeta.length;
        seriesMeta.push({
            label: `${band.type.toUpperCase()} ${targetLabel} (upper)`,
            stroke: "transparent",
            width: 0,
            show: true,
        });

        const lowerIdx = seriesMeta.length;
        seriesMeta.push({
            label: `${band.type.toUpperCase()} ${targetLabel} (lower)`,
            stroke: "transparent",
            width: 0,
            show: true,
        });

        // Add uPlot band fill between hidden upper/lower series
        bandsOpt.push({
            series: [upperIdx, lowerIdx],
            fill: hexToRgba(seriesColor, 0.15),
        });
    }

    return { seriesMeta, bandsOpt };
}

// IQR / STD band toggles (per-series)
seriesToggleIqr.addEventListener("change", function () {
    const seriesNumber = parseInt(seriesSettingsBox.name, 10);
    const lbl = window.userData.labels[seriesNumber - 1]; 
    const size = parseAvgSizeFromLabel(lbl);
    if (!size) { this.checked = false; return; }

    const band = findBand("iqr", size);
    if (!band) { this.checked = false; return; }

    band.enabled = this.checked;
    buildMainPlot();
});

seriesToggleSTD.addEventListener("change", function () {
    const seriesNumber = parseInt(seriesSettingsBox.name, 10);
    const lbl = window.userData.labels[seriesNumber - 1];
    const size = parseAvgSizeFromLabel(lbl);
    if (!size) { this.checked = false; return; }

    const band = findBand("std", size);
    if (!band) { this.checked = false; return; }

    band.enabled = this.checked;
    buildMainPlot();
});


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

    // clone into displayedRows so we can append extra columns
    const displayed = rows.map(r => r.slice());
    let slowestSolve = 0
    for(let i = 0; i < displayed.length; i++) {
        if(displayed[i][1] > slowestSolve) slowestSolve = displayed[i][1]
    }

    // extract x/y for fitting
    let xs = window.userData.solves[sess].map(r => r[0])
    if(xAxisDataType == "Solve #") xs = window.userData.solves2[sess].map(r => r[0])
    if(xAxisDataType == "Hours") xs = window.userData.solves3[sess].map(r => r[0])

    let addedFront = 0;
    let addedBack = 0;
    
    // if any regressions are active, do forecasting
    if (activeRegs.powerLaw || activeRegs.logLog || activeRegs.logarithmic) {
        const nOriginal = xs.length;
        const nSeries = displayed[0].length;

        const forecastMultiplier = regressionProjection.value
        const offsetMultiplier = regressionOffset.value

        //Append one forecast point( x value + null row)
        const pushPoint = (xVal) => {
            xs.push(xVal)
            displayed.push(new Array(nSeries).fill(null))
            displayed[displayed.length - 1][0] = xVal; //x is always col 0
            addedBack++;
        }
        //Prepend one offset point (x value + null row)
        const unshiftPoint = (xVal) => {
            xs.unshift(xVal)
            displayed.unshift(new Array(nSeries).fill(null))
            displayed[0][0] = xVal
            addedFront++;
        }

        if (xAxisDataType === "Solve #") {
            //offset (backwards)
            const offsetAmount = Math.max(0,Math.floor(offsetMultiplier*nOriginal))
            for(let k = 1; k <= offsetAmount; k++) {unshiftPoint(-k);}

            //forecast (forward)
            const fCount = Math.max(0, Math.floor((forecastMultiplier - 1) * nOriginal))
            for(let i = 0; i < fCount; i++) {pushPoint(nOriginal+i)}

        } else if (xAxisDataType === "Hours") {
            const lastX = xs[xs.length - 1]
            const firstX = xs[0]
            const steps = 1000
            const offsetEnd = -offsetMultiplier * lastX

            //prepend points from firstX back to offsetEnd
            if(offsetEnd < firstX) {
                const dx = (firstX-offsetEnd) / steps
                for(let i = 1; i <= steps; i++) {
                    unshiftPoint(firstX-dx*i)
                }
            }

            //forecast
            const xStart = lastX;
            const xEnd = forecastMultiplier * lastX
            if(xEnd > xStart) {
                const dxF = (xEnd - xStart) / steps
                for(let i = 1; i <= steps; i++) pushPoint(xStart + dxF * i)
            }
            
        } else if (xAxisDataType === "Date") {
            let minT = xs[0].getTime()
            let maxT = xs[xs.length - 1].getTime()
            const spanMs = maxT - minT;
            const steps = 1000;

            // offset
            const startMs = minT - spanMs * offsetMultiplier;
            if (startMs < minT) {
                const dtBack = (minT - startMs) / steps;
                for (let i = 1; i <= steps; i++) {
                    unshiftPoint(new Date(minT - dtBack * i));
                }
            }

            // forecast
            const endMs = minT + spanMs * forecastMultiplier;
            const dtFwd = (endMs - maxT) / steps;
            if (dtFwd > 0) {
                for (let i = 1; i <= steps; i++) { pushPoint(new Date(maxT + dtFwd * i));}
            } 
             
        } 

    }

    // for each active regression, compute and append its values
    regressions.forEach(reg => {
        if (!activeRegs[reg.id]) return;

        let xForCompute = xs;

        if (xAxisDataType === "Date") {
            // Convert all dates to seconds since earliest x
            let tMin = xs[0].getTime();

            xForCompute = xs.map(d => {
                const t = d.getTime();
                return (t - tMin) / 1000 + 1000; // seconds since earliest x
            });
        } else {
            xForCompute = xs.map(v => (Number.isFinite(v) ? v : Nan))
        }

        //shift so that the smallest xForCompute is 0.001
        let minX = xForCompute[0]
        const shift = 0.001 - minX
        
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

    // Apply bands (adds extra columns + hidden series + bands option)
    const { seriesMeta, bandsOpt } = applyBandsToPlot({
        displayed,
        baseSeriesMeta: baseSeries,
        regSeriesMeta: regSeries,
        addedFront,
        addedBack
    });

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
        series: seriesMeta,
        bands: bandsOpt,
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
                        size: (window.userData.widths[i - 1]+2),
                        fill: window.userData.colors[i - 1]
                } : null,           
            dash: lbl[0] === 'P' ? [4, 4] : [],   
        }))
}

// VERY simple residual overlay tool
// Usage: window.residualsGraph()
window.residualsGraph = function (T) {
    if (!window.u) return console.warn("No plot.");

    // find active regression
    const active = regressions.filter(r => activeRegs[r.id]);
    if (active.length !== 1) {
        console.warn("Must have exactly one regression active.");
        return;
    }

    const reg = active[0];

    const data = window.u.data;   // uPlot columns format
    const xCol = data[0];
    console.log(data)

    // regression is always the LAST visible series added in buildMainPlot
    const regColIdx = data.length - 1;
    const regCol = data[regColIdx];

    const x = [];
    const resid = [];


    // subtract regression from all visible non-regression series
    for (let s = 1; s < regColIdx; s++) {
        if (!window.u.series[s].show) continue;

        const col = data[s];
        for (let i = 0; i < col.length; i++) {
            if (col[i] != null && regCol[i] != null) {
                //col[i] = col[i] - regCol[i];
                if(s == 1) {
                    x.push(data[0][i])
                    //resid.push(col[i])
                    resid.push(col[i] - regCol[i])
                }
            } else {
                col[i] = null;
            }
            
        }
        
    }
    console.log(x)
    console.log(resid)
    const ft = fitFourierResidual(x,resid,T,x[x.length-1])

    // zero out regression line itself
    for (let i = 0; i < regCol.length; i++) {
        //regCol[i] = 0;
        if(regCol[i] != null) regCol[i] += ft(data[0][i])
    }

    window.u.setData(data);
};

function fitFourierResidual(x, residual, N, T) {
    const m = x.length;
    const cols = 2 * N;

    // Build X matrix
    const X = Array.from({ length: m }, () => new Array(cols).fill(0));

    for (let i = 0; i < m; i++) {
        for (let n = 1; n <= N; n++) {
            const w = 2 * Math.PI * n / T;
            X[i][2*(n-1)]     = Math.cos(w * x[i]);
            X[i][2*(n-1) + 1] = Math.sin(w * x[i]);
        }
    }

    // Compute X^T X and X^T y
    const XtX = Array.from({ length: cols }, () => new Array(cols).fill(0));
    const Xty = new Array(cols).fill(0);

    for (let i = 0; i < m; i++) {
        for (let j = 0; j < cols; j++) {
            Xty[j] += X[i][j] * residual[i];
            for (let k = 0; k < cols; k++) {
                XtX[j][k] += X[i][j] * X[i][k];
            }
        }
    }

    // Solve small linear system
    const beta = solve(XtX, Xty); // use your small matrix solver
    console.log("beta")
    console.log(beta)

    return function(xVal) {
        let sum = 0;
        for (let n = 1; n <= N; n++) {
            const w = 2 * Math.PI * n / T;
            const a = beta[2*(n-1)];
            const b = beta[2*(n-1)+1];
            sum += a * Math.cos(w * xVal) + b * Math.sin(w * xVal);
        }
        return sum;
    };
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

        // --- Band checkbox states for this series ---
        seriesToggleIqr.disabled = true;
        seriesToggleSTD.disabled = true;
        seriesToggleIqr.checked = false;
        seriesToggleSTD.checked = false;

        const lbl = window.userData.labels[i]; // this row's main series (e.g. "ao5")
        const size = parseAvgSizeFromLabel(lbl);

        if (size) {
            const iqrBand = findBand("iqr", size);
            if (iqrBand) {
                seriesToggleIqr.disabled = false;
                seriesToggleIqr.checked = !!iqrBand.enabled;
            }

            const stdBand = findBand("std", size);
            if (stdBand) {
                seriesToggleSTD.disabled = false;
                seriesToggleSTD.checked = !!stdBand.enabled;
            }
        }
        
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
    window.userData.createIQR(parseInt(size))
    window.userData.createSTD(parseInt(size))

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

    const solves = window.userData.solves[sess];
    const solves2 = window.userData.solves2[sess];
    const solves3 = window.userData.solves3[sess];


    let xRaw;
    if (xAxisDataType === "Date") {
        xRaw = solves.map(s => s[0]);
    } else if (xAxisDataType === "Solve #") {
        xRaw = solves2.map(s => s[0]);
    } else if (xAxisDataType === "Hours") {
        xRaw = solves3.map(s => s[0]);
    } 

    // Build paired arrays, then filter pairs together
    const x = [];
    const y = [];

    const offsetMultiplier = regressionOffset.value

    if (xAxisDataType === "Date") {
        let minT = xRaw[0].getTime();
        let maxT = xRaw[xRaw.length-1].getTime()
        const spanMs = maxT - minT;
        const startMs = minT - spanMs * offsetMultiplier;

        // Build x/y, converting to seconds since startMs
        for (let i = 0; i < solves.length; i++) {
            const d  = xRaw[i];
            const yi = solves[i][1];
            const ms = d.getTime();
            if (!(yi > 0) || !Number.isFinite(yi)) continue;

            x.push((ms - startMs) / 1000 + 1000);
            y.push(yi);
        }

    } else {
        for (let i = 0; i < solves.length; i++) {
            const xi = xRaw[i];
            const yi = solves[i][1];
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
            const shift0 = offsetMultiplier * lastX;
            for (let i = 0; i < x.length; i++) x[i] = x[i] + shift0;
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
        const width_ = parseInt(this.value)
        window.userData.widths[seriesNumber - (i+1)] = width_;
        
        //update width on the graph
        window.u.series[seriesNumber - i].width = width_;
    } 
    //redraw with changes
    buildMainPlot();
})

//the points/lines radio
let timeSeriesPoints = false;
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

powerLawSettings.addEventListener("click", (e) => { openRegressionSettings(e, "Power-Law", "powerLaw")})
logLogSettings.addEventListener("click", (e) => {   openRegressionSettings(e, "Log-Log","logLog")})
logSettings.addEventListener("click", (e) => {      openRegressionSettings(e, "Logarithmic","logarithmic")})

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

regressionProjection.onchange = () => {buildMainPlot();}
regressionOffset.onchange = () => {rebuildRegressions();buildMainPlot(); }

























































