var ec2ui_NetworkInterfacesTreeView = {
    COLNAMES : [ 'eni.id', 'eni.status', 'eni.descr', 'eni.subnetId', 'eni.vpcId', 'acl.macAddress', 'eni.privateIpAddress', 'eni.sourceDestCheck' ],
    model : "networkInterfaces",

    display : function(list)
    {
        for (var i in list) {
            var subnet = ec2ui_model.getSubnetById(list[i].subnetId)
            if (subnet) {
                list[i].subnetId += "/" + subnet.cidr
            }
        }
        TreeView.display.call(this, list);
    },

    selectionChanged: function(event)
    {
        var eni = this.getSelected()
        if (eni == null) return

        ec2ui_NetworkInterfaceAttachmentsTreeView.display(eni.instances);
    },

    viewDetails : function(event)
    {
        var item = this.getSelected();
        if (item == null) return;
        window.openDialog("chrome://ec2ui/content/dialog_eni_details.xul", null, "chrome,centerscreen,modal,resizable", item);
    },

    createInterface : function()
    {
        var subnets = ec2ui_session.model.getSubnets();
        if (!subnets) {
            alert("No subnets available, try later")
            return;
        }
        var rc = ec2ui_session.promptList("Create Network Interface", "Select Subnet", subnets);
        if (rc < 0) {
            return;
        }

        ec2ui_session.showBusyCursor(true);
        var me = this;
        ec2ui_session.controller.createNetworkInterface(subnets[rc].id, function() { me.refresh(); });
        ec2ui_session.showBusyCursor(false);
    },

    deleteInterface : function()
    {
        var eni = this.getSelected();
        if (!eni || !confirm("Delete Network Interface " + eni.id + "?")) return;
        var me = this;
        ec2ui_session.controller.deleteNetworkInterface(eni.id, function() { me.refresh(); });
    },

    attachInterface : function()
    {
        var eni = this.getSelected();
        if (!eni) {
            alert("Please, select ENI");
            return;
        }
    },
};
ec2ui_NetworkInterfacesTreeView.__proto__ = TreeView;
ec2ui_NetworkInterfacesTreeView.register();

var ec2ui_NetworkInterfaceAttachmentsTreeView = {
   COLNAMES : [ "att.id", "att.instanceId", "att.descr" ],

};
ec2ui_NetworkInterfaceAttachmentsTreeView.__proto__ = TreeView;

