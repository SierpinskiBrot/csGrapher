import "./lib/dygraph.js";

//              x,     y
var logScale = [false, false]

window.selectedSess = 0; //selected session from the cstimer


function binarySearchInsertIdx(arr, val) {
    let low = 0, high = arr.length;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (arr[mid] < val) low = mid + 1;
        else high = mid;
    }
    return low;
}

function round(num, decimalPlaces = 0) {
    num = Math.round(num + "e" + decimalPlaces);
    return Number(num + "e" + -decimalPlaces);
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
    return days + " Days, " + hours + " Hours, " + minutes + " Mins";
}

const sleep = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

function createSeriesRow(i) {
    //create 1st the toggle button
    const newButton1 = createButton(window.userData.labels[i], (e) => {
        const currentVisibility = window.userData.visibilities[i - 1];
        window.userData.visibilities[i - 1] = !currentVisibility;
        window.g.setVisibility(window.userData.visibilities, true);
        const tgt = e.target.closest('button');
        tgt.classList.toggle('pressed');
    }, "seriesToggle")
    //set the color
    const color1 = window.userData.colors[i - 1];
    newButton1.style = "background:" + color1 + "; border-color: " + color1
    //redundant as visibility is reset when a file is uploaded
    if (!window.userData.visibilities[i - 1]) newButton1.classList.toggle('pressed')

    //create 2nd the toggle button
    const newButton2 = createButton("PB", (e) => {
        const currentVisibility = window.userData.visibilities[i];
        window.userData.visibilities[i] = !currentVisibility;
        window.g.setVisibility(window.userData.visibilities, true);
        const tgt = e.target.closest('button');
        tgt.classList.toggle('pressed');
    }, "seriesToggle")
    //set the color
    const color2 = window.userData.colors[i];
    newButton2.style = "background:" + color2 + "; border-color: " + color2
    //redundant as visibility is reset when a file is uploaded
    if (!window.userData.visibilities[i]) newButton2.classList.toggle('pressed')


    //create the settings button
    const seriesSettings = createButton(">", (e) => {
        const settings = document.getElementById("seriesSettingsBox")
        //make the settings box visible and move it to the cursor
        settings.style.display = settings.style.display === 'block' ? 'none' : 'block';
        settings.style.top = e.pageY + "px"
        settings.style.left = e.pageX + 10 + "px"
        settings.name = i+1 //use the name attribute to know which series is being edited

        //set the value of the color selector to the color of the buttons
        const colorSelector = document.getElementById("seriesColorSelector");
        colorSelector.value = window.userData.colors[i - 1];

        //set the value of the width selector the the width of the series
        const widthSelector = document.getElementById("seriesWidthSelector")
        widthSelector.value = window.userData.widths[i - 1];
    }, "seriesSettings")


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
    return newRow
}

document.getElementById("addSeriesBtn").addEventListener("click", () => {
    const type = document.getElementById("newAvgType").value; // 'ao' or 'mo'
    const size = parseInt(document.getElementById("newAvgSize").value);
    const width = parseInt(document.getElementById('newAvgWidth').value)
    if (isNaN(size) || size < 1) return alert("Please enter a valid number.");
  
    const label1 = `${type}${size}`;
    const label2 = "PB "+label1
    const color = document.getElementById("newAvgColor").value
    const index = window.userData.labels.length;
  
    // Avoid duplicates
    if (window.userData.labels.includes(label1)) {
      alert("This series already exists.");
      return;
    }
  
    window.userData.labels.push(label1);window.userData.labels.push(label2);
    window.userData.colors.push(color);window.userData.colors.push(color);
    window.userData.widths.push(width);window.userData.widths.push(width);
    window.userData.visibilities.push(true);window.userData.visibilities.push(true);
  
    if (type === "ao") {
      window.userData.pushAvg(size);
    } else {
      window.userData.pushMean(size);
    }
    window.userData.pbsOfLastCol(size)
    window.userData.createSolves2();
  
    //window.userData.updateVisibility();
    //window.userData.updateLegend();
    //window.userData.updateSeriesTable(); // re-render buttons
    const newRow = createSeriesRow(index);
    document.getElementById("toggleTableBody").appendChild(newRow)
    doSeriesLineStyling(index)
    doSeriesLineStyling(index+1)
    updateGraph();
    
  });

// Utility to make N arrays
const makeArrayOfArrays = (n) => Array(n).fill().map(() => []);

