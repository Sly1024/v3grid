ClassDefReq('v3grid.DataProvider', {
    extends: 'v3grid.Observable',

    ctor: function DataProvider(config) {
        if (config) v3grid.Adapter.merge(this, config);
    },

    getRowId: function (row) {
        return row;
    },
    refresh: function () {
        this.fireEvent('dataChanged');
    },
    invalidateCell: function (row, column) {
        this.fireEvent('cellChanged', row, column);
    }
});