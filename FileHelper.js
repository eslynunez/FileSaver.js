/*
*
*   FileHelper.js
*   Author: MobileSmith - Esly Nunez
*   Description: Create, save, and update files from the frontend.
*
*/

var fileHelper = {};
    /** Start FileHelper: Create **/
    /**
    *
     */
    fileHelper.saveAs = (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if(typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var doc = view.document,
		// only get URL when necessary in case Blob.js hasn't overridden it yet
		get_URL = function() {
			return view.URL || view.webkitURL || view;
		},
		save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a"),
		can_use_save_link = "download" in save_link,
		click = function(node) {
			var event = new MouseEvent("click");
			node.dispatchEvent(event);
		},
		is_safari = /constructor/i.test(view.HTMLElement) || view.safari,
		is_chrome_ios =/CriOS\/[\d]+/.test(navigator.userAgent),
		throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		},
		force_saveable_type = "application/octet-stream",
		// the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
		arbitrary_revoke_timeout = 1000 * 40, // in ms
		revoke = function(file) {
			var revoker = function() {
				if(typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			setTimeout(revoker, arbitrary_revoke_timeout);
		},
		dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if(typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		},
		auto_bom = function(blob) {
			// prepend BOM for UTF-8 XML and text/* types (including HTML)
			// note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
			if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				return new Blob([String.fromCharCode(0xFEFF), blob], {type: blob.type});
			}
			return blob;
		},
		FileSaver = function(blob, name, no_auto_bom) {
			if(!no_auto_bom) {
				blob = auto_bom(blob);
			}
			// First try a.download, then web filesystem, then object URLs
			var filesaver = this,
				type = blob.type,
				force = type === force_saveable_type,
				object_url,
				dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				},
				// on any filesys errors revert to saving with object URLs
				fs_error = function() {
					if((is_chrome_ios || (force && is_safari)) && view.FileReader) {
						// Safari doesn't allow downloading of blob urls
						var reader = new FileReader();
						reader.onloadend = function() {
							var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
							var popup = view.open(url, '_blank');
							if(!popup) view.location.href = url;
							url=undefined; // release reference before dispatching
							filesaver.readyState = filesaver.DONE;
							dispatch_all();
						};
						reader.readAsDataURL(blob);
						filesaver.readyState = filesaver.INIT;
						return;
					}
					// don't create more object URLs than needed
					if(!object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if(force) {
						view.location.href = object_url;
					} else {
						var opened = view.open(object_url, "_blank");
						if(!opened) {
							// Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
							view.location.href = object_url;
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				};
			filesaver.readyState = filesaver.INIT;

			if(can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				setTimeout(function() {
					save_link.href = object_url;
					save_link.download = name;
					click(save_link);
					dispatch_all();
					revoke(object_url);
					filesaver.readyState = filesaver.DONE;
				});
				return;
			}

			fs_error();
		},
		FS_proto = FileSaver.prototype,
		saveAs = function(blob, name, no_auto_bom) {
			return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
		};
	// IE 10+ (native saveAs)
	if(typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
		return function(blob, name, no_auto_bom) {
			name = name || blob.name || "download";

			if(!no_auto_bom) {
				blob = auto_bom(blob);
			}
			return navigator.msSaveOrOpenBlob(blob, name);
		};
	}

	FS_proto.abort = function(){};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	return saveAs;
}(
    typeof self !== "undefined" && self || typeof window !== "undefined" && window || this.content));

    /**
     *
     * @param {string} textObj
     * @param {string} fileName
     * @param {string} extension
     * @returns {boolean}
     */
    fileHelper.saveAsJSON = function(textObj,fileName, extension) {



        var data = JSON.parse(textObj),
            blob = new Blob([data], {type: "text/plain;charset=utf-8"});

        this.saveAs(blob,fileName+'.'+extension);
        return true;
    };

    /**
     * id: element Id as a string
     * callback: function to pass the JSON file data.
     * @description Get JSON data from uploaded file.
     * @param {string} elmId
     * @param {function} cb
     */
    fileHelper.readJSONFile = function(elmId, cb){
		var reader = new FileReader(),
            json_obj;

		reader.onload = function(event) {

		    var file = {};

            try {
                json_obj = JSON.parse(event.target.result);
            } catch (e) {
                throw new Exception('InvalidFileType','Invalid JSON File Uploaded');
            }

            file.srcElm = elmId;
            file.content =  json_obj;

            return cb(file);
		};

		// Index will always be zero if input only allows single upload.
		reader.readAsText(event.target.files[0]);
    };

    /**
    *
    * @param {string} elmId
    * @param {string} cb
    */
    fileHelper.readTextFile = function(elmId, cb){
        var reader = new FileReader(),
            file = {};

        reader.onload = function(event) {

            file.srcElm = elmId;
            file.content = event.target.result;
            return cb(file);
        };
        reader.readAsText(event.target.files[0]);
    };
    /**
     * name: Type of exception that occurred. InvalidFileType, InvalidDataType
     * message: A short helpful message.
     * @description:  Exception base function.
     * @param {string} type
     * @param {string} message
    */
    function Exception(type,message){
        this.type = type;
        this.message = message;
    }

// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if(typeof module !== "undefined" && module.exports){
  module.exports.fileHelper.saveAs = fileHelper.saveAs;
} else if((typeof define !== "undefined" && define !== null) && (define.amd !== null)) {
  define("FileHelper.js", function() {
    return saveAs;
  });
}