//Update the graph
window.updateGraph = function() {
    window.selectedSess = document.getElementById("title-dropdown").value;
    window.g.updateOptions({
        file: window.userData.solves[window.selectedSess], 
        xlabel: (logScale[0] ? "Log(": "") + window.userData.xTitle + (logScale[0] ? ")": ""),
        ylabel: (logScale[1] ? "Log(": "") + "Time(s)" + (logScale[1] ? ")": "")
    });
};

//Update the histogram
window.updateHist = function() {
    window.selectedSess = document.getElementById("title-dropdown").value;
    window.h.updateOptions({
        file: window.userData.hist[window.selectedSess]
    });
};  


//clicking outside the image closes it too
document.getElementById('fileHintOverlay').onclick = (e) => {
    if (e.target.id === 'fileHintOverlay') {
        document.getElementById('fileHintOverlay').style.display = 'none';
    }
};
document.getElementById('slidingWindowHintOverlay').onclick = (e) => {
    if (e.target.id === 'slidingWindowHintOverlay') {
        document.getElementById('slidingWindowHintOverlay').style.display = 'none';
    }
};
document.getElementById('creationHintOverlay').onclick = (e) => {
    if (e.target.id === 'creationHintOverlay') {
        document.getElementById('creationHintOverlay').style.display = 'none';
    }
};


//#region handle the toolbar buttons on the top
window.currentTab = "graph";
const graphButton = document.getElementById("graphButton");
const histogramButton = document.getElementById("histogramButton");
const statsButton = document.getElementById("statsButton");
const graphContainer = document.getElementById("graphContainer");
const histogramContainer = document.getElementById("histogramContainer");
const statsContainer = document.getElementById("statsContainer");
const graphLegend = document.getElementById("graphLegend")
const histLegend = document.getElementById("histLegend")
function resetContainers() {
    histogramContainer.style.display = "none";
    histogramButton.classList.remove("pressed");
    statsContainer.style.display = "none";
    statsButton.classList.remove("pressed");
    graphContainer.style.display = "none";
    graphButton.classList.remove("pressed");
    graphLegend.style.display = "none"
    histLegend.style.display = "none"
}
graphButton.addEventListener("click", function() {
    window.currentTab = "graph";
    resetContainers();
    graphContainer.style.display = "flex";
    graphButton.classList.add("pressed");
    window.g.resize();
    window.updateGraph(); window.g.resetZoom()
    graphLegend.style.display = "block"
})
histogramButton.addEventListener("click", function() {
    window.currentTab = "hist";
    resetContainers();
    histogramContainer.style.display = "flex";
    histogramButton.classList.add("pressed");
    window.h.resize();
    window.updateHist(); window.h.resetZoom()
    if(window.userData) {
        window.userData.genSlidingWindowDefaults()
        window.userData.genCreationDefaults();
    }
    histLegend.style.display = "block"
})
statsButton.addEventListener("click", function() {
    window.currentTab = "stats";
    resetContainers();
    statsContainer.style.display = "flex";
    statsButton.classList.add("pressed");
    window.userData.updatePBTable(window.selectedSess)
})
//#endregion



//#region Handle the buttons on the right of the graph screen
//Handle swapping between Date and Solve# on the x-axis
const xSelectDate = document.getElementById("xSelectDate");
const xSelectSolve = document.getElementById("xSelectSolve");
function xSwapData() {
    if(window.userData != undefined && window.g != undefined) {
        [window.userData.solves, window.userData.solves2] = [window.userData.solves2, window.userData.solves];
        [window.userData.xTitle, window.userData.xTitle2] = [window.userData.xTitle2, window.userData.xTitle];
        window.updateGraph();
        window.g.resetZoom();
    }
};
xSelectDate.addEventListener("click", function() { if(window.userData.xTitle == "Solve #") xSwapData(); });
xSelectSolve.addEventListener("click", function() { if(window.userData.xTitle == "Date") xSwapData(); });

