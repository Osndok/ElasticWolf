var ew_InstanceHealthTreeView = {
    COLNAMES : ['InstanceHealth.Description','InstanceHealth.State','InstanceHealth.InstanceId','InstanceHealth.ReasonCode'],
    treeBox : null,
    selection : null,
    InstanceHealthList : new Array(),
    registered : false,

    get rowCount() { return this.InstanceHealthList.length; },

    setTree      : function(treeBox)            { this.treeBox = treeBox; },
    getCellText : function(idx, column) {
        if (idx >= this.rowCount) return "";
        var member = column.id.split(".").pop();
        return this.InstanceHealthList[idx][member];
    },
    isEditable: function(idx, column)  { return true; },
    isContainer: function(idx)            { return false;},
    isSeparator: function(idx)            { return false; },
    isSorted: function()                    { return false; },

    getImageSrc: function(idx, column) { return ""; },
    getProgressMode : function(idx,column) {},
    getCellValue: function(idx, column) {},
    cycleHeader: function(col) {
        cycleHeader(
        col,
        document,
        this.COLNAMES,
        this.InstanceHealthList);
    },

    sort : function() {
        sortView(document, this.COLNAMES, this.InstanceHealthList);
    },

    selectionChanged: function() {},
    cycleCell: function(idx, column) {},
    performAction: function(action) {},
    performActionOnCell: function(action, index, column) {},
    getRowProperties: function(idx, column, prop) {},
    getCellProperties: function(idx, column, prop) {},
    getColumnProperties: function(column, element, prop) {},
    getLevel : function(idx) { return 0; },

    register: function() {
        if (!this.registered) {
            this.registered = true;
            ew_model.registerInterest(this, 'InstanceHealth');
        }
    },

    invalidate: function() {
        this.displayInstanceHealth(ew_session.model.InstanceHealth);
    },

    refresh: function() {
        ew_session.controller.describeInstanceHealth();
    },

    notifyModelChanged: function(interest) {
        this.invalidate();
    },

    displayInstanceHealth : function (InstanceHealthList) {
        if (!InstanceHealthList) { InstanceHealthList = []; }

        this.treeBox.rowCountChanged(0, -this.InstanceHealthList.length);
        this.InstanceHealthList = InstanceHealthList;
        this.treeBox.rowCountChanged(0, this.InstanceHealthList.length);
        this.sort();
        this.selection.clearSelection();
        if (InstanceHealthList.length > 0) {
            this.selection.select(0);
        }
    }
};

ew_InstanceHealthTreeView.register();
