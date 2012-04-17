var ec2ui_S3BucketsTreeView = {
    COLNAMES : [ 's3.label', 's3.mtime', "s3.type", "s3.size", "s3.etag" ],
    model : "s3buckets",
    path: [],

    display : function(list)
    {
        var path = this.path.join("/");
        var nlist = [];
        for (var i in list) {
            var n = (this.path[0] + "/" + list[i].name).replace(/[ \/]+$/, '');
            var p = n.split("/");
            // Next level only
            if (!this.path.length || n.indexOf(path) == 0 && p.length == this.path.length + 1) {
                list[i].label = p[p.length - 1] + (list[i].name[list[i].name.length - 1] == "/" ? "/" : "")
                nlist.push(list[i])
            }
        }
        TreeView.display.call(this, nlist);
        document.getElementById("ec2ui.s3.path").value = path;
        ec2ui_session.showBusyCursor(false);
    },

    show: function()
    {
        if (!this.path.length) {
            ec2ui_S3BucketsTreeView.display(ec2ui_model.getS3Buckets());
        } else {
            var item = ec2ui_model.getS3Bucket(this.path[0])
            if (item.keys.length) {
                ec2ui_S3BucketsTreeView.display(item.keys);
            } else {
                ec2ui_session.showBusyCursor(true);
                ec2ui_session.controller.listS3BucketKeys(item.name, null, function(bucket, keys) {
                    if (item.name == bucket) ec2ui_S3BucketsTreeView.display(keys);
                })
            }
        }
    },

    onSelection: function(event)
    {
        var me = this;
        var item = this.getSelected()
        if (item == null) return
    },

    onClick: function(event)
    {
        var me = this;
        var item = this.getSelected()
        if (item == null) return
        // Folder or bucket
        if (!this.path.length || item.label[item.label.length - 1] == "/") {
            this.path.push(item.name);
            this.show();
        }
    },

    refresh: function()
    {
        this.path = [];
        TreeView.refresh.call(this);
    },

    back: function(event)
    {
        this.path.pop();
        this.show();
    },

    create: function() {
        var me = this;
        var retVal = { ok : null, name : null, region : null, params: {} }
        window.openDialog("chrome://ec2ui/content/dialog_create_s3bucket.xul", null, "chrome,centerscreen,modal,resizable", ec2ui_session, retVal);
        if (retVal.ok) {
            ec2ui_session.showBusyCursor(true);
            ec2ui_session.controller.createS3Bucket(retVal.name, retVal.region, retVal.params, function() { me.refresh(true); });
        }
    },

    remove: function() {
        var me = this;
        var item = this.getSelected();
        if (item == null) return;
        if (!confirm("Delete " + item.name + "?")) return;

        ec2ui_session.controller.deleteS3Bucket(item.name, function() { me.refresh(true); });
    },

    download: function() {
        var me = this;
        var item = this.getSelected()
        if (item == null) return

        var file = ec2ui_session.promptForFile("Save to file", true, DirIO.fileName(item.name))
        if (file) {
            ec2ui_session.controller.getS3BucketKey(item.bucket, item.name, {}, file, function() { alert(file + ' is downloaded'); })
        }
    },

    upload: function() {
        alert('Not implemented yet')
    },

    manageAcls: function() {
        var me = this;
        var item = this.getSelected()
        if (item == null) return
        var retVal = { ok : null, item: item, acls: [] };

        if (!item.acls) {
            if (!this.path.length) {
                ec2ui_session.controller.getS3BucketAcl(item.name)
            } else {
                ec2ui_session.controller.getS3BucketKeyAcl(item.bucket, item.name)
            }
        }
        window.openDialog("chrome://ec2ui/content/dialog_manage_s3acl.xul", null, "chrome,centerscreen,modal,resizable", ec2ui_session, retVal);

        if (retVal.ok) {
            ec2ui_session.showBusyCursor(true);
            var content = '<AccessControlPolicy xmlns="http://s3.amazonaws.com/doc/2006-03-01/><Owner><ID>' +  item.owner  + '</ID></Owner><AccessControlList>';
            for (var i in retVal.acls) {
                content += '<Grant><Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="' + retVal.acls[i].type + '">';
                switch (retVal.acls[i].type) {
                case 'CanonicalUser':
                    content += '<ID>' + retVal.acls[i].id + '</ID>';
                    break;

                case 'AmazonCustomerByEmail':
                    content += '<EmailAddress>' + retVal.acls[i].email + '</EmailAddress>';
                    break;

                case 'Group':
                    content += '<URI>' + retVal.acls[i].group + '<URI>';
                    break;
                }
                content += '</Grantee><Permission>' + retVal.acls[i].permission + '</Permission></Grant>';
            }
            content += '</AccessControlList></AccessControlPolicy>';

            if (item.bucket) {
                ec2ui_session.controller.setS3BucketKeyAcl(item.bucket, item.name, content, function() { me.onSelection(); })
            } else {
                ec2ui_session.controller.setS3BucketAcl(item.name, content, function() { me.onSelection(); })
            }
        }
    }
};
ec2ui_S3BucketsTreeView.__proto__ = TreeView;
ec2ui_S3BucketsTreeView.register();

