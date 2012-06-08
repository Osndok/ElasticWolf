var protPortMap = {
    any: "-1",
    other: "-1",
    ssh : "22",
    rdp : "3389",
    http : "80",
    https : "443",
    pop3 : "110",
    imap : "143",
    spop : "995",
    simap : "993",
    dns : "53",
    mysql : "3306",
    mssql : "1433",
    smtp : "25",
    smtps : "465",
    ldap : "389",
};

var fileCopyStatus = {
    FAILURE : 0,
    SUCCESS : 1,
    FILE_EXISTS : 2,
};

var regExs = {
    "ami" : new RegExp("^ami-[0-9a-f]{8}$"),
    "aki" : new RegExp("^aki-[0-9a-f]{8}$"),
    "ari" : new RegExp("^ari-[0-9a-f]{8}$"),
    "all" : new RegExp("^a[kmr]i-[0-9a-f]{8}$"),
    "win" : new RegExp(/^Win/i),
    "mac" : new RegExp(/^Mac/),
};

var instanceTypes = [
    { name: "t1.micro", value: "t1.micro" },
    { name: "m1.small (32-bit only)", value: "m1.small" },
    { name: "c1.medium (32-bit only)", value: "c1.medium" },
    { name: "m1.large (64-bit only)", value: "m1.large" },
    { name: "m1.xlarge (64-bit only)", value: "m1.xlarge" },
    { name: "m2.xlarge (64-bit only)", value: "m2.xlarge" },
    { name: "m2.2xlarge (64-bit only)", value: "m2.2xlarge" },
    { name: "m2.4xlarge (64-bit only)", value: "m2.4xlarge" },
    { name: "c1.xlarge (64-bit only)", value: "c1.xlarge" },
    { name: "cc1.4xlarge (64-bit only)", value: "cc1.4xlarge" },
    { name: "cg1.4xlarge (64-bit only)", value: "cg1.4xlarge" },
];

