var ec2ui_RouteTablesTreeView = {
    COLNAMES : ['routeTable.id', 'routeTable.vpcId'],
    treeBox : null,
    selection : null,
    tableList : new Array(),
    registered : false,

    get rowCount() { return this.tableList.length; },
    setTree     : function(treeBox)     { this.treeBox = treeBox; },
    getCellText : function(idx, column) {
        if (idx >= this.rowCount) return "";
        var member = column.id.split(".").pop();
        return this.tableList[idx][member];
    },
    isEditable: function(idx, column)  { return true; },
    isContainer: function(idx)         { return false;},
    isSeparator: function(idx)         { return false; },
    isSorted: function()               { return false; },
    getImageSrc: function(idx, column) { return ""; },
    getProgressMode : function(idx,column) {},
    getCellValue: function(idx, column) {},
    cycleHeader: function(col) {
        var sel = this.getSelected();
        cycleHeader(col,document,this.COLNAMES,this.tableList);
        this.selectionChanged();
        this.treeBox.invalidate();
        if (sel) {
            this.selectById(sel.name);
        } else {
            log("The selected group is null!");
        }
    },

    viewDetails : function(event) {
        var group = this.getSelected();
        if (group == null) return;
        window.openDialog("chrome://ec2ui/content/dialog_routetable_details.xul", null, "chrome,centerscreen,modal,resizable", group);
    },

    sort : function() {
        var sel = this.getSelected();
        sortView(document, this.COLNAMES, this.tableList);
        if (sel) this.selectById(sel.name);
    },

    cycleCell: function(idx, column) {},
    performAction: function(action) {},
    performActionOnCell: function(action, index, column) {},
    getRowProperties: function(idx, column, prop) {},
    getCellProperties: function(idx, column, prop) {},
    getColumnProperties: function(column, element, prop) {},
    getLevel : function(idx) { return 0; },

    selectById : function(id) {
        this.selection.clearSelection();
        for(var i in this.tableList) {
            if (this.tableList[i].id == id) {
                this.selection.select(i);
                this.treeBox.ensureRowIsVisible(i);
                return;
            }
        }

        // In case we don't find a match (which is probably a bug).
        this.selection.select(0);
    },

    register: function() {
        if (!this.registered) {
            this.registered = true;
            ec2ui_model.registerInterest(this, 'routeTables');
        }
    },

    invalidate: function() {
        this.display(ec2ui_session.model.routeTables);
    },

    refresh: function() {
        ec2ui_session.controller.describeRouteTables();
    },

    notifyModelChanged: function(interest) {
        this.invalidate();
    },

    getSelected : function() {
        var index =  this.selection.currentIndex;
        if (index == -1) return null;
        return this.tableList[index];
    },

    selectionChanged : function() {
        var index = this.selection.currentIndex;
        if (index == -1) return;
        var table = this.tableList[index];
        var subnets = ec2ui_session.model.getSubnets();
        if (subnets) {
            for (var i = 0; i < table.associations.length; i++) {
                for (var j = 0; j < subnets.length; j++) {
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

    createTable : function () {
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
        var wrap = function() {
            me.refresh();
        }
        ec2ui_session.controller.createRouteTable(vpcs[rc].id, wrap);
        ec2ui_session.showBusyCursor(false);
    },

    deleteSelected  : function () {
        var table = this.getSelected();
        if (!table || !confirm("Delete route table "+table.id+"?")) return;
        var me = this;
        var wrap = function() {
            me.refresh();
        }
        ec2ui_session.controller.deleteRouteTable(table.id, wrap);
    },

    display : function (tableList) {
        if (!tableList) { tableList = []; }
        this.treeBox.rowCountChanged(0, -this.tableList.length);
        this.tableList = tableList;
        this.treeBox.rowCountChanged(0, this.tableList.length);
        this.sort();
        if (tableList.length > 0) {
            this.selection.select(0);
        }
    }
};

var ec2ui_RoutesTreeView = {
        COLNAMES : ["route.cidr", "route.gatewayId", "route.state"],

        createRoute: function() {
            var table = ec2ui_RouteTablesTreeView.getSelected();
            if (!table) {
                alert("Please, select route table");
                return;
            }
            var gwList = []
            var gws = ec2ui_session.model.getInternetGateways();
            for (var i in gws) {
               if (gws[i].vpcs.indexOf(table.vpcId) > -1) {
                   gwList.push({text: gws[i].toStr(), id: gws[i].id});
               }
            }
            if (gwList.length == 0) {
                alert("VPC " + table.vpcId + " does not have Internet Gateways")
                return;
            }

            var retVal = {ok:null,cidr:null,gatewayId:null,gws:gwList}
            window.openDialog("chrome://ec2ui/content/dialog_create_route.xul", null, "chrome,centerscreen,modal,resizable", ec2ui_session, retVal);
            if (retVal.ok) {
                ec2ui_session.showBusyCursor(true);
                var me = this;
                var wrap = function(id) {
                    ec2ui_RouteTablesTreeView.refresh(true);
                    ec2ui_RouteTablesTreeView.selectById(table.id)
                }
                ec2ui_session.controller.createRoute(table.id, retVal.cidr, retVal.gatewayId, wrap);
                ec2ui_session.showBusyCursor(false);
            }
        },

        deleteRoute: function() {
            var item = this.getSelected();
            if (!item || !confirm("Delete route  " + item.cidr + "?")) return;
            var me = this;
            var wrap = function() {
                ec2ui_RouteTablesTreeView.refresh();
                ec2ui_RouteTablesTreeView.selectById(item.tableId)
            }
            ec2ui_session.controller.deleteRoute(item.tableId, item.cidr, wrap);
        }
};
ec2ui_RoutesTreeView.__proto__ = TreeView;

var ec2ui_RouteAssociationsTreeView = {
        COLNAMES : ["assoc.id", "assoc.subnetId", "assoc.info"],

        createAssociation: function() {
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
            var rc = ec2ui_session.promptList("Create Route", "Select subnet", subnets, ["id", "vpcId", "cidr"]);
            if (rc < 0) {
                return;
            }
            var me = this;
            var wrap = function() {
                ec2ui_RouteTablesTreeView.refresh();
                ec2ui_RouteTablesTreeView.selectById(table.id)
            }
            ec2ui_session.controller.AssociateRouteTable(table.id, subnets[rc].id, wrap);
        },

        deleteAssociation: function() {
            var item = this.getSelected();
            if (!item || !confirm("Delete route association " + item.id + ":" + item.subnetId + "?")) return;
            var me = this;
            var wrap = function() {
                ec2ui_RouteTablesTreeView.refresh();
                ec2ui_RouteTablesTreeView.selectById(item.tableId)
            }
            ec2ui_session.controller.DisassociateRouteTable(item.id, wrap);
        }
};
ec2ui_RouteAssociationsTreeView.__proto__ = TreeView;

ec2ui_RouteTablesTreeView.register();
