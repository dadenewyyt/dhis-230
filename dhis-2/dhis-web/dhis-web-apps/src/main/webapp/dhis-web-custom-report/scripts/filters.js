'use strict';

/* Filters */

var customReportFilters = angular.module('customReportFilters', [])

.filter('optionComboFilter', function($filter){    
    
    return function(data, categoryCombo){

        if(!data ){
            return;
        }
        
        if(!categoryCombo){
            return data;
        }
        
        console.log('categoryCombo:  ', categoryCombo);
        
        return data;
        
        /*else{            
            
            var dateFilter = {}, 
                textFilter = {}, 
                numberFilter = {},
                filteredData = data;
            
            for(var key in filters){
                
                if(filterTypes[key] === 'DATE'){
                    if(filters[key].start || filters[key].end){
                        dateFilter[key] = filters[key];
                    }
                }
                else if(filterTypes[key] === 'NUMBER' || 
                			filterTypes[key] === 'INTEGER' ||
                			filterTypes[key] === 'INTEGER_POSITIVE' || 
                			filterTypes[key] === 'INTEGER_NEGATIVE' || 
                			filterTypes[key] === 'INTEGER_ZERO_OR_POSITIVE'){
                    if(filters[key].start || filters[key].end){
                        numberFilter[key] = filters[key];
                    }
                }
                else{
                    textFilter[key] = filters[key];
                }
            }
            
            filteredData = $filter('filter')(filteredData, textFilter); 
            filteredData = $filter('filter')(filteredData, dateFilter, dateComparator);            
            filteredData = $filter('filter')(filteredData, numberFilter, numberComparator);
                        
            return filteredData;
        }*/ 
    }; 
    
    function dateComparator(data,filter){
    	var calendarSetting = CalendarService.getSetting(); 
        var start = moment(filter.start, calendarSetting.momentFormat);
        var end = moment(filter.end, calendarSetting.momentFormat);  
        var date = moment(data, calendarSetting.momentFormat); 
        
        if(filter.start && filter.end){
            return ( Date.parse(date) <= Date.parse(end) ) && (Date.parse(date) >= Date.parse(start));
        }        
        return ( Date.parse(date) <= Date.parse(end) ) || (Date.parse(date) >= Date.parse(start));
    }
    
    function numberComparator(data,filter){
        var start = filter.start;
        var end = filter.end;
        
        if(filter.start && filter.end){
            return ( data <= end ) && ( data >= start );
        }        
        return ( data <= end ) || ( data >= start );
    }
});