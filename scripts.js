import "./lib/dygraph.js";

//              x,     y
var logScale = [false, false]

var userData = null;
window.selectedSess = 0; //selected session from the cstimer

//This code is run after the user uploads a file
const jsonDataFile = document.getElementById("UploadFile");
jsonDataFile.addEventListener("change", function() {

    var GetFile = new FileReader;
    GetFile .onload=function(){
        const result = GetFile.result;
        console.log(result);
        var jsonData = JSON.parse(result);

        //parse the data into better arrays
        window.userData = new UserData(jsonData)

        //Create the dropdown for the title of the graph and set its functionality
        window.dropdown = document.createElement("select");
        window.dropdown.setAttribute("id","title-dropdown")
        for (let i = 0; i < 15; i++) {
            if(window.userData.sessions[i]) {
                let child = document.createElement("option");
                child.value = i;
                child.innerHTML = window.userData.sessions[i];
                window.dropdown.appendChild(child);
            }
        }
        window.dropdown.setAttribute("value", window.selectedSess);
        //window.dropdown.setAttribute("onchange", 'window.g.resetZoom(); window.updateGraph()');
        window.dropdown.setAttribute("onchange", 'window.updateGraph(); window.g.resetZoom()');
        //insert the dropdown before the file selection
        //document.getElementById("inputline").insertBefore(window.dropdown, document.getElementById("fileinput"));

        //Create the graph
        Dygraph.onDOMready(function onDOMready() {
            window.g = new Dygraph(
            
                // containing div
                document.getElementById("graphdiv"),
            
                //Data
                window.userData.solves[window.selectedSess],

                //Options
                {
                labels: [ "Date", "Time","PB Single", "ao5", "PBao5", "ao12", "PBao12", "ao100","PBao100", "ao1000","PBao1000" ],
                xlabel: window.userData.xTitle,
                ylabel: "Time(s)",
                legend: "always",
                title: window.dropdown.outerHTML,
                color: "#084C61",
                labelsDiv: document.getElementById("legendLine"),
                labelsSeparateLines: false,
                zoomCallback: function() { //Make sure the title of dropdown stays the same while zooming
                    window.dropdown = window.document.getElementById("title-dropdown");
                    console.log("zoomCallback:")
                    console.log("   dropdown: " + window.dropdown.value + ", selected: " + window.selectedSess)
                    window.dropdown.value = window.selectedSess;
                    console.log("   new dropdown: " + window.dropdown.value)
                },
                series: {
                    "Time": {
                        color: "#084C61",
                        strokeWidth: 0,
                        drawPoints: true,
                        pointSize: 1
                    },
                    
                    "PB Single": {
                        color: "#084C61",
                        strokeWidth: 2,
                        strokePattern: Dygraph.DASHED_LINE
                    }, //177E89
                    "ao5": {
                        color: "#177E89",
                        strokeWidth: 2,
                        visibility: false,
                    },
                    "PBao5": {
                        color: "#177E89",
                        strokeWidth: 2,
                        strokePattern: Dygraph.DASHED_LINE
                    }, 
                    "ao12": {
                        color: "#85A06A",
                        strokeWidth: 2,
                        visibility: false,
                    },
                    "PBao12": {
                        color: "#85A06A",
                        strokeWidth: 2,
                        strokePattern: Dygraph.DASHED_LINE
                    }, 
                    "ao100": {
                        
                        strokeWidth: 2,
                        color: "#FFAD0A"
                    },
                    "PBao100": {
                        color: "#FFAD0A",
                        strokeWidth: 2,
                        strokePattern: Dygraph.DASHED_LINE
                    }, 
                    "ao1000": {
                        color: "#E45E3D"
                    },
                    "PBao1000": {
                        color: "#E45E3D",
                        strokeWidth: 2,
                        strokePattern: Dygraph.DASHED_LINE
                    }, 
                }
                }
            );
            });
    }

    GetFile.readAsText(this.files[0]);
});


//Handle swapping between Date and Solve# on the x-axis
function xSwapData() {
    if(window.userData != undefined && window.g != undefined) {
        [window.userData.solves, window.userData.solves2] = [window.userData.solves2, window.userData.solves];
        [window.userData.xTitle, window.userData.xTitle2] = [window.userData.xTitle2, window.userData.xTitle];
        window.updateGraph();
        window.g.resetZoom();
    }
};
const xSelectDate = document.getElementById("xSelectDate");
xSelectDate.addEventListener("click", function() { if(window.userData.xTitle != "Date") xSwapData(); });
const xSelectSolve = document.getElementById("xSelectSolve");
xSelectSolve.addEventListener("click", function() { if(window.userData.xTitle != "Solve #") xSwapData(); });

