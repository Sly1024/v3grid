Ext.define('virtualgrid.VirtualGrid', {
    extend: 'Ext.Component',
    alias:  'widget.v3grid',
    autoEl: 'div',

    constructor: function (config) {
        this.callParent(arguments);

        this.addEvents('gridCreated');
        this.isTouch = (Ext.getVersion('touch') !== undefined);

        this.gridConfig = config.gridConfig;

        this.on(this.isTouch ? 'painted' : 'render', this.renderHandler, this);
        this.on('resize', this.resizeHandler, this);
    },

    renderHandler: function () {
        var el = this.gridContainer = (this.isTouch ? this.element : this.el);

        this.gridConfig.renderTo = el.dom;
        this.grid = new v3grid.V3Grid(this.gridConfig);
        this.fireEvent('gridCreated', this);
    },

    resizeHandler: function () {
        var el = this.gridContainer;

        this.grid.setSize(el.getWidth(), el.getHeight());
    },

    destroy: function () {
        if (this.grid) this.grid.destroy();
        this.callParent(arguments);
    },

    afterGridCreated: function (fn, scope) {
        scope = scope || window;
        if (this.grid) {
            fn.call(scope);
        } else {
            this.on('gridCreated', fn, scope, { single: true });
        }
    }
});
