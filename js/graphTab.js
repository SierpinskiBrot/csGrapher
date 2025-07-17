import { createButton } from "./utils.js";
import {updatePBTable } from "./statisticsTab.js"

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
    toggleTableBody.replaceChildren();
    const pbSeriesTableBody = document.getElementById("pbSeriesTableBody")
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
        const colorSelector = document.getElementById("seriesColorSelector");
        colorSelector.value = window.userData.colors[i - 1];

        //set the value of the width selector the the width of the series
        const widthSelector = document.getElementById("seriesWidthSelector")
        widthSelector.value = window.userData.widths[i - 1];
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
    window.selectedSess = document.getElementById("title-dropdown").value;
    if(window.userData.xTitle == "Date") {
        window.g.updateOptions({
            file: window.userData.solves[window.selectedSess], 
            xlabel:  window.userData.xTitle
        });
    } else if (window.userData.xTitle == "Solve #") {
        window.g.updateOptions({
            file: window.userData.solves2[window.selectedSess], 
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
    }
};
ySelectLinear.addEventListener("click", function() { if(logScale[1] == true) ySwapScale(); });
ySelectLog.addEventListener("click", function() { if(logScale[1] == false) ySwapScale(); });
//#endregion

//#region handle series settings box
//the color selector
const colorSelector = document.getElementById("seriesColorSelector")
colorSelector.addEventListener("change", function () {
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
const widthSelector = document.getElementById("seriesWidthSelector")
widthSelector.addEventListener("change", function () {
    const seriesNumber = parseInt(document.getElementById("seriesSettingsBox").name)
    for (let i = 0; i <= 1; i++) {
        //update saved width
        const width_ = this.value
        window.userData.widths[seriesNumber - (i+1)] = width_;
        
        //update width on the graph
        const label_ = window.userData.labels[seriesNumber - i]
        if (label_ == 'Time') {
            window.g.updateOptions({series: {[label_]: {pointSize: width_}}})
        }
        else {
            window.g.updateOptions({series: {[label_]: { strokeWidth: width_ }}})
        }
    } 
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