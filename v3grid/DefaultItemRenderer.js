ClassDefReq('v3grid.DefaultItemRenderer', {
    ctor: function DefaultItemRenderer() {
        this.view = document.createTextNode('');
    },

    setData: function (data) {
        this.view.nodeValue = data != null ? data.toString() : '';
    }
});
