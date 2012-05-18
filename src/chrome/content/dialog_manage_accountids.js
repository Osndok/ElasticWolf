var ew_accountIdManager = {
    accountidmap : null,

    initDialog : function() {
        this.accountidmap = window.arguments[0];

        document.getElementById("ew.accountids.view").view = this;
        this.refresh();
        document.getElementById("ew.accountids.accountid").select();
    },

    refresh: function() {
        var list = this.accountidmap.toArray(function(k,v){return new AccountIdName(k, v)});
        this.display(list);
    },

    removeAccount : function() {
        var accountId = document.getElementById("ew.accountids.accountid").value.trim();
        if (accountId == null || accountId == "") return;

        this.accountidmap.removeKey(accountId);
        this.refresh();
    },

    saveAccount : function() {
        var accountId = document.getElementById("ew.accountids.accountid").value.trim() || "";
        var displayName = document.getElementById("ew.accountids.displayname").value.trim() || "";
        if (accountId.length == 0) return;
        if (displayName.length == 0) return;

        this.accountidmap.put(accountId, displayName);
        this.refresh()
    },

    selectMapping : function() {
        var sel = this.getSelected();
        document.getElementById("ew.accountids.accountid").value = sel ? sel.accountid : "";
        document.getElementById("ew.accountids.displayname").value = sel ? sel.displayname : "";
    }
}

ew_accountIdManager.__proto__ = TreeView;
