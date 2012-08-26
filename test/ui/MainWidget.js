define([
     "dojo/_base/declare",
     "dijit/_WidgetBase", "dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin","ui/haml!./mainwidget.haml","dijit/form/Button"
 ], function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, template){
     console.log(template);
     return declare("ui.MainWidget", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
	 constructor: function(args) {
	     this.templateString = template(args);
	     this.inherited(arguments);
	 },
	 closePopup: function(args) {
	     window.rpc.sendMessage("popupClose");
	 },
	 reloadPopup: function(args) {
	     window.rpc.sendMessage("popupReload");
	 },
	 closeTab: function(args) {
	     window.rpc.sendMessage("tabClose");
	 },
	 reloadTab: function(args) {
	     window.rpc.sendMessage("tabReload");
	 }
     });
 });
