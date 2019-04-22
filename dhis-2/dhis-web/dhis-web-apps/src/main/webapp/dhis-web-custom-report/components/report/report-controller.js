/* global angular */

'use strict';

var customReport = angular.module('customReport');

//Controller for settings page
customReport.controller('customReportController',
        function($scope,
                orderByFilter,
                PeriodService,
                MetaDataFactory,
                DataElementGroupFactory,
                DataEntryUtils,
                Analytics) { 
    $scope.periodOffset = 0;
    $scope.model = {dataSets: [],
                    reportColumn: 'PERIOD',
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
                
    downloadMetaData().then(function(){
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
                        
                        selectionTreeSelection.setMultipleSelectionAllowed( true );
                        selectionTree.clearSelectedOrganisationUnitsAndBuildTree();
                    });
                });
            });
        });
    });
    //watch for selection of org unit from tree
    $scope.$watch('selectedOrgUnits', function() {
        if( angular.isObject($scope.selectedOrgUnits)){
            if( !$scope.selectedOrgUnits || $scope.selectedOrgUnits.length > 1 ){
                $scope.model.includeChildren = false;
            }
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
        
        if( !$scope.selectedOrgUnits || $scope.selectedOrgUnits.length < 1 ){
            DataEntryUtils.notify('error', 'please_select_orgunit');
            return;
        }
        
        if( !$scope.model.selectedPeriods || $scope.model.selectedPeriods.length < 1 ){
            DataEntryUtils.notify('error', 'please_select_period');
            return;
        }

        $scope.model.reportStarted = true;
        $scope.model.reportReady = false;
        $scope.model.showReportFilters = false;
        $scope.model.columns = [];
        $scope.dataValues = {};
        
        var ds = $scope.model.selectedDataSet.id;
        
        var periods = [], dimension, filter;
        
        angular.forEach($scope.model.selectedPeriods, function(pe){
            periods.push(pe.id);
        });
        
        
        if( $scope.model.reportColumn === 'ORGUNIT' ){
            dimension = "ou:" + $scope.selectedOrgUnits.join(';');        
            filter = "pe:" + periods.join(';');
        }
        else{
            dimension = "pe:" + periods.join(';');
            filter = "ou:" + $scope.selectedOrgUnits.join(';');
            $scope.model.columns = orderByFilter( $scope.model.selectedPeriods, '-id').reverse();
        }
        
        Analytics.get(ds, dimension, filter).then(function(data){
            $scope.model.reportReady = true;
            $scope.model.reportStarted = false;
            if( data.rows && data.headers && data.metaData && data.metaData.items ){
                angular.forEach(data.rows, function(row){
                    if(!$scope.dataValues[row[0]]){
                        $scope.dataValues[row[0]] = {};
                    }
                    if(!$scope.dataValues[row[0]][row[1]]){
                        $scope.dataValues[row[0]][row[1]] = {};
                    }
                    $scope.dataValues[row[0]][row[1]][row[2]] = row[3];
                });
                
                if( $scope.model.reportColumn === 'ORGUNIT'){
                    $scope.model.columns = [];
                    angular.forEach($scope.selectedOrgUnits, function(ou){
                        $scope.model.columns.push({id: ou, name: data.metaData.items[ou].name});
                    });
                    
                    $scope.model.columns = orderByFilter( $scope.model.columns, '-name').reverse();
                }
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
