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

import org.apache.commons.io.IOUtils;
import org.hisp.dhis.common.Grid;
import org.hisp.dhis.common.IdentifiableObjectManager;
import org.hisp.dhis.common.cache.CacheStrategy;
import org.hisp.dhis.commons.util.TextUtils;
import org.hisp.dhis.dataelement.DataElement;
import org.hisp.dhis.dataset.DataSet;
import org.hisp.dhis.dataset.DataSetService;
import org.hisp.dhis.dataset.FormType;
import org.hisp.dhis.datasetreport.DataSetReportService;
import org.hisp.dhis.dxf2.webmessage.WebMessageException;
import org.hisp.dhis.dxf2.webmessage.WebMessageUtils;
import org.hisp.dhis.i18n.I18nManager;
import org.hisp.dhis.indicator.Indicator;
import org.hisp.dhis.organisationunit.OrganisationUnit;
import org.hisp.dhis.period.Period;
import org.hisp.dhis.period.PeriodService;
import org.hisp.dhis.period.PeriodType;
import org.hisp.dhis.system.grid.GridUtils;
import org.hisp.dhis.system.grid.ListGrid;
import org.hisp.dhis.util.ObjectUtils;
import org.hisp.dhis.webapi.mvc.annotation.ApiVersion;
import org.hisp.dhis.analytics.AnalyticsService;
import org.hisp.dhis.analytics.DataQueryParams;
import org.hisp.dhis.analytics.DataQueryService;
import org.hisp.dhis.common.DataQueryRequest;
import org.hisp.dhis.common.DhisApiVersion;
import org.hisp.dhis.webapi.service.WebMessageService;
import org.hisp.dhis.webapi.utils.ContextUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.servlet.http.HttpServletResponse;

import java.io.Writer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * @author Stian Sandvold
 */
@Controller
@RequestMapping( value = "/dataSetReport" )
@ApiVersion( { DhisApiVersion.DEFAULT, DhisApiVersion.ALL } )
public class DataSetReportController
{
    // -------------------------------------------------------------------------
    // Dependencies
    // -------------------------------------------------------------------------

    @Autowired
    private DataSetReportService dataSetReportService;

    @Autowired
    private DataSetService dataSetService;

    @Autowired
    private PeriodService periodService;

    @Autowired
    private I18nManager i18nManager;

    @Autowired
    private ContextUtils contextUtils;

    @Autowired
    WebMessageService webMessageService;

    @Autowired
    IdentifiableObjectManager idObjectManager;

    @Autowired
    private DataQueryService dataQueryService;

    @Autowired
    private AnalyticsService analyticsService;

    @RequestMapping( method = RequestMethod.GET )
    public void getDataSetReport( HttpServletResponse response, @RequestParam String ds, @RequestParam String pe,
        @RequestParam String ou, @RequestParam( required = false ) Set<String> dimension,
        @RequestParam( required = false ) boolean selectedUnitOnly, @RequestParam( required = false ) String type )
        throws Exception
    {
        OrganisationUnit selectedOrgunit = idObjectManager.get( OrganisationUnit.class, ou );
        DataSet selectedDataSet = dataSetService.getDataSet( ds );
        Period selectedPeriod = PeriodType.getPeriodFromIsoString( pe );

        if ( selectedOrgunit == null )
        {
            throw new WebMessageException( WebMessageUtils.conflict( "Illegal organisation unit identifier: " + ou ) );
        }

        if ( selectedDataSet == null )
        {
            throw new WebMessageException( WebMessageUtils.conflict( "Illegal data set identifier: " + ds ) );
        }

        if ( selectedPeriod == null )
        {
            throw new WebMessageException( WebMessageUtils.conflict( "Illegal period identifier: " + pe ) );
        }

        selectedPeriod = periodService.reloadPeriod( selectedPeriod );

        String customDataEntryFormCode = null;
        List<Grid> grids = new ArrayList<>();

        FormType formType = selectedDataSet.getFormType();

        // ---------------------------------------------------------------------
        // Configure response
        // ---------------------------------------------------------------------

        contextUtils.configureResponse( response, ContextUtils.CONTENT_TYPE_HTML,
            CacheStrategy.RESPECT_SYSTEM_SETTING );

        // ---------------------------------------------------------------------
        // Assemble report
        // ---------------------------------------------------------------------

        if ( formType.isCustom() )
        {
            if ( type != null )
            {
                grids = dataSetReportService.getCustomDataSetReportAsGrid( selectedDataSet, selectedPeriod,
                    selectedOrgunit, dimension, selectedUnitOnly, i18nManager.getI18nFormat() );
            }
            else
            {
                customDataEntryFormCode = dataSetReportService.getCustomDataSetReport( selectedDataSet, selectedPeriod,
                    selectedOrgunit, dimension, selectedUnitOnly, i18nManager.getI18nFormat() );
            }
        }
        else if ( formType.isSection() )
        {
            grids = dataSetReportService.getSectionDataSetReport( selectedDataSet, selectedPeriod, selectedOrgunit,
                dimension, selectedUnitOnly, i18nManager.getI18nFormat(), i18nManager.getI18n() );
        }
        else
        {
            grids = dataSetReportService.getDefaultDataSetReport( selectedDataSet, selectedPeriod, selectedOrgunit,
                dimension, selectedUnitOnly, i18nManager.getI18nFormat(), i18nManager.getI18n() );
        }

        // ---------------------------------------------------------------------
        // Write response
        // ---------------------------------------------------------------------

        Writer output = response.getWriter();

        if ( formType.isCustom() && type == null )
        {
            IOUtils.write( customDataEntryFormCode, output );
        }
        else
        {
            for ( Grid grid : grids )
            {
                GridUtils.toHtmlCss( grid, output );
            }
        }
    }

