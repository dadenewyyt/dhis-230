/* global dhis2, angular, selection, i18n_ajax_login_failed, _ */

dhis2.util.namespace('dhis2.diseaseRegistration');
dhis2.util.namespace('dhis2.rd');

// whether current user has any organisation units
dhis2.diseaseRegistration.emptyOrganisationUnits = false;

var i18n_no_orgunits = 'No organisation unit attached to current user, no data entry possible';
var i18n_offline_notification = 'You are offline, data will be stored locally';
var i18n_online_notification = 'You are online';
var i18n_ajax_login_failed = 'Login failed, check your username and password and try again';
var i18n_need_to_sync_notification = 'There is data stored locally, please upload to server';
var i18n_sync_now = 'Upload';
var i18n_uploading_data_notification = 'Uploading locally stored data to the server';

var optionSetsInPromise = [];
var attributesInPromise = [];
var batchSize = 50;

dhis2.diseaseRegistration.store = null;
dhis2.rd.metaDataCached = dhis2.rd.metaDataCached || false;
dhis2.diseaseRegistration.memoryOnly = $('html').hasClass('ie7') || $('html').hasClass('ie8');
var adapters = [];    
if( dhis2.diseaseRegistration.memoryOnly ) {
    adapters = [ dhis2.storage.InMemoryAdapter ];
} else {
    adapters = [ dhis2.storage.IndexedDBAdapter, dhis2.storage.DomLocalStorageAdapter, dhis2.storage.InMemoryAdapter ];
}

dhis2.diseaseRegistration.store = new dhis2.storage.Store({
    name: 'dhis2dr',
    adapters: [dhis2.storage.IndexedDBAdapter, dhis2.storage.DomSessionStorageAdapter, dhis2.storage.InMemoryAdapter],
    objectStores: ['dataValues', 'dataSets', 'categoryCombos']
});

(function($) {
    $.safeEach = function(arr, fn)
    {
        if (arr)
        {
            $.each(arr, fn);
        }
    };
})(jQuery);

/**
 * Page init. The order of events is:
 *
 * 1. Load ouwt 
 * 2. Load meta-data (and notify ouwt) 
 * 
 */
$(document).ready(function()
{
    $.ajaxSetup({
        type: 'POST',
        cache: false
    });

    $('#loaderSpan').show();
});

$(document).bind('dhis2.online', function(event, loggedIn)
{
    if (loggedIn)
    {
        var OfflineDataValueService = angular.element('body').injector().get('OfflineDataValueService');
        
        OfflineDataValueService.hasLocalData().then(function(localData){
            if(localData){
                var message = i18n_need_to_sync_notification + ' <button id="sync_button" type="button">' + i18n_sync_now + '</button>';

                setHeaderMessage(message);

                $('#sync_button').bind('click', uploadLocalData);
            }
            else{
                if (dhis2.diseaseRegistration.emptyOrganisationUnits) {
                    setHeaderMessage(i18n_no_orgunits);
                }
                else {
                    setHeaderDelayMessage(i18n_online_notification);
                }
            }
        });
        
        
        if (dhis2.diseaseRegistration.emptyOrganisationUnits) {
            setHeaderMessage(i18n_no_orgunits);
        }
        else {
            setHeaderDelayMessage(i18n_online_notification);
        }
    }
    else
    {
        var form = [
            '<form style="display:inline;">',
            '<label for="username">Username</label>',
            '<input name="username" id="username" type="text" style="width: 70px; margin-left: 10px; margin-right: 10px" size="10"/>',
            '<label for="password">Password</label>',
            '<input name="password" id="password" type="password" style="width: 70px; margin-left: 10px; margin-right: 10px" size="10"/>',
            '<button id="login_button" type="button">Login</button>',
            '</form>'
        ].join('');

        setHeaderMessage(form);
        ajax_login();
    }
});

$(document).bind('dhis2.offline', function()
{
    if (dhis2.diseaseRegistration.emptyOrganisationUnits) {
        setHeaderMessage(i18n_no_orgunits);
    }
    else {
        setHeaderMessage(i18n_offline_notification);
    }
});

