$(function() {

    // Hide the loading animation as soon as the DOM is ready.
    $('.loading').hide();

    var navListItems = $('.nav li'),
        rawTabs = $('#raw_selector').find('li a'),
        navItems = navListItems.find('a'),
        contentContainers = $('.mainContent'),
        rawContentContainers = $('.rawdata-display'),
        rawHeadings = $('.raw_heading'),
        newTab = $('.newtab');

    var showContainer = function(anchor) {
        // Get the id of the container to show from the href.
        var containerId = anchor.attr('href'),
            container = $(containerId);

        container.show();
    };

    newTab.click(function(event) {
        var url = $(this).attr('href');
        event.preventDefault();

        window.open(url);
    });

    // Handle clicks on the main presistent header
    navItems.click(function(event) {
        event.preventDefault();
        // Ensure all content containers are hidden.
        contentContainers.hide();
        // Remove the active class from all links
        navItems.removeClass('active');
        // Set the clicked links to active
        $(this).addClass('active');

        showContainer($(this));
    });

    // Handle tab clicks on the raw data view
    rawTabs.click(function(event) {
        event.preventDefault();
        // Ensure all content containers are hidden.
        rawContentContainers.hide();
        rawHeadings.hide();

        // Deactivate all tabs
        rawTabs.removeClass('active');
        // Set the clicked anchor to active
        $(this).addClass('active');

        showContainer($(this), true);
        $($(this).attr('href') + '_heading').show();
    });

    // Show and hide the statistics for viewports less than 768px
    var showStatistics = $('#showstats'),
        statsBox = $('.statsBox'),
        statsBoxSection = $('.statsBoxSection');

    showStatistics.click(function(event) {
        event.preventDefault();

        statsBox.toggleClass('show');
        statsBoxSection.toggleClass('show');
    });

    // Tip Boxes
    // Handle close button clicks on tip boxes
    $(".closeTip").mouseup(function() {
        var tipBox = $(this).parent();
        tipBox.hide("slow");
    });

    // Collapse and Expand Tip Box
    $(".tipBox-header").click(function() {
        var tipboxContent = $(this).next(".tipBox-content");

        tipboxContent.toggleClass("collapse");
        $(this).find(".expanderArrow").toggleClass("collapse");
        tipboxContent.find(".buttonRow").toggleClass("collapse");
    });

    var waitr = 0;
    // Using a self executing function with a setTimeout
    // to ensure we do not attempt to use the payload
    // before it is ready.
    (function waitForPayload() {
        if(payload) {
            showTipboxes(payload);
            return;
        }
        waitr = setTimeout(waitForPayload, 500);
    })();

//------------------------------------------
    
/*    var drawGraph = function(median) {

        var graphData = getAllStartupTimes(median),
            options = {
                colors: ['#50B432'],
                series: {
                    points: {
                        show: true,
                        radius: 5
                    }
                },
                xaxis: {
                    mode: 'time',
                    ticks: graphData.dateCount,
                    show: true
                }
            },
            graphContainer = $('.graph'),
            graph = $.plot(graphContainer, [graphData.startupTimes], options);

        // We are drawing a graph so show the Y-label
        $('.yaxis-label').show();
    }, */
    var drawGraph = function(median) {
        if(median) {
            drawAverageGraph();
        } else {
            drawAllGraph();
        }
    },
    
    
    drawAverageGraph = function() {
        // Minimum height of y axis: 5 seconds 
        var Y_MIN_HEIGHT = 5, 
            // Minimum number of dates on the x axis: 2 weeks 
            X_MIN_DAYS = 14, 
            // Desired number of ticks on the y axis 
            Y_NUM_TICKS = 5,
            // Desired number of ticks on the y axis for outliers
            Y_NUM_TICKS_OUT = 2,
            // Minimum point radius 
            MIN_POINT_RAD = 2.5,  
            // Maximum point radius 
            MAX_POINT_RAD = 5, 
            // Proportion of space allocated to a single day that the point radius should take
            POINT_DAY_PROP = 0.5, 
            // Proportion of space allocated to a single day that the crash point radius should take
            CRASH_DAY_PROP = 0.9, 
            // Radius parameter for rounded corners for crash indicators
            CRASH_RX = 4, 
            // Max number of crashes to be registered on the colour scale 
            // Higher numbers of crashes will be capped at this 
            CRASH_NUM_CAP = 10, 
            // Range to specify for the crash colour scale
            CRASH_COL_RANGE = ["#ffc966", "#4c0000"], 
            // Height of crash indicator arrow
            CRASH_ARROW_HEIGHT = 5,
            // Width of crash indicator arrow as a proportion of crash indicator width. 
            CRASH_ARROW_WIDTH_PROP = 0.5,
            // Proportion of plot height that should be dedicated to outliers, if any. 
            OUTLIER_PLOT_PROP = 0.25;
            // Width of domain to use for outlier plots with a single point (in seconds). 
            // OUTLIER_DOMAIN_WIDTH = 3;
            
        // Sizes in px: 
            // Space to allocate for the x axis (ticks and labels)
        var xAxisPadding = 20, 
            // Padding allocated for the y axis with ticks, but excluding labels. 
            // yAxisBasePadding = 10,
            // yAxisPadding = yAxisBasePadding,
            // Horizontal padding to allocate for the y axis (computed based on tick labels). 
            yAxisPadding,
            // Padding to add per digit on the y-axis labels
            perDigitPadding = 7,
            // Vertical amount by which the top of the plot (and the y axis) should exceed the highest datapoint.
            plotTopPadding = 20, 
            // Vertical amount by which the top of the outlier plot (and the y axis) should exceed the highest datapoint.
            outlierPlotTopPadding = 15, 
            // Padding between the left and right edges of the plot and the first and last days
            datePadding = 20, 
            // Vertical space to allocate for crash indicator
            crashHeight = 20, 
            // Vertical space to add between main plot and outlier plot, if any. 
            outlierGap = 15, 
            // Padding to add at top of entire plot - primarily to stop top axis label getting cut off. 
            topPadding = 5;
            
            
        // *****
        // Diagnostic. 
        var inspectData = function(dataArray) {
            for(var i=0; i < dataArray.length; i++) { 
                var str = "";
                for(var k in dataArray[i]) {
                    str += k + ": " + dataArray[i][k] + ",  ";
                }
                console.log(str);
                str = "";
                for(var k in dataArray[i].updates) {
                    str += k + ": " + dataArray[i].updates[k] + ",  ";
                }
                console.log(str);
            }
        };
        // *****
        
        
        //--------------------------------
        
        // Retrieve data to be plotted. 
        var graphData = getGraphData(true);
        // Dates are interpreted as midnight GMT. Change to midnight local time for display purposes. 
        graphData.forEach(function(d) { d.date = d3.time.day(d.date); });
    
        // for(var k in graphData) {
            // console.log(graphData[k].date + ": " + graphData[k].events.updateTo);
        // }
        
        // inspectData(graphData);
        
        // Remove dates with medTime undefined or null 
        // (means that there was no appSessions.previous for that day). 
        var startupData = graphData.filter(function(d) { return typeof d.medTime !== "undefined" && d.medTime !== null; });
        
        // Outlier detection. 
        // Output will be an array containing indices of elements in the original array that should be considered outliers, if any. 
        var outliers = (function(data) {
            // The number of values flagged as outliers should not be more than this proportion of the data. 
            var MAX_PROP_OUTLIERS = 0.1;
            // A value is flagged as an outlier if its gap is larger than this proportion of the maximum value. 
            // var MAX_GAP_PROP = 0.7;
            var MAX_GAP_PROP = 0.51;
            
            var i, _data = data.map(function(d) { return d.value; });
            data = data.sort(function(a,b) { return a.value - b.value; });
            
            var gaps = [];
            // Compute differences between consecutive sorted values. 
            // Index refers to lower endpoint of gap. 
            for(i=1; i < data.length; i++) {
                gaps.push(data[i].value - data[i-1].value);
            }
            
            // This will now be the index of the highest value in data currently not flagged as an outlier. 
            var upper = data.length - 1;
            // The index of the lowest point to be flagged as an outlier. 
            var cutPoint = data.length;
            // If the point at index upper is flagged as an outlier, 
            // then the point at upper - 1 (the upper-th point in the array) will become 
            // the new highest point not flagged. 
            // If the number of points below upper-1 (inclusive) is less than 1 - MAX_PROP_OUTLIERS, 
            // do not consider any further points for flagging. 
            var stoppingPoint = data.length * (1 - MAX_PROP_OUTLIERS);
            // While no outliers have yet been flagged, and we have not yet considered a large enough proportion of the values: 
            while(cutPoint >= data.length && upper > stoppingPoint) {
                // Find the largest gap among the points up to and including upper. 
                var indexOfMax = gaps.lastIndexOf(Math.max.apply(null, gaps), upper - 1);
                // If this gap is large enough, and not too much data will be flagged: 
                if(gaps[indexOfMax] > data[upper].value * MAX_GAP_PROP && indexOfMax + 1 > stoppingPoint) {
                    // Flag all points above the upper endpoint of the gap (inclusive) as outliers. 
                    cutPoint = indexOfMax + 1;
                } else {
                    // Consider only points below the lower endpoint of the gap (inclusive). 
                    upper = indexOfMax;
                }
            }
            
            var outlierIndices = [];
            for( ; cutPoint < data.length; cutPoint++) {
                outlierIndices.push(_data.indexOf(data[cutPoint].value));
            }
            
            return outlierIndices;
            
        })(startupData.map(function(d) { return { date: d.date, value: d.medTime }; }));
        
            
        // If there are outliers, isolate the outlier data. 
        var outlierData = [];
        if(outliers.length > 0) { 
            outliers.forEach(function(d) { 
                outlierData.push(startupData.splice(d, 1)[0]);
            });
        }
        
        // TODO: 
        // If outliers: plot outliers; compute plotHeight accordingly; and generate main plot (everything should scale accordingly).
        // Otherwise, compute plotHeight to fill entire space and generate main plot. 
        
        
        //--------------------------------
        
        
        // Dimensions are determined by container. 
        var graphContainer = d3.select(".graph"), 
            // Dimensions of svg container
            containerWidth = parseInt(graphContainer.style("width"), 10),
            containerHeight = parseInt(graphContainer.style("height"), 10), 
            // Total amount of space allocated to the plot area, 
            // including outlier plot, if any, and x-axis.
            totalPlotHeight = containerHeight 
                // - xAxisPadding 
                - crashHeight - topPadding, 
            // The amount by which elements of the main plot should be shifted downwards 
            // within the overall plot group. 
            // (only non-zero if outlier plot is present). 
            mainPlotOffset = 0, 
            // The heights of the individual plots, excluding axes. 
            outlierPlotHeight = 0, 
            mainPlotHeight = totalPlotHeight - xAxisPadding;
        
        // Collect bounding boxes of the y axes to calculate y axis padding. 
        var bb = [];
        
        // graphContainer.style("border", "1px solid black");
        
        // Remove any previous plot, and add new plot svg container.  
        graphContainer.selectAll("svg").remove();
        var svg = graphContainer.append("svg:svg")
                .attr("width", containerWidth + "px").attr("height", containerHeight + "px"), 
            // Add group for startup plot, to include startup times plot, outlier plot if required, and all axes. 
            startup = svg.append("g").attr("transform", "translate(0, " + topPadding + ")");
            
        // If have outliers, allocate space for extra plot. 
        if(outlierData.length > 0) {
            outlierPlotHeight = mainPlotHeight * OUTLIER_PLOT_PROP;
            mainPlotOffset = outlierPlotHeight + outlierGap;
            mainPlotHeight -= mainPlotOffset;
            
            // Compute y scale and axis to be able to get sizing. 
            var yOut = d3.scale.linear()
                // Domain should incorporate outlier values. 
                // If only a single outlier, pad domain. 
                .domain(outlierData.length > 1 ? d3.extent(outlierData, function(d) { return d.medTime; }) : 
                    [ Math.floor(outlierData[0].medTime), Math.ceil(outlierData[0].medTime) ]
                )
                .range([outlierPlotHeight - outlierPlotTopPadding, outlierPlotTopPadding]); 
                // Update scale to incorporate extra space at the top. 
                yOut.domain([yOut.invert(outlierPlotHeight), yOut.invert(0)]).range([outlierPlotHeight, 0]);
            
            var yAxisOut = d3.svg.axis()
                .scale(yOut).orient("left");
            if(outlierData.length == 1) { 
                yAxisOut.tickValues([ Math.floor(outlierData[0].medTime), Math.ceil(outlierData[0].medTime) ])
                    .tickFormat(d3.format(".0f"));
            } else { 
                yAxisOut.ticks(Y_NUM_TICKS_OUT);
            }
            
            var yaOut = startup.append("g")
                // No offset
                .attr("class", "y axis")
                .attr("id", "y-axis-out")
                .style("visibility", "hidden")
                .call(yAxisOut)
            
            bb.push(document.getElementById("y-axis-out").getBBox());
        }
        
            
        
        
            
            
        //--------------------------------
            
            
        // Compute the y scale first and generate the axis. 
        // Use the sizes of the tick labels to compute the amount of padding to leave for the y axis. 
        var y = d3.scale.linear()
            // Allocate space from 0 to maximum value in dataset. 
            // If maximum value is less than Y_MIN_HEIGHT, extend to Y_MIN_HEIGHT. 
            .domain([0, Math.max(Y_MIN_HEIGHT, d3.max(startupData, function(d) { return d.medTime; }))])
            .range([mainPlotHeight, plotTopPadding]); 
        // Update scale to incorporate extra space at the top. 
        y.domain([0, y.invert(0)]).range([mainPlotHeight, 0]);
            
        var yAxis = d3.svg.axis()
            .scale(y).orient("left")
            .ticks(Y_NUM_TICKS); 
        
        var ya = startup.append("g")
            .attr("transform", "translate(0," + mainPlotOffset + ")")
            .attr("class", "y axis")
            .attr("id", "y-axis")
            .style("visibility", "hidden")
            .call(yAxis)
            
        bb.push(document.getElementById("y-axis").getBBox());    
        // alert(d3.max(bb, function(d) { return d.width; }));
        
        // Padding should be the maximum width required by the computed y axis bounding boxes. 
        // Need computed axis so that ticks are chosen and labelled. 
        yAxisPadding = d3.max(bb, function(d) { return d.width; });
        
/*        
        // alert(yAxisPadding);
        // Get the tick labels that will be displayed on the plot. 
        var yTicks = [];
        d3.selectAll(".y.axis text").each(function(d) { yTicks.push(d); });
        // Compute y axis padding according to the maximum length of the labels. 
        // There is probably a better way to do this - depends on font size.  
        // alert(yTicks);
        yAxisPadding += perDigitPadding * d3.max(yTicks, function(d) { return d.toString().length; });
        
        // alert(yTicks.map(function(d) { return d.toString().length; }));
        // alert(d3.max(yTicks, function(d) { return d.toString().length; }));
        
        // alert(yAxisPadding);
        
*/
        // Remove y axes (re-add later so that it will be drawn on top of the background rect). 
        startup.selectAll(".y.axis").remove();
        
            
        //--------------------------------
            
        
        // Add padding to left of plot. 
        startup.attr("transform", "translate(" + yAxisPadding + ", " + topPadding + ")");
        
        var plotWidth = containerWidth - yAxisPadding;
        
        
        // startup.append("rect").style("stroke","blue")
            // .attr("width",width-yAxisPadding).attr("height",height-xAxisPadding);
            
        // Add main plot features to separate group if necessary to handle offsetting. 
        var mainPlot = outlierData.length === 0 ? startup : 
            startup.append("g").attr("transform", "translate(0," + mainPlotOffset + ")");
 
        // Add background colour.  
        mainPlot.append("rect").attr("class", "startup")
            // .attr("y", mainPlotOffset)
            .attr("width", plotWidth).attr("height", mainPlotHeight);
 
 
        if(outlierData.length > 0) {
            startup.append("rect").attr("class", "startup")
                .attr("width", plotWidth).attr("height", outlierPlotHeight);
                
            // Add gridlines as separate axis. 
            var yGridOut = d3.svg.axis().scale(yOut).orient("left").tickSize(-plotWidth); 
            var yAxisOutTickValues = yAxisOut.tickValues(); 
            if(yAxisOutTickValues == null) {
                yGridOut.ticks(Y_NUM_TICKS_OUT);
            } else {
                yGridOut.tickValues(yAxisOutTickValues);
            }

            // Add axes to plot. 
            startup.append("g").attr("class", "gridlines").call(yGridOut);
            startup.append("g").attr("class", "y axis").call(yAxisOut);
            
                
            // startup.append("g")
                // .attr("class", "y axis")
                // .call(yAxisOut);
                
            // Add dotted lines along edges of gap between plots.     
            startup.append("polyline")
                .attr("points", "0," + outlierPlotHeight + " " + plotWidth + "," + outlierPlotHeight)
                .attr("class", "boundary");
            
            mainPlot.append("polyline")
                .attr("points", "0,0 " + plotWidth + ",0")
                .attr("class", "boundary");
            
        }
        
        
            
        
        
        // Set up scale for dates on x-axis. 
        // If earliest date is less than two weeks ago, set to two weeks ago.
        var earliest = new Date(Math.min(d3.time.day(d3.time.day.offset(new Date(), -X_MIN_DAYS)), d3.min(graphData, function(d) { return d.date; })));
        var x = d3.time.scale()
            // Allocate space from earliest date in the payload until today.
            .domain([earliest, d3.time.day(new Date())])
            .range([datePadding, plotWidth - datePadding]);
        // Update scale to add padding on the left and right. 
        x.domain([x.invert(0), x.invert(plotWidth)]).range([0, plotWidth]);
        
        // Add axes. 
        // Main x-axis with ticks labelled according to prettiness. 
        var xAxis = d3.svg.axis()
            .scale(x).orient("bottom")
            .tickFormat(d3.time.format("%b %d"));
            
        
        // Add gridlines as separate axes. 
        var yGrid = d3.svg.axis().scale(y).orient("left")
            .ticks(Y_NUM_TICKS).tickSize(-plotWidth); 
            // xGrid = d3.svg.axis().scale(x).orient("bottom").tickSize(-plotWidth);
        

        // Add axes to plot. 
        mainPlot.append("g").attr("class", "gridlines").call(yGrid);
        mainPlot.append("g").attr("class", "y axis").call(yAxis);
        
        
        // Secondary x-axis to show unlabelled ticks for each day. 
        // var xAxisSub = d3.svg.axis()
            // .scale(x).orient("bottom")
            // .ticks(d3.time.days)
            // .tickFormat("");
            
     
        mainPlot.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + mainPlotHeight + ")")
            .call(xAxis)
            // .append("g").call(xAxisSub);
           
        // mainPlot.append("g")
            // // .attr("transform", "translate(0," + mainPlotOffset + ")")
            // .attr("class", "y axis")
            // .call(yAxis)
            // // .append("g").attr("class", "gridlines")
            // // .call(yAxis);
        
        
        //--------------------------------
        
        // Only retain dates with positive crash count. 
        var updatesData = graphData.filter(function(d) { return typeof d.updates !== "undefined"; });
        
        updatesData.push({ date: d3.time.day(new Date()), updates: { version: "testing" } });
        // alert(x.domain());
        
        // inspectData(updatesData);
                
        var versionUpdateAxis = d3.svg.axis().scale(x).orient("bottom")
            .tickValues(updatesData.filter(
                function(d) { return typeof d.updates.version !== "undefined"; }
            ).map(function(d) { return d.date; }))
            .tickSize(-mainPlotHeight);
            
        mainPlot.append("g").attr("class", "version-update")
            .attr("transform", "translate(0," + mainPlotHeight + ")")
            .call(versionUpdateAxis);
        
        if(outlierData.length > 0) { 
            startup.append("g").attr("class", "version-update")
            .attr("transform", "translate(0," + outlierPlotHeight + ")")
            .call(versionUpdateAxis.tickSize(-outlierPlotHeight));
        }
        
        var LABEL_H_OFFSET = 5, 
            LABEL_V_OFFSET = 12;
        
            
        // Add version labels. 
        if(outlierData.length > 0) {
            startup.selectAll(".version-label text").data(updatesData.filter(
                function(d) { return typeof d.updates.version !== "undefined"; }
            )).enter().append("text")
            .attr("class", "version-label")
            .attr("x", function(d) { return x(d.date) + LABEL_H_OFFSET; })
            .attr("y", LABEL_V_OFFSET)        
            .text(function(d) { return d.updates.version; });
        } else {
            var labels = mainPlot.selectAll(".version-label text").data(updatesData.filter(
                function(d) { return typeof d.updates.version !== "undefined"; }
            )).enter().append("text")
            .attr("class", "version-label")
            .attr("x", function(d) { return x(d.date) + LABEL_H_OFFSET; })
            .attr("y", LABEL_V_OFFSET)        
            .text(function(d) { return d.updates.version; })
            // var toRotate = [];
            // labels.each(function(d, i) { 
                // var bb = this.getBBox();
                // if (bb.x + bb.width > plotWidth) {
                    // labels[0][i].attr("fill","red");
                // } 
            // });
            .filter(function(d, i) { 
                var bb = this.getBBox();
                return bb.x + bb.width > plotWidth;
            })
            .attr("x", -LABEL_H_OFFSET)
            .attr("y", function(d) { return x(d.date) + LABEL_V_OFFSET; })
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-90)");
        }
        
        // var a = d3.selectAll(".version-label");
        // a.each(function() { alert(this.getBBox().x + this.getBBox().width > plotWidth); });
        
        
        var UPDATE_TICK_OFFSET = 5, 
            UPDATE_TICK_LENGTH = 10;
        
        
        var buildUpdateAxis = d3.svg.axis().scale(x).orient("bottom")
            .tickValues(updatesData.filter(
                function(d) { 
                    return typeof d.updates.build !== "undefined" && typeof d.updates.version === "undefined"; }
            ).map(function(d) { return d.date; }))
            .tickSize(UPDATE_TICK_LENGTH);
            
        mainPlot.append("g").attr("class", "build-update")
            .attr("transform", "translate(0," + (mainPlotHeight - UPDATE_TICK_OFFSET) + ")")
            .call(buildUpdateAxis);
        
        // if(outlierData.length > 0) { 
            // startup.append("g").attr("class", "build-update")
            // .attr("transform", "translate(0," + (outlierPlotHeight - UPDATE_TICK_OFFSET) + ")")
            // .call(buildUpdateAxis);
        // }
        
        
            
        //--------------------------------
            
        
        // Add points. 
        
        // Scale the point radius according to the horizontal space allocated per day. 
        var pointRadius = Math.min(Math.max(
            (x(d3.time.day.offset(earliest, 1)) - x(earliest)) * POINT_DAY_PROP, 
            MIN_POINT_RAD), MAX_POINT_RAD); 
                
        if(outlierData.length > 0) {
            // for(var i=0; i<outlierData.length; i++) { 
                // alert(outlierData[i].medTime + " : " + yOut(outlierData[i].medTime));
            // }
            // alert(yOut.domain()); 
            // alert(yOut.range()); 
            
            startup.selectAll("circle").data(outlierData).enter().append("circle")
                .attr("class", "startup-point")
                .attr("r", pointRadius)
                .attr("cx", function(d) { return x(d.date); })
                .attr("cy", function(d) { return yOut(d.medTime); })
            
        }
        // for(var i=0; i<startupData.length; i++) { 
            // alert(startupData[i].medTime + " : " + y(startupData[i].medTime));
        // }
        mainPlot
            // .append("g").attr("transform", "translate(0," + mainPlotOffset + ")")
            .selectAll("circle").data(startupData).enter().append("circle")
            .attr("class", "startup-point")
            .attr("r", pointRadius)
            .attr("cx", function(d) { return x(d.date); })
            .attr("cy", function(d) { return y(d.medTime); })
        
            
        //--------------------------------
            
        // Add crash indicators.         
        
        // Group for crash indicators below x axis. 
        var crashes = svg.append("g").attr("transform", 
            "translate(" + yAxisPadding + "," + (containerHeight - crashHeight) + ")");
        
        // Only retain dates with positive crash count. 
        var crashData = graphData.filter(function(d) { return d.crashCount > 0; });
        
        // Scale the point width according to the horizontal space allocated per day. 
        var pointWidth = Math.min((x(d3.time.day.offset(earliest, 1)) - x(earliest)) * CRASH_DAY_PROP, crashHeight - CRASH_ARROW_HEIGHT);
        // Width of the base of the arrow. 
        var arrowWidth = pointWidth * CRASH_ARROW_WIDTH_PROP;
                
        // Set up colour scale for crashes. 
        var crashScale = d3.scale.linear()
            // Cap maximum number of crashes to register on the scale. 
            .domain([1, CRASH_NUM_CAP])
            .range(CRASH_COL_RANGE);
        
        // Add crash indicators. 
        crashes.selectAll("rect")
            .data(crashData).enter() 
            .append("rect")
            // .attr("class", "crash-point")
            .attr("x", function(d) { return x(d.date) - pointWidth/2; })
            .attr("y", CRASH_ARROW_HEIGHT)
            .attr("width", pointWidth).attr("height", crashHeight - CRASH_ARROW_HEIGHT)
            .attr("rx", CRASH_RX)
            .style("fill", function(d) { 
                return crashScale(d.crashCount > CRASH_NUM_CAP ? CRASH_NUM_CAP : d.crashCount); 
            });
        
        // Add arrows pointing to x-axis. 
        crashes.selectAll("polygon")
            .data(crashData).enter() 
            .append("polygon")
            // .attr("class", "crash-point")
            .attr("points", function(d) { 
                return (x(d.date) - arrowWidth / 2) + "," + CRASH_ARROW_HEIGHT + " " + 
                    (x(d.date) + arrowWidth / 2) + "," + CRASH_ARROW_HEIGHT + " " + 
                    x(d.date) + ",0";
            })
            .style("fill", function(d) { 
                return crashScale(d.crashCount > CRASH_NUM_CAP ? CRASH_NUM_CAP : d.crashCount); 
            });
            
            
            // Set y axis label position relative to the height of the plot. 
            d3.select("#yaxis-label").style("top", Math.round((totalPlotHeight - xAxisPadding) / 2) + "px");
            
            
            
        
            
    },
    
    
    drawAllGraph = function() {
    
    };
   

    
