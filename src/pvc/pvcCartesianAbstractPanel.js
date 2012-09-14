
pvc.CartesianAbstractPanel = pvc.BasePanel.extend({
    anchor: 'fill',
    orientation: "vertical",
    stacked: false,
    offsetPaddings: null,
    
    constructor: function(chart, parent, options) {
        
        this.base(chart, parent, options);
        
        // Initialize paddings from axes offsets
        var axes = chart.axes;
        var paddings = {};
        var hasAny = false;
        
        function setSide(side, pct){
            var value = paddings[side];
            if(value == null || pct > value){
                hasAny = true;
                paddings[side] = pct;
            }
        }
        
        function processAxis(axis){
            var offset = axis && axis.option('Offset');
            if(offset != null && offset >= 0) {
                if(axis.orientation === 'x'){
                    setSide('left',  offset);
                    setSide('right', offset);
                } else {
                    setSide('top',    offset);
                    setSide('bottom', offset);
                }
            }
        }
        
        processAxis(axes.x);
        processAxis(axes.secondX);
        processAxis(axes.y);
        processAxis(axes.secondY);
        
        if(hasAny){
            this.offsetPaddings = paddings;
        }
    },
    
    _calcLayout: function(layoutInfo){
        layoutInfo.requestPaddings = this._calcRequestPaddings(layoutInfo);
    },
    
    _calcRequestPaddings: function(layoutInfo){
        var op = this.offsetPaddings;
        if(!op){
            return;
        }

        var rp = this.chart._getAxesRoundingPaddings();
        var clientSize = layoutInfo.clientSize;
        var paddings   = layoutInfo.paddings;
        
        var reqPad = {};
        pvc.Sides.names.forEach(function(side){
//            var len_a = pvc.BasePanel.orthogonalLength[side];
//            var len   = clientSize[len_a] + paddings[len_a];
//            reqPad[side] = len * Math.max((op[side] || 0) - (rp[side] || 0), 0);
            
            var len_a = pvc.BasePanel.orthogonalLength[side];
            
            var clientLen = clientSize[len_a];
            var paddingLen = paddings[len_a];
            
            var len = clientLen + paddingLen;
            
            var offset   = len * (op[side] || 0);
            var rounding = clientLen * (rp[side] || 0);
        
            reqPad[side] = Math.max(offset - rounding, 0);
        }, this);
        
        return reqPad;  
    },
    
    /**
     * @override
     */
    _createCore: function() {
        // Send the panel behind the axis, title and legend, panels
        this.pvPanel.zOrder(-10);

        // Overflow
        var orthoAxis = this.chart.axes.ortho,
            baseAxis  = this.chart.axes.base;
        if (orthoAxis.option('FixedMin') != null ||
            orthoAxis.option('FixedMax') != null ||
            baseAxis .option('FixedMin') != null ||
            baseAxis .option('FixedMax') != null){
            // Padding area is used by bubbles and other vizs without problem
            this.pvPanel.borderPanel.overflow("hidden");
        }
    },

    _getVisibleData: function(dataPartValues, keyArgs){
        return this.chart._getVisibleData(dataPartValues || this.dataPartValue, keyArgs);
    },

    _getExtensionId: function(){
        return 'chart';
    },
        
    /* @override */
    isOrientationVertical: function(){
        return this.orientation === pvc.orientation.vertical;
    },

    /* @override */
    isOrientationHorizontal: function(){
        return this.orientation === pvc.orientation.horizontal;
    },

    /*
     * @override
     */
   _detectDatumsUnderRubberBand: function(datumsByKey, rb, keyArgs){
       var any = false,
           chart = this.chart,
           xAxisPanel = chart.xAxisPanel,
           yAxisPanel = chart.yAxisPanel,
           xDatumsByKey,
           yDatumsByKey;

       //1) x axis
       if(xAxisPanel){
           xDatumsByKey = {};
           if(!xAxisPanel._detectDatumsUnderRubberBand(xDatumsByKey, rb, keyArgs)) {
               xDatumsByKey = null;
           }
       }

       //2) y axis
       if(yAxisPanel){
           yDatumsByKey = {};
           if(!yAxisPanel._detectDatumsUnderRubberBand(yDatumsByKey, rb, keyArgs)) {
               yDatumsByKey = null;
           }
       }

       // Rubber band selects on both axes?
       if(xDatumsByKey && yDatumsByKey) {
           // Intersect datums

           def.eachOwn(yDatumsByKey, function(datum, key){
               if(def.hasOwn(xDatumsByKey, key)) {
                   datumsByKey[datum.key] = datum;
                   any = true;
               }
           });

           keyArgs.toggle = true;

       // Rubber band selects over any of the axes?
       } else if(xDatumsByKey) {
           def.copy(datumsByKey, xDatumsByKey);
           any = true;
       } else if(yDatumsByKey) {
           def.copy(datumsByKey, yDatumsByKey);
           any = true;
       } else {
           // Ask the base implementation for datums
           any = this.base(datumsByKey, rb, keyArgs);
       }

       return any;
   }
});