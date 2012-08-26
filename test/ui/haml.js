define(["haml/haml"], function(haml) {
    /* workaround the fact that xhr on extension is forbidden from sandbox */
    return {
	load : function(resourceDef, require, callback, config) {
	    window.rpc.sendMessage("getHamlFile", resourceDef, function(text) {
		callback(haml(text));
	    });
	}
 };
});
