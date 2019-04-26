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
                futurePeriods: true
            };
            $scope.model.periods = PeriodService.getPeriods( opts );
        }
    };
    
    function processDataValues( validOptionCombos, isDiseaseReport ) {
        $scope.model.dataElementsWithValue = [];
        $scope.dataValues = {};
        $scope.model.totalDataValues = [];
        $scope.model.totalGroupDataValues = [];
        
        for( var key in $scope.model.rawData ){
            var val = $scope.model.rawData[key];
            var keys = key.split('-');
            if( keys.length === 2 ){
                keys.splice(1, 0, 'total');                        
            }
            
            if( isDiseaseReport && validOptionCombos ){
                if( validOptionCombos.indexOf(keys[1]) !== -1 ){
                    if ( !$scope.dataValues[keys[0]] ){
                        $scope.dataValues[keys[0]] = {};
                    }
                    if(!$scope.dataValues[keys[0]][keys[1]]){
                        $scope.dataValues[keys[0]][keys[1]] = {};
                        $scope.dataValues[keys[0]][keys[1]]['grandTotal'] = 0;
                    }

                    $scope.dataValues[keys[0]][keys[1]][keys[2]] = val;
                    $scope.dataValues[keys[0]][keys[1]]['grandTotal'] += val;
                }
            }
            else{
                if ( !$scope.dataValues[keys[0]] ){
                    $scope.dataValues[keys[0]] = {};
                }
                
                if(!$scope.dataValues[keys[0]][keys[1]]){
                    $scope.dataValues[keys[0]][keys[1]] = {};
                    $scope.dataValues[keys[0]][keys[1]]['grandTotal'] = 0;
                }
                
                $scope.dataValues[keys[0]][keys[1]][keys[2]] = val;
                $scope.dataValues[keys[0]][keys[1]]['grandTotal'] += val;
            }
        }
        $scope.model.dataElementsWithValue = Object.keys( $scope.dataValues );
    }
    
    function processGroupDataValues( validOptionCombos ) {
        $scope.groupDataValues = {};
        $scope.groupsWithValue = [];
        angular.forEach($scope.model.dataElementsWithValue, function(de){
            var deg = $scope.model.groupsByDataElement[de];
            if( deg ){                        
                if( !$scope.groupsWithValue[deg.id]){
                    $scope.groupsWithValue[deg.id] = {id: deg.id, name: deg.name, dataElements: []};
                }
                $scope.groupsWithValue[deg.id].dataElements.push(de);
            }

            var ocKeys = Object.keys( $scope.dataValues[de] );
            $scope.dataValues[de]['total'] = {'grandTotal': 0};                    
            angular.forEach($scope.model.columns, function(col){
                var total = 0;
                angular.forEach(ocKeys, function(ocKey){
                    if( validOptionCombos.indexOf(ocKey) !== -1 ){
                        var val = $scope.dataValues[de][ocKey][col.id];
                        if( val ){
                            total += val;
                        }
                    }
                });
                $scope.dataValues[de]['total'][col.id] = total > 0 ? total : '';
            });

            var total = 0;
            angular.forEach(ocKeys, function(ocKey){
                if( validOptionCombos.indexOf(ocKey) !== -1 ){
                    var val = $scope.dataValues[de][ocKey]['grandTotal'];
                    if( val ){
                        total += val;
                    }
                }
            });
            $scope.dataValues[de]['total']['grandTotal'] = total > 0 ? total : '';
            var displayName = $scope.model.dataElements[de] && $scope.model.dataElements[de].displayFormName ? $scope.model.dataElements[de].displayFormName : '';
            $scope.model.totalDataValues.push({id: de, displayName: displayName, value: total});
        });
        
        if( $scope.groupsWithValue && Object.values( $scope.groupsWithValue ) && Object.values( $scope.groupsWithValue ).length > 0  ){            
            angular.forEach(Object.values( $scope.groupsWithValue ), function(gr){
                $scope.groupDataValues[gr.id] = {total: {grandTotal: 0}};
                if( gr.dataElements && gr.dataElements.length > 0 ){
                    angular.forEach($scope.selectedCategoryCombo.categoryOptionCombos, function(oc){
                        if( validOptionCombos.indexOf(oc.id) !== -1 ){
                            angular.forEach($scope.model.columns, function(col){
                                var val = 0;
                                angular.forEach(gr.dataElements, function(de){
                                    if( $scope.dataValues[de][oc.id] && $scope.dataValues[de][oc.id][col.id] ){
                                        val += $scope.dataValues[de][oc.id][col.id];
                                    }
                                });
                                if( val > 0 ){
                                    if(!$scope.groupDataValues[gr.id][oc.id]){
                                        $scope.groupDataValues[gr.id][oc.id] = {};
                                    }
                                    $scope.groupDataValues[gr.id][oc.id][col.id] = val;
                                }
                            });
                        }
                    });

                    var ocKeys = Object.keys( $scope.groupDataValues[gr.id] );
                    $scope.groupDataValues[gr.id]['total'] = {}; 
                    var grandTotal = 0;
                    angular.forEach($scope.model.columns, function(col){
                        var total = 0;
                        angular.forEach(ocKeys, function(ocKey){
                            if( validOptionCombos.indexOf(ocKey) !== -1 ){
                                var val = $scope.groupDataValues[gr.id][ocKey][col.id];
                                if( val ){
                                    total += val;
                                }
                            }
                        });
                        if( total > 0 ){
                            $scope.groupDataValues[gr.id]['total'][col.id] = total;
                            grandTotal += total;
                        }
                    });
                    if( grandTotal > 0 ){
                       $scope.groupDataValues[gr.id]['total']['grandTotal'] = grandTotal; 
                    }

                    var total = 0;
                    angular.forEach(ocKeys, function(ocKey){
                        if( ocKey === 'total' || validOptionCombos.indexOf(ocKey) !== -1 ){
                            var val = $scope.groupDataValues[gr.id][ocKey]['grandTotal'];
                            if( val ){
                                total += val;
                            }

                            var ocTotal = 0;
                            angular.forEach($scope.model.columns, function(col){
                                var v = $scope.groupDataValues[gr.id][ocKey][col.id];
                                if( v ){
                                    ocTotal += v;
                                }
                            });
                            if( ocTotal > 0 ){
                                $scope.groupDataValues[gr.id][ocKey]['grandTotal'] = ocTotal;
                            }
                        }
                    });
                    $scope.model.totalGroupDataValues.push({group: gr.id, displayName: gr.name, value: total});
                }
            });
        }
        $scope.model.totalDataValues = orderByFilter( $scope.model.totalDataValues, '-value');
        $scope.model.totalGroupDataValues = orderByFilter( $scope.model.totalGroupDataValues, '-value');
    }
    
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
        
        if( $scope.model.selectedDataSet.DataSetCategory === 'Disease' ){
            var dimension = [];
            var analyticsUrl = "ds=" + $scope.model.selectedDataSet.id;
            analyticsUrl += "&orgUnits=" + $.map($scope.selectedOrgUnits, function(ou){return ou.id;}).join(',');
            analyticsUrl += "&periods=" + $.map($scope.model.selectedPeriods, function(pe){return pe.id;}).join(',');
            
            if( $scope.model.selectedAttributeCategoryCombo && 
                $scope.model.selectedAttributeCategoryCombo.id && 
                !$scope.model.selectedAttributeCategoryCombo.isDefault ){

                angular.forEach( $scope.model.selectedAttributeCategoryCombo.categories, function(ca){
                    if( ca.selectedOption && ca.selectedOption.id ){
                        dimension.push("dimension=" + ca.id + ":" + ca.selectedOption.id );
                    }
                });
            }

            if( $scope.model.reportColumn === 'ORGUNIT' ){            
                analyticsUrl += '&periodAsFilter=true';
                $scope.model.reportName = $scope.model.selectedDataSet.displayName + ' - ' + $.map($scope.model.selectedPeriods, function(pe){return pe.name;}).join('; '); 
                $scope.model.columns = $scope.selectedOrgUnits;
            }
            else{
                analyticsUrl += '&periodAsFilter=false';
                $scope.model.reportName = $scope.model.selectedDataSet.displayName + ' - ' + $.map($scope.selectedOrgUnits, function(ou){return ou.name;}).join('; '); 
                $scope.model.columns = $scope.model.selectedPeriods;
            }

            if( dimension.length > 0 ){
                analyticsUrl += '&' + dimension.join('&');
                $scope.model.reportName += ' - ' + dimension.join(';');
            }
        
            Analytics.getDiseaseReport( analyticsUrl ).then(function(data){
                $scope.model.rawData = data;
                $scope.model.reportReady = true;
                $scope.model.reportStarted = false;
                $scope.selectedCategoryCombo = $scope.model.categoryCombos[$scope.model.selectedDataSet.dataElements[0].categoryCombo.id];
                $scope.model.filteredOptionCombos = $scope.selectedCategoryCombo.categoryOptionCombos;

                if( Object.keys( data ).length === 0 ){
                    DataEntryUtils.notify('info', 'no_data_exists');
                    $scope.model.dataExists = false;
                    return;
                }
                else{
                    $scope.model.dataExists = true;
                    processDataValues( $.map($scope.model.filteredOptionCombos, function(oc){return oc.id;}), true );
                    processGroupDataValues( $.map($scope.model.filteredOptionCombos, function(oc){return oc.id;}), true );
                }                
            });
        }
        else{
            var dimension = [], filter = '';
            if( $scope.model.reportColumn === 'ORGUNIT' ){
                dimension.push( "dimension=ou:" + $.map($scope.selectedOrgUnits, function(ou){return ou.id;}).join(';') );
                filter = "pe:" + $.map($scope.model.selectedPeriods, function(pe){return pe.id;}).join(';');
                $scope.model.reportName = $scope.model.selectedDataSet.displayName + ' (' + $.map($scope.model.selectedPeriods, function(pe){return pe.name;}).join('; ') + ')'; 
            }
            else{
                dimension.push("dimension=pe:" + $.map($scope.model.selectedPeriods, function(pe){return pe.id;}).join(';') );
                filter = "ou:" + $.map($scope.selectedOrgUnits, function(ou){return ou.id;}).join(';');
                $scope.model.columns = orderByFilter( $scope.model.selectedPeriods, '-id').reverse();

                $scope.model.reportName = $scope.model.selectedDataSet.displayName + ' (' + $.map($scope.selectedOrgUnits, function(ou){return ou.name;}).join('; ') + ')'; 
            }
            
            Analytics.get($scope.model.selectedDataSet.id, dimension, filter, $scope.model.selectedDataSet.DataSetCategory).then(function(data){
                $scope.model.rawData = data;
                $scope.model.reportReady = true;
                $scope.model.reportStarted = false;

                if( Object.keys( data ).length === 0 ){
                    DataEntryUtils.notify('info', 'no_data_exists');
                    $scope.model.dataExists = false;
                    return;
                }
                else{
                    $scope.model.dataExists = true;
                    processDataValues(null, false);
                }
            }); 
        }
    };
    
    $scope.filterOptionCombos = function(){
        var selectedOptions = [];
        if( $scope.selectedCategoryCombo && $scope.selectedCategoryCombo.categories ){
            for(var i=0; i<$scope.selectedCategoryCombo.categories.length; i++){
                if($scope.selectedCategoryCombo.categories[i].selectedFilterOption && 
                    $scope.selectedCategoryCombo.categories[i].selectedFilterOption.id){                    
                    selectedOptions.push($scope.selectedCategoryCombo.categories[i].selectedFilterOption);
                }
            }
        }
        if( selectedOptions.length === 0 ){
            $scope.model.filteredOptionCombos = $scope.selectedCategoryCombo.categoryOptionCombos;
        }
        else{
            $scope.model.filteredOptionCombos = [];
            angular.forEach($scope.selectedCategoryCombo.categoryOptionCombos, function(oc){
                var valid = true;
                for( var i=0; i<selectedOptions.length; i++){
                    if( !oc.displayName.includes(selectedOptions[i].displayName) ){
                        valid = false;
                        break;
                    }
                }
                if( valid ){
                    $scope.model.filteredOptionCombos.push( oc );
                }
            });
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
