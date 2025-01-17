/* Pagination service */
/* global angular, dhis2, moment */

var mappedMonthNames = {
		ethiopian: ['Meskerem', 'Tikemet', 'Hidar', 'Tahesas', 'Tir', 'Yekatit', 'Megabit', 'Miazia', 'Genbot', 'Sene', 'Hamle', 'Nehase'],
		gregorian: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};

var d2Services = angular.module('d2Services', ['ngResource'])

/* Factory for loading translation strings */
.factory('i18nLoader', function ($q, $http, SessionStorageService, DHIS2URL) {

    var getTranslationStrings = function (locale) {
        var defaultUrl = 'i18n/i18n_app.properties';
        var url = '';
        if (locale === 'en' || !locale) {
            url = defaultUrl;
        }
        else {
            url = 'i18n/i18n_app_' + locale + '.properties';
        }

        var tx = {locale: locale};

        var promise = $http.get(url).then(function (response) {
            tx = {locale: locale, keys: dhis2.util.parseJavaProperties(response.data)};
            return tx;
        }, function () {

            var p = $http.get(defaultUrl).then(function (response) {
                tx = {locale: locale, keys: dhis2.util.parseJavaProperties(response.data)};
                return tx;
            });
            return p;
        });
        return promise;
    };

    var getLocale = function () {
        var locale = 'en';

        var promise = $http.get( DHIS2URL + '/me/profile.json').then(function (response) {
            SessionStorageService.set('USER_PROFILE', response.data);
            if (response.data && response.data.settings && response.data.settings.keyUiLocale) {
                locale = response.data.settings.keyUiLocale;
            }
            return locale;
        }, function () {
            return locale;
        });

        return promise;
    };
    return function () {
        var deferred = $q.defer(), translations;
        var userProfile = SessionStorageService.get('USER_PROFILE');
        if (userProfile && userProfile.settings && userProfile.settings.keyUiLocale) {
            getTranslationStrings(userProfile.settings.keyUiLocale).then(function (response) {
                translations = response.keys;
                deferred.resolve(translations);
            });
            return deferred.promise;
        }
        else {
            getLocale().then(function (locale) {
                getTranslationStrings(locale).then(function (response) {
                    translations = response.keys;
                    deferred.resolve(translations);
                });
            });
            return deferred.promise;
        }
    };
})

.service('AuthorityService', function () {
    var getAuthorities = function (roles) {
        var authority = {};
        if (roles && roles.userCredentials && roles.userCredentials.userRoles) {
            angular.forEach(roles.userCredentials.userRoles, function (role) {
                angular.forEach(role.authorities, function (auth) {
                    authority[auth] = true;
                });
            });
        }
        return authority;
    };

    return {
        getUserAuthorities: function (roles) {
            var auth = getAuthorities(roles);
            var authority = {};
            authority.canDeleteEvent = auth['F_TRACKED_ENTITY_DATAVALUE_DELETE'] || auth['ALL'] ? true : false;
            authority.canAddOrUpdateEvent = auth['F_TRACKED_ENTITY_DATAVALUE_ADD'] || auth['ALL'] ? true : false;
            authority.canSearchTei = auth['F_TRACKED_ENTITY_INSTANCE_SEARCH'] || auth['ALL'] ? true : false;
            authority.canDeleteTei = auth['F_TRACKED_ENTITY_INSTANCE_DELETE'] || auth['ALL'] ? true : false;
            authority.canRegisterTei = auth['F_TRACKED_ENTITY_INSTANCE_ADD'] || auth['ALL'] ? true : false;
            authority.canEnrollTei = auth['F_PROGRAM_ENROLLMENT'] || auth['ALL'] ? true : false;
            authority.canUnEnrollTei = auth['F_PROGRAM_UNENROLLMENT'] || auth['ALL'] ? true : false;
            authority.canAdministerDashboard = auth['F_PROGRAM_DASHBOARD_CONFIG_ADMIN'] || auth['ALL'] ? true : false;
            return authority;
        }
    };
})

/* Factory for loading external data */
.factory('ExternalDataFactory', function ($http) {

    return {
        get: function (fileName) {
            var promise = $http.get(fileName).then(function (response) {
                return response.data;
            });
            return promise;
        }
    };
})

/* service for wrapping sessionStorage '*/
.service('SessionStorageService', function ($window) {
    return {
        get: function (key) {
            return JSON.parse($window.sessionStorage.getItem(key));
        },
        set: function (key, obj) {
            $window.sessionStorage.setItem(key, JSON.stringify(obj));
        },
        clearAll: function () {
            for (var key in $window.sessionStorage) {
                $window.sessionStorage.removeItem(key);
            }
        }
    };
})

/* Service for option name<->code conversion */
.factory('OptionSetService', function() {
    return {
        getCode: function(options, key){
            if(options){
                for(var i=0; i<options.length; i++){
                    if( key === options[i].displayName){
                        return options[i].code;
                    }
                }
            }
            return key;
        },
        getName: function(options, key){
            if(options){
                for(var i=0; i<options.length; i++){
                    if( key === options[i].code){
                        return options[i].displayName;
                    }
                }
            }
            return key;
        }
    };
})

/* service for getting calendar setting */
.service('CalendarService', function (storage, $rootScope) {

    return {
        getSetting: function () {

            var dhis2CalendarFormat = {keyDateFormat: 'yyyy-MM-dd', keyCalendar: 'gregorian', momentFormat: 'YYYY-MM-DD'};
            var storedFormat = storage.get('SYSTEM_SETTING');
            if (angular.isObject(storedFormat) && storedFormat.keyDateFormat && storedFormat.keyCalendar) {
                if (storedFormat.keyCalendar === 'iso8601') {
                    storedFormat.keyCalendar = 'gregorian';
                }

                if (storedFormat.keyDateFormat === 'dd-MM-yyyy') {
                    dhis2CalendarFormat.momentFormat = 'DD-MM-YYYY';
                }

                dhis2CalendarFormat.keyCalendar = storedFormat.keyCalendar;
                dhis2CalendarFormat.keyDateFormat = storedFormat.keyDateFormat;
            }
            $rootScope.dhis2CalendarFormat = dhis2CalendarFormat;
            return dhis2CalendarFormat;
        }
    };
})

