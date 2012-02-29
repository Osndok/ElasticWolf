var ec2ui_S3BucketsTreeView = {
    COLNAMES : [ 's3.name', 's3.region', 's3.acl', 's3.date' ],
    model : "s3buckets",

    display : function(list)
    {
        TreeView.display.call(this, list);
    },

    selectionChanged: function(event)
    {
        var item = this.getSelected()
        if (item == null) return
        var me = this

        if (item.keys.length) {
            ec2ui_S3BucketKeysTreeView.display(item.keys);
        } else {
            ec2ui_session.controller.listS3BucketKeys(item.name, null, function (bucket, keys) { if (item.name == bucket) ec2ui_S3BucketKeysTreeView.display(keys); })
        }
    },

    viewDetails : function(event)
    {
        var item = this.getSelected();
        if (item == null) return;
        window.openDialog("chrome://ec2ui/content/dialog_s3_details.xul", null, "chrome,centerscreen,modal,resizable", item);
    },

    createBucket: function() {
        var me = this;
        var retVal = { ok : null, name : null, region : null, params: {} }
        window.openDialog("chrome://ec2ui/content/dialog_create_s3bucket.xul", null, "chrome,centerscreen,modal,resizable", ec2ui_session, retVal);
        if (retVal.ok) {
            ec2ui_session.showBusyCursor(true);
            ec2ui_session.controller.createS3Bucket(retVal.name, retVal.region, retVal.params, function() { me.refresh(true); });
            ec2ui_session.showBusyCursor(false);
        }
    },

    deleteBucket: function() {
        var me = this;
        var item = this.getSelected();
        if (item == null) return;
        if (!item || !confirm("Delete bucket " + item.name + "?")) return;
        ec2ui_session.controller.deleteS3Bucket(item.name, function() { me.refresh(true); });
    },

    createBucketKey: function() {
        alert('Not implemented yet')
    },

    deleteBucketKey: function() {
        alert('Not implemented yet')
    },

    downloadBucketKey: function() {
        var bucket = this.getSelected()
        if (bucket == null) return
        var key = ec2ui_S3BucketKeysTreeView.getSelected()
        if (key == null) return
        var file = ec2ui_session.promptForFile("Save to file", true, DirIO.fileName(key.name))
        if (file) {
            ec2ui_session.controller.getS3BucketKey(bucket.name, key.name, {}, file, function() { alert(file + ' is downloaded'); })
        }
    },

    uploadBucketKey: function() {
        alert('Not implemented yet')
    },
};
ec2ui_S3BucketsTreeView.__proto__ = TreeView;
ec2ui_S3BucketsTreeView.register();

var ec2ui_S3BucketKeysTreeView = {
   COLNAMES : [ "key.name", "key.type", "key.size", "key.mtime", "key.etag" ],

};
ec2ui_S3BucketKeysTreeView.__proto__ = TreeView;
