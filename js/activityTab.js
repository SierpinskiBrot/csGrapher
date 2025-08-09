import { themes } from "./themes.js";

function createBinnedData(solves) {
    const binned = [];
    for(let j = 0; j < solves.length; j++) {
        const counts = Array.from({length:7}, () => Array(24).fill(0));
        for (const s of solves[j]) {
            const d = (s[0] instanceof Date) ? s[0] : new Date(s[0]);
            const dow = d.getDay();           // 0=Sun...6=Sat
            const hour = d.getHours();        // 0..23
            counts[dow][hour] += 1;
        }
    binned.push(counts);
    }
    window.userData.dayHourBinned = binned;
}

export function activityTabStartup() {
    createBinnedData(window.userData.solves);
    drawHeatmap();
}

export function drawHeatmap() {
    const ctx = document.getElementById("activityCanvas").getContext("2d");
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    const binned = window.userData.dayHourBinned[window.selectedSess];
    const left = 90, right = 20, top = 24, bottom = 40;
    const gridW = W - left - right;
    const gridH = H - top - bottom;

    const cellW = gridW / 24;  // 24 hours
    const cellH = gridH / 7;   // 7 days

    //ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = themes[window.currentTheme]['--color-surface'];
    ctx.fillRect(0, 0, W, H);
    const max = Math.max(...binned.flat());

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    //cells
    for(let d = 0; d < 7; d++) {
        for(let h = 0; h < 24; h++) {
            ctx.fillStyle = `rgba(0, 0, 255, ${binned[d][h] / max})`;
            //if(binned[d][h] == 0) ctx.fillStyle = "#000"
            ctx.fillRect(left + h * cellW, top + d * cellH, cellW, cellH);
        }
    }

    //grid lines
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let h = 0; h <= 24; h++) {
        ctx.moveTo(left + h * cellW, top);
        ctx.lineTo(left + h * cellW, H - bottom);
    }
    for(let d = 0; d <= 7; d++) {
        ctx.moveTo(left, top + d * cellH);
        ctx.lineTo(W - right, top + d * cellH);
    }
    ctx.stroke();

    //axes labels
    ctx.fillStyle = "#000";
    ctx.font = "16px Arial";
    for(let d = 0; d < 7; d++) {
        ctx.fillText(dayNames[d], left - 40, top + d * cellH + cellH / 2);
    }   

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for(let h = 0; h < 24; h++) {
        //tick every 2 hours for readability
        if (h % 2 === 0) {
            ctx.fillText(h + ":00", left + h * cellW + cellW / 2, H - bottom + 5);
        }
    }

    //legend
    const legendX = left, legendY = 6, legendW = 180, legendH = 10;
    for(let i = 0; i < legendW; i++) {
        const alpha = i / legendW;
        ctx.fillStyle = `rgba(0, 0, 255, ${alpha})`;
        ctx.fillRect(legendX + i, legendY, 1, legendH);
    }
    ctx.strokeStyle = "#000";
    ctx.strokeRect(legendX+0.5, legendY+0.5, legendW, legendH);
    ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText("0", legendX-5, legendY);
    ctx.textAlign = "left"; ctx.fillText(max, legendX + legendW+5, legendY);

}