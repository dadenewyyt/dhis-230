/* global angular */

'use strict';

var diseaseRegistration = angular.module('diseaseRegistration');

//Controller for settings page
diseaseRegistration.controller('dataEntryController',
        function($scope,
                $filter,
                $modal,
                $translate,
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
                DialogService) {
    $scope.periodOffset = 0;
    $scope.maxOptionSize = 30;
    $scope.saveStatus = {};    
    $scope.model = {invalidDimensions: false,
                    sde: null,
                    selectedAttributeCategoryCombo: null,
                    standardDataSets: [],
                    multiDataSets: [],
                    dataElements: [],
                    dataSets: [],
                    optionSets: null,
                    displayCustomForm: false,
                    categoryOptionsReady: false,
                    allowMultiOrgUnitEntry: false,
                    selectedOptions: [],
                    orgUnitsWithValues: [],
                    selectedCategoryCombo: null,
                    selectedAttributeOptionCombos: {},
                    selectedAttributeOptionCombo: null,
                    categoryCombos: {},
                    optionCombos: {},
                    validationRules: [],
                    validationResults: [],
                    failedValidationRules: [],
                    attributeCategoryUrl: null,
                    showCustomForm: false,
                    valueExists: false};
    
    //watch for selection of org unit from tree
    $scope.$watch('selectedOrgUnit', function() {
        $scope.model.periods = [];
        $scope.model.dataSets = [];
        $scope.model.dataElements = [];
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
        $scope.model.orgUnitsWithValues = [];
        $scope.model.categoryOptionsReady = false;
        $scope.model.valueExists = false;
        if( angular.isObject($scope.selectedOrgUnit)){
            SessionStorageService.set('SELECTED_OU', $scope.selectedOrgUnit);
            if(!$scope.model.optionSets){
                $scope.model.optionSets = [];                
                MetaDataFactory.getAll('optionSets').then(function(opts){
                    angular.forEach(opts, function(op){
                        $scope.model.optionSets[op.id] = op;
                    });
                    
                    MetaDataFactory.getAll('categoryCombos').then(function(ccs){
                        angular.forEach(ccs, function(cc){
                            $scope.model.categoryCombos[cc.id] = cc;
                        });

                        $scope.loadDataSets();
                    }); 
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
        $scope.model.orgUnitsWithValues = [];
        $scope.dataValues = {};
        $scope.dataValuesCopy = {};
        $scope.newDataValue = {};
        $scope.model.valueExists = false;
        $scope.model.displayCustomForm = false;
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
        $scope.model.selectedPeriod = null;
        $scope.model.categoryOptionsReady = false;
        $scope.dataValues = {};
        $scope.dataValuesCopy = {};
        $scope.newDataValue = {};
        $scope.model.orgUnitsWithValues = [];
        $scope.model.valueExists = false;
        $scope.model.displayCustomForm = false;
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
    
    $scope.$watch('model.sde', function(){
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
                        angular.forEach(response.dataValues, function(dv){
                            
                            dv.value = DataEntryUtils.formatDataValue( $scope.model.dataElements[dv.dataElement], dv.value, $scope.model.optionSets, 'USER' );
                            
                            if(!$scope.dataValues[dv.dataElement]){                                
                                $scope.dataValues[dv.dataElement] = {};
                                $scope.dataValues[dv.dataElement][dv.categoryOptionCombo] = dv;
                            }
                            else{                                
                                $scope.dataValues[dv.dataElement][dv.categoryOptionCombo] = dv;
                            }                            
                        });
                        response.dataValues = orderByFilter(response.dataValues, '-created').reverse();
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
    
    $scope.saveDataValue = function( dataElement, ocId, isUpdate ){
        
        var deId = dataElement.id;
        //check for form validity                
        if( $scope.outerForm.$invalid ){
            if(!$scope.newDataValue[deId] ){
                $scope.newDataValue[deId] = {};
            }
            $scope.newDataValue[deId][ocId] = $scope.dataValuesCopy[deId] && $scope.dataValuesCopy[deId][ocId] ? $scope.dataValuesCopy[deId][ocId] : {value: null};
            $scope.outerForm.$error = {};
            $scope.outerForm.$setPristine();
            return ;
        }
        
        //form is valid        
        $scope.saveStatus[ deId + '-' + ocId] = {saved: false, pending: true, error: false};
        
        var getExistingValue=function(deId,ocId){
            if($scope.dataValues[deId] && $scope.dataValues[deId][ocId] && ($scope.dataValues[deId][ocId].value || $scope.dataValues[deId][ocId].value === 0 || $scope.dataValues[deId][ocId].value === false)){
                //above condition is included to allow saving of the value zero and false,
                //since the condition automatically assumes both zero and false as a false condition, it was jumping them.
                return $scope.dataValues[deId][ocId].value;
            }
            else{
                return '';
            }
        };
        
        var getNewValue=function(deId,ocId){
            if($scope.newDataValue[deId] && $scope.newDataValue[deId][ocId] && ($scope.newDataValue[deId][ocId].value || $scope.newDataValue[deId][ocId].value === 0 || $scope.newDataValue[deId][ocId].value === false)){
                //above condition is included to allow saving of the value zero and false,
                //since the condition automatically assumes both zero and false as a false condition, it was jumping them.
                return $scope.newDataValue[deId][ocId].value;
            }
            else{
                return '';
            }
        };
        
        var value = getExistingValue(deId,ocId);
        
        if( !isUpdate ){
            value = value + getNewValue( deId, ocId);
        }
        
        var dataValue = {ou: $scope.selectedOrgUnit.id,
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
        
        var processDataValue = function(){
            
            if(!$scope.dataValues[deId]){                                
                $scope.dataValues[deId] = {};
                $scope.dataValues[deId][ocId] = dataValue;
            }
            else{                                
                $scope.dataValues[deId][ocId] = dataValue;
            }
            
            $scope.dataValues[deId] = DataEntryUtils.getDataElementTotal( $scope.dataValues, deId);
            
            copyDataValues();
            //$scope.newDataValue = {};
            //$scope.model.sde = null;
        };
        
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
           processDataValue();           
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
        
        var failedHighImportanceValidationRules=[];
        if($scope.model.failedValidationRules.length >0){
            angular.forEach($scope.model.failedValidationRules, function(failedValidationRule){
                var validationRule=$scope.model.validationRules[failedValidationRule];
                if(validationRule.importance==="HIGH"){
                    failedHighImportanceValidationRules.push(validationRule);
                }
            });
            if(failedHighImportanceValidationRules.length>0){
                var modalOptions = {
                    closeButtonText: 'no',
                    actionButtonText: 'no',
                    headerText: 'failed_validation_rules',
                    bodyText: 'following_validation_errors_exist <br/> Hello</table><p> HI</p>' 
                };
                
                var modalInstance = $modal.open({
                    templateUrl: 'views/modal-validation-list.html',
                    controller: 'DataEntryValidationlistController',
                    windowClass: 'modal-window-history',
                    resolve: {
                        failedValidationRules : function(){
                            return failedHighImportanceValidationRules;
                        }
                    }
                });
                modalInstance.result.then(function(status){
                    return //Nothing is expected from the user.
                });
            }
        }
        if(failedHighImportanceValidationRules.length<=0){
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
        }        
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
    
    $scope.setSelectedCase = function(deId){
        ContextMenuSelectedItem.setSelectedItem(deId);        
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
});
