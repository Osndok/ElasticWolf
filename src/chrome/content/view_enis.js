var ew_NetworkInterfacesTreeView = {
    COLNAMES : [ 'eni.id', 'eni.status', 'eni.descr', 'eni.subnetId', 'eni.vpcId', 'acl.macAddress', 'eni.privateIpAddress', 'eni.sourceDestCheck' ],
    model : "networkInterfaces",

    display : function(list)
    {
        for (var i in list) {
            var subnet = ew_model.getSubnetById(list[i].subnetId)
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

        ew_NetworkInterfaceAttachmentsTreeView.display(eni.instances);
    },

    viewDetails : function(event)
    {
        var item = this.getSelected();
        if (item == null) return;
        window.openDialog("chrome://ew/content/dialog_eni_details.xul", null, "chrome,centerscreen,modal,resizable", item);
    },

    createInterface : function()
    {
        var subnets = ew_session.model.getSubnets();
        if (!subnets) {
            alert("No subnets available, try later")
            return;
        }
        var rc = ew_session.promptList("Create Network Interface", "Select Subnet", subnets, ['id', 'vpcId', 'cidr' ]);
        if (rc < 0) {
            return;
        }

        
        var me = this;
        ew_session.controller.createNetworkInterface(subnets[rc].id, function() { me.refresh(); });
        
    },

    deleteInterface : function()
    {
        var eni = this.getSelected();
        if (!eni || !confirm("Delete Network Interface " + eni.id + "?")) return;
        var me = this;
        ew_session.controller.deleteNetworkInterface(eni.id, function() { me.refresh(); });
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
ew_NetworkInterfacesTreeView.__proto__ = TreeView;
ew_NetworkInterfacesTreeView.register();

var ew_NetworkInterfaceAttachmentsTreeView = {
   COLNAMES : [ "att.id", "att.instanceId", "att.descr" ],

};
ew_NetworkInterfaceAttachmentsTreeView.__proto__ = TreeView;

