(function() {
    "use strict";
    var rpc;
    function tabClose(){
	window.close();
    }
    function tabReload(){
	window.location.reload();
    }
    function getTabTitle(args, callback){
	/* simulate deferred response */
	setTimeout(function(){
	    callback(window.document.title);},
	200);
    }
    rpc = new RPC();
    rpc.registerHandlers([
	"tabClose", tabClose, false,
	"tabReload", tabReload, false,
	"getTabTitle", getTabTitle, true
    ]);
}());