//Handle swapping between Linear and Log on the x-axis
const xSelectLinear = document.getElementById("xSelectLinear");
const xSelectLog = document.getElementById("xSelectLog");
function xSwapScale() {
    if(window.userData != undefined && window.g != undefined) {
        logScale[0] = !logScale[0];
        window.g.updateOptions({ axes : { x : {  logscale : logScale[0] } } })
        window.g.updateOptions({ xlabel: (logScale[0] ? "Log(": "") + window.userData.xTitle + (logScale[0] ? ")": "")})
        window.dropdown = window.document.getElementById("title-dropdown");
        window.dropdown.value = window.selectedSess;
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
        window.g.updateOptions({ ylabel: (logScale[1] ? "Log(": "") + "Time(s)" + (logScale[1] ? ")": "")})
        window.dropdown = window.document.getElementById("title-dropdown");
        window.dropdown.value = window.selectedSess;
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
    const label1 = window.userData.labels[seriesNumber]
    const label2 = window.userData.labels[seriesNumber - 1]
    window.userData.colors[seriesNumber - 1] = this.value;
    window.userData.colors[seriesNumber - 2] = this.value;
    //update color on the graph
    window.g.updateOptions({
        series: {
            [label1]: { color: window.userData.colors[seriesNumber - 1] },
            [label2]: { color: window.userData.colors[seriesNumber - 2] }
        }
    })
    //update the color of the series toggle buttons
    const toggleButtons = document.getElementsByClassName("seriesToggle")
    for (let i = 1; i <= 2; i++) {
        toggleButtons[seriesNumber - i].style.background = window.userData.colors[seriesNumber - i]
        toggleButtons[seriesNumber - i].style.borderColor = window.userData.colors[seriesNumber - i]
    }
})
//the width selector
const widthSelector = document.getElementById("seriesWidthSelector")
widthSelector.addEventListener("change", function () {
    const seriesNumber = parseInt(document.getElementById("seriesSettingsBox").name)
    for (let i = 0; i <= 1; i++) {
        const label_ = window.userData.labels[seriesNumber - i]
        const width_ = this.value
        window.userData.widths[seriesNumber - (i+1)] = width_;
        //update width on the graph
        if (label_ == 'Time') {
            window.g.updateOptions({series: {[label_]: {pointSize: width_}}})
        }
        else {
            window.g.updateOptions({series: {[label_]: { strokeWidth: width_ }}})
        }
    } 
})
//#endregion

//This code is run after the user uploads a file
const jsonDataFile = document.getElementById("UploadFile");
jsonDataFile.addEventListener("change", function() {

    var GetFile = new FileReader;
    GetFile .onload=function(){
        const result = GetFile.result;
        var jsonData = JSON.parse(result);
        
        //create our userData
        window.userData = new UserData(jsonData)
        
        //Create the dropdown for the title of the graph and set its functionality
        if(document.getElementById("title-dropdown")) document.getElementById("title-dropdown").remove()
        window.dropdown = document.createElement("select");
        window.dropdown.setAttribute("id","title-dropdown")
        for (let i = 0; i < window.userData.numSessions; i++) {
            if(window.userData.sessions[i]) {
                let child = document.createElement("option");
                child.value = i;
                child.innerHTML = window.userData.sessions[i];
                window.dropdown.appendChild(child);
            }
        }
        window.dropdown.setAttribute("value", window.selectedSess);
        window.dropdown.addEventListener("change", function() {
            //Only update what is on screen
            if(window.currentTab == "graph") { window.updateGraph(); window.g.resetZoom() }
            else if (window.currentTab == "hist") { 
                window.updateHist(); window.h.resetZoom(); 
                window.userData.genSlidingWindowDefaults(); window.userData.genCreationDefaults(); }
            else if (window.currentTab == "stats") { window.userData.updatePBTable(window.dropdown.value) }
        })
        document.getElementById("hintButton").after(window.dropdown)

        //Reset the buttons on the right
        xSelectDate.checked = true;
        xSelectLinear.checked = true;
        ySelectLinear.checked = true;

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
                    legend: "always",
                    color: "#084C61",
                    labelsDiv: document.getElementById("graphLegend"),
                    labelsSeparateLines: false,
                }
            );
            //Create the histogram
            window.h = new Dygraph(
                document.getElementById("histogramDiv"), //containing div
                window.userData.hist[window.selectedSess], //Data
                //Options
                {
                    xlabel: "Time(s)",
                    ylabel: "Frequency",
                    stepPlot: true,
                    fillGraph: true,
                    color: "#DB3A34",
                    fillAlpha: 0.5,
                    labelsDiv: document.getElementById("histLegend"),
                    labelsSeparateLines: false,
                }
            );
        });
        
        //Line styling for each line
        for(let i = 1; i < window.userData.labels.length; i++) {
            doSeriesLineStyling(i)
        }
        
        //-----create the series toggle buttons-----
        const toggleTableBody = document.getElementById("toggleTableBody")
        toggleTableBody.replaceChildren();
        for (let i = 1; i < window.userData.labels.length; i+=2) {
            const newRow = createSeriesRow(i);
            toggleTableBody.appendChild(newRow)
        }
        

        //create the histogram buttons
        //col width input
        document.getElementById("histBucketInput").addEventListener("change", function() {
            window.userData.createHist(histBucketInput.value)
            updateHist();
        })
        //reset
        document.getElementById("histBucketReset").addEventListener("click", function() {
            histBucketInput.value = 1
            window.userData.createHist(histBucketInput.value)
            updateHist();
        })
        //sliding window reset
        document.getElementById("sldWinReset").addEventListener("click", function() {
            histBucketInput.value = 1
            window.userData.createHist(histBucketInput.value)
            updateHist();
        })
        //sliding window defaults
        document.getElementById("sldWinDefaults").addEventListener("click", function() {window.userData.genSlidingWindowDefaults();})
        //sliding window play
        document.getElementById("sldWinPlay").addEventListener("click", function() {
            if(window.userData.sldWinPlaying) {
                window.userData.sldWinPlaying = false;
            } else {
                window.userData.creationPlaying = false
                window.userData.animateHistRange();
            }
        })
        //creation reset
        document.getElementById("creationReset").addEventListener("click", function() {
            histBucketInput.value = 1
            window.userData.createHist(histBucketInput.value)
            updateHist();
        })
        //creation defaults
        document.getElementById("creationDefaults").addEventListener("click", function() {window.userData.genCreationDefaults();})
        //creation play
        document.getElementById("creationPlay").addEventListener("click", function() {
            if(window.userData.creationPlaying) {
                window.userData.creationPlaying = false
            } else {
                window.userData.sldWinPlaying = false;
                window.userData.animateHistCreate();
            }
            
        })

    }

    GetFile.readAsText(this.files[0]);
});


