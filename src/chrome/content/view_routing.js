var ec2ui_RouteTablesTreeView = {
    COLNAMES : [ 'routeTable.id', 'routeTable.vpcId' ],
    model : "routeTables",
    vpcId : "",

    viewDetails : function(event)
    {
        var group = this.getSelected();
        if (group == null) return;
        window.openDialog("chrome://ec2ui/content/dialog_routetable_details.xul", null, "chrome,centerscreen,modal,resizable", group);
    },

    selectionChanged : function()
    {
        var table = this.getSelected()
        if (table == null) return

        var subnets = ec2ui_session.model.getSubnets();
        if (subnets) {
            for ( var i = 0; i < table.associations.length; i++) {
                for ( var j = 0; j < subnets.length; j++) {
                    if (table.associations[i].subnetId == subnets[j].id) {
                        table.associations[i].info = subnets[j].cidr + " (" + subnets[j].availableIp + ") " + subnets[j].availabilityZone;
                        break;
                    }
                }
            }
        }
        ec2ui_RoutesTreeView.display(table.routes);
        ec2ui_RouteAssociationsTreeView.display(table.associations);
    },

    createTable : function()
    {
        var vpcs = ec2ui_session.model.getVpcs();
        if (!vpcs) {
            alert("No VPCs available, try later")
            return;
        }
        var rc = ec2ui_session.promptList("Create Route Table", "Select VPC", vpcs);
        if (rc < 0) {
            return;
        }

        ec2ui_session.showBusyCursor(true);
        var me = this;
        var wrap = function()
        {
            me.refresh();
        }
        ec2ui_session.controller.createRouteTable(vpcs[rc].id, wrap);
        ec2ui_session.showBusyCursor(false);
    },

    deleteSelected : function()
    {
        var table = this.getSelected();
        if (!table || !confirm("Delete route table " + table.id + "?")) return;
        var me = this;
        var wrap = function()
        {
            me.refresh();
        }
        ec2ui_session.controller.deleteRouteTable(table.id, wrap);
    },

    display : function(list)
    {
        TreeView.display.call(this, list);
        this.updateVpcs();
    },

    filter : function(list)
    {
        var vpcId = ec2ui_RouteTablesTreeView.vpcId
        if (vpcId != "") {
            var rc = []
            for ( var i in list) {
                if (list[i].vpcId == vpcId) {
                    rc.push(list[i])
                }
            }
            return rc;
        }
        return list
    },

    updateVpcs : function()
    {
        var vpcMenu = document.getElementById("ec2ui.routing.vpcid");
        this.vpcId = vpcMenu.value;
        var vpcs = ec2ui_session.model.getVpcs();
        var selected = 0;
        vpcMenu.removeAllItems();
        vpcMenu.appendItem("No Filter", "")
        for ( var i in vpcs) {
            vpcMenu.appendItem(vpcs[i].id + " (" + vpcs[i].cidr + ")" + (vpcs[i].tag == null ? '' : " [" + vpcs[i].tag + "]"), vpcs[i].id)
            if (vpcs[i].id == this.vpcId) selected = i;
        }
        vpcMenu.selectedIndex = selected;
    },

    vpcIdSelected : function()
    {
        var vpcMenu = document.getElementById("ec2ui.routing.vpcid");
        this.vpcId = vpcMenu.value;
        if (this.vpcId == "") return;
        this.invalidate();
        ec2ui_InternetGatewayTreeView.invalidate();
    }
};
ec2ui_RouteTablesTreeView.__proto__ = TreeView;
ec2ui_RouteTablesTreeView.register();

var ec2ui_RoutesTreeView = {
    COLNAMES : [ "route.cidr", "route.gatewayId", "route.state" ],

    createRoute : function()
    {
        var table = ec2ui_RouteTablesTreeView.getSelected();
        if (!table) {
            alert("Please, select route table");
            return;
        }
        var gwList = []
        var gws = ec2ui_session.model.getInternetGateways();
        for ( var i in gws) {
            if (gws[i].vpcs.indexOf(table.vpcId) > -1) {
                gwList.push({
                    text : gws[i].toStr(),
                    id : gws[i].id
                });
            }
        }
        if (gwList.length == 0) {
            alert("VPC " + table.vpcId + " does not have Internet Gateways")
            return;
        }

        var retVal = {
            ok : null,
            cidr : null,
            gatewayId : null,
            gws : gwList
        }
        window.openDialog("chrome://ec2ui/content/dialog_create_route.xul", null, "chrome,centerscreen,modal,resizable", ec2ui_session, retVal);
        if (retVal.ok) {
            ec2ui_session.showBusyCursor(true);
            var me = this;
            var wrap = function(id)
            {
                ec2ui_RouteTablesTreeView.refresh(true);
                ec2ui_RouteTablesTreeView.select({ id: table.id })
            }
            ec2ui_session.controller.createRoute(table.id, retVal.cidr, retVal.gatewayId, wrap);
            ec2ui_session.showBusyCursor(false);
        }
    },

    deleteRoute : function()
    {
        var item = this.getSelected();
        if (!item || !confirm("Delete route  " + item.cidr + "?")) return;
        var me = this;
        var wrap = function()
        {
            ec2ui_RouteTablesTreeView.refresh();
            ec2ui_RouteTablesTreeView.select({ id: item.tableId })
        }
        ec2ui_session.controller.deleteRoute(item.tableId, item.cidr, wrap);
    }
};
ec2ui_RoutesTreeView.__proto__ = TreeView;

