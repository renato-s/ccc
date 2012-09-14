
/**
 * TimeseriesAbstract is the base class for all categorical or timeseries
 */
pvc.TimeseriesAbstract = pvc.BaseChart.extend({

    allTimeseriesPanel : null,

    _preRenderContent: function(contentOptions){

        // Do we have the timeseries panel? add it
        if (this.options.showAllTimeseries){
            this.allTimeseriesPanel = new pvc.AllTimeseriesPanel(this, this.basePanel, {
                anchor: this.options.allTimeseriesPosition,
                allTimeseriesSize: this.options.allTimeseriesSize
            });
        }
    },
    
    defaults: def.create(pvc.BaseChart.prototype.defaults, {
        showAllTimeseries: true,
        allTimeseriesPosition: "bottom",
        allTimeseriesSize: 50
    })
});


/*
 * AllTimeseriesPanel panel. Generates a small timeseries panel that the user
 * can use to select the range:
 * <i>allTimeseriesPosition</i> - top / bottom / left / right. Default: top
 * <i>allTimeseriesSize</i> - The size of the timeseries in pixels. Default: 100
 *
 * Has the following protovis extension points:
 *
 * <i>allTimeseries_</i> - for the title Panel
 * 
 */
pvc.AllTimeseriesPanel = pvc.BasePanel.extend({

    pvAllTimeseriesPanel: null,
    anchor: "bottom",
    allTimeseriesSize: 50,

    /**
     * @override
     */
    _calcLayout: function(layoutInfo){
        return this.createAnchoredSize(this.allTimeseriesSize, layoutInfo.clientSize);
    },

    _getExtensionId: function(){
        return "allTimeseries";
    }
});