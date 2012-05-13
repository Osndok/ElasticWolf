var ew_accountIdManager = {
    accountidmap : null,

    initDialog : function() {
        this.accountidmap = window.arguments[0];

        document.getElementById("ew.accountids.view").view = ew_accountIdsTreeView;
        ew_accountIdsTreeView.setMapping(this.accountidmap);
        document.getElementById("ew.accountids.accountid").select();
    },

    removeAccount : function() {
        var accountId = document.getElementById("ew.accountids.accountid").value.trim();
        if (accountId == null || accountId == "") return;

        this.accountidmap.removeKey(accountId);
        ew_accountIdsTreeView.setMapping(this.accountidmap);
    },

    saveAccount : function() {
        var accountId = document.getElementById("ew.accountids.accountid").value.trim() || "";
        var displayName = document.getElementById("ew.accountids.displayname").value.trim() || "";
        if (accountId.length == 0) return;
        if (displayName.length == 0) return;

        this.accountidmap.put(accountId, displayName);
        ew_accountIdsTreeView.setMapping(this.accountidmap);
    },

    selectMapping : function() {
        var sel = ew_accountIdsTreeView.getSelectedAccount();
        if (sel != null) {
            document.getElementById("ew.accountids.accountid").value = sel.accountid;
            document.getElementById("ew.accountids.displayname").value = sel.displayname;
        }
    }
}
