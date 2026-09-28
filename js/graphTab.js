import { createButton } from "./utils.js";
import {updatePBTable } from "./pbTab.js"
export {graphTabStartup};
import { rowsToUPlotCols, xAxisIsLog, setXAxisLog, yAxisIsLog, setYAxisLog, legendAsTooltipPlugin, themedAxis, seriesColor } from "./utils.js";
import { regressions, powerLawFit, logLogRegression, logarithmicRegression } from "./graphTabRegressions.js";
import { scanMax } from "./probabilities.js";
import {solve} from  "../lib/gauss-jordan.js";
import { themes } from "./themes.js";

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
    //colors by position in the table
    const newColors = window.userData.labels.slice(1).map((_, i) => seriesColor(i >> 1));
    const newWidths = [2,         2,          2,           2,          2,          2,          2,          2,          2,           2]
    const newVisibilities = [true,true,       true,        false,      true,       false,      true,       false,      true,        false];
    for(let i = 0; i < window.userData.labels.length - 11; i++) {
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
    const newWidths = []
    const newVisibilities = [];
    for(let i = 1; i < window.userData.labels.length; i+=2) {
        newWidths.push(2, 2)
        newVisibilities.push(true, false)
    }
    window.userData.colors = grayscaleColors(isDarkTheme());
    window.userData.widths = newWidths;
    window.userData.visibilities = newVisibilities;
    createAllSeriesRows();
    buildMainPlot();
}

const isDarkTheme = () => themes[window.currentTheme]['color-scheme'] == 'dark';

//one gray per row (series and its PB), in even steps of perceived lightness (CIELAB L*)
//from black to light gray, or from white to dark gray on dark themes, so the ends stay visible on the background
function grayscaleColors(dark) {
    const rows = (window.userData.labels.length - 1) / 2;
    const colors = [];
    for(let k = 0; k < rows; k++) {
        const t = rows > 1 ? k / (rows - 1) : 0;
        const L = dark ? 100 - 80 * t : 80 * t;
        //L* -> relative luminance -> sRGB
        const Y = L > 8 ? ((L + 16) / 116) ** 3 : L / 903.3;
        const v = Y <= 0.0031308 ? 12.92 * Y : 1.055 * Y ** (1 / 2.4) - 0.055;
        const gray = Math.round(255 * v);
        colors.push(rgbToHex(gray, gray, gray), rgbToHex(gray, gray, gray))
    }
    return colors;
}

//flip the grayscale preset's colors when the theme switches between light and dark
function flipGrayscale() {
    if (!window.userData) return;
    const dark = isDarkTheme();
    if (window.userData.colors.join() != grayscaleColors(!dark).join()) return;
    window.userData.colors = grayscaleColors(dark);
    createAllSeriesRows();
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}

allSeriesWidthSelector.addEventListener("change", (e) => {
    const val = parseInt(e.target.value);
    for(let i = 0; i < window.userData.widths.length; i++) {
        window.userData.widths[i] = val;
    }
    buildMainPlot();
})

let regXMap = x => x;

function makeRegXMap(sess, offset = parseFloat(regressionOffset.value) || 0) {
    if (xAxisDataType === "Date") {
        let minT = Infinity, maxT = -Infinity;
        for (const s of window.userData.solves[sess]) {
            const t = s[0].getTime();
            if (t < minT) minT = t;
            if (t > maxT) maxT = t;
        }
        const startMs = minT - (maxT - minT) * offset;
        return d => (d.getTime() - startMs) / 1000 + 1000;
    }
    if (xAxisDataType === "Solve #") {
        const shift = Math.floor(offset * window.userData.solves[sess].length);
        return x => x + shift;
    }
    const s3 = window.userData.solves3[sess];
    const shift = offset * s3[s3.length - 1][0];
    return x => x + shift;
}

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

        // Add two hidden series to uPlot, and a band fill between them
        const upperIdx = seriesMeta.length;
        for (const side of ["upper", "lower"]) {
            seriesMeta.push({ label: `${band.type.toUpperCase()} ${targetLabel} (${side})`, stroke: "transparent", width: 0, show: true });
        }
        bandsOpt.push({ series: [upperIdx, upperIdx + 1], fill: hexToRgba(seriesColor, 0.15) });
    }

    return { seriesMeta, bandsOpt };
}

