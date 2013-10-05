define('v3grid/DataProvider',
    ['v3grid/Adapter', 'v3grid/Observable'],
    function (Adapter, Observable) {
        var DataProvider = function (config) {
            if (config) Adapter.merge(this, config);
        };

        DataProvider.prototype = new Observable({
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

        return DataProvider;
    }
);