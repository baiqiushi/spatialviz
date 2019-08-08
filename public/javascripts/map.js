angular.module("pinmap.map", ["leaflet-directive", "pinmap.common"])
  .controller("MapCtrl", function($scope, $timeout, leafletData, moduleManager) {

    $scope.times = [];
    $scope.timestamps = {};

    $scope.resultCount = 0;
    $scope.east = 0;
    $scope.west = 0;
    $scope.south = 0;
    $scope.north = 0;

    $scope.approach = "";

    $scope.ws = new WebSocket("ws://" + location.host + "/ws");
    $scope.pinmapMapResult = [];

    $scope.choose = function() {
        console.log("current mode: " + $scope.mode);
        $scope.approach = $scope.mode;
        $scope.cleanPinMap();
        $scope.sendQuery();
    }

    $scope.sendQuery = function(e) {
        $scope.east = $scope.map.getBounds().getEast();
        $scope.west = $scope.map.getBounds().getWest();
        $scope.south = $scope.map.getBounds().getSouth();
        $scope.north = $scope.map.getBounds().getNorth();
        console.log("east =", $scope.east);
        console.log("west =", $scope.west);
        console.log("south =", $scope.south);
        console.log("north =", $scope.north);
        console.log("mode =", $scope.approach);
        console.log("start =", e.start);
        console.log("end =", e.end);
        $scope.resultCount = 0;
        var query = {start: e.start, end: e.end};
        query["x0"] = $scope.west;
        query["y0"] = $scope.south;
        query["x1"] = $scope.east;
        query["y1"] = $scope.north;
        query["mode"] = $scope.approach;
        $scope.timestamps.t0 = Date.now();
        console.log("sending query:");
        console.log(query);
        $scope.ws.send(JSON.stringify(query));
    };

    $scope.waitForWS = function() {

      if ($scope.ws.readyState !== $scope.ws.OPEN) {
        window.setTimeout($scope.waitForWS, 1000);
      }
      else {
        $scope.sendQuery({start: $scope.start, end: $scope.end});
        moduleManager.publishEvent(moduleManager.EVENT.WS_READY, {});
      }
    };

    // setting default map styles, zoom level, etc.
    angular.extend($scope, {
      tiles: {
        name: 'Mapbox',
        url: 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
        type: 'xyz',
        options: {
          accessToken: 'pk.eyJ1IjoiamVyZW15bGkiLCJhIjoiY2lrZ2U4MWI4MDA4bHVjajc1am1weTM2aSJ9.JHiBmawEKGsn3jiRK_d0Gw',
          id: 'jeremyli.p6f712pj'
        }
      },
      controls: {
        custom: []
      }
    });

    // initialize the leaflet map
    $scope.init = function() {
      leafletData.getMap().then(function (map) {
        $scope.map = map;
        $scope.bounds = map.getBounds();
        //making attribution control to false to remove the default leaflet sign in the bottom of map
        map.attributionControl.setPrefix(false);
        map.setView([$scope.lat, $scope.lng], $scope.zoom);
        //get bounding box of current map
        $scope.east = map.getBounds().getEast();
        $scope.west = map.getBounds().getWest();
        $scope.south = map.getBounds().getSouth();
        $scope.north = map.getBounds().getNorth();
        //set default query mode
        $scope.approach = "mrv";
        //set default query time
        $scope.start = "2009-01-01 00:00:00"
        $scope.end = "2009-01-31 23:59:59"
        //get bounding box and redraw the points when zooming and panning
        map.on('moveend', function() {
            moduleManager.publishEvent(moduleManager.EVENT.CHANGE_ZOOM_OR_REGION, {start: $scope.start, end: $scope.end});
        });
      });

      //Reset Zoom Button
      var button = document.createElement("a");
      var text = document.createTextNode("Reset");
      button.appendChild(text);
      button.title = "Reset";
      button.href = "#";
      button.style.position = 'inherit';
      button.style.top = '10%';
      button.style.left = '1%';
      button.style.fontSize = '14px';
      var body = document.body;
      body.appendChild(button);
      button.addEventListener("click", function () {
        $scope.map.setView([$scope.lat, $scope.lng], $scope.zoom);
      });

      //Query Mode Dropdown List
      var dropdown = document.createElement("select");
      dropdown.append(new Option("Raw Data", "raw data", false, false));
      dropdown.append(new Option("MRV", "mrv", true, true));
      dropdown.style.cssFloat = "right";
      dropdown.style.position = 'relative';
      dropdown.style.display = "inline-block";
      body.appendChild(dropdown);
      dropdown.addEventListener("change", function () {
          $scope.approach = this.value;
          $scope.cleanPinMap();
          $scope.sendQuery({start: $scope.start, end: $scope.end});
      });

      $scope.waitForWS();
      moduleManager.subscribeEvent(moduleManager.EVENT.CHANGE_ZOOM_OR_REGION, function(event) {
        $scope.cleanPinMap();
        $scope.sendQuery({start: event.start, end: event.end});
      });
      moduleManager.subscribeEvent(moduleManager.EVENT.CHANGE_TIME_SERIES_RANGE, function(event) {
          $scope.start = event.start;
          $scope.end = event.end;
          $scope.cleanPinMap();
          $scope.sendQuery({start: event.start, end: event.end});
      });
    };

    $scope.handleResult = function(resultSet) {
      if(resultSet.length > 0) {
        $scope.pinmapMapResult = resultSet;
        $scope.resultCount = $scope.pinmapMapResult.length;
        moduleManager.publishEvent(moduleManager.EVENT.CHANGE_RESULT_COUNT, {resultCount: $scope.resultCount});
        $scope.timestamps.t9 = $scope.drawPinMap($scope.pinmapMapResult);
      }
    };

    $scope.ws.onmessage = function(event) {
      $timeout(function() {
        $scope.timestamps.t7 = Date.now();

        const response = JSONbig.parse(event.data);

        $scope.timestamps.t8 = Date.now();

        console.log("query: " + response.query);
        console.log("query time: " + response.time / 1000000 + "ms");

        // console.log("ws.onmessage <= " + JSON.stringify(response));

        $scope.timestamps.length = response.length;
        $scope.timestamps.t1 = response.t1;
        $scope.timestamps.T2 = response.T2;
        $scope.timestamps.T3 = response.T3;
        $scope.timestamps.T45 = response.T45;
        $scope.timestamps.T45i = response.T45i;
        $scope.timestamps.T6 = response.T6;
        $scope.timestamps.t6 = response.t6;

        $scope.handleResult(response.result);

        $scope.timestamps.keyword = $scope.keyword;
        $scope.times.push([
          $scope.keyword, // keyword
          $scope.timestamps.length,
          $scope.timestamps.t1 - $scope.timestamps.t0, // T1
          $scope.timestamps.T2, // T2
          $scope.timestamps.T3, // T3
          $scope.timestamps.T45, // T4+T5
          $scope.timestamps.T45i, //T-insert
          $scope.timestamps.T6, // T6
          $scope.timestamps.t7 - $scope.timestamps.t6, // T7
          $scope.timestamps.t8 - $scope.timestamps.t7, // T8
          $scope.timestamps.t9 - $scope.timestamps.t8, // T9
          $scope.timestamps.t7 - $scope.timestamps.t0 // T1 + T2 + ... + T7
        ]);

        //console.log(JSON.stringify($scope.timestamps));
        //console.log(JSON.stringify($scope.times));
      });
    };

    // function for drawing pinmap
    $scope.drawPinMap = function(result) {

      //To initialize the points layer
      if (!$scope.pointsLayer) {
        $scope.pointsLayer = new WebGLPointLayer();
        $scope.pointsLayer.setPointSize(3);
        $scope.pointsLayer.setPointColor(0, 0, 255);
        $scope.map.addLayer($scope.pointsLayer);
        $scope.points = [];
      }

      //Update the points data
      if (result.length > 0) {
          $scope.points = [];
          for (var i = 0; i < result.length; i++) {
              $scope.points.push([result[i][1], result[i][0], i]);
          }
          console.log("drawing points size = " + $scope.points.length);
          // console.log($scope.points);
          return $scope.pointsLayer.appendData($scope.points);
      }

      return 0;
    };

    $scope.cleanPinMap = function() {
      $scope.points = [];
      if($scope.pointsLayer != null) {
        $scope.map.removeLayer($scope.pointsLayer);
        $scope.pointsLayer = null;
      }
    };
  })
  .directive("map", function () {
    return {
      restrict: 'E',
      scope: {
        lat: "=",
        lng: "=",
        zoom: "="
      },
      controller: 'MapCtrl',
      template:[
        '<leaflet lf-center="center" tiles="tiles" events="events" controls="controls" width="100%" height="100%" ng-init="init()"></leaflet>'
      ].join('')
    };
  });


angular.module("pinmap.map")
  .controller('CountCtrl', function($scope, moduleManager) {
    $scope.resultCount = 0;

    moduleManager.subscribeEvent(moduleManager.EVENT.CHANGE_RESULT_COUNT, function(e) {
      $scope.resultCount = e.resultCount;
    })
  });
