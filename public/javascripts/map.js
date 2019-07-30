angular.module("pinmap.map", ["leaflet-directive", "pinmap.common"])
  .controller("MapCtrl", function($scope, $timeout, leafletData, moduleManager) {

    $scope.times = [];
    $scope.timestamps = {};

    $scope.resultCount = 0;
    $scope.east = 0;
    $scope.west = 0;
    $scope.south = 0;
    $scope.north = 0;

    $scope.ws = new WebSocket("ws://" + location.host + "/ws");
    $scope.pinmapMapResult = [];

    $scope.sendQuery = function() {
        console.log("east =", $scope.east);
        console.log("west =", $scope.west);
        console.log("south =", $scope.south);
        console.log("north =", $scope.north);
        $scope.resultCount = 0;
        var query = {start: "2009-01-01 00:00:00", end: "2009-01-31 23:59:59"};
        query["x0"] = $scope.west;
        query["y0"] = $scope.south;
        query["x1"] = $scope.east;
        query["y1"] = $scope.north;
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
        $scope.sendQuery();
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
        //get bounding box and redraw the points when the map is moved
        map.on('moveend', function() {
            $scope.east = map.getBounds().getEast();
            $scope.west = map.getBounds().getWest();
            $scope.south = map.getBounds().getSouth();
            $scope.north = map.getBounds().getNorth();
            $scope.cleanPinMap();
            $scope.sendQuery();
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

      $scope.waitForWS();
      moduleManager.subscribeEvent(moduleManager.EVENT.CHANGE_ZOOM_LEVEL, function(event) {
        $scope.cleanPinMap();
        $scope.sendQuery();
      });
    };

    $scope.handleResult = function(resultSet) {
      if(resultSet.length > 0) {
        $scope.pinmapMapResult = resultSet;
        $scope.resultCount += $scope.pinmapMapResult.length;
        moduleManager.publishEvent(moduleManager.EVENT.CHANGE_RESULT_COUNT, {resultCount: $scope.resultCount});
        $scope.timestamps.t9 = $scope.drawPinMap($scope.pinmapMapResult);
      }
    };

    $scope.ws.onmessage = function(event) {
      $timeout(function() {
        $scope.timestamps.t7 = Date.now();

        const response = JSONbig.parse(event.data);

        $scope.timestamps.t8 = Date.now();

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
        $scope.pointsLayer.setPointSize(0.5);
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