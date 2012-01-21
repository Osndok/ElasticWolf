var ec2ui_SecurityGroupsTreeView = {
    COLNAMES : ['securityGroup.id', 'securitygroup.ownerId','securitygroup.name','securitygroup.vpcId','securitygroup.description'],
    treeBox : null,
    selection : null,
    groupList : new Array(),
    registered : false,

    get rowCount() { return this.groupList.length; },

    setTree     : function(treeBox)     { this.treeBox = treeBox; },
    getCellText : function(idx, column) {
        if (idx >= this.rowCount) return "";
        var member = column.id.split(".").pop();
        return this.groupList[idx][member];
    },
    isEditable: function(idx, column)  { return true; },
    isContainer: function(idx)         { return false;},
    isSeparator: function(idx)         { return false; },
    isSorted: function()               { return false; },

    getImageSrc: function(idx, column) { return ""; },
    getProgressMode : function(idx,column) {},
    getCellValue: function(idx, column) {},
    cycleHeader: function(col) {
        var sel = this.getSelectedGroup();
        cycleHeader(col,document,this.COLNAMES,this.groupList);
        this.selectionChanged();
        this.treeBox.invalidate();
        if (sel) {
            log(sel.name + ": Select this group post sort");
            this.selectGroup(sel);
        } else {
            log("The selected group is null!");
        }
    },

    viewDetails : function(event) {
        var group = this.getSelectedGroup();
        if (group == null) return;
        window.openDialog("chrome://ec2ui/content/dialog_securitygroup_details.xul", null, "chrome,centerscreen,modal,resizable", group);
    },

    sort : function() {
        var sel = this.getSelectedGroup();
        sortView(document, this.COLNAMES, this.groupList);
        if (sel) this.selectGroup(sel);
    },

    cycleCell: function(idx, column) {},
    performAction: function(action) {},
    performActionOnCell: function(action, index, column) {},
    getRowProperties: function(idx, column, prop) {},
    getCellProperties: function(idx, column, prop) {},
    getColumnProperties: function(column, element, prop) {},
    getLevel : function(idx) { return 0; },

    selectGroup : function(group) {
        this.selection.clearSelection();
        if (group) {
            for (var i in this.groupList) {
                if ((group.id && this.groupList[i].id == group.id) || (!group.id && group.name && this.groupList[i].name == group.name)) {
                    this.selection.select(i);
                    this.treeBox.ensureRowIsVisible(i);
                    return;
                }
            }
        }
    },

    register: function() {
        if (!this.registered) {
            this.registered = true;
            ec2ui_model.registerInterest(this, 'securitygroups');
        }
    },

    invalidate: function() {
        this.displayGroups(ec2ui_session.model.securityGroups);
    },

    refresh: function() {
        ec2ui_session.controller.describeSecurityGroups();
    },

    notifyModelChanged: function(interest) {
        this.invalidate();
    },

    getSelectedGroup : function() {
        var index =  this.selection.currentIndex;
        if (index == -1) return null;
        return this.groupList[index];
    },

    selectionChanged : function() {
        var index = this.selection.currentIndex;
        if (index == -1) return;

        var group = this.groupList[index];
        ec2ui_PermissionsTreeView.displayPermissions(group.permissions);
    },

    createNewGroup : function () {
        var retVal = {ok:null,name:null,description:null,vpcId:null};
        window.openDialog("chrome://ec2ui/content/dialog_create_security_group.xul", null, "chrome,centerscreen,modal,resizable", ec2ui_session, retVal);

        if (retVal.ok) {
            ec2ui_session.showBusyCursor(true);
            var me = this;
            var wrap = function(id) {
                retVal.id = id
                me.refresh();
                me.selectGroup(retVal);
                me.authorizeCommonProtocolsByUserRequest(retVal);
            }
            ec2ui_session.controller.createSecurityGroup(retVal.name, retVal.description, retVal.vpcId, wrap);
            ec2ui_session.showBusyCursor(false);
        }
    },

    authorizeCommonProtocolsByUserRequest : function(retVal) {
        var result = {ipAddress:"0.0.0.0"};
        var cidr = null;
        // Determine the CIDR for the protocol authorization request
        switch (retVal.enableProtocolsFor) {
        case "host":
            ec2ui_session.client.queryCheckIP("", result);
            cidr = result.ipAddress.trim() + "/32";
            break;
        case "network":
            ec2ui_session.client.queryCheckIP("block", result);
            cidr = result.ipAddress.trim();
            break;
        default:
            cidr = null;
            break;
        }

        // Need to authorize SSH and RDP for either this host or the network.
        if (cidr != null) {
            var wrap = function() {
                ec2ui_SecurityGroupsTreeView.refresh();
                ec2ui_SecurityGroupsTreeView.selectGroup(retVal);
            }

            // 1st enable SSH
            ec2ui_session.controller.authorizeSourceCIDR(retVal,"tcp",protPortMap["ssh"],protPortMap["ssh"],cidr,null);

            // enable RDP and refresh the view
            ec2ui_session.controller.authorizeSourceCIDR(retVal,"tcp",protPortMap["rdp"],protPortMap["rdp"],cidr,wrap);
        } else {
            // User wants to customize the firewall...
            ec2ui_PermissionsTreeView.grantPermission();
        }
    },

    deleteSelected  : function () {
        var group = this.getSelectedGroup();
        if (group == null) return;

        var confirmed = confirm("Delete group "+group.name+"?");
        if (!confirmed)
            return;

        var me = this;
        var wrap = function() {
            me.refresh();
            me.selectGroup(group);
        }
        ec2ui_session.controller.deleteSecurityGroup(group, wrap);
    },

    displayGroups : function (groupList) {
        if (!groupList) { groupList = []; }
        var group = this.getSelectedGroup();

        ec2ui_PermissionsTreeView.displayPermissions([]);
        this.treeBox.rowCountChanged(0, -this.groupList.length);
        this.groupList = groupList;
        this.treeBox.rowCountChanged(0, this.groupList.length);
        this.sort();
        this.selectGroup(group);
    }
};
ec2ui_SecurityGroupsTreeView.register();