class UserData {
    constructor(data) {
        /** Incoming data format from csTimer
         *  {
         *      "session1":[[[solve1 time modifier, solve1 time],solve1 scramble,idk, solve1 UTC],[same shit for solve 2 and so on],[solve3],[...]],
         *      "session2":[[[solve1 time modifier, solve1 time],solve1 scramble,idk, solve1 UTC],[same shit for solve 2 and so on],[solve3],[...]],
         *      "...": [...],
         *      "properties":
         *          {
         *              "sessionData":
         *                  {
         *                      "session # (1-numSessions)": 
         *                          {
         *                              "name": name of session,
         *                              "opt": options like the scramble type,
         *                              "rank": idk
         *                              "stat": [#of solves, #of dnfs, mean time(ms)],
         *                              "date": [solve1 UTC, most recent solve UTC]
         *                          },
         *                      "...": ...
         *                  }
         *              "useMilli": true/false,
         *              "...useless stuff...""
         *              "statalu": all the stats you see on the left, mine is "mo3 ao5 ao12 ao50 ao100 ao200 ao500 ao1000",
         *              "...just a bunch more useless stuff...": ...
         *          }
         * }
         */
        this.xTitle = "Date";
        this.xTitle2 = "Solve #";

        this.numSessions = 0;
        //names of sessions
        this.sessions = [];
        //Get the session names
        const sessNamesStartTime = performance.now() 
        if(data.properties.sessionData != undefined){
            const sessionData = JSON.parse(data.properties.sessionData)
            for(let i = 0; i < 100; i++) {
                if(sessionData[i] != undefined){
                    this.sessions.push(sessionData[i].name)
                    this.numSessions += 1
                }
            }
        }
        const sessNamesEndTime = performance.now()
        console.log(`get session names: ${round(sessNamesEndTime - sessNamesStartTime)} milliseconds`)
        

        this.labels = [ "Date", "Time","PB Single", "ao5", "PB ao5", "ao12", "PB ao12", "ao100","PB ao100", "ao1000","PB ao1000" ];
        this.colors = ["#084C61", "#084C61", "#177E89", "#177E89", "#85A06A", "#85A06A", "#FFAD0A", "#FFAD0A", "#E45E3D", "#E45E3D"];
        this.widths = [2,2,2,2,2,2,2,2,2,2]
        this.visibilities = [true,true,true,true,true,true,true,true,true,true];
        
        //   date, time, pb s, mo3, pb mo3, ao5, pb ao5, ao12, pb ao12, ao50, pb ao50, ao100, pb ao100, ao1000, pbao1000
        this.solves = makeArrayOfArrays(this.numSessions);
        //solve #, time, pb s, mo3, pb mo3, ao5, pb ao5, ao12, pb ao12, ao50, pb ao50, ao100, pb ao100, ao1000, pbao1000
        this.solves2 = makeArrayOfArrays(this.numSessions);

        //histogram
        //this.hist is what is displayed, this.buckets is the data of each solve in its bucket for when we want to subdivide
        //  hist[session] [0]: bucket name(0,1,...), [1]: # of solves
        this.hist = makeArrayOfArrays(this.numSessions);

        //pb data for stats panel
        //  pbData[session][series] [0]: title, [1]: time(s), [2]: solves since last, [3]: days since last, [4]: date 
        this.pbData = makeArrayOfArrays(this.numSessions);

        //Add the first two columns: solve date, solve time
        const fcstartTime = performance.now() 
        for (let s = 1; s <= this.numSessions; s++) {
            const sessionKey = `session${s}`;
            if (data[sessionKey] !== undefined) {
                for (let i = 0; i < data[sessionKey].length; i++) {
                    this.solves[s - 1].push([new Date(1000 * data[sessionKey][i][3])]);         //solve date
                    this.solves[s - 1][i].push(0.001*this.parseTime(data[sessionKey][i][0]))    //solve time
                }
            }
        }
        const fcendTime = performance.now()
        console.log(`first 2 cols: ${round(fcendTime - fcstartTime)} milliseconds`)
        

        //Delete DNFs
        const ddstartTime = performance.now() 
        for(let j = 0; j < this.numSessions; j++) {
            for(let i = 0; i < this.solves[j].length; i++) {
                if(this.solves[j][i][1] == 0) {
                    this.solves[j].splice(i,1);
                    i-=1;
                }
            }
        }
        const ddendTime = performance.now()
        console.log(`delete dnfs: ${round(ddendTime - ddstartTime)} milliseconds`)
        

        //create the default data series
        const ddsstartTime = performance.now() 
        this.pbsOfLastCol(1);
        this.pushAvg(5);
        this.pbsOfLastCol(5);
        this.pushAvg(12);
        this.pbsOfLastCol(12);
        this.pushAvg(100);
        this.pbsOfLastCol(100);
        this.pushAvg(1000);
        this.pbsOfLastCol(1000);
        const ddsendTime = performance.now()
        console.log(`default series: ${round(ddsendTime - ddsstartTime)} milliseconds`)
        

        //This creates solves2, which is solves but x-axis is solve#
        const s2startTime = performance.now() 
        this.createSolves2();
        const s2endTime = performance.now()
        console.log(`create solves2: ${round(s2endTime - s2startTime)} milliseconds`)
        

        //add the data for histogram
        const chstartTime = performance.now() 
        this.createHist(1)
        this.genSlidingWindowDefaults()
        this.genCreationDefaults()
        const chendTime = performance.now()
        console.log(`create histogram: ${round(chendTime - chstartTime)} milliseconds`)
        this.sldWinPlaying = false;
        this.creationPlaying = false;
        

        //create the pb table
        const pbstartTime = performance.now() 
        this.updatePBTable(0);
        const pbendTime = performance.now()
        console.log(`pb table: ${round(pbendTime - pbstartTime)} milliseconds`)
        
    }

