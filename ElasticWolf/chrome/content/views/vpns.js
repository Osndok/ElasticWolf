var ew_VpnConnectionTreeView = {
    COLNAMES: ['vpnConnection.id', 'vpnConnection.vgwId', 'vpnConnection.cgwId', 'vpnConnection.type', 'vpnConnection.state', 'vpnConnection.tag'],
    model: ['vpnConnections','customerGateways','vpnGateways','vpcs'],
    searchElement: 'ew.vpnconnections.search',

    enableOrDisableItems : function() {
        var image = this.getSelected();
        $("ew.vpnconnections.contextmenu").disabled = (image == null);
    },

    saveConnectionConfiguration : function (name, config) {
        var file = ew_session.promptForFile("Save VPN Connection Configuration", true, name + ".txt");
        if (file) {
            FileIO.write(FileIO.open(file), config);
        }
    },

    getCustomerConfig : function() {
        var vpn = this.getSelected();
        if (vpn == null) return;
        if (vpn.config == null) {
           alert("The Customer Gateway configuration for this VPN Connection is not present.")
           return;
        }

        var devices = [];
        var opts = ew_client.queryVpnConnectionStylesheets(null);
        var formats = opts.xmlDoc.evaluate("/CustomerGatewayConfigFormats/Format", opts.xmlDoc, ew_client.getNsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (var i = 0; i < formats.snapshotLength; i++) {
            var platform = getNodeValueByName(formats.snapshotItem(i), "Platform");
            var filename = getNodeValueByName(formats.snapshotItem(i), "Filename");
            var vendor = getNodeValueByName(formats.snapshotItem(i), "Vendor");
            var software = getNodeValueByName(formats.snapshotItem(i), "Software");
            devices.push({ title: vendor + " " + platform + " [" + software + "]", filename: filename });
        }

        var idx = ew_session.promptList("Customer Gateway configuration", "Select device type:", devices, ['title']);
        if (idx >= 0) {
            configXml = new DOMParser().parseFromString(vpn.config, "text/xml");
            var xsl = ew_client.queryVpnConnectionStylesheets(devices[idx].filename);
            try {
                var proc = new XSLTProcessor;
                proc.importStylesheet(xsl.xmlDoc);
                var resultXml = proc.transformToDocument(configXml);
                var result = getNodeValueByName(resultXml, "transformiix:result");
                this.saveConnectionConfiguration(vpn.id, result);
            } catch (e) {
                alert("Exception while processing XSLT: "+e)
            }
        }
    },

    createVpnConnection : function(cgwid, vgwid) {
        var retVal = {ok:null, vgwid: vgwid, cgwid: cgwid, type:null}
        window.openDialog("chrome://ew/content/dialogs/create_vpn_connection.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);
        if (retVal.ok) {
            var me = this;
            ew_session.controller.createVpnConnection(retVal.type, retVal.cgwid, retVal.vgwid, function() { me.refresh();});
        }
    },

    deleteVpnConnection : function () {
        var vpn = this.getSelected();
        if (vpn == null) return;

        var confirmed = confirm("Delete " + vpn.id + (vpn.tag == null ? '' :" [" + vpn.tag + "]") + "?");
        if (!confirmed) return;

        var me = this;
        ew_session.controller.deleteVpnConnection(vpn.id, function() { me.refresh()});
    },
};

ew_VpnConnectionTreeView.__proto__ = TreeView;
ew_VpnConnectionTreeView.register();

var ew_CustomerGatewayTreeView = {
    COLNAMES: ['customerGateway.id', 'customerGateway.ipAddress', 'customerGateway.bgpAsn', 'customerGateway.state', 'customerGateway.type', 'customerGateway.tag'],
    model: 'customerGateways',
    searchElement: 'ew.customergateways.search',

    enableOrDisableItems : function() {
        var image = this.getSelected();
        document.getElementById("ew.customergateways.contextmenu").disabled = (image == null);
    },

    createCustomerGateway : function () {
        var retVal = {ok:null,type:null, ipaddress:null, bgpasn:null}
        window.openDialog("chrome://ew/content/dialogs/create_customer_gateway.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);
        if (retVal.ok) {
            var me = this;
            ew_session.controller.createCustomerGateway(retVal.type, retVal.ipaddress, retVal.bgpasn, function(id) { me.refresh(); });
        }
    },

    deleteCustomerGateway : function () {
        var cgw = this.getSelected();
        if (cgw == null) return;

        var confirmed = confirm("Delete " + cgw.id + " (" + cgw.ipAddress + ")" + (cgw.tag == null ? '' : " [" + cgw.tag + "]") + "?");
        if (!confirmed) return;

        var me = this;
        ew_session.controller.deleteCustomerGateway(cgw.id, function(id) { me.refresh(); });
    },

    createVpnConnection : function() {
        var cgw = this.getSelected();
        if (cgw == null) return;

        ew_VpnConnectionTreeView.createVpnConnection(cgw.id, null);
        ew_session.selectTab('ew.tabs.vpn')
    },
};

ew_CustomerGatewayTreeView.__proto__ = TreeView;
ew_CustomerGatewayTreeView.register();

var ew_VpnGatewayTreeView = {
    COLNAMES: ['vpnGateway.id', 'vpnGateway.availabilityZone', 'vpnGateway.state', 'vpnGateway.type', 'vpnGateway.tag'],
    model: ['vpnGateways', 'vpcs'],
    searchElement: 'ew.vpngateways.search',

    enableOrDisableItems : function() {
        var image = this.getSelected();
        $("ew.vpngateways.contextmenu").disabled = (image == null);
    },

    selectionChanged : function(event) {
        var list = [];
        var vgw = this.getSelected();
        ew_VpnAttachmentTreeView.display(vgw ? vgw.attachments : []);
    },

    createVpnGateway : function () {
        var retVal = {ok:null,type:null, az:null}
        window.openDialog("chrome://ew/content/dialogs/create_vpn_gateway.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);

        if (retVal.ok) {
            var me = this;
            ew_session.controller.createVpnGateway(retVal.type, retVal.az, function() {me.refresh()});
        }
    },

    deleteVpnGateway : function () {
        var vgw = this.getSelected();
        if (vgw == null) return;

        var confirmed = confirm("Delete " + vgw.id + (vgw.tag == null ? '' : " [" + vgw.tag + "]") + "?");
        if (!confirmed) return;

        var me = this;
        ew_session.controller.deleteVpnGateway(vgw.id, function() { me.refresh() });
    },

    createVpnConnection : function() {
        var vgw = this.getSelected();
        if (vgw == null) return;

        ew_VpnConnectionTreeView.createVpnConnection(null, vgw.id);
    },

    attachToVpc : function() {
        var vgw = this.getSelected();
        if (vgw == null) return;

        ew_VpnAttachmentTreeView.attachToVpc(null, vgw.id);
    },
};

ew_VpnGatewayTreeView.__proto__ = TreeView;
ew_VpnGatewayTreeView.register();

var ew_VpnAttachmentTreeView = {
    COLNAMES : [ 'vpnAttachment.vgwId', 'vpnAttachment.vpcId', 'vpnAttachment.state' ],

    enableOrDisableItems : function()
    {
        var image = this.getSelected();
        $("ew.vpnattachments.contextmenu").disabled = (image == null);
    },

    deleteVpnAttachment : function()
    {
        var att = this.getSelected();
        if (att == null) return;

        var confirmed = confirm("Delete attachment of " + att.vgwId + " to " + att.vpcId + "?");
        if (!confirmed) return;

        var me = this;
        ew_session.controller.detachVpnGatewayFromVpc(att.vgwId, att.vpcId, function() { me.refresh() });
    },

    attachToVpc : function(vpcid, vgwid)
    {
        var retVal = { ok : null, vgwid : vgwid, vpcid : vpcid }
        window.openDialog("chrome://ew/content/dialogs/attach_vpn_gateway.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);
        if (retVal.ok) {
            var me = this;
            ew_session.controller.attachVpnGatewayToVpc(retVal.vgwid, retVal.vpcid, function() { me.refresh() });
        }
    },
};

ew_VpnAttachmentTreeView.__proto__ = TreeView;
ew_VpnAttachmentTreeView.register();