/* service for dealing with dates */
.service('DateUtils', function ($filter, CalendarService) {

    return {
        getDate: function (dateValue) {
            if (!dateValue) {
                return;
            }
            var calendarSetting = CalendarService.getSetting();
            dateValue = moment(dateValue, calendarSetting.momentFormat)._d;
            return Date.parse(dateValue);
        },
        format: function (dateValue) {
            if (!dateValue) {
                return;
            }

            var calendarSetting = CalendarService.getSetting();
            dateValue = moment(dateValue, calendarSetting.momentFormat)._d;
            dateValue = $filter('date')(dateValue, calendarSetting.keyDateFormat);
            return dateValue;
        },
        formatToHrsMins: function (dateValue) {
            var calendarSetting = CalendarService.getSetting();
            var dateFormat = 'YYYY-MM-DD @ hh:mm A';
            if (calendarSetting.keyDateFormat === 'dd-MM-yyyy') {
                dateFormat = 'DD-MM-YYYY @ hh:mm A';
            }
            return moment(dateValue).format(dateFormat);
        },
        formatToHrsMinsSecs: function (dateValue) {
            var calendarSetting = CalendarService.getSetting();
            var dateFormat = 'YYYY-MM-DD @ hh:mm:ss A';
            if (calendarSetting.keyDateFormat === 'dd-MM-yyyy') {
                dateFormat = 'DD-MM-YYYY @ hh:mm:ss A';
            }
            return moment(dateValue).format(dateFormat);
        },
        getServerToday: function () {            
            var tdy = $.calendars.instance('gregorian').newDate();
            var today = moment(tdy._year + '-' + tdy._month + '-' + tdy._day, 'YYYY-MM-DD')._d;
            today = Date.parse(today);
            today = $filter('date')(today, 'yyyy-MM-dd');
            return today;
        },
        getToday: function () {
            var calendarSetting = CalendarService.getSetting();
            var tdy = $.calendars.instance(calendarSetting.keyCalendar).newDate();
            var today = moment(tdy._year + '-' + tdy._month + '-' + tdy._day, 'YYYY-MM-DD')._d;
            today = Date.parse(today);
            today = $filter('date')(today, calendarSetting.keyDateFormat);
            return today;
        },
        formatFromUserToApi: function (dateValue) {
            if (!dateValue) {
                return;
            }
            var calendarSetting = CalendarService.getSetting();
            dateValue = moment(dateValue, calendarSetting.momentFormat)._d;
            dateValue = Date.parse(dateValue);
            dateValue = $filter('date')(dateValue, 'yyyy-MM-dd');
            return dateValue;
        },
        formatFromApiToUser: function (dateValue) {
            if (!dateValue) {
                return;
            }
            var calendarSetting = CalendarService.getSetting();
            if (moment(dateValue, calendarSetting.momentFormat).format(calendarSetting.momentFormat) === dateValue) {
                return dateValue;
            }
            dateValue = moment(dateValue, 'YYYY-MM-DD')._d;
            return $filter('date')(dateValue, calendarSetting.keyDateFormat);
        },
        getDateAfterOffsetDays: function (offSetDays) {
            var date = new Date();
            date.setDate(date.getDate()+offSetDays);
            var calendarSetting = CalendarService.getSetting();
            var tdy = $.calendars.instance(calendarSetting.keyCalendar).fromJSDate(date);
            var dateAfterOffset = moment(tdy._year + '-' + tdy._month + '-' + tdy._day, 'YYYY-MM-DD')._d;
            dateAfterOffset = Date.parse(dateAfterOffset);
            dateAfterOffset = $filter('date')(dateAfterOffset, calendarSetting.keyDateFormat);
            return dateAfterOffset;
        }
    };
})

