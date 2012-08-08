//********************************************************************************//
// @author : Julie Cardinal
// @version : 1.0
// @Description: This plugin swap the actual content with new content provided by ajax
//               and override the browser history with pushState(or with hashtag for older browsers)

//*******************************************************************************//

(function($) {


    var isModern = isSupportPushState(),            // Allows to know if we're in a Browser that support pushState or not
        History = window.History,
        State = History.getState(),
        oldStateUrl,
        oldHash;


    /***********************************************************************************
     * DATA MODEL OBJECT
     **********************************************************************************/
        // Log Initial State
        History.log('initial:', State.data, State.title, State.url);


    function UrlBuild (data) {
        this.protocol= data.protocol || "";
        this.username= data.username || "";
        this.host= data.host || "";
        this.path= data.path || "";
        this.params= data.params || "";
        this.anchor= data.anchor || "";
    }

    function Params(data) {
        this.params = data.params || {};
    }


    /***********************************************************************************
     * EVENTS
     **********************************************************************************/


    $(window).bind('statechange',function(){
        console.log("statechange");

        var State = History.getState(); // Note: We are using History.getState() instead of event.state
            History.log('statechange:', State.data, State.title, State.url);

        // Verify if the new state url is different than the last one
        // (ex: first: product-section.html and the second trigger : product-section.html?expander1=true
        //      We don't want reload the page because it's just new query                               )
        var type = State.data.type,
            target= State.data.target,
            url= State.url,
            urlClean =  getUrlToClean(State.url),
            oldUrlClean = getUrlToClean(oldStateUrl);   // Remove the query argument;

        if (oldUrlClean !== urlClean) {
            if($(State.data.target).length > 0) {
                target= State.data.target;
            } else {
                target = ".swapcontent";
            }
            loadNewContent({url:url,target:target});
            oldStateUrl = urlClean;
            oldHash=null;
        }

    });

    $(window).bind("anchorchange", function(event, params) {
        History.log('Hash change:', State.data, State.title, State.url);
        var newUrl;
            // We only need to target for not modern browser
        if(!isModern) {
            newUrl=  getUrlParams(History.getState().url) ? getUrlParams(History.getState().url).swaptarget : null;
        } else {
            newUrl=  getUrlToClean(History.getState().url);
        }

        var oldUrlClean = getUrlToClean(oldStateUrl);

        if(newUrl && newUrl != oldUrlClean) {
            loadNewContent({url:newUrl, target:".swapcontent"});
            oldStateUrl = newUrl;
        }

    });


    /***********************************************************************************
     * FUNCTIONNAL
     **********************************************************************************/

    function init() {

        oldStateUrl = History.getState().url;

        $("body").delegate("[data-ajax-target]", "click", function(evt) {
            var $current =  $(evt.currentTarget),
                url = $current.attr("href"),
                target = $current.attr("data-ajax-target") ;

            if($(target).length > 0) {
                oldStateUrl = History.getState().url;
                History.pushState({target:target,type:"swapcontent"}, null, url);
            } else {
                console.log("SwapContent: This target isn' valid, please enter valid one" + target );
            }

            evt.preventDefault();
        });

        reEnhanceAjaxLink(window.location.href);
    }


    function reEnhanceAjaxLink(currentPageUrl) {

        $("a[data-ajax-target]").each(function(index,value){
                var $this = $(this),
                    oldHref = $(this).attr("href");
                $this.attr("href",addQueryInURL(oldHref,{isAjax:true}));
        });

        $("a[href^='#']").each(function(index,value) {
            var $this = $(this),
                currentUrl = getUrlToClean(currentPageUrl),
                queries = isModern ? {isAjax:false} : {isAjax:false,swaptarget:currentUrl},
                oldHref = $(this).attr("href").replace("#",""),
                newUrl;

            newUrl = oldHref != "" ? "#"+ addQueryInURL(oldHref,queries) :  "#"+ getQueryString(queries) ;
            $this.attr("href",newUrl);
        });
    }

    function loadNewContent(opts) {
        $.ajax({
            url: opts.url,
            dataType: "html",
            success: function(data) {
                data = $("<div>"+getDocumentHtml(data)+"</div>");
                opts.data = data;
                handleNewContent(opts);
            }, error: function(jqXHR, textStatus, errorThrown) {
                console.log("error");
            }
        });
    }


    function handleNewContent(opts) {
        var $elem = $(opts.target),
            targetWithoutPrefix = opts.target.substr(1,opts.target.length);
        $data = $(opts.data).hasClass(targetWithoutPrefix) || $(opts.data).is("[id='"+targetWithoutPrefix+"']") ? $(opts.data) : $(opts.data).find(opts.target);

        $elem.replaceWith($data);

        $(window).trigger("swapcontent_change");
        reEnhanceAjaxLink(opts.url);
    }



    /***********************************************************************************
     * GETTER
     **********************************************************************************/

    function getUrlToClean(url) {
        var urlObj = $.url.parse(url),
            urlHtml = urlObj.path;
        return urlHtml;
    }

    /**
     * Replace # by / and remove query or everything begin with /
     * @param hash {String}
     * @return {String}
     */
    function getHashToClean(hash) {
        var hash = hash.replace("#","/").replace(/\?.*/,'');
        return hash;
    }

    /**
     * Convert Object to QueryString
     * Ex: var queries= {isAjax:true, swaptarget: "/product-solution.html"}
     *     Return: ?isAjax=true&swaptarget=/product-solution.html
     * @param query{Object}:
     * @return {String}
     */
    function getQueryString(query) {
        var queryString = "?",
            loopIndex=0;

        $.each(query,function(index,value) {
            if(loopIndex!=0) {
                queryString+="&";
            }
            queryString+=index+"="+value;
            loopIndex++;
        });

        return encodeURI(queryString);
    }


    function addQueryInURL(url,query) {
        var urlParsed = $.url.parse(url),
            newQuery = new Params (urlParsed);

        $.each(query,function(queryName,queryValue) {
            newQuery.params[queryName] = queryValue;
        });

        $.extend(urlParsed,newQuery);
        var newObjUrl = new UrlBuild(urlParsed);
        return $.url.build(newObjUrl);
    }

    /**
    * Detect if the browser support or not the HTML5 history
    * @return {Boolean}
    */
    function isSupportPushState() {
        return !!(window.history && window.history.pushState);
    }


    /**
     * Return all params from a url
     * @param url{String}: Url that contains Param
     * @return {String}
     */
    function getUrlParams(url) {
        return $.url.parse(url).params;
    }

    /**
     * converts the HTML String in a format that can be converted into jQuery
     * @param html
     * @return {String}
     */
    function getDocumentHtml(html){
        // Prepare
        var result = String(html)
                .replace(/<\!DOCTYPE[^>]*>/i, '')
                .replace(/<(html|head|body|title|meta)([\s\>])/gi,'<div class="document-$1"$2')
                .replace(/<\/(html|head|body|title|meta)\>/gi,'</div>')
            ;

        // Return
        return result;
    }


    init();

})(jQuery);




