/* global angular */

'use strict';

var customReport = angular.module('customReport');

//Controller for settings page
customReport.controller('dataEntryController',
        function($scope,
                orderByFilter,
                SessionStorageService,
                PeriodService,
                MetaDataFactory,
                CustomFormService,
                DataElementGroupFactory,
                Analytics,
                ModalService,
                DialogService) { 
    $scope.periodOffset = 0;    
    $scope.model = {dataSets: [],
                    categoryCombos: [],
                    periods: [],
                    selectedPeriods: [],
                    includeChildren: false,
                    periodTypes: [],
                    columns: [],
                    reportReady: false,
                    reportStarted: false,
                    showReportFilters: true,                    
                    selectedPeriodType: null,
                    valueExists: false};
    
    var resetParams = function()
    {
        $scope.model.periods = [];
        $scope.model.dataSets = [];
        $scope.model.selectedDataSet = null;
        $scope.model.selectedPeriods = [];
        $scope.model.includeChildren = false;
        $scope.model.selectedPeriodType = null;
        $scope.model.valueExists = false;
        $scope.model.reportReady = false;
        $scope.model.reportStarted = false;
        $scope.model.showReportFilters = true;
    };
    //watch for selection of org unit from tree
    $scope.$watch('selectedOrgUnit', function() {
        
        resetParams();
        if( angular.isObject($scope.selectedOrgUnit)){
            SessionStorageService.set('SELECTED_OU', $scope.selectedOrgUnit);
            MetaDataFactory.getAll('dataSets').then(function(ds){
                $scope.model.dataSets = ds;
                
                MetaDataFactory.getAll('periodTypes').then(function(pts){
                    pts = orderByFilter(pts, '-frequencyOrder').reverse();
                    $scope.model.periodTypes = pts;
                    MetaDataFactory.getAll('categoryCombos').then(function(ccs){
                        angular.forEach(ccs, function(cc){
                            $scope.model.categoryCombos[cc.id] = cc;
                        });
                        
                        DataElementGroupFactory.getNonControllingDataElementGroups().then(function (degs) {
                            $scope.dataElementGroups = degs;
                        });
                    });
                });
            });
        }
    });
    
    $scope.$watch('model.selectedPeriodType', function(){
        $scope.model.periods = [];
        $scope.model.reportReady = false;
        $scope.model.reportStarted = false;
        if( angular.isObject( $scope.model.selectedPeriodType ) && $scope.model.selectedPeriodType.name ) {
            var opts = {
                periodType: $scope.model.selectedPeriodType.name,
                periodOffset: $scope.periodOffset,
                futurePeriods: true
            };
            $scope.model.periods = PeriodService.getPeriods( opts );
        }
    });
    
    $scope.$watch('model.selectedDataSet', function(){
        $scope.model.dataElements = [];
        $scope.model.reportReady = false;
        $scope.model.reportStarted = false;
        $scope.model.indicators = [];
        if( angular.isObject( $scope.model.selectedDataSet ) ) {
            
            if( $scope.model.selectedDataSet.sections.length > 0 ){
                var dataElements = [], indicators = [];
                
                angular.forEach($scope.model.selectedDataSet.dataElements, function(de){
                    $scope.model.dataElements[de.id] = de;
                });
            
                angular.forEach($scope.model.selectedDataSet.sections, function(section){                    
                    
                    angular.forEach(section.dataElements, function(de){
                        var dataElement = $scope.model.dataElements[de.id];
                        
                        if( dataElement ){
                            angular.forEach($scope.dataElementGroups,function(dataElementGroup){
                                if(dataElementGroup.dataElements[de.id]){
                                    if(!dataElementGroup.previouslyTaken ){
                                        dataElementGroup.previouslyTaken=true;
                                        dataElement.displayTitle={};
                                        dataElement.displayTitle.displayName=dataElementGroup.displayName;
                                        dataElement.displayTitle.serialNumber=dataElementGroup.serial_number;
                                    }
                                } 
                            });
                            dataElements.push( dataElement );
                        }
                    });
                    
                    angular.forEach(section.indicators,function(indicator){
                       angular.forEach(indicator.attributeValues,function(attribute){
                           var val=attribute.value;
                           if(val==="true"){
                               val=true;
                           }else if(val==="false"){
                               val=false;
                           }
                           indicator[attribute.attribute.code]= val;
                       });
                       indicators.push( indicator );
                    });
                });
                
                $scope.model.selectedDataSet.dataElements = dataElements;
                $scope.model.selectedDataSet.indicators = indicators;
            }
        }
    });
    
    $scope.getPeriods = function(mode){
        if( $scope.model.selectedPeriodType.name ){
            var opts = {
                periodType: $scope.model.selectedPeriodType.name,
                periodOffset: mode === 'NXT' ? ++$scope.periodOffset: --$scope.periodOffset,
                futurePeriods: true
            };
            $scope.model.periods = PeriodService.getPeriods( opts );
        }
    };
    
    $scope.generateReport = function(){
        
        var ds = $scope.model.selectedDataSet.id;        
        var periods = [], dimension, filter;
        
        angular.forEach($scope.model.selectedPeriods, function(pe){
            periods.push(pe.id);
        });
        
        dimension = "pe:" + periods.join(';');
        
        filter = "ou:" + $scope.selectedOrgUnit.id;
        
        $scope.model.reportStarted = true;
        $scope.model.showReportFilters = false;
        
        $scope.dataValues = {};
        
        //orderByFilter(dataSets, '-displayName').reverse();
        $scope.model.columns = orderByFilter( $scope.model.selectedPeriods, '-id').reverse();
        
        Analytics.get(ds, dimension, filter).then(function(data){
            $scope.model.reportReady = true;
            $scope.model.reportStarted = false;
            if( data.rows ){
                angular.forEach(data.rows, function(row){
                    if(!$scope.dataValues[row[0]]){
                        $scope.dataValues[row[0]] = {};
                    }
                    if(!$scope.dataValues[row[0]][row[1]]){
                        $scope.dataValues[row[0]][row[1]] = {};
                    }
                    $scope.dataValues[row[0]][row[1]][row[2]] = row[3];
                });
                console.log('dataValues:  ', $scope.dataValues);
                console.log('periods:  ', $scope.model.selectedPeriods);
                $scope.customDataEntryForm = CustomFormService.getForDataSet($scope.model.selectedDataSet, $scope.model.dataElements, $scope.dataValues, $scope.model.selectedPeriods.reverse());
            }
        });
    };
    
    $scope.exportData = function () {
        var blob = new Blob([document.getElementById('exportTable').innerHTML], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"
        });
        
        var len = $scope.model.columns.length;
        
        var fileName = $scope.model.selectedDataSet.displayName + "_" + $scope.model.columns[0].name + " - " + $scope.model.columns[len-1].name + ".xls";
        
        saveAs(blob, fileName);
    };
});