Function.prototype.className = function()
{
    if ("name" in this) return this.name;
    return this.name = this.toString().match(/function\s*([^(]*)\(/)[1];
}

String.prototype.trim = function()
{
    return this.replace(/^\s+|\s+$/g, "");
}

//With thanks to http://delete.me.uk/2005/03/iso8601.html
Date.prototype.setISO8601 = function(string)
{
    var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" + "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?" + "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?";
    var d = string.match(new RegExp(regexp));
    if (d == null) {
        this.setTime(null);
        return;
    }
    var offset = 0;
    var date = new Date(d[1], 0, 1);
    if (d[3]) {
        date.setMonth(d[3] - 1);
    }
    if (d[5]) {
        date.setDate(d[5]);
    }
    if (d[7]) {
        date.setHours(d[7]);
    }
    if (d[8]) {
        date.setMinutes(d[8]);
    }
    if (d[10]) {
        date.setSeconds(d[10]);
    }
    if (d[12]) {
        date.setMilliseconds(Number("0." + d[12]) * 1000);
    }
    if (d[14]) {
        offset = (Number(d[16]) * 60) + Number(d[17]);
        offset *= ((d[15] == '-') ? 1 : -1);
    }
    offset -= date.getTimezoneOffset();
    var time = (Number(date) + (offset * 60 * 1000));
    this.setTime(Number(time));
}

Date.prototype.strftime = function(fmt, utc)
{
    /* With due thanks to http://whytheluckystiff.net */
    /* other support functions -- thanks, ecmanaut! */
    var strftime_funks = {
        zeropad : function(n) { return n > 9 ? n : '0' + n; },
        a : function(t) { return [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ][utc ? t.getUTCDay() : t.getDay()] },
        A : function(t) { return [ 'Sunday', 'Monday', 'Tuedsay', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ][utc ? t.getUTCDay() : t.getDay()] },
        b : function(t) { return [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ][utc ? t.getUTCMonth() : t.getMonth()] },
        B : function(t) { return [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ][utc ? t.getUTCMonth() : t.getMonth()] },
        c : function(t) { return utc ? t.toUTCString() : t.toString() },
        d : function(t) { return this.zeropad(utc ? t.getUTCDate() : t.getDate()) },
        H : function(t) { return this.zeropad(utc ? t.getUTCHours() : t.getHours()) },
        I : function(t) { return this.zeropad(((utc ? t.getUTCHours() : t.getHours()) + 12) % 12) },
        m : function(t) { return this.zeropad((utc ? t.getUTCMonth() : t.getMonth()) + 1) }, // month-1
        M : function(t) { return this.zeropad(utc ? t.getUTCMinutes() : t.getMinutes()) },
        p : function(t) { return this.H(t) < 12 ? 'AM' : 'PM'; },
        S : function(t) { return this.zeropad(utc ? t.getUTCSeconds() : t.getSeconds()) },
        w : function(t) { return utc ? t.getUTCDay() : t.getDay() }, // 0..6 == sun..sat
        y : function(t) { return this.zeropad(this.Y(t) % 100); },
        Y : function(t) { return utc ? t.getUTCFullYear() : t.getFullYear() },
        '%' : function(t) { return '%' },
    };
    var t = this;
    for ( var s in strftime_funks) {
        if (s.length == 1) fmt = fmt.replace('%' + s, strftime_funks[s](t));
    }
    return fmt;
};

Date.prototype.toISO8601String = function(format, offset)
{
    /*
     * accepted values for the format [1-6]: 1 Year: YYYY (eg 1997) 2 Year and
     * month: YYYY-MM (eg 1997-07) 3 Complete date: YYYY-MM-DD (eg 1997-07-16) 4
     * Complete date plus hours and minutes: YYYY-MM-DDThh:mmTZD (eg
     * 1997-07-16T19:20+01:00) 5 Complete date plus hours, minutes and seconds:
     * YYYY-MM-DDThh:mm:ssTZD (eg 1997-07-16T19:20:30+01:00) 6 Complete date
     * plus hours, minutes, seconds and a decimal fraction of a second
     * YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45+01:00)
     */
    if (!format) {
        var format = 6;
    }
    if (!offset) {
        var offset = 'Z';
        var date = this;
    } else {
        var d = offset.match(/([-+])([0-9]{2}):([0-9]{2})/);
        var offsetnum = (Number(d[2]) * 60) + Number(d[3]);
        offsetnum *= ((d[1] == '-') ? -1 : 1);
        var date = new Date(Number(Number(this) + (offsetnum * 60000)));
    }

    var zeropad = function(num)
    {
        return ((num < 10) ? '0' : '') + num;
    }

    var str = "";
    str += date.getUTCFullYear();
    if (format > 1) {
        str += "-" + zeropad(date.getUTCMonth() + 1);
    }
    if (format > 2) {
        str += "-" + zeropad(date.getUTCDate());
    }
    if (format > 3) {
        str += "T" + zeropad(date.getUTCHours()) + ":" + zeropad(date.getUTCMinutes());
    }
    if (format > 5) {
        var secs = Number(date.getUTCSeconds() + "." + ((date.getUTCMilliseconds() < 100) ? '0' : '') + zeropad(date.getUTCMilliseconds()));
        str += ":" + zeropad(secs);
    } else
        if (format > 4) {
            str += ":" + zeropad(date.getUTCSeconds());
        }

    if (format > 3) {
        str += offset;
    }
    return str;
}

// Generic tree container
var TreeView = {
    columns : [],
    tree: null,
    treeBox : null,
    treeList : new Array(),
    selection : null,
    registered : false,
    initialized: false,
    model : '',
    atomService: null,
    properties: [],
    refreshTimeout: 10000,
    refreshTimer: null,
    searchElement: null,
    searchTimer: null,
    filterList: null,
    tagId: null,
    winDetails: null,
    tab: null,

    getModelName: function()
    {
        if (this.model instanceof Array) return this.model[0];
        return this.model;
    },
    getModel: function()
    {
        if (!this.initialized) {
            this.initialized = true;
            this.refreshAll();
        }
        return ew_model.getModel(this.getModelName(this.model));
    },
    getData: function()
    {
        return this.treeList;
    },
    getList: function()
    {
        return this.model ? this.getModel() : this.getData();
    },
    get rowCount() {
        return this.treeList.length;
    },
    setTree : function(treeBox) {
        this.treeBox = treeBox;
    },
    isEditable : function(idx, column) {
        return true;
    },
    isContainer : function(idx) {
        return false;
    },
    isSeparator : function(idx) {
        return false;
    },
    isSorted : function() {
        return false;
    },
    getSelected : function() {
        return !this.selection || this.selection.currentIndex == -1 ? null : this.treeList[this.selection.currentIndex];
    },
    setSelected : function(index) {
        this.selection.select(index);
    },
    getSelectedAll: function() {
        var list = new Array();
        for (var i in this.treeList) {
            if (this.selection.isSelected(i)) {
                list.push(this.treeList[i]);
            }
        }
        return list;
    },
    getImageSrc : function(idx, column) {
        return ""
    },
    getProgressMode : function(idx, column) {
    },
    getParentIndex: function(idx) {
        return -1;
    },
    getCellText : function(idx, column) {
        var name = column.id.split(".").pop();
        return idx >= this.rowCount ? "" : ew_model.modelValue(name, this.treeList[idx][name]);
    },
    getCellValue : function(idx, column) {
        return this.getCellText(idx, columns);
    },
    setCellValue: function (idx, column, val) {
        if (idx >= 0 && idx < this.rowCount) this.treeList[idx][column.id.split(".").pop()] = val;
    },
    notifyModelChanged : function(interest) {
        this.invalidate();
    },
    hasNextSibling: function(idx, after) {
        return false;
    },
    canDrop: function(idx, orientation, data) {
        return true;
    },
    drop: function(idx, orientation, data) {
    },
    cycleCell : function(idx, column) {
    },
    performAction : function(action) {
        debug('action ' + action);
    },
    performActionOnCell : function(action, idx, column) {
    },
    getRowProperties : function(idx, column, prop) {
    },
    getCellProperties : function(idx, column, prop) {
        var name = column.id.split(".").pop();
        if (this.properties.indexOf(name) == -1) return;
        var value = this.treeList[idx][name].replace(/[ -.:]+/g,'_').toLowerCase();
        if (!this.atomService) {
            this.atomService = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
        }
        prop.AppendElement(this.atomService.getAtom(this.getModelName() + "_" + value));
    },
    getColumnProperties : function(column, element, prop) {
    },
    getLevel : function(idx) {
        return 0;
    },
    cycleHeader : function(col) {
        var item = this.getSelected();
        var csd = col.element.getAttribute("sortDirection");
        var sortDirection = (csd == "ascending" || csd == "natural") ? "descending" : "ascending";
        for ( var i = 0; i < col.columns.count; i++) {
            col.columns.getColumnAt(i).element.setAttribute("sortDirection", "natural");
        }
        col.element.setAttribute("sortDirection", sortDirection);
        this.sortView(document, this.columns, this.treeList);
        this.treeBox.invalidate();
        if (item) this.select(item);
    },
    sort : function() {
        var item = this.getSelected();
        this.treeBox.invalidate();
        this.sortView(document, this.columns, this.treeList);
        if (item) this.select(item);
    },
    sortView: function(document, cols, list)
    {
        var sortField = null;
        var ascending = null;
        for (var i in cols) {
            var col = cols[i];
            if ($(col) != null) {
                var direction = document.getElementById(col).getAttribute("sortDirection");
            }
            if (direction && direction != "natural") {
                ascending = (direction == "ascending");
                sortField = col.slice(col.indexOf(".") + 1);
                break;
            }
        }

        if (sortField != null) {
            var sortFunc = function(a, b) {
                var aVal = eval("a." + sortField) || "";
                var bVal = eval("b." + sortField) || "";
                var aF = parseFloat(aVal);
                if (!isNaN(aF) && aF.toString() == aVal) {
                    aVal = aF;
                    bVal = parseFloat(bVal);
                } else {
                    aVal = aVal.toString().toLowerCase();
                    bVal = bVal.toString().toLowerCase();
                }
                if (aVal < bVal) return ascending ? -1 : 1;
                if (aVal > bVal) return ascending ? 1 : -1;
                return 0;
            };
            list.sort(sortFunc);
        }
    },
    register : function() {
        if (!this.registered) {
            this.registered = true;
            ew_model.registerInterest(this, this.model);
        }
    },
    find: function(obj, columns) {
        if (obj) {
            if (!columns) columns = ['id', 'name', 'title'];
            for (var i in this.treeList) {
                for (var c in columns) {
                    var n = columns[c];
                    if (obj[n] && obj[n] != "" && this.treeList[i][n] == obj[n]) return i;
                }
            }
        }
        return -1;
    },
    select : function(obj, columns) {
        var i = this.find(obj, columns)
        if (i >= 0) {
            this.selection.select(i);
            this.treeBox.ensureRowIsVisible(i);
            // Make sure the event is fired if we select same item
            if (this.selection.currentIndex == i) {
                this.selectionChanged();
            }
            return true;
        }
        return false;
    },
    selectAll: function(list) {
        if (!list) return;
        this.selection.selectEventsSuppressed = true;
        this.selection.clearSelection();
        for (var i in list) {
            var idx = this.find(list[i]);
            if (idx >= 0) {
                this.selection.toggleSelect(idx);
                this.treeBox.ensureRowIsVisible(idx);
            }
        }
        this.selection.selectEventsSuppressed = false;
    },
    refresh : function(force) {
        ew_model.refreshModel(this.getModelName(this.model));
        this.refreshAll(force);
    },
    refreshAll: function(force) {
        if (this.model instanceof Array) {
            for (var i = 1; i < this.model.length; i++) {
                if (force || ew_model.getModel(this.model[i]) == null) {
                    ew_model.refreshModel(this.model[i]);
                }
            }
        }
    },
    isRefreshable: function() {
        return false;
    },
    startRefreshTimer : function() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        var me = this;
        this.refreshTimer = setTimeout(function() { me.refresh() }, this.refreshTimeout);
    },
    stopRefreshTimer : function() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
    },
    invalidate : function() {
        this.display(this.filter(this.getList()));
    },
    filter : function(list) {
        if (this.searchElement) {
            var nlist = new Array();
            var rx = new RegExp($(this.searchElement).value, "i");
            for (var i in list) {
                for (var j in list[i]) {
                    if (String(list[i][j]).match(rx)) {
                        nlist.push(list[i]);
                        break;
                    }
                }
            }
            list = nlist;
        }
        // Must be list of lists, each item is object with name: value: properties
        if (this.filterList) {
            var nlist = new Array();
            for (var i in list) {
                for (var j in this.filterList) {
                    if (this.filterList[j].value) {
                        if (list[i][this.filterList[j].name] == this.filterList[j].value) {
                            nlist.push(list[i])
                        }
                    } else
                    if (this.filterList[j].hasOwnProperty('empty')) {
                        if ((this.filterList[j].empty && !list[i][this.filterList[j].name]) ||
                            (!this.filterList[j].empty && list[i][this.filterList[j].name])) {
                            nlist.push(list[i])
                        }
                    }
                }
            }
            list = nlist;
        }
        return list;
    },
    selectionChanged: function(event) {
    },
    searchChanged : function(event)
    {
        if (!this.searchElement) return;
        this.search = $(this.searchElement).value;
        ew_prefs.setStringPreference(this.searchElement, this.search);

        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
        var me = this;
        this.searchTimer = setTimeout(function() { me.invalidate(); }, 500);
    },
    display : function(list) {
        var sel = cloneObject(this.getSelected())
        this.treeBox.rowCountChanged(0, -this.treeList.length);
        this.treeList = new Array();
        if (list) {
            this.treeList = this.treeList.concat(list);
        }
        this.treeBox.rowCountChanged(0, this.treeList.length);
        this.treeBox.invalidate();
        this.selection.clearSelection();
        this.sort();
        if (!this.select(sel)) {
            this.selection.select(0);
        }
        if (this.isRefreshable()) {
            this.startRefreshTimer();
        } else {
            this.stopRefreshTimer();
        }
    },
    activate: function() {
        this.restorePreferences();
    },
    deactivate: function() {
        this.stopRefreshTimer();
        this.savePreferences();
    },
    tag: function(event) {
        var item = this.getSelected();
        if (item) {
            ew_session.tagResource(item, this.tagId);
        }
    },
    copyToClipboard : function(name) {
        var item = this.getSelected();
        if (item) {
            ew_session.copyToClipboard(item[name]);
        }
    },
    clicked: function(event) {
        if (ew_session.winDetails && event) {
            this.viewDetails();
        }
    },
    viewDetails : function(event) {
        var item = this.getSelected();
        if (item == null) return;
        var me = this;
        var rc = { session: ew_session, item: item, title: className(item), }
        if (!ew_session.winDetails) {
            ew_session.winDetails = window.openDialog("chrome://ew/content/dialogs/details.xul", null, "chrome,centerscreen,modeless,resizable", rc);
        } else
        if (ew_session.winDetails.setup) {
            ew_session.winDetails.setup.call(ew_session.winDetails, rc);
        }
    },
    getInputItems: function()
    {
        if (!this.tab) return [];
        var panel = $(this.tab.tab);
        if (!panel) return [];
        var toolbars = panel.getElementsByTagName('toolbar');
        var types = ['textbox' ,'checkbox', 'menulist', 'listbox'];
        var items = [];
        for (var t = 0; t < toolbars.length; t++) {
            for (var i in types) {
                var list = toolbars[t].getElementsByTagName(types[i]);
                for (var j = 0; j < list.length; j++) {
                    items.push({ id: list[j].id, type: types[i], value: list[j].value, checked: list[j].checked })
                }
            }
        }
        return items;
    },
    restorePreferences: function()
    {
        var items = this.getInputItems();
        for (var i in items) {
            switch (items[i].type) {
            case "checkbox":
                $(items[i].id).checked = ew_prefs.getBoolPreference(items[i].id, false);
                break;

            default:
                $(items[i].id).value = ew_prefs.getStringPreference(items[i].id);
            }
        }
    },
    savePreferences: function()
    {
        var items = this.getInputItems();
        for (var i in items) {
            switch (items[i].type) {
            case "checkbox":
                ew_prefs.setBoolPreference(items[i].id, items[i].checked);
                break;

            default:
                ew_prefs.setStringPreference(items[i].id, items[i].value);
            }
        }
    },
    init: function(tree, tab)
    {
        // Tree owner and tab object, tab with owner field refers to the primary tab object
        tree.view = this;
        this.tree = tree;
        this.tab = tab;
        // Collect columns into array
        for (var j = 0; j < tree.columns.length; j++) {
            var col = tree.columns.getColumnAt(j);
            this.columns.push(col.id);
        }
        // Wrapping handlers to preserve correct context for 'this'
        if (!tab.owner) {
            (function(v) { var me = v; tree.addEventListener('dblclick', function(e) { e.stopPropagation();me.viewDetails(e); }, false); }(this));
            (function(v) { var me = v; tree.addEventListener('select', function(e) { e.stopPropagation();me.selectionChanged(e); }, false); }(this));
            (function(v) { var me = v; tree.addEventListener('click', function(e) { e.stopPropagation();me.clicked(e); }, false); }(this));
        }
    },
};

