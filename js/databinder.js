/*
* binder.js - 0.21 (BIGFOOT)
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

	//debug switch
	this.debug = function(bool){
		return $this.debug = bool;
	};

	//you can overwrite the dataAttr name
	this.modelDataAttr = function(name){
		return name || 'model';
	}

	//you can overwrite the clickAttr name
	this.clickDataAttr = function(name){
		return name || 'click';
	}

	//you can overwrite the classAttr name
	this.classDataAttr = function(name){
		return name || 'class';
	}

	//you can overwrite the hideAttr name
	this.hideDataAttr = function(name){
		return name || 'hide';
	}

	//you can overwrite the showAttr name
	this.showDataAttr = function(name){
		return name || 'show';
	}

	//you can overwrite the valueAttr name
	this.valueDataAttr = function(name){
		return name || 'value';
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
		* @desc parseCurlys function figure out where each double bracket model ( {{}} ) definer is. Sets the elements in an object 'table' for dynamic updating.
		*/
		parseCurlys: function(){

			var elemsWithCurly = [];
			var regex = new RegExp('(\{\{.*\}\})', 'gmi');

			if($this.debug == true){ console.log('Parsing curlies'); }

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

		/* replaceCurlysWithModel Method
		* @desc replaceCurlysWithModel Replaces all curlys dynamicly with their models value
		*/
		replaceCurlysWithModel: function(){

			if($this.debug == true){ console.log('%cReplacing curly markers with model values', 'color: green;'); }

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
					var regex = new RegExp('\{\{'+keys[i]+'\}\}', 'gmi');
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
			$.each($('[data-'+$this.hideDataAttr()+']'),function(k,elem){

				var segs = $(elem).data( $this.hideDataAttr() ).split(" ");

				if(segs !== undefined && segs.length === 3){
					var model = segs[0];
					var compare = segs[1];
					var value = segs[2];

					if($this.models[model] !== undefined && $this.expressionEngine($this.models[model]['value'],compare,value)){
						$(elem).hide();
					}
				}else{
					console.error('data-' + $this.hideDataAttr() + ' only accepts 3 segments as an expression - {model} !== 1 ');
				}

			});

		},

		//data-show - showing an element
		showElemEvent: function(){

			//Show element with showDataAttr()
			$.each($('[data-'+$this.showDataAttr()+']'),function(k,elem){

				var segs = $(elem).data( $this.showDataAttr() ).split(" ");

				if(segs !== undefined && segs.length === 3){
					var model = segs[0];
					var compare = segs[1];
					var value = segs[2];

					if($this.models[model] !== undefined && $this.expressionEngine($this.models[model]['value'],compare,value)){
						$(elem).show();
					}
				}else{
					console.error('data-' + $this.showDataAttr() + ' only accepts 3 segments as an expression - {model} !== 1 ');
				}

			});

		},

		//data-value - value setting
		valueElemEvent: function(){
			$.each($('[data-'+$this.valueDataAttr()+']'),function(k,elem){

				if($this.elementValues[k] === undefined){
					$this.elementValues.push( { model: $(elem).data($this.valueDataAttr()) } );
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
			$.each($('[data-'+$this.classDataAttr()+']'),function(k,elem){

				var finalClassStr = '';

				if($this.elementClasses[k] === undefined){
					$this.elementClasses.push( $(elem).attr('class') );
				}

				if($(elem).data( $this.classDataAttr() )){

					$(elem).attr('class', '');

					var finalClasses = {};

					var classes = $(elem).data( $this.classDataAttr() ).split(" ");

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
			$('[data-'+$this.modelDataAttr()+']').unbind('keyup change').bind('keyup change', function(){
				var model = $(this).data( $this.modelDataAttr() );

				$this.model( model, $(this).val() );

				$this.controllerCall($(this),model);
			});

			//elements with clickAttr
			$('[data-'+$this.clickDataAttr()+']').unbind('click').bind('click',function(){

				var segs = $(this).data($this.clickDataAttr()).split(" ");

				if(segs.length === 3){
					var model = segs[0];
					//var compare = segs[1];
					var value = segs[2];
					$this.model( model, value );
				}else{
					console.error('data-'+$this.clickDataAttr() + ' require 3 parts to its expression - {model} = {value}');
				}

				$this.controllerCall($(this), model);

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

		if($this.debug){console.log('%cDefined model callback for ' + name, "color: orange" );}

	}

	/* controllerCall Method
	* @desc Calls a specific controllers function
	* @param element 'DOM Element' - On dom event firing. This method will fire on the updating element.
	* @param model 'String' - Optional model, controllerCall will take the element passed in and check its data-model, however you can force a model by passing in this 2nd argument
	*/
	this.controllerCall  = function(element,model){

		if(model !== undefined){
			var dataModel = model; //we know what our model is because we passed it in!
		}else{
			var dataModel = $(element).data( $this.modelDataAttr()); //pull the model from data-model
		}

		if( $this.controllers[ dataModel ] !== undefined ){
			$this.controllers[ dataModel ](element, $this.models[dataModel]);
			if($this.debug){console.log('%c-model callback fired for: ' + dataModel, "color: brown;" );}
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
					if($this.debug == true){ console.log('Adding model: ' + mod + ' to Value: ' + val ); }
				}else{
					if($this.debug == true){ console.log('Updated model: ' + mod + ' to Value: ' + val ); }
				}

				$this.models[mod]['value'] = val;

			});

		}else{

			if($this.models[mod] === undefined){
				$this.models[mod] = {};
				if($this.debug == true){ console.log('Adding model: ' + mod + ' to Value: ' + val ); }
			}else{
				if($this.debug == true){ console.log('Updated model: ' + mod + ' to Value: ' + val ); }
			}

			$this.models[mod]['value'] = val;

		}

		$this.prototype.replaceCurlysWithModel();

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

	//Init
	this.init = function(){

		if($this.debug){ console.log('%c:BINDER INIT:', 'color: #1b75bc; border-bottom: 1px solid #6677ff;'); }
		if($this.debug){ console.time(":Binder Setup Time:"); }

		//defining custom init events
		if( Object.size($this.basicExtendObj['init']) > 0){
			$.each($this.basicExtendObj['init'], function(k,v){
				v.call($this);
			});
		}

		var prototype = $this.prototype;

		prototype.parseCurlys();

		prototype.replaceCurlysWithModel();

		prototype.domEvents();

		if($this.debug){console.timeEnd(":Binder Setup Time:");}

		if($this.debug){console.log(this);}

			//defining custom finish events
		if( Object.size($this.basicExtendObj['finish']) > 0){
			$.each($this.basicExtendObj['finish'], function(k,v){
				v.call($this);
			});
		}

	}


}