    createSolves2() {
        this.solves2 = makeArrayOfArrays(this.numSessions);
        for(let i = 0; i < this.numSessions; i++) {
            for(let k = 0; k < this.solves[i].length; k++) {
                this.solves2[i].push(Array.from(this.solves[i][k]))
                this.solves2[i][k][0] = k+1;
            }
        }
    }

    createHist(bucketSize) {
        const bucketSize_ = parseFloat(bucketSize)
        this.hist = makeArrayOfArrays(this.numSessions);
        //this.buckets = makeArrayOfArrays(this.numSessions);
        for(let j = 0; j < this.numSessions; j++) {
            let max = 0;
            //find the max time
            for(let i = 0; i < this.solves[j].length; i++) {
                const time = this.solves[j][i][1]
                if(time > max) max = time;
            }
            //create the buckets
            for(let b = 0; b <= max+1; b+= bucketSize_) {
                this.hist[j].push([b,0]);
                //this.buckets[j].push([b]);
            }
            //add the solves to buckets
            for(let i = 0; i < this.solves[j].length; i++) {
                const time = this.solves[j][i][1];
                const bucket = Math.floor(time/bucketSize_);
                this.hist[j][bucket][1] += 1;
                //this.buckets[j][bucket].push(time);
            }
        }
    }

