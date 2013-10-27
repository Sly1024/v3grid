(function () {
    function fixModulePath(name) {
        return name.replace(/\./g, '/');
    }

    this.ClassDefReq = function (name, dep, def) {
        if (Object.prototype.toString.call(dep) !== '[object Array]') {
            def = dep; dep = [];
        }

        var i, reqLen = dep.length, req = [];
        for (i = 0; i < reqLen; ++i) {
            req[i] = fixModulePath(dep[i]);
        }

        if (typeof def.extends == 'string') {
            req.unshift(fixModulePath(def.extends));
        }

        if (def.requires) {
            for (var len = def.requires.length, i = 0; i < len; ++i)  {
                var reqModule = def.requires[i];
                if (typeof reqModule == 'string') {
                    req.push(fixModulePath(reqModule));
                }
            }
        }

        require(req, function () {
            var args = Array.prototype.slice.call(arguments, 0);
            if (typeof def.extends == 'string') def.extends = args.shift();
            if (typeof def == 'function') {
                def = def.apply(this, args.slice(0, reqLen));
                ClassDefReq(name, def);
            } else {
                define(fixModulePath(name), [], function () {
                    return ClassDef(name, def);
                });
            }
        });
    };

})();