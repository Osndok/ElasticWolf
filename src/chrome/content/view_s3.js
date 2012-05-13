var ew_S3BucketsTreeView = {
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
        document.getElementById("ew.s3.path").value = path;
        ew_session.showBusyCursor(false);
    },

    show: function()
    {
        if (!this.path.length) {
            ew_S3BucketsTreeView.display(ew_model.getS3Buckets());
        } else {
            var item = ew_model.getS3Bucket(this.path[0])
            if (item.keys.length) {
                ew_S3BucketsTreeView.display(item.keys);
            } else {
                ew_session.showBusyCursor(true);
                ew_session.controller.listS3BucketKeys(item.name, null, function(bucket, keys) {
                    if (item.name == bucket) ew_S3BucketsTreeView.display(keys);
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

    setStatus: function(file, p)
    {
        file = DirIO.fileName(file)
        document.getElementById("ew.s3.status").value = file + ": " + (p >= 0 && p <= 100 ? Math.round(p) : 100) + "%";
    },

    create: function() {
        var me = this;
        var retVal = { ok : null, name: null, region : null, params: {}, type: this.path.length ? "Folder" : "Bucket" }
        window.openDialog("chrome://ew/content/dialog_create_s3bucket.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal);
        if (retVal.ok) {
            ew_session.showBusyCursor(true);
            if (!this.path.length) {
                ew_session.controller.createS3Bucket(retVal.name, retVal.region, retVal.params, function() { me.refresh(true); });
            } else {
                ew_model.getS3Bucket(this.path[0]).keys = []
                ew_session.controller.createS3BucketKey(this.path[0], this.path.slice(1).join('/') + retVal.name, retVal.params, null, function() { me.show(); });
            }
        }
    },

    remove: function() {
        var me = this;
        var item = this.getSelected();
        if (item == null) return;
        if (!confirm("Delete " + item.name + "?")) return;

        if (!item.bucket) {
            ew_session.controller.deleteS3Bucket(item.name, {}, function() { me.refresh(true); });
        } else {
            ew_model.getS3Bucket(item.bucket).keys = [];
            ew_session.controller.deleteS3BucketKey(item.bucket, item.name, {}, function() { me.show(); });
        }
    },

    download: function() {
        var me = this;
        var item = this.getSelected()
        if (item == null) return

        var file = ew_session.promptForFile("Save to file", true, DirIO.fileName(item.name))
        if (file) {
            ew_session.controller.getS3BucketKey(item.bucket, item.name, {}, file,
                    function(f) { meSetStatus(f, 100); },
                    function(f, p) { me.setStatus(f, p); } )
        }
    },

    upload: function() {
        var me = this;
        if (!this.path.length) return;
        var item = ew_model.getS3Bucket(this.path[0])
        item.keys = []
        var file = ew_session.promptForFile("Upload file")
        if (file) {
            var f = FileIO.open(file)
            var name = f.leafName.replace(/[ \/\\'":]+/g, '')
            ew_session.controller.putS3BucketKey(item.name, this.path.slice(1).join('/') + name, {}, file,
                    function(f) { me.show(); },
                    function(f, p) { me.setStatus(f, p); });
        }
    },

    manageAcls: function() {
        var me = this;
        var item = this.getSelected()
        if (item == null) return
        var retVal = { ok : null, content: null };

        if (!item.acls) {
            if (!this.path.length) {
                ew_session.controller.getS3BucketAcl(item.name)
            } else {
                ew_session.controller.getS3BucketKeyAcl(item.bucket, item.name)
            }
        }
        window.openDialog("chrome://ew/content/dialog_manage_s3acl.xul", null, "chrome,centerscreen,modal,resizable", ew_session, retVal, item);

        if (retVal.ok) {
            ew_session.showBusyCursor(true);
            if (item.bucket) {
                ew_session.controller.setS3BucketKeyAcl(item.bucket, item.name, retVal.content, function() { me.onSelection(); })
            } else {
                ew_session.controller.setS3BucketAcl(item.name, retVal.content, function() { me.onSelection(); })
            }
        }
    }
};
ew_S3BucketsTreeView.__proto__ = TreeView;
ew_S3BucketsTreeView.register();

