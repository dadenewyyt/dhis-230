/* global directive, selection, dhis2, angular */

'use strict';

/* Directives */

var lqasDirectives = angular.module('lqasDirectives', [])

.directive('selectedOrgUnit', function ($timeout, IndexDBService) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            
            $("#orgUnitTree").one("ouwtLoaded", function (event, ids, names) {
                /*if (dhis2.rd && dhis2.rd.metaDataCached) {
                    $timeout(function () {
                        scope.treeLoaded = true;
                        scope.$apply();
                    });
                    selection.responseReceived();
                }
                else {
                    console.log('Finished loading orgunit tree');
                    //$("#orgUnitTree").addClass("disable-clicks"); //Disable ou selection until meta-data has downloaded
                    $timeout(function () {
                        scope.treeLoaded = true;
                        scope.$apply();
                    });
                    //downloadMetaData();
                }*/
                $timeout(function () {
                    scope.treeLoaded = true;
                    scope.$apply();
                });
            });

            //listen to user selection, and inform angular
            selection.setListenerFunction(setSelectedOu, true);
            function setSelectedOu(ids, names) {
                
                if( ids[0] && names[0] ){
                    var ou = {id: ids[0], displayName: names[0]};
                    $timeout(function () {
                        scope.selectedOrgUnit = ou;
                        scope.$apply();
                    });
                    /*IndexDBService.open('dhis2ou').then(function(){
                        IndexDBService.get('ou', ou.id).then(function(ou){
                            if( ou ){
                                ou.id = ids[0];
                                ou.displayName = ou.n;
                                $timeout(function () {
                                    scope.selectedOrgUnit = ou;
                                    scope.$apply();
                                });
                            }                            
                        });
                    });*/
                }
            }
        }
    };
});