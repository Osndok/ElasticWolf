var ew_CustomerGatewayTreeView = {
    COLNAMES:
    ['customerGateway.id', 'customerGateway.ipAddress',
     'customerGateway.bgpAsn', 'customerGateway.state',
     'customerGateway.type', 'customerGateway.tag'],

    imageIdRegex : new RegExp("^cgw-"),

    getSearchText : function() {
        return document.getElementById('ew.customergateways.search').value;
    },

    refresh : function() {
        ew_session.showBusyCursor(true);
        ew_session.controller.describeCustomerGateways();
        ew_session.showBusyCursor(false);
    },

    invalidate : function() {
        var target = ew_CustomerGatewayTreeView;
        target.displayImages(target.filterImages(ew_model.customerGateways));
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
            ew_model.registerInterest(this, 'customerGateways');
        }
    },

    displayImages : function (imageList) {
        BaseImagesView.displayImages.call(this, imageList);
    },

    enableOrDisableItems : function() {
        var image = this.getSelectedImage();
        document.getElementById("ew.customergateways.contextmenu").disabled = (image == null);
    },

    createCustomerGateway : function () {
        var retVal = {ok:null,type:null, ipaddress:null, bgpasn:null}
        window.openDialog("chrome://ew/content/dialog_create_customer_gateway.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);

        if (retVal.ok) {
            ew_session.showBusyCursor(true);
            var me = this;
            var wrap = function(id) {
                me.refresh();
                me.selectByImageId(id);
            }
            ew_session.controller.createCustomerGateway(
                retVal.type,
                retVal.ipaddress,
                retVal.bgpasn,
                wrap
            );

            ew_session.showBusyCursor(false);
        }
    },

    deleteCustomerGateway : function () {
        var cgw = this.getSelectedImage();
        if (cgw == null) return;

        var confirmed = confirm("Delete " + cgw.id + " (" + cgw.ipAddress + ")" + (cgw.tag == null ? '' : " [" + cgw.tag + "]") + "?");
        if (!confirmed) return;

        var me = this;
        var wrap = function(id) {
            me.refresh();
            me.selectByImageId(id);
        }
        ew_session.controller.deleteCustomerGateway(cgw.id, wrap);
    },

    createVpnConnection : function() {
        var cgw = this.getSelectedImage();
        if (cgw == null) return;

        ew_VpnConnectionTreeView.createVpnConnection(cgw.id, null);
    },
};

// poor-man's inheritance
ew_CustomerGatewayTreeView.__proto__ = BaseImagesView;

ew_CustomerGatewayTreeView.register();
