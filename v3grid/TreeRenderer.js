ClassDef('v3grid.TreeRenderer',
    ['v3grid.Adapter', 'v3grid.Utils'],
    function (Adapter, Utils) {

        var open_class = 'v3grid-treenode-open';
        var closed_class = 'v3grid-treenode-closed';
        return {
            extends: 'v3grid.WrapperRenderer',

            ctor: function TreeRenderer(config) {
                var me = this;
                me.config = config;

                var temp = document.createElement('div');
                temp.innerHTML = '<table width="100%" height="100%"><tr><td align="right" valign="middle" style="width: 16px">' +
                    '<img width="9" height="9" style="padding: 2px 10px 2px 2px;" src="resources/images/s.gif"></td><td style="height:100%"><div></div></td></tr></table>';
                me.view = temp.firstChild;
                me.rendererContainer = me.view.getElementsByTagName('div')[0];

                var indicator = me.openIndicator = me.view.getElementsByTagName('img')[0];

                if (Adapter.hasTouch) {
                    me.tapHandler = new Utils.TapHandler(indicator, me.clickHandler, me);
                } else {
                    Adapter.addListener(indicator, 'click', me.clickHandler, me);
                }

                me.updateRenderer(config);
                me.mapper = config.treeMapper;
            },

            updateData: function (grid, row, col) {
                this.super.updateData.call(this, grid, row, col);
                this.lastRow = grid.dataProvider.getCellData(row, '__treemapper_row');

                var mapper = this.mapper,
                    info = mapper.nodes[this.lastRow],
                    indicator = this.openIndicator;

                if (info.childCount == 0) {
                    indicator.style.display = 'none';
                } else {
                    indicator.style.display = '';
                    var isOpen = mapper.openNodes[info.id];
                    Adapter.removeClass(indicator, isOpen ? closed_class : open_class);
                    Adapter.addClass(indicator, isOpen ? open_class : closed_class);
                }
                indicator.parentNode.style.width = (info.depth * mapper.indentation) + 'px';
            },

            clickHandler: function (evt) {
                this.mapper.toggleNode(this.lastRow, evt);
            }
        };

    }
);