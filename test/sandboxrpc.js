(function() {
"use strict";
var RPC = function(){
    this.currMessages={};
    this.local_handlers = {};
    this.remote_handlers = {};
    this.mid=0;
    this.listenMessages();
};
window.RPC=RPC;
console.error = function(err) {
    console.log("error from:",window.location.href);
    console.log(err);
    if (err.message) {
	console.log(err.message);
	console.log(err.stack);
    }
};

RPC.prototype.sendMessage = function (command, args, callback) {
    this.mid+=1;
    console.log("message:", command, args);
    var message = {
	command: command,
	args: args,
	mid: this.mid
    };
    if (this.remote_handlers.hasOwnProperty(command)) {
	    var h = this.remote_handlers[command];
	    h.postMessage(message, callback);
    } else {
	console.log("no handler for message:", command, args);
    }
};
RPC.prototype.listenMessages = function (command, args, callback) {
    var rpc = this;
    rpc.registerHandler("_reply", function(msg, cb, mid) { rpc.handleReplyMessage(msg, cb, mid); }, true);
    rpc.registerHandler("_ping", function(msg, cb, mid) { return "pong"; }, false);
    window.addEventListener('message', function(event) {
	function postReply(res, mid) {
	    var message = {
		command: "_reply",
		args: res,
		mid: mid
	    };
	    event.source.postMessage(message, "*");
	}
	function postMessage(msg, callback) {
	    rpc.currMessages[rpc.mid] = {callback:callback, message:msg};
	    event.source.postMessage(msg, event.origin);
	}
	if (event.data.command === "_handshake") {
	    rpc.registerRemoteHandlers(event.data.args, postMessage, event.source);
	    var supported_messages = Object.keys(rpc.local_handlers);
	    postReply(supported_messages, event.data.mid);
	} else {
	    rpc.handleMessage(event.data, postReply);
	}
	return true;
    });
    if (chrome && chrome.extension) {
	chrome.extension.onMessage.addListener(
	    function(request, sender, sendResponse) {
		function sendReply(res, mid) {
		    /* mid is ignored.. */
		    sendResponse(res);
		}
		function postMessage(msg, callback) {
		    chrome.extension.sendMessage(msg, callback);
		}
		if (request.command === "_handshake") { /* this should happen only in content-script */
		    if (sender.tab.id>=0) {
			console.log("receiving handshake from tab! should not happen.", sender, request);
			return;
		    }
		    rpc.registerRemoteHandlers(request.args, postMessage, sender);
		    sendResponse(Object.keys(rpc.local_handlers));
		} else {
		    rpc.handleMessage(request, sendReply);
		}
		return true;
	    });
    }
};
RPC.prototype.handleMessage = function (message, sendReply) {
    var rpc = this;
    if (rpc.local_handlers.hasOwnProperty(message.command)){
	var h  = rpc.local_handlers[message.command];
	try {
	    if (h.use_callback) {
		h.handler(message.args, function(res) {
		    sendReply(res, message.mid);}, message.mid);
	    } else {
		var res = h.handler(message.args);
		sendReply(res, message.mid);
	    }
	}catch(err) {
	    console.log("exception in handleMessage",err);
	    console.log(err.message);
	    console.log(err.stack);
	}
    } else {
	console.log("no handler for message:", message);
    }

};
RPC.prototype.handleReplyMessage = function (args, callback, mid) {
    if (this.currMessages.hasOwnProperty(mid)){
	if (this.currMessages[mid].callback) {
	    this.currMessages[mid].callback(args);
	}
	delete this.currMessages[mid];
    } else {
	console.log("got a reply for an unknown mid!!", mid, this.currMessages, args);
    }
};
RPC.prototype.registerHandler = function (name, handler, use_callback) {
    this.local_handlers[name] = {handler:handler, use_callback:use_callback};
};
RPC.prototype.registerHandlers = function (list) {
    for(var i = 0 ; i < list.length; i+=3) {
	this.local_handlers[list[i]] =  {handler:list[i+1], use_callback:list[i+2]};
    }
};
RPC.prototype.createProxyHandlers = function (list) {
    var rpc = this;
    function create_handler(msg) {
	return function(args, callback) {
	    rpc.sendMessage( msg, args, callback);
	};
    }
    for(var i = 0 ; i < list.length; i+=1) {
	this.local_handlers[list[i]] =  {handler:create_handler(list[i]), use_callback:true};
    }
};

RPC.prototype.registerRemoteHandler = function (name, postMessage, id) {
    this.remote_handlers[name] = {postMessage:postMessage, id:id};
};
RPC.prototype.registerRemoteHandlers = function (list, postMessage, id) {
    for(var i = 0 ; i < list.length; i+=1) {
	this.remote_handlers[list[i]] = {postMessage:postMessage, id:id};
    }
};RPC.prototype.registerRemote = function (id, postMessage, timeout, callback) {
    var rpc = this;
    var supported_messages = Object.keys(rpc.local_handlers);
    var alreadyReplied = function() {
	/* If remote takes more than 100ms to answer, timeout can occur
	   avoid infinite loop here. If we already have handlers for
	   this remote, dont resend and handshake msg,
	   this design will avoid infinite loop, but still several handshakes might
	   be sent.
	*/
	for (var c in rpc.remote_handlers) {
	    if (rpc.remote_handlers.hasOwnProperty(c)) {
		if (rpc.remote_handlers[c].id === id) {
		    return true;
		}
	    }
	}
	return false;
    };
    var t = window.setTimeout(function() {
	if (alreadyReplied()) {
	    return;
	}
	rpc.registerRemote(id, postMessage, timeout*2, callback);
    }, timeout);
    this.registerRemoteHandler("_handshake", postMessage);
    this.sendMessage("_handshake", supported_messages, function(res) {
	if(res) {
	    window.clearTimeout(t);
	    if (alreadyReplied()) {
		return;
	    }
	    rpc.registerRemoteHandlers(res, postMessage, id);
	    if (callback) {
		callback();
	    }
	}
    });
};
RPC.prototype.registerRemoteIFrame = function (iframe, callback) {
    var rpc = this;
    function postMessage(msg, callback) {
	rpc.currMessages[rpc.mid] = {callback:callback, message:msg};
	iframe.contentWindow.postMessage(msg, "*");
    }
    this.registerRemote(iframe, postMessage, 100, callback);
};
RPC.prototype.registerRemoteTab = function (tabid, scripts_to_inject, callback) {
    /* hacks to enforce only one script injection for each tab */
    var saved_error = console.error;
    var rpc = this;
    var doRegister = function(){
	console.error = saved_error;
	function postMessage(msg, callback) {
	    chrome.tabs.sendMessage(tabid, msg, callback);
	}
	rpc.registerRemote(tabid, postMessage, 100, callback);
    };
    var load_next = function() {
	console.error = saved_error;
	if (scripts_to_inject.length>0) {
	    var script = scripts_to_inject.shift();
	    chrome.tabs.executeScript(null, {file:script}, load_next);
	} else {
	    doRegister();
	}
    };
    console.error = function(err) {
	/* the only way to detect a connection error is to redirect console.error :-( */
	load_next();
    };
    try {
	/* we try to send a ping message, if we get a response, then we already
	 injected the scripts, do dont it again! */
	chrome.tabs.sendMessage(tabid, {command:"_ping"}, function(res) {
	    if (res!=="pong") {
		load_next();
	    } else {
		doRegister();
	    }
	});
    }catch (err) {
	load_next();
    }
};
}());
