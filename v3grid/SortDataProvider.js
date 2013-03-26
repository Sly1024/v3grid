define('v3grid/SortDataProvider',
    ['v3grid/Adapter', 'v3grid/SortDataProviderBase'],
    function (Adapter, SortDataProviderBase) {

        var SortDataProvider = function (config) {
            SortDataProviderBase.call(this, config);
            this.index = [];
            this.sortedBy = [];
            this.unSort(true);
        };

        SortDataProvider.prototype = new SortDataProviderBase({

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

            refresh: function () {
                this.unSort(true);
                this.sort(this.sortedBy);
            },
            /* DataProvider API - end */

            sort: function (fields, noUpdate) {
                if (!noUpdate) this.updateIndicators(fields);

                this.index.sort(this.getCompareFunction());

                if (!noUpdate) this.fireEvent('dataChanged');
            },

            unSort: function (noUpdate) {
                if (!noUpdate) this.updateIndicators([]);

                var rowCount = this.dataProvider.getRowCount();
                var index = this.index;
                index.length = rowCount;
                for (var i = 0; i < rowCount; ++i) index[i] = i;

                if (!noUpdate) this.fireEvent('dataChanged');
            }

        });

        return SortDataProvider;
    }
);