//Handle swapping between Linear and Log on the x-axis
function xSwapScale() {
    if(window.userData != undefined && window.g != undefined) {
        logScale[0] = !logScale[0];
        window.g.updateOptions({ axes : { x : {  logscale : logScale[0] } } })
        window.g.updateOptions({ xlabel: (logScale[0] ? "Log(": "") + window.userData.xTitle + (logScale[0] ? ")": "")})
        window.dropdown = window.document.getElementById("title-dropdown");
        window.dropdown.value = window.selectedSess;
    }
};
const xSelectLinear = document.getElementById("xSelectLinear");
xSelectLinear.addEventListener("click", function() { if(logScale[0] == true) xSwapScale(); });
const xSelectLog = document.getElementById("xSelectLog");
xSelectLog.addEventListener("click", function() { if(logScale[0] == false) xSwapScale(); });

//Handle swapping between Linear and Log on the y-axis
function ySwapScale() {
    if(window.userData != undefined && window.g != undefined) {
        logScale[1] = !logScale[1];
        window.g.updateOptions({  logscale : logScale[1] })
        window.g.updateOptions({ ylabel: (logScale[1] ? "Log(": "") + "Time(s)" + (logScale[1] ? ")": "")})
        window.dropdown = window.document.getElementById("title-dropdown");
        window.dropdown.value = window.selectedSess;
    }
};
const ySelectLinear = document.getElementById("ySelectLinear");
ySelectLinear.addEventListener("click", function() { if(logScale[1] == true) ySwapScale(); });
const ySelectLog = document.getElementById("ySelectLog");
ySelectLog.addEventListener("click", function() { if(logScale[1] == false) ySwapScale(); });


