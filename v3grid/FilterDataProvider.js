define('v3grid/FilterDataProvider',
    ['v3grid/Adapter', 'v3grid/FilterDataProviderBase'],
    function (Adapter, FilterDataProviderBase) {

        var FilterDataProvider = function (config) {
            FilterDataProviderBase.call(this, config);
            this.index = [];
            this.update();
        };

        FilterDataProvider.prototype = new FilterDataProviderBase({
            /* DataProvider API - start */
            getRowCount: function () {
                return this.index.length;
            },

            getRowId: function (row) {
                return this.dataProvider.getRowId(this.index[row]);
            },

            getCellData: function (row, col) {
                return this.dataProvider.getCellData(this.index[row], col);
            },
            /* DataProvider API - end */

            update: function () {
                var dataProvider = this.dataProvider,
                    rowCount = dataProvider.getRowCount(),
                    filters = this.filters,
                    index = this.index,
                    idxlen = 0;

                for (var i = 0; i < rowCount; ++i) {
                    var pass = true;
                    for (var len = filters.length, f = 0; f < len; ++f) {
                        if (!filters[f].filter(dataProvider, i)) {
                            pass = false;
                            break;
                        }
                    }
                    if (pass) {
                        index[idxlen++] = i;
                    }
                }

                index.length = idxlen;
            }
        });

        return FilterDataProvider;
    }
);