/* service for dealing with custom form */
.service('CustomFormService', function ($translate, NotificationService) {

    return {
        getForDataSet: function (dataSet, dataElements) {

            var htmlCode = dataSet.dataEntryForm ? dataSet.dataEntryForm.htmlCode : null;

            if (htmlCode) {
                var inputRegex = /<input.*?\/>/g,
                    match,
                    inputFields = [];

                while (match = inputRegex.exec(htmlCode)) {
                    inputFields.push(match[0]);
                }

                for (var i = 0; i < inputFields.length; i++) {
                    
                    var inputField = inputFields[i];
                    
                    var inputElement = $.parseHTML(inputField);
                    var attributes = {};

                    $(inputElement[0].attributes).each(function () {
                        attributes[this.nodeName] = this.value;
                    });

                    var fieldId = '', newInputField;
                    if (attributes.hasOwnProperty('id')) {
                        
                        fieldId = attributes['id'];

                        //name needs to be unique so that it can be used for validation in angularjs
                        if (attributes.hasOwnProperty('name')) {
                            attributes['name'] = fieldId;
                        }
                        
                        if( attributes.id.startsWith('total') ){
                            newInputField += '<td style="text-align: center">Total</span></td>';
                        }
                        else if( attributes.id.startsWith('indicator') ){
                            newInputField += '<td style="text-align: center">Indicator</span></td>';
                        }
                        else{
                                                    
                            var ids = fieldId.split('-');
                            var deId = ids[0];
                            var ocId = ids[1];
                            var de = dataElements[deId];
                            
                            var dataElementId = 'model.dataElements.' + deId + '.id';
                            var optionComboId = 'model.optionCombos.' + ocId + '.id';
                            
                            /*deId = 'model.dataElements.' + deId + '.id';
                            ocId = 'model.optionCombos.' + ocId + '.id';*/
                            
                            if (de && de.valueType) {

                                var commonInputFieldProperty = this.getAttributesAsString(attributes) +
                                    ' ng-model="dataValues.' + deId + '.' + ocId + '.value" ' +
                                    ' d2-blur="saveDataValue(' + dataElementId + ', '+ optionComboId +')"';

                                if (de.optionSetValue) {
                                    var optionSetId = de.optionSet.id;
                                    newInputField = '<span class="hideInPrint"><ui-select style="width: 100%;" theme="select2" ' + commonInputFieldProperty + ')" >' +
                                        '<ui-select-match ng-class="getInputNotifcationClass(' + dataElementId + ','+ optionComboId +')" allow-clear="true" placeholder="' + $translate.instant('select_or_search') + '">{{$select.selected.displayName || $select.selected}}</ui-select-match>' +
                                        '<ui-select-choices ' +
                                        ' repeat="option.displayName as option in optionSets.' + optionSetId + '.options | filter: $select.search | limitTo:maxOptionSize">' +
                                        '<span ng-bind-html="option.displayName | highlight: $select.search">' +
                                        '</span>' +
                                        '</ui-select-choices>' +
                                        '</ui-select></span>';
                                }
                                else {                                    
                                    if (de.valueType === "NUMBER" ||
                                        de.valueType === "INTEGER" ||
                                        de.valueType === "INTEGER_POSITIVE" ||
                                        de.valueType === "INTEGER_NEGATIVE" ||
                                        de.valueType === "INTEGER_ZERO_OR_POSITIVE") {
                                        newInputField = '<span class="hideInPrint"><input type="number" ' +
                                            ' d2-number-validator ' +
                                            ' ng-class="{{getInputNotifcationClass(' + dataElementId + ','+ optionComboId +')}}" ' +
                                            ' number-type="' + de.valueType + '" ' +
                                            commonInputFieldProperty + '></span>';
                                    }
                                    else if (de.valueType === "DATE") {
                                        var maxDate = de.allowFutureDate ? '' : 0;
                                        newInputField = '<span class="hideInPrint"><input type="text" ' +
                                            ' placeholder="{{dhis2CalendarFormat.keyDateFormat}}" ' +
                                            ' ng-class="{{getInputNotifcationClass(' + dataElementId + ',' + optionComboId + ')}}" ' +
                                            ' d2-date ' +
                                            ' d2-date-validator ' +
                                            ' max-date="' + maxDate + '"' +
                                            commonInputFieldProperty + ' ></span>';
                                    }
                                    else if (de.valueType === "TRUE_ONLY") {
                                        newInputField = '<span class="hideInPrint"><input type="checkbox" ' +
                                            ' ng-class="{{getInputNotifcationClass(' + dataElementId + ','+ optionComboId +')}}" ' +
                                            commonInputFieldProperty + ' ></span>';
                                    }
                                    else if (de.valueType === "LONG_TEXT") {
                                        newInputField = '<span class="hideInPrint"><textarea row="3" ' +
                                            ' ng-class="{{getInputNotifcationClass(' + dataElementId + ','+ optionComboId +')}}" ' +
                                            commonInputFieldProperty + '></textarea></span>';
                                    }
                                    else if (de.valueType === "TEXT") {
                                        newInputField = '<span class="hideInPrint"><input type="text" ' +
                                            ' ng-class="{{getInputNotifcationClass(' + dataElementId + ','+ optionComboId +')}}" ' +
                                            commonInputFieldProperty + '></span>';
                                    }
                                    else{
                                        newInputField = ' {{"unsupported_value_type" | translate }}: ' + de.valueType;
                                    }
                                }
                            }
                            else{
                                NotificationService.showNotifcationDialog($translate.instant("error"),
                                    $translate.instant("custom_form_has_invalid_dataelement"));

                                return;
                            }

                            newInputField = newInputField + ' <span ng-messages="outerForm.' + fieldId + '.$error" class="required" ng-if="interacted(outerForm.' + fieldId + ')" ng-messages-include="../dhis-web-commons/angular-forms/error-messages.html"></span>';

                            htmlCode = htmlCode.replace(inputField, newInputField);
                        }

                    }
                }
                
                return {htmlCode: htmlCode, hasEventDate: false};
            }
            return null;
        },
        getForDataSetReport: function (dataSet, dataElements, dataValues, columns) {

            var htmlCode = dataSet.dataEntryForm ? dataSet.dataEntryForm.htmlCode : null;

            if (htmlCode) {
                
                var headerCols = '', cellCols = '';
                for( var j=0; j<columns.length; j++){
                    headerCols += '<td><strong>' + columns[j].name + '</strong></td>';
                    cellCols += '<td>' + columns[j].iso + '</td>';
                }
                
                var inputRegex = /<input.*?\/>/g,
                    trRegex = /<tr[\s\S]*?<\/tr>/g,
                    tdRegex = /<td[\s\S]*?<\/td>/g,
                    inputMatch,
                    trMatch,
                    tdMatch,
                    inputFields = [],
                    rows = [],
                    cells = [],
                    firstRow,
                    firstInputFound = false,
                    rowCount = 0;
                
                while ( trMatch = trRegex.exec(htmlCode) ){                    
                    
                    rows.push( trMatch[0] );
                    
                    while( tdMatch = tdRegex.exec(trMatch[0]) ){
                        
                        while( inputMatch = inputRegex.exec( tdMatch[0] ) )
                        {
                            cells.push( tdMatch[0] );
                            inputFields.push( inputMatch[0] );                            
                            if( !firstInputFound ){
                                firstRow = rows[rowCount-1];
                                firstInputFound = true;
                            }
                        }
                    }
                    rowCount++;
                }
                
                var lastHeaderCell = firstRow.match(tdRegex);
                htmlCode = htmlCode.replace(lastHeaderCell[lastHeaderCell.length-1], headerCols);                
                
                var index = 0;
                inputFields.forEach(function(inputField){
                                       
                    var inputElement = $.parseHTML(inputField);
                    var attributes = {};
                    
                    $(inputElement[0].attributes).each(function () {
                        attributes[this.nodeName] = this.value;
                    });
                    
                    var fieldId = '', newInputField = '';
                    
                    if (attributes.hasOwnProperty('id')) {
                        
                        fieldId = attributes['id'];
                        
                        if( attributes.id.startsWith('total') ){
                            columns.forEach(function(col){
                                var val = col.id;
                                /*if( dataValues[deId] && dataValues[deId][ocId] && dataValues[deId][ocId][col.id] ){
                                    val = dataValues[deId][ocId][col.id];
                                }*/
                                newInputField += '<td style="text-align: center">' + val + '</span></td>';
                            });
                        }
                        else if( attributes.id.startsWith('indicator') ){
                            columns.forEach(function(col){
                                var val = col.id;
                                /*if( dataValues[deId] && dataValues[deId][ocId] && dataValues[deId][ocId][col.id] ){
                                    val = dataValues[deId][ocId][col.id];
                                }*/
                                newInputField += '<td style="text-align: center">' + val + '</span></td>';
                            });
                        }
                        else{
                            newInputField = '';
                            var ids = fieldId.split('-');
                            var deId = ids[0];
                            var ocId = ids[1];
                            
                            columns.forEach(function(col){
                                var val = '';
                                if( dataValues[deId] && dataValues[deId][ocId] && dataValues[deId][ocId][col.id] ){
                                    val = dataValues[deId][ocId][col.id];
                                }
                                newInputField += '<td style="text-align: center">' + val + '</span></td>';
                            });
                        }
                    }
                    
                    htmlCode = htmlCode.replace( cells[index], newInputField );
                    index++;
                });
                
                return {htmlCode: htmlCode, hasEventDate: false};
            }
            return null;
        },
        getAttributesAsString: function (attributes) {
            if (attributes) {
                var attributesAsString = '';
                for (var prop in attributes) {
                    if (prop !== 'value' && prop !== 'title') {
                        attributesAsString += prop + '="' + attributes[prop] + '" ';
                    }
                }
                return attributesAsString;
            }
            return null;
        }
    };
})

