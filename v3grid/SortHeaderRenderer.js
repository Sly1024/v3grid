define('v3grid/SortHeaderRenderer',
    ['v3grid/Adapter', 'v3grid/Utils'],
    function (Adapter, Utils) {

        var asc_img = (require.baseUrl !== undefined ? require.baseUrl : requirejs.s.contexts._.config.baseUrl) + 'v3grid/images/up_arrow.png';
        var desc_img = (require.baseUrl !== undefined ? require.baseUrl : requirejs.s.contexts._.config.baseUrl) + 'v3grid/images/down_arrow.png';

        Utils.preloadImages([asc_img, desc_img]);

        var SortHeaderRenderer = function (config) {
            this.config = config;

            var temp = document.createElement('div');
            temp.innerHTML = '<table width="100%" height="100%"><tr><td></td><td valign="middle">' +
                '<img style="display: none;" width="10" height="10"></td><td style="font-size: 10px">x</td></tr></table>';
            this.view = temp.firstChild;
            this.rendererContainer = this.view.getElementsByTagName('td')[0];
            this.updateRenderer(config);
            this.img = this.view.getElementsByTagName('img')[0];
            this.sortIndexText = this.view.getElementsByTagName('td')[2].firstChild;
            this.sortIndexText.nodeValue = '';
            if (Adapter.hasTouch) {
                this.tapHandler = new Utils.TapHandler(this.view, this.clickHandler, this);
            } else {
                Adapter.addListener(this.view, 'click', this.clickHandler, this);
            }
        };

        SortHeaderRenderer.prototype = {
            updateRenderer: function (config) {
                while (this.rendererContainer.firstChild) this.rendererContainer.removeChild(this.rendererContainer.firstChild);
                this.renderer = new config.renderer(config.rendererConfig);
                this.rendererContainer.appendChild(this.renderer.view);
            },

            setConfig: function (config) {
                if (config.renderer != this.config.renderer || config.rendererConfig != this.config.rendererConfig) {
                    this.updateRenderer(config);
                }
                this.config = config;
            },

            updateData: function (grid, row, col) {
                this.renderer.updateData(grid, row, col);

                var order = this.config.sortOrder;
                if (order == null) {
                    this.img.style.display = 'none';
                    this.sortIndexText.nodeValue = '';
                } else {
                    this.img.style.display = 'block';
                    this.img.src = (order == 'asc') ? asc_img : desc_img;
                    this.sortIndexText.nodeValue = this.config.sortIndex == 0 ? '' : this.config.sortIndex;
                }
            },

            clickHandler: function (evt) {
                var config = this.config;
                if (!config.column.disableSort) {
                    config.sortDataProvider.columnClicked(config.dataIdx, evt);
                }
            },

            destroy: function () {
                if (this.tapHandler) this.tapHandler.destroy();
            }
        };

        return SortHeaderRenderer;
    }
);

