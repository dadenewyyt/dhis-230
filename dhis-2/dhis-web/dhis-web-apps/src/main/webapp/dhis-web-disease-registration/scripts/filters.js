'use strict';

/* Filters */

var diseaseRegistrationFilters = angular.module('diseaseRegistrationFilters', [])

.filter('existingDisease', function(){
    
    return function( items, existingItems ){
        
    	if( !items ){
            return [];
    	}
    	
    	if( !existingItems ){
            return items;
    	}
    	
        var filteredItems = [], existingItemIds = $.map(existingItems, function(item){return item.id;});
            
        angular.forEach(items, function(item){                
            if( existingItemIds.indexOf(item.id) === -1 ){
                filteredItems.push(item);
            }
        });
        
        return filteredItems;
    };
});