function $(element)
{
    if (arguments.length > 1) {
        for ( var i = 0, elements = [], length = arguments.length; i < length; i++) {
            elements.push(document.getElementById(arguments[i]));
        }
        return elements;
    }
    return document.getElementById(element + '');
}

function empty()
{
}

function generateCSVForObject(obj)
{
    var pairs = new Array();
    for (k in obj) {
        if (obj.hasOwnProperty(k)) {
            var v = obj[k];
            if (v != null) {
                if (typeof v === 'object') {
                    pairs.push(generateCSVForObject(v));
                } else
                    if (typeof v != 'function') {
                        pairs.push(v);
                    }
            }
        }
    }
    return pairs.join(',');
}

var TreeView = {
    COLNAMES : [ 'name' ],
    treeBox : null,
    treeList : new Array(),
    selection : null,
    registered : false,
    model : null,

    rowCount : function() {
        return this.treeList.length;
    },
    setTree : function(treeBox) {
        this.treeBox = treeBox;
    },
    getCellText : function(idx, column) {
        return idx >= this.rowCount ? "" : this.treeList[idx][column.id.split(".").pop()];
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
        return this.selection.currentIndex == -1 ? null : this.treeList[this.selection.currentIndex];
    },
    getImageSrc : function(idx, column) {
        return ""
    },
    getProgressMode : function(idx, column) {
    },
    getCellValue : function(idx, column) {
    },
    notifyModelChanged : function(interest) {
        this.invalidate();
    },
    selectionChanged : function() {
    },
    cycleCell : function(idx, column) {
    },
    performAction : function(action) {
    },
    performActionOnCell : function(action, index, column) {
    },
    getRowProperties : function(idx, column, prop) {
    },
    getCellProperties : function(idx, column, prop) {
    },
    getColumnProperties : function(column, element, prop) {
    },
    getLevel : function(idx) {
        return 0;
    },
    cycleHeader : function(col) {
        var item = this.getSelected();
        cycleHeader(col, document, this.COLNAMES, this.treeList);
        this.treeBox.invalidate();
        if (item && item.name) this.select(item);
    },
    sort : function() {
        var item = this.getSelected();
        sortView(document, this.COLNAMES, this.treeList);
        if (item && item.name) this.select(item);
    },
    register : function() {
        if (!this.registered) {
            this.registered = true;
            ec2ui_model.registerInterest(this, this.model);
        }
    },
    find: function(obj) {
        if (obj) {
            for (var i in this.treeList) {
                if (obj.id && obj.id != "" && this.treeList[i].id == obj.id) return i;
                if (obj.name && obj.name != "" && this.treeList[i].name == obj.name) return i;
            }
        }
        return -1;
    },
    select : function(obj) {
        var i = this.find(obj)
        if (i >= 0) {
            this.selection.select(i);
            this.treeBox.ensureRowIsVisible(i);
        }
    },
    refresh : function() {
        ec2ui_model.refreshModel(this.model);
    },
    invalidate : function() {
        this.display(this.filter(ec2ui_model.getModel(this.model)));
    },
    filter : function(list) {
        return list;
    },
    display : function(list) {
        if (!list) {
            list = [];
        }
        this.treeBox.rowCountChanged(0, -this.treeList.length);
        this.treeList = list;
        this.treeBox.rowCountChanged(0, this.treeList.length);
        this.sort();
        this.selection.clearSelection();
        if (this.treeList.length > 0) {
            this.selection.select(0);
        }
    }
};

