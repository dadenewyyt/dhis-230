'use strict';

/* App Module */

var lqas = angular.module('lqas',
        ['ui.bootstrap', 
         'ngRoute', 
         'ngCookies',
         'ngSanitize',
         'ngMessages',
         'lqasServices',
         'lqasFilters',
         'lqasDirectives',
         //'d2Directives',
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
    
    $routeProvider.when('/dataentry', {
        templateUrl:'components/dataentry/dataentry.html',
        controller: 'dataEntryController'
    }).when('/report', {
        templateUrl:'components/reports/report.html',
        controller: 'reportController'
    }).otherwise({
        redirectTo : '/dataentry'
    });  
    
    $translateProvider.preferredLanguage('en');
    $translateProvider.useSanitizeValueStrategy('escaped');
    $translateProvider.useLoader('i18nLoader');    
})

.run(function($rootScope){    
    $rootScope.maxOptionSize = 1000;
});
