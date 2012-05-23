var ew_VpcTreeView = {
    COLNAMES : [ 'vpc.id', 'vpc.cidr', 'vpc.state', 'vpc.dhcpoptions', 'vpc.tag' ],
    model: "vpcs",

    searchChanged : function(event)
    {
        this.search = $('ew.vpcs.search').value
        TreeView.searchChanged.call(this, event);
    },

    enableOrDisableItems : function()
    {
        document.getElementById("ew.vpcs.contextmenu").disabled = (this.getSelected() == null);
    },

    createSubnet : function()
    {
        var vpc = this.getSelectedImage();
        if (vpc == null) return;

        ew_SubnetTreeView.createSubnet(vpc.id);
    },

    createVpc : function()
    {
        var retVal = {
            ok : null,
            cidr : null,
            dhcpOptionsId : null
        }
        window.openDialog("chrome://ew/content/dialog_create_vpc.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);

        if (retVal.ok) {
            ew_session.showBusyCursor(true);
            var me = this;
            var wrap = function(id)
            {
                me.refresh(true);
                me.selectByImageId(id);
                ew_InternetGatewayTreeView.attachInternetGateway(id, null);
            }
            ew_session.controller.createVpc(retVal.cidr, wrap);
            ew_session.showBusyCursor(false);
        }
    },

    deleteVpc : function()
    {
        var vpc = this.getSelectedImage();
        if (vpc == null) return;

        var instances = ew_model.instances;
        for (var i = 0; i < instances.length; i++) {
            if (instances[i].vpcId == vpc.id && instances[i].state == "running") {
                alert("There is instance " + instances[i].id + "/" + instances[i].name + " still running in this VPC");
                return;
            }
        }

        var confirmed = confirm("Delete " + vpc.id + " (" + vpc.cidr + ")" + (vpc.tag == null ? '' : " [" + vpc.tag + "]") + "?");
        if (!confirmed) return;

        var me = this;
        var wrap = function(id)
        {
            me.refresh();
            me.selectByImageId(id);
        }
        ew_session.controller.deleteVpc(vpc.id, wrap);
    },

    setDhcpOptions : function()
    {
        var vpc = this.getSelectedImage();
        if (vpc == null) return;

        var retVal = {
            ok : null,
            vpcId : vpc.id,
            dhcpOptionsId : null
        };
        window.openDialog("chrome://ew/content/dialog_associate_dhcp_options.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);

        if (retVal.ok) {
            ew_session.showBusyCursor(true);
            var me = this;
            var wrap = function(id)
            {
                me.refresh();
                me.selectByImageId(id);
            }
            ew_session.controller.associateDhcpOptions(retVal.dhcpOptionsId, retVal.vpcId, wrap);
            ew_session.showBusyCursor(false);
        }
    },

    attachToVpnGateway : function()
    {
        var vpc = this.getSelectedImage();
        if (vpc == null) return;

        ew_VpnAttachmentTreeView.attachToVpc(vpc.id, null);
    },

    attachToInternetGateway : function()
    {
        var vpc = this.getSelectedImage();
        if (vpc == null) return;

        ew_InternetGatewayTreeView.attachInternetGateway(vpc.id, null);
    },
};
ew_VpcTreeView.__proto__ = TreeView;
ew_VpcTreeView.register();