var ew_ListBox = {
    header: [],
    name: null,
    columns: null,
    multiple: false,
    width: 400,
    listItems: [],
    checkedItems: [],
    selectedIndex: -1,
    selectedIndexes: [],
    selectedItems: [],
    session: null,

    done: function()
    {
        var list = $(this.name);
        this.selectedIndex = list.selectedIndex;
        if (this.multiple) {
            for (var i in this.listItems) {
                var cell = $(this.name + '.check' + i);
                if (cell && cell.hasAttribute('checked', 'true')) {
                    this.selectedIndexes.push(i);
                    this.selectedItems.push(this.listItems[i]);
                }
            }
        }
        return true;
    },

    init: function() {
        this.selectedIndex = -1;
        this.selectedIndexes = [];
        this.selectedItems = [];
        var list = $(this.name);
        list.width = this.width;
        for (var i in this.listItems) {
            if (this.listItems[i] == null) continue;
            if (this.multiple) {
                var row = document.createElement('listitem');
                var cell = document.createElement('listcell');
                cell.setAttribute('type', 'checkbox');
                cell.setAttribute('id', this.name + '.check' + i);
                // Check if this item is already selected
                for (var j in this.checkedItems) {
                    if (this.listItems[i] == this.checkedItems[j]) {
                        cell.setAttribute('checked', 'true');
                        break;
                    }
                }
                row.appendChild(cell);
                cell = document.createElement('listcell');
                cell.setAttribute('label', this.toItem(this.listItems[i]));
                row.appendChild(cell);
                list.appendChild(row);
            } else {
                list.appendItem(this.toItem(this.listItems[i]), i);
            }
        }
        list.selectedIndex = 0;
        for (var i in this.header) {
            var hdr = $(this.name + '.header' + i)
            if (hdr) hdr.setAttribute('label', this.header[i]);
        }
    },

    selectionChanged: function() {
        if (this.multiple) {
            var list = $(this.name);
            if (list.currentIndex == -1) return;
            var cell = $(this.name + '.check' + list.currentIndex);
            if (!cell) return;
            var checked = cell.getAttribute('checked');
            if (!checked || checked == "false") {
                cell.setAttribute('checked', 'true');
            } else {
                cell.setAttribute('checked','false');
            }
        }
    },

    // Convert object into plain text to be used by list box
    toItem: function(obj)
    {
        return this.session.model.toString(obj, this.columns);
    },
};

