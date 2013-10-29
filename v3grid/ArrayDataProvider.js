ClassDefReq('v3grid.ArrayDataProvider', {
    extends: 'v3grid.DataProvider',

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