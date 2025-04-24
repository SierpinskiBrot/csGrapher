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
                labelsSeparateLines: true,
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

//Swap x-axis between date and solve number
const axisSwap = document.getElementById("axisswap");
axisSwap.addEventListener("click", function() {
    //Swaps the x-axis between date & solve#, assuming file is uploaded and graph is ready
    if(window.userData != undefined && window.g != undefined) {
        [window.userData.solves, window.userData.solves2] = [window.userData.solves2, window.userData.solves];
        [window.userData.xTitle, window.userData.xTitle2] = [window.userData.xTitle2, window.userData.xTitle];
        window.updateGraph();
        window.g.resetZoom();
    }
});

//toggle log x axis
const logx = document.getElementById("logx");
logx.addEventListener("click", function() {
    if(window.userData != undefined && window.g != undefined) {
        logScale[0] = !logScale[0];
        window.g.updateOptions({ axes : { x : {  logscale : logScale[0] } } })
        window.g.updateOptions({ xlabel: (logScale[0] ? "Log(": "") + window.userData.xTitle + (logScale[0] ? ")": "")})
        window.dropdown = window.document.getElementById("title-dropdown");
        window.dropdown.value = window.selectedSess;
    }
});
//toggle log y axis
const logy = document.getElementById("logy");
logy.addEventListener("click", function() {
    if(window.userData != undefined && window.g != undefined) {
        logScale[1] = !logScale[1];
        window.g.updateOptions({  logscale : logScale[1] })
        window.g.updateOptions({ ylabel: (logScale[1] ? "Log(": "") + "Time(s)" + (logScale[1] ? ")": "")})
        window.dropdown = window.document.getElementById("title-dropdown");
        window.dropdown.value = window.selectedSess;
    }
});

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

        this.xTitle = "Date";
        this.xTitle2 = "Solve #";

        //   date, time, pb s, mo3, pb mo3, ao5, pb ao5, ao12, pb ao12, ao50, pb ao50, ao100, pb ao100, ao1000, pbao1000
        this.solves = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
        //solve #, time, pb s, mo3, pb mo3, ao5, pb ao5, ao12, pb ao12, ao50, pb ao50, ao100, pb ao100, ao1000, pbao1000
        this.solves2 = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];

        //names of sessions
        this.sessions = []

        


        //!!!!! Theres gotta be a better way to do this

        //Append col for the solve dates
        if(data.session1 != undefined){for (let i = 0; i < data.session1.length; i++) {this.solves[0].push([new Date(1000*data.session1[i][3])])};};
        if(data.session2 != undefined){for (let i = 0; i < data.session2.length; i++) {this.solves[1].push([new Date(1000*data.session2[i][3])])};};
        if(data.session3 != undefined){for (let i = 0; i < data.session3.length; i++) {this.solves[2].push([new Date(1000*data.session3[i][3])])};};
        if(data.session4 != undefined){for (let i = 0; i < data.session4.length; i++) {this.solves[3].push([new Date(1000*data.session4[i][3])])};};
        if(data.session5 != undefined){for (let i = 0; i < data.session5.length; i++) {this.solves[4].push([new Date(1000*data.session5[i][3])])};};
        if(data.session6 != undefined){for (let i = 0; i < data.session6.length; i++) {this.solves[5].push([new Date(1000*data.session6[i][3])])};};
        if(data.session7 != undefined){for (let i = 0; i < data.session7.length; i++) {this.solves[6].push([new Date(1000*data.session7[i][3])])};};
        if(data.session8 != undefined){for (let i = 0; i < data.session8.length; i++) {this.solves[7].push([new Date(1000*data.session8[i][3])])};};
        if(data.session9 != undefined){for (let i = 0; i < data.session9.length; i++) {this.solves[8].push([new Date(1000*data.session9[i][3])])};};
        if(data.session10 != undefined){for (let i = 0; i < data.session10.length; i++) {this.solves[9].push([new Date(1000*data.session10[i][3])])};};
        if(data.session11 != undefined){for (let i = 0; i < data.session11.length; i++) {this.solves[10].push([new Date(1000*data.session11[i][3])])};};
        if(data.session12 != undefined){for (let i = 0; i < data.session12.length; i++) {this.solves[11].push([new Date(1000*data.session12[i][3])])};};
        if(data.session13 != undefined){for (let i = 0; i < data.session13.length; i++) {this.solves[12].push([new Date(1000*data.session13[i][3])])};};
        if(data.session14 != undefined){for (let i = 0; i < data.session14.length; i++) {this.solves[13].push([new Date(1000*data.session14[i][3])])};};
        if(data.session15 != undefined){for (let i = 0; i < data.session15.length; i++) {this.solves[14].push([new Date(1000*data.session15[i][3])])};};

        //Append col for the solve times
        if(data.session1 != undefined){for (let i = 0; i < data.session1.length; i++) {this.solves[0][i].push(0.001*this.parseTime(data.session1[i][0]))};};
        if(data.session2 != undefined){for (let i = 0; i < data.session2.length; i++) {this.solves[1][i].push(0.001*this.parseTime(data.session2[i][0]))};};
        if(data.session3 != undefined){for (let i = 0; i < data.session3.length; i++) {this.solves[2][i].push(0.001*this.parseTime(data.session3[i][0]))};};
        if(data.session4 != undefined){for (let i = 0; i < data.session4.length; i++) {this.solves[3][i].push(0.001*this.parseTime(data.session4[i][0]))};};
        if(data.session5 != undefined){for (let i = 0; i < data.session5.length; i++) {this.solves[4][i].push(0.001*this.parseTime(data.session5[i][0]))};};
        if(data.session6 != undefined){for (let i = 0; i < data.session6.length; i++) {this.solves[5][i].push(0.001*this.parseTime(data.session6[i][0]))};};
        if(data.session7 != undefined){for (let i = 0; i < data.session7.length; i++) {this.solves[6][i].push(0.001*this.parseTime(data.session7[i][0]))};};
        if(data.session8 != undefined){for (let i = 0; i < data.session8.length; i++) {this.solves[7][i].push(0.001*this.parseTime(data.session8[i][0]))};};
        if(data.session9 != undefined){for (let i = 0; i < data.session9.length; i++) {this.solves[8][i].push(0.001*this.parseTime(data.session9[i][0]))};};
        if(data.session10 != undefined){for (let i = 0; i < data.session10.length; i++) {this.solves[9][i].push(0.001*this.parseTime(data.session10[i][0]))};};
        if(data.session11 != undefined){for (let i = 0; i < data.session11.length; i++) {this.solves[10][i].push(0.001*this.parseTime(data.session11[i][0]))};};
        if(data.session12 != undefined){for (let i = 0; i < data.session12.length; i++) {this.solves[11][i].push(0.001*this.parseTime(data.session12[i][0]))};};
        if(data.session13 != undefined){for (let i = 0; i < data.session13.length; i++) {this.solves[12][i].push(0.001*this.parseTime(data.session13[i][0]))};};
        if(data.session14 != undefined){for (let i = 0; i < data.session14.length; i++) {this.solves[13][i].push(0.001*this.parseTime(data.session14[i][0]))};};
        if(data.session15 != undefined){for (let i = 0; i < data.session15.length; i++) {this.solves[14][i].push(0.001*this.parseTime(data.session15[i][0]))};};
        
        

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
       
        //Get pb s
        /*
        for(let j = 0; j < 15; j++){
            debugger;
            if(this.solves[j].length != 0) {
                var idx = this.solves[j][0].length - 1;
                console.log(j)
                for(let i = 0; i < this.solves[j].length; i++) {
                    if(i == 0){
                        this.solves[j][0].push(this.solves[j][0][1])
                    } else {
                        if(this.solves[j][i][idx] < this.solves[j][i-1][2]) {this.solves[j][i].push(this.solves[j][i][idx])}
                        else {this.solves[j][i].push(this.solves[j][i-1][2])}
                    }
                }
            }
        }
        */
        
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
    pushAvg(x) {
        console.log("pushing average of " + x)

        //do this for each session
        for(let j = 0; j < 15; j++) {
            //iterate through all the solves
            for(let i = 0; i < this.solves[j].length; i++) {
                //if i<x-1, there are not enough solves to make an average of x, so average is NaN
                if(i < x-1) {this.solves[j][i].push(NaN); /*this.solves[j][i][y].push(NaN)*/}

                else{ //holy shit does this guy not know the sliding window method

                    //create array with last x solves
                    let temp = []
                    for(let k = 0; k < x; k++) {
                        temp.push(this.solves[j][i-k][1]);
                    }

                    //!!!!! GOTTA SORT THIS AND TAKE OFF TOP AND BOTTOM 5% INSTEAD OF WHATEVER THIS SHIT IS
                    //!!!!! ALSO GOTTA DEAL WITH DNFS

                    //remove first and last of the arr
                    temp.shift();
                    temp.pop();
                    let sum = 0;
                    for(let k = 0; k < x-2; k++) {
                        sum += temp[k]
                    }
                    
                    let mean = (sum)/(x-2)
                    this.solves[j][i].push(mean);
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