    @RequestMapping( value = "/custom", method = RequestMethod.GET, produces = { "application/json",
        "application/javascript" } )
    public @ResponseBody Grid getCustomDataSetReport( HttpServletResponse response, @RequestParam String ds,
        @RequestParam( required = false ) Set<String> dimension, @RequestParam( required = false ) Set<String> filter,
        @RequestParam( required = false ) boolean selectedUnitOnly )
        throws Exception
    {
        Set<String> deDimension = new HashSet<>();
        Set<String> dtDimension = new HashSet<>();
        Set<String> inDimension = new HashSet<>();
        
        Grid grid = new ListGrid();
        Grid dtGrid = new ListGrid();
        Grid inGrid = new ListGrid();
        
        if ( !dimension.isEmpty() )
        {
            for( String dim : dimension )
            {
                deDimension.add( dim );
                dtDimension.add( dim );
                inDimension.add( dim );
            }
        }
        
        DataSet selectedDataSet = dataSetService.getDataSet( ds );

        if ( selectedDataSet == null )
        {
            throw new WebMessageException( WebMessageUtils.conflict( "Illegal data set identifier: " + ds ) );
        }

        Set<DataElement> dataElements = selectedDataSet.getDataElements();

        Set<Indicator> indicators = selectedDataSet.getIndicators();

        if ( dataElements.isEmpty() )
        {
            throw new WebMessageException( WebMessageUtils.conflict( "Data set has no data elements: " + ds ) );
        }

        String dataElementIds = ObjectUtils.join( dataElements, TextUtils.SEMICOLON, de -> de.getUid() );
        String indicatorIds = ObjectUtils.join( indicators, TextUtils.SEMICOLON, ind -> ind.getUid() );
        
        deDimension.add( "dx:" + dataElementIds );
        deDimension.add( "co" );
        
        dtDimension.add( "dx:" + dataElementIds );
        
        inDimension.add( "dx:" + indicatorIds );

        DataQueryRequest deRequest = DataQueryRequest.newBuilder().dimension( deDimension ).filter( filter ).build();
        DataQueryRequest dtRequest = DataQueryRequest.newBuilder().dimension( dtDimension ).filter( filter ).build();
        DataQueryRequest inRequest = DataQueryRequest.newBuilder().dimension( inDimension ).filter( filter ).build();

        DataQueryParams deParams = dataQueryService.getFromRequest( deRequest );
        DataQueryParams dtParams = dataQueryService.getFromRequest( dtRequest );
        DataQueryParams inParams = dataQueryService.getFromRequest( inRequest );        
        
        grid = analyticsService.getAggregatedDataValues( deParams );
        dtGrid = analyticsService.getAggregatedDataValues( dtParams );
        inGrid = analyticsService.getAggregatedDataValues( inParams );
        
        Object dummyColumn = new String("total");
        
        for( List<Object> row : dtGrid.getRows() )
        {
            row.add( 1, dummyColumn );
        }
        grid.addRows( dtGrid );
        
        for( List<Object> row : inGrid.getRows() )
        {
            row.add( 1, dummyColumn );
        }
        grid.addRows( inGrid );
        
        return grid;
    }
}