/*   drawGraph = function(median) {
        var graphData = getStartupTimeInfo();
        var margin = {top: 20, right: 20, bottom: 30, left: 50};
        var width = 700 - margin.left - margin.right;
        // d3.select('.graph').style('height')
        var height = 292 - margin.top - margin.bottom;
        var x = d3.time.scale() .range([0+5, width-5]);
        var y = d3.scale.linear() .range([height-10, 0+10]);        
        var xAxis = d3.svg.axis() .scale(x) .orient("bottom").tickFormat(d3.time.format("%d-%b")).ticks(5);;
        var yAxis = d3.svg.axis() .scale(y) .orient("left");
            // .tickFormat(d3.time.format("%d/%b"));
        var line = d3.svg.line()
            .x(function(d) { return x(d.date); })
            .y(function(d) { return y(d.avgTime); });
        d3.select(".graph").style("background-color", "white");
        var svg = d3.select(".graph").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
        
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        x.domain(d3.extent(graphData, function(d) { return d.date; }));
        y.domain(d3.extent(graphData, function(d) { return d.avgTime; }));
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);
        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis);
        svg.append("path")
            .datum(graphData)
            .attr("class", "line")
            .attr("d", line);
    };
*/

//------------------------------------------
    
    clearSelectors = function(selector) {
        var graphSelectors = $(selector).find('li a');

        graphSelectors.each(function() {
            $(this).removeClass('active');
        });
    };
    
    
    $('#graph_all').click(function(event) {
        event.preventDefault();
        // Clear all currently active selectors
        clearSelectors('#graph_selector');

        // Set this selector to active
        $(this).addClass('active');
        drawGraph(false);
    });

    $('#graph_median').click(function(event) {
        event.preventDefault();
        // Clear all currently active selectors
        clearSelectors('#graph_selector');

        // Set this selector to active
        $(this).addClass('active');
        drawGraph(true);
    });

    // Conditionally show tip boxes
    function showTipboxes(payload) {
        clearTimeout(waitr);

        if(payload.data.last['org.mozilla.appInfo.appinfo'].locale === 'en-US') {
            $('#survey').show();
        }

        // User has a crashy browser
        if(getTotalNumberOfCrashes('week') > 5) {
            $('#crashyfox').show('slow');
        }

        // We need at least 5 sessions with data
        if(getSessionsCount() < 5) {
            $('#hungryfox').show('slow');
        } else {
            // We have enough data, show the graph UI
            // and draw the graph. By default, we draw
            // the average startup times.
            $('.graphbox').show();
            drawGraph(true);
        }

        // If our median startup time is greater than 20,
        // we have a slowfox
        if(calculateMedianStartupTime() > 20) {
            $('#slowfox').show('slow');
        }
    }
});
