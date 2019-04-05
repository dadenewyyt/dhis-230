package org.hisp.dhis.calendar.impl;

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

import org.hisp.dhis.calendar.Calendar;
import org.hisp.dhis.calendar.ChronologyBasedCalendar;
import org.hisp.dhis.calendar.DateTimeUnit;
import org.hisp.dhis.period.PeriodType;
import org.hisp.dhis.period.WeeklyAbstractPeriodType;
import org.joda.time.DateTimeZone;
import org.joda.time.chrono.EthiopicChronology;
import org.springframework.stereotype.Component;

import java.util.Date;

/**
 * @author Morten Olav Hansen <mortenoh@gmail.com>
 */
@Component
public class EthiopianCalendar extends ChronologyBasedCalendar
{
    private static final Calendar SELF = new EthiopianCalendar();

    public static Calendar getInstance()
    {
        return SELF;
    }

    protected EthiopianCalendar()
    {
        super( EthiopicChronology.getInstance( DateTimeZone.getDefault() ) );
    }

    @Override
    public String name()
    {
        return "ethiopian";
    }

    @Override
    public DateTimeUnit toIso( PeriodType periodType, DateTimeUnit dateTimeUnit )
    {
        if ( periodType != null && WeeklyAbstractPeriodType.class.isAssignableFrom( periodType.getClass() ) )
        {
            return super.toIso( periodType, dateTimeUnit );
        }
        
        dateTimeUnit = bumpPagume( dateTimeUnit );
        
        if ( dateTimeUnit.getMonth() > 12 )
        {
            throw new RuntimeException( "Illegal month, must be between 1 and 12, was given " + dateTimeUnit.getMonth() );
        }

        return super.toIso( periodType, dateTimeUnit );
    }

    @Override
    public DateTimeUnit fromIso( PeriodType periodType, Date date )
    {
        DateTimeUnit dateTimeUnit = super.fromIso( periodType, date );
        
        if ( periodType != null && WeeklyAbstractPeriodType.class.isAssignableFrom( periodType.getClass() ) )
        {
            return dateTimeUnit;
        }
        
        dateTimeUnit = bumpPagume( dateTimeUnit );

        if ( dateTimeUnit.getMonth() > 12 )
        {
            throw new RuntimeException( "Illegal month, must be between 1 and 12, was given " + dateTimeUnit.getMonth() );
        }

        return dateTimeUnit;
    }

    @Override
    public DateTimeUnit fromIso( PeriodType periodType, DateTimeUnit dateTimeUnit )
    {
        return super.fromIso( periodType, dateTimeUnit );
    }

    @Override
    public DateTimeUnit plusDays( PeriodType periodType, DateTimeUnit dateTimeUnit, int days )
    {
        if ( days < 0 )
        {
            return minusDays( periodType, dateTimeUnit, Math.abs( days ) );
        }
        
        if ( periodType != null && WeeklyAbstractPeriodType.class.isAssignableFrom( periodType.getClass() ) )
        {
            if ( dateTimeUnit.isIso8601() )
            {
                return super.plusDays( periodType, dateTimeUnit, days );                
            }
            else
            {
                dateTimeUnit = super.toIso( periodType, dateTimeUnit );
                
                java.util.Calendar cal = java.util.Calendar.getInstance();
                
                cal.setTime( dateTimeUnit.toJdkDate() );
                cal.add( java.util.Calendar.DATE, days );
                
                dateTimeUnit = DateTimeUnit.fromJdkDate( cal.getTime() );
                
                return super.fromIso( periodType, dateTimeUnit );
            }
        }

        int curYear = dateTimeUnit.getYear();
        int curMonth = dateTimeUnit.getMonth();
        int curDay = dateTimeUnit.getDay();
        int dayOfWeek = dateTimeUnit.getDayOfWeek();

        while ( days != 0 )
        {
            curDay++;

            if ( curDay > 30 )
            {
                curMonth++;
                curDay = 1;
            }

            if ( curMonth > 12 )
            {
                curYear++;
                curMonth = 1;
            }

            dayOfWeek++;

            if ( dayOfWeek > 7 )
            {
                dayOfWeek = 1;
            }

            days--;
        }

        return new DateTimeUnit( curYear, curMonth, curDay, dayOfWeek );
    }