var FileIO = {
    localfileCID : '@mozilla.org/file/local;1',
    localfileIID : Components.interfaces.nsILocalFile,
    finstreamCID : '@mozilla.org/network/file-input-stream;1',
    finstreamIID : Components.interfaces.nsIFileInputStream,
    foutstreamCID : '@mozilla.org/network/file-output-stream;1',
    foutstreamIID : Components.interfaces.nsIFileOutputStream,
    sinstreamCID : '@mozilla.org/scriptableinputstream;1',
    sinstreamIID : Components.interfaces.nsIScriptableInputStream,
    suniconvCID : '@mozilla.org/intl/scriptableunicodeconverter',
    suniconvIID : Components.interfaces.nsIScriptableUnicodeConverter,
    bufstreamCID: "@mozilla.org/network/buffered-input-stream;1",
    bufstreamIID: Components.interfaces.nsIBufferedInputStream,

    exists : function(path)
    {
        try {
            var file = Components.classes[this.localfileCID].createInstance(this.localfileIID);
            file.initWithPath(path);
            return file.exists();
        }
        catch (e) {
            return false;
        }
    },

    remove : function(path)
    {
        try {
            var file = Components.classes[this.localfileCID].createInstance(this.localfileIID);
            file.initWithPath(path);
            return file.remove(false);
        }
        catch (e) {
            return false;
        }
    },

    open : function(path)
    {
        try {
            var file = Components.classes[this.localfileCID].createInstance(this.localfileIID);
            file.initWithPath(path);
            return file;
        }
        catch (e) {
            return false;
        }
    },

    streamOpen : function(file)
    {
        try {
            var fd = this.open(file);
            var fStream = Components.classes[this.finstreamCID].createInstance(this.finstreamIID);
            var sStream = Components.classes[this.bufstreamCID].createInstance(this.bufstreamIID);
            fStream.init(fd, 1, 0, false);
            sStream.init(fStream, 9000000);
            return [fStream, sStream, fd];
        }
        catch (e) {
            return null;
        }
    },

    streamClose: function(file)
    {
        try { if (file && file[0]) file[0].close(); } catch(e) {}
        try { if (file && file[1]) file[1].close(); } catch(e) {}
        try { if (file && file[3]) file[3].close(); } catch(e) {}
    },

    read : function(file, charset)
    {
        try {
            var data = new String();
            var fStream = Components.classes[this.finstreamCID].createInstance(this.finstreamIID);
            var sStream = Components.classes[this.sinstreamCID].createInstance(this.sinstreamIID);
            fStream.init(file, 1, 0, false);
            sStream.init(fStream);
            data += sStream.read(-1);
            sStream.close();
            fStream.close();
            if (charset) {
                data = this.toUnicode(charset, data);
            }
            return data;
        }
        catch (e) {
            debug("FileIO: read: " + e)
            return false;
        }
    },

    write : function(file, data, mode, charset)
    {
        try {
            var fStream = Components.classes[this.foutstreamCID].createInstance(this.foutstreamIID);
            if (charset) {
                data = this.fromUnicode(charset, data);
            }
            var flags = 0x02 | 0x08 | 0x20; // wronly | create | truncate
            if (mode == 'a') {
                flags = 0x02 | 0x10; // wronly | append
            }
            fStream.init(file, flags, 0600, 0);
            fStream.write(data, data.length);
            fStream.close();
            return true;
        }
        catch (e) {
            debug("FileIO: write: " + e)
            return false;
        }
    },

    create : function(file)
    {
        try {
            file.create(0x00, 0600);
            return true;
        }
        catch (e) {
            debug(e)
            return false;
        }
    },

    unlink : function(file)
    {
        try {
            file.remove(false);
            return true;
        }
        catch (e) {
            return false;
        }
    },

    path : function(file)
    {
        try {
            return 'file:///' + file.path.replace(/\\/g, '\/').replace(/^\s*\/?/, '').replace(/\ /g, '%20');
        }
        catch (e) {
            return false;
        }
    },

    toUnicode : function(charset, data)
    {
        try {
            var uniConv = Components.classes[this.suniconvCID].createInstance(this.suniconvIID);
            uniConv.charset = charset;
            data = uniConv.ConvertToUnicode(data);
        }
        catch (e) {

        }
        return data;
    },

    toString : function(path)
    {
        var data = "";
        try {
            data = this.read(this.open(path))
        }
        catch (e) {
            debug("toString:" + path + ": " + e)
        }
        return data
    },

    fromUnicode : function(charset, data)
    {
        try {
            var uniConv = Components.classes[this.suniconvCID].createInstance(this.suniconvIID);
            uniConv.charset = charset;
            data = uniConv.ConvertFromUnicode(data);
        }
        catch (e) {
        }
        return data;
    }

}