// IQR / STD band toggles (per-series)
const bandCheckboxes = [[seriesToggleIqr, "iqr"], [seriesToggleSTD, "std"]];
for (const [checkbox, type] of bandCheckboxes) {
    checkbox.addEventListener("change", function () {
        const seriesNumber = parseInt(seriesSettingsBox.name, 10);
        const size = parseAvgSizeFromLabel(window.userData.labels[seriesNumber - 1]);
        const band = size && findBand(type, size);
        if (!band) { this.checked = false; return; }

        band.enabled = this.checked;
        buildMainPlot();
    });
}

window.addEventListener("themechange", () => { flipGrayscale(); buildMainPlot(); });
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
    let displayed = rows.map(r => r.slice());
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
        //Prepend one offset point (x value + null row), each call going before the previous one
        //they are collected and prepended all at once below, since unshifting one at a time is quadratic
        const frontXs = [], frontRows = [];
        const unshiftPoint = (xVal) => {
            frontXs.push(xVal)
            const row = new Array(nSeries).fill(null)
            row[0] = xVal
            frontRows.push(row)
            addedFront++;
        }

        if (xAxisDataType === "Solve #") {
            //offset (backwards)
            const offsetAmount = Math.max(0,Math.floor(offsetMultiplier*nOriginal))

            for (let k = 1; k <= offsetAmount; k++) unshiftPoint(1 - k);

            //forecast (forward)
            const fCount = Math.max(0, Math.floor((forecastMultiplier - 1) * nOriginal))
            for (let i = 0; i < fCount; i++) pushPoint(nOriginal + 1 + i);
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

        xs = frontXs.reverse().concat(xs)
        displayed = frontRows.reverse().concat(displayed)
    }

    // for each active regression, compute and append its values
    regressions.forEach(reg => {
        if (!activeRegs[reg.id]) return;
        const xForCompute = xs.map(v => { const r = regXMap(v); return r > 0 ? r : NaN; });
        const preds = reg.compute(xForCompute);
        preds.forEach((yhat, i) => displayed[i].push(Number.isFinite(yhat) && yhat < 2 * slowestSolve ? yhat : null));
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
        axes: [xAxisDataType, "Time (s)"].map(themedAxis),
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
    //offer the first default color not in use for the next created series
    const used = new Set(window.userData.colors.map(c => c.toLowerCase()));
    let k = 0;
    while (used.has(seriesColor(k).toLowerCase())) k++;
    newAvgColor.value = seriesColor(k);
}

//a button that shows/hides series number s (1-based, 0 is the x-axis), with a shadow in the series' color
function createSeriesToggle(label, s) {
    const btn = createButton(label, (e) => {
        const currentVisibility = window.userData.visibilities[s - 1];
        window.userData.visibilities[s - 1] = !currentVisibility;
        window.u.setSeries(s, { show: !currentVisibility });
        e.target.closest('button').classList.toggle('pressed');
    }, "seriesToggle")
    btn.style = "box-shadow: 2px 2px 3px 3px" + window.userData.colors[s - 1]
    if (!window.userData.visibilities[s - 1]) btn.classList.toggle('pressed')
    return btn
}

function createSeriesRow(i) {
    //toggle buttons for the aoX/moX/Single series and its PB series
    const newButton1 = createSeriesToggle(window.userData.labels[i], i)
    const newButton2 = createSeriesToggle("PB", i + 1)

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

        // --- Band checkbox states for this row's main series (e.g. "ao5") ---
        const size = parseAvgSizeFromLabel(window.userData.labels[i]);
        for (const [checkbox, type] of bandCheckboxes) {
            const band = size && findBand(type, size);
            checkbox.disabled = !band;
            checkbox.checked = !!band?.enabled;
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

    const newRow = document.createElement("tr")
    for (const btn of [newButton1, newButton2, seriesSettings]) {
        const cell = document.createElement("td")
        cell.appendChild(btn)
        newRow.appendChild(cell)
    }
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

//replace every series except Time with aoX/moX series whose X follows a pattern (rounded up)
patternGenerateBtn.addEventListener("click", () => {
    const U = window.userData;
    if (!U) return alert("Please upload a file first")
    const type = patternSelectAo.checked ? "ao" : "mo";
    const a = parseFloat(patternA.value);
    const max = parseInt(patternMax.value);
    const f = { linear: n => a * n, polynomial: n => n ** a, exponential: n => a ** n }[patternType.value];
    if (!(max >= 1) || !(patternType.value == "exponential" ? a > 1 : a > 0)) return alert("Please enter a valid number.");

    //X of each series, stopping at max series or once X is longer than every session
    const longest = Math.max(...U.solves.map(s => s.length));
    const sizes = [];
    for (let n = 1; sizes.length < max && n <= 1e6; n++) {
        const x = Math.ceil(f(n) - 1e-9); //so float error doesn't round e.g. 3.0000000004 up
        if (x > longest) break;
        if (x >= (type == "ao" ? 3 : 2) && !sizes.includes(x)) sizes.push(x);
    }
    if (!sizes.length) return alert("The pattern gives no series that fit the data.");

    //keep Date, Time and PB Single
    U.labels = U.labels.slice(0, 3);
    U.colors = U.colors.slice(0, 2);
    U.widths = U.widths.slice(0, 2);
    U.visibilities = U.visibilities.slice(0, 2);
    U.bands = [];
    U.pbInfo = U.pbInfo.map(p => p.slice(0, 1));
    for (const sess of U.solves) for (const row of sess) row.length = 3;

    sizes.forEach((x, k) => {
        U.labels.push(type + x, "PB " + type + x);
        U.colors.push(seriesColor(k + 1), seriesColor(k + 1));
        U.widths.push(2, 2);
        U.visibilities.push(true, false);
        if (type == "ao") U.pushAvg(x); else U.pushMean(x);
        U.createIQR(x);
        U.createSTD(x);
        U.pbsOfLastCol(x);
    });
    U.createSolves2();
    U.createSolves3();
    if (!U.labels.includes(U.currentPbSeries)) U.currentPbSeries = "PB Single";

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
    window.selectedSess = document.getElementById("title-dropdown").value;
    buildMainPlot();
};

//#region Handle the buttons on the right of the graph screen
//Handle swapping between Date and Solve # on the x-axis

//refit every active regression, e.g. after the x-axis or offset changes
function rebuildRegressions() {
    for (const [id, { toggle }] of Object.entries(regressionControls)) {
        if (activeRegs[id]) { activeRegs[id] = false; toggle.click(); }
    }
}

xSelectDate.onclick   = () => { if (!(xAxisDataType == "Date"))    { xAxisDataType = "Date";    rebuildRegressions(); buildMainPlot(); } };
xSelectSolve.onclick  = () => { if (!(xAxisDataType == "Solve #")) { xAxisDataType = "Solve #"; rebuildRegressions(); buildMainPlot(); } };
xSelectHours.onclick  = () => { if (!(xAxisDataType == "Hours"))   { xAxisDataType = "Hours";   rebuildRegressions(); buildMainPlot(); } }; 
xSelectLinear.onclick = () => { if ( xAxisIsLog)  { setXAxisLog(false);  buildMainPlot(); } };
xSelectLog.onclick    = () => { if (!xAxisIsLog)  { setXAxisLog(true);   buildMainPlot(); } };
ySelectLinear.onclick = () => { if ( yAxisIsLog)  { setYAxisLog(false);  buildMainPlot(); } };
ySelectLog.onclick    = () => { if (!yAxisIsLog)  { setYAxisLog(true);   buildMainPlot(); } };

const activeRegs = {powerLaw: false, logLog: false, logarithmic: false};

//the buttons, fit and R^2 display of each regression
const regressionControls = {
    powerLaw:    { name: "Power-Law",   toggle: powerLawToggle,    settings: powerLawSettings, fit: powerLawFit,           r2: powerLawR2 },
    logLog:      { name: "Log-Log",     toggle: logLogToggle,      settings: logLogSettings,   fit: logLogRegression,      r2: loglogR2 },
    logarithmic: { name: "Logarithmic", toggle: logarithmicToggle, settings: logSettings,      fit: logarithmicRegression, r2: logarithmicR2 },
};

//offset defaults to the value in the offset input
function getRegressionXYForSession(sess, offset) {
    const solves = window.userData.solves[sess];

    let xRaw;
    if (xAxisDataType === "Date")         xRaw = solves.map(s => s[0]);
    else if (xAxisDataType === "Solve #") xRaw = window.userData.solves2[sess].map(s => s[0]);
    else                                  xRaw = window.userData.solves3[sess].map(s => s[0]);

    regXMap = makeRegXMap(sess, offset);

    const x = [];
    const y = [];
    for (let i = 0; i < solves.length; i++) {
        const raw = xRaw[i];
        const yi = solves[i][1];

        if (raw instanceof Date && !Number.isFinite(raw.getTime())) continue; // bad date
        if (!(yi > 0) || !Number.isFinite(yi)) continue;                      // DNF / junk

        const xi = regXMap(raw);   // always a number now, for every axis type
        if (!Number.isFinite(xi) || xi <= 0) continue;

        x.push(xi);
        y.push(yi);
    }
    return { x, y };
}

//each regression's toggle button fits it (showing its R^2) when turned on
for (const [id, { toggle, fit, r2 }] of Object.entries(regressionControls)) {
    toggle.onclick = () => {
        if (!window.userData) return alert("Please upload a file first");
        activeRegs[id] = !activeRegs[id];
        toggle.classList.toggle("pressed", activeRegs[id]);
        if (activeRegs[id]) {
            const { x, y } = getRegressionXYForSession(window.selectedSess);
            r2.innerText = fit(y, x).r2.toFixed(3);
        }
        buildMainPlot();
    };
}

//find the offset in [0, 2] that gives a regression the highest R^2, then apply it and show that regression
function findBestOffset(id) {
    if (!window.userData) return alert("Please upload a file first");
    const { fit, toggle } = regressionControls[id];
    const sess = window.selectedSess;

    //search on an evenly spaced sample of at most 5000 solves so large sessions stay quick;
    //the best offset barely changes (R^2 within ~0.0002 of searching all the solves)
    const r2At = (offset) => {
        const { x, y } = getRegressionXYForSession(sess, offset);
        const step = Math.max(1, Math.ceil(x.length / 5000));
        const xs = [], ys = [];
        for (let i = 0; i < x.length; i += step) { xs.push(x[i]); ys.push(y[i]); }
        try { return fit(ys, xs).r2; } catch { return -Infinity; }
    };

    //R^2 rises to a single peak that can sit anywhere from about 0.001 to 2,
    //so search the offset on a log scale, and also try no offset at all
    let best = Math.exp(scanMax(t => r2At(Math.exp(t)), Math.log(1e-4), Math.log(2), 24, 20));
    if (r2At(0) >= r2At(best)) best = 0;

    //apply it: every active regression is refit with the new offset, and this one is turned on
    regressionOffset.value = best.toFixed(3);
    rebuildRegressions();
    if (!activeRegs[id]) toggle.click();
    else buildMainPlot();
}

regressionBestOffset.addEventListener("click", () => findBestOffset(regressionSettingsBox.name));

//turn every regression off
export function resetRegressions() {
    for (const [id, { toggle, r2 }] of Object.entries(regressionControls)) {
        activeRegs[id] = false;
        toggle.classList.remove("pressed");
        r2.innerText = "N/A";
    }
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
    //regressions were fit to the previous file (and possibly another x-axis), so turn them off
    resetRegressions();
    //Make sure its empty
    graphdiv.replaceChildren();

    buildMainPlot()
    
    //-----create the series toggle buttons-----
    createAllSeriesRows();
}

for (const [id, { name, settings }] of Object.entries(regressionControls)) {
    settings.addEventListener("click", (e) => openRegressionSettings(e, name, id))
}

function openRegressionSettings(e, name, id) {
    //make the settings box visible and move it to the cursor
    regressionSettingsBox.style.display = regressionSettingsBox.style.display === 'block' ? 'none' : 'block';
    regressionSettingsBox.style.top = e.pageY + "px"
    regressionSettingsBox.style.left = e.pageX - 250 + "px"
    regressionSettingsHeader.innerText = "Regression Settings (" + name + ")"

    //use the name attribute to know which series is being edited
    regressionSettingsBox.name = id

    //show the regression's color and width
    const reg = regressions.find(r => r.id === id);
    regressionColorSelector.value = reg.color;
    regressionWidthSelector.value = reg.width;
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