    createHistRange(bucketSize, range,offset) {
        const bucketSize_ = parseFloat(bucketSize)
        this.hist[window.selectedSess] = [];
        let j = window.selectedSess
        const numSolves = this.solves[j].length
        let max = 0;
        //find the max time
        for(let i = numSolves-range-offset; i < numSolves-offset; i++) {
            const time = this.solves[j][i][1]
            if(time > max) max = time;
        }
        //create the buckets
        for(let b = 0; b <= max+1; b+= bucketSize_) {
            this.hist[j].push([b,0]);
        }
        //add the solves to buckets
        for(let i = numSolves-range-offset; i < numSolves-offset; i++) {
            const time = this.solves[j][i][1];
            const bucket = Math.floor(time/bucketSize_);
            this.hist[j][bucket][1] += 1;
        }
    }

    async animateHistRange() {
        const playBtn = document.getElementById("sldWinPlay")
        const progressBar = document.querySelector("#sldWinProgressBar div")
        //Flip button state and reset progress
        this.sldWinPlaying = true;
        playBtn.textContent = "Stop"
        progressBar.style.width = "0%"

        const bucketSize = document.getElementById("sldWinWidth").value
        const range = document.getElementById("sldWinWindow").value
        const step = document.getElementById("sldWinStep").value 
        const xmax = document.getElementById("sldWinXmax").value 
        const frameTime = document.getElementById("sldWinTime").value

        const totalFrames = Math.floor((this.solves[window.selectedSess].length - range) / step)
        let frame = 0;

        for(let i = this.solves[window.selectedSess].length-range; i > 0; i-=step) {
            if(!this.sldWinPlaying) break;

            this.createHistRange(bucketSize,range,i)
            window.h.updateOptions({
                file: this.hist[window.selectedSess],
                dateWindow: [0,xmax],
            });

            //update progress bar
            frame++
            progressBar.style.width = `${(frame/totalFrames)*100}%`

            await sleep(frameTime)
        }

        //reset button
        playBtn.textContent = "Play";
        this.sldWinPlaying = false;
        progressBar.style.width = "0%"
    }


    async animateHistCreate() {
        const playBtn = document.getElementById("creationPlay")
        const progressBar = document.querySelector("#creationProgressBar div")
        //Flip button state and reset progress
        this.creationPlaying = true;
        playBtn.textContent = "Stop"
        progressBar.style.width = "0%"

        const step = parseFloat(document.getElementById("creationStep").value)
        const Xmax = parseFloat(document.getElementById("creationXmax").value)
        const bucketSize = parseFloat(document.getElementById("creationWidth").value)

        const totalFrames = Math.floor(this.solves[window.selectedSess].length/step)
        let frame = 0;

        this.hist[window.selectedSess] = [];
        let j = window.selectedSess
        const numSolves = this.solves[j].length
        let max = 0;
        //find the max time
        for(let i = 0; i < numSolves; i++) {
            const time = this.solves[j][i][1]
            if(time > max) max = time;
        }
        //create the buckets
        for(let b = 0; b <= max+1; b+= bucketSize) {
            this.hist[j].push([b,0]);
        }
        //add the solves to buckets
        for(let i = 0; i < numSolves; i++) {
            if(!this.creationPlaying) break;

            const time = this.solves[j][i][1];
            const bucket = Math.floor(time/bucketSize);
            this.hist[j][bucket][1] += 1;

            if(i % step == 0) {
                window.h.updateOptions({
                    file: window.userData.hist[window.selectedSess],
                    dateWindow: [0,Xmax],
                });

                //update progress bar
                frame++
                progressBar.style.width = `${(frame/totalFrames)*100}%`

                await sleep(1)
            } 
        }

        //reset button
        playBtn.textContent = "Play";
        this.creationPlaying = false;
        progressBar.style.width = "0%"
    }

