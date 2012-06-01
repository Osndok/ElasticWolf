var ew_VpcTreeView = {
    COLNAMES : [ 'vpc.id', 'vpc.cidr', 'vpc.state', 'vpc.dhcpoptions', 'vpc.tag' ],
    model: [ "vpcs", "instances", "internetGateways" ],
    searchElement: 'ew.vpcs.search',

    enableOrDisableItems : function()
    {
        document.getElementById("ew.vpcs.contextmenu").disabled = (this.getSelected() == null);
    },

    createSubnet : function()
    {
        var vpc = this.getSelected();
        if (vpc == null) return;

        ew_SubnetsTreeView.createSubnet(vpc.id);
    },

    createVpc : function()
    {
        var retVal = { ok : null, cidr : null, dhcpOptionsId : null }
        window.openDialog("chrome://ew/content/dialogs/create_vpc.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);

        if (retVal.ok) {
            var me = this;
            ew_session.controller.createVpc(retVal.cidr, function() { me.refresh();});
        }
    },

    deleteVpc : function()
    {
        var vpc = this.getSelected();
        if (vpc == null) return;

        var instances = ew_model.getInstances('vpcId', vpc.id, 'state', 'running');
        if (instances.length) {
            alert("There is instance " + instances[0].toString() + " in this VPC");
            return;
        }

        var subnets = ew_model.getSubnets();
        for (var i in subnets) {
            if (subnets[i].vpcId == vpc.id) {
                var instances = ew_model.getInstances('subnetId', subnets[i].id, 'state', 'running');
                if (instances.length) {
                    alert("There is instance " + instances[0].toString() + " in subnet " + subnets[i].toString());
                    return;
                }
            }
        }

        if (!confirm("Delete " + vpc.toString() + "?")) return;

        var me = this;
        ew_session.controller.deleteVpc(vpc.id, function() { me.refresh()});
    },

    setDhcpOptions : function()
    {
        var vpc = this.getSelected();
        if (vpc == null) return;

        var retVal = { ok : null, vpcId : vpc.id, dhcpOptionsId : null};
        window.openDialog("chrome://ew/content/dialogs/associate_dhcp_options.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);
        if (retVal.ok) {
            var me = this;
            ew_session.controller.associateDhcpOptions(retVal.dhcpOptionsId, retVal.vpcId, function() { me.refresh() });
        }
    },

    attachToVpnGateway : function()
    {
        var vpc = this.getSelected();
        if (vpc == null) return;

        ew_VpnAttachmentTreeView.attachToVpc(vpc.id, null);
    },

    attachToInternetGateway : function()
    {
        var vpc = this.getSelected();
        if (vpc == null) return;

        ew_InternetGatewayTreeView.attachInternetGateway(vpc.id, null);
    },
};
ew_VpcTreeView.__proto__ = TreeView;
ew_VpcTreeView.register();

