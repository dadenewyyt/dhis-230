'use strict';

/* App Module */

var phem = angular.module('phem',
        ['ui.bootstrap', 
         'ngRoute', 
         'ngCookies',
         'ngSanitize',
         'ngMessages',
         'phemServices',
         'phemFilters',
         'phemDirectives',
         'd2Directives',
         'd2Filters',
         'd2Services',
         'd2Controllers',
         'angularLocalStorage',
         'ui.select',
         'ui.select2',
         'pascalprecht.translate'])
              
.value('DHIS2URL', '../api')

.config(function($httpProvider, $routeProvider, $translateProvider) {    
            
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
    
    $routeProvider.when('/dataexport', {
        templateUrl:'components/dataexport/dataexport.html',
        controller: 'dataExportController'
    }).otherwise({
        redirectTo : '/dataexport'
    });  
    
    $translateProvider.preferredLanguage('en');
    $translateProvider.useSanitizeValueStrategy('escaped');
    $translateProvider.useLoader('i18nLoader');    
})

.run(function($rootScope){    
    $rootScope.maxOptionSize = 1000;
});
