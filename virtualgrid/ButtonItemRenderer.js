Ext.define('virtualgrid.ButtonItemRenderer', {
    constructor: function () {
        this.view = document.createElement('input');
        this.view.type = 'button';
        this.view.style.position = 'absolute';
        this.view.style.top = '0px';
        this.view.style.left = '0px';
        this.callParent(arguments);
    },

    setData: function (data) {
        this.view.value = data ? data : '';
    }
});