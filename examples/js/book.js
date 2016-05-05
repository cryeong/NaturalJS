(function(window) {
	var CurlInfo = function() {
		this.time = 0.0;
		this.radius = 0.000001;
		this.angle = 0.0;
		this.offset = 0.0;
		this.isLeft = false;
	};
	CurlInfo.prototype = {
		copy: function(curl) {
			this.time = curl.time;
			this.radius = curl.radius;
			this.angle = curl.angle;
			this.offset = curl.offset;
			this.isLeft = curl.isLeft;
		},
		reset: function() {	
			this.time = -0.1;
			this.radius = 0.000001;
			this.angle = 0.0;
			this.offset = 0.0;
			this.isLeft = false;
		}
	};
	window.CurlInfo = CurlInfo;
}(window));
(function(window) {
	var IDLE = 0;
	var ANIMATING = 1;
	var INTERACTING = 2;
	var Page = function(opts) {
		this.info = new CurlInfo();
		this.next = null;
		this.prev = null;
		this.id = opts.id;
		this.image = opts.image;
		this.transparent = opts.transparent;
		this.reset();
	};

	Page.IDLE = IDLE;
	Page.ANIMATING = ANIMATING;
	Page.INTERACTING = INTERACTING;

	Page.prototype = {
		reset: function() {
			this.info.reset();
			this.status = IDLE;
		}
	};

	window.Page = Page;
}(window));
(function(window) {
	Natural.exposeNature(this);
	/*
	Build page geometry, with some helper functions
	*/
	var PageFactory = function(opts) {
		this.opts = opts;

		this.offsetZ = opts.offsetZ || 0;
		this.usePerspective = opts.usePerspective || false;
		this.textureSize = opts.textureSize || 1024;
		this.column = opts.column || PageFactory.SINGLE;
		this.orientationDetection = opts.orientationDetection || false;
		this.convert2to3 = opts.convert2to3; // important

		this.setup(opts);
	};

	PageFactory.SINGLE = 0;
	PageFactory.DOUBLE = 1;
	PageFactory.LEFT = 2;
	PageFactory.RIGHT = 3;

	var RADIUS_RANGE = 100.1;

	var sperimeter = 0.0;
	var rad = 0.0;
	var rot = 0.0;
	var i = 0.0;
	var j = 0.0;
	var backOffset = 0.0;
	var gtl = null;
	var gtr = null;
	var gbl = null;
	var gbr = null;
	var perspectiveOrigin = {x:0.0, y:0.0};
	var worldSize = {x:0.0, y:0.0, hx: 0.0, hy: 0.0};
	var dragging = false;
	//var curlInfo = {time: -0.1, angle: 0.0, radius: 0.000001, offset: 0.0};
	var curlInfo = new CurlInfo();
	var mousePos = {x:0.0, y:0.0};
	var originPos = {x:0.0, y:0.0};
	var startPos = {x:0.0, y:0.0};
	var movePos = {x:0.0, y:0.0};
	var origin = {x:0.0, y:0.0};
	var t = {x: 0.0, y:0.0};
	var ta = 0.0;
	var tl = 0.0;
	var o = {x: 0.0, y:0.0};
	var oa = 0.0;
	var ol = 0;
	var v = {x: 0.0, y:0.0};
	var va = 0.0;
	var vl = 0.0;
	var b = {x: 0.0, y:0.0};
	var ba = 0.0;
	var bl = 0.0;
	var s = {x: 0.0, y:0.0};
	var sa = 0.0;
	var sl = 0.0;
	var pir = 0.0;
	var rot = 0.0;
	var radius = 0.0;
	var offsetx = 0.0;
	var startSide = PageFactory.RIGHT;
	var flipDirection = PageFactory.RIGHT;
	var verticeCount = 0;
	var hypotenuseUV = 0.0;
	var flip = 0;

	PageFactory.prototype = {
		setup: function( opts ) {
			this.width = window.innerWidth;
			this.height = window.innerHeight;
			this.halfWidth = this.width / 2;
			this.halfHeight = this.height / 2;

			if(typeof(opts.offsetZ)!='undefined')
				this.offsetZ = opts.offsetZ;
			if(typeof(opts.usePerspective)!='undefined')
				this.usePerspective = opts.usePerspective;
			if(typeof(opts.textureSize)!='undefined')
				this.textureSize = opts.textureSize;
			if(typeof(opts.column)!='undefined')
				this.column = opts.column;
			if(typeof(opts.orientationDetection)!='undefined')
				this.orientationDetection = opts.orientationDetection;
			if(typeof(opts.convert2to3)!='undefined')
				this.convert2to3 = opts.convert2to3;

			var ts = this.textureSize;
			this.hypotenuse = Math.sqrt(ts*ts*4+ts*ts*4);
			this.rotationOffset = -90 * Math.PI / 180;
			// if single column, and orientation detection are true, auto split to 2 columns in landscape mode
			// if set to double column, ignore orientation detection (only support landscape), use single texture for double column
			this.imageWidth = opts.imageWidth;
			this.imageHeight = opts.imageHeight;
			this.textureMeasure = 1000.0;

			hypotenuseUV = this.hypotenuse / this.textureMeasure;

			this.curlSegment = 20;
			this.center = {x: this.halfWidth, y: this.halfHeight };
			this.vertices = [];
			this.indices = [];

			// world size is used when perspective matters
			if(this.usePerspective) {
				var edge = this.convert2to3(window.innerWidth, window.innerHeight, this.offsetZ);
				worldSize.hx = Math.abs(edge[0]);
				worldSize.hy = Math.abs(edge[1]);
			} else {
				worldSize.hx = this.halfWidth;
				worldSize.hy = this.halfHeight;
			}
			worldSize.x = worldSize.hx*2;
			worldSize.y = worldSize.hy*2;

			gtl = {x: 			 0, y: -worldSize.hy};
			gtr = {x: worldSize.hx, y: -worldSize.hy};
			gbl = {x: 			 0, y:  worldSize.hy};
			gbr = {x: worldSize.hx, y:  worldSize.hy};

			this.totalUVOffset = 0.5;
			this.widthScale = 1.0;

			// double column
			this.widthScale  = this.textureMeasure/worldSize.x;
			this.heightScale = this.textureMeasure/worldSize.y;

			this.worldSize = worldSize;

			// for single page
			if(this.column == PageFactory.SINGLE) {
				this.totalUVOffset = 0.0;
				//this.widthScale /= 0.5;
				//this.widthScale *= 2.0;

				originPos.x = -worldSize.hx;
				worldSize.hx *= 2.0;
			}

			this.initAttributes();

			// flatten page, make sure startSide is set to right
			this.build( worldSize.hx, 0.0, 0.000001 );
		},
		curl: function() {
			return curlInfo;
		},
		initPage: function( transform, direction ) {

		},
		renderPage: function( transform, direction, angle, time, radius ) {

		},
		initAttributes: function() {
			var quadCount = 0;
			var itl = 0;
			var itr = 0;
			var ibl = 0;
			var ibr = 0;
			vertices = this.vertices = [];
			indices = this.indices = [];
			for( i = 0; i < (this.curlSegment+2) * 2; i++ ) {
				vertices.push(0.0,0.0,0.0,0.0,0.0);
			}
			quadCount = vertices.length / 5 / 2;
			for( i = 0; i < quadCount - 1; i++ ) {
				itl = i;
				itr = i + 1;
				ibl = i + quadCount;
				ibr = i + quadCount + 1;
				indices.push(
					itl,
					itr,
					ibl,
					itr,
					ibr,
					ibl
				);
			}
		},
		setBlock: function(x,y,z,s,t) {
			this.vertices[verticeCount*5  ] = x;
			this.vertices[verticeCount*5+1] = y;
			this.vertices[verticeCount*5+2] = z;
			this.vertices[verticeCount*5+3] = s;
			this.vertices[verticeCount*5+4] = t;
			verticeCount++;
		},
		reset: function() {
			verticeCount = 0;
		},
		// build the curl shape
		build: function(offset, angle, radius) {
			sperimeter = ( Math.PI * radius ) / ( this.curlSegment - 1 );
			rad = Math.PI / ( this.curlSegment - 1 );
			rot = 180 + angle * 180 / Math.PI;
			this.reset();
			for( j = 0; j < 2; j++ ) {
				flip = j?1:-1;
				this.setBlock(
					-this.hypotenuse,
					this.hypotenuse * flip,
					0,
					-hypotenuseUV,
					hypotenuseUV * flip
				);

				for( i = 0; i < this.curlSegment; i++ ) {
					this.setBlock(
						offset + Math.cos( rad * i + this.rotationOffset ) * radius,
						this.hypotenuse * flip,
						radius + Math.sin(rad * i + this.rotationOffset) * radius,
						( offset + sperimeter * i ) / this.textureMeasure,
						hypotenuseUV * flip
					);
				}

				backOffset = -(this.hypotenuse - (offset + Math.PI * radius));
				if( backOffset < 0 ) {
					this.setBlock(
						offset + backOffset,
						this.hypotenuse * flip,
						radius * 2,
						hypotenuseUV,
						hypotenuseUV * flip
					);
				} else {
					this.setBlock(
						this.hypotenuse,
						this.hypotenuse * flip,
						0,
						hypotenuseUV,
						hypotenuseUV * flip
					);
				}
			}
		},
		buildByTime: function(time, angle, radius) {
			tdl = Math.abs( Math.cos( -Math.abs( angle ) - ta ) * tl );

			offsetx = ( 1.0 - time ) * tdl - radius;

			this.build( offsetx, angle, radius );
		},
		buildByCurlInfo: function(info) {
			tdl = Math.abs( Math.cos( -Math.abs( info.angle ) - ta ) * tl );

			info.offset = ( 1.0 - info.time ) * tdl - info.radius;

			this.build( info.offset, info.angle, info.radius );
		},
		start: function(x,y) {
			if(!dragging) {
				dragging = true;
				curlInfo.reset();
				//curlInfo.radius = 0.000001;
				mousePos.x = x; mousePos.y = y;

				this.setSide(x>this.halfWidth?PageFactory.RIGHT:PageFactory.LEFT);

				if(this.usePerspective) {
					var p = this.convert2to3(this.center.x + this.halfWidth*(this.isLeft()?-1:1), y, curlInfo.radius * 2 + this.offsetZ);
					startPos.x = p[0];
					startPos.y = p[1];
				} else {
					startPos.x = this.halfWidth*(this.isLeft()?-1:1);
					startPos.y = -(y - this.center.y);
				}
			}
		},
		move: function(x,y) {
			if(dragging) {
				flipDirection = (x-mousePos.x>0)?PageFactory.RIGHT:PageFactory.LEFT;

				if(usePerspective) {
					var p  = this.convert2to3(x, y, curlInfo.radius*2+this.offsetZ);
					movePos.x = p[0];
					movePos.y = p[1];
				} else {
					movePos.x = x - this.center.x;
					movePos.y = -(y - this.center.y);
				}

				curlInfo.isLeft = flipDirection != PageFactory.LEFT;

				this.calculateTime(curlInfo);
				//this.buildByTime(curlInfo.time, curlInfo.angle, curlInfo.radius);
				//this.buildByCurlInfo(curlInfo);
			}
		},
		end: function(x,y) {
			if(dragging) {
				dragging = false;
				//curlInfo.radius = 0.000001;
			}
		},
		setSide: function(side) {
			startSide = side;
			// t only need to be calculated once start side is known
			if( this.isLeft() ) {
				t.x = gbl.x - gtr.x;
				t.y = gbl.y - gtr.y;
			} else {
				t.x = gbr.x - gtl.x;
				t.y = gbr.y - gtl.y;
			}
			ta = Math.atan2( t.y, t.x );
			tl = Math.sqrt( t.x * t.x + t.y * t.y );
		},
		isLeft: function() { // is moving towards
			return startSide == PageFactory.LEFT;
		},
		isRight: function() {
			return startSide == PageFactory.RIGHT;
		},
		calculateTime: function(info) {
			o.x = startPos.x - originPos.x;
			o.y = startPos.y - originPos.y;
			oa = Math.atan2( o.y, o.x );
			ol = Math.sqrt( o.x*o.x + o.y*o.y );

			v.x = movePos.x - startPos.x;
			v.y = movePos.y - startPos.y;
			va = Math.atan2( v.y, v.x );
			vl = Math.sqrt( v.x*v.x + v.y*v.y );

			if( this.isLeft() ) {
				b.x = (va < 0)? startPos.x + gbl.x: startPos.x + gtl.x;
				b.y = (va < 0)? startPos.y + gbl.y: startPos.y + gtl.y;
			} else {
				b.x = (va < 0)? startPos.x - gbl.x: startPos.x - gtl.x;
				b.y = (va < 0)? startPos.y - gbl.y: startPos.y - gtl.y;
			}
			ba = Math.atan2( b.y, b.x );
			bl = Math.sqrt( b.x*b.x + b.y*b.y );

			s.x = startPos.x - origin.x;
			s.y = startPos.y - origin.y;
			sa = Math.atan2( s.y, s.x );
			sl = Math.sqrt( s.x*s.x + s.y*s.y );

			vlr = vl;

			if( vl > worldSize.hx )
				vlr = worldSize.x - vl;

			radius = vlr / (worldSize.hx) * RADIUS_RANGE;

			if ( radius > RADIUS_RANGE ) radius = RADIUS_RANGE;

			if( radius <= 1.0 ) radius = 1.0;

			pir = Math.PI * radius;
			offsetx = -((vl + pir) / 2 + ol * Math.cos( oa - va ));

			tdl = Math.cos( -Math.abs( va ) - ta ) * tl;
			bdl = Math.cos( ba - va ) * bl;
			sdl = Math.cos( sa - va ) * sl;

			if( this.isRight() ) {
				bdl = -bdl;
				sdl = -sdl;
			}

			if( radius + offsetx + bdl < sdl )
				offsetx += sdl - ( radius + offsetx + bdl );

			time = 1.0 + ( radius + offsetx ) / tdl;

			info.time = time;
			info.radius = radius;
			info.angle = va;
		}
	};

	window.PageFactory = PageFactory;
}(window));
(function(window) {
	Natural.exposeNature(this);

	// use Natural
	var Book = function(opts) {
		this.opts = opts;
		this.setup(opts);
		this.init();
	};

	Book.getTextContent = function(id) {
		return document.getElementById(id).textContent;
	};


	var FILTER_LEN = 0.39;//0.35;
	var TAPS_PER_PASS = 6.0;
	var LEFT = true;
	var RIGHT = false;

	function iterate(arr, func) {
		if(arr instanceof Array)
			for(var i = 0; i < arr.lengh; i++) {
				func(i, arr[i]);
			}
		else if(typeof(arr) == 'object') {
			for(var prop in arr) {
				func(prop, arr[prop]);
			}
		}
	}

	Book.prototype = {
		setup: function(opts) {
			this.gl = opts.gl;
			this.canvas = opts.canvas;
			this.images = opts.images; // important
			this.usePerspective = opts.usePerspective;
			this.vertexes = opts.vertexes;
			this.fragments = opts.fragments;
			this.column = opts.column;
		},
		initFactory: function() {
			var self = this;
			this.pageFactory = new PageFactory({
				convert2to3: function(x,y,z) {
					return Utils.convert2to3(x,y,z,self.camera);
				},
				imageHeight: 768,
				imageWidth: 512,
				usePerspective: this.usePerspective,
				column: this.column
			});

			this.pages = [];
			this.currentIndex = 0;
			this.isLeft = false;
			this.isDragging = false;
			this.isMoving = false;

			var page = null, last = null;
			iterate(this.images, function(i, img) {
				last = page;
				page = new Page({
					id: i,
					image: img
				});
				if(last) {
					page.prev = last;
					last.next = page;
				}
				self.pages.push(page);
			});
			this.currentPage = this.pages[0];
			this.currentPage.transparent = true;
			//this.currentPage = this.pages[this.pages.length-1];
		},
		initShader: function() {
			/*
			this.planeShader = new Shader(
				this.gl,
				Utils.ShaderScript.Texture2d.vertex,
				Utils.ShaderScript.Texture2d.fragment
			);
//*/		
			this.pageShader = new Shader(
				this.gl, 
				this.vertexes['page-vertex'],
				this.fragments['page-fragment']
			);
			this.pageShader.updateUniform("uM4Projection", this.camera.projection);
			this.pageShader.updateUniform("uM4CameraTransform", this.camera.transform);
			this.pageShader.updateUniform("uV2Scale", [this.pageFactory.widthScale, this.pageFactory.heightScale]);

			this.godRayGenerateShader = new Shader(
				this.gl,
				Graphic.utils.shaders.texture.vs,
				this.fragments['godrays-generate']
				//this.ppFragment
			);

			this.godRayCombineShader = new Shader(
				this.gl,
				Graphic.utils.shaders.texture.vs,
				this.fragments['godrays-combine']
			);

			this.lightScatteringShader = new Shader(
				this.gl,
				Graphic.utils.shaders.texture.vs,
				this.fragments['light-scattering']
			);

			this.shadowShader = new Shader(
				this.gl,
				Utils.ShaderScript.Texture3d.vertex,
				this.fragments['shadow-fragment']
			);
			this.flatShader = new Shader(
				this.gl,
				Utils.ShaderScript.Texture3d.vertex,
				this.fragments['flat-fragment']
			);
			this.shadowShader.updateUniform("uM4Projection", this.camera.projection);
			this.shadowShader.updateUniform("uM4CameraTransform", this.camera.transform);
			this.flatShader.updateUniform("uM4Projection", this.camera.projection);
			this.flatShader.updateUniform("uM4CameraTransform", this.camera.transform);
		},
		initRenderTexture: function() {
			this.rt = new RenderTexture(this.gl, 512, 512, true);
			this.rt.clear();
			this.rtPingPass = new RenderTexture(this.gl, 512, 512, true);
			this.rtPingPass.clear();
			this.rtPongPass = new RenderTexture(this.gl, 512, 512, true);
			this.rtPongPass.clear();

			// god ray
			this.passCount = 0;
			this.stepLen = 0.0;
			this.resetGodRayPass();
		},
		start: function(x,y) {
			var left = x < window.innerWidth / 2;
			if(this.currentPage.status == Page.IDLE) {
				if(left) {
					// left
					if(this.currentPage.prev && this.currentPage.prev.status == Page.IDLE) {
						if(!this.currentPage.next 
							|| this.currentPage.next.status == Page.IDLE 
							|| this.currentPage.next.info.isLeft) {
							this.isLeft = left;
							this.pageFactory.start(x,y);
							this.currentPage.info.copy(this.pageFactory.curl());
							this.currentPage.info.isLeft = true;
							this.currentPage.status = Page.INTERACTING;
							this.isDragging = true;
						}
					}
				} else {
					// right
					if(this.currentPage.next && this.currentPage.next.status == Page.IDLE) {				
						if(!this.currentPage.prev 
							|| this.currentPage.prev.status == Page.IDLE 
							|| !this.currentPage.prev.info.isLeft) {
							this.isLeft = left;
							this.pageFactory.start(x,y);
							this.currentPage.info.copy(this.pageFactory.curl());
							this.currentPage.info.isLeft = false;
							this.currentPage.status = Page.INTERACTING;
							this.isDragging = true;
						}
					}
				}
			}
		},
		move: function(x,y) {
			if(this.isDragging) {
				this.pageFactory.move(x,y);
				this.currentPage.info.copy(this.pageFactory.curl());
				this.currentPage.info.isLeft = this.isLeft;
				this.isMoving = true;
			}
		},
		end: function(x,y) {
			var self = this;
			if(this.isDragging) {
				this.pageFactory.end(x,y);
				var page = this.currentPage;
				var tween = new TWEEN.Tween(page.info)
				.to({
					radius: 0.000001,
					angle: page.info.isLeft?0.0:(page.info.angle<-Math.PI/2?-1.0:1.0)*Math.PI,
					time: 1.0
				}, (1.0-page.info.time)*800.0)
				.onComplete(function() {
					page.status = Page.IDLE;
					//TWEEN.remove(tween);
				});
				tween.easing(TWEEN.Easing.Quadratic.In);
				tween.start();
				if(this.isLeft) {
					this.currentPage = page.prev;
				} else {
					this.currentPage = page.next;
				}
			}
			this.isDragging = false;
			this.isMoving = false;
		},
		init: function() {
			var camera = this.camera = new Camera();
			camera.viewport(0,0,this.canvas.width,this.canvas.height);
			if(this.usePerspective) {
				this.camera.perspective( 60/180*Math.PI, 1, 100000 );
				this.camera.lookAt([0,0,500, 1], [0,0,0,1]);
			} else	
				this.camera.orthogonal(
					-this.canvas.width/2, 
					 this.canvas.width/2, 
					-this.canvas.height/2, 
					 this.canvas.height/2, 
					-1000,
					 1000
				);

			this.initFactory();
			this.initShader();
			this.initRenderTexture();

			this.flatPlane = VFactory.genPlane(
				0,-this.pageFactory.worldSize.hy,0.0,
				this.pageFactory.worldSize.hx,
				this.pageFactory.worldSize.y
			);

			var gl = this.gl;
			this.g = new Graphic(gl);
			this.g.clearColor(0.0,0.0,0.0,0.0);
			gl.clearColor(0.0,0.0,0.0,0.0);
			gl.enable (gl.BLEND);
			gl.blendEquationSeparate( gl.FUNC_ADD, gl.FUNC_ADD );
			gl.blendFuncSeparate( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA );
			
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LESS);

			// cull
			gl.enable(gl.CULL_FACE);

			this.rotation = mat4.create();
			this.textureRotation = mat2.create();

			this.shadowLeftRotation = mat4.create();
			this.shadowRightRotation = mat4.create();
			mat4.translate(
				this.shadowRightRotation, 
				this.shadowRightRotation, 
				[this.pageFactory.column == PageFactory.SINGLE?-this.pageFactory.worldSize.hx/2.0:0.0,0,-0.1]);
			mat4.translate(
				this.shadowLeftRotation, 
				this.shadowLeftRotation, 
				[-this.pageFactory.worldSize.hx,0,-0.1]);
		},
		drawCurl: function(currPage) {
			var curl = currPage.info;
			var g = this.g;
			var gl = this.gl;
			var camera = this.camera;
			var rotation = this.rotation;
			var textureRotation = this.textureRotation;
			var pageShader = this.pageShader;
			var page = this.pageFactory;

			this.pageFactory.buildByCurlInfo(curl);

			mat4.identity(rotation);

			if(page.column == PageFactory.SINGLE) {
				mat4.translate(rotation, rotation, [-page.worldSize.hx/2.0,0,0]);
			}

			mat4.rotate(rotation, rotation, curl.angle+Math.PI, [0,0,1]);

			mat4.translate(rotation, rotation, [0,0, page.offsetZ]);

			mat2.identity(textureRotation);
			mat2.rotate(textureRotation, textureRotation, curl.angle+Math.PI, [0,0,1]);

			pageShader.bind();

				//pageShader.updateUniform("uF1Time", page.curl().time);
				pageShader.updateUniform("uF1Radius", curl.radius);
				pageShader.updateUniform("uF1UVOffset", page.totalUVOffset);
				pageShader.updateUniform("uM4Transform", rotation);
				pageShader.updateUniform("uM2TextureTransform", textureRotation);
				pageShader.updateUniform("uB1Left", curl.isLeft);
				pageShader.updateUniform("uB1Half", page.column == PageFactory.SINGLE);

				// curl page
				pageShader.updateAttribute("aV3Position", page.vertices, 5, 0);
				pageShader.updateAttribute("aV2Texcoord", page.vertices, 5, 3);
				pageShader.updateIndice(page.indices);

				pageShader.updateUniform("uBInverseX", true);
				pageShader.updateUniform("uS2Texture", currPage.image);
				
				gl.cullFace( gl.BACK );
				pageShader.drawElements();

				pageShader.updateUniform("uBInverseX", page.column == PageFactory.SINGLE);
				pageShader.updateUniform("uS2Texture", page.column == PageFactory.SINGLE?currPage.image:(curl.isLeft?currPage.prev.image:currPage.next.image));
				
				gl.cullFace( gl.FRONT );
				pageShader.drawElements();

			pageShader.unbind();
		},
		drawFull: function(page) {
			this.gl.disable( this.gl.DEPTH_TEST );
			this.gl.cullFace( this.gl.BACK );
			this.g.pushMatrix();
				this.g.flip();
				this.g.drawImage(page.image, 0, 0, window.innerWidth, window.innerHeight, 1.0);
			this.g.popMatrix();
			this.gl.enable( this.gl.DEPTH_TEST );
		},
		drawFlat: function(page, left) {
			this.flatShader.bind();
				this.flatShader.updateUniform("uM4Transform", left?this.shadowLeftRotation:this.shadowRightRotation);
				this.flatShader.updateAttribute("aV3Position", this.flatPlane.vertices);
				this.flatShader.updateAttribute("aV2Texcoord", this.flatPlane.texcoords);
				this.flatShader.updateIndice(this.flatPlane.indices);
				this.flatShader.updateUniform("uS2Texture", page.image);
				this.flatShader.updateUniform("uB1Left", left);
				this.gl.cullFace( this.gl.BACK );
				this.flatShader.drawElements();
			this.flatShader.unbind();
		},
		drawShadow: function(page) {
			var curl = page.info;
			this.shadowShader.bind();
				this.shadowShader.updateUniform("uM4Transform", curl.isLeft?this.shadowLeftRotation:this.shadowRightRotation);
				this.shadowShader.updateAttribute("aV3Position", this.flatPlane.vertices);
				this.shadowShader.updateAttribute("aV2Texcoord", this.flatPlane.texcoords);
				this.shadowShader.updateIndice(this.flatPlane.indices);
				this.shadowShader.updateUniform("uS2Texture", curl.isLeft?page.prev.image:page.next.image);
				this.shadowShader.updateUniform("uB1Left", curl.isLeft);
				this.shadowShader.updateUniform("uB1Half", this.pageFactory.column == PageFactory.DOUBLE);
				this.shadowShader.updateUniform("uF1Angle", curl.angle);
				this.shadowShader.updateUniform("uF1Radius", curl.radius);
				//this.shadowShader.updateUniform("uF1Offset", curl.offset);
				this.gl.cullFace( this.gl.BACK );
				this.shadowShader.drawElements();
			this.shadowShader.unbind();
		},
		drawPage: function(page, direction) {
			if(!page) return;
			if(page.status == Page.IDLE) {
				if(page == this.currentPage) {
					if(page.transparent) {
						if(this.pageFactory.column == PageFactory.SINGLE) {
							if(page.next) {
								this.drawFull(page.next);
							}
						} else {
							if(page.next) {
								this.drawFlat(page.next, RIGHT);
							}
							if(page.prev) {
								this.drawFlat(page.prev, LEFT);
							}
						}
					}
					if(!page.next || page.next.status == Page.IDLE) {
						if(!page.prev || page.prev.status == Page.IDLE) {
							this.drawFull(page);
							return;
						}
					}
				}
			} else {
				if(page.info.isLeft) {
					if(!page.prev || page.prev.status == Page.IDLE) {
						this.drawShadow(page);
					}
					if(!page.next || page.next.status == Page.IDLE) {
						this.drawFlat(page, RIGHT);
					}
				} else {
					if(!page.next || page.next.status == Page.IDLE) {
						this.drawShadow(page);
					}
					if(!page.prev || page.prev.status == Page.IDLE) {
						this.drawFlat(page, LEFT);
					}
				}
				this.drawCurl(page);
			}
			if(page != this.currentPage)
				this.drawPage(direction?page.prev:page.next, direction);
		},
		renderToTexture: function( callback, useRT ) {
			if( useRT ) {
				this.rt.clear();
				this.rt.bind();
			}

			callback();

			if( useRT ) this.rt.unbind();
		},
		lightScatteringEffect: function() {
			// lightscattering, nice looking but expensive
			// also this may not work in some old browsers
			this.gl.disable( this.gl.DEPTH_TEST );
			this.gl.cullFace( this.gl.BACK );
			this.g.clear();
			this.g.pushMatrix();
			this.g.flip();
			this.g.drawImage(this.rt, 0, 0, window.innerWidth, window.innerHeight, 1.0);
			this.g.drawShader(this.lightScatteringShader, this.rt, 0, 0, window.innerWidth, window.innerHeight, 1.0);
			this.g.popMatrix();
			this.gl.enable( this.gl.DEPTH_TEST );
		},
		godRayEffect: function() {
			// 3 passes version from threejs
			this.gl.disable( this.gl.DEPTH_TEST );
			this.gl.cullFace( this.gl.BACK );

			this.resetGodRayPass();
			this.godRayPass(this.rt);
			this.godRayPass();
			this.godRayPass();

			this.godRayCombineShader.updateUniform("uS2GodRays", this.pongPass);
			this.drawShader(
				this.godRayCombineShader, this.rt,
				0, 0, 
				window.innerWidth, window.innerHeight,
				1.0
			);

			this.gl.enable( this.gl.DEPTH_TEST );
		},
		drawShader: function(shader, source, x, y, w, h, a) {
			this.g.clear();
			this.g.pushMatrix();
			this.g.flip();
			this.g.drawShader(
				shader, source, 
				x, y, 
				w, h, 
				a
			);
			/*
			> use this instead flip
			0, window.innerHeight, 
				window.innerWidth, -window.innerHeight,
			*/
			this.g.popMatrix();
		},
		pingPongPass: function(shader, firstPassSource) {
			this.pingPass.bind();
				this.drawShader(
					shader, firstPassSource || this.pongPass, 
					0, 0, 
					this.pingPass.width, this.pingPass.height, 
					1.0
				);
			this.pingPass.unbind();
			var tempPass = this.pongPass;
			this.pongPass = this.pingPass;
			this.pingPass = tempPass;
			this.passCount++;
		},
		resetPingPongPass: function() {
			this.pingPass = this.rtPingPass;
			this.pongPass = this.rtPongPass;
			this.passCount = 1.0;
		},
		resetGodRayPass: function() {
			this.stepLen = 0.0;
			this.resetPingPongPass();
		},
		godRayPass: function(firstPassSource) {
			this.stepLen = FILTER_LEN * Math.pow( TAPS_PER_PASS, -this.passCount );
			this.godRayGenerateShader.updateUniform("fStepSize", this.stepLen);
			this.pingPongPass(this.godRayGenerateShader, firstPassSource);
		},
		render: function() {
			var self = this;
			var currentInfo = null;

			var g = this.g;
			var gl = this.gl;
			var camera = this.camera;
			var rotation = this.rotation;
			var textureRotation = this.textureRotation;
			var shader = this.pageShader;
			var page = this.pageFactory;

			g.clear();

			//if(this.isMoving) {
			this.renderToTexture(function() {
				self.drawPage(self.pages[self.isLeft?self.pages.length-1:0], self.isLeft);
			}, true);
			//}

			this.lightScatteringEffect();
			//this.godRayEffect();
		}
	};

	window.Book = Book;
}(window));
(function(window) {
	// use Threejs
}(window));