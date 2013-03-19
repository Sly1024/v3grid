define('v3grid/ArrayDataProvider', ['v3grid/Adapter', 'v3grid/Observable'],
    function (Adapter, Observable) {
        var ArrayDataProvider = function (data) {
            this.data = data;
        };

        ArrayDataProvider.prototype = Adapter.merge(new Observable(), {
            getRowCount: function () {
                return this.data.length;
            },
            getRowId: function (row) {
                return row;
            },
            getCellData: function (row, colDataIdx) {
                return this.data[row][colDataIdx];
            },
            refresh: function () {
                this.fireEvent('dataChanged');
            }
        });

        return ArrayDataProvider;
    }
);