var ew_NetworkInterfacesTreeView = {
    COLNAMES : [ 'eni.id', 'eni.status', 'eni.descr', 'eni.subnetId', 'eni.vpcId', 'eni.macAddress', 'eni.privateIpAddress', 'eni.sourceDestCheck', 'eni.groups', 'eni.attachment', 'eni.association' ],
    model : [ "networkInterfaces", "vpcs", "subnets", "securityGroups", "instances" ],

    selectionChanged: function(event)
    {
        var eni = this.getSelected()
        if (eni == null) return
    },

    viewDetails : function(event)
    {
        var item = this.getSelected();
        if (item == null) return;
        //window.openDialog("chrome://ew/content/dialogs/details_eni.xul", null, "chrome,centerscreen,modal,resizable", item);
    },

    createInterface : function()
    {
        var rc = {ok:false};
        openDialog('chrome://ew/content/dialogs/create_eni.xul',null,'chrome,centerscreen,modal,resizable', ew_session, rc);
        if (rc.ok) {
            var me = this;
            ew_session.controller.createNetworkInterface(rc.subnetId, rc.ip, rc.descr, rc.groups, function() { me.refresh(); });
        }
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
        var rc = {ok:false};
        openDialog('chrome://ew/content/dialogs/attach_eni.xul',null,'chrome,centerscreen,modal,resizable', ew_session, eni, rc);
        if (rc.ok) {
            var me = this;
            ew_session.controller.attachNetworkInterface(eni.id, rc.instanceId, rc.deviceIndex, function() { me.refresh();});
        }
    },

    detachNetworkInterface : function(force) {
        var eni = this.getSelected();
        if (!eni) return;

        if (!eni.attachment) {
            alert("Interface is not attached");
            return;
        }

        var instance = ew_model.getInstanceById(eni.attachment.instanceId);
        if (!instance) {
            alert('Could not find attached instance');
            return;
        }
        if (force) {
            if (!confirm("Force detach interface " + eni.id + " (" + eni.descr + ") from " + instance.toString() +  "?")) return;
        } else {
            if (!confirm("Detach interface " + eni.id + " (" + eni.descr + ") from " + instance.toString() +  "?")) return;
        }
        var me = this;
        ew_session.controller.detachNetworkInterface(eni.attachment.id, force, function() { me.refresh(); });
    },

};
ew_NetworkInterfacesTreeView.__proto__ = TreeView;
ew_NetworkInterfacesTreeView.register();

