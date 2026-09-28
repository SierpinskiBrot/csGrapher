import {themes} from "./themes.js"

export { makeArrayOfArrays, binarySearchInsertIdx, dhm, sleep, createButton, parseTime};

// Utility to make N arrays
const makeArrayOfArrays = (n) => Array(n).fill().map(() => []);

//quickly find index to insert in sorted array
function binarySearchInsertIdx(arr, val) {
    let low = 0, high = arr.length;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (arr[mid] < val) low = mid + 1;
        else high = mid;
    }
    return low;
}

//Get the days, hours, mins, seconds from a time in ms
//> 1 day returns days&hours, else > 1hr returns hours&mins, else > 1min returns mins&secs, else returns secs 
function dhm (ms) {
    const days = Math.floor(ms / (24*60*60*1000));
    const daysms = ms % (24*60*60*1000);
    const hours = Math.floor(daysms / (60*60*1000));
    const hoursms = ms % (60*60*1000);
    const minutes = Math.floor(hoursms / (60*1000));
    const minutesms = ms % (60*1000);
    const sec = Math.floor(minutesms / 1000);
    if(days >= 1) {
        return days + " Days, " + hours + " Hours";
    } else if(hours >= 1) {
        return hours + " Hours, " + minutes + " Mins";
    } else if(minutes >= 1) {
        return minutes + " Mins, " + sec + " Seconds";
    } else {
        return sec + " Seconds";
    }
}

//a histogram column width of about sd/6, rounded to a power of two (0.25, 0.5, 1, 2, ...)
export const defaultColumnWidth = sd => Math.pow(2, Math.round(Math.log2(sd / 6)));

//real sleep
const sleep = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//Creates a button with the given labeltext, onclick function, and optional class parameter
function createButton(labelText, onClick, className = "") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = labelText;
    if (className) btn.className = className;
    btn.addEventListener("click", onClick);
    return btn;
}

/*
Parsing a solve time from cstimer
    the times are stored in array [t1,t2]
        t2: solve time in milliseconds
        t1: 
             0: normal solve
          2000: +2 (add 2000 milliseconds)
            -1: dnf - delete that for now
*/
function parseTime(t) {
    if(t[0] == 0) {return t[1];}               //normal solve
    else if(t[0] == 2000) {return t[1] + 2000} //+2
    else if(t[0] == -1) {return null}             //dnf
    //erroneous time
    else {
        console.log("error parsing time:")
        console.log("t1 of " + t[0] + "does not correlate with a +2 or a dnf")
    }
}

export function rowsToUPlotCols(rows, isDate, xAxisIsLog_) {
  if (!rows.length) return [];

  const nSeries = rows[0].length;
  const cols = Array.from({ length: nSeries }, () => []);

  for (const r of rows) {
    let x = r[0];

    // Date object -> seconds
    if (x instanceof Date) x = x.getTime() / 1000;

    // Milliseconds timestamp -> seconds
    else if (isDate && x > 1e12) x = x / 1000;

    // If log axis, reject invalid domain
    if (xAxisIsLog && !(x > 0 && Number.isFinite(x))) continue;

    // push X
    cols[0].push(x);

    // push Y columns
    for (let i = 1; i < nSeries; i++) {
      cols[i].push(r[i]);
    }
  }

  return cols;
}

export let xAxisIsLog = false;
export function setXAxisLog(isLog) { xAxisIsLog = isLog; }
export let yAxisIsLog = false;
export function setYAxisLog(isLog) { yAxisIsLog = isLog; }

//faint lines for the axis grid and ticks of a uPlot graph
export function gridLines() {
    return { show: true, stroke: "rgba(0,0,0,0.2)", width: 1 };
}

// converts the legend of a uPlot graph into a simple tooltip
export function legendAsTooltipPlugin({ className, style = { backgroundColor: themes[window.currentTheme]["--color-secondary-variant"], color: "black" } } = {}) {
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