    genSlidingWindowDefaults() {
        let numSolves = this.solves[window.selectedSess].length
        let mean = 0;
        let deviation = 0;
        let max = 0;
        for(let i = 0; i < numSolves; i++) {
            const time = this.solves[window.selectedSess][i][1]
            if(time > max) max = time;
            mean += time;
        }
        mean /= numSolves;
        for(let i = 0; i < numSolves; i++) {
            const time = this.solves[window.selectedSess][i][1]
            deviation += (time - mean) ** 2
        }
        deviation /= numSolves;
        deviation = deviation ** 0.5
        //console.log("mean: " + mean)
        //console.log("max: " + max)
        //console.log("stddev: " + deviation)

        //-----width-----
        const rawWidth = deviation / 6;
        //  Snap to closest power-of-two fraction (0.25, 0.5, 1, 2, 4, ...)
        const log2 = Math.round(Math.log2(rawWidth));
        const sldWinWidth = Math.pow(2, log2);

        //-----window - 1/5 of total solves-----
        const sldWinWindow = Math.round(numSolves * 0.2 + 1);

        //-----step-----
        const sldWinStep = Math.round(sldWinWindow / 100 + 1)

        //-----xmax - 2 standard deviations-----
        const sldWinXmax = Math.round(mean+3*deviation+1);

        //-----time-----
        const sldWinTime = 1

        document.getElementById("sldWinWidth").value = sldWinWidth
        document.getElementById("sldWinWindow").value = sldWinWindow
        document.getElementById("sldWinStep").value = sldWinStep
        document.getElementById("sldWinXmax").value = sldWinXmax
        document.getElementById("sldWinTime").value = sldWinTime
    }

    genCreationDefaults() {
        let numSolves = this.solves[window.selectedSess].length
        let mean = 0;
        let deviation = 0;
        let max = 0;
        for(let i = 0; i < numSolves; i++) {
            const time = this.solves[window.selectedSess][i][1]
            if(time > max) max = time;
            mean += time;
        }
        mean /= numSolves;
        for(let i = 0; i < numSolves; i++) {
            const time = this.solves[window.selectedSess][i][1]
            deviation += (time - mean) ** 2
        }
        deviation /= numSolves;
        deviation = deviation ** 0.5

        //-----width-----
        const rawWidth = deviation / 6;
        //  Snap to closest power-of-two fraction (0.25, 0.5, 1, 2, 4, ...)
        const log2 = Math.round(Math.log2(rawWidth));
        const creationWidth = Math.pow(2, log2);

        //-----step-----
        const creationStep = Math.round(numSolves / 1000 + 1)

        //-----xmax - 2 standard deviations-----
        const creationXmax = Math.round(mean+6*deviation+1);

        document.getElementById("creationWidth").value = creationWidth
        document.getElementById("creationStep").value = creationStep
        document.getElementById("creationXmax").value = creationXmax
    }



    //append a column for the average of the x last solves
    pushAvg(x) {
        const pastartTime = performance.now() 
        
        let sum,mean
        for (let j = 0; j < this.numSessions; j++) {
            const solves = this.solves[j];
            const clip = Math.ceil(0.05 * x); //Remove top and bottom 5% of solves
            const trimmedSize = x-clip*2
            let windo = [];
            
            for (let i = 0; i < solves.length; i++) {
                const newVal = solves[i][1];
                if (i < x) { //Cant make an average without enough data
                    solves[i].push(NaN); 
                    // Insert new solve time in sorted position
                    const insertIdx = binarySearchInsertIdx(windo, newVal);
                    if (insertIdx === -1) windo.push(newVal);
                    else windo.splice(insertIdx, 0, newVal);
                } else {
                    // Remove oldest solve from window
                    const old = solves[i - x][1];
                    const removeIdx = binarySearchInsertIdx(windo, old);
                    if (removeIdx !== -1) windo.splice(removeIdx, 1);
                    
                    // Insert new solve time in sorted position
                    const insertIdx = binarySearchInsertIdx(windo, newVal);
                    if (insertIdx === -1) windo.push(newVal);
                    else windo.splice(insertIdx, 0, newVal);
            
                    //mean of clipped portion
                    sum = 0;
                    for(let k = clip; k < x-clip; k++) {sum+=windo[k]}
                    mean = sum/trimmedSize

                    solves[i].push(mean);
                }
            }
        }

        const paendTime = performance.now()
        console.log(`   push ao${x}: ${round(paendTime - pastartTime)} milliseconds`)
    }