// Directory service get properties
// ProfD profile directory
// DefProfRt user (for example /root/.mozilla)
// UChrm %profile%/chrome
// DefRt %installation%/defaults
// PrfDef %installation%/defaults/pref
// ProfDefNoLoc %installation%/defaults/profile
// APlugns %installation%/plugins
// AChrom %installation%/chrome
// ComsD %installation%/components
// CurProcD installation (usually)
// Home OS root (for example /root)
// TmpD OS tmp (for example /tmp)
// ProfLD Local Settings on windows; where the network cache and fastload files
// are stored
// resource:app application directory in a XULRunner app
// Desk Desktop directory (for example ~/Desktop on Linux, C:\Documents and
// Settings\username\Desktop on Windows)
// Progs User start menu programs directory (for example C:\Documents and
// Settings\username\Start Menu\Programs)

var DirIO = {
    sep : navigator.platform.toLowerCase().indexOf('win') > -1 ? '\\' : '/',
    dirservCID : '@mozilla.org/file/directory_service;1',
    propsIID : Components.interfaces.nsIProperties,
    fileIID : Components.interfaces.nsIFile,

    get : function(type)
    {
        try {
            return Components.classes[this.dirservCID].createInstance(this.propsIID).get(type, this.fileIID);
        }
        catch (e) {
            return false;
        }
    },

    open : function(path)
    {
        return FileIO.open(path);
    },

    create : function(dir, mode)
    {
        try {
            dir.create(0x01, 0600);
            return true;
        }
        catch (e) {
            debug(e)
            return false;
        }
    },

    mkpath: function(path)
    {
        try {
            var i = 0
            var dirs = path.split(this.sep);
            if (dirs.length == 0) return 0
            if (isWindows(navigator.platform)) {
                path = dirs[0];
                i++;
            } else {
                path = ""
            }
            while (i < dirs.length) {
                path += this.sep + dirs[i];
                if (!FileIO.exists(path) && !DirIO.create(FileIO.open(path))) {
                    return false
                }
                i++;
            }
            return true;
        }
        catch (e) {
            debug(e)
            return false;
        }
    },

    read : function(dir, recursive)
    {
        var list = new Array();
        try {
            if (dir.isDirectory()) {
                if (recursive == null) {
                    recursive = false;
                }
                var files = dir.directoryEntries;
                list = this._read(files, recursive);
            }
        }
        catch (e) {
        }
        return list;
    },

    _read : function(dirEntry, recursive)
    {
        var list = new Array();
        try {
            while (dirEntry.hasMoreElements()) {
                list.push(dirEntry.getNext().QueryInterface(FileIO.localfileIID));
            }
            if (recursive) {
                var list2 = new Array();
                for ( var i = 0; i < list.length; ++i) {
                    if (list[i].isDirectory()) {
                        files = list[i].directoryEntries;
                        list2 = this._read(files, recursive);
                    }
                }
                for (i = 0; i < list2.length; ++i) {
                    list.push(list2[i]);
                }
            }
        }
        catch (e) {
        }
        return list;
    },

    unlink : function(dir, recursive)
    {
        try {
            if (recursive == null) {
                recursive = false;
            }
            dir.remove(recursive);
            return true;
        }
        catch (e) {
            return false;
        }
    },

    path : function(dir)
    {
        return FileIO.path(dir);
    },

    split : function(str, join)
    {
        var arr = str.split(/\/|\\/), i;
        str = new String();
        for (i = 0; i < arr.length; ++i) {
            str += arr[i] + ((i != arr.length - 1) ? join : '');
        }
        return str;
    },

    join : function(str, split)
    {
        var arr = str.split(split), i;
        str = new String();
        for (i = 0; i < arr.length; ++i) {
            str += arr[i] + ((i != arr.length - 1) ? this.sep : '');
        }
        return str;
    },

    fileName: function(path)
    {
        var arr = path.split(/\/|\\/)
        return arr.length ? arr[arr.length - 1] : ""
    },
}