//Update the graph
window.updateGraph = function() {
    window.dropdown = window.document.getElementById("title-dropdown");
    window.selectedSess = window.dropdown.value; 
    window.g.updateOptions({
        file: window.userData.solves[window.selectedSess], 
        xlabel: (logScale[0] ? "Log(": "") + window.userData.xTitle + (logScale[0] ? ")": ""),
        ylabel: (logScale[1] ? "Log(": "") + "Time(s)" + (logScale[1] ? ")": "")});
    window.dropdown = window.document.getElementById("title-dropdown");
    window.dropdown.value = window.selectedSess;
};

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
         *                      "1": 
         *                          {
         *                              "name": name of session 1,
         *                              "opt": options like the scramble type,
         *                              "rank": idk
         *                              "stat": [#of solves, #of dnfs, mean time(ms)],
         *                              "date": [solve1 UTC, most recent solve UTC]
         *                          },
         *                      "same shit for the other sessions...": 
         *                          {
         *                              "...": ...
         *                          }
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

        //   date, time, pb s, mo3, pb mo3, ao5, pb ao5, ao12, pb ao12, ao50, pb ao50, ao100, pb ao100, ao1000, pbao1000
        this.solves = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
        //solve #, time, pb s, mo3, pb mo3, ao5, pb ao5, ao12, pb ao12, ao50, pb ao50, ao100, pb ao100, ao1000, pbao1000
        this.solves2 = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];

        //names of sessions
        this.sessions = [];

        //Add the columns for solve date/time
        for (let s = 1; s <= 15; s++) {
            console.log("S: " + s);
            const sessionKey = `session${s}`;
            console.log("   sessionKey: " + sessionKey);
            if (data[sessionKey] !== undefined) {
                console.log("       Wohoo");
                for (let i = 0; i < data[sessionKey].length; i++) {
                    //Append col for the solve dates
                    this.solves[s - 1].push([new Date(1000 * data[sessionKey][i][3])]);

                    //Append col for the solve times
                    console.log("S: " + s + ", i: " + i)
                    this.solves[s - 1][i].push(0.001*this.parseTime(data[sessionKey][i][0]))
                }
            }
        }

        
        //Delete DNFs
        for(let j = 0; j < 15; j++) {
            for(let i = 0; i < this.solves[j].length; i++) {
                if(this.solves[j][i][1] == 0) {
                    this.solves[j].splice(i,1);
                }
            }
        }

        //Get the session names
        if(data.properties.sessionData != undefined){
            const sessionData = JSON.parse(data.properties.sessionData)
            for(let i = 0; i < 15; i++) {
                if(sessionData[i] != undefined){this.sessions.push(sessionData[i].name)}
            }
        }
        
        //create the default data series
        this.pbsOfLastCol();
        this.pushAvg(5);
        this.pbsOfLastCol();
        this.pushAvg(12);
        this.pbsOfLastCol();
        this.pushAvg(100);
        this.pbsOfLastCol();
        this.pushAvg(1000);
        this.pbsOfLastCol();

        //This creates solves2, which is solves but x-axis is solve#
        for(let i = 0; i < 15; i++) {
            for(let k = 0; k < this.solves[i].length; k++) {
                this.solves2[i].push(Array.from(this.solves[i][k]))
                this.solves2[i][k][0] = k+1;
            }

        }
    
    }

    //append a column for the average of the x last solves
    /*
    pushAvg(x) {
        console.log("pushing average of " + x)

        //do this for each session
        for(let j = 0; j < 15; j++) {
            //iterate through all the solves
            for(let i = 0; i < this.solves[j].length; i++) {
                //if i<x-1, there are not enough solves to make an average of x, so average is NaN
                if(i < x-1) {this.solves[j][i].push(NaN);}

                else{ //holy shit does this guy not know the sliding window method

                    //create array with last x solves
                    let temp = []
                    for(let k = 0; k < x; k++) {
                        temp.push(this.solves[j][i-k][1]);
                    }
                    let numToClip = Math.ceil(0.05*x); // get the number of solves to clip off of each side
                    temp.sort(function(a, b){return a - b});

                    //only sum solves not in the 5% fastest or 5% slowest
                    let sum = 0;
                    for(let k = numToClip; k < x-numToClip; k++) {
                        sum += temp[k]
                    }
                    
                    let mean = (sum)/(x-2*numToClip);
                    this.solves[j][i].push(mean);
                }
            }
        } 
    }
    */
    pushAvg(x) {
        console.log("pushing average of " + x);
        for (let j = 0; j < 15; j++) {
          const solves = this.solves[j];
          const clip = Math.ceil(0.05 * x);
          let windo = [];
      
          for (let i = 0; i < solves.length; i++) {
            if (i < x - 1) {
              solves[i].push(NaN);
            } else {
              // Remove oldest if window is full
              if (windo.length === x) {
                const old = solves[i - x][1];
                const idx = windo.findIndex(val => val === old);
                if (idx !== -1) windo.splice(idx, 1);
              }
      
              // Insert new solve time in sorted position
              const newVal = solves[i][1];
              const insertIdx = windo.findIndex(val => val > newVal);
              if (insertIdx === -1) windo.push(newVal);
              else windo.splice(insertIdx, 0, newVal);
      
              // Copy clipped portion
              const trimmed = windo.slice(clip, x - clip);
              const sum = trimmed.reduce((a, b) => a + b, 0);
              const mean = sum / trimmed.length;
              solves[i].push(mean);
            }
          }
        }
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
    pbsOfLastCol() {
        console.log("doing pbs of last col")
        //do this for each session
        for(let j = 0; j < 15; j++){
            if(this.solves[j].length != 0) {
                console.log("   session:" + j)
                
                //index of the last col in session
                var idx = this.solves[j][this.solves[j].length-1].length - 1;

                //find the first valid index - 
                //for a pb ao12, this would be 12
                var firstValIdx = 0
                for(let i = 0; i < this.solves[j].length; i++) {
                    firstValIdx += 1;
                    this.solves[j][i].push(this.solves[j][i][idx])
                    if(this.solves[j][i][idx] > 0) {
                        console.log("       First valid index:" + firstValIdx)
                        break;
                    }
                }
                
                //creating the actual data
                for(let i = firstValIdx; i < this.solves[j].length; i++) {
                    //if the time is less than prev pb, update the rolling pb
                    if(this.solves[j][i][idx] < this.solves[j][i-1][idx+1]) {
                        this.solves[j][i].push(this.solves[j][i][idx])
                    }
                    //otherwise, keep the current pb
                    else {
                        this.solves[j][i].push(this.solves[j][i-1][idx+1])
                    }
                }
            }
        }
    }
}