/* Context menu for grid*/
.service('ContextMenuSelectedItem', function () {
    this.selectedItem = '';

    this.setSelectedItem = function (selectedItem) {
        this.selectedItem = selectedItem;
    };

    this.getSelectedItem = function () {
        return this.selectedItem;
    };
})

/* Modal service for user interaction */
.service('ModalService', ['$modal', function ($modal) {

    var modalDefaults = {
        backdrop: true,
        keyboard: true,
        modalFade: true,
        templateUrl: 'views/modal.html'
    };

    var modalOptions = {
        closeButtonText: 'Close',
        actionButtonText: 'OK',
        headerText: 'Proceed?',
        bodyText: 'Perform this action?'
    };

    this.showModal = function (customModalDefaults, customModalOptions) {
        if (!customModalDefaults)
            customModalDefaults = {};
        customModalDefaults.backdrop = 'static';
        return this.show(customModalDefaults, customModalOptions);
    };

    this.show = function (customModalDefaults, customModalOptions) {
        //Create temp objects to work with since we're in a singleton service
        var tempModalDefaults = {};
        var tempModalOptions = {};

        //Map angular-ui modal custom defaults to modal defaults defined in service
        angular.extend(tempModalDefaults, modalDefaults, customModalDefaults);

        //Map modal.html $scope custom properties to defaults defined in service
        angular.extend(tempModalOptions, modalOptions, customModalOptions);

        if (!tempModalDefaults.controller) {
            tempModalDefaults.controller = function ($scope, $modalInstance) {
                $scope.modalOptions = tempModalOptions;
                $scope.modalOptions.ok = function (result) {
                    $modalInstance.close(result);
                };
                $scope.modalOptions.close = function (result) {
                    $modalInstance.dismiss('cancel');
                };
            };
        }

        return $modal.open(tempModalDefaults).result;
    };

}])

/* Dialog service for user interaction */
.service('DialogService', ['$modal', function ($modal) {

    var dialogDefaults = {
        backdrop: true,
        keyboard: true,
        backdropClick: true,
        modalFade: true,
        templateUrl: 'views/dialog.html'
    };

    var dialogOptions = {
        closeButtonText: 'close',
        actionButtonText: 'ok',
        headerText: 'dhis2_tracker',
        bodyText: 'Perform this action?'
    };

    this.showDialog = function (customDialogDefaults, customDialogOptions) {
        if (!customDialogDefaults)
            customDialogDefaults = {};
        customDialogDefaults.backdropClick = false;
        return this.show(customDialogDefaults, customDialogOptions);
    };

    this.show = function (customDialogDefaults, customDialogOptions) {
        //Create temp objects to work with since we're in a singleton service
        var tempDialogDefaults = {};
        var tempDialogOptions = {};

        //Map angular-ui modal custom defaults to modal defaults defined in service
        angular.extend(tempDialogDefaults, dialogDefaults, customDialogDefaults);

        //Map modal.html $scope custom properties to defaults defined in service
        angular.extend(tempDialogOptions, dialogOptions, customDialogOptions);

        if (!tempDialogDefaults.controller) {
            tempDialogDefaults.controller = function ($scope, $modalInstance) {
                $scope.dialogOptions = tempDialogOptions;
                $scope.dialogOptions.ok = function (result) {
                    $modalInstance.close(result);
                };
            };
        }

        return $modal.open(tempDialogDefaults).result;
    };

}])
.service('NotificationService', function (DialogService) {
    this.showNotifcationDialog = function(errorMsgheader, errorMsgBody){
        var dialogOptions = {
            headerText: errorMsgheader,
            bodyText: errorMsgBody
        };
        DialogService.showDialog({}, dialogOptions);
    };

    this.showNotifcationWithOptions = function(dialogDefaults, dialogOptions){
        DialogService.showDialog(dialogDefaults, dialogOptions);
    };

})
.service('Paginator', function () {
    this.page = 1;
    this.pageSize = 50;
    this.itemCount = 0;
    this.pageCount = 0;
    this.toolBarDisplay = 5;

    this.setPage = function (page) {
        if (page > this.getPageCount()) {
            return;
        }

        this.page = page;
    };

    this.getPage = function () {
        return this.page;
    };

    this.setPageSize = function (pageSize) {
        this.pageSize = pageSize;
    };

    this.getPageSize = function () {
        return this.pageSize;
    };

    this.setItemCount = function (itemCount) {
        this.itemCount = itemCount;
    };

    this.getItemCount = function () {
        return this.itemCount;
    };

    this.setPageCount = function (pageCount) {
        this.pageCount = pageCount;
    };

    this.getPageCount = function () {
        return this.pageCount;
    };

    this.setToolBarDisplay = function (toolBarDisplay) {
        this.toolBarDisplay = toolBarDisplay;
    };

    this.getToolBarDisplay = function () {
        return this.toolBarDisplay;
    };

    this.lowerLimit = function () {
        var pageCountLimitPerPageDiff = this.getPageCount() - this.getToolBarDisplay();

        if (pageCountLimitPerPageDiff < 0) {
            return 0;
        }

        if (this.getPage() > pageCountLimitPerPageDiff + 1) {
            return pageCountLimitPerPageDiff;
        }

        var low = this.getPage() - (Math.ceil(this.getToolBarDisplay() / 2) - 1);

        return Math.max(low, 0);
    };
})