// Base64 encode / decode http://www.webtoolkit.info/javascript-base64.html
var Base64 = {
   _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

   encode : function(input)
   {
       var output = "";
       var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
       var chr1g, chr2g, chr3g;
       var i = 0;

       if (typeof input === 'string') {
           input = toByteArray(input);
       }

       while (i < input.length) {
           // Initialize all variables to 0
           chr1 = chr2 = chr3 = 0;
           chr1g = chr2g = chr3g = true;

           if (i < input.length)
               chr1 = input[i++];
           else chr1g = false;

           if (i < input.length)
               chr2 = input[i++];
           else chr2g = false;

           if (i < input.length)
               chr3 = input[i++];
           else chr3g = false;

           enc1 = chr1 >> 2;
           enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
           enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
           enc4 = chr3 & 63;

           if (!chr2g) {
               enc3 = enc4 = 64;
           } else
               if (!chr3g) {
                   enc4 = 64;
               }

           output = output + this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) + this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
       }

       return output;
   },

   // public method for decoding
   decode : function(input)
   {
       var output = "";
       var chr1, chr2, chr3;
       var enc1, enc2, enc3, enc4;
       var i = 0;

       input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

       while (i < input.length) {
           chr1 = chr2 = chr3 = 0;

           enc1 = this._keyStr.indexOf(input.charAt(i++));
           if (i < input.length) enc2 = this._keyStr.indexOf(input.charAt(i++));
           if (i < input.length) enc3 = this._keyStr.indexOf(input.charAt(i++));
           if (i < input.length) enc4 = this._keyStr.indexOf(input.charAt(i++));

           chr1 = (enc1 << 2) | ((enc2 & 0x30) >> 4);
           chr2 = ((enc2 & 15) << 4) | ((enc3 & 0x3c) >> 2);
           chr3 = ((enc3 & 3) << 6) | enc4;

           output = output + String.fromCharCode(chr1);

           if (enc3 != 64) {
               output = output + String.fromCharCode(chr2);
           }
           if (enc4 != 64) {
               output = output + String.fromCharCode(chr3);
           }
       }

       return output;

   },

   // private method for UTF-8 encoding
   _utf8_encode : function(string)
   {
       string = string.replace(/\r\n/g, "\n");
       var utftext = "";

       for ( var n = 0; n < string.length; n++) {

           var c = string.charCodeAt(n);

           if (c < 128) {
               utftext += String.fromCharCode(c);
           } else
               if ((c > 127) && (c < 2048)) {
                   utftext += String.fromCharCode((c >> 6) | 192);
                   utftext += String.fromCharCode((c & 63) | 128);
               } else {
                   utftext += String.fromCharCode((c >> 12) | 224);
                   utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                   utftext += String.fromCharCode((c & 63) | 128);
               }

       }

       return utftext;
   },

   // private method for UTF-8 decoding
   _utf8_decode : function(utftext)
   {
       var string = "";
       var i = 0;
       var c = c1 = c2 = 0;

       while (i < utftext.length) {

           c = utftext.charCodeAt(i);

           if (c < 128) {
               string += String.fromCharCode(c);
               i++;
           } else
               if ((c > 191) && (c < 224)) {
                   c2 = utftext.charCodeAt(i + 1);
                   string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                   i += 2;
               } else {
                   c2 = utftext.charCodeAt(i + 1);
                   c3 = utftext.charCodeAt(i + 2);
                   string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                   i += 3;
               }

       }

       return string;
   }
}

