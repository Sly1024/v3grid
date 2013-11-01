ClassDef('v3grid.RangeDataProvider', {
    extends: 'v3grid.DataProvider',

    ctor: function RangeDataProvider(config) {
        v3grid.Adapter.merge(this, config);

        this.offset = this.offset || 0;
        if (this.dataProvider && this.dataProvider.addListener) {
            this.dataProvider.addListener('cellChanged', this.invalidateCell, this);
        }
    },

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