var ec2ui_PermissionsTreeView = {
        COLNAMES : ['permission.type','permission.protocol','permission.fromPort','permission.toPort','permission.cidrIp','permission.group'],
        treeBox : null,
        selection : null,
        permissionList : new Array(),

        get rowCount() { return this.permissionList.length; },

        setTree     : function(treeBox)     { this.treeBox = treeBox; },
        getCellText : function(idx, column) {
            if (idx >= this.rowCount) return "";
            var member = column.id.split(".").pop();
            return this.permissionList[idx][member];
        },
        isEditable: function(idx, column)  { return true; },
        isContainer: function(idx)         { return false;},
        isSeparator: function(idx)         { return false; },
        isSorted: function()               { return false; },

        getImageSrc: function(idx, column) { return ""; },
        getProgressMode : function(idx,column) {},
        getCellValue: function(idx, column) {},
        cycleHeader: function(col) {
            var perm = this.getSelectedPermission();
            cycleHeader(
                col,
                document,
                this.COLNAMES,
                this.permissionList);
            this.treeBox.invalidate();
            if (perm) {
                log(perm.id + ": Select this permission post sort");
                this.selectByPermission(perm);
            } else {
                log("The selected permission is null!");
            }
        },

        viewDetails : function(event) {
            var perm = this.getSelectedPermission();
            if (perm == null) return;
            window.openDialog("chrome://ec2ui/content/dialog_permission_details.xul", null, "chrome,centerscreen,modal,resizable", perm);
        },

        selectByPermission : function(perm) {
            this.selection.clearSelection();
            var permStr = encodeJSONMap(perm);
            for(var i in this.permissionList) {
                var curr = encodeJSONMap(this.permissionList[i]);
                if (curr == permStr) {
                    this.selection.select(i);
                    this.treeBox.ensureRowIsVisible(i);
                    return;
                }
            }

            // In case we don't find a match (which is probably a bug).
            this.selection.select(0);
        },

        sort : function() {
            sortView(document, this.COLNAMES, this.permissionList);
        },

        selectionChanged: function() {},
        cycleCell: function(idx, column) {},
        performAction: function(action) {},
        performActionOnCell: function(action, index, column) {},
        getRowProperties: function(idx, column, prop) {},
        getCellProperties: function(idx, column, prop) {},
        getColumnProperties: function(column, element, prop) {},
        getLevel : function(idx) { return 0; },

        grantPermission : function(type) {
            var group = ec2ui_SecurityGroupsTreeView.getSelectedGroup();
            if (group == null) return;

            type = type ? type : "Ingress";

            if (type == "Egress" && group.vpcId == "") {
                alert("Egress can be used for VPC groups only")
                return;
            }
            retVal = {ok:null, type: type};
            window.openDialog("chrome://ec2ui/content/dialog_new_permission.xul", null, "chrome,centerscreen,modal,resizable", group, ec2ui_session, retVal);

            if (retVal.ok) {
                var me = this;
                var wrap = function() {
                    ec2ui_SecurityGroupsTreeView.refresh();
                    ec2ui_SecurityGroupsTreeView.selectGroup(group);
                }

                var newPerm = retVal.newPerm;
                if (newPerm.cidrIp != null) {
                    ec2ui_session.controller.authorizeSourceCIDR(type, group,newPerm.ipProtocol,newPerm.fromPort,newPerm.toPort,newPerm.cidrIp,wrap);
                } else {
                    ec2ui_session.controller.authorizeSourceGroup(type, group,newPerm.ipProtocol,newPerm.fromPort,newPerm.toPort,newPerm.srcGroup, wrap);
                }
            }
        },

        getSelectedPermission : function() {
            var index =  this.selection.currentIndex;
            if (index == -1) return null;
            return this.permissionList[index];
        },

        revokePermission : function() {
            var group = ec2ui_SecurityGroupsTreeView.getSelectedGroup();
            if (group == null) return;
            var perms = new Array();
            for(var i in this.permissionList) {
                if (this.selection.isSelected(i)) {
                    perms.push(this.permissionList[i]);
                }
            }
            if (perms.length == 0)
                return;

            var confirmed = confirm("Revoke selected permission(s) on group "+group.name+"?");
            if (!confirmed)
                return;

            ec2ui_session.showBusyCursor(true);
            var me = this;
            var wrap = function() {
                if (ec2ui_prefs.isRefreshOnChangeEnabled()) {
                    ec2ui_SecurityGroupsTreeView.refresh();
                    ec2ui_SecurityGroupsTreeView.selectGroup(group);
                }
            }

            var permission = null;
            for (i in perms) {
                permission = perms[i];
                if (permission.cidrIp) {
                    ec2ui_session.controller.revokeSourceCIDR(permission.type,group,permission.protocol,permission.fromPort,permission.toPort,permission.cidrIp,wrap);
                } else {
                    ec2ui_session.controller.revokeSourceGroup(permission.type,group,permission.protocol,permission.fromPort,permission.toPort,permission.srcGroup,wrap);
                }
            }
            ec2ui_session.showBusyCursor(false);
        },

        displayPermissions : function (permissionList) {
            this.treeBox.rowCountChanged(0, -this.permissionList.length);
            this.permissionList = permissionList;
            this.treeBox.rowCountChanged(0, this.permissionList.length);
            this.sort();
            this.selection.clearSelection();
            if (permissionList.length > 0) {
                this.selection.select(0);
            }
        }
};