/* Service for uploading/downloading file */
.service('FileService', function ($http, DHIS2URL) {

    return {
        get: function (uid) {
            var promise = $http.get(DHIS2URL + '/fileResources/' + uid).then(function (response) {
                return response.data;
            } ,function(error) {
                return null;
            });
            return promise;
        },
        download: function (fileName) {
            var promise = $http.get(fileName).then(function (response) {
                return response.data;
            }, function(error) {
                return null;
            });
            return promise;
        },
        upload: function(file){
            var formData = new FormData();
            formData.append('file', file);
            var headers = {transformRequest: angular.identity, headers: {'Content-Type': undefined}};
            var promise = $http.post(DHIS2URL + '/fileResources', formData, headers).then(function(response){
                return response.data;
            },function(error) {
               return null;
            });
            return promise;
        }
    };
})

.service('AuditHistoryDataService', function( $http, $translate, NotificationService, DHIS2URL ) {
    this.getAuditHistoryData = function(dataId, dataType ) {
        var url="";
        if (dataType === "attribute") {
            url="/audits/trackedEntityAttributeValue?tei="+dataId+"&skipPaging=true";
            
        } else {
            url="/audits/trackedEntityDataValue?psi="+dataId+"&skipPaging=true";
        }

        var promise = $http.get(DHIS2URL + url).then(function( response ) {
            return response.data;
        }, function( response ) {
            if( response && response.data && response.data.status === 'ERROR' ) {
                var headerText = response.data.status;
                var bodyText = response.data.message ? response.data.message : $translate.instant('unable_to_fetch_data_from_server');
                NotificationService.showNotifcationDialog(headerText, bodyText);
            }
        });
        return promise;
    }
})

.service('DataValueAuditService', function($http, DataEntryUtils, DHIS2URL) {   
    
    return {        
        getDataValueAudit: function( dv ){
            var promise = $http.get(DHIS2URL + '/audits/dataValue.json?paging=false&de='+dv.de+'&ou='+dv.ou+'&pe='+dv.pe+'&co='+dv.co+'&cc='+dv.cc).then(function(response){
                return response.data;
            }, function(response){
                DataEntryUtils.errorNotifier(response);
            });
            return promise;
        }
    };
})

.service('OrgUnitService', function($http, DHIS2URL){
    var orgUnit, orgUnitPromise;
    return {
        get: function( uid ){
            if( orgUnit !== uid ){
                orgUnitPromise = $http.get( DHIS2URL + '/organisationUnits.json?filter=path:like:/' + uid + '&fields=id,displayName,path,level,parent[id]&paging=false' ).then(function(response){
                    orgUnit = response.data.id;
                    return response.data;
                });
            }
            return orgUnitPromise;
        }
    };
})

