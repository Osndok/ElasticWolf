var ew_LaunchPermissions = {
    session : null,
    image : null,
    launchPermissionList : new Array(),

    init : function()
    {
        this.session = window.arguments[0];
        this.image = window.arguments[1];
        this.refreshLaunchPermissions();
    },

    getLaunchPermissionsList : function()
    {
        return document.getElementById("ew.launchpermissions.list");
    },

    getSelectedLaunchPermission : function()
    {
        var item = this.getLaunchPermissionsList().getSelectedItem(0);
        if (item == null) return null;
        return item.value;
    },

    selectLaunchPermissionByName : function(name)
    {
        var list = this.getLaunchPermissionsList();
        for ( var i in this.launchPermissionList) {
            if (this.launchPermissionList[i] == name) {
                list.selectedIndex = i;
                return;
            }
        }

        // In case we don't find a match (which is probably a bug).
        list.selectedIndex = 0;
    },

    copyAccountIdToClipBoard : function(event)
    {
        var name = this.getSelectedLaunchPermission();
        if (name == null) return;

        ew_session.copyToClipboard(name);
    },

    refreshLaunchPermissions : function()
    {
        var me = this;
        if (this.image.state == "deregistered") return;

        this.session.controller.describeLaunchPermissions(this.image.id, function(list) {
            me.displayLaunchPermissions(list);
        });
    },

    addGlobalLaunchPermission : function()
    {
        this.addNamedPermission(this.image, "all");
    },

    addLaunchPermission : function()
    {
        var name = prompt("Please provide an EC2 user ID");
        if (name == null) return;
        this.addNamedPermission(this.image, name);
    },

    addNamedPermission : function(image, name)
    {
        var me = this;
        this.session.controller.addLaunchPermission(image.id, name, function() {
            me.refreshLaunchPermissions();
            me.selectLaunchPermissionByName(name);
        });
    },

    removeLaunchPermission : function()
    {
        var name = this.getSelectedLaunchPermission();
        if (name == null) return;

        var confirmed = confirm("Revoke launch permissions for " + name + " on AMI " + this.image.id + "?");
        if (!confirmed) return;

        var me = this;
        this.session.controller.revokeLaunchPermission(this.image.id, name, function() {
            me.refreshLaunchPermissions();
        });
    },

    resetLaunchPermissions : function()
    {
        var confirmed = confirm("Reset launch permissions for AMI " + image.id + "?");
        if (!confirmed) return;

        var me = this;
        this.session.controller.resetLaunchPermissions(this.image.id, function() {
            me.refreshLaunchPermissions();
        });
    },

    displayLaunchPermissions : function(permList)
    {
        this.launchPermissionList = permList;
        var list = this.getLaunchPermissionsList();
        var count = list.getRowCount();
        for ( var i = count - 1; i >= 0; i--) {
            list.removeItemAt(i);
        }

        // Sort 'all' to the top
        permList.sort(function(x, y)
        {
            if (x == 'all') return -1;
            if (y == 'all') return 1;
            return x < y ? -1 : (x == y ? 0 : 1);
        });

        for ( var i in permList) {
            var perm = permList[i];
            list.appendItem(perm, perm);
        }
    },

};
