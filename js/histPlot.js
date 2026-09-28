//the uPlot graph of the histogram tab: the histogram, the cumulative distributions and the TPS graph
import {themes} from "./themes.js"
import {legendAsTooltipPlugin, gridLines} from "./utils.js"

export {histOpts, drawHist, resetHistZoom, resizeHist, clearHist}

//the options of the graph, kept between drawHist calls:
//rows [[x, y1, y2, ...], ...], labels (x first), colors (of the series after the first), xlabel, ylabel,
//step (the first series is a step plot), spanGaps (connect lines over nulls), yRange ([min, max] or null to fit the data),
//annotations [{x, shortText, width, tickHeight}] (markers at the bottom of the graph)
const histOpts = {}
let xWindow = null  //x range kept between draws, like a zoom, until it is reset (null fits the data)
let yZoom = null    //y range zoomed into with the mouse, until the next draw
let yFixed = null   //histOpts.yRange, until the zoom is reset
let shownKey = null //the series and labels window.h was made with; other data only needs setData

const stepped = uPlot.paths.stepped({ align: 1 })
const size = () => ({ width: histogramDiv.clientWidth, height: histogramDiv.clientHeight })

//merge changes into the options and draw; xRange sets the x range kept between draws (null fits the data)
function drawHist(changes) {
    const { xRange, ...rest } = changes
    Object.assign(histOpts, rest)
    if (xRange !== undefined) xWindow = xRange && xRange.map(Number)
    yFixed = histOpts.yRange
    yZoom = null
    render()
}

//zoom out to the data, as double-clicking the graph does
function resetHistZoom() {
    xWindow = yZoom = yFixed = null
    window.h?.setData(window.h.data)
}

//fit the graph to #histogramDiv (not while its tab is hidden)
function resizeHist() {
    if (window.h && histogramDiv.clientWidth) window.h.setSize(size())
}
window.addEventListener("resize", resizeHist)
window.addEventListener("themechange", () => { shownKey = null; render() })

//forget the graph of the previous file
function clearHist() {
    window.h?.destroy()
    window.h = shownKey = null
    xWindow = yZoom = yFixed = null
    histogramDiv.replaceChildren()
}

function render() {
    if (!histOpts.labels) return
    const { rows, labels, colors, step, spanGaps } = histOpts
    //uPlot takes columns, with null for a gap
    const data = labels.map((_, j) => rows.map(r => Number.isNaN(r[j]) ? null : r[j] ?? null))
    const primary = themes[window.currentTheme]["--color-primary"].trim()
    const key = JSON.stringify([labels, colors, histOpts.xlabel, histOpts.ylabel, step, spanGaps, primary])
    if (window.h && key == shownKey) return window.h.setData(data)

    shownKey = key
    window.h?.destroy()
    window.h = new uPlot({
        ...size(),
        series: labels.map((label, i) => i == 0 ? { label } : {
            label, spanGaps, points: { show: false },
            ...(i == 1 ? { stroke: primary, fill: primary + "80", width: 1, paths: step ? stepped : undefined }
                : { stroke: colors[i - 2], width: 2 }),
        }),
        scales: { x: { time: false, range: (u, min, max) => xWindow ?? [min, max] }, y: { range: yScaleRange } },
        axes: [histOpts.xlabel, histOpts.ylabel].map(label => ({ label, grid: gridLines(), ticks: gridLines() })),
        //dragging at least 10px zooms along x or y, whichever the drag is longer in
        cursor: { drag: { x: true, y: true, uni: Infinity, dist: 10, setScale: false } },
        hooks: { setSelect: [zoomToSelection], draw: [drawAnnotations(primary)] },
        plugins: [legendAsTooltipPlugin()],
    }, data, histogramDiv)
    window.h.over.addEventListener("dblclick", resetHistZoom)
}

//zoom into the dragged range (setScale is off so the zoom can be kept in xWindow/yZoom)
function zoomToSelection(u) {
    const { left, top, width, height } = u.select
    //a drag along x selects the full height
    if (height > u.over.clientHeight - 1) xWindow = [u.posToVal(left, "x"), u.posToVal(left + width, "x")]
    else yZoom = [u.posToVal(top + height, "y"), u.posToVal(top, "y")]
    u.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false)
    u.setData(u.data)
}

//the y range: zoomed, fixed, or (as dygraph did) the data in view and the points on either side of it with 10% padding,
//moving an edge close to zero to zero
function yScaleRange(u) {
    if (yZoom || yFixed) return yZoom || yFixed
    const [xs, ...cols] = u.data
    let first = 0, last = xs.length - 1
    if (xWindow) {
        first = Math.max(0, xs.findIndex(x => x >= xWindow[0]))
        last = xs.findLastIndex(x => x <= xWindow[1])
        if (last < 0) last = xs.length - 1
    }
    let min = Infinity, max = -Infinity
    for (const col of cols) {
        let a = first, b = last
        if (xWindow) {
            while (a > 0 && col[--a] == null);
            while (b < xs.length - 1 && col[++b] == null);
        }
        for (let i = a; i <= b; i++) {
            if (col[i] == null) continue
            if (col[i] < min) min = col[i]
            if (col[i] > max) max = col[i]
        }
    }
    if (min == Infinity) return [0, 1]
    let span = max - min
    if (span == 0) {
        if (max != 0) span = Math.abs(max)
        else max = span = 1
    }
    let lo = min - 0.1 * span, hi = max + 0.1 * span
    if (lo < 0 && min >= 0) lo = 0
    if (hi > 0 && max <= 0) hi = 0
    return [lo, hi]
}

//the annotations in view: a box with the text above a tick down to the x axis, in the color of the first series
//the highest are drawn first, so the ticks of higher annotations go behind the boxes of lower ones
function drawAnnotations(color) {
    let font
    return u => {
        const annotations = histOpts.annotations?.filter(a => a.x >= u.scales.x.min && a.x <= u.scales.x.max)
            .sort((a, b) => b.tickHeight - a.tickHeight)
        if (!annotations?.length) return
        const px = uPlot.pxRatio, ctx = u.ctx, height = 16 * px
        const bottom = u.bbox.top + u.bbox.height
        font ??= getComputedStyle(u.root).fontFamily
        ctx.save()
        ctx.font = `${14 * px}px ${font}`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.strokeStyle = color
        ctx.lineWidth = px
        for (const { x, shortText, width, tickHeight } of annotations) {
            const cx = Math.round(u.valToPos(x, "x", true))
            const left = cx - Math.round(width * px / 2)
            const top = bottom - height - tickHeight * px
            ctx.fillStyle = "white"
            ctx.fillRect(left, top, width * px, height)
            ctx.strokeRect(left + px / 2, top + px / 2, width * px - px, height - px)
            ctx.fillStyle = color
            ctx.fillText(shortText, cx, top + height / 2)
            ctx.beginPath()
            ctx.moveTo(cx + px / 2, top + height)
            ctx.lineTo(cx + px / 2, top + height + tickHeight * px)
            ctx.stroke()
        }
        ctx.restore()
    }
}
