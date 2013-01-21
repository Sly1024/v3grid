Ext.define('virtualgrid.CheckBoxItemRenderer', {
    constructor: function () {
        this.view = document.createElement('input');
        this.view.type = 'checkbox';
//        this.view.onclick = this.view.onkeydown = function () { return false;};
        this.view.style.position = 'absolute';
        this.view.style.top = '0';
        this.view.style.left = '0';
        this.view.style.bottom = '0';
        this.view.style.right = '0';
        this.view.style.margin = 'auto';
        this.callParent(arguments);
    },

    setData: function (data) {
        this.view.checked = data > 0;
    }
});
