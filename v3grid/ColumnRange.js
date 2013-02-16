define('v3grid/ColumnRange',
    ['v3grid/Adapter'],
    function (Adapter) {

        var Range = function (columns) {
            this.columns = columns;

            this.posX = new Array(columns.length+1);
            this.calcPosX();

            this.columnMap = {};
            this.generateColumnMap();
        };

        Range.prototype = Adapter.merge(new Adapter.ObservableClass(),{

            // both inclusive (normal: 0, total)
            calcPosX: function (fromIdx, toIdx) {
                var columns = this.columns,
                    columnsX = this.posX;

                fromIdx = fromIdx || 0;
                if(toIdx === undefined) toIdx = columns.length;

                var startX;
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
            generateColumnMap: function (fromIdx, toIdx) {
                var map = this.columnMap,
                    columns = this.columns;

                fromIdx = fromIdx || 0;
                if(toIdx === undefined) toIdx = columns.length-1;

                for (var i = fromIdx; i <= toIdx; ++i) {
                    map[columns[i].dataIndex] = i;
                }
            },

            // public
            moveColumn: function (fromIdx, toIdx, suppressEvent) {
                // TODO: validate indices

                var map = this.columnMap,
                    columns = this.columns,
                    dir = fromIdx < toIdx ? 1 : -1;

                // store 'fromIdx' in temp
                var colObj = columns[fromIdx], i;

                for (i = fromIdx; i != toIdx; i += dir) {
                    map[(columns[i] = columns[i + dir]).dataIndex] = i;
                }

                map[(columns[toIdx] = colObj).dataIndex] = toIdx;

//                update stuff
                var from = dir < 0 ? toIdx : fromIdx,
                    to = fromIdx ^ toIdx ^ from;    // the other one

                this.calcPosX(from, to);
//            this.applyColumnStyles(fromIdx, toIdx);
                if (!suppressEvent) this.fireEvent('columnMoved', fromIdx, toIdx);
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
                this.generateColumnMap(idx);
                if (!suppressEvent) this.fireEvent('columnRemoved', idx, col);
                return col;
            }
        });

        return Range;
    }
);
