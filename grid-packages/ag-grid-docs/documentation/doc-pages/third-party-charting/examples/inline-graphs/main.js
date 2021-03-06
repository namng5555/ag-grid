// for cell height & width
var CELL_DIMENSION_SIZE = 90;

var columnDefs = [
    { headerName: 'Symbol', field: 'Symbol', width: 85 },
    { headerName: 'Date', field: 'Date', width: 82 },
    { headerName: 'Open', field: 'Open', width: 72 },
    { headerName: 'High', field: 'High', width: 72 },
    { headerName: 'Low', field: 'Low', width: 72 },
    { headerName: 'Close', field: 'Close', width: 72 },
    {
        headerName: 'Close Trend',
        field: 'CloseTrends',
        width: 115,
        resizable: false,
        suppressSizeToFit: true,
        cellRenderer: 'lineChartLineRenderer'
    },
    {
        headerName: 'Avg Volume',
        field: 'AverageVolume',
        width: 115,
        resizable: false,
        suppressSizeToFit: true,
        cellRenderer: 'barChartLineRenderer'
    },
    {
        headerName: 'Target Exp',
        field: 'targetExpenditure',
        width: 110,
        editable: true,
        cellEditor: 'pieChartLineEditor',
        cellEditorParams: {
            segments: {
                "R&D": "#3366cc",
                "Marketing": "#dc3912",
                "Infrastructure": "#ff9900"
            },
            colToUseForRendering: "Expenditure"
        }
    },
    {
        headerName: 'Expenditure',
        field: 'Expenditure',
        width: 110,
        resizable: false,
        suppressSizeToFit: true,
        cellRenderer: 'pieChartLineRenderer',
        cellRendererParams: {
            segments: {
                "R&D": "#3366cc",
                "Marketing": "#dc3912",
                "Infrastructure": "#ff9900"
            }
        }
    }
];

var gridOptions = {
    defaultColDef: {
        sortable: true,
        resizable: true
    },
    columnDefs: columnDefs,
    rowSelection: 'single',
    rowHeight: 95,
    onCellClicked: function(params) {
        if (params.colDef.field !== "CloseTrends") {
            return;
        }
        renderLineGraph(params.data.Symbol);
    },
    components: {
        lineChartLineRenderer: LineChartLineRenderer,
        barChartLineRenderer: BarChartLineRenderer,
        pieChartLineEditor: PieChartLineEditor,
        pieChartLineRenderer: PieChartLineRenderer
    }
};

function getAllValuesInObject(obj) {
    if (!obj) { return []; }

    if (typeof Object.values === 'function') {
        return Object.values(obj);
    }

    var ret = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key) && obj.propertyIsEnumerable(key)) {
            ret.push(obj[key]);
        }
    }

    return ret;
}


function LineChartLineRenderer() {
}

LineChartLineRenderer.prototype.init = function(params) {

    var eGui = document.createElement('div');
    this.eGui = eGui;

    // sparklines requires the eGui to be in the dom - so we put into a timeout to allow
    // the grid to complete it's job of placing the cell into the browser.
    setTimeout(function() {
        var values = params.value
            .sort(function(a, b) { return new Date(a.Date).getTime() - new Date(b.Date).getTime(); })
            .map(function(datum) { return datum.Close; });
        $(eGui).sparkline(values, { height: CELL_DIMENSION_SIZE, width: CELL_DIMENSION_SIZE });
    }, 0);
};

LineChartLineRenderer.prototype.getGui = function() {
    return this.eGui;
};

function BarChartLineRenderer() {
}

BarChartLineRenderer.prototype.init = function(params) {
    var eGui = document.createElement('div');
    this.eGui = eGui;

    // sparklines requires the eGui to be in the dom - so we put into a timeout to allow
    // the grid to complete it's job of placing the cell into the browser.
    setTimeout(function() {
        var values = params.value
            .sort(function(a, b) { return a.Year - b.Year; })
            .map(function(datum) { return datum.AverageVolume.toFixed(); });
        $(eGui).sparkline(values, {
            type: 'bar',
            barColor: 'green',
            chartRangeMin: 1000000,
            barWidth: 11,
            height: CELL_DIMENSION_SIZE,
            width: CELL_DIMENSION_SIZE
        });
    }, 0);
};

BarChartLineRenderer.prototype.getGui = function() {
    return this.eGui;
};

function PieChartLineRenderer() {
}

