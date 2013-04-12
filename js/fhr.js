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
        // Minimum height of y axis: 5 seconds. 
        var Y_MIN_HEIGHT = 5, 
            // Minimum number of dates on the x axis: 2 weeks. 
            X_MIN_DAYS = Date.now() - TWO_WEEKS;
            
        // Padding sizes: 
        // Space to allocate for the axes
        var xAxisPadding = 20, 
            yAxisPadding = 30,
            // Padding between the left and right edges of the plot and the first and last days
            datePadding = 10,
            // Padding between the maximum value and the top edge of the plot
            valuePadding = 10;
    
        // Dimensions are determined by container. 
        var graphContainer = d3.select(".graph"), 
            width = parseInt(graphContainer.style("width"), 10),
            height = parseInt(graphContainer.style("height"), 10); 
            
        graphContainer.style("border", "1px solid black");
           
        var svg = graphContainer.append("svg:svg")
            .attr("width", width + "px").attr("height", height + "px");
        
        // Add group for startup plot. 
        var startup = svg.append("g")
            .attr("transform", "translate(" + yAxisPadding + ", 0)");
        
        // startup.append("rect").style("stroke","blue")
            // .attr("width",width-yAxisPadding).attr("height",height-xAxisPadding);
    
        var graphData = getAverageGraphData();
        
        var x = d3.time.scale()
            // Allocate space from earliest date in the payload until today.
            // If earliest date is less than two weeks ago, allocate space for two weeks. 
            .domain([Math.min(X_MIN_DAYS, d3.min(graphData, function(d) { return d.date; })), Date.now()])
            .range([0, width - yAxisPadding]);
        
        var y = d3.scale.linear()
            // Allocate space from 0 to maximum value in dataset. 
            // If maximum value is less than Y_MIN_HEIGHT, extend to Y_MIN_HEIGHT. 
            .domain([0, Math.max(Y_MIN_HEIGHT, d3.max(graphData, function(d) { return d.medTime; }))])
            .range([height - xAxisPadding, 0]);
        
        // Add axes. 
        var xAxis = d3.svg.axis()
            .scale(x).orient("bottom");
            
        var yAxis = d3.svg.axis()
            .scale(y).orient("left")
            .ticks(5);
            
        startup.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + (height - xAxisPadding) + ")")
            .call(xAxis);
            
        startup.append("g")
            .attr("class", "axis")
            .call(yAxis);
        
        // Add points. 
        startup.selectAll(".dot")
            .data(graphData).enter().append("circle")
            .attr("class", "dot")
            .attr("r", 3.5)
            .attr("cx", function(d) { return x(d.date); })
            .attr("cy", function(d) { return y(d.medTime); })
        
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
