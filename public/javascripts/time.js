angular.module("pinmap.time", ["pinmap.map", "rzSlider", "ui.bootstrap"])
    .controller('TimeCtrl', function($scope, moduleManager) {
        var start = new Date(2009, 0, 1, 0, 0, 0);
        var end = new Date(2009,1,1, 0, 0, 0);
        var interval = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes(), start.getSeconds());
        var intervalArray = [];
        while (interval <= end) {
            intervalArray.push(interval);
            interval = new Date(interval.getFullYear(), interval.getMonth(), interval.getDate(), interval.getHours() + 12, interval.getMinutes(), interval.getSeconds());
        }
        $scope.slider = {
            minValue: intervalArray[0],
            maxValue: intervalArray[intervalArray.length-1],
            options: {
                showTicks: true,
                stepsArray: intervalArray,
                draggableRange: true,
                translate: function(interval) {
                    if (interval != null)
                    {
                        var interval_date = new Date(interval.getFullYear(), interval.getMonth(), interval.getDate(), interval.getHours() - 8, interval.getMinutes(), interval.getSeconds())
                        return interval_date.toUTCString();
                    }
                    return '';
                },
                onEnd: function () {
                    var start = $scope.slider.minValue;
                    var start_date = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours() - 8, start.getMinutes(), start.getSeconds())
                    var end = $scope.slider.maxValue;
                    var end_date = new Date(end.getFullYear(), end.getMonth(), end.getDate(), end.getHours() - 8, end.getMinutes(), end.getSeconds());
                    $scope.start = start_date.toISOString();
                    $scope.end = end_date.toISOString();
                    moduleManager.publishEvent(moduleManager.EVENT.CHANGE_TIME_SERIES_RANGE, {start: $scope.start, end: $scope.end});
                }
            }
        };
    });