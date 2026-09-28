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

//the default color of the k-th series (0-based; a series and its PB share one): the palette, then colors
//whose hue is the previous one plus the palette's hue steps in turn, with the saturation and lightness
//interpolated between the palette colors nearest in hue
const seriesPalette = ["#084C61", "#177E89", "#86A06A", "#F2934A", "#E45E3D"];
const paletteHsl = seriesPalette.map(hex => {
    const [r, g, b] = [1, 3, 5].map(j => parseInt(hex.substr(j, 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    const l = (max + min) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    const h = !d ? 0 : max == r ? (g - b) / d % 6 : max == g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, s, l];
});
const paletteByHue = [...paletteHsl].sort((a, b) => a[0] - b[0]);
//hue change from each palette color to the next, the short way round (-180 to 180)
const hueSteps = paletteHsl.slice(1).map(([h], i) => ((h - paletteHsl[i][0]) % 360 + 540) % 360 - 180);
const hueDrift = -123; //picked to spread the hues of the first 25 series furthest apart
export function seriesColor(k) {
    const n = seriesPalette.length;
    if (k < n) return seriesPalette[k];
    let hue = paletteHsl[n - 1][0];
    //each time round the steps, drift further so colors 8 apart don't land on the same hue
    for (let i = n; i <= k; i++) {
        const j = (i - n) % hueSteps.length;
        hue += hueSteps[j] + (j == 0 && i > n ? hueDrift : 0);
    }
    hue = (hue % 360 + 360) % 360;
    //saturation and lightness between the palette colors nearest in hue on either side
    const i = paletteByHue.findLastIndex(([h]) => h <= hue);
    const lo = paletteByHue.at(i), hi = paletteByHue[(i + 1) % n];
    const f = ((hue - lo[0]) % 360 + 360) % 360 / ((((hi[0] - lo[0]) % 360 + 360) % 360) || 360);
    const s = lo[1] + (hi[1] - lo[1]) * f, l = lo[2] + (hi[2] - lo[2]) * f;
    const a = s * Math.min(l, 1 - l);
    return "#" + [0, 8, 4].map(m => {
        const x = (m + hue / 30) % 12;
        return Math.round(255 * (l - a * Math.max(-1, Math.min(x - 3, 9 - x, 1)))).toString(16).padStart(2, "0");
    }).join("");
}

//the color of axes, text and grid lines drawn on graphs
export function graphInk() {
    return themes[window.currentTheme]["--graph-ink"];
}

//faint lines for the axis grid and ticks of a uPlot graph
export function gridLines() {
    return { show: true, stroke: graphInk() + "33", width: 1 };
}

//a uPlot axis with a label, grid lines and text in the theme's colors
export function themedAxis(label) {
    return { label, stroke: graphInk(), grid: gridLines(), ticks: gridLines() };
}

// converts the legend of a uPlot graph into a simple tooltip
export function legendAsTooltipPlugin({ className, style = { backgroundColor: themes[window.currentTheme]["--color-secondary-variant"], color: graphInk() } } = {}) {
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
