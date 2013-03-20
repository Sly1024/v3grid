define('v3grid/ArrayDataProvider', ['v3grid/Adapter', 'v3grid/DataProvider'],
    function (Adapter, DataProvider) {
        var ArrayDataProvider = function (data) {
            this.data = data;
        };

        ArrayDataProvider.prototype = new DataProvider({
            getRowCount: function () {
                return this.data.length;
            },
            getCellData: function (row, colDataIdx) {
                return this.data[row][colDataIdx];
            }
        });

        return ArrayDataProvider;
    }
);