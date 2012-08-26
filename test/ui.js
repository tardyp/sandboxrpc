(function (){
    function buildUI(context) {
	require(["ui/MainWidget"],
		function(MainWidget) {
		    return new MainWidget(context, dojo.byId("content"));
		});
    }
    function displayError(err) {
    }
    require({packages: [ {
        name: 'ui',
            location: location.pathname.replace(/\/[^/]+$/, '') + '/ui'
        },{
        name: 'haml',
            location: location.pathname.replace(/\/[^/]+$/, '') + '/haml-js/lib'
        }
]},["dojo","dojo/domReady!"],
	    function() {
		window.rpc = new RPC();
		window.rpc.registerHandlers([
		    "buildUI",buildUI, false,
		    "displayError",displayError, false
		]);});
}());