function $(element)
{
    if (arguments.length > 1) {
        for ( var i = 0, elements = [], length = arguments.length; i < length; i++) {
            elements.push(document.getElementById(arguments[i]));
        }
        return elements;
    }
    return document.getElementById(String(element));
}

function sleep(ms)
{
    var thread = Components.classes["@mozilla.org/thread-manager;1"].getService(Components.interfaces.nsIThreadManager).currentThread;
    var start = new Date().getTime();
    while (new Date().getTime() - start < ms) {
        thread.processNextEvent(true);
    }
}

function waitForFile(file, ms)
{
    var thread = Components.classes["@mozilla.org/thread-manager;1"].getService(Components.interfaces.nsIThreadManager).currentThread;
    var start = new Date().getTime();
    while (!FileIO.exists(file) && new Date().getTime() - start < ms) {
        thread.processNextEvent(true);
    }
    return FileIO.exists(file);
}

// Deep copy of an object
function cloneObject(obj)
{
    if (typeof obj != "object") return obj;
    var newObj = (obj instanceof Array) ? [] : {};
    for (i in obj) {
        if (obj[i] && typeof obj[i] == "object") {
            newObj[i] = cloneObject(obj[i]);
        } else {
            newObj[i] = obj[i]
        }
    }
    return newObj;
}

// Return name of the class for given object
function className(o) {
    var t;
    if (o === null) return "null";
    if ((t = typeof o) !== "object") return t;
    if ((t = Object.prototype.toString.call(o).slice(8,-1)) !== "Object") return t;
    if (o.constructor && typeof o.constructor === "function" && (t = o.constructor.className())) return t;
    return "Object";
}

