var ew_VpnGatewayTreeView = {
    COLNAMES:
    ['vpnGateway.id', 'vpnGateway.availabilityZone',
     'vpnGateway.state', 'vpnGateway.type', 'vpnGateway.tag'],

    imageIdRegex : new RegExp("^vgw-"),

    getSearchText : function() {
        return document.getElementById('ew.vpngateways.search').value;
    },

    refresh : function() {
        
        ew_session.controller.describeVpnGateways();
        // For the attachment call
        ew_session.controller.describeVpcs();
        
    },

    invalidate : function() {
        var target = ew_VpnGatewayTreeView;
        target.displayImages(target.filterImages(ew_model.vpnGateways));
        ew_VpnAttachmentTreeView.invalidate();
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
            ew_model.registerInterest(this, 'vpnGateways');
        }
    },

    displayImages : function (imageList) {
        BaseImagesView.displayImages.call(this, imageList);
    },

    enableOrDisableItems : function() {
        var image = this.getSelectedImage();
        document.getElementById("ew.vpngateways.contextmenu").disabled = (image == null);
    },

    selectionChanged : function(event) {
        // preserve the id of the selected image
        // so we can reselect it later on
        var selected = this.getSelectedImage();
        if (selected) {
            this.selectedImageId = selected.id;
        }
        ew_VpnAttachmentTreeView.invalidate();
    },

    createVpnGateway : function () {
        var retVal = {ok:null,type:null, az:null}
        window.openDialog("chrome://ew/content/dialog_create_vpn_gateway.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);

        if (retVal.ok) {
            
            var me = this;
            var wrap = function(id) {
                me.refresh();
                me.selectByImageId(id);
            }
            ew_session.controller.createVpnGateway(
                retVal.type,
                retVal.az,
                wrap
            );

            
        }
    },

    deleteVpnGateway : function () {
        var vgw = this.getSelectedImage();
        if (vgw == null) return;

        var confirmed = confirm("Delete " + vgw.id + (vgw.tag == null ? '' : " [" + vgw.tag + "]") + "?");
        if (!confirmed) return;

        var me = this;
        var wrap = function(id) {
            me.refresh();
            me.selectByImageId(id);
        }
        ew_session.controller.deleteVpnGateway(vgw.id, wrap);
    },

    createVpnConnection : function() {
        var vgw = this.getSelectedImage();
        if (vgw == null) return;

        ew_VpnConnectionTreeView.createVpnConnection(null, vgw.id);
    },

    attachToVpc : function() {
        var vgw = this.getSelectedImage();
        if (vgw == null) return;

        ew_VpnAttachmentTreeView.attachToVpc(null, vgw.id);
    },
};

// poor-man's inheritance
ew_VpnGatewayTreeView.__proto__ = BaseImagesView;

ew_VpnGatewayTreeView.register();
