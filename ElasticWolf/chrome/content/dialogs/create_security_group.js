var ew_SecGroupCreator = {
    ew_session : null,
    retVal : null,

    createGroup : function() {
        if (!this.validateGroupName()) return false;
        if (!this.validateGroupDesc()) return false;
        this.retVal.name = document.getElementById("ew.newsecgroup.name").value.trim();
        this.retVal.description = document.getElementById("ew.newsecgroup.description").value.trim();
        this.retVal.enableProtocolsFor = document.getElementById("ew.newsecgroup.enableprot").selectedItem.value;
        this.retVal.vpcId = document.getElementById("ew.newsecgroup.vpcId").value;
        this.retVal.ok = true;
        return true;
    },

    validateGroupName : function() {
        var textbox = document.getElementById("ew.newsecgroup.name");
        if (textbox.value.trim().length == 0) {
            alert("Please provide a group name");
            textbox.select();
            return false;
        }
        return true;
    },

    validateGroupDesc : function() {
        var textbox = document.getElementById("ew.newsecgroup.description");
        if (textbox.value.trim().length == 0) {
            alert("Please provide a description");
            textbox.select();
            return false;
        }
        return true;
    },

    init : function() {
        this.ew_session = window.arguments[0];
        this.retVal = window.arguments[1];

        var vpcMenu = document.getElementById("ew.newsecgroup.vpcId");
        vpcMenu.removeAllItems();
        vpcMenu.appendItem("None", "");
        var vpcs = this.ew_session.model.getVpcs();
        for (var i in vpcs) {
            vpcMenu.appendItem(vpcs[i].toString(), vpcs[i].id);
        }
        vpcMenu.selectedIndex = 0;
    }
}
