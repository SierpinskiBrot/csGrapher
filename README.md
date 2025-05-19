# csGrapher - https://sierpinskibrot.github.io/csGrapher/
 Tool for graphing and analyzing solve data from csTimer

### How to get csTimer file
![cstimer help](/resources/cstimer-export-help.jpg)

# Usage
## Graph tab
![Graph Tab Screenshot](/resources/previews/graphTabV2.png)
This tab shows a more extensive version of csTimer's graph for the selected session

Click and drag to zoom on the graph, double click to zoom out

The buttons on the left allow you to toggle which series you want to see on the graph (ex. PB Single, ao5, ao100) and change their colors and thicknesses. You can add a new series with the form underneath

The buttons on the right are to edit the axes of the graph. You can choose whether to have the date or the solve # on the x axis, 
and can change the scale of either axis from linear to logarithmic. Note that using logarithmic on the x-axis will only works with solve #, not date


## Histogram tab
![Histogram Tab Screenshot](/resources/previews/histTabV2.png)
This tab shows a histogram of the solve times for the selected session

As with the graph tab, you can click and drag to zoom in on the histogram and double click to zoom out

There is an input on the left to change the column width for the histogram (default 1 second) and a button to reset it to default 

**Sliding window animation:** 

https://github.com/user-attachments/assets/d34a4899-f104-4be6-8c78-8b62e41a2e31

The sliding window animation panel will create a histogram for a certain sized window of solves (ex. 1000 solves) and animate the 
change as this moves from your first 1000 solves to your latest 1000 solves. There are options to change settings for the animation, such as the column width (in seconds), 
the amount of solves in the window, the step by which the window increments each frame, the length of the x-axis, and the delay between each frame

**Creation animation:** 

https://github.com/user-attachments/assets/508088d9-2317-44e1-ac9d-1cd030e7e45d

The creation animation panel shows how the histogram evolved as more and more solves were added into it. There are settings to change 
the column width (in seconds), the amount of solves added each frame, and the length of the x-axis

*Future updates will implement the ability to graph histogram for all series (ao5,ao12,...) instead of just single, 
option to display an approximate bell curve of the histogram distribution, and a way select a range of solves (ex. last 500 solves) instead of all of them*

## Statistics Tab
![Screenshot 2025-05-13 193951](/resources/previews/statsTabV2.png)
This tab displays data about your pbs for the selected session

Currently displays a table of the pbs with columns for the solve time, solve date, how long it took to beat the pb, solve #, and how many solves it took to beat the pb

*Future updates will implement the ability to view pbs for all series (ao5, ao100,...) instead of just single, and tools for visualizing other statistics 
such as standard deviation, relative standard deviation, time spent, and predictions about your improvement after some amout of time/solves*
