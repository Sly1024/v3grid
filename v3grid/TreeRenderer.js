define('v3grid/TreeRenderer',
    ['v3grid/Adapter', 'v3grid/Utils'],
    function (Adapter, Utils) {

        var minus_img = (require.baseUrl !== undefined ? require.baseUrl : requirejs.s.contexts._.config.baseUrl) + 'v3grid/images/minus.png';
        var plus_img = (require.baseUrl !== undefined ? require.baseUrl : requirejs.s.contexts._.config.baseUrl) + 'v3grid/images/plus.png';

        Utils.preloadImages([minus_img, plus_img]);

        var TreeRenderer = function (config) {
            this.config = config;

            var temp = document.createElement('div');
            temp.innerHTML = '<table width="100%" height="100%"><tr><td align="right" valign="middle" style="width: 16px">' +
                '<img width="14" height="14" style="padding: 2px;"></td><td style="height:100%"><span></span></td></tr></table>';
            this.view = temp.firstChild;
            this.rendererContainer = this.view.getElementsByTagName('span')[0];

            var indicator = this.openIndicator = this.view.getElementsByTagName('img')[0];

            if (Adapter.hasTouch) {
                this.tapHandler = new Utils.TapHandler(indicator, this.clickHandler, this);
            } else {
                Adapter.addListener(indicator, 'click', this.clickHandler, this);
            }

            this.updateRenderer(config);
            this.mapper = config.treeMapper;
        };

        TreeRenderer.prototype = {
            updateRenderer: function (config) {
                while (this.rendererContainer.firstChild) this.rendererContainer.removeChild(this.rendererContainer.firstChild);
                this.renderer = new config.renderer(config.rendererConfig);
                this.rendererContainer.appendChild(this.renderer.view);
            },

            updateData: function (grid, row, col) {
                this.renderer.updateData(grid, row, col);
                this.lastRow = grid.dataProvider.getCellData(row, '__treemapper_row');

                var mapper = this.mapper,
                    info = mapper.nodes[this.lastRow],
                    indicator = this.openIndicator;

                if (info.childCount == 0) {
                    indicator.style.display = 'none';
                } else {
                    indicator.style.display = 'block';
                    indicator.src = mapper.openNodes[info.id] ? minus_img : plus_img;
                }
                indicator.parentNode.style.width = (info.depth * mapper.indentation) + 'px';
            },

            setConfig: function (config) {
                if (config.renderer != this.config.renderer || config.rendererConfig != this.config.rendererConfig) {
                    this.updateRenderer(config);
                }
                this.config = config;
            },

            clickHandler: function (evt) {
                this.mapper.toggleNode(this.lastRow, evt);
            }
        };

        return TreeRenderer;
    }
);