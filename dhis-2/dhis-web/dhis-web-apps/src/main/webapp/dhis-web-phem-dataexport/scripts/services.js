/* global angular, moment, dhis2, parseFloat */

'use strict';

/* Services */

var phemServices = angular.module('phemServices', ['ngResource'])

.factory('StorageService', function(){
    var store = new dhis2.storage.Store({
        name: 'dhis2dx',
        adapters: [dhis2.storage.IndexedDBAdapter, dhis2.storage.DomSessionStorageAdapter, dhis2.storage.InMemoryAdapter],
        objectStores: ['dataSets']
    });
    return{
        currentStore: store
    };
})

/* factory to fetch and process programValidations */
.factory('MetaDataFactory', function($q, $rootScope, DataEntryUtils, StorageService, orderByFilter) {  
    
    return {        
        get: function(store, uid){            
            var def = $q.defer();            
            StorageService.currentStore.open().done(function(){
                StorageService.currentStore.get(store, uid).done(function(obj){                    
                    $rootScope.$apply(function(){
                        def.resolve(obj);
                    });
                });
            });                        
            return def.promise;
        },
        set: function(store, obj){            
            var def = $q.defer();            
            StorageService.currentStore.open().done(function(){
                StorageService.currentStore.set(store, obj).done(function(obj){                    
                    $rootScope.$apply(function(){
                        def.resolve(obj);
                    });
                });
            });                        
            return def.promise;
        },
        getAll: function(store){
            var def = $q.defer();
            StorageService.currentStore.open().done(function(){
                StorageService.currentStore.getAll(store).done(function(objs){                    
                    objs = orderByFilter(objs, '-displayName').reverse();                    
                    $rootScope.$apply(function(){
                        def.resolve(objs);
                    });
                });                
            });            
            return def.promise;
        },
        getByProperty: function(store, propertyName, propertyValue){
            var def = $q.defer();
            StorageService.currentStore.open().done(function(){
                StorageService.currentStore.getAll(store).done(function(_objs){                    
                    var objs = [];
                    angular.forEach(_objs, function(obj){                            
                        if(obj.id && DataEntryUtils.userHasWriteAccess(obj.id) && obj[propertyName] && obj[propertyName]===propertyValue){                            
                            objs.push(obj);
                        }
                    });
                    
                    objs = orderByFilter(objs, '-displayName').reverse();                    
                    $rootScope.$apply(function(){
                        def.resolve(objs);
                    });
                });                
            });            
            return def.promise;
        }
    };        
})

.service('Analytics', function($http, DataEntryUtils){
    return {
        getDataValues: function( url ){
            url = '../api/dataValueSetExport?' + url;
            var promise = $http.get( url ).then(function(response){
                return response.data;
            }, function(response){
                DataEntryUtils.errorNotifier(response);
                return response.data;
            });
            return promise;
        }
    };
});