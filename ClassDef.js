(function () {
    var proto = 'prototype', ctor = 'ctor', statics = 'statics', exts = 'extends', requires = 'requires';

    function merge(from, to) {
        for (var key in from) if (from.hasOwnProperty(key)) to[key] = from[key];
    }

    function TempClass(){}

    this.Class = function (name, def) {
        var superClazz = Object;

        // handle 'extends'
        if (def[exts]) {
            superClazz = def[exts];
            delete def[exts];
        }

        // take 'constructor'
        if (!def.hasOwnProperty(ctor)) def[ctor] = (function ctor() { superClazz.apply(this, arguments); });

        var clazz = def[ctor];

        // 'statics'
        var sta;
        if (sta = def[statics]) {
            delete def[statics];
            merge(sta, clazz);
        }

        // add $className
        def.$className = clazz.$className = name;

        TempClass[proto] = def.super = superClazz[proto];

        // create & apply proto
        merge(def, clazz[proto] = new TempClass());

        // create namespace
        var part, nsObj = this, nsParts = name.split('.');
        name = nsParts.pop();
        while (part = nsParts.shift()) {
            nsObj = nsObj[part] || (nsObj[part] = {});
        }

        if (def.singleton) {
            clazz = new clazz();
        }

        // add clazz to namespace
        nsObj[name] = clazz;

        // static ctor
        if (sta && sta.hasOwnProperty(ctor)) {
            sta[ctor].call(clazz);
        }

        return clazz;
    };

    function fixModulePath(name) {
        return name.replace(/\./g, '/');
    }

    this.ClassDef = function (name, dep, def) {
        if (Object.prototype.toString.call(dep) !== '[object Array]') {
            def = dep; dep = [];
        }

        var i, len, reqLen = dep.length, req = [];
        for (i = 0; i < reqLen; ++i) {
            req[i] = fixModulePath(dep[i]);
        }

        if (typeof def[exts] == 'string') {
            req.push(fixModulePath(def[exts]));
            ++reqLen;
        }

        if (def[requires]) {
            for (len = def[requires].length, i = 0; i < len; ++i)  {
                var reqModule = def[requires][i];
                if (typeof reqModule == 'string') {
                    req.push(fixModulePath(reqModule));
                }
            }
        }

        require(req, function () {
            var args = Array.prototype.slice.call(arguments, 0, reqLen);
            if (typeof def[exts] == 'string') def[exts] = args.pop();
            if (typeof def == 'function') {
                ClassDef(name, def.apply(this, args));
            } else {
                define(fixModulePath(name), [], function () {
                    return Class(name, def);
                });
            }
        });
    };


})();

