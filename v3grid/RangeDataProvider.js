define('v3grid/RangeDataProvider',
    ['v3grid/Adapter', 'v3grid/Observable'],
    function (Adapter, Observable) {
        var RangeDataProvider = function (config) {
            Adapter.merge(this, config);

            this.offset = this.offset || 0;

            var dp = this.dataProvider;
            if (dp && dp.addListener) {
                dp.addListener('dataChanged', this.refresh, this);
            }
        };

        RangeDataProvider.prototype = Adapter.merge(new Observable(), {
            getRowCount: function () {
                return this.count;
            },
            getRowId: function (row) {
                return this.dataProvider.getRowId(row + this.offset);
            },
            getCellData: function (row, colDataIdx) {
                return this.dataProvider.getCellData(row + this.offset, colDataIdx);
            },
            refresh: function () {
                this.fireEvent('dataChanged');
            }
        });

        return RangeDataProvider;
    }
);