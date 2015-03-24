/*
* DataBinder.js - 0.1
* Created By Kevin Reynolds <https://github.com/katerman>
*/

"use strict";
var dataBinder = function(md){

	if(window.jQuery === undefined){
		console.error('dataBinder.js requires jQuery');
		return false;
	}

	var $this = this;

	//debug switch
	this.debug = function(bool){
		return $this.debug = bool;
	};

	//default model data attribute
	this.ModelDefault = md === undefined ? 'data-model' : md ;

	//Object to hold dataModels
	this.dataModels = {};

	//Model callbacks
	this.controllerCallbacks = {};

	//hiding default 'data-'+this.hideDataAttr
	this.hideDataAttr = 'hide';

	//hold all hiding data attrs here so we dont need to loop through every update
	this.hideObj = {};

	//showing default 'data-'+this.showDataAttr
	this.showDataAttr = 'show';

	//hold all showing data attrs here so we dont need to loop through every update
	this.showObj = {};

	//t
	this.clickDataAttr = 'click';

	/*
	* Method helps figure out what kind of data we should get from the
	* element not all elements share the same data
	*/
	this.dataDecider = function(el){
		var el = el[0];

		if($(el).data($this.clickDataAttr) !== undefined){
			return $(el).data($this.clickDataAttr);
		}

		if(el.value !== undefined){
			return el.value;
		}else if(el.innerText !== undefined){
			return el.innerText;
		}else{
			return '';
		}
	}

	/*
	* Runs through each element matching any of our data attributes
	* and add its to its matching Object
	*/
	this.dataParser = function(){

		if($this.debug){console.log('---- Parsing Data ----');}

		//setup each model
		$.each($('['+$this.ModelDefault+']'), function(k,v){

			var t = $(this),
				model_name = t.data($this.ModelDefault.split('data-')[1]);

			if($this.debug){ console.log('---- dataModels['+model_name+'] = ' + $this.dataDecider(t)); }

			$this.dataModels[model_name] = $this.dataDecider(t);
		});

		//setup each showdata
		$.each($('[data-'+$this.showDataAttr+']'),function(k,v){
			var _this = $(v),
				spec_show_obj = $this.showObj[_this.data($this.showDataAttr).split(' ')[0]],
				_this_class = 'data-'+$this.showDataAttr+'-'+k;

			_this.addClass(_this_class);

			if(spec_show_obj === undefined){
				$this.showObj[_this.data($this.showDataAttr).split(' ')[0]] = {};
			}

			$this.showObj[_this.data($this.showDataAttr).split(' ')[0]][_this_class] = _this.data($this.showDataAttr).split(' ');
		});

		//setup each hidedata
		$.each($('[data-'+$this.hideDataAttr+']'),function(k,v){
			var _this = $(v),
				spec_hide_obj = $this.hideObj[_this.data($this.hideDataAttr).split(' ')[0]],
				_this_class = 'data-'+$this.hideDataAttr+'-'+k;

			_this.addClass(_this_class);

			if(spec_hide_obj === undefined){
				$this.hideObj[_this.data($this.hideDataAttr).split(' ')[0]] = {};
			}

			$this.hideObj[_this.data($this.hideDataAttr).split(' ')[0]][_this_class] = _this.data($this.hideDataAttr).split(' ');

		});

	};

	this.valueComparisonSwitch = function(v1,operator,v2){

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

	/*
	* Works similarly to dataDecider() but for updating values
	*/
	this.upateModelValueCorrectly = function(el,val,_this){

		var el = el === null ? null : el[0],
			_this = _this[0];

		//click
		if($(_this).data($this.clickDataAttr) !== undefined){
			var clickData = $(_this).data('model');
			$this.dataModels[clickData] = val;
		}

		//hiding
		var _this_hide_obj = $this.hideObj[$(_this).data('model')];

		if($this.hideObj[$(_this).data('model')] !== undefined ){

			 $.each(_this_hide_obj,function(k,v){

				var value1 = v[0],
					comparison = v[1],
					value2 = v[2];

				if($this.valueComparisonSwitch($this.dataModels[value1],comparison,value2)){
					$('.'+k).hide();
				}

			 });

		}

		//showing
		var _this_show_obj = $this.showObj[$(_this).data('model')];

		if($this.showObj[$(_this).data('model')] !== undefined ){

			 $.each(_this_show_obj,function(k,v){

				var value1 = v[0],
					comparison = v[1],
					value2 = v[2];

				if($this.valueComparisonSwitch($this.dataModels[value1],comparison,value2)){
					$('.'+k).show();
				}

			 });

		}

		if($(_this).data($this.clickDataAttr) !== undefined){return;}

		//this first
		if( (_this.type === 'checkbox' || _this.type === 'radio') && $(_this).data('model-force') !== true){
			return;
		} else if(_this.type === 'checkbox' && _this.checked === false){
			$(el).text('');
			$(el).val('');
			return;
		}

		//then element
		//updating the value

		if(el === null){return;}

		if(el.nodeName === 'SELECT'){
			if( $(el).children('[value="'+val+'"]').length > 0 ){
				$(el).val(val);
				return;
			}

			return;
		}else if(el.type === 'checkbox' || el.type === 'radio'){
			if($(el).val() === val){
				el.checked = true;
			}else{
				el.checked = false;
			}
			return;
		}

		$(el).text(val);
		$(el).val(val);
		return;

	}

	/*
	* Controller Method creates callbacks on specific dataModel updates
	*/
	this.controller = function(name, callback){
		if($this.dataModels[name] === undefined){
			return console.error('model: '+ name +' is not defined cannot set up controller');
		}

		$this.controllerCallbacks[name] = callback;

		if($this.debug){console.log('%cDefined model callback for ' + name, "color: orange" );}

	}

	/*
	* Whenever one of our models changes we update it using this method
	*/
	this.ModelsUpdate = function(){

		function update(t,k,v,e){

				var t = $(t),
					data = $this.dataDecider(t);

				$this.dataModels[k] = data;

				if($this.debug){console.log('%cUpdating dataModel ' + k + ' = '+ data, "color: #78B4F9" );}

				$this.upateModelValueCorrectly( $('['+$this.ModelDefault+'='+k+']').not($(t)), data, $(t) );

				if($this.controllerCallbacks[k] !== undefined){
					$this.controllerCallbacks[k](t,data);
					if($this.debug){console.log('%c-model callback fired for ' + k, "color: green" );}
				}

				e.stopPropagation();

		}

		//setup onClick
		$.each($('[data-'+$this.clickDataAttr+']'),function(k,v){

			if($this.debug){console.log('-Binding click events');}

			$(v).on('click', function(e){
				var _this = $(v),
					_thisModel = _this.data('model');
				if($this.debug){console.log('click update: ' + _this.data($this.clickDataAttr) +' bound to ' + _thisModel )}

				update(_this,_thisModel,v,e);

			});
		});

		$.each($this.dataModels,function(k,v){


			$('['+$this.ModelDefault+'='+k+']').bind('keyup change', function(e){

				update($(this),k,v,e);

			});


		});

	};

	/*
	* Start the engines
	*/
	this.init = function(){

		if($this.debug){console.log("%c:Binder Debug Activated:", "color: #1b75bc;");}
		if($this.debug){console.time(":Binder Setup Time:");}

		$this.dataParser();
		$this.ModelsUpdate();

		if($this.debug){console.timeEnd(":Binder Setup Time:");}

	};


};

