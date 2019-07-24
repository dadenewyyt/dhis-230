/* global angular */

'use strict';

var lqas = angular.module('lqas');

//Controller for settings page
lqas.controller('dataEntryController',
        function($scope,
                $filter,                
                orderByFilter,
                SessionStorageService,
                ContextMenuSelectedItem,
                DataSetFactory,
                PeriodService,
                MetaDataFactory,
                DataEntryUtils,
                DataValueService,
                CompletenessService,
                ModalService,
                DialogService,
                DateUtils) {
    $scope.periodOffset = 0;
    $scope.maxOptionSize = 30;
    $scope.saveStatus = {};
    $scope.model = {invalidDimensions: false,
                    sde: null,
                    selectedAttributeCategoryCombo: null,
                    standardDataSets: [],
                    multiDataSets: [],
                    dataElements: [],
                    dataElementsWithValue: [],
                    dataSets: [],
                    categoryOptionsReady: false,
                    selectedOptions: [],
                    selectedCategoryCombo: null,
                    selectedAttributeOptionCombos: {},
                    selectedAttributeOptionCombo: null,
                    categoryCombos: null,
                    optionCombos: {},
                    attributeCategoryUrl: null,
                    greyedFields: [],
                    valueExists: false};
    
    //watch for selection of org unit from tree
    $scope.$watch('selectedOrgUnit', function() {
        $scope.model.periods = [];
        $scope.model.dataSets = [];
        $scope.model.dataElements = [];
        $scope.model.dataElementsWithValue = [];
        $scope.model.selectedDataSet = null;
        $scope.model.selectedPeriod = null;
        $scope.model.selectedCategoryCombo = null;
        $scope.model.selectedAttributeCategoryCombo = null;
        $scope.model.selectedAttributeOptionCombos = {};
        $scope.model.selectedAttributeOptionCombo = null;
        $scope.newDataValue = {};
        $scope.dataValues = {};
        $scope.dataValuesCopy = {};
        $scope.model.basicAuditInfo = {};        
        $scope.model.categoryOptionsReady = false;
        $scope.model.valueExists = false;
        if( angular.isObject($scope.selectedOrgUnit)){
            SessionStorageService.set('SELECTED_OU', $scope.selectedOrgUnit);
            if(!$scope.model.categoryCombos){
                $scope.model.categoryCombos = [];                
                MetaDataFactory.getAll('categoryCombos').then(function(ccs){
                    angular.forEach(ccs, function(cc){
                        $scope.model.categoryCombos[cc.id] = cc;
                    });

                    $scope.loadDataSets();
                });
            }
            else{
                $scope.loadDataSets();
            }
        }
    });
    
    //load datasets associated with the selected org unit.
    $scope.loadDataSets = function() {
        $scope.model.dataSets = [];
        $scope.model.dataElements = [];
        $scope.model.selectedAttributeCategoryCombo = null;
        $scope.model.selectedCategoryCombo = null;
        $scope.model.selectedAttributeOptionCombos = {};
        $scope.model.selectedAttributeOptionCombo = null;
        $scope.model.selectedPeriod = null;
        $scope.dataValues = {};
        $scope.dataValuesCopy = {};
        $scope.newDataValue = {};
        $scope.model.dataElementsWithValue = [];
        $scope.model.valueExists = false;
        if (angular.isObject($scope.selectedOrgUnit)) {            
            DataSetFactory.getByOuAndProperty( $scope.selectedOrgUnit, $scope.model.selectedDataSet,'DataSetCategory','Disease' ).then(function(response){                
                $scope.model.dataSets = response.dataSets || [];
            });
        }        
    }; 
    
    //watch for selection of data set
    $scope.$watch('model.selectedDataSet', function() {        
        $scope.model.periods = [];
        $scope.model.dataElements = [];
        $scope.model.dataElementsWithValue = [];
        $scope.model.selectedPeriod = null;
        $scope.model.categoryOptionsReady = false;
        $scope.dataValues = {};
        $scope.dataValuesCopy = {};
        $scope.newDataValue = {};
        $scope.model.valueExists = false;
        if( angular.isObject($scope.model.selectedDataSet) && $scope.model.selectedDataSet.id){
            $scope.loadDataSetDetails();
        }
    });
    
    $scope.$watch('model.selectedPeriod', function(){
        $scope.dataValues = {};
        $scope.dataValuesCopy = {};
        $scope.model.valueExists = false;        
        $scope.loadDataEntryForm();        
    });
    
    $scope.$watch('model.sde', function(newValue, oldValue){
        if( oldValue && oldValue.id ){
            processDataValue( oldValue.id );
        }
        $scope.saveStatus = {};
    });
        
    $scope.loadDataSetDetails = function(){        
        if( $scope.model.selectedDataSet && $scope.model.selectedDataSet.id && $scope.model.selectedDataSet.periodType){
            
            var opts = {
                periodType: $scope.model.selectedDataSet.periodType,
                periodOffset: $scope.periodOffset,
                futurePeriods: $scope.model.selectedDataSet.openFuturePeriods,
                dataSetType: $scope.model.selectedDataSet.DataSetCategory
            };
            
            $scope.model.periods = PeriodService.getPeriods( opts );

            if(!$scope.model.selectedDataSet.dataElements || $scope.model.selectedDataSet.dataElements.length < 1){                
                DataEntryUtils.notify('error', 'missing_data_elements_indicators');
                return;
            }
                        
            $scope.model.selectedAttributeCategoryCombo = null;     
            if( $scope.model.selectedDataSet && $scope.model.selectedDataSet.categoryCombo && $scope.model.selectedDataSet.categoryCombo.id ){
                
                $scope.model.selectedAttributeCategoryCombo = $scope.model.categoryCombos[$scope.model.selectedDataSet.categoryCombo.id];
                if( $scope.model.selectedAttributeCategoryCombo && $scope.model.selectedAttributeCategoryCombo.isDefault ){
                    $scope.model.categoryOptionsReady = true;
                    $scope.model.selectedOptions = $scope.model.selectedAttributeCategoryCombo.categories[0].categoryOptions;
                }                
                angular.forEach($scope.model.selectedAttributeCategoryCombo.categoryOptionCombos, function(oco){
                    oco.displayName = oco.displayName.replace(', ', ',');
                    $scope.model.selectedAttributeOptionCombos['"' + oco.displayName + '"'] = oco.id;
                });
            
                $scope.model.selectedCategoryCombo = $scope.model.categoryCombos[$scope.model.selectedDataSet.dataElements[0].categoryCombo.id];

                $scope.model.selectedCategoryCombo.categories = orderByFilter($scope.model.selectedCategoryCombo.categories, '-code');

                var colCount = $scope.model.selectedCategoryCombo.categoryOptionCombos.length;

                angular.forEach($scope.model.selectedCategoryCombo.categories, function(ca){                
                    colCount = colCount / ca.categoryOptions.length;
                    ca.colSpan = colCount;
                });
                
                $scope.model.dataElements = [];
                angular.forEach($scope.model.selectedDataSet.dataElements, function(de){
                    $scope.model.dataElements[de.id] = de;
                });
            }
        }
    };
    
    var resetParams = function(){
        $scope.newDataValue = {};
        $scope.dataValues = {};
        $scope.dataValuesCopy = {};
        $scope.model.orgUnitsWithValues = [];
        $scope.model.validationResults = [];
        $scope.model.failedValidationRules = [];
        $scope.model.dataElementsWithValue = [];
        $scope.model.valueExists = false;
        $scope.model.basicAuditInfo = {};
        $scope.model.basicAuditInfo.exists = false;
        $scope.saveStatus = {};
    };
    
    var copyDataValues = function(){
        $scope.dataValuesCopy = angular.copy( $scope.dataValues );
    };
    
    $scope.loadDataEntryForm = function(){
        
        resetParams();
        if( angular.isObject( $scope.selectedOrgUnit ) && $scope.selectedOrgUnit.id &&
                angular.isObject( $scope.model.selectedDataSet ) && $scope.model.selectedDataSet.id &&
                angular.isObject( $scope.model.selectedPeriod) && $scope.model.selectedPeriod.id &&
                $scope.model.categoryOptionsReady ){
            
            var dataValueSetUrl = 'dataSet=' + $scope.model.selectedDataSet.id + '&period=' + $scope.model.selectedPeriod.id;

            dataValueSetUrl += '&orgUnit=' + $scope.selectedOrgUnit.id;
            
            $scope.model.selectedAttributeOptionCombo = DataEntryUtils.getOptionComboIdFromOptionNames($scope.model.selectedAttributeOptionCombos, $scope.model.selectedOptions);
            
            $scope.model.attributeCategoryUrl = {cc: $scope.model.selectedAttributeCategoryCombo.id, default: $scope.model.selectedAttributeCategoryCombo.isDefault, cp: DataEntryUtils.getOptionIds($scope.model.selectedOptions)};
                        
            //fetch data values...
            DataValueService.getDataValueSet( dataValueSetUrl ).then(function(response){                
                if( response && response.dataValues && response.dataValues.length > 0 ){
                    response.dataValues = $filter('filter')(response.dataValues, {attributeOptionCombo: $scope.model.selectedAttributeOptionCombo});
                    if( response.dataValues.length > 0 ){
                        $scope.model.valueExists = true;
                        response.dataValues = orderByFilter(response.dataValues, '-lastUpdated');
                        angular.forEach(response.dataValues, function(dv){
                            
                            dv.value = DataEntryUtils.formatDataValue( $scope.model.dataElements[dv.dataElement], dv.value, $scope.model.optionSets, 'USER' );
                            
                            if(!$scope.dataValues[dv.dataElement]){
                                $scope.model.dataElementsWithValue.push({id: dv.dataElement, created: DateUtils.formatFromApiToUser(dv.lastUpdated)});
                                $scope.dataValues[dv.dataElement] = {};
                                $scope.dataValues[dv.dataElement][dv.categoryOptionCombo] = dv;
                            }
                            else{                                
                                $scope.dataValues[dv.dataElement][dv.categoryOptionCombo] = dv;
                            }                            
                        });
                    }
                }
                
                angular.forEach($scope.dataValues, function(vals, de) {
                    $scope.dataValues[de] = DataEntryUtils.getDataElementTotal( $scope.dataValues, de);
                });
                
                copyDataValues();
                
                $scope.model.dataSetCompletness = {};
                CompletenessService.get( $scope.model.selectedDataSet.id, 
                                        $scope.selectedOrgUnit.id,
                                        $scope.model.selectedPeriod.id,
                                        false).then(function(response){                
                    if( response && 
                            response.completeDataSetRegistrations && 
                            response.completeDataSetRegistrations.length &&
                            response.completeDataSetRegistrations.length > 0){

                        angular.forEach(response.completeDataSetRegistrations, function(cdr){
                            $scope.model.dataSetCompletness[cdr.attributeOptionCombo] = true;                        
                        });
                    }
                });
            });
        }
    };
    
    $scope.interacted = function(field) {
        var status = false;
        if(field){            
            status = $scope.outerForm.submitted || field.$dirty;
        }
        return status;
    };
    
    function checkOptions(){
        resetParams();
        for(var i=0; i<$scope.model.selectedAttributeCategoryCombo.categories.length; i++){
            if($scope.model.selectedAttributeCategoryCombo.categories[i].selectedOption && $scope.model.selectedAttributeCategoryCombo.categories[i].selectedOption.id){
                $scope.model.categoryOptionsReady = true;
                $scope.model.selectedOptions.push($scope.model.selectedAttributeCategoryCombo.categories[i].selectedOption);
            }
            else{
                $scope.model.categoryOptionsReady = false;
                break;
            }
        }        
        if($scope.model.categoryOptionsReady){
            $scope.loadDataEntryForm();
        }
    };
    
    $scope.getCategoryOptions = function(){
        $scope.model.categoryOptionsReady = false;
        $scope.model.selectedOptions = [];
        checkOptions();      
    };
    
    $scope.getPeriods = function(mode){        
        $scope.model.selectedPeriod = null;        
        var opts = {
            periodType: $scope.model.selectedDataSet.periodType,
            periodOffset: mode === 'NXT' ? ++$scope.periodOffset: --$scope.periodOffset,
            futurePeriods: $scope.model.selectedDataSet.openFuturePeriods,
            dataSetType: $scope.model.selectedDataSet.DataSetCategory
        };        
        $scope.model.periods = PeriodService.getPeriods( opts );
    };
    
    var processDataValue = function( deId  ){        
        if( deId && $scope.newDataValue[deId] ){
            if( !$scope.dataValues[deId] ){
                $scope.dataValues[deId] = {};
                $scope.model.dataElementsWithValue.push({id: deId, created: DateUtils.getServerToday()});
            }
            else{
                for( var i=0; i<$scope.model.dataElementsWithValue.length; i++){
                    if( $scope.model.dataElementsWithValue[i].id === deId ){
                        $scope.model.dataElementsWithValue[i].created = DateUtils.getServerToday();
                        break;
                    }
                }
            }            
            $scope.dataValues[deId] = $scope.newDataValue[deId];            
        }        
    };
    
    $scope.saveDataValue = function( dataElement, ocId, isUpdate ){
        
        var deId = dataElement.id, value = '';
        //check for form validity                
        if( $scope.outerForm.$invalid ){
            if(!$scope.newDataValue[deId] ){
                $scope.newDataValue[deId] = {};
            }
            $scope.newDataValue[deId][ocId] = $scope.dataValuesCopy[deId] && $scope.dataValuesCopy[deId][ocId] ? $scope.dataValuesCopy[deId][ocId] : {value: null};
            
            if( $scope.dataValues[deId] ){
                $scope.dataValues[deId][ocId] = $scope.dataValuesCopy[deId] && $scope.dataValuesCopy[deId][ocId] ? $scope.dataValuesCopy[deId][ocId] : {value: null};
            }
            $scope.outerForm.$error = {};
            $scope.outerForm.$setPristine();
            return ;
        }
        
        //form is valid        
        $scope.saveStatus[ deId + '-' + ocId] = {saved: false, pending: true, error: false};
        
        var getExistingValue=function(deId,ocId){
            if($scope.dataValues[deId] && $scope.dataValues[deId][ocId] && ($scope.dataValues[deId][ocId].value || $scope.dataValues[deId][ocId].value === 0 )){
                return $scope.dataValues[deId][ocId].value;
            }
            else{
                return '';
            }
        };
        
        var getNewValue=function(deId,ocId){
            if($scope.newDataValue[deId] && $scope.newDataValue[deId][ocId] && ($scope.newDataValue[deId][ocId].value || $scope.newDataValue[deId][ocId].value === 0 )){                
                return $scope.newDataValue[deId][ocId].value;
            }
            else{
                return '';
            }
        };
        
        if( isUpdate ){
            value = getExistingValue(deId,ocId);
            $scope.dataValues[deId] = DataEntryUtils.getDataElementTotal($scope.dataValues, deId);
        }
        else{
            value = getNewValue(deId,ocId);
            $scope.newDataValue[deId] = DataEntryUtils.getDataElementTotal($scope.newDataValue, deId);
        }
        
        var dataValue = {
            ou: $scope.selectedOrgUnit.id,
            pe: $scope.model.selectedPeriod.id,
            de: deId,
            co: ocId,
            value: value,
            ao: $scope.model.selectedAttributeOptionCombo
        };
                
        dataValue.value = DataEntryUtils.formatDataValue( dataElement, dataValue.value, $scope.model.optionSets, 'API' );
        
        if( $scope.model.selectedAttributeCategoryCombo && !$scope.model.selectedAttributeCategoryCombo.isDefault ){            
            dataValue.cc = $scope.model.selectedAttributeCategoryCombo.id;
            dataValue.cp = DataEntryUtils.getOptionIds($scope.model.selectedOptions);
        }
        
        /*var processDataValue = function(){
            
            if(!$scope.dataValues[deId]){                                
                $scope.dataValues[deId] = {};
                $scope.dataValues[deId][ocId] = dataValue;
                $scope.model.dataElementsWithValue.push({id: deId, created: DateUtils.getServerToday()});
            }
            else{                                
                $scope.dataValues[deId][ocId] = dataValue;
                for( var i=0; i<$scope.model.dataElementsWithValue.length; i++){
                    if( $scope.model.dataElementsWithValue[i].id === deId ){
                        $scope.model.dataElementsWithValue[i].created = DateUtils.getServerToday();
                        break;
                    }
                }
            }
            
            $scope.dataValues[deId] = DataEntryUtils.getDataElementTotal( $scope.dataValues, deId);
            copyDataValues();
        };*/
        
        var saveSuccessStatus = function(){
            $scope.saveStatus[deId + '-' + ocId].saved = true;
            $scope.saveStatus[deId + '-' + ocId].pending = false;
            $scope.saveStatus[deId + '-' + ocId].error = false;            
        };
        
        var saveFailureStatus = function(){
            $scope.saveStatus[deId + '-' + ocId].saved = false;
            $scope.saveStatus[deId + '-' + ocId].pending = false;
            $scope.saveStatus[deId + '-' + ocId].error = true;
        };
        
        DataValueService.saveDataValue( dataValue ).then(function(response){
           saveSuccessStatus();
        }, function(){
            saveFailureStatus();
        });
    };    
    
    $scope.getIndicatorValue = function( indicator ){  
        return DataEntryUtils.getIndicatorResult( indicator, $scope.dataValues );
    };
    
    $scope.getInputNotifcationClass = function(deId, ocId){
        
        var style = 'form-control';        
        var currentElement = $scope.saveStatus[deId + '-' + ocId];
        
        if( currentElement ){
            if(currentElement.pending){
                style = 'form-control input-pending';
            }
            if(currentElement.saved){
                style = 'form-control input-success';
            }            
            else{
                style = 'form-control input-error';
            }
        }
        return style;
    };

    $scope.saveCompletness = function(orgUnit, multiOrgUnit){
        
        var modalOptions = {
            closeButtonText: 'no',
            actionButtonText: 'yes',
            headerText: 'mark_complete',
            bodyText: 'are_you_sure_to_save_completeness'
        };
        ModalService.showModal({}, modalOptions).then(function(result){

            var dsr = {completeDataSetRegistrations: [{dataSet: $scope.model.selectedDataSet.id, organisationUnit: $scope.selectedOrgUnit.id, period: $scope.model.selectedPeriod.id, attributeOptionCombo: $scope.model.selectedAttributeOptionCombo}]};
            CompletenessService.save(dsr).then(function(response){                    
                if( response && response.status === 'SUCCESS' ){
                    var dialogOptions = {
                        headerText: 'success',
                        bodyText: 'marked_complete'
                    };
                    DialogService.showDialog({}, dialogOptions);
                    $scope.model.dataSetCompletness[$scope.model.selectedAttributeOptionCombo] = true;
                }                
            }, function(response){
                DataEntryUtils.errorNotifier( response );
            });
        });        
    };
    
    $scope.deleteCompletness = function( orgUnit, multiOrgUnit){
        var modalOptions = {
            closeButtonText: 'no',
            actionButtonText: 'yes',
            headerText: 'mark_incomplete',
            bodyText: 'are_you_sure_to_delete_completeness'
        };

        ModalService.showModal({}, modalOptions).then(function(result){
            
            CompletenessService.delete($scope.model.selectedDataSet.id, 
                $scope.model.selectedPeriod.id, 
                orgUnit,
                $scope.model.selectedAttributeCategoryCombo.id,
                DataEntryUtils.getOptionIds($scope.model.selectedOptions),
                multiOrgUnit).then(function(response){
                
                var dialogOptions = {
                    headerText: 'success',
                    bodyText: 'marked_incomplete'
                };
                DialogService.showDialog({}, dialogOptions);
                $scope.model.dataSetCompletness[$scope.model.selectedAttributeOptionCombo] = false;
                
            }, function(response){
                DataEntryUtils.errorNotifier( response );
            });
        });        
    };
        
    $scope.showEditCase = function(){
        var deId = ContextMenuSelectedItem.getSelectedItem();
        if( deId && $scope.model.dataElements[deId] )
        {
            console.log( 'case to be edited:  ', ContextMenuSelectedItem.getSelectedItem());
        }
    };
    
    $scope.deleteCase = function(){
        var deId = ContextMenuSelectedItem.getSelectedItem();
        if( deId && $scope.model.dataElements[deId] )
        {
            console.log( 'case to be deleted:  ', ContextMenuSelectedItem.getSelectedItem());
        }
    };
    
    $scope.toggleDimensionInput = function(){
        if( !$scope.model.sde ){
            $scope.newDataValue = {};
        }
    };
    
    $scope.isGreyedField = function( deId, ocoId){
        if( !deId || 
            !ocoId || 
            !$scope.model.selectedDataSet || 
            !$scope.model.selectedDataSet.sections ||
            !$scope.model.selectedDataSet.sections[0] ||
            !$scope.model.selectedDataSet.sections[0].greyedFields){
            return false;
        }
        
        var dimensionItem = deId + '.' + ocoId;
        if( $scope.model.selectedDataSet.sections[0].greyedFields.indexOf( dimensionItem ) !== -1 ){
            return true;
        }
        
        return false;
    };
});
