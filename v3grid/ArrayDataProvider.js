ClassDefReq('v3grid.ArrayDataProvider', {
    extends: 'v3grid.DataProvider',
    requires: ['v3grid.Adapter'],

    ctor: function ArrayDataProvider(data) {
        this.data = data;
    },

    getRowCount: function () {
        return this.data.length;
    },
    getCellData: function (row, colDataIdx) {
        return this.data[row][colDataIdx];
    }
});