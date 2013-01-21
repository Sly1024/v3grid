Ext.define('virtualgrid.NumberItemRenderer', {

    constructor: function () {
        this.tNode = document.createTextNode('');
        this.view = document.createElement('span');
        this.view.appendChild(this.tNode);
        this.view.style.position = 'absolute';
        this.view.style.width = '100%';
        this.view.style.height = '100%';
        this.callParent(arguments);

    },

    setData: function (data) {
        this.tNode.nodeValue = data ? data.toString() : '';
        this.view.className = (data < 0 ? 'negativeNumber' : 'positiveNumber') + (data % 10 == 0 ? ' ten' : '');
    }

}, function () {
    Ext.util.CSS.createStyleSheet(
        '.negativeNumber { text-align: left;  color: #cf5555; }' +
        '.positiveNumber { text-align: right; color: #55cf55; }' +
        '.ten { background-color: #d0d0f0; }'
    );
});
