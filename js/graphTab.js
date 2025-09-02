import { createButton } from "./utils.js";
import {updatePBTable } from "./pbTab.js"
import {themes} from "./themes.js"
export {graphTabStartup};
import { rowsToUPlotCols, xAxisIsDate, setXAxisMode, xAxisIsLog, setXAxisLog, yAxisIsLog, setYAxisLog } from "./utils.js";
import { regressions, powerLawFit, logLogRegression, exponentialRegression } from "./graphTabRegressions.js";

function getSize() {
    const div = document.getElementById("graphdiv");
    return {
        width: div.offsetWidth - 10,
        height: div.offsetHeight - 10,
    }
}

window.addEventListener("resize", e => {
    u.setSize(getSize());
});

document.getElementById("presetCstimer").onclick = () => {
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
document.getElementById("presetDefault").onclick = () => {
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
document.getElementById("presetGrayscale").onclick = () => {
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

document.getElementById("allSeriesWidthSelector").addEventListener("change", (e) => {
    const val = parseInt(e.target.value);
    for(let i = 0; i < window.userData.widths.length; i++) {
        window.userData.widths[i] = val;
    }
    buildMainPlot();
})


function buildMainPlot() {
    if (!window.userData) return; // No data loaded yet
    const sess = document.getElementById("title-dropdown").value;
    const rows = xAxisIsDate
        ? window.userData.solves[sess]     // [ date, y1, y2 … ]
        : window.userData.solves2[sess];   // [ index, y1, y2 … ]

    

    // 2. deep-clone into displayedRows so we can append extra columns
    const displayed = rows.map(r => r.slice());

    // 3. extract primary x/y for fitting
    const xs = window.userData.solves2[sess].map(r => r[0]);

    //const offset = document.getElementById("powerLawOffset")?.value
    //if any regressions are active, do forecasting
    if( activeRegs.powerLaw || activeRegs.logLog || activeRegs.exponential) {
        const n = xs.length;
        const nSeries = displayed[0].length;
        //case 1: x axis solves
        if(!xAxisIsDate) {
            for(let i = 0; i < 0.5*n; i++) {
                xs.push(n+i)
                displayed.push(new Array(nSeries).fill(null)); // fill with nulls
                displayed[n+i][0] = n+i; // set x value
            }
        } else { //case 2: x axis date
            console.warn("Forecasting not supported for date x-axis yet");
        }
    }

    // 4. for each active regression, compute and append its values
    regressions.forEach(reg => {
        if (!activeRegs[reg.id]) return;
        const preds = reg.compute(xs);
        // add one new column per row
        preds.forEach((yhat, i) => displayed[i].push(yhat));
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

    // 6. convert to uPlot columns and re-create the plot
    const dataCols = rowsToUPlotCols(displayed, xAxisIsDate);


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
                time: xAxisIsDate,
                distr: xAxisIsLog ? 3 : null,
                log: xAxisIsLog ? 10 : null} ,
            y: {
                distr: yAxisIsLog ? 3 : null,
                log: yAxisIsLog ? 10 : null
            }
        },
        axes  : [
            { label: xAxisIsDate ? "Date" : "Solve #",
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
    }, dataCols, document.getElementById("graphdiv"));

}

function buildSeriesMeta() {
    return window.userData.labels.map((lbl, i) => ({
            label: lbl === 'Date' 
                ? (xAxisIsDate ? "Date" : "Solve #")
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
        const settings = document.getElementById("seriesSettingsBox")
        //make the settings box visible and move it to the cursor
        settings.style.display = settings.style.display === 'block' ? 'none' : 'block';
        settings.style.top = e.pageY + "px"
        settings.style.left = e.pageX + 10 + "px"
        document.getElementById("seriesSettingsHeader").innerText = "Series Settings (" + window.userData.labels[i] + ")"

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
document.getElementById("addSeriesBtn").addEventListener("click", () => {
    const type = document.getElementById("newAvgType").value; // 'ao' or 'mo'
    const size = parseInt(document.getElementById("newAvgSize").value); //X
    const width = parseInt(document.getElementById('newAvgWidth').value)

    if (isNaN(size) || size < 1) return alert("Please enter a valid number.");
    if (size == 1 || (type == "ao" && size == 2)) return alert("Bro")
    if (!window.userData) return alert("Please upload a file first")
  
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
  
    //just remake the whole table cuz its quick and im lazy
    createAllSeriesRows();
    
    updateGraph();
});

document.getElementById("allSeriesSettings").addEventListener("click", (e) => {
    const settings = document.getElementById("allSeriesSettingsBox")
        //make the settings box visible and move it to the cursor
        settings.style.display = settings.style.display === 'block' ? 'none' : 'block';
        settings.style.top = e.pageY + "px"
        settings.style.left = e.pageX + 10 + "px"
})


//Update the graph
window.updateGraph = function() {
    console.log("window.updateGraph called")
    window.selectedSess = document.getElementById("title-dropdown").value;
    buildMainPlot();
};

//#region Handle the buttons on the right of the graph screen
//Handle swapping between Date and Solve# on the x-axis

xSelectDate.onclick   = () => { if (!xAxisIsDate) { setXAxisMode(true);  buildMainPlot(); } };
xSelectSolve.onclick  = () => { if ( xAxisIsDate) { setXAxisMode(false); buildMainPlot(); } };
xSelectLinear.onclick = () => { if ( xAxisIsLog)  { setXAxisLog(false);  buildMainPlot(); } };
xSelectLog.onclick    = () => { if (!xAxisIsLog)  { setXAxisLog(true);   buildMainPlot(); } };
ySelectLinear.onclick = () => { if ( yAxisIsLog)  { setYAxisLog(false);  buildMainPlot(); } };
ySelectLog.onclick    = () => { if (!yAxisIsLog)  { setYAxisLog(true);   buildMainPlot(); } };

const activeRegs = {powerLaw: false, logLog: false, exponential: false, linear: false};

powerLawToggle.onclick = () => {
    if(!window.userData) return alert("Please upload a file first"); 
    activeRegs.powerLaw = !activeRegs.powerLaw;
    if(activeRegs.powerLaw) {
        powerLawToggle.classList.add("pressed");
        const iters = parseInt(document.getElementById("powerLawIterations").value)
        const times = window.userData.solves[window.selectedSess].map(s => s[1]);
        const clean = times.filter(t => t > 0 && Number.isFinite(t));
        powerLawFit(clean, {iterations: iters});

        console.log(regressions)
    } else {
        powerLawToggle.classList.remove("pressed");
    }
    
    buildMainPlot();
}
logLogToggle.onclick = () => {
    if(!window.userData) return alert("Please upload a file first"); 
    activeRegs.logLog = !activeRegs.logLog;
    if(activeRegs.logLog) { 
        logLogToggle.classList.add("pressed");
        const times = window.userData.solves[window.selectedSess].map(s => s[1]);
        const clean = times.filter(t => t > 0 && Number.isFinite(t));
        logLogRegression(clean);

        console.log(regressions)
    } else {
        logLogToggle.classList.remove("pressed");
    }
    
    buildMainPlot();
}
exponentialToggle.onclick = () => {
    if(!window.userData) return alert("Please upload a file first"); 
    activeRegs.exponential = !activeRegs.exponential;
    if(activeRegs.exponential) {
        exponentialToggle.classList.add("pressed");
        const times = window.userData.solves[window.selectedSess].map(s => s[1]);
        const clean = times.filter(t => t > 0 && Number.isFinite(t));
        exponentialRegression(clean);

        console.log(regressions)
    } else {
        exponentialToggle.classList.remove("pressed");
    }

    buildMainPlot();
}

export function resetRegressions() {
    //reset the regressions
    activeRegs.powerLaw = false;
    activeRegs.logLog = false;
    activeRegs.exponential = false;
    activeRegs.linear = false;

    //remove the pressed class from all buttons
    powerLawToggle.classList.remove("pressed");
    logLogToggle.classList.remove("pressed");
    exponentialToggle.classList.remove("pressed");

    //reset the r2
    powerLawR2.innerText = "N/A";
    loglogR2.innerText = "N/A";
    exponentialR2.innerText = "N/A";

}



//#region handle series settings box
//the color selector
document.getElementById("seriesColorSelector").addEventListener("change", function () {
    const seriesNumber = parseInt(document.getElementById("seriesSettingsBox").name)
    
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
document.getElementById("seriesWidthSelector").addEventListener("change", function () {
    const seriesNumber = parseInt(document.getElementById("seriesSettingsBox").name)
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
document.getElementById("seriesTimePoints").addEventListener("click", function() { 
    timeSeriesPoints = true;
    buildMainPlot();
})
document.getElementById("seriesTimeLines").addEventListener("click", function() {
    timeSeriesPoints = false;
    buildMainPlot();
})
//#endregion

function graphTabStartup() {
    //Reset the buttons on the right
    xSelectSolve.checked = true; setXAxisMode(false);
    xSelectLinear.checked = true; setXAxisLog(false);
    ySelectLinear.checked = true; setYAxisLog(false);
    //Make sure its empty
    document.getElementById("graphdiv").replaceChildren();

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
