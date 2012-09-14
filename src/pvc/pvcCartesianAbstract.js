
/**
 * CartesianAbstract is the base class for all 2D cartesian space charts.
 */
pvc.CartesianAbstract = pvc.TimeseriesAbstract.extend({
    _gridDockPanel: null,
    
    axesPanels: null, 
    
    yAxisPanel: null,
    xAxisPanel: null,
    secondXAxisPanel: null,
    secondYAxisPanel: null,
    
    _mainContentPanel: null,

    yScale: null,
    xScale: null,
   
    _visibleDataCache: null,
    
    constructor: function(options){
        
        this.axesPanels = {};
        
        this.base(options);
    },
    
    _getSeriesRoleSpec: function(){
        return { isRequired: true, defaultDimensionName: 'series*', autoCreateDimension: true };
    },

    _initData: function(){
        // Clear data related cache
        if(this._visibleDataCache) {
            delete this._visibleDataCache;
        }
        
        this.base.apply(this, arguments);
    },
    
    _initAxes: function(hasMultiRole){
        
        this.base(hasMultiRole);
        
        if(!hasMultiRole || this.parent){
            /* Create axes */
            this._createAxis('base', 0);
            this._createAxis('ortho', 0);
            if(this.options.secondAxis){
                this._createAxis('ortho', 1);
            }
        }
    },
    
    _preRenderContent: function(contentOptions){
        if(pvc.debug >= 3){
            pvc.log("Prerendering in CartesianAbstract");
        }
        
        var axes = this.axes;
        var baseAxis = axes.base;
        var orthoAxis = axes.ortho;
        var ortho2Axis = axes.ortho2;
        
        /* Create the grid/docking panel */
        this._gridDockPanel = new pvc.CartesianGridDockingPanel(this, this.basePanel, {
            margins:  contentOptions.margins,
            paddings: contentOptions.paddings
        });
        
        /* Create child axis panels
         * The order is relevant because of docking order. 
         */
        if(ortho2Axis) {
            this._createAxisPanel(ortho2Axis);
        }
        this._createAxisPanel(baseAxis );
        this._createAxisPanel(orthoAxis);
        
        /* Create main content panel */
        this._mainContentPanel = this._createMainContentPanel(this._gridDockPanel, {
            clickAction:        contentOptions.clickAction,
            doubleClickAction:  contentOptions.doubleClickAction
        });
        
        /* Force layout */
        this.basePanel.layout();
        
        /* Set scale ranges, after layout */
        this._setAxisScaleRange(baseAxis );
        this._setAxisScaleRange(orthoAxis);
        if(ortho2Axis){
            this._setAxisScaleRange(ortho2Axis);
        }
    },
    
    /**
     * Creates a cartesian axis.
     */
    _createAxisCore: function(axisType, axisIndex, dataCells){
        switch(axisType){
            case 'base':
            case 'ortho':
                var axis = new pvc.visual.CartesianAxis(this, axisType, axisIndex, dataCells);
                this.axes[axis.orientedId] = axis;
                this._createAxisScale(axis);
                return axis;
        }
        
        return this.base(axisType, axisIndex, dataCells);
    },
    
    /**
     * Creates an axis panel, if it is visible.
     * @param {pvc.visual.CartesianAxis} axis The cartesian axis.
     * @type pvc.AxisPanel
     */
    _createAxisPanel: function(axis){
        if(axis.isVisible) {
            var titlePanel;
            var title = axis.option('Title');
            if (!def.empty(title)) {
                titlePanel = new pvc.AxisTitlePanel(this, this._gridDockPanel, axis, {
                    title:        title,
                    font:         axis.option('TitleFont') || axis.option('Font'),
                    anchor:       axis.option('Position'),
                    align:        axis.option('TitleAlign'),
                    margins:      axis.option('TitleMargins'),
                    paddings:     axis.option('TitlePaddings'),
                    titleSize:    axis.option('TitleSize'),
                    titleSizeMax: axis.option('TitleSizeMax')
                });
            }
            
            var panel = pvc.AxisPanel.create(this, this._gridDockPanel, axis, {
                useCompositeAxis:  axis.option('Composite'),
                font:              axis.option('Font'),
                anchor:            axis.option('Position'),
                axisSize:          axis.option('Size'),
                axisSizeMax:       axis.option('SizeMax'),
                labelSpacingMin:   axis.option('LabelSpacingMin'),
                tickExponentMin:   axis.option('TickExponentMin'),
                tickExponentMax:   axis.option('TickExponentMax'),
                fullGrid:          axis.option('FullGrid'),
                fullGridCrossesMargin: axis.option('FullGridCrossesMargin'),
                ruleCrossesMargin: axis.option('RuleCrossesMargin'),
                zeroLine:          axis.option('ZeroLine'),
                domainRoundMode:   axis.option('DomainRoundMode'),
                desiredTickCount:  axis.option('DesiredTickCount'),
                minorTicks:        axis.option('MinorTicks'),
                clickAction:       axis.option('ClickAction'),
                doubleClickAction: axis.option('DoubleClickAction')
            });
            
            if(titlePanel){
                titlePanel.panelName = panel.panelName;
                panel.titlePanel = titlePanel;
            }
            
            this.axesPanels[axis.id] = panel;
            this.axesPanels[axis.orientedId] = panel;
            
            // V1 fields
            if(axis.index <= 1) {
                this[axis.orientedId + 'AxisPanel'] = panel;
            }
            
            return panel;
        }
    },

    /* @abstract */
    _createMainContentPanel: function(parentPanel, baseOptions){
        throw def.error.notImplemented();
    },
    
    /**
     * Creates a scale for a given axis, with domain applied, but no range yet,
     * assigns it to the axis and assigns the scale to special v1 chart instance fields.
     * 
     * @param {pvc.visual.CartesianAxis} axis The axis.
     * @type pv.Scale
     */
    _createAxisScale: function(axis){
        var isSecondOrtho = axis.index === 1 && axis.type === 'ortho';
        
        var scale;

        if(isSecondOrtho && !this.options.secondAxisIndependentScale){
            scale = this.axes.ortho.scale || 
                    def.fail.operationInvalid("First ortho scale must be created first.");
        } else {
            scale = this._createScaleByAxis(axis);
            
            if(scale.isNull && pvc.debug >= 3){
                pvc.log(def.format("{0} scale for axis '{1}'- no data", [axis.scaleType, axis.id]));
            }
        }
        
        axis.setScale(scale);
        
        /* V1 fields xScale, yScale, secondScale */
        if(isSecondOrtho) {
            this.secondScale = scale;
        } else if(!axis.index) {
            this[axis.orientation + 'Scale'] = scale;
        }
        
        return scale;
    },
    
    /**
     * Creates a scale for a given axis.
     * 
     * @param {pvc.visual.CartesianAxis} axis The axis.
     * @type pv.Scale
     */
    _createScaleByAxis: function(axis){
        var createScale = this['_create' + axis.scaleType + 'ScaleByAxis'];
        
        return createScale.call(this, axis);
    },

    /**
     * Creates a discrete scale for a given axis.
     * <p>
     * Uses the chart's <tt>panelSizeRatio</tt> to calculate the band.
     * </p>
     * 
     * @param {pvc.visual.CartesianAxis} axis The axis.
     * @virtual
     * @type pv.Scale
     */
    _createDiscreteScaleByAxis: function(axis){
        /* DOMAIN */

        // With composite axis, only 'singleLevel' flattening works well
        var flatteningMode = null; //axis.option('Composite') ? 'singleLevel' : null,
        var baseData = this._getVisibleData(axis.dataCell.dataPartValues, {ignoreNulls: false});
        var data = axis.role.flatten(baseData, {
                                visible: true,
                                flatteningMode: flatteningMode
                            });
        
        var scale  = new pv.Scale.ordinal();
        if(!data.count()){
            scale.isNull = true;
        } else {
            var values = data.children()
                             .select(function(child){ return child.value; })
                             .array();
            
            scale.domain(values);
        }
        
        return scale;
    },
    
    /**
     * Creates a continuous time-series scale for a given axis.
     * 
     * <p>
     * Uses the axis' option <tt>Offset</tt> to calculate excess domain margins at each end of the scale.
     * </p>
     * <p>
     * Also takes into account the specified axis' options 
     * <tt>DomainRoundMode</tt> and <tt>DesiredTickCount</tt>.
     * </p>
     * 
     * @param {pvc.visual.CartesianAxis} axis The axis.
     * @virtual
     * @type pv.Scale
     */
    _createTimeseriesScaleByAxis: function(axis){
        /* DOMAIN */
        var extent = this._getVisibleValueExtent(axis); // null when no data...
        
        var scale = new pv.Scale.linear();
        if(!extent){
            scale.isNull = true;
        } else {
            var dMin = extent.min;
            var dMax = extent.max;

            if((dMax - dMin) === 0) {
                dMax = new Date(dMax.getTime() + 3600000); // 1 h
            }
        
            scale.domain(dMin, dMax);
        }
        
        return scale;
    },

    /**
     * Creates a continuous scale for a given axis.
     *
     * <p>
     * Uses the axis' option <tt>Offset</tt> to calculate excess domain margins at each end of the scale.
     * </p>
     * <p>
     * Also takes into account the specified axis' options
     * <tt>DomainRoundMode</tt> and <tt>DesiredTickCount</tt>.
     * </p>
     *
     * @param {pvc.visual.CartesianAxis} axis The axis.
     * @virtual
     * @type pv.Scale
     */
    _createContinuousScaleByAxis: function(axis){
        /* DOMAIN */
        var extent = this._getVisibleValueExtentConstrained(axis);
        
        var scale = new pv.Scale.linear();
        if(!extent){
            scale.isNull = true;
        } else {
            var dMin = extent.min;
            var dMax = extent.max;
    
            /*
             * If both negative or both positive
             * the scale does not contain the number 0.
             *
             * Currently this option ignores locks. Is this all right?
             */
            var originIsZero = axis.option('OriginIsZero');
            if(originIsZero && (dMin * dMax > 0)){
                if(dMin > 0){
                    dMin = 0;
                    extent.minLocked = true;
                } else {
                    dMax = 0;
                    extent.maxLocked = true;
                }
            }
    
            /*
             * If the bounds (still) are the same, things break,
             * so we add a wee bit of variation.
             *
             * This one must ignore locks.
             */
            if (dMin === dMax) {
                dMin = dMin !== 0 ? dMin * 0.99 : originIsZero ? 0 : -0.1;
                dMax = dMax !== 0 ? dMax * 1.01 : 0.1;
            } else if(dMin > dMax){
                // What the heck...
                // Is this ok or should throw?
                var bound = dMin;
                dMin = dMax;
                dMax = bound;
            }
            
            scale.domain(dMin, dMax);
        }
        
        return scale;
    },
    
    _setAxisScaleRange: function(axis){
        var info = this._mainContentPanel._layoutInfo;
        
        var size = (axis.orientation === 'x') ?
                   info.clientSize.width :
                   info.clientSize.height;
        
        axis.setScaleRange(size);

        return axis.scale;
    },
    
    _getAxesRoundingPaddings: function(){
        var axesPaddings = {};
        
        var axes  = this.axes;
        processAxis(axes.x);
        processAxis(axes.secondX);
        processAxis(axes.y);
        processAxis(axes.secondY);
        
        return axesPaddings;
        
        function setSide(side, pct){
            var value = axesPaddings[side];
            if(value == null || pct > value){
                axesPaddings[side] = pct;
            }
        }
        
        function processAxis(axis){
            if(axis){
                // {begin: , end: }
                var roundingPaddings = axis.getScaleRoundingPaddings();
                if(roundingPaddings){
                    if(axis.orientation === 'x'){
                        setSide('left',  roundingPaddings.begin);
                        setSide('right', roundingPaddings.end);
                    } else {
                        setSide('bottom', roundingPaddings.begin);
                        setSide('top',    roundingPaddings.end);
                    }
                }
            }
        }
    },
    
    /*
     * Obtains the chart's visible data
     * grouped according to the charts "main grouping".
     * 
     * @param {string|string[]} [dataPartValues=null] The desired data part value or values.
     * @param {object} [keyArgs=null] Optional keyword arguments object.
     * @param {boolean} [keyArgs.ignoreNulls=true] Indicates that null datums should be ignored.
     * 
     * @type pvc.data.Data
     */
    _getVisibleData: function(dataPartValues, keyArgs){
        var ignoreNulls = def.get(keyArgs, 'ignoreNulls', true);
        if(ignoreNulls){
            // If already globally ignoring nulls, there's no need to do it explicitly anywhere
            ignoreNulls = !this.options.ignoreNulls;
        }
        
        var key = ignoreNulls + '|' + (dataPartValues || ''), // relying on Array.toString
            data = def.getOwn(this._visibleDataCache, key);
        if(!data) {
            data = this._createVisibleData(dataPartValues, ignoreNulls);
            
            (this._visibleDataCache || (this._visibleDataCache = {}))
                [key] = data;
        }
        
        return data;
    },

    /*
     * Creates the chart's visible data
     * grouped according to the charts "main grouping".
     *
     * <p>
     * The default implementation groups data by series visual role.
     * </p>
     *
     * @param {string|string[]} [dataPartValues=null] The desired data part value or values.
     *
     * @type pvc.data.Data
     * @protected
     * @virtual
     */
    _createVisibleData: function(dataPartValues, ignoreNulls){
        var partData = this.partData(dataPartValues);
        return this._serRole && this._serRole.grouping ?
                   this._serRole.flatten(partData, {visible: true, isNull: ignoreNulls ? false : null}) :
                   partData;
    },
    
    _assertSingleContinuousValueRole: function(valueRole){
        if(!valueRole.grouping.isSingleDimension) {
            pvc.log("[WARNING] A linear scale can only be obtained for a single dimension role.");
        }
        
        if(valueRole.grouping.isDiscrete()) {
            pvc.log("[WARNING] The single dimension of role '{0}' should be continuous.", [valueRole.name]);
        }
    },
    
    /**
     * Gets the extent of the values of the specified axis' roles
     * over all datums of the visible data.
     * 
     * @param {pvc.visual.CartesianAxis} valueAxis The value axis.
     * @type object
     *
     * @protected
     * @virtual
     */
    _getVisibleValueExtent: function(valueAxis){
        var dataCells = valueAxis.dataCells;
        if(dataCells.length === 1){
            // Most common case is faster
            return this._getVisibleRoleValueExtent(valueAxis, dataCells[0]);
        }

        return def.query(dataCells)
                .select(function(dataCell){
                    return this._getVisibleRoleValueExtent(valueAxis, dataCell);
                }, this)
                .reduce(this._unionReduceExtent, null);
    },

    /**
     * Could/Should be static
     */
    _unionReduceExtent: function(result, range){
        if(!result) {
            if(!range){
                return null;
            }

            result = {min: range.min, max: range.max};
        } else if(range){
            if(range.min < result.min){
                result.min = range.min;
            }

            if(range.max > result.max){
                result.max = range.max;
            }
        }

        return result;
    },

    /**
     * Gets the extent of the values of the specified role
     * over all datums of the visible data.
     *
     * @param {pvc.visual.CartesianAxis} valueAxis The value axis.
     * @param {pvc.visual.Role} valueDataCell The data cell.
     * @type object
     *
     * @protected
     * @virtual
     */
    _getVisibleRoleValueExtent: function(valueAxis, valueDataCell){
        var valueRole = valueDataCell.role;
        var dataPartValues = valueDataCell.dataPartValues;
        
        this._assertSingleContinuousValueRole(valueRole);

        if(valueRole.name === 'series') {
            /* not supported/implemented? */
            throw def.error.notImplemented();
        }

        var valueDimName = valueRole.firstDimensionName();
        var extent = this._getVisibleData(dataPartValues).dimensions(valueDimName).extent();
        return extent ? {min: extent.min.value, max: extent.max.value} : undefined;
    },
    
    /**
     * @virtual
     */
    _getVisibleValueExtentConstrained: function(axis, min, max){
        var extent = {
                minLocked: false,
                maxLocked: false
            };
        
        if(min == null) {
            min = axis.option('FixedMin');
            if(min != null){
                extent.minLocked = true;
            }
        }
        
        if(max == null) {
            max = axis.option('FixedMax');
            if(max != null){
                extent.maxLocked = true;
            }
        }
        
        if(min == null || max == null) {
            var baseExtent = this._getVisibleValueExtent(axis); // null when no data
            if(!baseExtent){
                return null;
            }
            
            if(min == null){
                min = baseExtent.min;
            }
            
            if(max == null){
                max = baseExtent.max;
            }
        }
        
        extent.min = min;
        extent.max = max;
        
        return extent;
    },
    
    defaults: def.create(pvc.TimeseriesAbstract.prototype.defaults, {
        showAllTimeseries: false,
    
        /* Percentage of occupied space over total space in a discrete axis band */
        panelSizeRatio: 0.9,

        // Indicates that the *base* axis is a timeseries
        timeSeries: false,
        timeSeriesFormat: "%Y-%m-%d",
        
//        originIsZero:  undefined,
//        
//        orthoFixedMin: undefined,
//        orthoFixedMax: undefined,

        useCompositeAxis: false,
        
        // Show a frame around the plot area
//        showPlotFrame: undefined,
        
        /* Non-standard axes options and defaults */
        showXScale: true,
        showYScale: true,
        
        xAxisPosition: "bottom",
        yAxisPosition: "left",

        secondAxisIndependentScale: false,
        secondAxisColor: "blue"
    })
});
