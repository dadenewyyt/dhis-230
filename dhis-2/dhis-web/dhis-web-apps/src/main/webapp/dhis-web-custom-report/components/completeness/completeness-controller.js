/* global angular */

'use strict';

var customReport = angular.module('customReport');

//Controller for settings page
customReport.controller('completenessController',
        function($scope,
                $modal,
                orderByFilter,
                PeriodService,
                MetaDataFactory,
                DataElementGroupFactory,
                DataEntryUtils,
                CompletenessService) { 
    $scope.periodOffset = 0;
    $scope.maxOptionSize = 30;
    $scope.model = {dataSets: [],
                    reportColumn: 'PERIOD',
                    categoryCombos: [],
                    dataElementGroups: [],
                    groupIdsByDataElement: [],
                    groupsByDataElement: [],
                    showDiseaseGroup: false,
                    periods: [],
                    selectedPeriods: [],
                    includeChildren: false,
                    periodTypes: [],
                    columns: [],
                    reportReady: false,
                    reportStarted: false,
                    showReportFilters: true,
                    showDiseaseFilters: true,
                    selectedPeriodType: null,
                    valueExists: false};
                
    downloadMetaData().then(function(){
        console.log( 'Finished loading meta-data' );
        MetaDataFactory.getAll('dataSets').then(function(ds){
            $scope.model.dataSets = ds;

            MetaDataFactory.getAll('periodTypes').then(function(pts){
                pts = orderByFilter(pts, '-frequencyOrder').reverse();
                $scope.model.periodTypes = pts;
                MetaDataFactory.getAll('categoryCombos').then(function(ccs){
                    angular.forEach(ccs, function(cc){
                        $scope.model.categoryCombos[cc.id] = cc;
                    });
                    
                    MetaDataFactory.getAll('dataElementGroups').then(function(degs){
                        angular.forEach(degs, function(deg){
                            $scope.model.dataElementGroups[deg.id] = deg;
                            angular.forEach(deg.dataElements, function(de){
                                $scope.model.groupsByDataElement[de.id] = {id: deg.id, name: deg.displayName};
                            });
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
                futurePeriods: 1
            };
            $scope.model.periods = PeriodService.getReportPeriods( opts );
        }
    });
    
    $scope.$watch('model.selectedDataSet', function(){
        $scope.model.dataElements = [];
        $scope.model.reportReady = false;
        $scope.model.reportStarted = false;
        $scope.model.indicators = [];
        $scope.model.columns = [];
        $scope.dataValues = {};
        if( angular.isObject( $scope.model.selectedDataSet ) ) {
            
            
            $scope.model.selectedAttributeCategoryCombo = null;     
            if( $scope.model.selectedDataSet && 
                $scope.model.selectedDataSet.categoryCombo && 
                $scope.model.selectedDataSet.categoryCombo.id ){
            
                $scope.model.selectedAttributeCategoryCombo = $scope.model.categoryCombos[$scope.model.selectedDataSet.categoryCombo.id];
            }
            
            if( $scope.model.selectedDataSet.DataSetCategory === 'Disease' ){
                $scope.model.selectedDataSet.dataElements = orderByFilter( $scope.model.selectedDataSet.dataElements, '-code').reverse();
                angular.forEach($scope.model.selectedDataSet.dataElements, function(de){
                    $scope.model.dataElements[de.id] = de;
                });
            }
            else if( $scope.model.selectedDataSet.DataSetCategory === 'PHEM' ){
                angular.forEach($scope.model.selectedDataSet.dataElements, function(de){
                    $scope.model.dataElements[de.id] = de;
                });
            }
            else {
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
        }
    });
    
    $scope.getPeriods = function(mode){
        if( $scope.model.selectedPeriodType.name ){
            var opts = {
                periodType: $scope.model.selectedPeriodType.name,
                periodOffset: mode === 'NXT' ? ++$scope.periodOffset: --$scope.periodOffset,
                futurePeriods: 1
            };
            $scope.model.periods = PeriodService.getReportPeriods( opts );
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
        
        if( !$scope.model.selectedDataSet || !$scope.model.selectedDataSet.id ){
            DataEntryUtils.notify('error', 'please_select_dataset');
            return;
        }

        $scope.model.reportStarted = true;
        $scope.model.reportReady = false;
        $scope.model.showReportFilters = false;
        $scope.model.columns = [];
        var completenessUrl = 'dataSet=' + $scope.model.selectedDataSet.id;
        completenessUrl += "&period=" + $.map($scope.model.selectedPeriods, function(pe){return pe.id;}).join(',');
        completenessUrl += "&orgUnit=" + $.map($scope.selectedOrgUnits, function(ou){return ou.id;}).join(',');
        completenessUrl += "&children=" + true;
        
        if( $scope.model.reportColumn === 'ORGUNIT' ){
            $scope.model.reportName = $scope.model.selectedDataSet.displayName + ' - ' + $.map($scope.model.selectedPeriods, function(pe){return pe.name;}).join('; '); 
            $scope.model.columns = $scope.selectedOrgUnits;
        }
        else{
            $scope.model.reportName = $scope.model.selectedDataSet.displayName + ' - ' + $.map($scope.selectedOrgUnits, function(ou){return ou.name;}).join('; '); 
            $scope.model.columns = $scope.model.selectedPeriods;
        }
        
        var period = $.map($scope.model.selectedPeriods, function(pe){return pe.id;}).join(',');
        var orgUnit = $.map($scope.selectedOrgUnits, function(ou){return ou.id;}).join(',');
        CompletenessService.get( $scope.model.selectedDataSet.id, orgUnit, period, true).then(function(response){                
            if( response && response.completeDataSetRegistrations && 
                    response.completeDataSetRegistrations.length &&
                    response.completeDataSetRegistrations.length > 0){

                console.log('cdsr:  ', response.completeDataSetRegistrations);
            }
        });
    };
    
    $scope.filterOptionCombos = function(){
        var selectedOptions = [], 
            ocos = [], 
            optionCombos = $scope.selectedCategoryCombo.categoryOptionCombos;
    
        if( $scope.selectedCategoryCombo && $scope.selectedCategoryCombo.categories ){
            for( var i=0; i<$scope.selectedCategoryCombo.categories.length; i++){
                if( $scope.selectedCategoryCombo.categories[i].selectedFilterOptions && $scope.selectedCategoryCombo.categories[i].selectedFilterOptions.length > 0 ){
                    selectedOptions.push( $scope.selectedCategoryCombo.categories[i].selectedFilterOptions );
                }
                else{
                    selectedOptions.push( $.map($scope.selectedCategoryCombo.categories[i].categoryOptions, function(co){return co.displayName;}) );
                }
            }
            ocos = dhis2.metadata.cartesianProduct(selectedOptions);
        }
        
        if( ocos.length === 0 ){
            $scope.model.filteredOptionCombos = $scope.selectedCategoryCombo.categoryOptionCombos;
        }
        else{
            $scope.model.filteredOptionCombos = [];
        }
        
        for( var j=0; j<ocos.length; j++){
            var optionNames = ocos[j].join(', ');
            var reverseOptionNames = ocos[j].reverse().join(', ');
            var continueLoop = true;
            for( var k=0; k<optionCombos.length && continueLoop; k++){
                if( optionNames === optionCombos[k].displayName ){
                    $scope.model.filteredOptionCombos.push( optionCombos[k] );
                    continueLoop = false;
                    break;
                }
                else if( reverseOptionNames === optionCombos[k].displayName ){
                    $scope.model.filteredOptionCombos.push( optionCombos[k] );
                    continueLoop = false;
                    break;
                }
            }
        }       
        
        processDataValues( $.map($scope.model.filteredOptionCombos, function(oc){return oc.id;}), true );
        processGroupDataValues( $.map($scope.model.filteredOptionCombos, function(oc){return oc.id;}), true );
    };    
    
    $scope.exportData = function () {
        var blob = new Blob([document.getElementById('exportTable').innerHTML], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"
        });        
        saveAs(blob, $scope.model.reportName + '.xls' );
    };
});
