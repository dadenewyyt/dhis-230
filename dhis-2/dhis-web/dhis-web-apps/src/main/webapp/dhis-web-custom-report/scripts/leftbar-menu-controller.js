var customReport = angular.module('customReport');

customReport.controller('LeftBarMenuController', function($scope, $location) {
    
    $scope.showDataSetReport = function(){        
        $location.path('/report').search();
    };
    
    $scope.showReportCompleteness = function(){        
        $location.path('/completeness').search();
    };
    
    $scope.showReportTimeliness = function(){        
        $location.path('/timeliness').search();
    };
    
});