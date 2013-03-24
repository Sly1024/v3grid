define('v3grid/FormatterItemRenderer', [], function () {

    var FormatterItemRenderer = function () {
        this.view = document.createTextNode('');
    };

    FormatterItemRenderer.prototype = {
        updateData: function (grid, row, col) {
            var data = grid.dataProvider.getCellData(row, col.dataIndex);
            this.view.nodeValue = data != null ? col.formatter(data) : '';
        }
    };

    return FormatterItemRenderer;
});
