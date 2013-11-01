ClassDef('v3grid.RendererCache', ['v3grid.Adapter'], function (Adapter) {
    var typeIdProp = '-v3grid-type-id';

    return {

        ctor: function (fixRendererFn) {
            this.avail = {};
            this.fixRenderer = fixRendererFn;
        },

        get: function (rendererType, config) {
            var typeId = rendererType[typeIdProp];
            if (!typeId) {
                this.fixRenderer(rendererType);
                typeId = rendererType[typeIdProp] = Adapter.generateUID();
            }
            var list = this.avail[typeId] || (this.avail[typeId] = []);

            if (list.length) return list.pop();

            var rend = new rendererType(config);
            rend[typeIdProp] = typeId;
            return rend;
        },

        release: function (instance) {
            this.avail[instance[typeIdProp]].push(instance);
        },

        swap: function (parentDom, renderer, rendererType, config) {
            if (renderer && (!rendererType || renderer[typeIdProp] !== rendererType[typeIdProp])) {
                parentDom.removeChild(renderer.view);
                this.release(renderer);
                renderer = null;
            }

            if (!renderer && rendererType) {
                renderer = this.get(rendererType, config);
                parentDom.appendChild(renderer.view);
            }

            return renderer;
        }
    };
});