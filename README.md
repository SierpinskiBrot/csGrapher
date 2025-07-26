# csGrapher - https://sierpinskibrot.github.io/csGrapher/
 Tool for graphing and analyzing solve data from csTimer

*also supported: Acubemy.com json file*

### How to get csTimer file
![cstimer help](/resources/cstimer-export-help.jpg)

# Usage
## Graph tab
![Graph Tab Screenshot](/resources/previews/graphTabV5.png)
This tab shows a more extensive version of csTimer's graph for the selected session

Click and drag to zoom in on the graph, double click to zoom out

The buttons on the left allow you to toggle which series to see on the graph (ex. PB Single, ao5, ao100) and change their colors and thicknesses. You can add a new series with the form underneath

The buttons on the right are to edit the axes of the graph. You can choose whether to have the date or the solve # on the x axis, 
and can change the scale of either axis from linear to logarithmic. Note that using logarithmic on the x-axis will only works with solve #, not date

On the right there is also 'Power Law Analysis Mode'. This displays the power law regression of the solve data and forecasts it into the future. 


## Histogram tab
![Histogram Tab Screenshot](/resources/previews/histTabV5.png)
This tab shows a histogram of the solve times for the selected session

Click and drag to zoom in on the histogram, double click to zoom out. Switch between probability distribution and cumulative distribution with the buttons above

There is an input on the left to change the column width for the histogram and a button to reset it to 1 second.
You can manually select which range of solves to view or click a button such as '6 Months' to filter to solves done within the last 6 months 

On the right there are many statistical distributions you can overlay on your data. Two measures of goodness of fit are used, and the best fit in each regard is highlighted in yellow. 
This works with both probability distribution and cumulative distribution

**Sliding window animation:** 

https://github.com/user-attachments/assets/d34a4899-f104-4be6-8c78-8b62e41a2e31

The sliding window animation form will create a histogram for a certain sized window of solves (ex. 1000 solves) and animate the 
change as this moves from your first 1000 solves to your latest 1000 solves. There are options to change settings for the animation, such as the column width (in seconds), 
the amount of solves in the window, the step by which the window increments each frame, the length of the x-axis, and the delay between each frame

**Creation animation:** 

https://github.com/user-attachments/assets/508088d9-2317-44e1-ac9d-1cd030e7e45d

The creation animation form shows how the histogram evolved as more and more solves were added into it. There are settings to change 
the column width (in seconds), the amount of solves added each frame, and the length of the x-axis


## Statistics Tab
![Screenshot 2025-05-13 193951](/resources/previews/statsTabV5.png)
This tab displays data about your pbs for the selected session

For each pb, the table shows the solve time, date, how long it took to beat the pb, solve #, and how many solves it took to beat the pb

On the right you can see predictions about your next pb; on which solve # it will occur, the solve time, and the day on which it will occur. Underneath each of these predictions is a small graph showing the approximation used to make these predictions
