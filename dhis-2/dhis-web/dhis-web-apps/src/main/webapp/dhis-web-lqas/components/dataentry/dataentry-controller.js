var lqas = angular.module('lqas');

//Controller for settings page
lqas.controller('dataEntryController',
        function($scope, 
        MetaDataService,
        PeriodService
        ) {
            $scope.dataEntryTitle = 'lqas_dataentry';
            $scope.moh  = 'Federal Ministry of Health';
            $scope.model = {
                selectedDataSet: null, 
                dataValues: {},
                periods: [],
                selectedPeriod: null
            };
            
            $scope.maxOptionSize = 30;
            
            MetaDataService.get( '/dataSets.json?fields=id,displayName,periodType,openFuturePeriods,organisationUnits[id],dataSetElements[dataElement[id,displayName]]&paging=false').then(function(response){
                $scope.dataSets = response.dataSets;
            });
            
            //watch for selection of org unit from tree
    $scope.$watch('selectedOrgUnit', function() {
        if( angular.isObject($scope.selectedOrgUnit)){
            $scope.filteredDataSets = [];
            angular.forEach($scope.dataSets, function(dataSet){
                if( dataSet.organisationUnits.length > 0 ){
                    angular.forEach(dataSet.organisationUnits, function(ou){
                        if( ou.id === $scope.selectedOrgUnit.id ){
                            $scope.filteredDataSets.push( dataSet );
                        }
                    });
                }
                
            });
            
        }
    });
    
    $scope.$watch('model.selectedDataSet', function() {
        if( angular.isObject($scope.model.selectedDataSet)){
            var opts = {
                periodType: $scope.model.selectedDataSet.periodType,
                periodOffset: 0,
                futurePeriods: $scope.model.selectedDataSet.openFuturePeriods,
                dataSetType: $scope.model.selectedDataSet.DataSetCategory
            };
            
            $scope.model.periods = PeriodService.getPeriods( opts );
        }
    });
});
