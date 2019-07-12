var phem = angular.module('phem');

phem.controller('LeftBarMenuController', function($scope, $location) {
    
    $scope.showDataSetReport = function(){        
        $location.path('/report').search();
    };
    
    $scope.showReportRate = function(){        
        $location.path('/reportRate').search();
    };    
});