(function() {
    var rpc;
    function popupClose(){
	window.close();
    }
    function popupReload(){
	window.location.reload();
    }
    function tabReady() {
	rpc.sendMessage("getTabTitle", {}, function(title) {
	    rpc.sendMessage("buildUI", {title:title});
	});
    }
    function checkTab(tab) {
	rpc.registerRemoteTab(tab.id,["sandboxrpc.js","content-script.js"], tabReady);
    }
    function getHamlFile(fn, callback) {
	var req = new XMLHttpRequest();
	if (!req){ callback("unable to create xhr"); return; }
	try {
	    req.open("GET",fn,true);
	}catch (err) {
	    console.log(err);
	    callback(err.message);
	    return;
	}
	req.onreadystatechange = function () {
	    if (req.readyState !== 4){ return; }
	    if (req.status !== 200 && req.status !== 304) {
		callback(req.status);
		return;
	    }
	    callback(req.responseText);
	};
	if (req.readyState === 4){ callback("bad initial state"); return;}
	req.send();
    }
    document.addEventListener('DOMContentLoaded', function() {
	rpc = new RPC();
	rpc.registerHandlers([
	    "popupClose", popupClose, false,
	    "popupReload", popupReload, false,
	    "getHamlFile", getHamlFile, true
	]);
	rpc.createProxyHandlers(["tabClose", "tabReload"]);
	rpc.registerRemoteIFrame(document.getElementById('theFrame'), function() {
	    chrome.tabs.getSelected(null,checkTab);
	});
    });
}());
