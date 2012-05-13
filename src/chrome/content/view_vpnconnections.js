var ew_VpnConnectionTreeView = {
    COLNAMES:
    ['vpnConnection.id', 'vpnConnection.vgwId',
     'vpnConnection.cgwId', 'vpnConnection.type',
     'vpnConnection.state', 'vpnConnection.tag'],

    imageIdRegex : new RegExp("^vpn-"),



    getSearchText : function() {
        return document.getElementById('ew.vpnconnections.search').value;
    },

    refresh : function() {
        ew_session.showBusyCursor(true);
        ew_session.controller.describeVpnConnections();
        ew_session.showBusyCursor(false);
    },

    invalidate : function() {
        var target = ew_VpnConnectionTreeView;
        target.displayImages(target.filterImages(ew_model.vpnConnections));
    },

    searchChanged : function(event) {
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }

        this.searchTimer = setTimeout(this.invalidate, 500);
    },

    register : function() {
        if (!this.registered) {
            this.registered = true;
            ew_model.registerInterest(this, 'vpnConnections');
        }
    },

    displayImages : function (imageList) {
        BaseImagesView.displayImages.call(this, imageList);
    },

    enableOrDisableItems : function() {
        var image = this.getSelectedImage();
        document.getElementById("ew.vpnconnections.contextmenu").disabled = (image == null);
    },

    saveConnectionConfiguration : function (name, config) {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        var fWin = isWindows(navigator.platform);
        fp.init(window, "Save VPN Connection Configuration", nsIFilePicker.modeSave);
        if (fWin) {
            fp.appendFilter("Text Documents","*.txt");
            fp.defaultString = name+".txt";
        } else {
            fp.defaultString = name;
        }
        fp.appendFilters(nsIFilePicker.filterAll);
        //fp.displayDirectory(nsILocalFile instance);

        var res = fp.show();
        if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace ){
            var configFile = fp.file;
            if (configFile.exists() == false) {
                configFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0644);
            }

            var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream );
            // Open the file for read+write (04), creating it if necessary (08), and truncating it if it exists (20)
            config += "\n";
            outputStream.init( configFile, 0x04 | 0x08 | 0x20, 0600, 0 );
            if (fWin) {
                config = config.replace(/\n/g, "\r\n");
            }
            outputStream.write( config, config.length );
            outputStream.close();
        }

        this.refresh();
    },

    getCustomerConfig : function() {
        var retVal = {ok:null, cgwtype:null}

        var vpn = this.getSelectedImage();
        if (vpn == null) return;
        if (vpn.config == null) {
           alert("The Customer Gateway configuration for this VPN Connection is not present.")
           return;
        }

        window.openDialog("chrome://ew/content/dialog_vpn_connection_config.xul",
                          null,
                          "chrome,centerscreen,modal,resizable",
                          ew_session,
                          retVal,
                          ew_client);

        configXml = new DOMParser().parseFromString(vpn.config, "text/xml");

        if (retVal.ok) {
            ew_session.showBusyCursor(true);
            var filename = retVal.cgwtype;
            var xsl = ew_client.queryVpnConnectionStylesheets(filename);
            log ("Received XSL: "+xsl.xmlhttp.responseText);
            log ("Received XSL (XML): "+xsl.xmlhttp.xmlDoc);
            log ("VPN Config: "+vpn.config);
            log ("VPN Config length: "+vpn.config.length);

            // Convert via XSLT
            try {
                var proc = new XSLTProcessor;
                proc.importStylesheet(xsl.xmlDoc);
                var resultXml = proc.transformToDocument(configXml);
                var result = getNodeValueByName(resultXml, "transformiix:result");
                log ("Converted to config: "+result);
            } catch (e) {
                alert("Exception while processing XSLT: "+e)
            }

            // Display dialog box to save
            this.saveConnectionConfiguration(vpn.id, result);

            ew_session.showBusyCursor(false);
        }
    },

    createVpnConnection : function(cgwid, vgwid) {
        var retVal = {ok:null, vgwid: vgwid, cgwid: cgwid, type:null}
        window.openDialog("chrome://ew/content/dialog_create_vpn_connection.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);

        if (retVal.ok) {
            ew_session.showBusyCursor(true);
            var me = this;
            var wrap = function(id) {
                me.refresh();
                me.selectByImageId(id);
            }
            ew_session.controller.createVpnConnection(
                retVal.type,
                retVal.cgwid,
                retVal.vgwid,
                wrap
            );

            ew_session.showBusyCursor(false);
        }
    },

    deleteVpnConnection : function () {
        var vpn = this.getSelectedImage();
        if (vpn == null) return;

        var confirmed = confirm("Delete " + vpn.id + (vpn.tag == null ? '' :" [" + vpn.tag + "]") + "?");
        if (!confirmed) return;

        var me = this;
        var wrap = function(id) {
            me.refresh();
            me.selectByImageId(id);
        }
        ew_session.controller.deleteVpnConnection(vpn.id, wrap);
    },
};

// poor-man's inheritance
ew_VpnConnectionTreeView.__proto__ = BaseImagesView;

ew_VpnConnectionTreeView.register();
