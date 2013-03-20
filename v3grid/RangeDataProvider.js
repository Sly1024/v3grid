define('v3grid/RangeDataProvider',
    ['v3grid/Adapter', 'v3grid/DataProvider'],
    function (Adapter, DataProvider) {
        var RangeDataProvider = function (config) {
            Adapter.merge(this, config);

            this.offset = this.offset || 0;
        };

        RangeDataProvider.prototype = new DataProvider({
            getRowCount: function () {
                return this.count;
            },
            getRowId: function (row) {
                return this.dataProvider.getRowId(row + this.offset);
            },
            getCellData: function (row, colDataIdx) {
                return this.dataProvider.getCellData(row + this.offset, colDataIdx);
            }
        });

        return RangeDataProvider;
    }
);