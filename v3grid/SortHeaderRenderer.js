ClassDef('v3grid.SortHeaderRenderer',
    ['v3grid.Adapter', 'v3grid.Utils'],
    function (Adapter, Utils) {

        var asc_class = 'v3grid-sortheader-asc';
        var desc_class = 'v3grid-sortheader-desc';

        return {
            extends: 'v3grid.WrapperRenderer',

            ctor: function SortHeaderRenderer(config) {
                var me = this;
                me.config = config;

                var temp = document.createElement('div');
                temp.innerHTML = '<table width="100%" height="100%"><tr><td></td><td valign="middle">' +
                    '<img style="display: none;" width="10" height="10" src="resources/images/s.gif"></td><td style="font-size: 10px">x</td></tr></table>';
                me.view = temp.firstChild;
                me.rendererContainer = me.view.getElementsByTagName('td')[0];
                me.updateRenderer(config);
                me.img = me.view.getElementsByTagName('img')[0];
                me.sortIndexText = me.view.getElementsByTagName('td')[2].firstChild;
                me.sortIndexText.nodeValue = '';
                if (Adapter.hasTouch) {
                    me.tapHandler = new Utils.TapHandler(me.view, me.clickHandler, me);
                } else {
                    Adapter.addListener(me.view, 'click', me.clickHandler, me);
                }
            },

            updateData: function (grid, row, column) {
                this.super.updateData.call(this, grid, row, column);
                this.renderedColumn = column;

                var order = column.sortOrder;
                if (order == null) {
                    this.img.style.display = 'none';
                    this.sortIndexText.nodeValue = '';
                } else {
                    this.img.style.display = '';
                    Adapter.removeClass(this.img, (order == 'asc') ? desc_class : asc_class);
                    Adapter.addClass(this.img, (order == 'asc') ? asc_class : desc_class);
                    this.sortIndexText.nodeValue = column.sortIndex == 0 ? '' : column.sortIndex;
                }
            },

            clickHandler: function (evt) {
                var config = this.config;
                if (!this.renderedColumn.disableSort) {
                    config.sortHeaderRendererInjector.columnClicked(this.renderedColumn.dataIndex, evt);
                }
            },

            destroy: function () {
                if (this.tapHandler) this.tapHandler.destroy();
            }
        };
    }
);