.service('DataEntryUtils', function($q, $translate, $filter, SessionStorageService, DialogService, OrgUnitService, OptionSetService){
    return {
        getSum: function( op1, op2 ){
            op1 = dhis2.validation.isNumber(op1) ? parseInt(op1) : 0;
            op2 = dhis2.validation.isNumber(op2) ? parseInt(op2) : 0;        
            return op1 + op2;
        },
        getPercent: function(op1, op2){        
            op1 = dhis2.validation.isNumber(op1) ? parseInt(op1) : 0;
            op2 = dhis2.validation.isNumber(op2) ? parseInt(op2) : 0;        
            if( op1 === 0){
                return "";
            }
            if( op2 === 0 ){
                return $translate.instant('missing_target');
            }
            return Number(parseFloat((op1 / op2)*100).toFixed(2)) + '%';
        },
        getOptionComboIdFromOptionNames: function(optionComboMap, options){
            var optionNames = [];
            angular.forEach(options, function(op){
                optionNames.push(op.displayName);
            });
            
            var selectedAttributeOcboName = optionNames.toString();            
            var selectedAttributeOcobo = optionComboMap['"' + selectedAttributeOcboName + '"'];
            
            if( !selectedAttributeOcobo || angular.isUndefined( selectedAttributeOcobo ) ){
                selectedAttributeOcboName = optionNames.reverse().toString();
                selectedAttributeOcobo = optionComboMap['"' + selectedAttributeOcboName + '"'];
            }
            return selectedAttributeOcobo;
        },
        getOptionIds: function(options){            
            var optionNames = '';
            angular.forEach(options, function(o){
                optionNames += o.id + ';';
            });            
            
            return optionNames.slice(0,-1);
        },
        errorNotifier: function(response){
            if( response && response.data && response.data.status === 'ERROR'){
                var dialogOptions = {
                    headerText: response.data.status,
                    bodyText: response.data.message ? response.data.message : $translate.instant('unable_to_fetch_data_from_server')
                };		
                DialogService.showDialog({}, dialogOptions);
            }
        },
        notify: function(headerMsg, bodyMsg){
            var dialogOptions = {
                headerText: $translate.instant(headerMsg),
                bodyText: $translate.instant(bodyMsg)
            };		
            DialogService.showDialog({}, dialogOptions);
        }
        ,getNumeratorAndDenominatorIds: function( ind ){            
            var num = ind.numerator.substring(2,ind.numerator.length-1);
            num = num.split('.');            
            var den = ind.denominator.substring(2,ind.numerator.length-1);
            den = den.split('.');            
            return {numerator: num[0], numeratorOptionCombo: num[1], denominator: den[0], denominatorOptionCombo: den[1]};
        },
        populateOuLevels: function( orgUnit, ouLevels ){
            var ouModes = [{displayName: $translate.instant('selected_level') , value: 'SELECTED', level: orgUnit.l}];
            var limit = orgUnit.l === 1 ? 2 : 3;
            for( var i=orgUnit.l+1; i<=limit; i++ ){
                var lvl = ouLevels[i];
                ouModes.push({value: lvl, displayName: lvl, level: i});
            }
            var selectedOuMode = ouModes[0];            
            return {ouModes: ouModes, selectedOuMode: selectedOuMode};
        },
        getChildrenIds: function( orgUnit ){
            var def = $q.defer();
            OrgUnitService.get( orgUnit.id ).then(function( json ){
                var childrenIds = [];
                var children = json.organisationUnits;
                var childrenByIds = [];
                var allChildren = [];
                angular.forEach(children, function(c){
                    c.path = c.path.substring(1, c.path.length);
                    c.path = c.path.split("/");
                    childrenByIds[c.id] = c;
                    if( c.level <= 3 ){
                        allChildren.push( c );
                    }
                });                    
                
                if( orgUnit.l === 1 ){
                    angular.forEach($filter('filter')(children, {level: 3}), function(c){
                        childrenIds.push(c.id);                        
                    });
                }
                else if ( orgUnit.l === 2 ){
                    childrenIds = orgUnit.c;
                }
                else {
                    childrenIds = [orgUnit.id];
                }

                def.resolve( {childrenIds: childrenIds, allChildren: allChildren, children: $filter('filter')(children, {parent: {id: orgUnit.id}}), descendants: $filter('filter')(children, {level: 3}), childrenByIds: childrenByIds } );
            });
            
            return def.promise;
        },
        processDataSet: function( ds ){
            var dataElements = [];
            angular.forEach(ds.dataSetElements, function(dse){
                if( dse.dataElement ){
                    dataElements.push( dhis2.metadata.processMetaDataAttribute( dse.dataElement ) );
                }                            
            });
            ds.dataElements = dataElements;
            delete ds.dataSetElements;
            
            return ds;
        },
        formatDataValue: function( de, val, optionSets, destination ){
            
            if( de.optionSetValue ){
                if(destination === 'USER'){
                    val = OptionSetService.getName(optionSets[de.optionSet.id].options, String(val));
                }
                else{
                    val = OptionSetService.getCode(optionSets[de.optionSet.id].options, val);
                }
            }
            else{
                if( val ){
                    if( de.valueType === 'NUMBER' && dhis2.validation.isNumber(val) ){
                        val = parseFloat( val );
                    }
                    else if( dhis2.validation.isNumber(val) &&
                            de.valueType === 'INTEGER' ||
                            de.valueType === 'INTEGER_POSITIVE' ||
                            de.valueType === 'INTEGER_NEGATIVE' ||
                            de.valueType === 'INTEGER_ZERO_OR_POSITIVE' ||
							de.valueType === 'PERCENTAGE'){
                        val = parseInt( val );
                    }
                    else if(de.valueType=== 'TRUE_ONLY'){
                        val = val === 'true' ? true: '';
                    }
                    else if(de.valueType=== 'BOOLEAN'){
                        val = val === 'true' || val === true ? true : val === 'false' || val === false ? false : '';
                    }
                }                
            }
            
            return val;
        },
        getDataElementTotal: function(dataValues, dataElement){            
            if( dataValues[dataElement] ){                
                dataValues[dataElement].total = 0;                
                angular.forEach(dataValues[dataElement], function(val, key){
                    if( key !== 'total' && val && val.value && dhis2.validation.isNumber( val.value ) ){                        
                        dataValues[dataElement].total += val.value;
                    }
                });
            }            
            return dataValues[dataElement];
        },
        getValidationResult: function( de, dataValues, failedValidationRules ){
            var vrs = [];
            if( de && de.validationRules && de.validationRules.length > 0 ){
                angular.forEach(de.validationRules, function(vr){                    
                    var leftSide = null, rightSide = null; 
                    if( vr.leftSide && vr.leftSide.expression ){
                        leftSide = angular.copy( vr.leftSide.expression );
                        var matcher = leftSide.match( dhis2.metadata.formulaRegex );
                        for( var k in matcher ){
                            var match = matcher[k];
                            var operand = match.replace( dhis2.metadata.operatorRegex, '' );
                            var isTotal = !!( operand.indexOf( dhis2.metadata.custSeparator ) == -1 );
                            var value = 0;
                            if ( isTotal )
                            {                                
                                if( dataValues && dataValues[operand] && dataValues[operand].total ){                                    
                                    value = dataValues[operand].total;
                                }
                            }
                            else
                            {
                                var ids = operand.split('.');
                                if( dataValues && 
                                        dataValues[ids[0]] && 
                                        dataValues[ids[0]][ids[1]] &&
                                        dataValues[ids[0]][ids[1]].value){
                                    value = dataValues[ids[0]][ids[1]].value;
                                }
                            }
                            leftSide = leftSide.replace( match, value );                    
                        }
                    }                    
                    if( vr.rightSide && vr.rightSide.expression ){
                        rightSide = angular.copy( vr.rightSide.expression );
                        var matcher = rightSide.match( dhis2.metadata.formulaRegex );
                        for( var k in matcher ){
                            var match = matcher[k];
                            var operand = match.replace( dhis2.metadata.operatorRegex, '' );
                            var isTotal = !!( operand.indexOf( dhis2.metadata.custSeparator ) == -1 );
                            var value = 0;
                            if ( isTotal )
                            {                                
                                if( dataValues && dataValues[operand] && dataValues[operand].total ){                                    
                                    value = dataValues[operand].total;
                                }
                            }
                            else
                            {
                                var ids = operand.split('.');;
                                if( dataValues && 
                                        dataValues[ids[0]] && 
                                        dataValues[ids[0]][ids[1]] &&
                                        dataValues[ids[0]][ids[1]].value){
                                    value = dataValues[ids[0]][ids[1]].value;
                                }
                            }
                            rightSide = rightSide.replace( match, value );                    
                        }
                    }
                    
                    if( leftSide && rightSide ){                        
                        var op = null;
                        switch( vr.operator ){
                            case 'equal_to':
                                op = '==';
                                break;
                            case 'not_equal_to':
                                op = '!=';
                                break;
                            case 'greater_than':
                                op = '>';
                                break;
                            case 'greater_than_or_equal_to':
                                op = '>=';
                                break;
                            case 'less_than':
                                op = '<';
                                break;
                            case 'less_than_or_equal_to':
                                op = '<=';
                                break;
                            default:
                                op = null;
                                break;
                        }
                        if( op !== null ){                            
                            var res = eval( leftSide + op + rightSide);
                            if( !res ){
                                vrs.push(vr);
                                if( failedValidationRules.indexOf( vr.id) === -1 ){
                                    failedValidationRules.push( vr.id );
                                }                                
                            }
                            else{
                                var idx = failedValidationRules.indexOf( vr.id );
                                if( idx !== -1 ){
                                    failedValidationRules.splice(idx, 1);
                                }                                
                            }
                        }
                    }                    
                });
            }
            return {vrs: vrs, failed: failedValidationRules};
        },
        getIndicatorResult: function( ind, dataValues ){
            var denVal = 1, numVal = 0;
            
            if( ind.numerator ) {
                
                ind.numExpression = angular.copy( ind.numerator );
                var matcher = ind.numExpression.match( dhis2.metadata.formulaRegex );
                
                for ( var k in matcher )
                {
                    var match = matcher[k];

                    // Remove brackets from expression to simplify extraction of identifiers

                    var operand = match.replace( dhis2.metadata.operatorRegex, '' );

                    var isTotal = !!( operand.indexOf( dhis2.metadata.custSeparator ) == -1 );

                    var value = '0';

                    if ( isTotal )
                    {
                        if( dataValues && dataValues[operand] && dataValues[operand].total ){
                            value = dataValues[operand].total;
                        }
                    }
                    else
                    {
                        var de = operand.substring( 0, operand.indexOf( dhis2.metadata.custSeparator ) );
                        var coc = operand.substring( operand.indexOf( dhis2.metadata.custSeparator ) + 1, operand.length );
                        
                        if( dataValues && 
                                dataValues[de] && 
                                dataValues[de][coc] &&
                                dataValues[de][coc].value){
                            value = dataValues[de][coc].value;
                        }
                    }
                    ind.numExpression = ind.numExpression.replace( match, value );                    
                }
            }
            
            
            if( ind.denominator ) {
                
                ind.denExpression = angular.copy( ind.denominator );
                var matcher = ind.denExpression.match( dhis2.metadata.formulaRegex );
                
                for ( var k in matcher )
                {
                    var match = matcher[k];

                    // Remove brackets from expression to simplify extraction of identifiers

                    var operand = match.replace( dhis2.metadata.operatorRegex, '' );

                    var isTotal = !!( operand.indexOf( dhis2.metadata.custSeparator ) == -1 );

                    var value = '0';

                    if ( isTotal )
                    {
                        if( dataValues[operand] && dataValues[operand].total ){
                            value = dataValues[operand].total;
                        }
                    }
                    else
                    {
                        var de = operand.substring( 0, operand.indexOf( dhis2.metadata.custSeparator ) );
                        var coc = operand.substring( operand.indexOf( dhis2.metadata.custSeparator ) + 1, operand.length );
                        
                        if( dataValues && 
                                dataValues[de] && 
                                dataValues[de][coc] &&
                                dataValues[de][coc].value){
                            value = dataValues[de][coc].value;
                        }
                    }
                    ind.denExpression = ind.denExpression.replace( match, value );
                }
            }
            
            if( ind.numExpression ){
                numVal = eval( ind.numExpression );
                numVal = isNaN( numVal ) ? '-' : roundTo( numVal, 1 );
            }
            
            if( ind.denExpression ){
                denVal = eval( ind.denExpression );
                denVal = isNaN( denVal ) ? '-' : roundTo( denVal, 1 );
            }
            
            return numVal / denVal;
        },
        getCartesianProduct: function() {
            return _.reduce(arguments, function(a, b) {
                return _.flatten(_.map(a, function(x) {
                    return _.map(b, function(y) {
                        return x.concat([y]);
                    });
                }), true);
            }, [ [] ]);
        },
        userHasValidRole: function(obj, prop, userRoles){
        	if( !obj || !prop || !userRoles){
                return false;
        	}
        	for(var i=0; i < userRoles.length; i++){            
                if( userRoles[i].authorities && userRoles[i].authorities.indexOf('ALL') !== -1 ){
                    return true;
                }
                if( userRoles[i][prop] && userRoles[i][prop].length > 0 ){
                    for( var j=0; j< userRoles[i][prop].length; j++){
                        if( obj.id === userRoles[i][prop][j].id ){
                            return true;
                        }
                    }
                }
            }
            return false;            	
        },
        userHasWriteAccess: function (dataSetId) {
            var dataSets = SessionStorageService.get('ACCESSIBLE_DATASETS');
            dataSets = dataSets.dataSets;
            if (dataSets && dataSets.length) {
                for (var i = 0; i < dataSets.length; i++) {
                    if (dataSets[i].id === dataSetId && dataSets[i].access && dataSets[i].access.data && dataSets[i].access.data.write) {
                        return true;
                    }
                }
            }
            return false;
        }
    };
})