function sortView(document, cols, list)
{
    // cols is a list of column ids. The portion after the first. must
    // be the name of the corresponding attribute of the objects in +list.
    var sortField = null;
    var ascending = null;
    for ( var i in cols) {
        var col = cols[i];
        if (document.getElementById(col) != null) {
            var direction = document.getElementById(col).getAttribute("sortDirection");
        }

        if (direction && direction != "natural") {
            ascending = (direction == "ascending");
            sortField = col.slice(col.indexOf(".") + 1);
            break;
        }
    }

    if (sortField != null) {
        var sortFunc = function(a, b)
        {
            var aVal = eval("a." + sortField) || "";
            var bVal = eval("b." + sortField) || "";
            var aF = parseFloat(aVal);
            // Check that:
            // 1. aF is a number
            // 2. aVal isn't a string that starts with a number
            // eg. 123ABCD
            if (!isNaN(aF) && aF.toString() == aVal) {
                // These are numbers
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
}

function cycleHeader(col, document, columnIdList, list)
{
    var csd = col.element.getAttribute("sortDirection");
    var sortDirection = (csd == "ascending" || csd == "natural") ? "descending" : "ascending";
    for ( var i = 0; i < col.columns.count; i++) {
        col.columns.getColumnAt(i).element.setAttribute("sortDirection", "natural");
    }
    col.element.setAttribute("sortDirection", sortDirection);
    sortView(document, columnIdList, list);
}

function getNodeValueByName(parent, nodeName)
{
    var node = parent ? parent.getElementsByTagName(nodeName)[0] : null;
    return node && node.firstChild ? node.firstChild.nodeValue : "";
}

function methodPointer(obj, method)
{
    var wrap = function(x)
    {
        obj.method(x);
    }
}

function trim(s)
{
    return s.replace(/^\s*/, '').replace(/\s*$/, '');
}

function sanitize(val)
{
    return trim(val).replace(/[ ]+/g, "");
}

function getProperty(name, defValue)
{
    try {
        return document.getElementById('ec2ui.properties.bundle').getString(name);
    }
    catch (e) {
        return defValue;
    }
}

function getIPFromHostname(instance)
{
    if (instance.publicDnsName) {
        var parts = instance.publicDnsName.split('-');
        return parts[1] + "." + parts[2] + "." + parts[3] + "." + parseInt(parts[4]);
    }
    return ""
}

function readPublicKey(file)
{
    var body = ""
    var lines = FileIO.toString(file).split("\n");
    for ( var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf("---") == -1) {
            body += lines[i].trim()
        }
    }
    return Base64.encode(body.trim())
}

function addZero(vNumber)
{
    return ((vNumber < 10) ? "0" : "") + vNumber;
}

function formatDate(vDate, vFormat)
{
    var vDay = addZero(vDate.getUTCDate());
    var vMonth = addZero(vDate.getUTCMonth() + 1);
    var vYearLong = addZero(vDate.getUTCFullYear());
    var vYearShort = addZero(vDate.getUTCFullYear().toString().substring(3, 4));
    var vYear = (vFormat.indexOf("yyyy") > -1 ? vYearLong : vYearShort);
    var vHour = addZero(vDate.getUTCHours());
    var vMinute = addZero(vDate.getUTCMinutes());
    var vSecond = addZero(vDate.getUTCSeconds());
    var vDateString = vFormat.replace(/dd/g, vDay).replace(/MM/g, vMonth).replace(/y{1,4}/g, vYear);
    vDateString = vDateString.replace(/hh/g, vHour).replace(/mm/g, vMinute).replace(/ss/g, vSecond);
    return vDateString;
}

function log(msg)
{
    if (ec2ui_prefs.isDebugEnabled()) {
        debug(msg)
    }
}

function debug(msg)
{
    try {
        if (this.consoleService == null) {
            this.consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
        }
        this.consoleService.logStringMessage("[" + ec2ui_prefs.getAppName() + "] [" + formatDate(new Date(), "yyyy-MM-dd hh:mm:ss") + "] " + msg);
    }
    catch (e) {
    }
}

function copyToClipboard(text)
{
    this.str = null;
    this.trans = null;
    this.clip = null;

    if (this.str == null) {
        this.str = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
    }
    this.str.data = text;

    if (this.trans == null) {
        this.trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
    }
    this.trans.addDataFlavor("text/unicode");
    this.trans.setTransferData("text/unicode", this.str, text.length * 2);

    var clipid = Components.interfaces.nsIClipboard;

    if (this.clip == null) {
        this.clip = Components.classes["@mozilla.org/widget/clipboard;1"].getService(clipid);
    }
    clip.setData(this.trans, null, clipid.kGlobalClipboard);
}

// With thanks to http://delete.me.uk/2005/03/iso8601.html
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

// Poor-man's tokeniser.
// Splits a string into tokens on spaces.
// Spaces are ignored for strings wrapped in " or '.
// To insert a " or ', wrap inside ' or ", respectively.
// "a b" c'd e'f => [a b,cd ef]
// "c'd" => [c'd]
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

function generateS3Policy(bucket, prefix, validity)
{
    var EC2_CANNED_ACL = "ec2-bundle-read";
    var validHours = 24;
    var expiry = new Date();
    if (validity != null) {
        validHours = validity;
    }
    expiry.setTime(expiry.getTime() + validHours * 60 * 60 * 1000);

    var expiryStr = expiry.toISO8601String(5);

    return (policyStr = '{' + '"expiration": "' + expiryStr + '",' + '"conditions": [' + '{"bucket": "' + bucket + '"},' + '{"acl": "' + EC2_CANNED_ACL + '"},' + '["starts-with", "$key", "' + prefix + '"]' + ']}');
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

function sleep(msecs)
{
    var start = new Date().getTime();

    while (true) {
        if ((new Date().getTime() - start) > msecs) {
            break;
        }
    }
}

function tagResource(res, session, attr)
{
    if (!attr) attr = "id";
    var tag = prompt("Tag " + res[attr] + " with? (To untag, just clear the string)", res.tag || "");
    if (tag == null) return;

    res.tag = tag.trim();
    session.setResourceTag(res[attr], res.tag);
}

function __tagPrompt__(tag)
{
    var returnValue = {
        accepted : false,
        result : null
    };
    openDialog('chrome://ec2ui/content/dialog_tag.xul', null, 'chrome,centerscreen,modal,width=400,height=250', tag, returnValue);
    return returnValue.accepted ? (returnValue.result || '').trim() : null;
}

function tagEC2Resource(res, session, attr)
{
    if (!attr) attr = "id";

    var tag = __tagPrompt__(res.tag);

    if (tag == null) return;

    tag = tag.trim();
    res.tag = tag;
    __addNameTagToModel__(tag, res);
    session.setResourceTag(res[attr], res.tag);

    __tagging2ec2__([ res[attr] ], session, tag);
}

function __tagging2ec2__(resIds, session, tagString, disableDeleteTags)
{
    var multiIds = new Array();
    var multiTags = new Array();

    try {
        var tags = new Array();
        tagString += ',';
        var keyValues = (tagString.match(/\s*[^,":]+\s*:\s*("(?:[^"]|"")*"|[^,]*)\s*,\s*/g) || []);

        for ( var i = 0; i < keyValues.length; i++) {
            var kv = keyValues[i].split(/\s*:\s*/, 2);
            var key = (kv[0] || "").trim();
            var value = (kv[1] || "").trim();
            value = value.replace(/,\s*$/, '').trim();
            value = value.replace(/^"/, '').replace(/"$/, '').replace(/""/, '"');

            if (key.length == 0 || value.length == 0) {
                continue;
            }

            tags.push([ key, value ]);
        }

        for ( var i = 0; i < resIds.length; i++) {
            var resId = resIds[i];

            for ( var j = 0; j < tags.length; j++) {
                multiIds.push(resId);
            }

            multiTags = multiTags.concat(tags);
        }

        if (multiIds.length == 0) {
            multiIds = resIds;
        }

        session.controller.describeTags(resIds, function(described)
        {
            var delResIds = new Array();
            var delKyes = new Array();

            for ( var i = 0; i < described.length; i++) {
                delResIds.push(described[i][0]);
                delKyes.push(described[i][1]);
            }

            if (!disableDeleteTags) {
                if (delResIds.length > 0 && delKyes.length > 0) {
                    session.controller.deleteTags(delResIds, delKyes);
                }
            }

            if (multiTags.length > 0) {
                session.controller.createTags(multiIds, multiTags);
            }
        });
    }
    catch (e) {
        alert(e);
    }
}

function __calcLinuxMonthlyAmount__(types, endpoint)
{
    var rateSheets = {
        'us-east-1' : {
            't1.micro' : 14.4,
            'm1.small' : 61.2,
            'c1.medium' : 122.4,
            'm1.large' : 244.8,
            'm1.xlarge' : 489.6,
            'm2.xlarge' : 360.0,
            'm2.2xlarge' : 720,
            'm2.4xlarge' : 1440,
            'c1.xlarge' : 489.6,
            'cc1.4xlarge' : 1152.0,
            'cg1.4xlarge' : 1512.0
        },
        'us-west-1' : {
            't1.micro' : 18.0,
            'm1.small' : 68.4,
            'c1.medium' : 136.8,
            'm1.large' : 273.6,
            'm1.xlarge' : 547.2,
            'm2.xlarge' : 410.4,
            'm2.2xlarge' : 820.8,
            'm2.4xlarge' : 1641.6,
            'c1.xlarge' : 547.2
        },
        'eu-west-1' : {
            't1.micro' : 18.0,
            'm1.small' : 68.4,
            'c1.medium' : 136.8,
            'm1.large' : 273.6,
            'm1.xlarge' : 547.2,
            'm2.xlarge' : 410.4,
            'm2.2xlarge' : 820.8,
            'm2.4xlarge' : 1641.6,
            'c1.xlarge' : 547.2
        },
        'ap-southeast-1' : {
            't1.micro' : 18.0,
            'm1.small' : 68.4,
            'c1.medium' : 136.8,
            'm1.large' : 273.6,
            'm1.xlarge' : 547.2,
            'm2.xlarge' : 410.4,
            'm2.2xlarge' : 820.8,
            'm2.4xlarge' : 1641.6,
            'c1.xlarge' : 547.2
        },
        'ap-northeast-1' : {
            't1.micro' : 19.44,
            'm1.small' : 72.0,
            'c1.medium' : 144.0,
            'm1.large' : 288.0,
            'm1.xlarge' : 576.0,
            'm2.xlarge' : 432.0,
            'm2.2xlarge' : 864.0,
            'm2.4xlarge' : 1720.8,
            'c1.xlarge' : 576.0
        }
    };

    var rateSheet = rateSheets[endpoint];
    if (!rateSheet) {
        return null;
    }

    var amount = 0;

    for ( var t in types) {
        var n = types[t];
        var rate = (rateSheet[t] || 0);
        amount += (Math.floor(rate * 100) * n);
    }

    return amount / 100;
}

function __calcWindowsMonthlyAmount__(types, endpoint)
{
    var rateSheets = {
        'us-east-1' : {
            't1.micro' : 21.6,
            'm1.small' : 86.4,
            'c1.medium' : 208.8,
            'm1.large' : 345.6,
            'm1.xlarge' : 691.2,
            'm2.xlarge' : 446.4,
            'm2.2xlarge' : 892.8,
            'm2.4xlarge' : 1785.6,
            'c1.xlarge' : 835.2
        },
        'us-west-1' : {
            't1.micro' : 25.2,
            'm1.small' : 93.6,
            'c1.medium' : 223.2,
            'm1.large' : 374.4,
            'm1.xlarge' : 748.8,
            'm2.xlarge' : 496.8,
            'm2.2xlarge' : 993.6,
            'm2.4xlarge' : 1987.2,
            'c1.xlarge' : 892.8
        },
        'eu-west-1' : {
            't1.micro' : 25.2,
            'm1.small' : 86.4,
            'c1.medium' : 208.8,
            'm1.large' : 345.6,
            'm1.xlarge' : 691.2,
            'm2.xlarge' : 446.4,
            'm2.2xlarge' : 892.8,
            'm2.4xlarge' : 1785.6,
            'c1.xlarge' : 835.2
        },
        'ap-southeast-1' : {
            't1.micro' : 25.2,
            'm1.small' : 86.4,
            'c1.medium' : 208.8,
            'm1.large' : 345.6,
            'm1.xlarge' : 691.2,
            'm2.xlarge' : 446.4,
            'm2.2xlarge' : 892.8,
            'm2.4xlarge' : 1785.6,
            'c1.xlarge' : 835.2
        },
        'ap-northeast-1' : {
            't1.micro' : 25.2,
            'm1.small' : 86.4,
            'c1.medium' : 208.8,
            'm1.large' : 345.6,
            'm1.xlarge' : 691.2,
            'm2.xlarge' : 446.4,
            'm2.2xlarge' : 892.8,
            'm2.4xlarge' : 1785.6,
            'c1.xlarge' : 835.2
        }
    };

    var rateSheet = rateSheets[endpoint];
    if (!rateSheet) {
        return null;
    }

    var amount = 0;

    for ( var t in types) {
        var n = types[t];
        var rate = (rateSheet[t] || 0);
        amount += (Math.floor(rate * 100) * n);
    }

    return amount / 100;
}

function __calcRILinuxMonthlyAmount__(types, endpoint)
{
    var rateSheets = {
        'us-east-1' : {
            'm1.small' : [ 227.5, 350.0, 21.6 ],
            'm1.large' : [ 910.0, 1400.0, 86.4 ],
            'm1.xlarge' : [ 1820.0, 2800.0, 172.8 ],
            't1.micro' : [ 54.0, 82.0, 5.04 ],
            'm2.xlarge' : [ 1325.0, 2000.0, 122.4 ],
            'm2.2xlarge' : [ 2650.0, 4000.0, 244.8 ],
            'm2.4xlarge' : [ 5300.0, 8000.0, 489.6 ],
            'c1.medium' : [ 455.0, 700.0, 43.2 ],
            'c1.xlarge' : [ 1820.0, 2800.0, 172.8 ],
            'cc1.4xlarge' : [ 4290.0, 6590.0, 403.2 ],
            'cg1.4xlarge' : [ 5630.0, 8650.0, 532.8 ],
        },
        'us-west-1' : {
            'm1.small' : [ 227.5, 350.0, 28.8 ],
            'm1.large' : [ 910.0, 1400.0, 115.2 ],
            'm1.xlarge' : [ 1820.0, 2800.0, 230.4 ],
            't1.micro' : [ 54.0, 82.0, 7.2 ],
            'm2.xlarge' : [ 1325.0, 2000.0, 172.8 ],
            'm2.2xlarge' : [ 2650.0, 4000.0, 345.6 ],
            'm2.4xlarge' : [ 5300.0, 8000.0, 691.2 ],
            'c1.medium' : [ 455.0, 700.0, 57.6 ],
            'c1.xlarge' : [ 1820.0, 2800.0, 230.4 ],
        },
        'eu-west-1' : {
            'm1.small' : [ 227.5, 350.0, 28.8 ],
            'm1.large' : [ 910.0, 1400.0, 115.2 ],
            'm1.xlarge' : [ 1820.0, 2800.0, 230.4 ],
            't1.micro' : [ 54.0, 82.0, 7.2 ],
            'm2.xlarge' : [ 1325.0, 2000.0, 172.8 ],
            'm2.2xlarge' : [ 2650.0, 4000.0, 345.6 ],
            'm2.4xlarge' : [ 5300.0, 8000.0, 691.2 ],
            'c1.medium' : [ 455.0, 700.0, 57.6 ],
            'c1.xlarge' : [ 1820.0, 2800.0, 230.4 ],
        },
        'ap-southeast-1' : {
            'm1.small' : [ 227.5, 350.0, 28.8 ],
            'm1.large' : [ 910.0, 1400.0, 115.2 ],
            'm1.xlarge' : [ 1820.0, 2800.0, 230.4 ],
            't1.micro' : [ 54.0, 82.0, 7.2 ],
            'm2.xlarge' : [ 1325.0, 2000.0, 172.8 ],
            'm2.2xlarge' : [ 2650.0, 4000.0, 345.6 ],
            'm2.4xlarge' : [ 5300.0, 8000.0, 691.2 ],
            'c1.medium' : [ 455.0, 700.0, 57.6 ],
            'c1.xlarge' : [ 1820.0, 2800.0, 230.4 ],
        },
        'ap-northeast-1' : {
            'm1.small' : [ 239.0, 368.0, 32.4 ],
            'm1.large' : [ 956.0, 1470.0, 129.6 ],
            'm1.xlarge' : [ 1911.0, 2940.0, 259.2 ],
            't1.micro' : [ 57.0, 86.0, 7.92 ],
            'm2.xlarge' : [ 1391.0, 2100.0, 194.4 ],
            'm2.2xlarge' : [ 2783.0, 4200.0, 388.8 ],
            'm2.4xlarge' : [ 5565.0, 8400.0, 770.4 ],
            'c1.medium' : [ 478.0, 735.0, 64.8 ],
            'c1.xlarge' : [ 1911.0, 2940.0, 259.2 ],
        }
    };

    var rateSheet = rateSheets[endpoint];
    if (!rateSheet) {
        return [ 0, 0, 0 ];
    }

    var amounts = [ 0, 0, 0 ];

    for ( var t in types) {
        var n = types[t];
        var rates = (rateSheet[t] || [ 0, 0, 0 ]);
        amounts[0] += (Math.floor(rates[0] * 100) * n)
        amounts[1] += (Math.floor(rates[1] * 100) * n)
        amounts[2] += (Math.floor(rates[2] * 100) * n)
    }

    return [ amounts[0] / 100, amounts[1] / 100, amounts[2] / 100 ];
}

function __calcRIWindowsMonthlyAmount__(types, endpoint)
{
    var rateSheets = {
        'us-east-1' : {
            'm1.small' : [ 227.5, 350.0, 36.0 ],
            'm1.large' : [ 910.0, 1400.0, 144.0 ],
            'm1.xlarge' : [ 1820.0, 2800.0, 288.0 ],
            't1.micro' : [ 54.0, 82.0, 9.36 ],
            'm2.xlarge' : [ 1325.0, 2000.0, 172.8 ],
            'm2.2xlarge' : [ 2650.0, 4000.0, 345.6 ],
            'm2.4xlarge' : [ 5300.0, 8000.0, 691.2 ],
            'c1.medium' : [ 455.0, 700.0, 90.0 ],
            'c1.xlarge' : [ 1820.0, 2800.0, 360.0 ],
        },
        'us-west-1' : {
            'm1.small' : [ 227.5, 350.0, 43.2 ],
            'm1.large' : [ 910.0, 1400.0, 172.8 ],
            'm1.xlarge' : [ 1820.0, 2800.0, 345.6 ],
            't1.micro' : [ 54.0, 82.0, 11.52 ],
            'm2.xlarge' : [ 1325.0, 2000.0, 230.4 ],
            'm2.2xlarge' : [ 2650.0, 4000.0, 460.8 ],
            'm2.4xlarge' : [ 5300.0, 8000.0, 921.6 ],
            'c1.medium' : [ 455.0, 700.0, 104.4 ],
            'c1.xlarge' : [ 1820.0, 2800.0, 417.6 ],
        },
        'eu-west-1' : {
            'm1.small' : [ 227.5, 350.0, 43.2 ],
            'm1.large' : [ 910.0, 1400.0, 172.8 ],
            'm1.xlarge' : [ 1820.0, 2800.0, 345.6 ],
            't1.micro' : [ 54.0, 82.0, 11.52 ],
            'm2.xlarge' : [ 1325.0, 2000.0, 230.4 ],
            'm2.2xlarge' : [ 2650.0, 4000.0, 460.8 ],
            'm2.4xlarge' : [ 5300.0, 8000.0, 921.6 ],
            'c1.medium' : [ 455.0, 700.0, 104.4 ],
            'c1.xlarge' : [ 1820.0, 2800.0, 417.6 ],
        },
        'ap-southeast-1' : {
            'm1.small' : [ 227.5, 350.0, 43.2 ],
            'm1.large' : [ 910.0, 1400.0, 172.8 ],
            'm1.xlarge' : [ 1820.0, 2800.0, 345.6 ],
            't1.micro' : [ 54.0, 82.0, 11.52 ],
            'm2.xlarge' : [ 1325.0, 2000.0, 230.4 ],
            'm2.2xlarge' : [ 2650.0, 4000.0, 460.8 ],
            'm2.4xlarge' : [ 5300.0, 8000.0, 921.6 ],
            'c1.medium' : [ 455.0, 700.0, 104.4 ],
            'c1.xlarge' : [ 1820.0, 2800.0, 417.6 ],
        },
        'ap-northeast-1' : {
            'm1.small' : [ 239.0, 368.0, 46.8 ],
            'm1.large' : [ 956.0, 1470.0, 187.2 ],
            'm1.xlarge' : [ 1911.0, 2940.0, 374.4 ],
            't1.micro' : [ 57.0, 86.0, 15.12 ],
            'm2.xlarge' : [ 1391.0, 2100.0, 244.8 ],
            'm2.2xlarge' : [ 2783.0, 4200.0, 489.6 ],
            'm2.4xlarge' : [ 5565.0, 8400.0, 979.2 ],
            'c1.medium' : [ 478.0, 735.0, 115.2 ],
            'c1.xlarge' : [ 1911.0, 2940.0, 460.8 ],
        }
    };

    var rateSheet = rateSheets[endpoint];
    if (!rateSheet) {
        return [ 0, 0, 0 ];
    }

    var amounts = [ 0, 0, 0 ];

    for ( var t in types) {
        var n = types[t];
        var rates = (rateSheet[t] || [ 0, 0, 0 ]);
        amounts[0] += (Math.floor(rates[0] * 100) * n)
        amounts[1] += (Math.floor(rates[1] * 100) * n)
        amounts[2] += (Math.floor(rates[2] * 100) * n)
    }

    return [ amounts[0] / 100, amounts[1] / 100, amounts[2] / 100 ];
}

function parseHeaders(headers)
{
    var headerArr = new Array();
    var arr = headers.split("\n");
    for ( var i = 0; i < arr.length; i++) {
        var header = arr[i];
        var parts = header.split(":");
        headerArr[parts[0]] = parts[1];
    }
    return headerArr;
}

function isWindows(platform)
{
    return platform.match(ec2ui_utils.winRegex);
}

function isMacOS(platform)
{
    return platform.match(ec2ui_utils.macRegex);
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

function __addNameTagToModel__(tag, model)
{
    var kvs = tag.split(/\s*,\s*/);

    for ( var i = 0; i < kvs.length; i++) {
        var kv = kvs[i].split(/\s*:\s*/, 2);
        var key = kv[0].trim();
        var value = (kv[1] || "").trim();

        if (key == "Name") {
            model.name = value;
            return;
        }
    }

    model.name = null;
}

function __tagToName__(tag)
{
    var kvs = (tag || '').split(/\s*,\s*/);

    for ( var i = 0; i < kvs.length; i++) {
        var kv = kvs[i].split(/\s*:\s*/, 2);
        var key = kv[0].trim();
        var value = (kv[1] || "").trim();

        if (key == "Name") {
            return value;
        }
    }

    return null;
}

function __concatTags__(a, b)
{
    if (!a) {
        a = "";
    }
    if (!b) {
        b = "";
    }

    function putTagsToHash(tagString, hash)
    {
        tagString += ',';
        var kvs = (tagString.match(/\s*[^,":]+\s*:\s*("(?:[^"]|"")*"|[^,]*)\s*,\s*/g) || []);

        for ( var i = 0; i < kvs.length; i++) {
            var kv = kvs[i].split(/\s*:\s*/, 2);
            var key = kv[0].trim();
            var value = (kv[1] || "").trim();
            value = value.replace(/,\s*$/, '').trim();
            value = value.replace(/^"/, '').replace(/"$/, '').replace(/""/, '"');

            if (key && value) {
                if (/[,"]/.test(value)) {
                    value = value.replace(/"/g, '""');
                    value = '"' + value + '"';
                }

                hash[key] = value;
            }
        }
    }

    var tags = new Object();
    var tagArray = new Array();

    putTagsToHash(a, tags);
    putTagsToHash(b, tags);

    for ( var i in tags) {
        tagArray.push(i + ":" + tags[i]);
    }

    return tagArray.join(", ");
}

var protPortMap = {
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
    "all" : new RegExp("^a[kmr]i-[0-9a-f]{8}$")
};

// ec2ui_utils is akin to a static class
var ec2ui_utils = {

    winRegex : new RegExp(/^Win/i),
    macRegex : new RegExp(/^Mac/),

    tagMultipleResources : function(list, session, attr)
    {
        if (!list || !session) return;

        if (!attr) {
            attr = "id";
        }

        var tag = __tagPrompt__(list[0].tag);

        if (tag == null) return;

        var res = null;
        tag = tag.trim();
        for ( var i = 0; i < list.length; ++i) {
            res = list[i];
            res.tag = tag;
            session.setResourceTag(res[attr], res.tag);
        }
    },

    tagMultipleEC2Resources : function(list, session, attr)
    {
        if (!list || !session) return;

        if (!attr) {
            attr = "id";
        }

        var tag = __tagPrompt__(list[0].tag);

        if (!tag) return;

        var res = null;
        tag = tag.trim();
        var resIds = new Array();
        for ( var i = 0; i < list.length; ++i) {
            res = list[i];
            res.tag = __concatTags__(res.tag, tag);
            __addNameTagToModel__(res.tag, res);
            session.setResourceTag(res[attr], res.tag);
            resIds.push(res[attr]);
        }

        __tagging2ec2__(resIds, session, tag, true);
    },

    determineRegionFromString : function(str)
    {
        var region = "US-EAST-1";
        if (!str) {
            return region;
        }

        str = str.toLowerCase();
        // If str starts with:
        // us-east-1: region is US-EAST-1
        // us-west-1: region is US-WEST-1
        // eu-west-1: region is EU-WEST-1
        if (str.indexOf("us-west-1") >= 0) {
            region = "US-WEST-1";
        } else
            if (str.indexOf("eu-west-1") >= 0 || str == "eu") {
                region = "EU-WEST-1";
            }

        return region;
    },
    getMessageProperty : function(key, replacements)
    {
        if (!this._stringBundle) {
            const
            BUNDLE_SVC = Components.classes['@mozilla.org/intl/stringbundle;1'].getService(Components.interfaces.nsIStringBundleService);
            this._stringBundle = BUNDLE_SVC.createBundle("chrome://ec2ui/locale/ec2ui.properties");
        }
        try {
            if (!replacements)
                return this._stringBundle.GetStringFromName(key);
            else return this._stringBundle.formatStringFromName(key, replacements, replacements.length);
        }
        catch (e) {
            return "";
        }
    }
};

/* With due thanks to http://whytheluckystiff.net */
/* other support functions -- thanks, ecmanaut! */
var strftime_funks = {
    zeropad : function(n)
    {
        return n > 9 ? n : '0' + n;
    },
    a : function(t)
    {
        return [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ][t.getDay()]
    },
    A : function(t)
    {
        return [ 'Sunday', 'Monday', 'Tuedsay', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ][t.getDay()]
    },
    b : function(t)
    {
        return [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ][t.getMonth()]
    },
    B : function(t)
    {
        return [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ][t.getMonth()]
    },
    c : function(t)
    {
        return t.toString()
    },
    d : function(t)
    {
        return this.zeropad(t.getDate())
    },
    H : function(t)
    {
        return this.zeropad(t.getHours())
    },
    I : function(t)
    {
        return this.zeropad((t.getHours() + 12) % 12)
    },
    m : function(t)
    {
        return this.zeropad(t.getMonth() + 1)
    }, // month-1
    M : function(t)
    {
        return this.zeropad(t.getMinutes())
    },
    p : function(t)
    {
        return this.H(t) < 12 ? 'AM' : 'PM';
    },
    S : function(t)
    {
        return this.zeropad(t.getSeconds())
    },
    w : function(t)
    {
        return t.getDay()
    }, // 0..6 == sun..sat
    y : function(t)
    {
        return this.zeropad(this.Y(t) % 100);
    },
    Y : function(t)
    {
        return t.getFullYear()
    },
    '%' : function(t)
    {
        return '%'
    }
};

Date.prototype.strftime = function(fmt)
{
    var t = this;
    for ( var s in strftime_funks) {
        if (s.length == 1) fmt = fmt.replace('%' + s, strftime_funks[s](t));
    }
    return fmt;
};

if (typeof (TrimPath) != 'undefined') {
    TrimPath.parseTemplate_etc.modifierDef.strftime = function(t, fmt)
    {
        return new Date(t).strftime(fmt);
    }
}

/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1 Version 2.1a Copyright Paul Johnston 2000 - 2002. Other
 * contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet Distributed under the
 * BSD License See http://pajhome.org.uk/crypt/md5 for details.
 *
 * Configurable variables. You may need to tweak these to be compatible with the
 * server-side, but the defaults work in most cases.
 */
var hexcase = 0; /* hex output format. 0 - lowercase; 1 - uppercase */
var b64pad = "="; /* base-64 pad character. "=" for strict RFC compliance */
var chrsz = 8; /* bits per input character. 8 - ASCII; 16 - Unicode */

/*
 * These are the functions you'll usually want to call They take string
 * arguments and return either hex or base-64 encoded strings
 */
function hex_sha1(s)
{
    return binb2hex(core_sha1(str2binb(s), s.length * chrsz));
}
function b64_sha1(s)
{
    return binb2b64(core_sha1(str2binb(s), s.length * chrsz));
}
function str_sha1(s)
{
    return binb2str(core_sha1(str2binb(s), s.length * chrsz));
}
function hex_hmac_sha1(key, data)
{
    return binb2hex(core_hmac_sha1(key, data));
}
function b64_hmac_sha1(key, data)
{
    return binb2b64(core_hmac_sha1(key, data));
}
function str_hmac_sha1(key, data)
{
    return binb2str(core_hmac_sha1(key, data));
}

/*
 * Perform a simple self-test to see if the VM is working
 */
function sha1_vm_test()
{
    return hex_sha1("abc") == "a9993e364706816aba3e25717850c26c9cd0d89d";
}

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len)
{
    /* append padding */
    x[len >> 5] |= 0x80 << (24 - len % 32);
    x[((len + 64 >> 9) << 4) + 15] = len;

    var w = Array(80);
    var a = 1732584193;
    var b = -271733879;
    var c = -1732584194;
    var d = 271733878;
    var e = -1009589776;

    for ( var i = 0; i < x.length; i += 16) {
        var olda = a;
        var oldb = b;
        var oldc = c;
        var oldd = d;
        var olde = e;

        for ( var j = 0; j < 80; j++) {
            if (j < 16)
                w[j] = x[i + j];
            else w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
            var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)), safe_add(safe_add(e, w[j]), sha1_kt(j)));
            e = d;
            d = c;
            c = rol(b, 30);
            b = a;
            a = t;
        }

        a = safe_add(a, olda);
        b = safe_add(b, oldb);
        c = safe_add(c, oldc);
        d = safe_add(d, oldd);
        e = safe_add(e, olde);
    }
    return Array(a, b, c, d, e);

}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d)
{
    if (t < 20) return (b & c) | ((~b) & d);
    if (t < 40) return b ^ c ^ d;
    if (t < 60) return (b & c) | (b & d) | (c & d);
    return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t)
{
    return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514;
}

/*
 * Calculate the HMAC-SHA1 of a key and some data
 */
function core_hmac_sha1(key, data)
{
    var bkey = str2binb(key);
    if (bkey.length > 16) bkey = core_sha1(bkey, key.length * chrsz);

    var ipad = Array(16), opad = Array(16);
    for ( var i = 0; i < 16; i++) {
        ipad[i] = bkey[i] ^ 0x36363636;
        opad[i] = bkey[i] ^ 0x5C5C5C5C;
    }

    var hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
    return core_sha1(opad.concat(hash), 512 + 160);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally to
 * work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt)
{
    return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert an 8-bit or 16-bit string to an array of big-endian words In 8-bit
 * function, characters >255 have their hi-byte silently ignored.
 */
function str2binb(str)
{
    var bin = new Array();
    var mask = (1 << chrsz) - 1;
    for ( var i = 0; i < str.length * chrsz; i += chrsz) {
        bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (32 - chrsz - i % 32);
    }
    return bin;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2str(bin)
{
    var str = "";
    var mask = (1 << chrsz) - 1;
    for ( var i = 0; i < bin.length * 32; i += chrsz)
        str += String.fromCharCode((bin[i >> 5] >>> (32 - chrsz - i % 32)) & mask);
    return str;
}

/*
 * Convert an array of big-endian words to a hex string.
 */
function binb2hex(binarray)
{
    var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
    var str = "";
    for ( var i = 0; i < binarray.length * 4; i++) {
        str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) + hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
    }
    return str;
}

/*
 * Convert an array of big-endian words to a base-64 string
 */
function binb2b64(binarray)
{
    var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var str = "";
    for ( var i = 0; i < binarray.length * 4; i += 3) {
        var triplet = (((binarray[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) | (((binarray[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) | ((binarray[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF);
        for ( var j = 0; j < 4; j++) {
            if ((i * 8 + j * 6) > (binarray.length * 32))
                str += b64pad;
            else str += tab.charAt((triplet >> 6 * (3 - j)) & 0x3F);
        }
    }
    return str;
}

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

    read : function(file, charset)
    {
        try {
            var data = new String();
            var fiStream = Components.classes[this.finstreamCID].createInstance(this.finstreamIID);
            var siStream = Components.classes[this.sinstreamCID].createInstance(this.sinstreamIID);
            fiStream.init(file, 1, 0, false);
            siStream.init(fiStream);
            data += siStream.read(-1);
            siStream.close();
            fiStream.close();
            if (charset) {
                data = this.toUnicode(charset, data);
            }
            return data;
        }
        catch (e) {
            return false;
        }
    },

    write : function(file, data, mode, charset)
    {
        try {
            var foStream = Components.classes[this.foutstreamCID].createInstance(this.foutstreamIID);
            if (charset) {
                data = this.fromUnicode(charset, data);
            }
            var flags = 0x02 | 0x08 | 0x20; // wronly | create | truncate
            if (mode == 'a') {
                flags = 0x02 | 0x10; // wronly | append
            }
            foStream.init(file, flags, 0600, 0);
            foStream.write(data, data.length);
            foStream.close();
            return true;
        }
        catch (e) {
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
            // foobar!
        }
        return data;
    },

    toString : function(path)
    {
        var data = ""
        try {
            var fp = this.open(path)
            var data = this.read(fp)
        }
        catch (e) {
        }
        return data ? data : ""
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
    }
}

// Copyright (c) 2005 Tom Wu
// All Rights Reserved.
// See "LICENSE" for details.
// Basic JavaScript BN library - subset useful for RSA encryption.

// Bits per digit
var dbits;

// JavaScript engine analysis
var canary = 0xdeadbeefcafe;
var j_lm = ((canary & 0xffffff) == 0xefcafe);

// (public) Constructor
function BigInteger(a, b, c)
{
    if (a != null) if ("number" == typeof a)
        this.fromNumber(a, b, c);
    else
        if (b == null && "string" != typeof a)
            this.fromString(a, 256);
        else this.fromString(a, b);
}

// return new, unset BigInteger
function nbi()
{
    return new BigInteger(null);
}

// am: Compute w_j += (x*this_i), propagate carries,
// c is initial carry, returns final carry.
// c < 3*dvalue, x < 2*dvalue, this_i < dvalue
// We need to select the fastest one that works in this environment.

// am1: use a single mult and divide to get the high bits,
// max digit bits should be 26 because
// max internal value = 2*dvalue^2-2*dvalue (< 2^53)
function am1(i, x, w, j, c, n)
{
    while (--n >= 0) {
        var v = x * this[i++] + w[j] + c;
        c = Math.floor(v / 0x4000000);
        w[j++] = v & 0x3ffffff;
    }
    return c;
}
// am2 avoids a big mult-and-extract completely.
// Max digit bits should be <= 30 because we do bitwise ops
// on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
function am2(i, x, w, j, c, n)
{
    var xl = x & 0x7fff, xh = x >> 15;
    while (--n >= 0) {
        var l = this[i] & 0x7fff;
        var h = this[i++] >> 15;
        var m = xh * l + h * xl;
        l = xl * l + ((m & 0x7fff) << 15) + w[j] + (c & 0x3fffffff);
        c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
        w[j++] = l & 0x3fffffff;
    }
    return c;
}
// Alternately, set max digit bits to 28 since some
// browsers slow down when dealing with 32-bit numbers.
function am3(i, x, w, j, c, n)
{
    var xl = x & 0x3fff, xh = x >> 14;
    while (--n >= 0) {
        var l = this[i] & 0x3fff;
        var h = this[i++] >> 14;
        var m = xh * l + h * xl;
        l = xl * l + ((m & 0x3fff) << 14) + w[j] + c;
        c = (l >> 28) + (m >> 14) + xh * h;
        w[j++] = l & 0xfffffff;
    }
    return c;
}

if (j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
    BigInteger.prototype.am = am2;
    dbits = 30;
} else
    if (j_lm && (navigator.appName != "Netscape")) {
        BigInteger.prototype.am = am1;
        dbits = 26;
    } else { // Mozilla/Netscape seems to prefer am3
        BigInteger.prototype.am = am3;
        dbits = 28;
    }

BigInteger.prototype.DB = dbits;
BigInteger.prototype.DM = ((1 << dbits) - 1);
BigInteger.prototype.DV = (1 << dbits);

var BI_FP = 52;
BigInteger.prototype.FV = Math.pow(2, BI_FP);
BigInteger.prototype.F1 = BI_FP - dbits;
BigInteger.prototype.F2 = 2 * dbits - BI_FP;

// Digit conversions
var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
var BI_RC = new Array();
var rr, vv;
rr = "0".charCodeAt(0);
for (vv = 0; vv <= 9; ++vv)
    BI_RC[rr++] = vv;
rr = "a".charCodeAt(0);
for (vv = 10; vv < 36; ++vv)
    BI_RC[rr++] = vv;
rr = "A".charCodeAt(0);
for (vv = 10; vv < 36; ++vv)
    BI_RC[rr++] = vv;

function int2char(n)
{
    return BI_RM.charAt(n);
}
function intAt(s, i)
{
    var c = BI_RC[s.charCodeAt(i)];
    return (c == null) ? -1 : c;
}

// (protected) copy this to r
function bnpCopyTo(r)
{
    for ( var i = this.t - 1; i >= 0; --i)
        r[i] = this[i];
    r.t = this.t;
    r.s = this.s;
}

// (protected) set from integer value x, -DV <= x < DV
function bnpFromInt(x)
{
    this.t = 1;
    this.s = (x < 0) ? -1 : 0;
    if (x > 0)
        this[0] = x;
    else
        if (x < -1)
            this[0] = x + DV;
        else this.t = 0;
}

// return bigint initialized to value
function nbv(i)
{
    var r = nbi();
    r.fromInt(i);
    return r;
}

// (protected) set from string and radix
function bnpFromString(s, b)
{
    var k;
    if (b == 16)
        k = 4;
    else
        if (b == 8)
            k = 3;
        else
            if (b == 256)
                k = 8; // byte array
            else
                if (b == 2)
                    k = 1;
                else
                    if (b == 32)
                        k = 5;
                    else
                        if (b == 4)
                            k = 2;
                        else {
                            this.fromRadix(s, b);
                            return;
                        }
    this.t = 0;
    this.s = 0;
    var i = s.length, mi = false, sh = 0;
    while (--i >= 0) {
        var x = (k == 8) ? s[i] & 0xff : intAt(s, i);
        if (x < 0) {
            if (s.charAt(i) == "-") mi = true;
            continue;
        }
        mi = false;
        if (sh == 0)
            this[this.t++] = x;
        else
            if (sh + k > this.DB) {
                this[this.t - 1] |= (x & ((1 << (this.DB - sh)) - 1)) << sh;
                this[this.t++] = (x >> (this.DB - sh));
            } else this[this.t - 1] |= x << sh;
        sh += k;
        if (sh >= this.DB) sh -= this.DB;
    }
    if (k == 8 && (s[0] & 0x80) != 0) {
        this.s = -1;
        if (sh > 0) this[this.t - 1] |= ((1 << (this.DB - sh)) - 1) << sh;
    }
    this.clamp();
    if (mi) BigInteger.ZERO.subTo(this, this);
}

// (protected) clamp off excess high words
function bnpClamp()
{
    var c = this.s & this.DM;
    while (this.t > 0 && this[this.t - 1] == c)
        --this.t;
}

// (public) return string representation in given radix
function bnToString(b)
{
    if (this.s < 0) return "-" + this.negate().toString(b);
    var k;
    if (b == 16)
        k = 4;
    else
        if (b == 8)
            k = 3;
        else
            if (b == 2)
                k = 1;
            else
                if (b == 32)
                    k = 5;
                else
                    if (b == 4)
                        k = 2;
                    else return this.toRadix(b);
    var km = (1 << k) - 1, d, m = false, r = "", i = this.t;
    var p = this.DB - (i * this.DB) % k;
    if (i-- > 0) {
        if (p < this.DB && (d = this[i] >> p) > 0) {
            m = true;
            r = int2char(d);
        }
        while (i >= 0) {
            if (p < k) {
                d = (this[i] & ((1 << p) - 1)) << (k - p);
                d |= this[--i] >> (p += this.DB - k);
            } else {
                d = (this[i] >> (p -= k)) & km;
                if (p <= 0) {
                    p += this.DB;
                    --i;
                }
            }
            if (d > 0) m = true;
            if (m) r += int2char(d);
        }
    }
    return m ? r : "0";
}

// (public) -this
function bnNegate()
{
    var r = nbi();
    BigInteger.ZERO.subTo(this, r);
    return r;
}

// (public) |this|
function bnAbs()
{
    return (this.s < 0) ? this.negate() : this;
}

// (public) return + if this > a, - if this < a, 0 if equal
function bnCompareTo(a)
{
    var r = this.s - a.s;
    if (r != 0) return r;
    var i = this.t;
    r = i - a.t;
    if (r != 0) return r;
    while (--i >= 0)
        if ((r = this[i] - a[i]) != 0) return r;
    return 0;
}

// returns bit length of the integer x
function nbits(x)
{
    var r = 1, t;
    if ((t = x >>> 16) != 0) {
        x = t;
        r += 16;
    }
    if ((t = x >> 8) != 0) {
        x = t;
        r += 8;
    }
    if ((t = x >> 4) != 0) {
        x = t;
        r += 4;
    }
    if ((t = x >> 2) != 0) {
        x = t;
        r += 2;
    }
    if ((t = x >> 1) != 0) {
        x = t;
        r += 1;
    }
    return r;
}

// (public) return the number of bits in "this"
function bnBitLength()
{
    if (this.t <= 0) return 0;
    return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ (this.s & this.DM));
}

// (protected) r = this << n*DB
function bnpDLShiftTo(n, r)
{
    var i;
    for (i = this.t - 1; i >= 0; --i)
        r[i + n] = this[i];
    for (i = n - 1; i >= 0; --i)
        r[i] = 0;
    r.t = this.t + n;
    r.s = this.s;
}

// (protected) r = this >> n*DB
function bnpDRShiftTo(n, r)
{
    for ( var i = n; i < this.t; ++i)
        r[i - n] = this[i];
    r.t = Math.max(this.t - n, 0);
    r.s = this.s;
}

// (protected) r = this << n
function bnpLShiftTo(n, r)
{
    var bs = n % this.DB;
    var cbs = this.DB - bs;
    var bm = (1 << cbs) - 1;
    var ds = Math.floor(n / this.DB), c = (this.s << bs) & this.DM, i;
    for (i = this.t - 1; i >= 0; --i) {
        r[i + ds + 1] = (this[i] >> cbs) | c;
        c = (this[i] & bm) << bs;
    }
    for (i = ds - 1; i >= 0; --i)
        r[i] = 0;
    r[ds] = c;
    r.t = this.t + ds + 1;
    r.s = this.s;
    r.clamp();
}

// (protected) r = this >> n
function bnpRShiftTo(n, r)
{
    r.s = this.s;
    var ds = Math.floor(n / this.DB);
    if (ds >= this.t) {
        r.t = 0;
        return;
    }
    var bs = n % this.DB;
    var cbs = this.DB - bs;
    var bm = (1 << bs) - 1;
    r[0] = this[ds] >> bs;
    for ( var i = ds + 1; i < this.t; ++i) {
        r[i - ds - 1] |= (this[i] & bm) << cbs;
        r[i - ds] = this[i] >> bs;
    }
    if (bs > 0) r[this.t - ds - 1] |= (this.s & bm) << cbs;
    r.t = this.t - ds;
    r.clamp();
}

// (protected) r = this - a
function bnpSubTo(a, r)
{
    var i = 0, c = 0, m = Math.min(a.t, this.t);
    while (i < m) {
        c += this[i] - a[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
    }
    if (a.t < this.t) {
        c -= a.s;
        while (i < this.t) {
            c += this[i];
            r[i++] = c & this.DM;
            c >>= this.DB;
        }
        c += this.s;
    } else {
        c += this.s;
        while (i < a.t) {
            c -= a[i];
            r[i++] = c & this.DM;
            c >>= this.DB;
        }
        c -= a.s;
    }
    r.s = (c < 0) ? -1 : 0;
    if (c < -1)
        r[i++] = this.DV + c;
    else
        if (c > 0) r[i++] = c;
    r.t = i;
    r.clamp();
}

// (protected) r = this * a, r != this,a (HAC 14.12)
// "this" should be the larger one if appropriate.
function bnpMultiplyTo(a, r)
{
    var x = this.abs(), y = a.abs();
    var i = x.t;
    r.t = i + y.t;
    while (--i >= 0)
        r[i] = 0;
    for (i = 0; i < y.t; ++i)
        r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
    r.s = 0;
    r.clamp();
    if (this.s != a.s) BigInteger.ZERO.subTo(r, r);
}

// (protected) r = this^2, r != this (HAC 14.16)
function bnpSquareTo(r)
{
    var x = this.abs();
    var i = r.t = 2 * x.t;
    while (--i >= 0)
        r[i] = 0;
    for (i = 0; i < x.t - 1; ++i) {
        var c = x.am(i, x[i], r, 2 * i, 0, 1);
        if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
            r[i + x.t] -= x.DV;
            r[i + x.t + 1] = 1;
        }
    }
    if (r.t > 0) r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
    r.s = 0;
    r.clamp();
}

// (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
// r != q, this != m. q or r may be null.
function bnpDivRemTo(m, q, r)
{
    var pm = m.abs();
    if (pm.t <= 0) return;
    var pt = this.abs();
    if (pt.t < pm.t) {
        if (q != null) q.fromInt(0);
        if (r != null) this.copyTo(r);
        return;
    }
    if (r == null) r = nbi();
    var y = nbi(), ts = this.s, ms = m.s;
    var nsh = this.DB - nbits(pm[pm.t - 1]); // normalize modulus
    if (nsh > 0) {
        pm.lShiftTo(nsh, y);
        pt.lShiftTo(nsh, r);
    } else {
        pm.copyTo(y);
        pt.copyTo(r);
    }
    var ys = y.t;
    var y0 = y[ys - 1];
    if (y0 == 0) return;
    var yt = y0 * (1 << this.F1) + ((ys > 1) ? y[ys - 2] >> this.F2 : 0);
    var d1 = this.FV / yt, d2 = (1 << this.F1) / yt, e = 1 << this.F2;
    var i = r.t, j = i - ys, t = (q == null) ? nbi() : q;
    y.dlShiftTo(j, t);
    if (r.compareTo(t) >= 0) {
        r[r.t++] = 1;
        r.subTo(t, r);
    }
    BigInteger.ONE.dlShiftTo(ys, t);
    t.subTo(y, y); // "negative" y so we can replace sub with am later
    while (y.t < ys)
        y[y.t++] = 0;
    while (--j >= 0) {
        // Estimate quotient digit
        var qd = (r[--i] == y0) ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
        if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) { // Try it out
            y.dlShiftTo(j, t);
            r.subTo(t, r);
            while (r[i] < --qd)
                r.subTo(t, r);
        }
    }
    if (q != null) {
        r.drShiftTo(ys, q);
        if (ts != ms) BigInteger.ZERO.subTo(q, q);
    }
    r.t = ys;
    r.clamp();
    if (nsh > 0) r.rShiftTo(nsh, r); // Denormalize remainder
    if (ts < 0) BigInteger.ZERO.subTo(r, r);
}

// (public) this mod a
function bnMod(a)
{
    var r = nbi();
    this.abs().divRemTo(a, null, r);
    if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);
    return r;
}

// Modular reduction using "classic" algorithm
function Classic(m)
{
    this.m = m;
}
function cConvert(x)
{
    if (x.s < 0 || x.compareTo(this.m) >= 0)
        return x.mod(this.m);
    else return x;
}
function cRevert(x)
{
    return x;
}
function cReduce(x)
{
    x.divRemTo(this.m, null, x);
}
function cMulTo(x, y, r)
{
    x.multiplyTo(y, r);
    this.reduce(r);
}
function cSqrTo(x, r)
{
    x.squareTo(r);
    this.reduce(r);
}

Classic.prototype.convert = cConvert;
Classic.prototype.revert = cRevert;
Classic.prototype.reduce = cReduce;
Classic.prototype.mulTo = cMulTo;
Classic.prototype.sqrTo = cSqrTo;

// (protected) return "-1/this % 2^DB"; useful for Mont. reduction
// justification:
// xy == 1 (mod m)
// xy = 1+km
// xy(2-xy) = (1+km)(1-km)
// x[y(2-xy)] = 1-k^2m^2
// x[y(2-xy)] == 1 (mod m^2)
// if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
// should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
// JS multiply "overflows" differently from C/C++, so care is needed here.
function bnpInvDigit()
{
    if (this.t < 1) return 0;
    var x = this[0];
    if ((x & 1) == 0) return 0;
    var y = x & 3; // y == 1/x mod 2^2
    y = (y * (2 - (x & 0xf) * y)) & 0xf; // y == 1/x mod 2^4
    y = (y * (2 - (x & 0xff) * y)) & 0xff; // y == 1/x mod 2^8
    y = (y * (2 - (((x & 0xffff) * y) & 0xffff))) & 0xffff; // y == 1/x mod 2^16
    // last step - calculate inverse mod DV directly;
    // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
    y = (y * (2 - x * y % this.DV)) % this.DV; // y == 1/x mod 2^dbits
    // we really want the negative inverse, and -DV < y < DV
    return (y > 0) ? this.DV - y : -y;
}

// Montgomery reduction
function Montgomery(m)
{
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp & 0x7fff;
    this.mph = this.mp >> 15;
    this.um = (1 << (m.DB - 15)) - 1;
    this.mt2 = 2 * m.t;
}

// xR mod m
function montConvert(x)
{
    var r = nbi();
    x.abs().dlShiftTo(this.m.t, r);
    r.divRemTo(this.m, null, r);
    if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);
    return r;
}

// x/R mod m
function montRevert(x)
{
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r;
}

// x = x/R mod m (HAC 14.32)
function montReduce(x)
{
    while (x.t <= this.mt2)
        // pad x so am has enough room later
        x[x.t++] = 0;
    for ( var i = 0; i < this.m.t; ++i) {
        // faster way of calculating u0 = x[i]*mp mod DV
        var j = x[i] & 0x7fff;
        var u0 = (j * this.mpl + (((j * this.mph + (x[i] >> 15) * this.mpl) & this.um) << 15)) & x.DM;
        // use am to combine the multiply-shift-add into one call
        j = i + this.m.t;
        x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
        // propagate carry
        while (x[j] >= x.DV) {
            x[j] -= x.DV;
            x[++j]++;
        }
    }
    x.clamp();
    x.drShiftTo(this.m.t, x);
    if (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
}

// r = "x^2/R mod m"; x != r
function montSqrTo(x, r)
{
    x.squareTo(r);
    this.reduce(r);
}

// r = "xy/R mod m"; x,y != r
function montMulTo(x, y, r)
{
    x.multiplyTo(y, r);
    this.reduce(r);
}

Montgomery.prototype.convert = montConvert;
Montgomery.prototype.revert = montRevert;
Montgomery.prototype.reduce = montReduce;
Montgomery.prototype.mulTo = montMulTo;
Montgomery.prototype.sqrTo = montSqrTo;

// (protected) true iff this is even
function bnpIsEven()
{
    return ((this.t > 0) ? (this[0] & 1) : this.s) == 0;
}

// (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
function bnpExp(e, z)
{
    if (e > 0xffffffff || e < 1) return BigInteger.ONE;
    var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e) - 1;
    g.copyTo(r);
    while (--i >= 0) {
        z.sqrTo(r, r2);
        if ((e & (1 << i)) > 0)
            z.mulTo(r2, g, r);
        else {
            var t = r;
            r = r2;
            r2 = t;
        }
    }
    return z.revert(r);
}

// (public) this^e % m, 0 <= e < 2^32
function bnModPowInt(e, m)
{
    var z;
    if (e < 256 || m.isEven())
        z = new Classic(m);
    else z = new Montgomery(m);
    return this.exp(e, z);
}

// protected
BigInteger.prototype.copyTo = bnpCopyTo;
BigInteger.prototype.fromInt = bnpFromInt;
BigInteger.prototype.fromString = bnpFromString;
BigInteger.prototype.clamp = bnpClamp;
BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
BigInteger.prototype.drShiftTo = bnpDRShiftTo;
BigInteger.prototype.lShiftTo = bnpLShiftTo;
BigInteger.prototype.rShiftTo = bnpRShiftTo;
BigInteger.prototype.subTo = bnpSubTo;
BigInteger.prototype.multiplyTo = bnpMultiplyTo;
BigInteger.prototype.squareTo = bnpSquareTo;
BigInteger.prototype.divRemTo = bnpDivRemTo;
BigInteger.prototype.invDigit = bnpInvDigit;
BigInteger.prototype.isEven = bnpIsEven;
BigInteger.prototype.exp = bnpExp;

// public
BigInteger.prototype.toString = bnToString;
BigInteger.prototype.negate = bnNegate;
BigInteger.prototype.abs = bnAbs;
BigInteger.prototype.compareTo = bnCompareTo;
BigInteger.prototype.bitLength = bnBitLength;
BigInteger.prototype.mod = bnMod;
BigInteger.prototype.modPowInt = bnModPowInt;

// "constants"
BigInteger.ZERO = nbv(0);
BigInteger.ONE = nbv(1);

// Copyright (c) 2005 Tom Wu
// All Rights Reserved.
// See "LICENSE" for details.

// Extended JavaScript BN functions, required for RSA private ops.

// (public)
function bnClone()
{
    var r = nbi();
    this.copyTo(r);
    return r;
}

// (public) return value as integer
function bnIntValue()
{
    if (this.s < 0) {
        if (this.t == 1)
            return this[0] - this.DV;
        else
            if (this.t == 0) return -1;
    } else
        if (this.t == 1)
            return this[0];
        else
            if (this.t == 0) return 0;
    // assumes 16 < DB < 32
    return ((this[1] & ((1 << (32 - this.DB)) - 1)) << this.DB) | this[0];
}

// (public) return value as byte
function bnByteValue()
{
    return (this.t == 0) ? this.s : (this[0] << 24) >> 24;
}

// (public) return value as short (assumes DB>=16)
function bnShortValue()
{
    return (this.t == 0) ? this.s : (this[0] << 16) >> 16;
}

// (protected) return x s.t. r^x < DV
function bnpChunkSize(r)
{
    return Math.floor(Math.LN2 * this.DB / Math.log(r));
}

// (public) 0 if this == 0, 1 if this > 0
function bnSigNum()
{
    if (this.s < 0)
        return -1;
    else
        if (this.t <= 0 || (this.t == 1 && this[0] <= 0))
            return 0;
        else return 1;
}

// (protected) convert to radix string
function bnpToRadix(b)
{
    if (b == null) b = 10;
    if (this.signum() == 0 || b < 2 || b > 36) return "0";
    var cs = this.chunkSize(b);
    var a = Math.pow(b, cs);
    var d = nbv(a), y = nbi(), z = nbi(), r = "";
    this.divRemTo(d, y, z);
    while (y.signum() > 0) {
        r = (a + z.intValue()).toString(b).substr(1) + r;
        y.divRemTo(d, y, z);
    }
    return z.intValue().toString(b) + r;
}

// (protected) convert from radix string
function bnpFromRadix(s, b)
{
    this.fromInt(0);
    if (b == null) b = 10;
    var cs = this.chunkSize(b);
    var d = Math.pow(b, cs), mi = false, j = 0, w = 0;
    for ( var i = 0; i < s.length; ++i) {
        var x = intAt(s, i);
        if (x < 0) {
            if (s.charAt(i) == "-" && this.signum() == 0) mi = true;
            continue;
        }
        w = b * w + x;
        if (++j >= cs) {
            this.dMultiply(d);
            this.dAddOffset(w, 0);
            j = 0;
            w = 0;
        }
    }
    if (j > 0) {
        this.dMultiply(Math.pow(b, j));
        this.dAddOffset(w, 0);
    }
    if (mi) BigInteger.ZERO.subTo(this, this);
}

// (protected) alternate constructor
function bnpFromNumber(a, b, c)
{
    if ("number" == typeof b) {
        // new BigInteger(int,int,RNG)
        if (a < 2)
            this.fromInt(1);
        else {
            this.fromNumber(a, c);
            if (!this.testBit(a - 1)) // force MSB set
            this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);
            if (this.isEven()) this.dAddOffset(1, 0); // force odd
            while (!this.isProbablePrime(b)) {
                this.dAddOffset(2, 0);
                if (this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);
            }
        }
    } else {
        // new BigInteger(int,RNG)
        var x = new Array(), t = a & 7;
        x.length = (a >> 3) + 1;
        b.nextBytes(x);
        if (t > 0)
            x[0] &= ((1 << t) - 1);
        else x[0] = 0;
        this.fromString(x, 256);
    }
}

// (public) convert to bigendian byte array
function bnToByteArray()
{
    var i = this.t, r = new Array();
    r[0] = this.s;
    var p = this.DB - (i * this.DB) % 8, d, k = 0;
    if (i-- > 0) {
        if (p < this.DB && (d = this[i] >> p) != (this.s & this.DM) >> p) r[k++] = d | (this.s << (this.DB - p));
        while (i >= 0) {
            if (p < 8) {
                d = (this[i] & ((1 << p) - 1)) << (8 - p);
                d |= this[--i] >> (p += this.DB - 8);
            } else {
                d = (this[i] >> (p -= 8)) & 0xff;
                if (p <= 0) {
                    p += this.DB;
                    --i;
                }
            }
            if ((d & 0x80) != 0) d |= -256;
            if (k == 0 && (this.s & 0x80) != (d & 0x80)) ++k;
            if (k > 0 || d != this.s) r[k++] = d;
        }
    }
    return r;
}

function bnEquals(a)
{
    return (this.compareTo(a) == 0);
}
function bnMin(a)
{
    return (this.compareTo(a) < 0) ? this : a;
}
function bnMax(a)
{
    return (this.compareTo(a) > 0) ? this : a;
}

// (protected) r = this op a (bitwise)
function bnpBitwiseTo(a, op, r)
{
    var i, f, m = Math.min(a.t, this.t);
    for (i = 0; i < m; ++i)
        r[i] = op(this[i], a[i]);
    if (a.t < this.t) {
        f = a.s & this.DM;
        for (i = m; i < this.t; ++i)
            r[i] = op(this[i], f);
        r.t = this.t;
    } else {
        f = this.s & this.DM;
        for (i = m; i < a.t; ++i)
            r[i] = op(f, a[i]);
        r.t = a.t;
    }
    r.s = op(this.s, a.s);
    r.clamp();
}

// (public) this & a
function op_and(x, y)
{
    return x & y;
}
function bnAnd(a)
{
    var r = nbi();
    this.bitwiseTo(a, op_and, r);
    return r;
}

// (public) this | a
function op_or(x, y)
{
    return x | y;
}
function bnOr(a)
{
    var r = nbi();
    this.bitwiseTo(a, op_or, r);
    return r;
}

// (public) this ^ a
function op_xor(x, y)
{
    return x ^ y;
}
function bnXor(a)
{
    var r = nbi();
    this.bitwiseTo(a, op_xor, r);
    return r;
}

// (public) this & ~a
function op_andnot(x, y)
{
    return x & ~y;
}
function bnAndNot(a)
{
    var r = nbi();
    this.bitwiseTo(a, op_andnot, r);
    return r;
}

// (public) ~this
function bnNot()
{
    var r = nbi();
    for ( var i = 0; i < this.t; ++i)
        r[i] = this.DM & ~this[i];
    r.t = this.t;
    r.s = ~this.s;
    return r;
}

// (public) this << n
function bnShiftLeft(n)
{
    var r = nbi();
    if (n < 0)
        this.rShiftTo(-n, r);
    else this.lShiftTo(n, r);
    return r;
}

// (public) this >> n
function bnShiftRight(n)
{
    var r = nbi();
    if (n < 0)
        this.lShiftTo(-n, r);
    else this.rShiftTo(n, r);
    return r;
}

// return index of lowest 1-bit in x, x < 2^31
function lbit(x)
{
    if (x == 0) return -1;
    var r = 0;
    if ((x & 0xffff) == 0) {
        x >>= 16;
        r += 16;
    }
    if ((x & 0xff) == 0) {
        x >>= 8;
        r += 8;
    }
    if ((x & 0xf) == 0) {
        x >>= 4;
        r += 4;
    }
    if ((x & 3) == 0) {
        x >>= 2;
        r += 2;
    }
    if ((x & 1) == 0) ++r;
    return r;
}

// (public) returns index of lowest 1-bit (or -1 if none)
function bnGetLowestSetBit()
{
    for ( var i = 0; i < this.t; ++i)
        if (this[i] != 0) return i * this.DB + lbit(this[i]);
    if (this.s < 0) return this.t * this.DB;
    return -1;
}

// return number of 1 bits in x
function cbit(x)
{
    var r = 0;
    while (x != 0) {
        x &= x - 1;
        ++r;
    }
    return r;
}

// (public) return number of set bits
function bnBitCount()
{
    var r = 0, x = this.s & this.DM;
    for ( var i = 0; i < this.t; ++i)
        r += cbit(this[i] ^ x);
    return r;
}

// (public) true iff nth bit is set
function bnTestBit(n)
{
    var j = Math.floor(n / this.DB);
    if (j >= this.t) return (this.s != 0);
    return ((this[j] & (1 << (n % this.DB))) != 0);
}

// (protected) this op (1<<n)
function bnpChangeBit(n, op)
{
    var r = BigInteger.ONE.shiftLeft(n);
    this.bitwiseTo(r, op, r);
    return r;
}

// (public) this | (1<<n)
function bnSetBit(n)
{
    return this.changeBit(n, op_or);
}

// (public) this & ~(1<<n)
function bnClearBit(n)
{
    return this.changeBit(n, op_andnot);
}

// (public) this ^ (1<<n)
function bnFlipBit(n)
{
    return this.changeBit(n, op_xor);
}

// (protected) r = this + a
function bnpAddTo(a, r)
{
    var i = 0, c = 0, m = Math.min(a.t, this.t);
    while (i < m) {
        c += this[i] + a[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
    }
    if (a.t < this.t) {
        c += a.s;
        while (i < this.t) {
            c += this[i];
            r[i++] = c & this.DM;
            c >>= this.DB;
        }
        c += this.s;
    } else {
        c += this.s;
        while (i < a.t) {
            c += a[i];
            r[i++] = c & this.DM;
            c >>= this.DB;
        }
        c += a.s;
    }
    r.s = (c < 0) ? -1 : 0;
    if (c > 0)
        r[i++] = c;
    else
        if (c < -1) r[i++] = this.DV + c;
    r.t = i;
    r.clamp();
}

// (public) this + a
function bnAdd(a)
{
    var r = nbi();
    this.addTo(a, r);
    return r;
}

// (public) this - a
function bnSubtract(a)
{
    var r = nbi();
    this.subTo(a, r);
    return r;
}

// (public) this * a
function bnMultiply(a)
{
    var r = nbi();
    this.multiplyTo(a, r);
    return r;
}

// (public) this / a
function bnDivide(a)
{
    var r = nbi();
    this.divRemTo(a, r, null);
    return r;
}

// (public) this % a
function bnRemainder(a)
{
    var r = nbi();
    this.divRemTo(a, null, r);
    return r;
}

// (public) [this/a,this%a]
function bnDivideAndRemainder(a)
{
    var q = nbi(), r = nbi();
    this.divRemTo(a, q, r);
    return new Array(q, r);
}

// (protected) this *= n, this >= 0, 1 < n < DV
function bnpDMultiply(n)
{
    this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
    ++this.t;
    this.clamp();
}

// (protected) this += n << w words, this >= 0
function bnpDAddOffset(n, w)
{
    while (this.t <= w)
        this[this.t++] = 0;
    this[w] += n;
    while (this[w] >= this.DV) {
        this[w] -= this.DV;
        if (++w >= this.t) this[this.t++] = 0;
        ++this[w];
    }
}

// A "null" reducer
function NullExp()
{
}
function nNop(x)
{
    return x;
}
function nMulTo(x, y, r)
{
    x.multiplyTo(y, r);
}
function nSqrTo(x, r)
{
    x.squareTo(r);
}

NullExp.prototype.convert = nNop;
NullExp.prototype.revert = nNop;
NullExp.prototype.mulTo = nMulTo;
NullExp.prototype.sqrTo = nSqrTo;

// (public) this^e
function bnPow(e)
{
    return this.exp(e, new NullExp());
}

// (protected) r = lower n words of "this * a", a.t <= n
// "this" should be the larger one if appropriate.
function bnpMultiplyLowerTo(a, n, r)
{
    var i = Math.min(this.t + a.t, n);
    r.s = 0; // assumes a,this >= 0
    r.t = i;
    while (i > 0)
        r[--i] = 0;
    var j;
    for (j = r.t - this.t; i < j; ++i)
        r[i + this.t] = this.am(0, a[i], r, i, 0, this.t);
    for (j = Math.min(a.t, n); i < j; ++i)
        this.am(0, a[i], r, i, 0, n - i);
    r.clamp();
}

// (protected) r = "this * a" without lower n words, n > 0
// "this" should be the larger one if appropriate.
function bnpMultiplyUpperTo(a, n, r)
{
    --n;
    var i = r.t = this.t + a.t - n;
    r.s = 0; // assumes a,this >= 0
    while (--i >= 0)
        r[i] = 0;
    for (i = Math.max(n - this.t, 0); i < a.t; ++i)
        r[this.t + i - n] = this.am(n - i, a[i], r, 0, 0, this.t + i - n);
    r.clamp();
    r.drShiftTo(1, r);
}

// Barrett modular reduction
function Barrett(m)
{
    // setup Barrett
    this.r2 = nbi();
    this.q3 = nbi();
    BigInteger.ONE.dlShiftTo(2 * m.t, this.r2);
    this.mu = this.r2.divide(m);
    this.m = m;
}

function barrettConvert(x)
{
    if (x.s < 0 || x.t > 2 * this.m.t)
        return x.mod(this.m);
    else
        if (x.compareTo(this.m) < 0)
            return x;
        else {
            var r = nbi();
            x.copyTo(r);
            this.reduce(r);
            return r;
        }
}

function barrettRevert(x)
{
    return x;
}

// x = x mod m (HAC 14.42)
function barrettReduce(x)
{
    x.drShiftTo(this.m.t - 1, this.r2);
    if (x.t > this.m.t + 1) {
        x.t = this.m.t + 1;
        x.clamp();
    }
    this.mu.multiplyUpperTo(this.r2, this.m.t + 1, this.q3);
    this.m.multiplyLowerTo(this.q3, this.m.t + 1, this.r2);
    while (x.compareTo(this.r2) < 0)
        x.dAddOffset(1, this.m.t + 1);
    x.subTo(this.r2, x);
    while (x.compareTo(this.m) >= 0)
        x.subTo(this.m, x);
}

// r = x^2 mod m; x != r
function barrettSqrTo(x, r)
{
    x.squareTo(r);
    this.reduce(r);
}

// r = x*y mod m; x,y != r
function barrettMulTo(x, y, r)
{
    x.multiplyTo(y, r);
    this.reduce(r);
}

Barrett.prototype.convert = barrettConvert;
Barrett.prototype.revert = barrettRevert;
Barrett.prototype.reduce = barrettReduce;
Barrett.prototype.mulTo = barrettMulTo;
Barrett.prototype.sqrTo = barrettSqrTo;

// (public) this^e % m (HAC 14.85)
function bnModPow(e, m)
{
    var i = e.bitLength(), k, r = nbv(1), z;
    if (i <= 0)
        return r;
    else
        if (i < 18)
            k = 1;
        else
            if (i < 48)
                k = 3;
            else
                if (i < 144)
                    k = 4;
                else
                    if (i < 768)
                        k = 5;
                    else k = 6;
    if (i < 8)
        z = new Classic(m);
    else
        if (m.isEven())
            z = new Barrett(m);
        else z = new Montgomery(m);

    // precomputation
    var g = new Array(), n = 3, k1 = k - 1, km = (1 << k) - 1;
    g[1] = z.convert(this);
    if (k > 1) {
        var g2 = nbi();
        z.sqrTo(g[1], g2);
        while (n <= km) {
            g[n] = nbi();
            z.mulTo(g2, g[n - 2], g[n]);
            n += 2;
        }
    }

    var j = e.t - 1, w, is1 = true, r2 = nbi(), t;
    i = nbits(e[j]) - 1;
    while (j >= 0) {
        if (i >= k1)
            w = (e[j] >> (i - k1)) & km;
        else {
            w = (e[j] & ((1 << (i + 1)) - 1)) << (k1 - i);
            if (j > 0) w |= e[j - 1] >> (this.DB + i - k1);
        }

        n = k;
        while ((w & 1) == 0) {
            w >>= 1;
            --n;
        }
        if ((i -= n) < 0) {
            i += this.DB;
            --j;
        }
        if (is1) { // ret == 1, don't bother squaring or multiplying it
            g[w].copyTo(r);
            is1 = false;
        } else {
            while (n > 1) {
                z.sqrTo(r, r2);
                z.sqrTo(r2, r);
                n -= 2;
            }
            if (n > 0)
                z.sqrTo(r, r2);
            else {
                t = r;
                r = r2;
                r2 = t;
            }
            z.mulTo(r2, g[w], r);
        }

        while (j >= 0 && (e[j] & (1 << i)) == 0) {
            z.sqrTo(r, r2);
            t = r;
            r = r2;
            r2 = t;
            if (--i < 0) {
                i = this.DB - 1;
                --j;
            }
        }
    }
    return z.revert(r);
}

// (public) gcd(this,a) (HAC 14.54)
function bnGCD(a)
{
    var x = (this.s < 0) ? this.negate() : this.clone();
    var y = (a.s < 0) ? a.negate() : a.clone();
    if (x.compareTo(y) < 0) {
        var t = x;
        x = y;
        y = t;
    }
    var i = x.getLowestSetBit(), g = y.getLowestSetBit();
    if (g < 0) return x;
    if (i < g) g = i;
    if (g > 0) {
        x.rShiftTo(g, x);
        y.rShiftTo(g, y);
    }
    while (x.signum() > 0) {
        if ((i = x.getLowestSetBit()) > 0) x.rShiftTo(i, x);
        if ((i = y.getLowestSetBit()) > 0) y.rShiftTo(i, y);
        if (x.compareTo(y) >= 0) {
            x.subTo(y, x);
            x.rShiftTo(1, x);
        } else {
            y.subTo(x, y);
            y.rShiftTo(1, y);
        }
    }
    if (g > 0) y.lShiftTo(g, y);
    return y;
}

// (protected) this % n, n < 2^26
function bnpModInt(n)
{
    if (n <= 0) return 0;
    var d = this.DV % n, r = (this.s < 0) ? n - 1 : 0;
    if (this.t > 0) if (d == 0)
        r = this[0] % n;
    else for ( var i = this.t - 1; i >= 0; --i)
        r = (d * r + this[i]) % n;
    return r;
}

// (public) 1/this % m (HAC 14.61)
function bnModInverse(m)
{
    var ac = m.isEven();
    if ((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;
    var u = m.clone(), v = this.clone();
    var a = nbv(1), b = nbv(0), c = nbv(0), d = nbv(1);
    while (u.signum() != 0) {
        while (u.isEven()) {
            u.rShiftTo(1, u);
            if (ac) {
                if (!a.isEven() || !b.isEven()) {
                    a.addTo(this, a);
                    b.subTo(m, b);
                }
                a.rShiftTo(1, a);
            } else
                if (!b.isEven()) b.subTo(m, b);
            b.rShiftTo(1, b);
        }
        while (v.isEven()) {
            v.rShiftTo(1, v);
            if (ac) {
                if (!c.isEven() || !d.isEven()) {
                    c.addTo(this, c);
                    d.subTo(m, d);
                }
                c.rShiftTo(1, c);
            } else
                if (!d.isEven()) d.subTo(m, d);
            d.rShiftTo(1, d);
        }
        if (u.compareTo(v) >= 0) {
            u.subTo(v, u);
            if (ac) a.subTo(c, a);
            b.subTo(d, b);
        } else {
            v.subTo(u, v);
            if (ac) c.subTo(a, c);
            d.subTo(b, d);
        }
    }
    if (v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
    if (d.compareTo(m) >= 0) return d.subtract(m);
    if (d.signum() < 0)
        d.addTo(m, d);
    else return d;
    if (d.signum() < 0)
        return d.add(m);
    else return d;
}

var lowprimes = [ 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271,
        277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509 ];
var lplim = (1 << 26) / lowprimes[lowprimes.length - 1];

// (public) test primality with certainty >= 1-.5^t
function bnIsProbablePrime(t)
{
    var i, x = this.abs();
    if (x.t == 1 && x[0] <= lowprimes[lowprimes.length - 1]) {
        for (i = 0; i < lowprimes.length; ++i)
            if (x[0] == lowprimes[i]) return true;
        return false;
    }
    if (x.isEven()) return false;
    i = 1;
    while (i < lowprimes.length) {
        var m = lowprimes[i], j = i + 1;
        while (j < lowprimes.length && m < lplim)
            m *= lowprimes[j++];
        m = x.modInt(m);
        while (i < j)
            if (m % lowprimes[i++] == 0) return false;
    }
    return x.millerRabin(t);
}

// (protected) true if probably prime (HAC 4.24, Miller-Rabin)
function bnpMillerRabin(t)
{
    var n1 = this.subtract(BigInteger.ONE);
    var k = n1.getLowestSetBit();
    if (k <= 0) return false;
    var r = n1.shiftRight(k);
    t = (t + 1) >> 1;
    if (t > lowprimes.length) t = lowprimes.length;
    var a = nbi();
    for ( var i = 0; i < t; ++i) {
        a.fromInt(lowprimes[i]);
        var y = a.modPow(r, this);
        if (y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
            var j = 1;
            while (j++ < k && y.compareTo(n1) != 0) {
                y = y.modPowInt(2, this);
                if (y.compareTo(BigInteger.ONE) == 0) return false;
            }
            if (y.compareTo(n1) != 0) return false;
        }
    }
    return true;
}

// protected
BigInteger.prototype.chunkSize = bnpChunkSize;
BigInteger.prototype.toRadix = bnpToRadix;
BigInteger.prototype.fromRadix = bnpFromRadix;
BigInteger.prototype.fromNumber = bnpFromNumber;
BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
BigInteger.prototype.changeBit = bnpChangeBit;
BigInteger.prototype.addTo = bnpAddTo;
BigInteger.prototype.dMultiply = bnpDMultiply;
BigInteger.prototype.dAddOffset = bnpDAddOffset;
BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
BigInteger.prototype.modInt = bnpModInt;
BigInteger.prototype.millerRabin = bnpMillerRabin;

// public
BigInteger.prototype.clone = bnClone;
BigInteger.prototype.intValue = bnIntValue;
BigInteger.prototype.byteValue = bnByteValue;
BigInteger.prototype.shortValue = bnShortValue;
BigInteger.prototype.signum = bnSigNum;
BigInteger.prototype.toByteArray = bnToByteArray;
BigInteger.prototype.equals = bnEquals;
BigInteger.prototype.min = bnMin;
BigInteger.prototype.max = bnMax;
BigInteger.prototype.and = bnAnd;
BigInteger.prototype.or = bnOr;
BigInteger.prototype.xor = bnXor;
BigInteger.prototype.andNot = bnAndNot;
BigInteger.prototype.not = bnNot;
BigInteger.prototype.shiftLeft = bnShiftLeft;
BigInteger.prototype.shiftRight = bnShiftRight;
BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
BigInteger.prototype.bitCount = bnBitCount;
BigInteger.prototype.testBit = bnTestBit;
BigInteger.prototype.setBit = bnSetBit;
BigInteger.prototype.clearBit = bnClearBit;
BigInteger.prototype.flipBit = bnFlipBit;
BigInteger.prototype.add = bnAdd;
BigInteger.prototype.subtract = bnSubtract;
BigInteger.prototype.multiply = bnMultiply;
BigInteger.prototype.divide = bnDivide;
BigInteger.prototype.remainder = bnRemainder;
BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
BigInteger.prototype.modPow = bnModPow;
BigInteger.prototype.modInverse = bnModInverse;
BigInteger.prototype.pow = bnPow;
BigInteger.prototype.gcd = bnGCD;
BigInteger.prototype.isProbablePrime = bnIsProbablePrime;

// BigInteger interfaces not implemented in jsbn:

// BigInteger(int signum, byte[] magnitude)
// double doubleValue()
// float floatValue()
// int hashCode()
// long longValue()
// static BigInteger valueOf(long val)
// Depends on jsbn.js and rng.js

// convert a (hex) string to a bignum object
function parseBigInt(str, r)
{
    return new BigInteger(str, r);
}

function linebrk(s, n)
{
    var ret = "";
    var i = 0;
    while (i + n < s.length) {
        ret += s.substring(i, i + n) + "\n";
        i += n;
    }
    return ret + s.substring(i, s.length);
}

function byte2Hex(b)
{
    if (b < 0x10)
        return "0" + b.toString(16);
    else return b.toString(16);
}

// PKCS#1 (type 2, random) pad input string s to n bytes, and return a bigint
function pkcs1pad2(s, n)
{
    if (n < s.length + 11) {
        alert("Message too long for RSA");
        return null;
    }
    var ba = new Array();
    var i = s.length - 1;
    while (i >= 0 && n > 0)
        ba[--n] = s.charCodeAt(i--);
    ba[--n] = 0;
    var rng = new SecureRandom();
    var x = new Array();
    while (n > 2) { // random non-zero pad
        x[0] = 0;
        while (x[0] == 0)
            rng.nextBytes(x);
        ba[--n] = x[0];
    }
    ba[--n] = 2;
    ba[--n] = 0;
    return new BigInteger(ba);
}

// "empty" RSA key constructor
function RSAKey()
{
    this.n = null;
    this.e = 0;
    this.d = null;
    this.p = null;
    this.q = null;
    this.dmp1 = null;
    this.dmq1 = null;
    this.coeff = null;
}

// Set the public key fields N and e from hex strings
function RSASetPublic(N, E)
{
    if (N != null && E != null && N.length > 0 && E.length > 0) {
        this.n = parseBigInt(N, 16);
        this.e = parseInt(E, 16);
    } else alert("Invalid RSA public key");
}

// Perform raw public operation on "x": return x^e (mod n)
function RSADoPublic(x)
{
    return x.modPowInt(this.e, this.n);
}

// Return the PKCS#1 RSA encryption of "text" as an even-length hex string
function RSAEncrypt(text)
{
    var m = pkcs1pad2(text, (this.n.bitLength() + 7) >> 3);
    if (m == null) return null;
    var c = this.doPublic(m);
    if (c == null) return null;
    var h = c.toString(16);
    if ((h.length & 1) == 0)
        return h;
    else return "0" + h;
}

// Return the PKCS#1 RSA encryption of "text" as a Base64-encoded string
// function RSAEncryptB64(text) {
// var h = this.encrypt(text);
// if(h) return hex2b64(h); else return null;
// }

// protected
RSAKey.prototype.doPublic = RSADoPublic;

// public
RSAKey.prototype.setPublic = RSASetPublic;
RSAKey.prototype.encrypt = RSAEncrypt;
// RSAKey.prototype.encrypt_b64 = RSAEncryptB64;
// Depends on rsa.js and jsbn2.js

// Undo PKCS#1 (type 2, random) padding and, if valid, return the plaintext
function pkcs1unpad2(d, n)
{
    var b = d.toByteArray();
    var i = 0;
    while (i < b.length && b[i] == 0)
        ++i;
    if (b.length - i != n - 1 || b[i] != 2) return null;
    ++i;
    while (b[i] != 0)
        if (++i >= b.length) return null;
    var ret = "";
    while (++i < b.length)
        ret += String.fromCharCode(b[i]);
    return ret;
}

// Set the private key fields N, e, and d from hex strings
function RSASetPrivate(N, E, D)
{
    if (N != null && E != null && N.length > 0 && E.length > 0) {
        this.n = parseBigInt(N, 16);
        this.e = parseInt(E, 16);
        this.d = parseBigInt(D, 16);
    } else alert("Invalid RSA private key");
}

// Set the private key fields N, e, d and CRT params from hex strings
function RSASetPrivateEx(N, E, D, P, Q, DP, DQ, C)
{
    if (N != null && E != null && N.length > 0 && E.length > 0) {
        this.n = parseBigInt(N, 16);
        this.e = parseInt(E, 16);
        this.d = parseBigInt(D, 16);
        this.p = parseBigInt(P, 16);
        this.q = parseBigInt(Q, 16);
        this.dmp1 = parseBigInt(DP, 16);
        this.dmq1 = parseBigInt(DQ, 16);
        this.coeff = parseBigInt(C, 16);
    } else alert("Invalid RSA private key");
}

// Generate a new random private key B bits long, using public expt E
function RSAGenerate(B, E)
{
    var rng = new SecureRandom();
    var qs = B >> 1;
    this.e = parseInt(E, 16);
    var ee = new BigInteger(E, 16);
    for (;;) {
        for (;;) {
            this.p = new BigInteger(B - qs, 1, rng);
            if (this.p.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) == 0 && this.p.isProbablePrime(10)) break;
        }
        for (;;) {
            this.q = new BigInteger(qs, 1, rng);
            if (this.q.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) == 0 && this.q.isProbablePrime(10)) break;
        }
        if (this.p.compareTo(this.q) <= 0) {
            var t = this.p;
            this.p = this.q;
            this.q = t;
        }
        var p1 = this.p.subtract(BigInteger.ONE);
        var q1 = this.q.subtract(BigInteger.ONE);
        var phi = p1.multiply(q1);
        if (phi.gcd(ee).compareTo(BigInteger.ONE) == 0) {
            this.n = this.p.multiply(this.q);
            this.d = ee.modInverse(phi);
            this.dmp1 = this.d.mod(p1);
            this.dmq1 = this.d.mod(q1);
            this.coeff = this.q.modInverse(this.p);
            break;
        }
    }
}

// Perform raw private operation on "x": return x^d (mod n)
function RSADoPrivate(x)
{
    if (this.p == null || this.q == null) return x.modPow(this.d, this.n);

    // TODO: re-calculate any missing CRT params
    var xp = x.mod(this.p).modPow(this.dmp1, this.p);
    var xq = x.mod(this.q).modPow(this.dmq1, this.q);

    while (xp.compareTo(xq) < 0)
        xp = xp.add(this.p);
    return xp.subtract(xq).multiply(this.coeff).mod(this.p).multiply(this.q).add(xq);
}

// Return the PKCS#1 RSA decryption of "ctext".
// "ctext" is an even-length hex string and the output is a plain string.
function RSADecrypt(ctext)
{
    var c = parseBigInt(ctext, 16);
    var m = this.doPrivate(c);
    if (m == null) return null;
    return pkcs1unpad2(m, (this.n.bitLength() + 7) >> 3);
}

// Return the PKCS#1 RSA decryption of "ctext".
// "ctext" is a Base64-encoded string and the output is a plain string.
// function RSAB64Decrypt(ctext) {
// var h = b64tohex(ctext);
// if(h) return this.decrypt(h); else return null;
// }

// protected
RSAKey.prototype.doPrivate = RSADoPrivate;

// public
RSAKey.prototype.setPrivate = RSASetPrivate;
RSAKey.prototype.setPrivateEx = RSASetPrivateEx;
RSAKey.prototype.generate = RSAGenerate;
RSAKey.prototype.decrypt = RSADecrypt;
// RSAKey.prototype.b64_decrypt = RSAB64Decrypt;
// Functions to parse the EC2 RSA Private Key
// A BER object has 3 pieces
// type: (Numeric)
// Array: (Byte array)
// Value (Defined for integer)

// Expects a byte array, returns the values in hex
function parseRSAKey(bytes)
{
    var location = 0;
    var key = new Object()
    // Step 1 is to remove the wrapper
    if (bytes[0] != 0x30) {
        log("Expected to find a sequence");
        log("Found: " + bytes[0].toString(16));
        return null;
    }
    location++;
    var length = parseLength(bytes, location);
    location += length.length;
    key.bytes = bytes.slice(location, length.value + location);

    // Reset to the beginning, but now walk through the key
    location = 0;
    // First up is the version
    if (key.bytes[location++] != 0x02) {
        log("Did not find version");
        return null;
    }
    if (key.bytes[location] != 1 || key.bytes[location + 1] != 0) {
        log("We only understand version 0 keys.");
        return null;
    }
    location += 2;

    // Extract the modulus
    if (key.bytes[location++] != 0x02) {
        log("Did not find modulus");
        return null;
    }
    length = parseLength(key.bytes, location);
    location += length.length;
    key.N = bin2hex(key.bytes, location, length.value);
    location += length.value;

    // Extract public Exponent
    if (key.bytes[location++] != 0x02) {
        log("Did not find public Exponent");
        log("Found " + key.bytes[location - 1].toString(16));
        return null;
    }
    length = parseLength(key.bytes, location);
    location += length.length;
    key.E = bin2hex(key.bytes, location, length.value);
    location += length.value;

    // Extract private Exponent
    if (key.bytes[location++] != 0x02) {
        log("Did not find private Exponent");
        return null;
    }
    length = parseLength(key.bytes, location);
    location += length.length;
    key.D = bin2hex(key.bytes, location, length.value);
    location += length.value;

    // Extract prime1
    if (key.bytes[location++] != 0x02) {
        log("Did not find prime1");
        return null;
    }
    length = parseLength(key.bytes, location);
    location += length.length;
    key.P = bin2hex(key.bytes, location, length.value);
    location += length.value;

    // Extract prime2
    if (key.bytes[location++] != 0x02) {
        log("Did not find prime2");
        return null;
    }
    length = parseLength(key.bytes, location);
    location += length.length;
    key.Q = bin2hex(key.bytes, location, length.value);
    location += length.value;

    // Extract exponent1
    if (key.bytes[location++] != 0x02) {
        log("Did not find exponent1");
        return null;
    }
    length = parseLength(key.bytes, location);
    location += length.length;
    key.DP = bin2hex(key.bytes, location, length.value);
    location += length.value;

    // Extract exponent2
    if (key.bytes[location++] != 0x02) {
        log("Did not find exponent2");
        return null;
    }
    length = parseLength(key.bytes, location);
    location += length.length;
    key.DQ = bin2hex(key.bytes, location, length.value);
    location += length.value;

    // Extract coefficient
    if (key.bytes[location++] != 0x02) {
        log("Did not find coefficient");
        return null;
    }
    length = parseLength(key.bytes, location);
    location += length.length;
    key.C = bin2hex(key.bytes, location, length.value);
    location += length.value;

    return key;
}

// Note, this will break for excessively large values (> 2^53)
function parseLength(bytes, offset)
{
    var result = new Object();
    if (bytes[offset] < 0x80) {
        result.length = 1; // The length field is only 1 byte long
        result.value = bytes[offset];
    } else {
        result.length = 1 + bytes[offset] - 0x80; // How many bytes hold the
        // size (counting the first)
        result.value = 0;
        for ( var x = 1; x < result.length; x++) {
            result.value *= 256;
            result.value += bytes[offset + x];
        }
    }

    return result;
}

function bin2hex(bin, offset, length)
{
    if (offset == null) {
        offset = 0;
    }

    if (length == null) {
        length = bin.length;
    }

    var hex = "";
    var i = offset;
    var len = offset + length;

    while (i < len) {
        var h1 = bin[i++].toString(16);
        if (h1.length < 2) {
            hex += "0";
        }
        hex += h1;
    }

    return hex;
}

/*
 *
 * Base64 encode / decode http://www.webtoolkit.info/javascript-base64.html
 *
 */
var Base64 = {

    // private property
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    // public method for encoding
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