    /*
    the times are stored in array [t1,t2]
        t2: solve time in milliseconds
        t1: 
             0: normal solve
          2000: +2 (add 2000 milliseconds)
            -1: dnf - delete that shit
    */
    parseTime(t) {
        if(t[0] == 0) {return t[1];}               //normal solve
        else if(t[0] == 2000) {return t[1] + 2000} //+2
        else if(t[0] == -1) {return 0}             //dnf
        //erroneous time
        else {
            console.log("error parsing time:")
            console.log("t1 of " + t[0] + "does not correlate with a +2 or a dnf")
        }
    }

    //Append a col for the pb of the previous col
    pbsOfLastCol(x) {
        const pblstartTime = performance.now() 
        
        
        //do this for each session
        for(let j = 0; j < this.numSessions; j++){
            if(this.solves[j].length != 0) {

                const pbStats = [[],[],[],[]];
                pbStats[0] = x;    
                
                //index of the last col in session
                const idx = this.solves[j][this.solves[j].length-1].length - 1;
                //find the first valid index - 
                //for a pb ao12, this would be 12
                let firstValIdx = 0
                for(let i = 0; i < this.solves[j].length; i++) {
                    firstValIdx += 1;
                    this.solves[j][i].push(this.solves[j][i][idx])
                    if(this.solves[j][i][idx] > 0) {
                        break;
                    }
                }
                
                //creating the actual data
                for(let i = firstValIdx; i < this.solves[j].length; i++) {
                    //if the time is less than prev pb, update the rolling pb
                    if(this.solves[j][i][idx] < this.solves[j][i-1][idx+1]) {
                        this.solves[j][i].push(this.solves[j][i][idx])
                        pbStats[1].push(this.solves[j][i][idx]);
                        pbStats[2].push(this.solves[j][i][0])
                        pbStats[3].push(i);
                    }
                    //otherwise, keep the current pb
                    else {
                        this.solves[j][i].push(this.solves[j][i-1][idx+1])
                    }
                }

                this.pbData[j].push(pbStats);
            }
        }

        const pblendTime = performance.now()
        console.log(`   pb ao${x}: ${round(pblendTime - pblstartTime)} milliseconds`)
        
    }


    updatePBTable(j) {
        //console.log("Updating pb table to session " + j)
        //create the list for stats tab
        const pbStatsBody = document.getElementById("pbStatsBody")
        //const headerRow = document.getElementById("pbStatsHeader")
        pbStatsBody.replaceChildren();
        //pbStats.appendChild(headerRow);

        for(let i = this.pbData[j][0][1].length-1; i >= 0; i--) {
            let newRow = document.createElement("tr");

            //Date column
            let dateCol = document.createElement("td");
            let date = this.pbData[j][0][2][i];
            let dateStr = date.getDate() + "/" + date.getMonth() + "/" + date.getFullYear();
            dateCol.innerHTML = dateStr;

            //PB For Time column
            let date2 = new Date();
            let dateDiff = 0;
            let pbForTimeCol = document.createElement("td")
            if(i == this.pbData[j][0][1].length-1) {
                dateDiff = Math.abs(date2-date);
                pbForTimeCol.innerHTML = dhm(dateDiff) + " and counting";
            }
            else {
                date2 = this.pbData[j][0][2][i+1];
                dateDiff = Math.abs(date2-date)
                pbForTimeCol.innerHTML = dhm(dateDiff);
            }
            
            //Solve # column
            let solveCol = document.createElement("td")
            solveCol.innerHTML = this.pbData[j][0][3][i]

            //PB for # solves column
            let solves = this.pbData[j][0][3][i]
            let nextSolves = this.solves[j].length;
            if(i < this.pbData[j][0][1].length-1) {
                nextSolves = this.pbData[j][0][3][i+1]
            }
            let solvesPassed = nextSolves-solves;
            if(i == this.pbData[j][0][1].length-1) solvesPassed += " and counting"
            let pbForSolvesCol = document.createElement("td");
            pbForSolvesCol.innerHTML = solvesPassed;

            //Solve time column
            let timeCol = document.createElement("td");
            timeCol.innerHTML= round(this.pbData[j][0][1][i],3)

            newRow.appendChild(timeCol);
            newRow.appendChild(dateCol);
            newRow.appendChild(pbForTimeCol);
            newRow.appendChild(solveCol);
            newRow.appendChild(pbForSolvesCol);

            pbStatsBody.appendChild(newRow);
        }
    }
}





