/* global angular */

'use strict';

var customReport = angular.module('customReport');

//Controller for settings page
customReport.controller('reportRateController',
        function($scope,
                $modal,
                $filter,
                $translate,
                orderByFilter,
                PeriodService,
                MetaDataFactory,
                DataEntryUtils,
                Analytics) { 
    $scope.periodOffset = 0;
    $scope.maxOptionSize = 30;
    $scope.dataValues = {expected: {}, actual: {}, rate: {}, timely: {}};
    $scope.model = {dataSets: [],
                    reportColumn: 'PERIOD',
                    categoryCombos: [],
                    categoryOptionGroupSets: {},
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
                    filterCompleteness: false,
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
                    
                    
                    MetaDataFactory.getAll('categoryOptionGroupSets').then(function(cogss){                        
                        angular.forEach(cogss, function(cogs){
                            if( cogs.completenessFilter ){
                                angular.forEach(cogs.categoryOptionGroups, function(cog){
                                    if( cog.categoryOptions && cog.categoryOptions.length > 0 ){
                                        $scope.model.categoryOptionGroupSets[cog.id] = $.map(cog.categoryOptions, function(co){return co.id;});                                        
                                    }
                                });
                            }
                        });
                        
                        $scope.model.baseRateColumns = [  
                            {id: "expected", name: $translate.instant('expected')},
                            {id: "actual", name: $translate.instant('actual')},
                            {id: "rate", name: $translate.instant('rate')},
                            {id: "timely", name: $translate.instant('timely')}
                        ],
                    
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
        $scope.model.filterCompleteness = false;
        $scope.dataValues = {expected: {}, actual: {}, rate: {}, timely: {}};
        if( angular.isObject( $scope.model.selectedDataSet ) ) {
            
            
            $scope.model.selectedAttributeCategoryCombo = null;     
            if( $scope.model.selectedDataSet && 
                $scope.model.selectedDataSet.categoryCombo && 
                $scope.model.selectedDataSet.categoryCombo.id ){
            
                $scope.model.selectedAttributeCategoryCombo = $scope.model.categoryCombos[$scope.model.selectedDataSet.categoryCombo.id];
            }
            
            if( $scope.model.selectedAttributeCategoryCombo && 
                    !$scope.model.selectedAttributeCategoryCombo.isDefault && 
                    $scope.model.selectedDataSet.DataSetCategory === 'Disease'){
                $scope.model.filterCompleteness = true;
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
        
        var periodIds = $.map($scope.model.selectedPeriods, function(pe){return pe.id;}).join(';');
        var orgUnitIds = $.map($scope.selectedOrgUnits, function(ou){return ou.id;}).join(';');
        var dimensions = [];
        
        dimensions.push("dimension=ou:" + orgUnitIds);
        dimensions.push("dimension=pe:" + periodIds);
        
        if( $scope.model.filterCompleteness ){
            $scope.model.categoryIds = [];
            angular.forEach($scope.model.selectedAttributeCategoryCombo.categories, function(category){
                if( category.categoryOptions && category.categoryOptions.length > 0){                    
                    var categoryOptionIds = $.map(category.categoryOptions, function(categoryOption){return categoryOption.id;}).join(';');
                    dimensions.push("dimension=" + category.id + ":" + categoryOptionIds);
                    $scope.model.categoryIds.push( category.id );
                }
            });
        }
        
        if( dimensions.length === 0 ){
            DataEntryUtils.notify('error', 'invalid_dimensions');
            return;
        }
        
        var analyticsUrl = "skipMeta=true&includeNumDen=true&";
        analyticsUrl += dimensions.join('&');
        
        var expectedUrl = analyticsUrl + '&filter=dx:' + $scope.model.selectedDataSet.id + ".EXPECTED_REPORTS";
        var actualUrl = analyticsUrl + '&filter=dx:' + $scope.model.selectedDataSet.id + ".ACTUAL_REPORTS";
        var completenessUrl = analyticsUrl + '&filter=dx:' + $scope.model.selectedDataSet.id + ".REPORTING_RATE";
        var timelinessUrl = analyticsUrl + '&filter=dx:' + $scope.model.selectedDataSet.id + ".REPORTING_RATE_ON_TIME";
        
        $scope.model.columns = [];
        $scope.model.reportRows = [];
        $scope.model.reportName = $scope.model.selectedDataSet.displayName + ' - ' + $translate.instant('reporting_rate_summary');
        if( $scope.model.reportColumn === 'ORGUNIT' ){
            //$scope.model.reportName = $scope.model.selectedDataSet.displayName + ' - ' + $.map($scope.model.selectedPeriods, function(pe){return pe.name;}).join('; '); 
            $scope.model.columns = $scope.selectedOrgUnits;
            $scope.model.reportRows = $scope.model.selectedPeriods;
        }
        else{
            //$scope.model.reportName = $scope.model.selectedDataSet.displayName + ' - ' + $.map($scope.selectedOrgUnits, function(ou){return ou.name;}).join('; '); 
            $scope.model.columns = $scope.model.selectedPeriods;
            $scope.model.reportRows = orderByFilter( $scope.selectedOrgUnits, '-name').reverse();
        }
        
        $scope.model.rateColumns = [];
        angular.forEach($scope.model.columns, function(col){
            angular.forEach($scope.model.baseRateColumns, function(bc){
                $scope.model.rateColumns.push({id: bc.id + "-" + col.id, name: bc.name});                
            });
        });
        
        $scope.model.reportStarted = true;
        $scope.model.reportReady = false;
        $scope.model.showReportFilters = false;
        
        var getRow = function( rowData ){
            if( !$scope.model.categoryOptionGroupSets || 
                    Object.keys( $scope.model.categoryOptionGroupSets ).length === 0 || 
                    !$scope.model.categoryIds ||
                    !$scope.model.categoryIds.length ||
                    $scope.model.categoryIds.length === 0 ){
                return rowData;
            }
            var present = [];
            for( var i=0; i<$scope.model.categoryIds.length; i++){
                var id = $scope.model.categoryIds[i];                
                for( var key in $scope.model.categoryOptionGroupSets ){
                    var options = $scope.model.categoryOptionGroupSets[key];
                    if( options.indexOf( rowData[id] ) !== -1 ){
                        present.push('t');
                        rowData['group-' + key] = rowData[id];
                        break;
                    }
                }
            }
            
            if( present.length === $scope.model.categoryIds.length ){
                return rowData;
            }
            return null;
        };
        
        var filterOutRows = function( data ){
            if( data && data.length > 0 ){
                var rows = [];
                for( var i=0; i<data.length; i++ ){
                    var r = getRow( data[i] );
                    if ( r ){
                        rows.push( r );
                    }
                }
                return rows;
            }
            return data;
        };
        
        var getKey = function( type, cols ){            
            if (!type && !cols || cols.length === 0 ){
                return null;
            }
            
            var _cols = $scope.model.reportColumn === 'ORGUNIT' ? cols : cols.reverse();
            if( type ){
                _cols = [type].concat(_cols );
            }
            
            return _cols.join('-');
        };
        
        var processRows = function( type, data ){            
            if( data && data.length > 0 ){
                var rows = [];
                var processedRows = [];
                angular.forEach($scope.selectedOrgUnits, function(ou){
                    var oud = $filter('filter')(data, {ou: ou.id});
                    angular.forEach($scope.model.selectedPeriods, function(pe){
                        var peds = $filter('filter')(oud, {pe: pe.id});                        
                        for( var key in $scope.model.categoryOptionGroupSets ){
                            if( $scope.model.categoryOptionGroupSets[key].length> 0 ){
                                var cogd = [];
                                angular.forEach(peds, function(ped){
                                    if( ped['group-' + key] ){
                                        cogd.push(ped);
                                    }
                                });
                                var valueKey = '-value';
                                if( type === 'rate' || type === 'timely' ){
                                    valueKey = '-numerator';
                                }
                                cogd = orderByFilter( cogd, valueKey ).reverse();                                
                                if( cogd.length > 0 && processedRows.indexOf( Object.values( cogd[0] ).join('-')) === -1 ){
                                    rows = rows.concat( cogd[0] );
                                    processedRows.push( Object.values( cogd[0] ).join('-') );
                                }
                            }
                        }
                    });
                });
                return rows;
            }
            return data;
        };
        
        var getTotal = function( type, data ){
            var d = {};
            if( data && data.length > 0 ){
                angular.forEach($scope.selectedOrgUnits, function(ou){
                    var oud = $filter('filter')(data, {ou: ou.id});
                    angular.forEach($scope.model.selectedPeriods, function(pe){
                        var peds = $filter('filter')(oud, {pe: pe.id});                        
                        var key = getKey( type, [ou.id, pe.id] );
                        var t = 0;
                        angular.forEach(peds, function(ped){
                            if( $scope.model.filterCompleteness && (type === 'rate' || type === 'timely') ){
                                t += parseInt(ped.numerator);
                            }
                            else{
                                t += parseFloat(ped.value); 
                            }
                        });
                        d[key] = t;
                    });
                });
            }
            return d;
        };
        
        var calculatePercentages = function(){
            if( $scope.model.filterCompleteness ){
                angular.forEach($scope.selectedOrgUnits, function(ou){
                    angular.forEach($scope.model.selectedPeriods, function(pe){
                        var rateKey = getKey( 'rate', [ou.id, pe.id] );
                        var timelyKey = getKey( 'timely', [ou.id, pe.id] );                        
                        var denKey = getKey( 'expected', [ou.id, pe.id] );
                        
                        $scope.dataValues[rateKey] = DataEntryUtils.getPercent( $scope.dataValues[rateKey], $scope.dataValues[denKey] );                        
                        $scope.dataValues[timelyKey] = DataEntryUtils.getPercent( $scope.dataValues[timelyKey], $scope.dataValues[denKey] );
                    });
                });
            }
        };
        
        $scope.dataValues = {};
        
        Analytics.getData( completenessUrl ).then(function( cData ){

            Analytics.getData( timelinessUrl ).then(function( tData ){
                    
                Analytics.getData( actualUrl ).then(function( aData ){
                    
                    Analytics.getData( expectedUrl ).then(function( eData ){
                        
                        if( $scope.model.filterCompleteness ){
                            cData = filterOutRows( cData );
                            tData = filterOutRows( tData );
                            aData = filterOutRows( aData );
                            eData = filterOutRows( eData );
                            
                            cData = processRows( 'rate', cData );
                            tData = processRows( 'timely', tData );
                            aData = processRows( 'actual', aData );
                            eData = processRows( 'expected', eData );
                        }
                        
                        $scope.dataValues = Object.assign($scope.dataValues, getTotal( 'rate', cData ));
                        $scope.dataValues = Object.assign($scope.dataValues, getTotal( 'timely', tData ));
                        $scope.dataValues = Object.assign($scope.dataValues, getTotal( 'actual', aData ));
                        $scope.dataValues = Object.assign($scope.dataValues, getTotal( 'expected', eData ));
                        
                        calculatePercentages();
                        
                        $scope.model.reportReady = true;
                        $scope.model.reportStarted = false;
                    });
                });
            });
        });
    };
    
    $scope.exportData = function () {
        var blob = new Blob([document.getElementById('exportTable').innerHTML], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"
        });        
        saveAs(blob, $scope.model.reportName + '.xls' );
    };
});
