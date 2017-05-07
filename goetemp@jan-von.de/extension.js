const Lang = imports.lang;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;

const Soup = imports.gi.Soup;
const Clutter = imports.gi.Clutter;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const GOET_URL = 'https://goetemp.de/graphs/gnome.php';


let _httpSession;
let goetMenu;

const GoetempTemp = new Lang.Class({
		Name: 'Goetemp',
		Extends: PanelMenu.Button,

		_init: function () {
			this.parent(null, "Goetemp");

			// default text shown
			this.buttonText = new St.Label({
				text: _("Loading..."),
				y_align: Clutter.ActorAlign.CENTER
			});

			// icon in the shell
			let gicon=Gio.icon_new_for_string(Me.path + "/icons/goetemp.png");
			this.icon = new St.Icon({ gicon: gicon});

			//  add icon and text to the shell
		        let topBox = new St.BoxLayout();
   			topBox.add_actor(this.icon);
		        topBox.add_actor(this.buttonText);
			this.actor.add_actor(topBox);


			// register click-event and run verboseInfo function
			this.actor.connect('button-press-event', Lang.bind(this, this._verboseInfo));


			// initialize weatherwarning id and last id sent
			this.wid = "0";
			this.lastWidSent = "0";

			// fire...
			this._refresh();
		},


		// refresh data, send notification
		_verboseInfo: function() {
			this._refresh();
			Main.notify(this.from);
		},


		_refresh: function () {
			this._loadData(this._refreshUI);
			this._removeTimeout();
			// refresh every 300 seconds = 5 minutes
			this._timeout = Mainloop.timeout_add_seconds(300, Lang.bind(this, this._refresh));
			return true;
		},

		_loadData: function () {
			let params = {};
			_httpSession = new Soup.Session();
			_httpSession.user_agent = 'gnome-shell-extension goetemp via libsoup';

			let message = Soup.form_request_new_from_hash('GET', GOET_URL, params);
			_httpSession.queue_message(message, Lang.bind(this, function (_httpSession, message) {
						if (message.status_code == 200) {
							let json = JSON.parse(message.response_body.data);
							this._refreshUI(json);
						}
						else {
							state = { temp:"-/-", from:"Connection error..."}
							this._refreshUI(state);
						}
					}
				)
			);
		},

		_refreshUI: function (data) {
			// text in main header bar
			let txt = data.temp.toString();
			txt = txt + ' °C';
			this.buttonText.set_text(txt);


			// text that is shown as notification
			let from = data.from.toString();
			if (data.from.toString() == "Connection error...") {
				this.from = from;
			}
			else {
				this.from = 'Wert vom ' + from;
			}


			// weatherwarning as notification
			let wid = this.wid;
			let lastWidSent = this.lastWidSent;

			// get wid from JSON
			wid = data.wid.toString();
			this.wid = wid;

			let wtitle = data.wtitle.toString();
			let wcontent = data.wcontent.toString();

			if (wid !== "0") {
				if (wid !== lastWidSent) {
					Main.notify(wtitle, wcontent);
					this.lastWidSent = wid;
				}
			}

		},

		_removeTimeout: function () {
			if (this._timeout) {
				Mainloop.source_remove(this._timeout);
				this._timeout = null;
			}
		},

		stop: function () {
			if (_httpSession !== undefined)
				_httpSession.abort();
			_httpSession = undefined;

			if (this._timeout)
				Mainloop.source_remove(this._timeout);
			this._timeout = undefined;

			this.menu.removeAll();
		}

	}
);



function init() {
}

function enable() {
	goetMenu = new GoetempTemp;
	Main.panel.addToStatusArea('goetemp-temp', goetMenu);
}

function disable() {
	goetMenu.stop();
	goetMenu.destroy();
}
