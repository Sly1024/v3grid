define('v3grid/DefaultHeaderRenderer',
    ['v3grid/Adapter', 'v3grid/DefaultItemRenderer'],
    function (Adapter, DefaultItemRenderer) {

        var DefaultHeaderRenderer = function () {
            DefaultItemRenderer.call(this);
        };

        DefaultHeaderRenderer.prototype = Adapter.merge({
            updateData: function (grid, row, column) {
                this.setData(column.header);
            }
        }, DefaultItemRenderer.prototype);

        return DefaultHeaderRenderer;
    }
);
