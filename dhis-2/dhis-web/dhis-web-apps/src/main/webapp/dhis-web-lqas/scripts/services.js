/* global angular, moment, dhis2, parseFloat */

'use strict';

/* Services */

var lqasServices = angular.module('lqasServices', [])

.service('MetaDataService', function($http, DHIS2URL) {   
    
    return {
        get: function( url ){
            url = DHIS2URL + url;
            var promise = $http.get( url ).then(function(response){
                return response.data;
            });
            return promise;
        },
        put: function(){
            
        },
        post: function(){
            
        },
        patch: function() {
            
        }
    };
})

.service('MyService', function(){
    
});