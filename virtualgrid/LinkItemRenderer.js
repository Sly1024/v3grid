Ext.define('virtualgrid.LinkItemRenderer', {

    constructor: function () {
        this.tNode = document.createTextNode('');
        this.view = document.createElement('span');
        this.view.innerHTML = "<a href='#'></a>";
        this.view.firstChild.appendChild(this.tNode);
        this.view.style.position = 'absolute';
        this.view.style.width = '100%';
        this.view.style.height = '100%';
        this.callParent(arguments);
    },

    setData: function (data) {
        this.tNode.nodeValue = data ? data.toString() : '';
    }

});