var ec2ui_RouteAssociationsTreeView = {
    COLNAMES : [ "assoc.id", "assoc.subnetId", "assoc.info" ],

    createAssociation : function()
    {
        var table = ec2ui_RouteTablesTreeView.getSelected();
        if (!table) {
            alert("Please, select route table");
            return;
        }
        var subnets = ec2ui_session.model.getSubnets();
        if (!subnets) {
            alert("No subnets available, try later")
            return;
        }
        var rc = ec2ui_session.promptList("Create Route", "Select subnet", subnets, [ "id", "vpcId", "cidr" ]);
        if (rc < 0) {
            return;
        }
        var me = this;
        var wrap = function()
        {
            ec2ui_RouteTablesTreeView.refresh();
            ec2ui_RouteTablesTreeView.select({ id: table.id} )
        }
        ec2ui_session.controller.AssociateRouteTable(table.id, subnets[rc].id, wrap);
    },

    deleteAssociation : function()
    {
        var item = this.getSelected();
        if (!item || !confirm("Delete route association " + item.id + ":" + item.subnetId + "?")) return;
        var me = this;
        var wrap = function()
        {
            ec2ui_RouteTablesTreeView.refresh();
            ec2ui_RouteTablesTreeView.select({ id:item.tableId })
        }
        ec2ui_session.controller.DisassociateRouteTable(item.id, wrap);
    }
};
ec2ui_RouteAssociationsTreeView.__proto__ = TreeView;

var ec2ui_InternetGatewayTreeView = {
    COLNAMES : [ 'igw.id', "igw.vpcs", "igw.tags" ],
    model : "internetGateways",

    filter : function(list)
    {
        var vpcId = ec2ui_RouteTablesTreeView.vpcId
        if (vpcId != "") {
            var rc = []
            for ( var i in list) {
                if (list[i].vpcs.indexOf(vpcId) > -1) {
                    rc.push(list[i])
                }
            }
            return rc;
        }
        return list
    },

    createInternetGateway : function()
    {
        var me = this;
        var wrap = function(id)
        {
            me.refresh()
        }
        ec2ui_session.controller.createInternetGateway(wrap);
    },

    deleteInternetGateway : function()
    {
        var igw = this.getSelected();
        if (igw == null) return;
        if (!ec2ui_session.promptYesNo("Confirm", "Delete Internet Gateway " + igw.id + "?")) return;

        var me = this;
        var wrap = function()
        {
            me.refresh();
        }
        ec2ui_session.controller.deleteInternetGateway(igw.id, wrap);
    },

    attachInternetGateway : function(vpcid, igwid)
    {
        var igw = this.getSelected()
        if (!igwid) igwid = igw ? igw.id : null
        var retVal = {
            ok : null,
            igwnew : 0,
            igwid : igwid,
            vpcid : vpcid
        }
        window.openDialog("chrome://ec2ui/content/dialog_attach_internet_gateway.xul", null, "chrome,centerscreen,modal,resizable", ec2ui_session, retVal);
        if (retVal.ok) {
            ec2ui_session.showBusyCursor(true);
            var me = this;
            var wrap = function(id)
            {
                me.refresh();
            }
            if (retVal.igwnew) {
                var wrap2 = function(id)
                {
                    ec2ui_session.controller.attachInternetGateway(id, retVal.vpcid, wrap);
                }
                ec2ui_session.controller.createInternetGateway(wrap2);
            } else {
                ec2ui_session.controller.attachInternetGateway(retVal.igwid, retVal.vpcid, wrap);
            }
            ec2ui_session.showBusyCursor(false);
        }
    },

    detachInternetGateway : function()
    {
        var igw = this.getSelected();
        if (igw == null) return;
        if (!ec2ui_session.promptYesNo("Confirm", "Detach Internet Gateway " + igw.id + " from " + igw.vpcs + "?")) return;
        var me = this;
        var wrap = function(id)
        {
            me.refresh();
        }
        for ( var i = 0; i < igw.vpcs.length; i++) {
            ec2ui_session.controller.detachInternetGateway(igw.id, igw.vpcs[i], wrap);
        }
        ec2ui_session.showBusyCursor(false);
    }

};
ec2ui_InternetGatewayTreeView.__proto__ = TreeView;
ec2ui_InternetGatewayTreeView.register();
