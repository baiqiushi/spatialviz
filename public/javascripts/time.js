angular.module("pinmap.time", ["pinmap.map", "rzSlider", "ui.bootstrap"])
    .controller('TimeCtrl', function($scope, moduleManager) {
        var start = new Date(Date.UTC(2009, 0, 1, 0, 0, 0));
        var end = new Date(Date.UTC(2009,0,31, 23, 59, 59));
        var interval = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes(), start.getSeconds());
        var intervalArray = [];
        while (interval <= end) {
            intervalArray.push(interval);
            interval = new Date(interval.getFullYear(), interval.getMonth(), interval.getDate(), interval.getHours(), interval.getMinutes(), interval.getSeconds() + 1);
        }
        $scope.slider = {
            minValue: intervalArray[0],
            maxValue: intervalArray[intervalArray.length-1],
            options: {
                stepsArray: intervalArray,
                draggableRange: true,
                translate: function(interval) {
                    if (interval != null)
                        return interval.toUTCString();
                    return '';
                },
                onEnd: function () {
                    $scope.start = $scope.slider.minValue.toISOString();
                    $scope.end = $scope.slider.maxValue.toISOString();
                    moduleManager.publishEvent(moduleManager.EVENT.CHANGE_TIME_SERIES_RANGE, {start: $scope.start, end: $scope.end});
                }
            }
        };
    });