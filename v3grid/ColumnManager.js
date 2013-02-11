define('v3grid/ColumnManager',
    ['v3grid/Adapter'],
    function (Adapter) {

        var Manager = function (configs) {
            this.columns = Adapter.arrayMap(configs, this.processConfig, this);

            this.posX = new Array(configs.length+1);
            this.calcPosX(0, configs.length);

            this.columnMap = {};
            this.generateColumnMap();
        };

        Manager.prototype = Adapter.merge(new Adapter.ObservableClass(), {

            processConfig: function (col, idx) {
                return Adapter.merge({}, col);  //clone col
            },

            // both inclusive (normal: 0, total)
            calcPosX: function (fromIdx, toIdx) {
                var columns = this.columns,
                    columnsX = this.posX;

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

            generateColumnMap: function () {
                var map = this.columnMap,
                    columns = this.columns,
                    len = columns.length;

                for (var i = 0; i < len; ++i) {
                    map[columns[i].dataIndex] = i;
                }
            },

            // public
            moveColumn: function (fromIdx, toIdx) {
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
                this.fireEvent('columnMoved', fromIdx, toIdx);
            }
        });

        return Manager;
    }
);