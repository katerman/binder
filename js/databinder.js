/*
* binder.js - 0.23 (GOJIRA)
* Created By Kevin Reynolds <https://github.com/katerman>
*/

"use strict";
var Binder = function(){

	if(window.jQuery === undefined){
		console.error('dataBinder.js requires jQuery');
		return false;
	}

	var $this = this;

	this.models = {};

	this.elemsWithCurly = []; //during initial parse

	//Array to store data-{class} values
	this.elementClasses = [];

	//Array to store data-{values} .. values
	this.elementValues = [];

	//Property Defaults
	$this.properties = {
		"debug": "false",
		"modelDataAttr": "model",
		"clickDataAttr": "click",
		"classDataAttr": "class",
		"hideDataAttr": "hide",
		"showDataAttr": "show",
		"valueDataAttr": "value",
		"leftDelimiter": "{{",
		"rightDelimiter": "}}",
		"templateDataAttr": "template"
	}

	this.properties.set = function(prop, val){
		$this.properties[prop] = val;
	}

	this.properties.get = function(prop){
		return $this.properties[prop];
	}

	//Extend Functions for different sections
	this.basicExtendObj = { "init":[], "finish":[], "domUpdate":[] };
	this.customExtendObj = {};

	//Controllerss
	this.controllers = {};

	//Method defining some helper functions
	this.helpers = function(){

		if(Object.size === undefined){
			Object.size = function(obj) {
			    var size = 0, key;
			    for (key in obj) {
			        if (obj.hasOwnProperty(key)) size++;
			    }
			    return size;
			};
		}

	}();

	/* expressionEngine Method
	* @desc expressionEngine method a basic comparison function that will compare two values with a comparison operator supplied.
	* @param v1 '*' - First value to compare
	* @param operator 'Valid comparison operator (==,===, !==, !=, <, >, etc) ' - How to compare v1 and v2
	* @param v2 '*' - Second value to compare
	*/
	this.expressionEngine = function(v1,operator,v2){

		if(operator !== undefined){
			switch (operator) {
				case '!=':
					return (v1.toString() != v2.toString()) ? true : false;
				case '!==':
					return (v1.toString() !== v2.toString()) ? true : false;
				case '==':
					return (v1.toString() == v2.toString()) ? true : false;
				case '===':
					return (v1.toString() === v2.toString()) ? true : false;
				case '<':
					return (v1.toString() < v2.toString()) ? true : false;
				case '<=':
					return (v1.toString() <= v2.toString()) ? true : false;
				case '>':
					return (v1.toString() > v2.toString()) ? true : false;
				case '>=':
					return (v1.toString() >= v2.toString()) ? true : false;
				case '&&':
					return (v1.toString() && v2.toString()) ? true : false;
				case '||':
					return (v1.toString() || v2.toString()) ? true : false;
				default:
					console.error('Operator: '+ operator + 'cannot be used');
					return false;
			}
		}

		return (v1.toString()) ? true : false ;

	}


	this.prototype = {

		/* parseCurlys Method
		* @desc parseCurlys function figure out where each model is by delmiter ( default is {{}} ). Sets the elements in an object 'table' for dynamic updating.
		*/
		parseCurlys: function(){

			var elemsWithCurly = [];
			var regex = new RegExp('('+$this.properties.get('leftDelimiter')+'.*'+$this.properties.get('rightDelimiter')+')', 'gmi');

			if($this.properties.get('debug') == true){ console.log('Parsing curlies/Delims'); }

			//find EVERYTHING in the body
			$.each( $('body *').not('script'), function(k,v){

				var attrArray = [];
				var html = $(v)
				.clone()    //clone the element
				.children() //select all the children
				.remove()   //remove all the children
				.end()  //again go back to selected element
				.html();

				//if the element we're on contains some {{}} throw it in our 'elemswithcurly' array
				if(html.match(regex)){

					for(var i = 0, len = this.attributes.length; i < len; i++){
						var curAttr = this.attributes[i],
							type = curAttr['name'],
							value = curAttr['value'];

						if(value.match(regex)){
							attrArray.push({"type": type, "value": value});
						}
					}

					$this.elemsWithCurly.push({"elem":this, "orgHtml": $(this).html(), "orgAttrs": attrArray });
				}

			});

			//for each elem in elems with curly
			$.each($this.elemsWithCurly, function(k,v){
				var _this = v.elem,
					innertext = $(_this).text();

				//grab our outer html to play with
				var split = _this.outerHTML.split(regex);

				//for every split peice from regex we have of this element
				for(var i = 0, len = split.length; i < len; i++){
					var current = split[i];

					//if the current segement we're on contains a curly brace
					if(current.match(regex)){
						var splitcurrent = current.split(" ");

						//go through the segment and get rid of the curlys to add to the model
						for(var i2 = 0, len2 = splitcurrent.length; i2 < len2; i2++){
							var current2 = splitcurrent[i2];

							var restore = current2.match(regex);
							current2 = restore ? restore.join('') : '';

							current2 = current2.replace('{{', '');
							current2 = current2.replace('}}','');

							//if the model isnt set thats, fine put it in our modelss object
							if($this.models[current2] === undefined){
								$this.models[current2] = {};
							}

							//if we have our model set up check if we have elements as well if not set it up
							if($this.models[current2]['elems'] === undefined){
								$this.models[current2]['elems'] = [{ "elem": _this}];
							}else{
								$this.models[current2]['elems'].push( {"elem": _this} );
							}

							if($this.models[current2]['value'] === undefined){
								$this.models[current2]['value'] = null;
							}
						}
					}
				}
			});

		},

		/* replaceDelimWithModel Method
		* @desc replaceDelimWithModel Replaces all curlys dynamicly with their models value
		*/
		replaceDelimWithModel: function(){

			if($this.properties.get('debug') == true){ console.log('%cReplacing curly markers with model values', 'color: green;'); }

			var newVals = [];

			//for each element with curly brace(s)
			$.each($this.elemsWithCurly, function(k,v){

				var elem = v.elem;
				var html = v['orgHtml'];
				var attr = v['orgAttrs'];

				var keys = $.map($this.models, function(v, i){
					return i;
				});

				//go through each model and check if its in currently looped through element
				for(var i = 0, len = keys.length; i<len; i++){
					var currentModel = keys[i];
					//var currentObj = $this.models[currentModel];
					var regex = new RegExp('('+$this.properties.get('leftDelimiter')+keys[i]+$this.properties.get('rightDelimiter')+')', 'gmi');
					var value = $this.models[currentModel]['value'];

					//if our model has a null value
					if( value == undefined){

						//if our current element's html contains our currently looped through model
						if(html.match(regex) !== null){

							if(newVals[k] === undefined){
								newVals[k] = {"newHtml": html.replace(regex, ''), "attrs": [] } ;
							}else{
								newVals[k] = {"newHtml": newVals[k]['newHtml'].replace(regex, ''), "attrs": [] } ;
							}

						}else if(attr.length > 0 && newVals[k] == undefined){
							newVals[k] = {};

							if(newVals[k]['newHtml'] == undefined){
								newVals[k]['newHtml'] = html;
							}

							if(newVals[k]['attrs'] == undefined){
								newVals[k]['attrs'] = [];
							}
						}

					}else{ //if our model has a non null value

						//if our current element's html contains our currently looped through model
						if(html.match(regex) !== null){

							if(newVals[k] === undefined){
								newVals[k] = {"newHtml": html.replace(regex, value), "attrs": [] } ;
							}else{
								if(newVals[k]['newHtml'] == undefined){console.log(newVals[k]); return false;}
								newVals[k] = {"newHtml": newVals[k]['newHtml'].replace(regex, value), "attrs": [] } ;
							}

						}else if(attr.length > 0 && newVals[k] == undefined){
							newVals[k] = {};

							if(newVals[k]['newHtml'] == undefined){
								newVals[k]['newHtml'] = html;
							}

							if(newVals[k]['attrs'] == undefined){
								newVals[k]['attrs'] = [];
							}
						}
					}

					//if our element has attributes
					if( attr.length > 0 ){

						//loop through each attribute and add it to be replaced in our newVals obj
						for(var i2 = 0, len2 = attr.length; i2 < len2; i2++){
							var curAttr = attr[i2],
								type = curAttr['type'],
								attrvalue = curAttr['value'];

							if( attrvalue.match(regex) ){
								if(value == null){
									newVals[k]['attrs'].push( {"model": currentModel, "attr": type,"text": attrvalue.replace(regex, '')} );
								}else{
									newVals[k]['attrs'].push( {"model": currentModel, "attr": type,"text": attrvalue.replace(regex, value)} );
								}
							}

						}
					}

				}

				//overwrite the html
				$(elem).html( newVals[k]['newHtml'] );

				//overwrite the attrs
				if(newVals[k]['attrs'].length > 0){

					$.each(newVals[k]['attrs'], function(k,v){
						var attr = v.attr,
							text = v.text,
							model = v.model;

						$(elem).attr(attr, text);

					});
				}

			});

			//Data specific function firing
			$this.prototype.valueElemEvent();
			$this.prototype.classElemEvent();
			$this.prototype.hideElemEvent();
			$this.prototype.showElemEvent();
			$this.prototype.customExtend();

		},

		customExtend: function(){

			//defining custom domupdate events
			if( Object.size($this.customExtendObj) > 0){
				$.each($this.customExtendObj, function(k,v){

					var dataAttr = k.toLowerCase();
					var model = v.model;
					var eventType = v.eventType;
					var callback = v.callback;

					$.each( $('[data-'+dataAttr+']'), function(key,element){

						$(element).unbind(eventType).bind(eventType,function(){
							callback( {"element": $(element), "dataAttrVal":$(element).data(dataAttr), "model": $this.models[model]} );
							$this.prototype.customExtend();
						});

					});

				});

			}

		},

		//data-hide - hiding an element
		hideElemEvent: function(){

			//Hide element with hideDataAttr()
			$.each($('[data-'+$this.properties.get('hideDataAttr')+']'),function(k,elem){

				var segs = $(elem).data( $this.properties.get('hideDataAttr') ).split(" ");

				if(segs !== undefined && segs.length === 3){
					var model = segs[0];
					var compare = segs[1];
					var value = segs[2];

					if($this.models[model] !== undefined && $this.expressionEngine($this.models[model]['value'],compare,value)){
						$(elem).hide();
					}
				}else{
					console.error('data-' + $this.properties.get('hideDataAttr') + ' only accepts 3 segments as an expression - {model} !== 1 ');
				}

			});

		},

		//data-show - showing an element
		showElemEvent: function(){

			//Show element with showDataAttr()
			$.each($('[data-'+$this.properties.get('showDataAttr')+']'),function(k,elem){

				var segs = $(elem).data( $this.properties.get('showDataAttr') ).split(" ");

				if(segs !== undefined && segs.length === 3){
					var model = segs[0];
					var compare = segs[1];
					var value = segs[2];

					if($this.models[model] !== undefined && $this.expressionEngine($this.models[model]['value'],compare,value)){
						$(elem).show();
					}
				}else{
					console.error('data-' + $this.properties.get('showDataAttr') + ' only accepts 3 segments as an expression - {model} !== 1 ');
				}

			});

		},

		//data-value - value setting
		valueElemEvent: function(){
			$.each($('[data-'+$this.properties.get('valueDataAttr')+']'),function(k,elem){

				if($this.elementValues[k] === undefined){
					$this.elementValues.push( { model: $(elem).data($this.properties.get('valueDataAttr')) } );
				}

				var val =  $this.models[$this.elementValues[k]['model']];

				//if value is not undefined
				if( val != undefined){

					//specifically target selects
					if(elem.tagName === 'SELECT'){

						//if we have any children with our value
						if( $(elem).children('[value="'+val['value']+'"]').length > 0){
							$(elem).val( val['value'] ); //update the val
						}

					}else{
						$(elem).val( val['value'] );
					}
				}

			});
		},

		//Data-class - class setting
		classElemEvent: function(){

			//classAttr Adding/updating class(s) through the data-{class}
			$.each($('[data-'+$this.properties.get('classDataAttr')+']'),function(k,elem){

				var finalClassStr = '';

				if($this.elementClasses[k] === undefined){
					$this.elementClasses.push( $(elem).attr('class') );
				}

				if($(elem).data( $this.properties.get('classDataAttr') )){

					$(elem).attr('class', '');

					var finalClasses = {};

					var classes = $(elem).data( $this.properties.get('classDataAttr') ).split(" ");

					$.each($this.elementClasses[k].split(" "),function(k,value){
						if(finalClasses[value] === undefined){
							finalClasses[value] = value;
						}
					});

					$.each(classes, function(k,value){
						if($this.models[value].value !== null && finalClasses[value] === undefined){
							finalClasses[value] = $this.models[value].value;
						}
					});

					$.each(finalClasses, function(k,v){
						finalClassStr += v + ' ';
					});

					$(elem).attr('class', finalClassStr);

				}
			});
		},

		/* domEvents Method
		* @desc domEvent method binds events to specific elements with binder specific Attributes (data-model, data-click, etc..)
		* @param name 'String' - Name of the model this controller
		* @param callback 'Function' - function to fire on model update. Function passed in has 2 arguments to use (element, modelValue).
		*/
		domEvents: function(){

			//input on keyup with modelAttr
			$('[data-'+$this.properties.get('modelDataAttr')+']').unbind('keyup change').bind('keyup change', function(){
				var model = $(this).data( $this.properties.get('modelDataAttr') );

				$this.model( model, $(this).val() );

				$this.controller.call($(this),model);
			});

			//elements with clickAttr
			$('[data-'+$this.properties.get('clickDataAttr')+']').unbind('click').bind('click',function(){

				var segs = $(this).data($this.properties.get('clickDataAttr')).split(" ");

				if(segs.length === 3){
					var model = segs[0];
					//var compare = segs[1];
					var value = segs[2];
					$this.model( model, value );
				}else{
					console.error('data-'+$this.properties.get('clickDataAttr') + ' require 3 parts to its expression - {model} = {value}');
				}

				$this.controller.call($(this), model);

			});

			//defining custom domupdate events
			if( Object.size($this.basicExtendObj['domUpdate']) > 0){
				$.each($this.basicExtendObj['domUpdate'], function(k,v){
					v.call();
				});
			}

		}

	}

	/* controller Method
	* @desc Controller Method creates callbacks on specific dataModel updates
	* @param name 'String' - Name of the model this controller
	* @param callback 'Function' - function to fire on model update. Function passed in has 2 arguments to use (element, modelValue).
	*/
	this.controller = function(name, callback){
		if($this.models[name] === undefined){
			$this.model(name, '');
		}

		$this.controllers[name] = callback;

		if($this.properties.get('debug')){console.log('%cDefined model callback for ' + name, "color: orange" );}

	}

	/* controller.call Method
	* @desc Calls a specific controllers function
	* @param element 'DOM Element' - On dom event firing. This method will fire on the updating element.
	* @param model 'String' - Optional model, controller.call will take the element passed in and check its data-model, however you can force a model by passing in this 2nd argument
	*/
	this.controller.call  = function(element,model){

		if(model !== undefined){
			var dataModel = model; //we know what our model is because we passed it in!
		}else{
			var dataModel = $(element).data( $this.properties.get('modelDataAttr')); //pull the model from data-model
		}

		if( $this.controllers[ dataModel ] !== undefined ){
			$this.controllers[ dataModel ](element, $this.models[dataModel]);
			if($this.properties.get('debug')){console.log('%c-model callback fired for: ' + dataModel, "color: brown;" );}
			return true;
		}
		return false;
	}

	/* model Method
	* @desc If the passed in model does not exist it will create the model with passed in value. If it does exist it will just update the models value.
	* @param mod 'String|Object' - Model name, or Object of model names with its value
	* @param val 'String' - Value of the passed in model (only if you passed in a singular model)
	*/
	this.model = function(mod,val){

		if(typeof mod === 'object'){

			$.each(mod, function(k,v){
				var mod = k,
					val = v;

				if($this.models[mod] === undefined){
					$this.models[mod] = {};
					if($this.properties.get('debug') == true){ console.log('Adding model: ' + mod + ' to Value: ' + val ); }
				}else{
					if($this.properties.get('debug') == true){ console.log('Updated model: ' + mod + ' to Value: ' + val ); }
				}

				$this.models[mod]['value'] = val;

			});

		}else{

			if($this.models[mod] === undefined){
				$this.models[mod] = {};
				if($this.properties.get('debug') == true){ console.log('Adding model: ' + mod + ' to Value: ' + val ); }
			}else{
				if($this.properties.get('debug') == true){ console.log('Updated model: ' + mod + ' to Value: ' + val ); }
			}

			$this.models[mod]['value'] = val;

		}

		$this.prototype.replaceDelimWithModel();

		return true;
	}

	/* extend Method
	* @desc This method passes functions into specific starting points (init, domUpdate, finish)
	* @param mod 'String|Object' - Model name, or Object of model names with its value
	* @param val 'String' - Value of the passed in model (only if you passed in a singular model)
	*/
	this.extend = function(when,funct){

		if(typeof when === 'object'){ //if more customly defined extend

			var model = when.model === undefined ?  '' : when.model ; // model we have
			var data = when.data === undefined ? null : when.data ; //data to fire on
			var callback = when.data === undefined ? null : when.callback ; //callback
			var eventType = when.eventType === undefined ? 'click' : when.eventType ; //callback

			if(data == null){
				return error.log('data key is requried for the extend method.');
			}else if(callback == null){
				return error.log('callback key is requried for the extend method.');
			}

			return $this.customExtendObj[data] = {"model": model, "callback": callback, "eventType": eventType};

		}else{ //if regular extend such as 'init, domupdate or finish'
			if( $this.basicExtendObj[when] === undefined ){
				return console.error('You cant use a firing position of ' + when + ' the only options are init, finish, and domUpdate');
			}else if(typeof funct !== 'function'){
				return console.error('Extends second option needs to be a function');
			}else{
				return $this.basicExtendObj[when].push(funct);
			}
		}

	}

	/* Templating */

	// Id's related to each template we have
	this.templates = [];

	this.template = {

		renderRemote: function(thisTempAttr, k, tempAttr){

			$(k).removeAttr('data-'+tempAttr).removeData(tempAttr);

			var ajaxCall = $.ajax({
				method: "GET",
				url: thisTempAttr,
			});

			ajaxCall.error(function(error){
				console.error('Template "' + thisTempAttr + '" not found');
				return true;
			})

			$.when( ajaxCall ).done(function(data, textStatus, jqXHR){

				$(k).html(data);

				if($this.properties.get('debug')){ console.log('%cReplaced', $(k), 'with remote template', thisTempAttr) ; }
			});

		},

		/* template.gather()
		* Collects all id's from each element with data-template and adds them to our this.templates array
		*/
		gather: function(){

			var tempAttr = $this.properties.get('templateDataAttr');
			var _this = this;

			$.each( $('[data-'+tempAttr+']') , function(i,k){

				var thisTempAttr = $(k).data(tempAttr);

				//if it has a slash in it, we will just assume we need to retreive it
				if( thisTempAttr.match('.html') ){
					_this.renderRemote(thisTempAttr, k, tempAttr);
				}else{
					$this.templates.push( thisTempAttr );
				}

			});

			$(document).ajaxStop(function(){
				if($('[data-'+tempAttr+']').length !== 0){
					return false;
				}

				return true;
			});
		},

		/* template.render()
		* replaces all type/binder-templates with their corresponding local template
		*/
		renderLocal: function(){

			if($this.properties.get('debug')){ console.log('Rendering internal templates'); }

			$.each($this.templates, function(i,k){
				var currHtml = $('#'+k).html();
				$('[data-'+$this.properties.get('templateDataAttr')+']').html(currHtml);
			});
		},
		init: function(){

			//if gather finished
			if(this.gather() === true){
				return true;
			}

			$(document).ajaxStop(function(){

				return $this.template.init();

			});

		}

	};

	//Init
	this.init = function(){

		if($this.properties.get('debug')){ console.log('%c:BINDER INIT:', 'color: #1b75bc; border-bottom: 1px solid #6677ff;'); }
		if($this.properties.get('debug')){ console.time(":Binder Setup Time:"); }

		//templates
		$this.template.init();

		$(document).ajaxStop(function(){

			//defining custom init events
			if( Object.size($this.basicExtendObj['init']) > 0){
				$.each($this.basicExtendObj['init'], function(k,v){
					v.call($this);
				});
			}

			var prototype = $this.prototype;

			prototype.parseCurlys();

			prototype.replaceDelimWithModel();

			prototype.domEvents();

			if($this.properties.get('debug')){console.timeEnd(":Binder Setup Time:");}

			if($this.properties.get('debug')){console.log(this);}

			//defining custom finish events
			if( Object.size($this.basicExtendObj['finish']) > 0){
				$.each($this.basicExtendObj['finish'], function(k,v){
					v.call($this);
				});
			}

		});

	}


}