function getNodeValue(item, nodeName, childName)
{
    function _getNodeValue(parent, nodeName) {
        var node = parent ? parent.getElementsByTagName(nodeName)[0] : null;
        return node && node.firstChild ? node.firstChild.nodeValue : "";
    }
    if (childName) {
        return _getNodeValue(item.getElementsByTagName(nodeName)[0], childName);
    } else {
        return _getNodeValue(item, nodeName);
    }
}

function plainList(list, id)
{
    var nlist = [];
    for (var i in list) {
        nlist.push(list[i][id]);
    }
    return nlist;
}

function uniqueList(list, id)
{
    var nlist = new Array();
    o:for (var i in list) {
        for (var j = 0; j < nlist.length; j++) {
            if (id) {
                if (nlist[j][id] == list[i][id]) continue o;
            } else {
                if (nlist[j] == list[i]) continue o;
            }
        }
        nlist.push(list[i]);
    }
    return nlist;
}

function parseQuery(str)
{
    var a = str.split("?");
    if (a[1]) {
        a = a[1].split("&");
    }
    var o = {};
    for (var i = 0; i < a.length; ++i) {
        var parts = a[i].split("=");
        o[parts[0]] = parts[1] ? parts[1] : true;
    }
    return o;
}

function trim(s)
{
    return s.replace(/^\s*/, '').replace(/\s*$/, '');
}

function sanitize(val)
{
    return trim(val).replace(/[ ]+/g, "");
}

function escapepath(path)
{
    return path && isWindows(navigator.platform) ? path.replace(/\s/g, "\\ ") : path;
}

function quotepath(path)
{
    return path && path.indexOf(' ') > 0 ? '"' + path + '"' : path;
}

//Poor-man's tokeniser.
//Splits a string into tokens on spaces.
//Spaces are ignored for strings wrapped in " or '.
//To insert a " or ', wrap inside ' or ", respectively.
//"a b" c'd e'f => [a b,cd ef]
//"c'd" => [c'd]
function tokenise(s)
{
    var tokens = [];
    var sep = ' ';
    var tok = '';

    for ( var i = 0; i < s.length; i++) {
        var ch = s[i];
        if (ch == sep) {
            if (sep == ' ') {
                if (tok.length > 0) {
                    tokens.push(tok);
                }
                tok = '';
            } else {
                sep = ' ';
            }
        } else
        if (sep == ' ' && (ch == '"' || ch == "'")) {
             sep = ch;
        } else {
            tok += ch;
        }
    }
    if (tok.length > 0) {
        tokens.push(tok);
    }
    return tokens;
}

function readPublicKey(file)
{
    var body = ""
    var lines = FileIO.toString(file).split("\n");
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf("---") == -1) {
            body += lines[i].trim()
        }
    }
    return Base64.encode(body.trim())
}

function newWindow()
{
    window.openDialog("chrome://ew/content/ew_window.xul");
}

function log(msg)
{
    if (ew_prefs.isDebugEnabled()) {
        debug(msg)
    }
}

function debug(msg)
{
    try {
        if (this.consoleService == null) {
            this.consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
        }
        this.consoleService.logStringMessage("[ ew ] [" + (new Date()).strftime("%Y-%m-%d %H:%M:%S") + "] " + msg);
    }
    catch (e) {
        alert("debug:" + e)
    }
}

function generateS3Policy(bucket, prefix, validity)
{
    var validHours = 24;
    var expiry = new Date();
    if (validity != null) {
        validHours = validity;
    }
    expiry.setTime(expiry.getTime() + validHours * 60 * 60 * 1000);
    var expiryStr = expiry.toISO8601String(5);
    return (policyStr = '{' + '"expiration": "' + expiryStr + '",' + '"conditions": [' + '{"bucket": "' + bucket + '"},' + '{"acl": "ec2-bundle-read"},' + '["starts-with", "$key", "' + prefix + '"]' + ']}');
}

function toByteArray(str)
{
    var bArray = new Array();
    for ( var i = 0; i < str.length; ++i) {
        bArray.push(str.charCodeAt(i));
    }
    return bArray;
}

function byteArrayToString(arr)
{
    return eval("String.fromCharCode(" + arr.join(",") + ")");
}

function isWindows(platform)
{
    return platform.match(regExs['win']);
}

function isMacOS(platform)
{
    return platform.match(regExs['mac']);
}

function isEbsRootDeviceType(rootDeviceType)
{
    return (rootDeviceType == 'ebs');
}

function isVpc(instance)
{
    return (instance.vpcId != '');
}

function secondsToDays(secs)
{
    var dur = parseInt(secs);
    // duration is provided in seconds. Let's convert it to years
    dur = Math.floor(dur / (60 * 60 * 24));
    return dur.toString();
}

function secondsToYears(secs)
{
    var dur = parseInt(secondsToDays(secs));
    // duration is provided in days. Let's convert it to years
    dur = dur / (365);
    return dur.toString();
}

function getProperty(key)
{
    try {
        return document.getElementById('ew.properties.bundle').getString(key);
    }
    catch (e) {
        return "";
    }
}