    @Override
    public DateTimeUnit minusDays( PeriodType periodType, DateTimeUnit dateTimeUnit, int days )
    {
        if ( periodType != null && WeeklyAbstractPeriodType.class.isAssignableFrom( periodType.getClass() ) )
        {
            if ( dateTimeUnit.isIso8601() )
            {
                return super.minusDays( periodType, dateTimeUnit, days );                
            }
            else
            {
                dateTimeUnit = super.toIso( periodType, dateTimeUnit );
                
                java.util.Calendar cal = java.util.Calendar.getInstance();
                
                cal.setTime( dateTimeUnit.toJdkDate() );
                cal.add( java.util.Calendar.DATE, 0 - days );
                
                dateTimeUnit = DateTimeUnit.fromJdkDate( cal.getTime() );
                
                return super.fromIso( periodType, dateTimeUnit );
            }
        }
        
        int curYear = dateTimeUnit.getYear();
        int curMonth = dateTimeUnit.getMonth();
        int curDay = dateTimeUnit.getDay();
        int dayOfWeek = dateTimeUnit.getDayOfWeek();

        while ( days != 0 )
        {
            curDay--;

            if ( curDay == 0 )
            {
                curMonth--;

                if ( curMonth == 0 )
                {
                    curYear--;
                    curMonth = 12;
                }

                curDay = 30;
            }

            dayOfWeek--;

            if ( dayOfWeek == 0 )
            {
                dayOfWeek = 7;
            }

            days--;
        }

        return new DateTimeUnit( curYear, curMonth, curDay, dayOfWeek );
    }

    @Override
    public DateTimeUnit plusWeeks( PeriodType periodType, DateTimeUnit dateTimeUnit, int weeks )
    {
        return plusDays( periodType, dateTimeUnit, weeks * 7 );
    }

    @Override
    public DateTimeUnit minusWeeks( PeriodType periodType, DateTimeUnit dateTimeUnit, int weeks )
    {
        return minusDays( periodType, dateTimeUnit, weeks * 7 );
    }

    @Override
    public DateTimeUnit plusMonths( PeriodType periodType, DateTimeUnit dateTimeUnit, int months )
    {
        return plusDays( periodType, dateTimeUnit, months * 30 );
    }

    @Override
    public DateTimeUnit minusMonths( PeriodType periodType, DateTimeUnit dateTimeUnit, int months )
    {
        return minusDays( periodType, dateTimeUnit, months * 30 );
    }

    @Override
    public DateTimeUnit plusYears( PeriodType periodType, DateTimeUnit dateTimeUnit, int years )
    {
        return plusDays( periodType, dateTimeUnit, years * (12 * 30) );
    }

    @Override
    public DateTimeUnit minusYears( PeriodType periodType, DateTimeUnit dateTimeUnit, int years )
    {
        return minusDays( periodType, dateTimeUnit, years * (12 * 30) );
    }

    @Override
    public int daysInYear( int year )
    {
        return 12 * 30;
    }
    
    @Override
    public int monthsInYear( PeriodType periodType )
    {
        if ( periodType != null && WeeklyAbstractPeriodType.class.isAssignableFrom( periodType.getClass() ) )
        {
            return 13;
        }
        
        return 12;
    }

    @Override
    public int daysInMonth( PeriodType periodType, int year, int month )
    {
        if ( periodType != null && WeeklyAbstractPeriodType.class.isAssignableFrom( periodType.getClass() ) )
        {
            if ( month < 12 )
            {
               return 30; 
            }
            
            else if ( month == 13 )
            {
                return 5;
            }
            
            throw new RuntimeException( "Illegal month, must be between 1 and 13, was given " + month );
        }
        
        if ( month > 12 )
        {
            throw new RuntimeException( "Illegal month, must be between 1 and 12, was given " + month );
        }

        return 30;
    }

    @Override
    public int daysInWeek()
    {
        return 7;
    }

    @Override
    public DateTimeUnit isoStartOfYear( PeriodType periodType, int year )
    {
        return fromIso( periodType, super.isoStartOfYear( periodType, year ) );
    }
    
    private DateTimeUnit bumpPagume( DateTimeUnit dateTimeUnit )
    {
        if ( dateTimeUnit.getMonth() == 13 ) //bump Pagume to Meskerem
        {
            dateTimeUnit.setDate( dateTimeUnit.getYear() + 1, 1, 1);
        }
        
        return dateTimeUnit;
    }
}
