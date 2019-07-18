package org.hisp.dhis.webapi.controller;

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

import org.apache.commons.lang3.StringUtils;
import org.hisp.dhis.calendar.CalendarService;
import org.hisp.dhis.calendar.DateTimeUnit;
import org.hisp.dhis.common.DhisApiVersion;
import org.hisp.dhis.common.IdSchemes;
import org.hisp.dhis.common.IdentifiableObjectManager;
import org.hisp.dhis.common.IdentifiableProperty;
import org.hisp.dhis.dataset.DataSet;
import org.hisp.dhis.datavalue.DataExportParams;
import org.hisp.dhis.dxf2.datavalueset.DataValueSetService;
import org.hisp.dhis.organisationunit.OrganisationUnit;
import org.hisp.dhis.webapi.mvc.annotation.ApiVersion;
import org.hisp.dhis.webapi.utils.ContextUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.hisp.dhis.webapi.utils.ContextUtils.CONTENT_TYPE_JSON;
import static org.hisp.dhis.webapi.utils.ContextUtils.setNoStore;

/**
 * @author Lars Helge Overland
 */
@Controller
@RequestMapping( value = DataValueSetExportController.RESOURCE_PATH )
@ApiVersion( { DhisApiVersion.DEFAULT, DhisApiVersion.ALL } )
public class DataValueSetExportController
{
    public static final String RESOURCE_PATH = "/dataValueSetExport";

    @Autowired
    private DataValueSetService dataValueSetService;
    
    @Autowired
    private IdentifiableObjectManager identifiableObjectManager;
    
    @Autowired
    private CalendarService calendarService;

    // -------------------------------------------------------------------------
    // Get
    // -------------------------------------------------------------------------

    @RequestMapping( method = RequestMethod.GET, produces = CONTENT_TYPE_JSON )
    @PreAuthorize( "hasRole('ALL') or hasRole('F_PHEM_DATA_EXPORT')" )
    public void getDataValueSetJson(
        @RequestParam( required = false ) Set<String> dataSet,
        @RequestParam( required = false ) Set<String> dataElementGroup,
        @RequestParam( required = false ) Set<String> period,
        @RequestParam( required = false ) String startDate,
        @RequestParam( required = false ) String endDate,
        @RequestParam( required = false ) Set<String> orgUnit,
        @RequestParam( required = false ) boolean children,
        @RequestParam( required = false ) Set<String> orgUnitGroup,
        @RequestParam( required = false ) Set<String> attributeOptionCombo,
        @RequestParam( required = false ) boolean includeDeleted,
        @RequestParam( required = false ) Date lastUpdated,
        @RequestParam( required = false ) String lastUpdatedDuration,
        @RequestParam( required = false ) Integer limit,
        @RequestParam( required = false ) String attachment,
        IdSchemes idSchemes, HttpServletResponse response ) throws IOException
    {
        response.setContentType( CONTENT_TYPE_JSON );
        setNoStore( response );
        
        Set<OrganisationUnit> organisationUnits = new HashSet<>();
        List<DataSet> dss = new ArrayList<>();
        
        if ( dataSet != null )
        {
        	dss = identifiableObjectManager.getObjects( DataSet.class, IdentifiableProperty.UID, new HashSet<>( dataSet ) );
        	for ( DataSet ds : dss )
    		{
    			organisationUnits.addAll( ds.getSources() );
    		}
        }
        
        DataExportParams params = new DataExportParams();
        params.getDataSets().addAll( dss );
        params.getOrganisationUnits().addAll( organisationUnits );
        params.setIsoCalendar( true );
        params.setSkipAccessCheck( true );
        
        if ( startDate != null && endDate != null )
        {
        	//Here need to convert to server date (yyyy-MM-dd) and iso calendar.
            String[] start = startDate.split("-");
            String[] end = endDate.split( "-" );
            
            DateTimeUnit fdt = new DateTimeUnit(Integer.parseInt( start[0] ), Integer.parseInt( start[1] ), Integer.parseInt( start[2] ) );
            DateTimeUnit tdt = new DateTimeUnit(Integer.parseInt( end[0] ), Integer.parseInt( end[1] ), Integer.parseInt( end[2] ) );
                    
            DateTimeUnit from = calendarService.getSystemCalendar().toIso( null, fdt );
            DateTimeUnit to = calendarService.getSystemCalendar().toIso( null, tdt );
        	
            params
                .setStartDate( from.toJdkDate() )
                .setEndDate( to.toJdkDate() );
        }
        
        params
            .setIncludeChildren( false )
            .setIncludeDeleted( false )
            .setLastUpdated( null )
            .setLastUpdatedDuration( null )
            .setLimit( null )
            .setOutputIdSchemes( idSchemes );

        if ( !StringUtils.isEmpty( attachment ) )
        {
            response.addHeader( ContextUtils.HEADER_CONTENT_DISPOSITION, "attachment; filename=" + attachment );
            response.addHeader( ContextUtils.HEADER_CONTENT_TRANSFER_ENCODING, "binary" );
            
            dataValueSetService.writeDataValueSetJson( params, getZipOut( response.getOutputStream(), attachment.replaceAll(".zip", "") ) );
            
        }
        else
        {
            dataValueSetService.writeDataValueSetJson( params, response.getOutputStream() );
        }
    }
        
    // -------------------------------------------------------------------------
    // Supportive methods
    // -------------------------------------------------------------------------
    
    private ZipOutputStream getZipOut( OutputStream out, String fileName )
        throws IOException
    {
        ZipOutputStream zipOut = new ZipOutputStream( out );
        zipOut.putNextEntry( new ZipEntry( fileName ) );
        return zipOut;
    }
}
