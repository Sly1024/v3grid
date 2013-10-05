define('v3grid/RangeDataProvider',
    ['v3grid/Adapter', 'v3grid/DataProvider'],
    function (Adapter, DataProvider) {
        var RangeDataProvider = function (config) {
            Adapter.merge(this, config);

            this.offset = this.offset || 0;
            if (this.dataProvider && this.dataProvider.addListener) {
                this.dataProvider.addListener('cellChanged', this.invalidateCell, this);
            }
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
            },
            invalidateCell: function (row, column) {
                var rrow = row - this.offset;
                if (rrow >= 0 && rrow < this.count) this.fireEvent('cellChanged', rrow, column);
            }
        });

        return RangeDataProvider;
    }
);