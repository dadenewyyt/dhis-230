/* global angular */

'use strict';

var phem = angular.module('phem');

//Controller for settings page
phem.controller('dataExportController',
    function($scope,
                MetaDataFactory,
                DataEntryUtils,
                Analytics,
                CalendarService) {
    $scope.maxOptionSize = 30;
    $scope.metaDataDownloadComplete = false;
    $scope.model = {invalidDimensions: false,
                    startDate: null,
                    endDate: null,
                    dataSets: [],
                    minStartDate: null,
                    maxStartDate: 0,
                    minEndDate: null,
                    maxEndDate: 0,
                    valueExists: false};
    
    downloadMetaData().then(function(){
        console.log( 'Finished loading meta-data' );
        $scope.metaDataDownloadComplete = true;        
        $scope.calendarSetting = CalendarService.getSetting();
        $scope.loadDataSets();
    });    
    
    //load datasets associated with the selected org unit.
    $scope.loadDataSets = function() {
        $scope.model.dataSets = [];
        $scope.model.selectedAttributeCategoryCombo = null;
        $scope.model.selectedAttributeOptionCombos = {};
        $scope.model.selectedAttributeOptionCombo = null;        
        $scope.model.valueExists = false;
        MetaDataFactory.getByProperty('dataSets', 'DataSetCategory','PHEM').then(function(objs){
            $scope.model.dataSets = objs;
        });
    }; 
    
    //watch for selection of data set
    $scope.$watch('model.selectedDataSet', function() {               
        $scope.model.categoryOptionsReady = false;
        $scope.model.valueExists = false;
        if( angular.isObject($scope.model.selectedDataSet) && $scope.model.selectedDataSet.id){
            $scope.loadDataSetDetails();
        }
    });
    
    $scope.$watch('model.startDate', function(){
        if( $scope.model.startDate ){
            $scope.model.minEndDate = $scope.model.startDate;
        }
        else{
            $scope.model.minEndDate = null;
        }
    });
    
    $scope.$watch('model.endDate', function(){
        if( $scope.model.endDate ){
            $scope.model.maxStartDate = $scope.model.endDate;
        }
        else{
            $scope.model.maxStartDate = 0;
        }
    });
        
    $scope.loadDataSetDetails = function(){
        if( $scope.model.selectedDataSet && $scope.model.selectedDataSet.id){
            if(!$scope.model.selectedDataSet.dataElements || $scope.model.selectedDataSet.dataElements.length < 1){                
                DataEntryUtils.notify('error', 'missing_data_elements_indicators');
                return;
            }
        }
    };
    
    $scope.exportData = function(){
        var fileName = $scope.model.selectedDataSet.displayName + "_" + $scope.model.startDate + "_" + $scope.model.endDate + ".zip";
        var exportUrl = "dataSet=" + $scope.model.selectedDataSet.id;
        exportUrl += "&startDate=" + $scope.model.startDate;
        exportUrl += "&endDate=" + $scope.model.endDate;
        exportUrl += "&attachment=" + fileName;

        Analytics.getDataValues( exportUrl ).then(function(data){
            var blob = new Blob([data], {type: 'application/zip'});
            saveAs(blob, fileName);
        });
    };
});