function ajax_login()
{
    $('#login_button').bind('click', function()
    {
        var username = $('#username').val();
        var password = $('#password').val();

        $.post('../dhis-web-commons-security/login.action', {
            'j_username': username,
            'j_password': password
        }).success(function()
        {
            var ret = dhis2.availability.syncCheckAvailability();

            if (!ret)
            {
                alert(i18n_ajax_login_failed);
            }
        });
    });
}

// -----------------------------------------------------------------------------
// Metadata downloading
// -----------------------------------------------------------------------------

function downloadMetaData()
{
    console.log('Loading required meta-data');
    var def = $.Deferred();
    var promise = def.promise();

    promise = promise.then( dhis2.diseaseRegistration.store.open );
    promise = promise.then( getUserAccessibleDataSet );
    promise = promise.then( getSystemSetting );
    
    //fetch category combos
    promise = promise.then( getMetaCategoryCombos );
    promise = promise.then( filterMissingCategoryCombos );
    promise = promise.then( getCategoryCombos );
        
    //fetch data sets
    promise = promise.then( getMetaDataSets );
    promise = promise.then( filterMissingDataSets );
    promise = promise.then( getDataSets );
    
    promise.done(function() {        
        //Enable ou selection after meta-data has downloaded
        $( "#orgUnitTree" ).removeClass( "disable-clicks" );
        dhis2.rd.metaDataCached = true;
        dhis2.availability.startAvailabilityCheck();
        console.log( 'Finished loading meta-data' );        
        selection.responseReceived(); 
    });

    def.resolve();    
}

function getUserAccessibleDataSet(){        
    return dhis2.metadata.getMetaObject(null, 'ACCESSIBLE_DATASETS', '../api/dataSets/assigned.json', 'fields=id,access[data[write]]&paging=false', 'sessionStorage', dhis2.diseaseRegistration.store);
}

function getSystemSetting(){   
    if(localStorage['SYSTEM_SETTING']){
       return; 
    }    
    return dhis2.metadata.getMetaObject(null, 'SYSTEM_SETTING', '../api/systemSettings', 'key=keyGoogleMapsApiKey&key=keyMapzenSearchApiKey&key=keyCalendar&key=keyDateFormat&key=multiOrganisationUnitForms', 'localStorage', dhis2.diseaseRegistration.store);
}

function getMetaCategoryCombos(){
    return dhis2.metadata.getMetaObjectIds('categoryCombos', '../api/categoryCombos.json', 'paging=false&fields=id,version');
}

function filterMissingCategoryCombos( objs ){
    return dhis2.metadata.filterMissingObjIds('categoryCombos', dhis2.diseaseRegistration.store, objs);
}

function getCategoryCombos( ids ){    
    return dhis2.metadata.getBatches( ids, batchSize, 'categoryCombos', 'categoryCombos', '../api/categoryCombos.json', 'paging=false&fields=id,displayName,code,skipTotal,isDefault,categoryOptionCombos[id,displayName],categories[id,displayName,code,attributeValues[value,attribute[id,name,valueType,code]],categoryOptions[id,displayName,code,organisationUnits[id]]]', 'idb', dhis2.diseaseRegistration.store);
}

function getMetaDataSets(){
    return dhis2.metadata.getMetaObjectIds('dataSets', '../api/dataSets/assigned.json', 'paging=false&fields=id,version');
}

function filterMissingDataSets( objs ){
    return dhis2.metadata.filterMissingObjIds('dataSets', dhis2.diseaseRegistration.store, objs);
}

function getDataSets( ids ){
    return dhis2.metadata.getBatches( ids, batchSize, 'dataSets', 'dataSets', '../api/dataSets.json', 'paging=false&fields=id,periodType,openFuturePeriods,displayName,version,categoryCombo[id],attributeValues[value,attribute[id,name,valueType,code]],organisationUnits[id],sections[greyedFields[dimensionItem]],dataSetElements[id,dataElement[id,code,displayFormName,description,description,valueType,categoryCombo[id]]]', 'idb', dhis2.diseaseRegistration.store, dhis2.metadata.processObject);
}

function uploadLocalData() {
    var OfflineDataValueService = angular.element('body').injector().get('OfflineDataValueService');
    setHeaderWaitMessage(i18n_uploading_data_notification);
     
    OfflineDataValueService.uploadLocalData().then(function(){        
        selection.responseReceived(); //notify angular
    });
}