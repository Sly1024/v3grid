define('v3grid/DefaultItemRenderer', [], function () {

    var DefaultItemRenderer = function () {
        this.view = document.createTextNode('');
    };

    DefaultItemRenderer.prototype = {
        setData: function (data) {
            this.view.nodeValue = data != null ? data.toString() : '';
        }
    };

    return DefaultItemRenderer;
});