/*Orgunit service for local db */
.service('IndexDBService', function($window, $q){
    
    var indexedDB = $window.indexedDB;
    var db = null;
    
    var open = function( dbName ){
        var deferred = $q.defer();
        
        var request = indexedDB.open( dbName );
        
        request.onsuccess = function(e) {
          db = e.target.result;
          deferred.resolve();
        };

        request.onerror = function(){
          deferred.reject();
        };

        return deferred.promise;
    };
    
    var get = function(storeName, uid){
        
        var deferred = $q.defer();
        
        if( db === null){
            deferred.reject("DB not opened");
        }
        else{
            var tx = db.transaction([storeName]);
            var store = tx.objectStore(storeName);
            var query = store.get(uid);
                
            query.onsuccess = function(e){
                deferred.resolve(e.target.result);           
            };
        }
        return deferred.promise;
    };
    
    return {
        open: open,
        get: get
    };
})

/* Fetch periods */
.service('PeriodService', function(CalendarService, DateUtils){
    
    this.getPeriods = function( opts ){
        var availablePeriods = [];
        if(!opts.periodType){
            return availablePeriods;
        }
        
        if( opts.dataSetType !== 'Plan_Setting' ){
            opts.futurePeriods = 1;
        }
        
        var calendarSetting = CalendarService.getSetting();
        
        dhis2.period.format = calendarSetting.keyDateFormat.toLowerCase();
        
        dhis2.period.calendar = $.calendars.instance( calendarSetting.keyCalendar );
                
        dhis2.period.generator = new dhis2.period.PeriodGenerator( dhis2.period.calendar, dhis2.period.format );
        
        dhis2.period.picker = new dhis2.period.DatePicker( dhis2.period.calendar, dhis2.period.format );
        
        var d2Periods = dhis2.period.generator.generateReversedPeriods( opts.periodType, opts.periodOffset );
                
        d2Periods = dhis2.period.generator.filterOpenPeriods( opts.periodType, d2Periods, opts.futurePeriods, null, null );
        
        var today = moment(DateUtils.getToday(),'YYYY-MM-DD');
        
        if( opts.dataSetType === 'Plan_Setting' || opts.dataSetType === 'PHEM' ) {
        	angular.forEach(d2Periods, function(p){
	            p.id = p.iso;
	            var st = p.endDate.split('-');
	            st[1] = mappedMonthNames[calendarSetting.keyCalendar].indexOf( st[1] ) + 1;
	            if( st[1] < 10 ){
	                st[1] = '0' + st[1];
	            }
	            p.endDate = st.join('-');
	            
	            st = p.startDate.split('-');
	            st[1] = mappedMonthNames[calendarSetting.keyCalendar].indexOf( st[1] ) + 1;
	            if( st[1] < 10 ){
	                st[1] = '0' + st[1];
	            }
	            p.startDate = st.join('-');
	        });
        }
        else {
        	d2Periods = d2Periods.filter(function(p) {
                p.id = p.iso;
                var st = p.endDate.split('-');
                st[1] = mappedMonthNames[calendarSetting.keyCalendar].indexOf( st[1] ) + 1;
                if( st[1] < 10 ){
                    st[1] = '0' + st[1];
                }
                p.endDate = st.join('-');
                
                st = p.startDate.split('-');
                st[1] = mappedMonthNames[calendarSetting.keyCalendar].indexOf( st[1] ) + 1;
                if( st[1] < 10 ){
                    st[1] = '0' + st[1];
                }
                p.startDate = st.join('-');
                
                return today.diff(p.endDate, 'days') >= -9;
            });        	
        }
        
        return d2Periods;
    };
    
    this.getReportPeriods = function( opts ){
        var availablePeriods = [];
        if(!opts.periodType){
            return availablePeriods;
        }
        
        if( !opts.futurePeriods ){
            opts.futurePeriods = 1;
        }
        
        var calendarSetting = CalendarService.getSetting();
        
        dhis2.period.format = calendarSetting.keyDateFormat.toLowerCase();
        
        dhis2.period.calendar = $.calendars.instance( calendarSetting.keyCalendar );
                
        dhis2.period.generator = new dhis2.period.PeriodGenerator( dhis2.period.calendar, dhis2.period.format );
        
        dhis2.period.picker = new dhis2.period.DatePicker( dhis2.period.calendar, dhis2.period.format );
        
        var d2Periods = dhis2.period.generator.generateReversedPeriods( opts.periodType, opts.periodOffset );
                
        d2Periods = dhis2.period.generator.filterOpenPeriods( opts.periodType, d2Periods, opts.futurePeriods, null, null );
        
        angular.forEach(d2Periods, function(p){
            p.id = p.iso;
            var st = p.endDate.split('-');
            st[1] = mappedMonthNames[calendarSetting.keyCalendar].indexOf( st[1] ) + 1;
            if( st[1] < 10 ){
                st[1] = '0' + st[1];
            }
            p.endDate = st.join('-');
            
            st = p.startDate.split('-');
            st[1] = mappedMonthNames[calendarSetting.keyCalendar].indexOf( st[1] ) + 1;
            if( st[1] < 10 ){
                st[1] = '0' + st[1];
            }
            p.startDate = st.join('-');
        });
        
        return d2Periods;
    };
})

