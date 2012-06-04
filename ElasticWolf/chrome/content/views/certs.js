var ew_CertTreeView = {
        COLNAMES : ['certs.name'],
        treeBox : null,
        selection : null,
        itemList : new Array(),
        registered : false,

        get rowCount() { return this.itemList.length; },
        setTree : function(treeBox) { this.treeBox = treeBox; },
        isEditable : function(idx, column)  { return true; },
        isContainer : function(idx) { return false;},
        isSeparator : function(idx) { return false; },
        isSorted : function() { return false; },
        getImageSrc : function(idx, column) { return ""; },
        selectionChanged : function() {},
        cycleCell: function(idx, column) {},
        performAction : function(action) {},
        performActionOnCell : function(action, index, column) {},
        getRowProperties : function(idx, column, prop) {},
        getCellProperties : function(idx, column, prop) {},
        getColumnProperties : function(column, element, prop) {},
        getLevel : function(idx) { return 0; },
        getProgressMode : function(idx,column) {},
        getCellValue : function(idx, column) {},
        getCellText : function(idx, column) { return idx >= this.rowCount ? "" : this.itemList[idx][column.id.split(".").pop()]; },
        cycleHeader : function(col) {
            var item = this.getSelected();
            cycleHeader(col, document, this.COLNAMES, this.itemList);
            this.treeBox.invalidate();
            if (item) {
                this.selectByName(item.name);
            } else {
                log("The selected item is null!");
            }
        },

        displayList : function (items) {
            this.treeBox.rowCountChanged(0, -this.itemList.length);
            this.itemList = items ? items : [];
            this.treeBox.rowCountChanged(0, this.itemList.length);
            this.sort();
            this.selection.clearSelection();
            if (this.itemList.length > 0) {
                this.selection.select(0);
            }
        },

        notifyModelChanged : function(interest) {
            this.invalidate();
        },

        selectByName : function(name) {
            this.selection.clearSelection();
            for(var i in this.itemList) {
                if (this.itemList[i].name == name) {
                    this.selection.select(i);
                    this.treeBox.ensureRowIsVisible(i);
                    return;
                }
            }
            // In case we don't find a match (which is probably a bug).
            this.selection.select(0);
        },

        getSelected : function() {
            return this.selection.currentIndex == -1 ? null : this.itemList[this.selection.currentIndex];
        },

        sort : function() {
            var item = this.getSelected();
            sortView(document, this.COLNAMES, this.itemList);
            if (item) this.selectByName(item.name);
        },

        invalidate: function() {
            this.displayList(ew_session.model.certs);
        },

        viewDetails : function(event) {
            var item = this.getSelected();
            if (item) {
                window.openDialog("chrome://ew/content/dialogs/details_cert.xul", null, "chrome,centerscreen,modal,resizable", item);
            }
        },

        register : function() {
            if (!this.registered) {
                this.registered = true;
                ew_model.registerInterest(this, 'certs');
            }
        },

        refresh : function() {
            ew_session.controller.listSigningCertificates();
        },

        createCert : function () {
            var me = this;
            var wrap = function(name, cert) {
                me.refresh();
            }
            var body = ew_session.generateCertificate();
            if (body) {
                ew_session.controller.uploadSigningCertificate(body, wrap);
            } else {
                alert("Could not generate new X509 certificate")
            }
        },

        uploadCert : function () {
            var me = this;
            var wrap = function(name, cert) {
                me.refresh();
            }
            var file = ew_session.promptForFile("Select the certificate file to upload:")
            if (file) {
                var body = FileIO.toString(file);
                ew_session.controller.uploadSigningCertificate(body, wrap);
            }
        },

        deleteSelected  : function () {
            var item = this.getSelected();
            if (item == null) return;
            var confirmed = confirm("Delete certificate "+item.name+"?");
            if (!confirmed) return;

            var me = this;
            var wrap = function() {
                me.refresh();
            }
            ew_session.controller.deleteSigningCertificate(item.name, wrap);
        }
};

ew_CertTreeView.register();
