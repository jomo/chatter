requirejs(["app", "router", "modules/servers/serverlist", "modules/servers/server", 
	"modules/servers/serverlistview", "modules/channels/channelview", 
	"modules/channels/channellist", "modules/channels/channel", "command"], 
	function(Chatter, Router, ServerList, Server, ServerListView, ChannelView, 
		ChannelList, Channel, Command) {
		var gui = require('nw.gui');
		Chatter.router = new Router();

		Chatter.start();
		var win = gui.Window.get();
		Chatter.Clients = {};
		Chatter.Connections = {};
		Chatter.Active = {server: null, channel: null};

		document.addEventListener('keydown', function(event){
			if( event.keyCode == 123 ) { gui.Window.get().showDevTools(); }
			if( event.keyCode == 116 ) { Chatter.reload(); }
			if( event.keyCode == 122 ) { 
				if (Chatter.display === "fullscreen") {
					Chatter.display = "normal";
					win.leaveFullscreen();
				} else {
					Chatter.display = "fullscreen";
					win.enterFullscreen();
				}
			}
		});

		$('.server').click(function(e) {
			var list = $(e.target).parent().find('ul');
			if ($(list).is(':visible')) {
				$(list).slideUp();
			} else {
				$(list).slideDown();
			}
		});

		Chatter.display = "normal";

		var tray = new gui.Tray({ title: 'Chatter', icon: 'resources/tray.png' });
		$('.close').click(function(e) {
			Chatter.display = "closed";
			win.close();
		});

		$('.minimize').click(function(e) {
			Chatter.display = "minimized";
			win.hide();
		});

    $('.maximize').click(function(e) {
      if (Chatter.display === "maximized") {
        Chatter.display = "normal";
        win.unmaximize();
      } else {
        Chatter.display = "maximized";
        win.maximize();
      }
    });

		tray.on('click', function() {
			if (Chatter.display === "minimized") {
				Chatter.display = "normal";
				win.show();
			} else {
				Chatter.display = "minimized";
				win.hide();
			}
		});

    tray.tooltip = "Chatter";
    tray.icon = "resources/tray.png";

		Chatter.Commands = Command;
		Chatter.Commands.add = Command.add;

		Chatter.Commands.add("join", function(client, data, args) {
			client.join(args.join(' ') + ' ');
		});

		Chatter.Commands.add("part", function(client, data, args) {
			var channel = null;
			var message = null;
			if (args.length == 1) {
				channel = args[0];
			} else {
				channel = Chatter.Active.channel.get('name');
			}
			if (args.length > 1) {
				message = args.slice(1).join(' ');
			}
			client.part(channel, message);
		});

		Chatter.Commands.add("nick", function(client, data, args) {
			if (args.length === 1) {
				var nick = args[0];
				client.send('nick', nick);
			}
		});

		Chatter.Commands.add("reload", function(client, data, args) {
			Chatter.reload();
		});

		Chatter.Commands.add("dev", function(client, data, args) {
			win.showDevTools();
		});

    Chatter.Commands.add("topic", function(client, data, args) {
      if (args.length === 0 || !Chatter.Active.channel) return;
      var topic = args.join(' ');
      client.send('topic', Chatter.Active.channel.get('name'), topic);
    });

    Chatter.Commands.add("me", function(client, data, args) {
      if (args.length === 0 || !Chatter.Active.channel) return;
      var action = args.join(' ');
      client.action(Chatter.Active.channel.get('name'), action);
    });

		win.on('new-win-policy', function (frame, url, policy) {
			policy.ignore();
		});

		var servers = new ServerList();
		servers.fetch();
		
		if (servers.length === 0) {
			var server = new Server({host: 'chat.freenode.net', port: 6667, title: "Freenode", nick: "JakeTestrator", real_name: "Jake", channels: ['#crafatar', '#unturned']})
			server.save();
			servers.add(server);
		}

		var view = new ServerListView({collection: servers});
		$('#channels ul').append(view.render().el);

		servers.each(function(server) {
			if (server.get('shouldConnect')) {
				server.connect();
			}
		});

		Chatter.disconnect = function(close, callback) {
			var keys = Object.keys(Chatter.Clients);
			keys.forEach(function (key) { 
				var client = Chatter.Clients[key];
				client.disconnect("Refreshing environment!", function() {
					if (key === keys[keys.length - 1]) {
						console.debug("Disconnected a client.")
						if (callback) callback();
						if (close) win.close(true);
					}
				});
			});
		}

		Chatter.reload = function() {
			Chatter.disconnect(false, function() {
				location.reload();
			});
		}

		win.on('close', function() {
			Chatter.disconnect(true);
		});

	});