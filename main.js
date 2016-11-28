//Initialize global variables for charting

//Data is used to store all polled objects for filtering
var data = [];
//Used to store time/pricing data for chart
var dataPoints = [];
//Default set to us-west, generalCurrentGen, and m3.medium
var region = "us-west";
var instanceType = "generalCurrentGen";
var size = "m3.medium";
var time = new Date();
var chart = [];
//This will be the first pricing object, used as a guide for filtering
var filter = [];

window.onload = function () {        
  chart = new CanvasJS.Chart("chartContainer",{
    zoomEnabled: true,
    title: {
      text: "AWS Spot Pricing"    
    },
    toolTip: {
      shared: true
    },
    legend: {
      verticalAlign: "top",
      horizontalAlign: "center",
      fontSize: 14,
      fontWeight: "bold",
      fontFamily: "calibri",
      fontColor: "dimGrey"
    },
    axisX: {
      title: ""
    },
    axisY:{
      prefix: '$',
      title: "Spot Price",
      includeZero: false
    }, 
    data: [{ 
      type: "line",
      xValueType: "dateTime",
      showInLegend: true,
      name: "spot-price",
      dataPoints: dataPoints
    }],
  });

  //Polls every 10 seconds
  var updateInterval = 10000;

  var updateChart = function() {
    time = new Date();

    //Verify that price exists otherwise default to 0
    var dataPoint = 0;
    if(!isNaN(data[data.length-1][region][instanceType][size])) {
      dataPoint = parseFloat(data[data.length-1][region][instanceType][size]);
    }
    
    
    //Pushing the new values
    dataPoints.push({
      x: time.getTime(),
      y: dataPoint
    });

    //Update chart legend
    chart.options.data[0].legendText = region + " " + instanceType + " " + size;

    chart.render();
  };

  var pollData = function() {
    $.ajax({
      url: "http://spot-price.s3.amazonaws.com/spot.js",
      dataType: "jsonp",
      jsonpCallback: 'callback',
      cache: false, //Caching set to false, but caching may be occuring server side
      headers: {
        'Cache-Control': 'no-cache'
      },
      success: function( response ) {
          var point = {};

          //Map inner arrays to key/value for easier O(1) access for filtering
          for(var i = 0; i < response.config.regions.length; i++) {
            var region = response.config.regions[i].region;
            point[region] = {};

            for(var j = 0; j < response.config.regions[i].instanceTypes.length; j++) {
              var instanceType = response.config.regions[i].instanceTypes[j].type;
              point[region][instanceType] = {};

              for(var k = 0; k < response.config.regions[i].instanceTypes[j].sizes.length; k++) {
                var size = response.config.regions[i].instanceTypes[j].sizes[k].size;
                var price = 0;
                for(var l = 0; l < response.config.regions[i].instanceTypes[j].sizes[k].valueColumns.length; l++) {
                  if(response.config.regions[i].instanceTypes[j].sizes[k].valueColumns[l].name === "linux") {
                    price = response.config.regions[i].instanceTypes[j].sizes[k].valueColumns[l].prices.USD;
                  }
                }
                point[region][instanceType][size] = price;
              }
            }
          }

          data.push(point);

          //Initialize first spot price
          if(data.length == 1) {
            //If found first point, initialize filter
            filter = data[0];
            initializeDefault();
          }

          updateChart();
      }
    });

  };

  //Generates first set of dataPoints
  pollData();
   
  //Update chart after specified interval 
  setInterval(
    function(){
      pollData();
    }, updateInterval);
};

//Filter region and populate instance and size dropdowns
var filterRegion = function() {
  var selectedRegion = $("#region").val();
  var instanceTypes = Object.keys(filter[selectedRegion]);
  var sizes = Object.keys(filter[selectedRegion][instanceTypes[0]]);

  $('#instance').empty();
  $.each(instanceTypes, function(key, value) {
    $('#instance').append($("<option></option>")
                .attr("value",value)
                .text(value));
    if(instanceTypes[0] === value) {
      $('#instance').val(value);
    }
  });

  $('#size').empty();
  $.each(sizes, function(key, value) {
    $('#size').append($("<option></option>")
                  .attr("value",value)
                  .text(value));
  });

};

//Filter instance and populate size dropdown
var filterInstanceType = function() {
  var selectedRegion = $('#region').val();
  var selectedInstance = $('#instance').val();

  var sizes = Object.keys(filter[selectedRegion][selectedInstance]);
  $('#size').empty();
  $.each(sizes, function(key, value) {
    $('#size').append($("<option></option>")
                  .attr("value",value)
                  .text(value));
  });

};

//Filter results and change values in datapoints
var filterResults = function() {
  region = $('#region').val();
  instanceType = $('#instance').val();
  size = $('#size').val();

  $.each(data, function(key, value) {
    var dataPoint = 0;
    if(!isNaN(value[region][instanceType][size])) {
      dataPoint = parseFloat(value[region][instanceType][size]);
    }
    dataPoints[key].y = dataPoint;
  });

  chart.options.data[0].legendText = region + " " + instanceType + " " + size;
  chart.render();
};


//Initialize graph and filter details
var initializeDefault  = function() {
  var regions = Object.keys(filter);
  var instanceTypes = Object.keys(filter[region]);
  var sizes = Object.keys(filter[region][instanceType]);

  //Set up default 
  $.each(regions, function(key, value) {
    $('#region').append($("<option></option>")
                .attr("value",value)
                .text(value));
    if(region === value) {
      $('#region').val(value);
    }
  });

  $.each(instanceTypes, function(key, value) {
    $('#instance').append($("<option></option>")
                .attr("value",value)
                .text(value));
    if(instanceType === value) {
      $('#instance').val(value);
    }
  });

  $.each(sizes, function(key, value) {
    $('#size').append($("<option></option>")
                  .attr("value",value)
                  .text(value));
    if(size === value) {
      $('#size').val(value);
    }
  });
};