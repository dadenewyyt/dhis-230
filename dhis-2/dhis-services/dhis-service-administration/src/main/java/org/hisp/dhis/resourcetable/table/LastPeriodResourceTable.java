package org.hisp.dhis.resourcetable.table;

import static org.hisp.dhis.system.util.SqlUtils.quote;

import java.util.ArrayList;
import java.util.HashSet;

/*
 * Copyright (c) 2004-2018, University of Oslo
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 * Neither the name of the HISP project nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.hisp.dhis.calendar.Calendar;
import org.hisp.dhis.calendar.DateTimeUnit;
import org.hisp.dhis.common.IdentifiableObjectUtils;
import org.hisp.dhis.period.BiMonthlyPeriodType;
import org.hisp.dhis.period.DailyPeriodType;
import org.hisp.dhis.period.MonthlyPeriodType;
import org.hisp.dhis.period.Period;
import org.hisp.dhis.period.PeriodType;
import org.hisp.dhis.period.QuarterlyPeriodType;
import org.hisp.dhis.period.SixMonthlyAprilPeriodType;
import org.hisp.dhis.period.SixMonthlyNovemberPeriodType;
import org.hisp.dhis.period.SixMonthlyPeriodType;
import org.hisp.dhis.period.WeeklyPeriodType;
import org.hisp.dhis.resourcetable.ResourceTable;
import org.hisp.dhis.resourcetable.ResourceTableType;

import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Lists;

/**
 * @author Abyot Asalefew Gizaw <abyota@gmail.com>
 *
 */
public class LastPeriodResourceTable
    extends ResourceTable<Period>
{
    private static final Map<String, Integer> PERIOD_INDEX = ImmutableMap.<String, Integer> builder()
        .put( DailyPeriodType.NAME, 6 ).put( WeeklyPeriodType.NAME, 5 ).put( MonthlyPeriodType.NAME, 4 )
        .put( BiMonthlyPeriodType.NAME, 4 ).put( QuarterlyPeriodType.NAME, 5 )
        .put( SixMonthlyPeriodType.NAME, 5 ).put( SixMonthlyAprilPeriodType.NAME, 10 )
        .put( SixMonthlyNovemberPeriodType.NAME, 8 ).build();
    
    public LastPeriodResourceTable( List<Period> objects )
    {
        super( objects );
    }

    @Override
    public ResourceTableType getTableType()
    {
        return ResourceTableType.LAST_PERIOD_STRUCTURE;
    }

    @Override
    public String getCreateTempTableStatement()
    {
        String sql = "create table " + getTempTableName()
            + " (periodid integer not null primary key, iso varchar(15) not null, daysno integer not null, startdate date not null, enddate date not null, year integer not null";

        for ( PeriodType periodType : PeriodType.PERIOD_TYPES )
        {
            sql += ", " + quote( periodType.getName().toLowerCase() ) + " varchar(15)";
        }

        sql += ")";

        return sql;
    }

    @Override
    public Optional<String> getPopulateTempTableStatement()
    {
        return Optional.empty();
    }

    @Override
    public Optional<List<Object[]>> getPopulateTempTableContent()
    {
        Calendar calendar = PeriodType.getCalendar();

        List<Object[]> batchArgs = new ArrayList<>();

        Set<String> uniqueIsoDates = new HashSet<>();

        for ( Period period : objects )
        {
            if ( period != null && period.isValid() )
            {
                final PeriodType rowType = period.getPeriodType();
                
                final String isoDate = period.getIsoDate();
                // final int year = PeriodType.getCalendar().fromIso(
                // period.getStartDate() ).getYear();
                final int year = DateTimeUnit.fromJdkDate( period.getStartDate() ).getYear();

                if ( !uniqueIsoDates.add( isoDate ) )
                {
                    // Protect against duplicates produced by calendar
                    // implementations
                    log.warn( "Duplicate ISO date for period, ignoring: " + period + ", ISO date: " + isoDate );
                    continue;
                }

                List<Object> values = new ArrayList<>();

                values.add( period.getId() );
                values.add( isoDate );
                values.add( period.getDaysInPeriod() );
                values.add( period.getStartDate() );
                values.add( period.getEndDate() );
                values.add( year );

                for ( Period pe : PeriodType.getPeriodTypePeriods( period, calendar ) )
                {                    
                    //values.add( pe != null ? IdentifiableObjectUtils.getLocalPeriodIdentifier( pe, calendar ) : null );
                    
                    Object value = null;
                    
                    if ( pe != null && pe.getPeriodType() != null )
                    {
                        PeriodType periodType = pe.getPeriodType();
                        
                        if ( rowType.getFrequencyOrder() < periodType.getFrequencyOrder() )
                        {                        
                            if(  PERIOD_INDEX.get( rowType.getName() ) != null )
                            {
                                int len = PERIOD_INDEX.get( rowType.getName() );                            
                                
                                if( isoDate.length() > len )
                                {
                                    String _isoDate = rowType.getName().equals( BiMonthlyPeriodType.NAME ) ? isoDate.substring(0,  isoDate.length() - 1 ) : isoDate;
                                    
                                    int idx = Integer.parseInt(  _isoDate.substring( len, _isoDate.length() ) );
                                    
                                    if ( idx % periodType.getPeriodSpan( rowType ) == 0 )
                                    {
                                        Period targetPeriod = IdentifiableObjectUtils.getPeriodByPeriodType( period, periodType,
                                            calendar );
                                        
                                        value = IdentifiableObjectUtils.getLocalPeriodIdentifier( targetPeriod, calendar );
                                        
                                    }
                                }
                            }
                        }
                        else if ( rowType.equals( periodType ) )
                        {                        
                            Period targetPeriod = IdentifiableObjectUtils.getPeriodByPeriodType( period, periodType,
                                calendar );                        
                            
                            value = IdentifiableObjectUtils.getLocalPeriodIdentifier( targetPeriod, calendar );
                        }                        
                    }
                    
                    values.add( value );
                }

                batchArgs.add( values.toArray() );
            }
        }

        return Optional.of( batchArgs );
    }

    @Override
    public List<String> getCreateIndexStatements()
    {
        String name = "in_lastperiodstructure_iso_" + getRandomSuffix();

        String sql = "create unique index " + name + " on " + getTempTableName() + "(iso)";

        return Lists.newArrayList( sql );
    }
}
