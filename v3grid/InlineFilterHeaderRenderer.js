define('v3grid/InlineFilterHeaderRenderer',
    ['v3grid/Adapter'],
    function (Adapter) {
        var InlineFilterHeaderRenderer = function (config) {
            this.config = config;

            var temp = document.createElement('div');
            temp.innerHTML = '<table width="100%" height="100%"><tr style="height:100%"><td></td></tr><tr><td valign="bottom"><input type="text" style="width: 100%"></td></tr></table>';
            this.view = temp.firstChild;
            this.textInput = this.view.getElementsByTagName('input')[0];

            this.bufferedInputChanged = Adapter.createBuffered(this.textInputChanged, 200, this);

            Adapter.addListener(this.textInput, 'change', this.bufferedInputChanged, this);
            Adapter.addListener(this.textInput, 'keydown', this.bufferedInputChanged, this);
            Adapter.addListener(this.textInput, 'paste', this.bufferedInputChanged, this);
            Adapter.addListener(this.textInput, 'input', this.bufferedInputChanged, this);

            this.rendererContainer = this.view.getElementsByTagName('td')[0];
            this.updateRenderer(config);
        }

        InlineFilterHeaderRenderer.prototype = {
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
                this.textInput.value = config.filter.filterString;
            },

            updateData: function (grid, row, col) {
                this.renderer.updateData(grid, row, col);
            },

            textInputChanged: function () {
                var str = this.textInput.value;
                var filterDP = this.config.filterDataProvider;
                var filter = this.config.filter;
                if (str) {
                    filter.filterString = str;
                    filterDP.addFilter(filter);
                } else {
                    filter.filterString = '';
                    filterDP.removeFilter(filter);
                }
                filterDP.update();
            }
        }

        return InlineFilterHeaderRenderer;
    }
);