PieChartLineRenderer.prototype.init = function(params) {

    var eGui = document.createElement('div');
    this.eGui = eGui;

    // sparklines requires the eGui to be in the dom - so we put into a timeout to allow
    // the grid to complete it's job of placing the cell into the browser.
    setTimeout(function() {

        var segments = params.segments;

        var colourToNames = _.invert(segments);
        var values = Object.keys(segments).map(function(segment) {
            return params.value[segment];
        });
        var sliceColours = getAllValuesInObject(segments);
        $(eGui).sparkline(values,
            {
                type: 'pie',
                height: CELL_DIMENSION_SIZE,
                width: CELL_DIMENSION_SIZE,
                sliceColors: sliceColours,
                tooltipFormatter: function(sparklines, options, segment) {
                    return '<div class="jqsfield"><span style="color: ' + segment.color + '"</span>' + colourToNames[segment.color] + ': ' + Math.round(segment.percent) + '%</div>';
                }
            }
        );
    });
};

PieChartLineRenderer.prototype.getGui = function() {
    return this.eGui;
};

function PieChartLineEditor() {
}

PieChartLineEditor.prototype.init = function(params) {
    this.params = params;
    this.value = this.params.value;
    this.parentGui = document.createElement('div');
    this.parentGui.style.width = CELL_DIMENSION_SIZE + 5;
    this.parentGui.style.height = CELL_DIMENSION_SIZE + 5;
    this.parentGui.style.backgroundColor = "lightblue";
    this.parentGui.style.border = "1px solid grey";
    this.parentGui.style.borderRadius = "5px";
    this.parentGui.style.paddingLeft = "5px";
    this.parentGui.style.paddingTop = "5px";

    this.eGui = document.createElement('div');

    this.parentGui.appendChild(this.eGui);
};

PieChartLineEditor.prototype.getGui = function() {
    return this.parentGui;
};

// editors have afterGuiAttached callback to know when the dom
// element is attached. so we can use this instead of using timeouts.
PieChartLineEditor.prototype.afterGuiAttached = function() {
    var segments = this.params.segments;
    var colourToNames = _.invert(segments);
    var values = Object.keys(segments).map(function(segment) {
        return this.params.node.data[this.params.colToUseForRendering][segment];
    });
    var sliceColours = getAllValuesInObject(segments);

    var thisSparkline = $(this.eGui);
    thisSparkline.sparkline(values,
        {
            type: 'pie',
            height: CELL_DIMENSION_SIZE,
            width: CELL_DIMENSION_SIZE,
            sliceColors: sliceColours,
            tooltipFormatter: function(sparklines, options, segment) {
                return '<div class="jqsfield"><span style="color: ' + segment.color + '"</span>' + colourToNames[segment.color] + ': ' + Math.round(segment.percent) + '%</div>';
            }
        }
    );

    thisSparkline.bind('sparklineClick', function(ev) {
        var segmentClicked = ev.sparklines[0].getCurrentRegionFields();
        this.value = colourToNames[segmentClicked.color];
        this.params.api.stopEditing();
    });
};

PieChartLineEditor.prototype.getValue = function() {
    return this.value;
};

PieChartLineEditor.prototype.isPopup = function() {
    return true;
};

PieChartLineEditor.prototype.destroy = function() {
};

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', function() {
    var gridDiv = document.querySelector('#myGrid');
    new agGrid.Grid(gridDiv, gridOptions);

    agGrid.simpleHttpRequest({ url: 'https://www.ag-grid.com/example-assets/stocks/summary-expanded.json' })
        .then(function(data) {
            gridOptions.api.setRowData(data);
        });
});

function renderLineGraph(symbol) {
    agGrid.simpleHttpRequest({ url: 'https://www.ag-grid.com/example-assets/stocks/' + symbol + '-close-trend.json' })
        .then(function(responseData) {
            var noRowsMessage = document.querySelector('.centerInline');
            noRowsMessage.style.display = "None";

            var svg = d3.select("#detailInline");
            svg.selectAll("*").remove();

            var parseTime = d3.timeParse("%d-%b-%y");
            var margin = { top: 20, right: 20, bottom: 30, left: 50 },
                width = +svg.attr("width") - margin.left - margin.right,
                height = +svg.attr("height") - margin.top - margin.bottom,
                g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var x = d3.scaleTime()
                .rangeRound([0, width]);

            var y = d3.scaleLinear()
                .rangeRound([height, 0]);

            var line = d3.line()
                .x(function(d) {
                    return x(d.Date);
                })
                .y(function(d) {
                    return y(d.Close);
                });

            var data = responseData
                .map(function(datum) {
                    return {
                        Date: parseTime(datum.Date),
                        Close: +datum.Close
                    };
                });
            x.domain(d3.extent(data, function(d) {
                return d.Date;
            }));
            y.domain(d3.extent(data, function(d) {
                return d.Close;
            }));

            g.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x))
                .select(".domain");

            g.append("g")
                .call(d3.axisLeft(y))
                .append("text")
                .attr("fill", "#000")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", "0.71em")
                .attr("text-anchor", "end")
                .text("Cost ($)");

            g.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .attr("stroke-width", 1.5)
                .attr("d", line);
        });
}
