define('v3grid/ColumnRange',
    ['v3grid/Adapter', 'v3grid/Observable'],
    function (Adapter, Observable) {

        var ColumnRange = function (columns) {
            this.columns = columns;

            this.posX = new Array(columns.length+1);
            this.calcPosX();

            this.columnMap = {};
            this.generateColumnMap();
        };

        ColumnRange.prototype = Adapter.merge(new Observable(), {

            getTotalWidth: function () {
                return this.posX[this.columns.length];
            },

            // both inclusive (normal: 0, total)
            calcPosX: function (fromIdx, toIdx) {
                var columnsX = this.posX;
                if (!columnsX) return;

                var startX, columns = this.columns;

                fromIdx = fromIdx || 0;
                if(toIdx === undefined) toIdx = columns.length;

                if (fromIdx == 0) {
                    columnsX[0] = startX = 0;
                } else {
                    startX = columnsX[--fromIdx];
                }

                for (var i = fromIdx; i < toIdx;) {
                    startX += columns[i].visible ? columns[i].actWidth : 0;
                    ++i;
                    columnsX[i] = startX;
                }
            },

            // both inclusive
            generateColumnMap: function (fromIdx, toIdx, removed) {
                var map = this.columnMap,
                    columns = this.columns;

                if (removed) {
                    delete map[removed.dataIndex];
                }

                fromIdx = fromIdx || 0;
                if(toIdx === undefined) toIdx = columns.length-1;

                for (var i = fromIdx; i <= toIdx; ++i) {
                    map[columns[i].dataIndex] = i;
                }
            },

            // public
            moveColumn: function (fromIdx, toIdx, suppressEvent) {
                // TODO: validate indices
                if (!suppressEvent) this.fireEvent('beforeColumnMove', fromIdx, toIdx);

                var columns = this.columns,
                    colObj = columns[fromIdx];

                columns.splice(fromIdx, 1);
                columns.splice(toIdx, 0, colObj);

//                update stuff
                var from = fromIdx > toIdx ? toIdx : fromIdx,
                    to = fromIdx ^ toIdx ^ from;    // the other one

                this.calcPosX(from, to);
                this.generateColumnMap(from, to);
                if (!suppressEvent) this.fireEvent('columnMoved', fromIdx, toIdx);
            },

            resizeColumn: function (idx, newWidth, suppressEvent) {
                var col = this.columns[idx];

                if (newWidth < col.minWidth) newWidth = col.minWidth;
                var oldWidth = col.actWidth;

                col.actWidth = newWidth;
                this.calcPosX(idx+1);

                if (!suppressEvent) this.fireEvent('columnResized', idx, oldWidth, newWidth);
            },

            addColumn: function (idx, config, suppressEvent) {
                this.columns.splice(idx, 0, config);
                this.calcPosX(idx);
                this.generateColumnMap(idx);
                if (!suppressEvent) this.fireEvent('columnAdded', idx, config);
            },

            removeColumn: function (idx, suppressEvent) {
                var col = this.columns[idx];
                this.columns.splice(idx, 1);
                this.calcPosX(idx);
                this.generateColumnMap(idx, undefined, col);
                if (!suppressEvent) this.fireEvent('columnRemoved', idx, col);
                return col;
            },

            // both inclusive (normal: 0, total-1)
            applyColumnStyles: function (from, to) {
                var columns = this.columns,
                    columnsX = this.posX;

                from = from || 0;
                if (to === undefined) to = columns.length-1;

                for (var dc = from; dc <= to; ++dc) {
                    var col = columns[dc];
                    Adapter.setXCSS(col.layoutRule, columnsX[dc]);
                    col.layoutRule.style.width = col.actWidth + 'px';
                }
            }
        });

        return ColumnRange;
    }
);