.service('NotificationService', function (DialogService, $timeout) {
    this.showNotifcationDialog = function(errorMsgheader, errorMsgBody, errorResponse){
        var dialogOptions = {
            headerText: errorMsgheader,
            bodyText: errorMsgBody
        };
        var summaries = null;
        if (errorResponse && errorResponse.data) {
            if(errorResponse.data.message && (errorResponse.data.status === 'ERROR' || errorResponse.data.status === 'WARNING')) {
                dialogOptions.bodyText += "<br/>"+errorResponse.data.message+"<br/>";
            }
            if( errorResponse.data.response && errorResponse.data.response.importSummaries && errorResponse.data.response.importSummaries.length > 0 ){
                summaries = JSON.stringify(errorResponse.data.response.importSummaries);
            }
        }
        DialogService.showDialog({}, dialogOptions, summaries);
    };

    this.showNotifcationWithOptions = function(dialogDefaults, dialogOptions){
        DialogService.showDialog(dialogDefaults, dialogOptions);
    };
    
    this.displayDelayedHeaderMessage = function( message ){
        setHeaderDelayMessage( message );
    };
    
    this.displayHeaderMessage = function( message ){
        $timeout(function(){
            setHeaderMessage( message );
        }, 1000);
    };
    
    this.removeHeaderMessage = function(){
        hideHeaderMessage();
    };
});
