var ew_VpnAttachmentTreeView = {
    COLNAMES : [ 'vpnAttachment.vgwId', 'vpnAttachment.vpcId', 'vpnAttachment.state' ],

    invalidate : function()
    {
        var target = ew_VpnAttachmentTreeView;
        var vgw = ew_VpnGatewayTreeView.getSelectedImage();
        var attachments = null;
        if (vgw != null) {
            attachments = vgw.attachments;
        }

        target.displayImages(attachments);
    },

    searchChanged : function(event)
    {
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }

        this.searchTimer = setTimeout(this.invalidate, 500);
    },

    register : function()
    {
        if (!this.registered) {
            this.registered = true;
            // ew_model.registerInterest(this, 'vpnGateways');
        }
    },

    refresh : function()
    {
        ew_VpnGatewayTreeView.refresh();
    },

    displayImages : function(imageList)
    {
        BaseImagesView.displayImages.call(this, imageList);
    },

    enableOrDisableItems : function()
    {
        var image = this.getSelectedImage();
        document.getElementById("ew.vpnattachments.contextmenu").disabled = (image == null);
    },

    deleteVpnAttachment : function()
    {
        var att = this.getSelectedImage();
        if (att == null) return;

        var confirmed = confirm("Delete attachment of " + att.vgwId + " to " + att.vpcId + "?");
        if (!confirmed) return;

        var me = this;
        var wrap = function(id)
        {
            me.refresh();
            me.selectByImageId(id);
        }
        ew_session.controller.detachVpnGatewayFromVpc(att.vgwId, att.vpcId, wrap);
    },

    attachToVpc : function(vpcid, vgwid)
    {
        var retVal = {
            ok : null,
            vgwid : vgwid,
            vpcid : vpcid
        }
        window.openDialog("chrome://ew/content/dialog_attach_vpn_gateway.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);

        if (retVal.ok) {
            ew_session.showBusyCursor(true);
            var me = this;
            var wrap = function(id)
            {
                me.refresh();
                me.selectByImageId(id);
            }
            ew_session.controller.attachVpnGatewayToVpc(retVal.vgwid, retVal.vpcid, wrap);

            ew_session.showBusyCursor(false);
        }
    },
};

// poor-man's inheritance
ew_VpnAttachmentTreeView.__proto__ = BaseImagesView;

ew_VpnAttachmentTreeView.register();
